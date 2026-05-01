"""Endpoints del modo Historia.

Este archivo puede funcionar de dos formas:
1. Como router importable desde `api/main.py`.
2. Como app serverless independiente en Vercel para `/api/story/...`.

El objetivo de esta fase es conectar el modo Historia con salas reales de Supabase
sin tocar todavía la lógica existente de `/api/player`, `/api/room` o trivia.
"""

import random
import string
from copy import deepcopy
from typing import Any, Dict, Optional

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from api.database import HostControlInfo, supabase
from api import (
    artes_ridiculas,
    atrapa_snitch,
    caldero_mentiroso,
    clase_pociones,
    copa_final,
    duelo,
    hechizo_incompleto,
    mapa_travieso,
    patronus_personalizado,
    retratos_chismosos,
    sombrero,
    trivia,
)
from api.game_catalog import GAME_CATALOG
from api.story_orchestrator import (
    DEFAULT_FINAL_GAME_ID,
    DEFAULT_TRIVIA_GAME_ID,
    STORY_MINIGAME_POOL,
    advance_story_state,
    build_story_state,
    get_current_step,
    get_story,
    get_story_public_payload,
    list_stories,
    pick_minigame_for_story,
)
from api.services import room_service
from api.scenes.instructions_scene import build_instruction_scene


app = FastAPI(title="Jackbox Mágico Story API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/api/story", tags=["story"])


class StoryStartInfo(BaseModel):
    story_id: str


class StoryAdvanceInfo(BaseModel):
    story_state: dict


class MinigamePickInfo(BaseModel):
    used_minigames: list[str] = Field(default_factory=list)
    recent_minigames: list[str] = Field(default_factory=list)
    allowed_pool: list[str] | None = None
    random_seed: str | None = None


class StoryRoomCreateInfo(BaseModel):
    story_id: str


class StoryHostStartInfo(HostControlInfo):
    random_seed: Optional[str] = None


class StoryHostNextInfo(HostControlInfo):
    random_seed: Optional[str] = None


# -----------------------------------------------------------------------------
# Utilidades de sala / Supabase
# -----------------------------------------------------------------------------




# -----------------------------------------------------------------------------
# Utilidades del orquestador real
# -----------------------------------------------------------------------------


def attach_story_metadata(
    game_state: dict,
    story_state: dict,
    host: dict,
    game_id: str,
    dialogue_lines: list[str] = None,
    transition_reason: str = None,
) -> dict:
    """Añade metadatos de la historia a un estado de minijuego para que la TV sepa qué mostrar."""
    game_state["mode"] = "story"
    game_state["story"] = story_state
    game_state["story_public"] = get_story_public_payload(story_state)
    game_state["story_dialogue"] = dialogue_lines or []
    game_state["story_transition_reason"] = transition_reason
    game_state["story_controlled_by"] = "tv" if host.get("authority") == "tv_screen" else "player"
    game_state["host"] = host
    game_state["current_game_id"] = game_id
    return game_state


def start_step_for_story(
    room_code: str,
    previous_state: dict,
    story_state: dict,
    host: dict,
    random_seed: str = None,
) -> dict:
    """Decide qué game_state construir basado en el step actual de la historia."""
    step = get_current_step(story_state)
    if not step:
        # Fin de la historia
        return {
            "phase": "story_complete",
            "story_completed": True,
            "story_public": get_story_public_payload(story_state),
        }

    step_type = step.get("type")

    if step_type == "dialogue":
        return attach_story_metadata(
            game_state={"phase": "lobby"},
            story_state=story_state,
            host=host,
            game_id="narration",
            dialogue_lines=step.get("lines", []),
            transition_reason="Narrativa en curso",
        )

    if step_type == "trivia_block":
        # Iniciar trivia
        game_state = build_game_state_for_game(
            room_code=room_code,
            game_id=DEFAULT_TRIVIA_GAME_ID,
            previous_state=previous_state,
        )
        # Forzar número de preguntas del step
        game_state["story_trivia_target_questions"] = step.get("questions", 3)
        
        return attach_story_metadata(
            game_state=game_state,
            story_state=story_state,
            host=host,
            game_id=DEFAULT_TRIVIA_GAME_ID,
            dialogue_lines=["¿Listos para un poco de trivia?"],
            transition_reason="Iniciando bloque de trivia",
        )

    if step_type == "minigame_random":
        pick = pick_minigame_for_story(
            used_minigames=story_state.get("used_minigames", []),
            recent_minigames=story_state.get("recent_minigames", []),
            random_seed=random_seed,
        )
        game_id = pick["game_id"]
        # Actualizar estado de historia con el nuevo minijuego usado
        story_state["used_minigames"] = pick["used_minigames"]
        story_state["recent_minigames"] = pick["recent_minigames"]

        game_state = build_game_state_for_game(
            room_code=room_code,
            game_id=game_id,
            previous_state=previous_state,
        )
        
        # Pausar en reglas para sincronizar audio/timers
        target_phase = game_state.get("phase", "playing")
        game_state["target_phase"] = target_phase
        game_state["phase"] = "rules"
        game_state["story_selected_minigame_name"] = GAME_CATALOG.get(game_id, {}).get("name", "Minijuego")

        return attach_story_metadata(
            game_state=game_state,
            story_state=story_state,
            host=host,
            game_id=game_id,
            dialogue_lines=[step.get("reason", "¡Hora de un minijuego!")],
            transition_reason=f"Seleccionado minijuego: {game_id}",
        )

    if step_type == "copa_final":
        game_state = build_game_state_for_game(
            room_code=room_code,
            game_id=DEFAULT_FINAL_GAME_ID,
            previous_state=previous_state,
        )
        return attach_story_metadata(
            game_state=game_state,
            story_state=story_state,
            host=host,
            game_id=DEFAULT_FINAL_GAME_ID,
            dialogue_lines=["La gran final ha llegado."],
            transition_reason="Copa Final",
        )

    # Fallback
    return attach_story_metadata(
        game_state={"phase": "lobby"},
        story_state=story_state,
        host=host,
        game_id="unknown",
    )


