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
from api.services import room_service


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
        "room_code": clean_room_code(room_code),
        "host": {"name": "TV", "claimed": True, "managed_by": "tv"},
    }


@app.post("/api/story-tv/{room_code}/prepare")
async def prepare_story_from_tv(room_code: str, info: TvStoryInfo):
    if not info.story_id:
        raise HTTPException(status_code=400, detail="Falta story_id")

    room = get_room(room_code)
    state = deepcopy(room.get("game_state") or {})
    state = validate_or_claim_tv(state, info.tv_token)

    if room.get("status") != "lobby":
        raise HTTPException(status_code=409, detail="Solo puedes preparar historia desde el lobby")

    try:
        story_state = build_story_state(info.story_id)
        story = get_story(info.story_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Historia no encontrada")

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
        "room_code": clean_room_code(room_code),
        "story_id": info.story_id,
        "story_title": story.get("title"),
        "story": get_story_public_payload(story_state),
    }


@app.post("/api/story-tv/{room_code}/start")
async def start_story_from_tv(room_code: str, info: TvStoryInfo):
    room = get_room(room_code)
    previous_state = deepcopy(room.get("game_state") or {})
    previous_state = validate_or_claim_tv(previous_state, info.tv_token)
    story_state = get_story_state_or_fail(previous_state)
    tv_host = make_tv_host(info.tv_token)

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
    room = get_room(room_code)
    state = deepcopy(room.get("game_state") or {})
    state = validate_or_claim_tv(state, info.tv_token)

    target = state.get("target_phase")
    if target:
        state["phase"] = target
        state["started_at"] = time.time()
        # En caso de que haya una propiedad de tiempo en el minijuego, la dejamos intacta
        # pero started_at se inicializa ahora para evitar que el reloj expire prematuramente.
        
        # Eliminar target_phase para limpieza
        del state["target_phase"]
        
        room_service.update_room_with_version(room_code, state, room.get("state_version", 0))

    return {
        "message": "Reglas aceptadas",
        "phase": state.get("phase"),
    }


@app.post("/api/story-tv/{room_code}/next-trivia")
async def next_trivia_from_tv(room_code: str, info: TvStoryInfo):
    room = get_room(room_code)
    previous_state = deepcopy(room.get("game_state") or {})
    previous_state = validate_or_claim_tv(previous_state, info.tv_token)
    story_state = get_story_state_or_fail(previous_state)
    tv_host = make_tv_host(info.tv_token)

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
