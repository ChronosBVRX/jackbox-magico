import asyncio
from copy import deepcopy

from fastapi import FastAPI, HTTPException

from api.database import supabase
from api.services import room_service


app = FastAPI(title="Jackbox Magico Room Status API")

TV_HOST_NAME = "TV"


def make_tv_host() -> dict:
    return {
        "name": TV_HOST_NAME,
        "claimed": True,
        "managed_by": "tv",
        "authority": "tv_screen",
    }


def force_tv_authority(state: dict | None) -> dict:
    state = deepcopy(state or {})
    state["host"] = room_service.make_tv_host()
    state["managed_by"] = "tv"
    state["host_authority"] = "tv"
    state["story_controlled_by"] = "tv"
    state["story_autopilot"] = True

    lifecycle = state.get("lifecycle")
    if not isinstance(lifecycle, dict):
        lifecycle = {}

    lifecycle["host_authority"] = "tv"
    lifecycle["tv_connected"] = True
    state["lifecycle"] = lifecycle

    return state


def sanitize_game_state(state: dict) -> dict:
    public_state = deepcopy(state or {})
    phase = public_state.get("phase", "lobby")

    public_state["host"] = make_tv_host()
    public_state["managed_by"] = "tv"
    public_state["host_authority"] = "tv"

    if not str(phase).startswith("results_"):
        for key in [
            "correct",
            "correct_label",
            "funniest",
            "last_results",
            "duel_result",
            "point_events",
            "sombrero_result",
            "pociones_result",
            "snitch_result",
            "trivia_result",
            "retratos_result",
            "mapa_result",
            "hechizo_result",
            "votes_by_voter",
            "votes_by_target",
        ]:
            public_state.pop(key, None)

        answered = public_state.get("answered")
        if isinstance(answered, dict):
            public_state["answered"] = {name: True for name in answered.keys()}

        answers = public_state.get("answers")
        if isinstance(answers, dict):
            public_state["answers"] = {name: True for name in answers.keys()}

        attempts_by_player = public_state.get("attempts_by_player")
        if isinstance(attempts_by_player, dict):
            public_state["attempts_by_player"] = {
                name: len(attempts or []) if isinstance(attempts, list) else int(attempts or 0)
                for name, attempts in attempts_by_player.items()
            }

    return public_state


def get_room_by_code(room_code: str):
    clean_code = str(room_code or "").upper().strip()

    if not clean_code:
        raise HTTPException(status_code=400, detail="Código de sala vacío")

    room = (
        supabase.table("rooms")
        .select("id, status, game_state")
        .eq("room_code", clean_code)
        .execute()
    )

    if not room.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    return room.data[0]


def get_players(room_id: int):
    players = (
        supabase.table("players")
        .select("name, house, score, gender")
        .eq("room_id", room_id)
        .execute()
    )

    return players.data or []


@app.get("/api/room/{room_code}/status")
async def get_room_status(room_code: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    clean_code = str(room_code or "").upper().strip()

    if len(clean_code) < 4:
        raise HTTPException(
            status_code=400,
            detail=f"Código de sala inválido: {room_code}",
        )

    room = get_room_by_code(clean_code)
    players = get_players(room["id"])

    raw_state = room.get("game_state") or {"phase": "lobby"}
    state = force_tv_authority(raw_state)

    if not room_service.state_has_tv_authority(raw_state):
        supabase.table("rooms").update({
            "game_state": state,
        }).eq("room_code", clean_code).execute()

    return {
        "status": room.get("status"),
        "game_state": sanitize_game_state(state),
        "players": players,
        "host": make_tv_host(),
        "server_ts": int(asyncio.get_event_loop().time() * 1000),
    }