def build_game_state_for_game(room_code: str, game_id: str, previous_state: dict) -> Dict[str, Any]:
    """Constructor local de estados para no importar `api.main` y no duplicar apps."""
    if game_id == "trivia_magica":
        return trivia.build_trivia_state(
            room_code=room_code.upper(),
            previous_state=previous_state,
        )

    if game_id == "duelo_hechizos":
        return duelo.build_duelo_state(
            room_code=room_code,
            previous_state=previous_state,
        )

    if game_id == "sombrero_burlon":
        return sombrero.build_sombrero_state(
            room_code=room_code,
            previous_state=previous_state,
        )

    if game_id == "clase_pociones":
        return clase_pociones.build_state(
            room_code=room_code,
            previous_state=previous_state,
        )

    if game_id == "atrapa_snitch":
        return atrapa_snitch.build_state(
            room_code=room_code,
            previous_state=previous_state,
        )

    if game_id == "retratos_chismosos":
        return retratos_chismosos.build_state(
            previous_state=previous_state,
        )

    if game_id == "mapa_travieso":
        return mapa_travieso.build_state()

    if game_id == "hechizo_incompleto":
        return hechizo_incompleto.build_state(
            previous_state=previous_state,
        )

    if game_id == "artes_ridiculas":
        return artes_ridiculas.build_state(
            previous_state=previous_state,
            humor_mode=True,
        )

    if game_id == "caldero_mentiroso":
        return caldero_mentiroso.build_state()

    if game_id == "patronus_personalizado":
        return patronus_personalizado.build_state(room_code)

    if game_id == "copa_final":
        return copa_final.build_state()

    raise HTTPException(status_code=400, detail="Juego sin constructor")


def get_game_display_name(game_id: str) -> str:
    return GAME_CATALOG.get(game_id, {}).get("name") or game_id.replace("_", " ").title()


def build_minigame_transition_lines(game_id: str, reason: Optional[str]) -> list[str]:
    name = get_game_display_name(game_id)
    base_reason = reason or "La Copa decidió que ya fue suficiente teoría y ahora exige una prueba práctica."

    return [
        base_reason,
        f"Prepárense: la siguiente prueba será {name}. Guarden la dignidad en la túnica, puede que la necesiten después.",
    ]


def build_trivia_transition_lines(question_count: int) -> list[str]:
    return [
        "La Copa vuelve a exigir conocimiento. Porque aparentemente sufrir con una sola ronda no era suficiente.",
        f"Nuevo bloque de trivia: {question_count} preguntas. Respondan rápido, pero no como si el sombrero les hubiera quedado apretado.",
    ]


def build_final_transition_lines() -> list[str]:
    return [
        "Las velas bajan, la música se pone dramática y una casa ya está ensayando discurso de victoria.",
        "Llegó la Copa Final. Una pregunta puede cambiarlo todo, incluso la autoestima del último lugar.",
    ]


def attach_story_metadata(
    game_state: dict,
    story_state: dict,
    host: Optional[dict],
    game_id: str,
    dialogue_lines: Optional[list[str]] = None,
    transition_reason: Optional[str] = None,
) -> dict:
    state = deepcopy(game_state or {})

    if host:
        state["host"] = host

    state["mode"] = "story"
    state["current_game_id"] = game_id
    state["story"] = deepcopy(story_state or {})
    state["story_public"] = get_story_public_payload(story_state or {})
    state["story_dialogue"] = dialogue_lines or []
    state["story_transition_reason"] = transition_reason

    current_step = get_current_step(story_state or {})
    if current_step:
        state["story_step_type"] = current_step.get("type")
        state["story_step"] = current_step

    return state


