"""Apuestas de Copa Final para Modo Historia.

Guarda apuestas por jugador dentro de rooms.game_state sin requerir tablas nuevas.
"""

from copy import deepcopy
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.database import supabase


app = FastAPI(title="Jackbox Mágico Story Bets API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class BetInfo(BaseModel):
    player_name: str
    wager: str


class ResetInfo(BaseModel):
    tv_token: Optional[str] = None


VALID_WAGERS = {"25", "50", "all"}


def clean_room_code(room_code: str) -> str:
    code = str(room_code or "").upper().strip()
    if not code:
        raise HTTPException(status_code=400, detail="Código de sala vacío")
    return code


def require_supabase():
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales de Supabase")


def get_room(room_code: str):
    require_supabase()
    code = clean_room_code(room_code)
    room = (
        supabase.table("rooms")
        .select("id, room_code, status, game_state")
        .eq("room_code", code)
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


def get_bet_key(state: dict) -> str:
    story = state.get("story_public") if isinstance(state.get("story_public"), dict) else {}
    step = story.get("story_step_index", 0)
    phase = state.get("phase") or "copa_final"
    round_id = state.get("round_id") or state.get("current_game_id") or "final"
    return f"{phase}:{step}:{round_id}"


def is_final_phase(state: dict) -> bool:
    current_game_id = state.get("current_game_id") or state.get("game_id")
    phase = state.get("phase") or ""
    step = None
    if isinstance(state.get("story_public"), dict):
        step = state["story_public"].get("current_story_step")
    if not step and isinstance(state.get("story"), dict):
        step = state["story"].get("current_story_step")
    step_type = step.get("type") if isinstance(step, dict) else state.get("story_step_type")
    return current_game_id == "copa_final" or phase == "copa_final" or step_type == "copa_final"


def build_payload(room: dict, state: dict):
    players = get_players(room["id"])
    player_names = [p.get("name") for p in players if p.get("name")]
    bet_key = get_bet_key(state)
    bet_state = state.get("story_bets") if isinstance(state.get("story_bets"), dict) else {}
    bets = bet_state.get("bets", {}) if bet_state.get("key") == bet_key else {}
    clean_bets = {name: bets.get(name) for name in player_names if bets.get(name) in VALID_WAGERS}
    pending = [name for name in player_names if name not in clean_bets]
    return {
        "room_code": room.get("room_code"),
        "bet_key": bet_key,
        "bets": clean_bets,
        "bet_count": len(clean_bets),
        "total_players": len(player_names),
        "pending_players": pending,
        "all_bet": bool(player_names) and not pending,
        "is_final_phase": is_final_phase(state),
        "phase": state.get("phase"),
    }


@app.get("/api/story-bet/health")
async def health():
    return {"status": "ok", "message": "Apuestas de Copa Final listas."}


@app.get("/api/story-bet/{room_code}/status")
async def bet_status(room_code: str):
    room = get_room(room_code)
    state = deepcopy(room.get("game_state") or {})
    return build_payload(room, state)


@app.post("/api/story-bet/{room_code}/player")
async def player_bet(room_code: str, info: BetInfo):
    wager = str(info.wager or "").strip().lower()
    if wager not in VALID_WAGERS:
        raise HTTPException(status_code=400, detail="Apuesta inválida")

    player_name = str(info.player_name or "").strip()
    if not player_name:
        raise HTTPException(status_code=400, detail="Falta player_name")

    room = get_room(room_code)
    state = deepcopy(room.get("game_state") or {})
    players = get_players(room["id"])
    player_names = [p.get("name") for p in players if p.get("name")]

    if player_name not in player_names:
        raise HTTPException(status_code=403, detail="El jugador no pertenece a esta sala")

    if not is_final_phase(state):
        raise HTTPException(status_code=409, detail="La sala todavía no está en Copa Final")

    bet_key = get_bet_key(state)
    bet_state = state.get("story_bets") if isinstance(state.get("story_bets"), dict) else {}
    if bet_state.get("key") != bet_key:
        bet_state = {"key": bet_key, "bets": {}}

    bets = bet_state.get("bets") if isinstance(bet_state.get("bets"), dict) else {}
    bets[player_name] = wager
    bet_state["bets"] = bets
    state["story_bets"] = bet_state

    supabase.table("rooms").update({"game_state": state}).eq("room_code", clean_room_code(room_code)).execute()

    return build_payload(room, state)


@app.post("/api/story-bet/{room_code}/reset")
async def reset_bets(room_code: str, info: ResetInfo):
    room = get_room(room_code)
    state = deepcopy(room.get("game_state") or {})
    state["story_bets"] = {"key": get_bet_key(state), "bets": {}}
    supabase.table("rooms").update({"game_state": state}).eq("room_code", clean_room_code(room_code)).execute()
    return build_payload(room, state)
