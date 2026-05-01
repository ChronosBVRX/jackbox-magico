"""Ready check para Modo Historia.

Permite que cada jugador marque "Estoy listo" después de resultados o antes de
una transición. La TV puede consultar el estado y avanzar cuando todos estén listos.
"""

from copy import deepcopy
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.database import supabase
from api.services import room_service


app = FastAPI(title="Jackbox Mágico Story Ready API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ReadyInfo(BaseModel):
    player_name: Optional[str] = None
    ready: bool = True


class ResetInfo(BaseModel):
    tv_token: Optional[str] = None




def get_players(room_id: int):
    players = (
        supabase.table("players")
        .select("name, house, score")
        .eq("room_id", room_id)
        .execute()
    )
    return players.data or []


def get_ready_key(state: dict) -> str:
    phase = (state or {}).get("phase") or "lobby"
    round_id = (
        (state or {}).get("round_id")
        or (state or {}).get("question_id")
        or (state or {}).get("current_question_id")
        or (state or {}).get("current_game_id")
        or "round"
    )
    step_index = (
        (state or {}).get("story_public", {}).get("story_step_index")
        if isinstance((state or {}).get("story_public"), dict)
        else (state or {}).get("story", {}).get("story_step_index")
        if isinstance((state or {}).get("story"), dict)
        else 0
    )
    return f"{phase}:{step_index}:{round_id}"


def get_ready_state(state: dict) -> dict:
    ready_state = (state or {}).get("story_ready")
    return ready_state if isinstance(ready_state, dict) else {}


def build_payload(room: dict, state: dict):
    players = get_players(room["id"])
    player_names = [player.get("name") for player in players if player.get("name")]
    ready_key = get_ready_key(state)
    ready_state = get_ready_state(state)

    if ready_state.get("key") != ready_key:
        ready_players = []
    else:
        ready_players = [name for name in ready_state.get("players", []) if name in player_names]

    pending_players = [name for name in player_names if name not in ready_players]
    all_ready = bool(player_names) and len(pending_players) == 0

    return {
        "room_code": room.get("room_code"),
        "ready_key": ready_key,
        "ready_players": ready_players,
        "pending_players": pending_players,
        "ready_count": len(ready_players),
        "total_players": len(player_names),
        "all_ready": all_ready,
        "phase": state.get("phase"),
        "story_mode": state.get("mode") == "story",
        "story_controlled_by": state.get("story_controlled_by") or state.get("managed_by"),
    }


@app.get("/api/story-ready/health")
async def health():
    return {"status": "ok", "message": "Ready check de historia listo."}


@app.get("/api/story-ready/{room_code}/status")
async def ready_status(room_code: str):
    room = room_service.get_room_by_code(room_code)
    state = deepcopy(room.get("game_state") or {})
    return build_payload(room, state)


@app.post("/api/story-ready/{room_code}/player")
async def player_ready(room_code: str, info: ReadyInfo):
    player_name = str(info.player_name or "").strip()
    if not player_name:
        raise HTTPException(status_code=400, detail="Falta player_name")

    room = room_service.get_room_by_code(room_code)
    state = deepcopy(room.get("game_state") or {})
    players = get_players(room["id"])
    player_names = [player.get("name") for player in players if player.get("name")]

    if player_name not in player_names:
        raise HTTPException(status_code=403, detail="El jugador no pertenece a esta sala")

    ready_key = get_ready_key(state)
    ready_state = get_ready_state(state)

    if ready_state.get("key") != ready_key:
        ready_state = {
            "key": ready_key,
            "players": [],
        }

    ready_players = list(ready_state.get("players", []))

    if info.ready:
        if player_name not in ready_players:
            ready_players.append(player_name)
    else:
        ready_players = [name for name in ready_players if name != player_name]

    state["story_ready"] = ready_state
    
    room_service.update_room_with_version(room_code, state, room.get("state_version", 0))

    return build_payload(room, state)


@app.post("/api/story-ready/{room_code}/reset")
async def reset_ready(room_code: str, info: ResetInfo):
    room = room_service.get_room_by_code(room_code)
    state = deepcopy(room.get("game_state") or {})
    lifecycle = state.get("lifecycle") if isinstance(state.get("lifecycle"), dict) else {}

    saved_token = lifecycle.get("tv_token")
    if saved_token and info.tv_token and saved_token != info.tv_token:
        raise HTTPException(status_code=403, detail="Token de TV inválido")

    state["story_ready"] = {
        "key": get_ready_key(state),
        "players": [],
    }

    room_service.update_room_with_version(room_code, state, room.get("state_version", 0))

    return build_payload(room, state)