def advance_until_playable_step(story_state: dict) -> tuple[dict, list[str]]:
    """Avanza diálogos y regresa el siguiente step jugable."""
    state = deepcopy(story_state or {})
    dialogue_lines: list[str] = []

    for _ in range(8):
        step = get_current_step(state)
        if not step:
            return state, dialogue_lines

        if step.get("type") != "dialogue":
            return state, dialogue_lines

        dialogue_lines.extend(step.get("lines") or [])
        state = advance_story_state(state)

    return state, dialogue_lines


def start_step_for_story(
    room_code: str,
    previous_state: dict,
    story_state: dict,
    host: Optional[dict],
    random_seed: Optional[str] = None,
) -> Dict[str, Any]:
    story_state, dialogue_lines = advance_until_playable_step(story_state)
    step = get_current_step(story_state)

    if not step:
        game_id = DEFAULT_FINAL_GAME_ID
        game_state = build_game_state_for_game(room_code, game_id, previous_state)
        transition_lines = dialogue_lines + build_final_transition_lines()
        return attach_story_metadata(
            game_state=game_state,
            story_state=story_state,
            host=host,
            game_id=game_id,
            dialogue_lines=transition_lines,
            transition_reason="La historia llegó al cierre final.",
        )

    step_type = step.get("type")

    if step_type == "trivia_block":
        game_id = DEFAULT_TRIVIA_GAME_ID
        question_count = int(step.get("questions") or 3)
        game_state = build_game_state_for_game(room_code, game_id, previous_state)
        game_state["story_trivia_target_questions"] = question_count
        game_state["story_trivia_answered_in_block"] = 0
        transition_lines = dialogue_lines + build_trivia_transition_lines(question_count)
        game_state = attach_story_metadata(
            game_state=game_state,
            story_state=story_state,
            host=host,
            game_id=game_id,
            dialogue_lines=transition_lines,
            transition_reason=step.get("reason") or "La historia regresa a la trivia principal.",
        )
        
        # Nueva Escena de Instrucciones
        return build_instruction_scene(
            game_id=game_id,
            previous_state=game_state,
            next_phase=game_state.get("phase", "trivia")
        )

    if step_type == "minigame_random":
        pick = pick_minigame_for_story(
            used_minigames=story_state.get("used_minigames", []),
            recent_minigames=story_state.get("recent_minigames", []),
            allowed_pool=step.get("pool") or STORY_MINIGAME_POOL,
            random_seed=random_seed,
        )

        story_state["used_minigames"] = pick["used_minigames"]
        story_state["recent_minigames"] = pick["recent_minigames"]
        story_state["selected_minigame"] = pick["game_id"]

        game_id = pick["game_id"]
        game_state = build_game_state_for_game(room_code, game_id, previous_state)
        
        transition_reason = step.get("reason") or "La Copa activó una prueba mágica inesperada."
        transition_lines = dialogue_lines + build_minigame_transition_lines(game_id, transition_reason)
        
        game_state = attach_story_metadata(
            game_state=game_state,
            story_state=story_state,
            host=host,
            game_id=game_id,
            dialogue_lines=transition_lines,
            transition_reason=transition_reason,
        )

        # Nueva Escena de Instrucciones
        return build_instruction_scene(
            game_id=game_id,
            previous_state=game_state,
            next_phase=game_state.get("phase", game_id)
        )

    if step_type == "copa_final":
        game_id = DEFAULT_FINAL_GAME_ID
        game_state = build_game_state_for_game(room_code, game_id, previous_state)
        
        transition_reason = "Llegó la Pregunta Final. La Copa ya está juzgando a todos en silencio."
        transition_lines = dialogue_lines + build_final_transition_lines()
        
        game_state = attach_story_metadata(
            game_state=game_state,
            story_state=story_state,
            host=host,
            game_id=game_id,
            dialogue_lines=transition_lines,
            transition_reason=transition_reason,
        )

        # Nueva Escena de Instrucciones
        return build_instruction_scene(
            game_id=game_id,
            previous_state=game_state,
            next_phase=game_state.get("phase", game_id)
        )

    raise HTTPException(status_code=400, detail=f"Step de historia no soportado: {step_type}")


# -----------------------------------------------------------------------------
# Endpoints de diagnóstico del motor narrativo
# -----------------------------------------------------------------------------


@router.get("/health")
async def story_health():
    return {
        "status": "ok",
        "message": "Motor narrativo listo.",
    }


