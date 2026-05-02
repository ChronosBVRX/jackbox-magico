"""Modo Historia y autoridad de host controlados desde la TV.

La TV es la única autoridad de la sala. Los celulares nunca administran la
partida: solo se registran como jugadores y envían respuestas.
"""

from copy import deepcopy
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.database import supabase
from api.story_orchestrator import build_story_state, get_story, get_story_public_payload
from api.story_api import start_step_for_story, build_game_state_for_game, attach_story_metadata, DEFAULT_TRIVIA_GAME_ID
from api.services import room_service, player_service
from api.flow_engine import (
    build_scene_before_game, 
    build_scene_after_round, 
    build_next_game_transition, 
    build_intro_sequence, 
    build_rules_sequence
)
from api.scenes.instructions_scene import build_instruction_scene
from api.scenes.scoreboard_scene import build_scoreboard_scene
from api.scenes.transition_scene import build_transition_scene


app = FastAPI(title="Jackbox Mágico Story TV API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TvStoryInfo(BaseModel):
    tv_token: str
    story_id: Optional[str] = None
    random_seed: Optional[str] = None




def get_lifecycle(state: dict) -> dict:
    lifecycle = (state or {}).get("lifecycle")
    return lifecycle if isinstance(lifecycle, dict) else {}


def validate_or_claim_tv(state: dict, tv_token: str) -> dict:
    tv_token = str(tv_token or "").strip()
    if not tv_token:
        raise HTTPException(status_code=400, detail="Falta tv_token")

    lifecycle = get_lifecycle(state)
    saved_lifecycle_token = lifecycle.get("tv_token")

    if saved_lifecycle_token and saved_lifecycle_token != tv_token:
        raise HTTPException(status_code=403, detail="Token de TV inválido")

    lifecycle["tv_token"] = tv_token
    lifecycle["tv_connected"] = True
    lifecycle["host_authority"] = "tv"

    state["lifecycle"] = lifecycle
    state["host"] = room_service.make_tv_host(tv_token)
    state["managed_by"] = "tv"
    state["host_authority"] = "tv"
    state["story_controlled_by"] = "tv"
    state["story_autopilot"] = True
    return state


def get_story_state_or_fail(state: dict) -> dict:
    story_state = (state or {}).get("story")
    if not isinstance(story_state, dict):
        raise HTTPException(status_code=409, detail="Esta sala no tiene historia preparada")
    return story_state


@app.get("/api/story-tv/health")
async def health():
    return {"status": "ok", "message": "Modo Historia controlado por TV listo."}


@app.post("/api/story-tv/{room_code}/claim-host")
async def claim_tv_host(room_code: str, info: TvStoryInfo):
    room = room_service.get_room_by_code(room_code)
    state = deepcopy(room.get("game_state") or {})
    state = validate_or_claim_tv(state, info.tv_token)

    room_service.update_room_with_version(room_code, state, room.get("state_version", 0))

    return {
        "message": "TV registrada como host de la sala",
        "room_code": room["room_code"],
        "host": {"name": "TV", "claimed": True, "managed_by": "tv"},
    }


@app.post("/api/story-tv/{room_code}/prepare")
async def prepare_story_from_tv(room_code: str, info: TvStoryInfo):
    if not info.story_id:
        raise HTTPException(status_code=400, detail="Falta story_id")

    room = room_service.get_room_by_code(room_code)
    state = deepcopy(room.get("game_state") or {})
    state = validate_or_claim_tv(state, info.tv_token)

    if room.get("status") != "lobby":
        raise HTTPException(status_code=409, detail="Solo puedes preparar historia desde el lobby")

    try:
        story_state = build_story_state(info.story_id)
        story = get_story(info.story_id)
        
        state.update({
            "phase": "lobby",
            "mode": "story",
            "story": story_state,
            "story_public": get_story_public_payload(story_state),
            "story_dialogue": story.get("intro", []),
            "story_transition_reason": "Historia seleccionada desde la TV. Los celulares serán solo controles de jugador.",
            "story_controlled_by": "tv",
            "story_autopilot": True,
            "managed_by": "tv",
            "host_authority": "tv",
        })

        room_service.update_room_with_version(room_code, state, room.get("state_version", 0))

        return {
            "message": "Historia preparada desde TV",
            "room_code": room["room_code"],
            "story_id": info.story_id,
            "story_title": story.get("title"),
            "story": get_story_public_payload(story_state),
        }
    except KeyError:
        raise HTTPException(status_code=404, detail="Historia no encontrada")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error preparando historia: {str(e)}")


@app.post("/api/story-tv/{room_code}/start")
async def start_story_from_tv(room_code: str, info: TvStoryInfo):
    room = room_service.get_room_by_code(room_code)
    previous_state = deepcopy(room.get("game_state") or {})
    previous_state = validate_or_claim_tv(previous_state, info.tv_token)
    story_state = get_story_state_or_fail(previous_state)
    tv_host = room_service.make_tv_host(info.tv_token)

    # Usar start_step_for_story -> produce scene_instructions del primer minijuego
    # (antes usaba build_intro_sequence que mandaba a scene_intro, pantalla narrativa larga)
    game_state = start_step_for_story(
        room_code=room_code,
        previous_state=previous_state,
        story_state=story_state,
        host=tv_host,
        random_seed=info.random_seed,
    )
    game_state["host"] = tv_host
    game_state["story_controlled_by"] = "tv"
    game_state["story_autopilot"] = True
    game_state["managed_by"] = "tv"
    game_state["host_authority"] = "tv"

    from api.database import supabase
    supabase.table("rooms").update({
        "game_state": game_state,
        "status": "playing",
        "state_version": room.get("state_version", 0) + 1
    }).eq("room_code", room_code).execute()

    return {
        "message": "Historia iniciada desde TV",
        "room_code": room["room_code"],
        "game_id": game_state.get("current_game_id"),
        "phase": game_state.get("phase"),
        "story": game_state.get("story_public"),
    }


@app.post("/api/story-tv/{room_code}/next-step")
async def next_story_step_from_tv(room_code: str, info: TvStoryInfo):
    from api.story_orchestrator import advance_story_state

    room = room_service.get_room_by_code(room_code)
    previous_state = deepcopy(room.get("game_state") or {})
    previous_state = validate_or_claim_tv(previous_state, info.tv_token)
    story_state = get_story_state_or_fail(previous_state)
    story_state = advance_story_state(story_state)
    tv_host = room_service.make_tv_host(info.tv_token)

    game_state = start_step_for_story(
        room_code=room_code,
        previous_state=previous_state,
        story_state=story_state,
        host=tv_host,
        random_seed=info.random_seed,
    )
    game_state["host"] = tv_host
    game_state["story_controlled_by"] = "tv"
    game_state["story_autopilot"] = True
    game_state["managed_by"] = "tv"
    game_state["host_authority"] = "tv"

    room_service.update_room_with_version(room_code, game_state, room.get("state_version", 0))

    return {
        "message": "Siguiente etapa iniciada desde TV",
        "room_code": room["room_code"],
        "game_id": game_state.get("current_game_id"),
        "phase": game_state.get("phase"),
        "story": game_state.get("story_public"),
        "dialogue": game_state.get("story_dialogue", []),
        "transition_reason": game_state.get("story_transition_reason"),
    }


@app.post("/api/story-tv/{room_code}/accept-rules")
async def accept_rules_from_tv(room_code: str, info: TvStoryInfo):
    import time
    from api.story_orchestrator import advance_story_state

    room = room_service.get_room_by_code(room_code)
    state = deepcopy(room.get("game_state") or {})
    state = validate_or_claim_tv(state, info.tv_token)

    target = state.get("target_phase")

    if target:
        # Camino normal: mover a la fase objetivo
        state["phase"] = target
        state["started_at"] = time.time()
        del state["target_phase"]
        room_service.update_room_with_version(room_code, state, room.get("state_version", 0))

    else:
        # FIX: Sin target_phase, avanzar al siguiente step de la historia.
        # Esto evita que la sala quede congelada en phase=rules indefinidamente.
        story_state = state.get("story")
        if isinstance(story_state, dict):
            story_state = advance_story_state(story_state)
            tv_host = room_service.make_tv_host(info.tv_token)
            game_state = start_step_for_story(
                room_code=room_code,
                previous_state=state,
                story_state=story_state,
                host=tv_host,
            )
            game_state["host"] = tv_host
            game_state["story_controlled_by"] = "tv"
            game_state["story_autopilot"] = True
            game_state["managed_by"] = "tv"
            game_state["host_authority"] = "tv"
            room_service.update_room_with_version(
                room_code, game_state, room.get("state_version", 0)
            )
            return {
                "message": "Reglas aceptadas — avanzando al siguiente step",
                "phase": game_state.get("phase"),
            }

    return {
        "message": "Reglas aceptadas",
        "phase": state.get("phase"),
    }



@app.post("/api/story-tv/{room_code}/next-trivia")
async def next_trivia_from_tv(room_code: str, info: TvStoryInfo):
    room = room_service.get_room_by_code(room_code)
    previous_state = deepcopy(room.get("game_state") or {})
    previous_state = validate_or_claim_tv(previous_state, info.tv_token)
    story_state = get_story_state_or_fail(previous_state)
    tv_host = room_service.make_tv_host(info.tv_token)

    game_state = build_game_state_for_game(
        room_code=room_code,
        game_id=DEFAULT_TRIVIA_GAME_ID,
        previous_state=previous_state,
    )
    game_state["host"] = tv_host
    game_state["story_trivia_target_questions"] = previous_state.get("story_trivia_target_questions") or 3
    game_state["story_controlled_by"] = "tv"
    game_state["story_autopilot"] = True
    game_state["managed_by"] = "tv"
    game_state["host_authority"] = "tv"

    game_state = attach_story_metadata(
        game_state=game_state,
        story_state=story_state,
        host=tv_host,
        game_id=DEFAULT_TRIVIA_GAME_ID,
        dialogue_lines=[
            "La siguiente pregunta aparece sola. Prepárense.",
        ],
        transition_reason="La trivia continúa automáticamente.",
    )
    
    # Pausar en reglas para sincronizar audio/timers
    game_state["target_phase"] = game_state.get("phase", "trivia")
    game_state["phase"] = "rules"
    game_state["story_selected_minigame_name"] = "Continuación de Trivia"
    game_state["host"] = tv_host
    game_state["story_controlled_by"] = "tv"
    game_state["story_autopilot"] = True
    game_state["managed_by"] = "tv"
    game_state["host_authority"] = "tv"

    room_service.update_room_with_version(room_code, game_state, room.get("state_version", 0))

    return {
        "message": "Siguiente pregunta de trivia iniciada desde TV",
        "room_code": room["room_code"],
        "game_id": DEFAULT_TRIVIA_GAME_ID,
        "phase": game_state.get("phase"),
        "story": game_state.get("story_public"),
    }


@app.post("/api/tv/{room_code}/continue")
async def continue_from_tv(room_code: str, info: TvStoryInfo):
    """
    Endpoint central para que la TV avance el flujo de la partida.
    Decide qué escena sigue basándose en la fase actual.
    """
    room = room_service.get_room_by_code(room_code)
    state = deepcopy(room.get("game_state") or {})
    state = validate_or_claim_tv(state, info.tv_token)
    
    players = player_service.get_players_in_room(room["id"])
    phase = state.get("phase")

    # 1. Escena de Introducción -> Ir a Reglas
    if phase == "scene_intro":
        new_state = build_rules_sequence(state)

    # 2. Escena de Reglas -> Ir a Instrucciones del primer juego
    elif phase == "scene_rules":
        story_state = state.get("story")
        # El primer paso de la historia nos da el primer juego
        start_state = start_step_for_story(
            room_code=room_code,
            previous_state=state,
            story_state=story_state,
            host=state.get("host")
        )
        game_id = start_state.get("current_game_id") or DEFAULT_TRIVIA_GAME_ID
        new_state = build_scene_before_game(game_id, state)

    # 3. Si estamos en instrucciones -> Iniciar el juego real
    elif phase == "scene_instructions":
        game_id = state.get("current_game_id")
        if not game_id:
            raise HTTPException(status_code=400, detail="No hay current_game_id para iniciar")

        new_state = build_game_state_for_game(
            room_code=room_code,
            game_id=game_id,
            previous_state=state
        )
        # Sincronizar metadata de historia si aplica
        story_state = state.get("story")
        if story_state:
            new_state = attach_story_metadata(
                game_state=new_state,
                story_state=story_state,
                host=state.get("host"),
                game_id=game_id,
                dialogue_lines=state.get("story_dialogue"),
                transition_reason=state.get("story_transition_reason")
            )

    # 2. Si venimos de resultados -> Mostrar marcador
    elif str(phase).startswith("results_"):
        new_state = build_scoreboard_scene(
            previous_state=state,
            players=players,
            title="Marcador de la Copa de las Casas",
            subtitle="Así va la competencia después de esta ronda.",
            next_action="continue_story"
        )

    # 3. Si estamos en el marcador -> Decidir si sigue trivia o transición
    elif phase == "scene_scoreboard":
        next_action = state.get("next_action")

        if next_action == "next_trivia_question":
            new_state = build_game_state_for_game(
                room_code=room_code,
                game_id=DEFAULT_TRIVIA_GAME_ID,
                previous_state=state
            )
        elif next_action == "continue_story":
            new_state = build_transition_scene(
                previous_state=state,
                title="Siguiente prueba",
                subtitle="Prepárense para continuar la aventura.",
                next_action="show_instructions",
                duration_seconds=5
            )
        else:
            new_state = {**state, "phase": "lobby", "scene_type": "lobby"}

    # 4. Si estamos en transición -> Mostrar instrucciones del siguiente juego
    elif phase == "scene_transition":
        game_id = state.get("next_game_id") or state.get("current_game_id") or DEFAULT_TRIVIA_GAME_ID
        new_state = build_instruction_scene(
            game_id=game_id,
            previous_state=state
        )

    # 5. Fallback o fases de minijuego no detectadas
    else:
        # Si no sabemos qué hacer, mostramos el marcador como seguridad
        new_state = build_scoreboard_scene(
            previous_state=state,
            players=players,
            title="Marcador de la Copa de las Casas",
            subtitle="Pausa breve antes de continuar.",
            next_action="continue_story"
        )

    # Asegurar autoridad de TV
    new_state = validate_or_claim_tv(new_state, info.tv_token)
    
    room_service.update_room_with_version(room_code, new_state, room.get("state_version", 0))

    return {
        "message": "Escena actualizada",
        "phase": new_state.get("phase"),
    }
