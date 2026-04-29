from copy import deepcopy
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.database import supabase
from api import copa_final


app = FastAPI(title="Copa de las Casas: Pregunta Final API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CopaWagerInfo(BaseModel):
    room_code: str
    player_name: str
    wager: Any


class CopaAnswerInfo(BaseModel):
    room_code: str
    player_name: str
    answer: str
    client_elapsed_ms: Optional[int] = None


class CopaHostInfo(BaseModel):
    player_name: str
    host_token: str


def clean_room_code(room_code: str) -> str:
    room_code = str(room_code or "").upper().strip()
    if not room_code:
        raise HTTPException(status_code=400, detail="Falta room_code")
    return room_code


def clean_player_name(player_name: str) -> str:
    player_name = str(player_name or "").strip()
    if not player_name:
        raise HTTPException(status_code=400, detail="Falta player_name")
    return player_name


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
        .select("id, name, house, score")
        .eq("room_id", room_id)
        .execute()
    )
    return players.data or []


def update_room_state(room_code: str, state: dict):
    supabase.table("rooms").update({
        "game_state": state,
    }).eq("room_code", clean_room_code(room_code)).execute()


def validate_copa_state(state: dict):
    phase = (state or {}).get("phase")
    if phase not in {
        copa_final.PHASE_BETTING,
        copa_final.PHASE_QUESTION,
        copa_final.RESULTS_PHASE,
        copa_final.LEGACY_PHASE,
    }:
        raise HTTPException(status_code=409, detail="La Copa Final no está activa en esta sala")


def validate_host(state: dict, info: CopaHostInfo):
    host = state.get("host") if isinstance(state.get("host"), dict) else None

    if not host:
        raise HTTPException(status_code=403, detail="Esta sala todavía no tiene host")

    if host.get("name") != info.player_name or host.get("token") != info.host_token:
        raise HTTPException(status_code=403, detail="No eres el host de esta sala")


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
    if state.get("copa_final_points_applied"):
        return state

    for event in point_events or []:
        add_points(
            room_id=room_id,
            player_name=event.get("player_name"),
            points=int(event.get("points") or 0),
        )

    state["copa_final_points_applied"] = True
    return state


@app.post("/api/copa-final/submit_wager")
async def submit_wager(info: CopaWagerInfo):
    room_code = clean_room_code(info.room_code)
    player_name = clean_player_name(info.player_name)

    room = get_room(room_code)
    state = deepcopy(room.get("game_state") or {})
    validate_copa_state(state)

    players = get_players(room["id"])
    player_house = copa_final.get_player_house(players, player_name)

    result = copa_final.submit_wager(
        state=state,
        player_name=player_name,
        player_house=player_house,
        wager=info.wager,
        players=players,
    )

    update_room_state(room_code, result["state"])

    return {
        "accepted": result.get("accepted", False),
        "already_submitted": result.get("already_submitted", False),
        "message": result.get("message", "Apuesta registrada."),
        "socket_event": "copa_final:wager_submitted",
    }


@app.post("/api/copa-final/open_question/{room_code}")
async def open_question(room_code: str, info: CopaHostInfo):
    room_code = clean_room_code(room_code)
    room = get_room(room_code)
    state = deepcopy(room.get("game_state") or {})
    validate_copa_state(state)
    validate_host(state, info)

    players = get_players(room["id"])
    result = copa_final.open_question(state, players)

    update_room_state(room_code, result["state"])

    return {
        "accepted": result.get("accepted", False),
        "already_open": result.get("already_open", False),
        "message": result.get("message", "Pregunta final revelada."),
        "socket_event": "copa_final:question_opened",
    }


@app.post("/api/copa-final/submit_answer")
async def submit_answer(info: CopaAnswerInfo):
    room_code = clean_room_code(info.room_code)
    player_name = clean_player_name(info.player_name)

    room = get_room(room_code)
    state = deepcopy(room.get("game_state") or {})
    validate_copa_state(state)

    players = get_players(room["id"])
    player_house = copa_final.get_player_house(players, player_name)

    result = copa_final.submit_house_answer(
        state=state,
        player_name=player_name,
        player_house=player_house,
        answer=info.answer,
        client_elapsed_ms=info.client_elapsed_ms,
    )

    update_room_state(room_code, result["state"])

    return {
        "accepted": result.get("accepted", False),
        "message": result.get("message", "Respuesta de casa registrada."),
        "socket_event": "copa_final:answer_submitted",
    }


@app.post("/api/copa-final/reveal_results/{room_code}")
async def reveal_results(room_code: str, info: CopaHostInfo):
    room_code = clean_room_code(room_code)
    room = get_room(room_code)
    state = deepcopy(room.get("game_state") or {})
    validate_copa_state(state)
    validate_host(state, info)

    players = get_players(room["id"])
    result = copa_final.reveal_results(state, players)

    if not result.get("accepted"):
        raise HTTPException(status_code=409, detail=result.get("message", "No se pudieron revelar resultados"))

    new_state = apply_point_events_once(
        room_id=room["id"],
        state=result["state"],
        point_events=result["state"].get("point_events", []),
    )

    update_room_state(room_code, new_state)

    return {
        "accepted": True,
        "already_revealed": result.get("already_revealed", False),
        "result": result.get("result"),
        "socket_event": "copa_final:results_revealed",
    }