@router.get("/catalog")
async def story_catalog():
    return {
        "stories": list_stories(),
        "minigame_pool": STORY_MINIGAME_POOL,
    }


@router.post("/start")
async def story_start(info: StoryStartInfo):
    try:
        state = build_story_state(info.story_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Historia no encontrada")

    return {
        "message": "Modo historia preparado",
        "story_state": state,
        "public_story": get_story_public_payload(state),
        "current_step": get_current_step(state),
    }


@router.post("/advance")
async def story_advance(info: StoryAdvanceInfo):
    state = advance_story_state(info.story_state)

    return {
        "message": "Historia avanzada" if not state.get("story_completed") else "Historia completada",
        "story_state": state,
        "public_story": get_story_public_payload(state),
        "current_step": get_current_step(state),
    }


@router.post("/pick-minigame")
async def story_pick_minigame(info: MinigamePickInfo):
    result = pick_minigame_for_story(
        used_minigames=info.used_minigames,
        recent_minigames=info.recent_minigames,
        allowed_pool=info.allowed_pool,
        random_seed=info.random_seed,
    )

    return {
        "message": "Minijuego seleccionado",
        **result,
    }


# -----------------------------------------------------------------------------
# Endpoints reales para salas en modo Historia
# -----------------------------------------------------------------------------


@router.post("/host/create_room")
async def create_story_room(info: StoryRoomCreateInfo):

    try:
        story_state = build_story_state(info.story_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Historia no encontrada")

    code = room_service.generate_unique_room_code()

    supabase.table("rooms").insert({
        "room_code": code,
        "status": "lobby",
        "game_state": {
            "phase": "lobby",
            "mode": "story",
            "host": None,
            "story": story_state,
            "story_public": get_story_public_payload(story_state),
        },
        "state_version": 0
    }).execute()

    return {
        "message": "Sala de historia creada",
        "room_code": code,
        "story_id": info.story_id,
        "story": get_story_public_payload(story_state),
    }


@router.post("/host/{room_code}/start")
async def start_story_room(room_code: str, info: StoryHostStartInfo):
    room = room_service.get_room_by_code(room_code)
    previous_state = deepcopy(room.get("game_state") or {})
    host = room_service.validate_host(previous_state, info.player_name, info.host_token)

    story_state = previous_state.get("story")
    if not isinstance(story_state, dict):
        raise HTTPException(status_code=409, detail="Esta sala no tiene historia preparada")

    game_state = start_step_for_story(
        room_code=room_code,
        previous_state=previous_state,
        story_state=story_state,
        host=host,
        random_seed=info.random_seed,
    )

    room_service.update_room_with_version(room_code, game_state, room.get("state_version", 0))

    return {
        "message": "Modo Historia iniciado",
        "room_code": room["room_code"],
        "game_id": game_state.get("current_game_id"),
        "game_name": GAME_CATALOG.get(game_state.get("current_game_id"), {}).get("name"),
        "phase": game_state.get("phase"),
        "story": game_state.get("story_public"),
        "dialogue": game_state.get("story_dialogue", []),
        "transition_reason": game_state.get("story_transition_reason"),
    }


@router.post("/host/{room_code}/next")
async def story_next_step(room_code: str, info: StoryHostNextInfo):
    room = room_service.get_room_by_code(room_code)
    previous_state = deepcopy(room.get("game_state") or {})
    host = room_service.validate_host(previous_state, info.player_name, info.host_token)

    story_state = previous_state.get("story")
    if not isinstance(story_state, dict):
        raise HTTPException(status_code=409, detail="Esta sala no tiene historia activa")

    story_state = advance_story_state(story_state)

    game_state = start_step_for_story(
        room_code=room_code,
        previous_state=previous_state,
        story_state=story_state,
        host=host,
        random_seed=info.random_seed,
    )

    room_service.update_room_with_version(room_code, game_state, room.get("state_version", 0))

    return {
        "message": "Siguiente etapa de historia iniciada",
        "room_code": room["room_code"],
        "game_id": game_state.get("current_game_id"),
        "game_name": GAME_CATALOG.get(game_state.get("current_game_id"), {}).get("name"),
        "phase": game_state.get("phase"),
        "story": game_state.get("story_public"),
        "dialogue": game_state.get("story_dialogue", []),
        "transition_reason": game_state.get("story_transition_reason"),
    }


# Importante: esta ruta dinámica debe ir al final para no capturar `/start`,
# `/advance`, `/host/...` ni `/pick-minigame`.
@router.get("/{story_id}")
async def story_detail(story_id: str):
    try:
        story = get_story(story_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Historia no encontrada")

    return {
        "story_id": story_id,
        "story": story,
    }


app.include_router(router)
