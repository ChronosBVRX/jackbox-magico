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


HOUSE_ORDER = ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"]
MIN_PLAYERS_TO_START = 4


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


def get_house_coverage(players):
    """Calcula qué casas están presentes entre todos los jugadores."""
    houses_present = set()
    for player in players or []:
        house = player.get("house")
        if house in HOUSE_ORDER:
            houses_present.add(house)

    missing_houses = [house for house in HOUSE_ORDER if house not in houses_present]

    return {
        "houses_present": list(houses_present),
        "missing_houses": missing_houses,
        "has_all_houses": len(missing_houses) == 0,
    }


def get_ready_house_coverage(players, ready_players):
    """Calcula qué casas tienen al menos un jugador listo."""
    ready_set = set(ready_players or [])
    ready_houses = set()

    for player in players or []:
        if player.get("name") in ready_set and player.get("house") in HOUSE_ORDER:
            ready_houses.add(player.get("house"))

    missing_ready_houses = [house for house in HOUSE_ORDER if house not in ready_houses]

    return {
        "ready_houses": list(ready_houses),
        "missing_ready_houses": missing_ready_houses,
        "has_ready_house_coverage": len(missing_ready_houses) == 0,
    }


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

    # Cobertura de casas general (todos los jugadores)
    house_cov = get_house_coverage(players)
    # Cobertura de casas en los jugadores listos
    ready_house_cov = get_ready_house_coverage(players, ready_players)

    has_minimum_players = len(player_names) >= MIN_PLAYERS_TO_START
    has_house_coverage = house_cov["has_all_houses"]

    # minimum_ready_met: al menos 4 listos Y una casa representada por cada casa
    minimum_ready_met = (
        len(ready_players) >= MIN_PLAYERS_TO_START
        and ready_house_cov["has_ready_house_coverage"]
    )

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
        # Cobertura de casas (todos los jugadores)
        "has_minimum_players": has_minimum_players,
        "has_house_coverage": has_house_coverage,
        "houses_present": house_cov["houses_present"],
        "missing_houses": house_cov["missing_houses"],
        # Cobertura de casas (jugadores listos)
        "ready_houses": ready_house_cov["ready_houses"],
        "missing_ready_houses": ready_house_cov["missing_ready_houses"],
        "has_ready_house_coverage": ready_house_cov["has_ready_house_coverage"],
        # Regla principal de avance
        "minimum_ready_met": minimum_ready_met,
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

    ready_state["players"] = ready_players
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
