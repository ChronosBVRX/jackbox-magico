from copy import deepcopy
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.database import supabase
from api import caldero_mentiroso


app = FastAPI(title="El Caldero Mentiroso API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CalderoPlayerInfo(BaseModel):
    room_code: str
    player_name: str


class CalderoActionInfo(BaseModel):
    room_code: str
    player_name: str
    action: str
    target_name: Optional[str] = None


class CalderoRevealInfo(BaseModel):
    player_name: str
    host_token: str


def clean_room_code(room_code: str) -> str:
    room_code = str(room_code or "").upper().strip()
    if not room_code:
        raise HTTPException(status_code=400, detail="Falta room_code")
    return room_code


def get_room(room_code: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales de Supabase")

    room_code = clean_room_code(room_code)
    room = (
        supabase.table("rooms")
        .select("id, status, game_state")
        .eq("room_code", room_code)
        .execute()
    )

    if not room.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    return room.data[0]


def get_players(room_id: int):
    players = (
        supabase.table("players")
        .select("name, house, score")
        .eq("room_id", room_id)
        .execute()
    )
    return players.data or []


def get_player(players: list, player_name: str):
    for player in players or []:
        if player.get("name") == player_name:
            return player
    return None


def update_room_state(room_code: str, state: dict):
    supabase.table("rooms").update({
        "game_state": state,
    }).eq("room_code", clean_room_code(room_code)).execute()


def add_points(room_id: int, player_name: str, points: int):
    if not player_name or not points:
        return

    player = (
        supabase.table("players")
        .select("id, score")
        .eq("room_id", room_id)
        .eq("name", player_name)
        .execute()
    )

    if not player.data:
        return

    current_score = player.data[0].get("score") or 0
    supabase.table("players").update({
        "score": current_score + int(points),
    }).eq("id", player.data[0]["id"]).execute()


def apply_point_events_once(room_id: int, state: dict, point_events: list):
    if state.get("caldero_points_applied"):
        return state

    for event in point_events or []:
        add_points(
            room_id=room_id,
            player_name=event.get("player_name"),
            points=int(event.get("points") or 0),
        )

    state["caldero_points_applied"] = True
    return state


def validate_host(state: dict, info: CalderoRevealInfo):
    host = state.get("host") if isinstance(state.get("host"), dict) else None

    if not host:
        raise HTTPException(status_code=403, detail="Esta sala todavía no tiene host")

    if host.get("name") != info.player_name or host.get("token") != info.host_token:
        raise HTTPException(status_code=403, detail="No eres el host de esta sala")


def sanitize_player_view(view: dict):
    ingredient = view.get("ingredient") or {}
    return {
        **view,
        "ingredient": {
            "id": ingredient.get("id"),
            "type": ingredient.get("type"),
            "label": ingredient.get("label"),
            "emoji": ingredient.get("emoji"),
            "name": ingredient.get("name"),
            "effect": ingredient.get("effect"),
            "tone": ingredient.get("tone"),
        },
    }


@app.post("/api/caldero/player_view")
async def caldero_player_view(info: CalderoPlayerInfo):
    room_code = clean_room_code(info.room_code)
    player_name = str(info.player_name or "").strip()

    if not player_name:
        raise HTTPException(status_code=400, detail="Falta player_name")

    room = get_room(room_code)
    state = deepcopy(room.get("game_state") or {})

    if state.get("phase") != caldero_mentiroso.PHASE:
        raise HTTPException(status_code=409, detail="El Caldero Mentiroso no está activo")

    players = get_players(room["id"])

    if not get_player(players, player_name):
        raise HTTPException(status_code=404, detail="Jugador no encontrado en la sala")

    view = caldero_mentiroso.get_player_view(
        state=state,
        player_name=player_name,
        players=players,
    )

    update_room_state(room_code, state)

    return sanitize_player_view(view)


@app.post("/api/caldero/submit_action")
async def caldero_submit_action(info: CalderoActionInfo):
    room_code = clean_room_code(info.room_code)
    player_name = str(info.player_name or "").strip()

    if not player_name:
        raise HTTPException(status_code=400, detail="Falta player_name")

    room = get_room(room_code)
    state = deepcopy(room.get("game_state") or {})

    if state.get("phase") != caldero_mentiroso.PHASE:
        raise HTTPException(status_code=409, detail="El Caldero Mentiroso no está aceptando acciones")

    players = get_players(room["id"])
    player = get_player(players, player_name)

    if not player:
        raise HTTPException(status_code=404, detail="Jugador no encontrado en la sala")

    result = caldero_mentiroso.submit_action(
        state=state,
        player_name=player_name,
        player_house=player.get("house"),
        action=info.action,
        target_name=info.target_name,
        players=players,
    )

    update_room_state(room_code, result["state"])

    return {
        "accepted": result.get("accepted", False),
        "message": result.get("message", "Acción registrada"),
        "action": result.get("action"),
    }


@app.post("/api/caldero/reveal_results/{room_code}")
async def caldero_reveal_results(room_code: str, info: CalderoRevealInfo):
    room_code = clean_room_code(room_code)
    room = get_room(room_code)
    state = deepcopy(room.get("game_state") or {})

    validate_host(state, info)

    if state.get("phase") not in {
        caldero_mentiroso.PHASE,
        caldero_mentiroso.RESULTS_PHASE,
    }:
        raise HTTPException(status_code=409, detail="El Caldero Mentiroso no está activo")

    players = get_players(room["id"])
    result = caldero_mentiroso.reveal_results(state, players)
    new_state = result["state"]

    new_state = apply_point_events_once(
        room_id=room["id"],
        state=new_state,
        point_events=new_state.get("point_events", []),
    )

    update_room_state(room_code, new_state)

    return {
        "accepted": True,
        "already_revealed": result.get("already_revealed", False),
        "result": result.get("result"),
    }
