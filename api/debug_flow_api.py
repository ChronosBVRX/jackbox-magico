"""Debug Flow API — solo para modo pruebas (?debug=1 en la TV).

Permite avanzar/retroceder el estado del juego guardando snapshots locales
en game_state.debug_history. No afecta el modo normal de producción.
"""

from copy import deepcopy
from typing import Optional
import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.database import supabase
from api.services import room_service


app = FastAPI(title="Jackbox Mágico Debug Flow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_HISTORY = 20  # Máximo de snapshots guardados en debug_history


class DebugInfo(BaseModel):
    tv_token: Optional[str] = None


def get_lifecycle(state: dict) -> dict:
    lifecycle = (state or {}).get("lifecycle")
    return lifecycle if isinstance(lifecycle, dict) else {}


def validate_tv_token(state: dict, tv_token: Optional[str]) -> bool:
    """Valida o acepta el token de TV. En debug es permisivo."""
    lifecycle = get_lifecycle(state)
    saved_token = lifecycle.get("tv_token")
    if saved_token and tv_token and saved_token != tv_token:
        return False
    return True


def enforce_tv_authority(state: dict, tv_token: Optional[str] = None) -> dict:
    """Asegura que la autoridad de TV esté marcada."""
    state["managed_by"] = "tv"
    state["host_authority"] = "tv"
    state["story_controlled_by"] = "tv"
    state["story_autopilot"] = True
    return state


def push_snapshot(state: dict) -> dict:
    """Guarda el estado actual en debug_history antes de modificarlo."""
    history = state.get("debug_history")
    if not isinstance(history, list):
        history = []

    snapshot_state = deepcopy(state)
    snapshot_state.pop("debug_history", None)  # Evitar historia dentro de historia

    snapshot = {
        "saved_at": time.time(),
        "phase": state.get("phase", "unknown"),
        "state": snapshot_state,
    }

    history.append(snapshot)
    # Mantener solo los últimos MAX_HISTORY snapshots
    if len(history) > MAX_HISTORY:
        history = history[-MAX_HISTORY:]

    result = deepcopy(state)
    result["debug_history"] = history
    return result


def pop_snapshot(state: dict):
    """Extrae y regresa el último snapshot del historial. Devuelve None si no hay."""
    history = state.get("debug_history")
    if not isinstance(history, list) or not history:
        return None, state

    last = history[-1]
    remaining = history[:-1]

    restored = deepcopy(last.get("state", {}))
    restored["debug_history"] = remaining
    return last, restored


FIELDS_TO_CLEAR_ON_LOBBY = [
    "answered", "answers", "correct", "correct_label", "last_results",
    "point_events", "round_results", "player_answers", "responses",
    "attack_msg", "attack_options", "correct_index", "reveal_at",
    "target_phase", "story_ready",
]


@app.get("/api/debug-flow/health")
async def health():
    return {"status": "ok", "message": "Debug Flow API lista."}


@app.get("/api/debug-flow/{room_code}/snapshot")
async def get_snapshot(room_code: str):
    """Devuelve el historial de snapshots del estado de la sala."""
    room = room_service.get_room_by_code(room_code)
    state = room.get("game_state") or {}
    history = state.get("debug_history", [])

    return {
        "room_code": room_code,
        "current_phase": state.get("phase"),
        "snapshot_count": len(history),
        "snapshots": [
            {"index": i, "phase": s.get("phase"), "saved_at": s.get("saved_at")}
            for i, s in enumerate(history)
        ],
    }


@app.post("/api/debug-flow/{room_code}/save-snapshot")
async def save_snapshot(room_code: str, info: DebugInfo):
    """Guarda el estado actual como snapshot antes de un avance manual."""
    room = room_service.get_room_by_code(room_code)
    state = deepcopy(room.get("game_state") or {})

    if not validate_tv_token(state, info.tv_token):
        raise HTTPException(status_code=403, detail="Token de TV inválido")

    state = push_snapshot(state)
    room_service.update_room_with_version(room_code, state, room.get("state_version", 0))

    history = state.get("debug_history", [])
    return {
        "message": "Snapshot guardado",
        "phase": state.get("phase"),
        "snapshot_count": len(history),
    }


@app.post("/api/debug-flow/{room_code}/forward")
async def debug_forward(room_code: str, info: DebugInfo):
    """
    Guarda snapshot del estado actual y luego ejecuta la lógica de avance
    (equivalente a /api/tv/{room}/continue).
    """
    from api.story_tv_api import continue_from_tv, TvStoryInfo

    room = room_service.get_room_by_code(room_code)
    state = deepcopy(room.get("game_state") or {})

    if not validate_tv_token(state, info.tv_token):
        raise HTTPException(status_code=403, detail="Token de TV inválido")

    # 1. Guardar snapshot antes de avanzar
    state = push_snapshot(state)
    room_service.update_room_with_version(room_code, state, room.get("state_version", 0))

    # 2. Llamar al endpoint de continue (re-usamos la lógica existente)
    try:
        tv_info = TvStoryInfo(tv_token=info.tv_token or "debug-token")
        result = await continue_from_tv(room_code, tv_info)
        return {
            "message": "Avanzado (con snapshot guardado)",
            **result,
        }
    except HTTPException as e:
        # Si continue falla, intentar next-step como fallback
        return {
            "message": f"continue falló ({e.detail}), snapshot guardado de todas formas",
            "phase": state.get("phase"),
        }


@app.post("/api/debug-flow/{room_code}/back")
async def debug_back(room_code: str, info: DebugInfo):
    """Restaura el último snapshot del historial de debug."""
    room = room_service.get_room_by_code(room_code)
    state = deepcopy(room.get("game_state") or {})

    if not validate_tv_token(state, info.tv_token):
        raise HTTPException(status_code=403, detail="Token de TV inválido")

    last_snapshot, restored = pop_snapshot(state)

    if last_snapshot is None:
        return {
            "message": "No hay estado anterior para restaurar",
            "phase": state.get("phase"),
            "snapshot_count": 0,
        }

    # Preservar autoridad de TV
    restored = enforce_tv_authority(restored, info.tv_token)

    room_service.update_room_with_version(room_code, restored, room.get("state_version", 0))

    remaining = len(restored.get("debug_history", []))
    return {
        "message": "Estado anterior restaurado",
        "phase": restored.get("phase"),
        "restored_from_phase": last_snapshot.get("phase"),
        "snapshots_remaining": remaining,
    }


@app.post("/api/debug-flow/{room_code}/lobby")
async def debug_lobby(room_code: str, info: DebugInfo):
    """Regresa la sala a estado de lobby manteniendo historia y jugadores."""
    room = room_service.get_room_by_code(room_code)
    state = deepcopy(room.get("game_state") or {})

    if not validate_tv_token(state, info.tv_token):
        raise HTTPException(status_code=403, detail="Token de TV inválido")

    # Guardar snapshot antes de ir a lobby
    state = push_snapshot(state)

    # Construir estado de lobby limpio
    lobby_state = {
        "phase": "lobby",
        "mode": state.get("mode"),
        "story": state.get("story"),
        "story_public": state.get("story_public"),
        "host": state.get("host"),
        "lifecycle": state.get("lifecycle"),
        "managed_by": "tv",
        "host_authority": "tv",
        "story_controlled_by": "tv",
        "story_autopilot": True,
        "debug_history": state.get("debug_history", []),
    }

    # Limpiar campos temporales
    for field in FIELDS_TO_CLEAR_ON_LOBBY:
        lobby_state.pop(field, None)

    room_service.update_room_with_version(room_code, lobby_state, room.get("state_version", 0))

    # Cambiar status de Supabase a lobby
    supabase.table("rooms").update({
        "status": "lobby",
        "state_version": room.get("state_version", 0) + 1,
    }).eq("room_code", room_code.upper()).execute()

    return {
        "message": "Sala regresada a lobby",
        "phase": "lobby",
    }
