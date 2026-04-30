from copy import deepcopy

from fastapi import FastAPI, HTTPException

from api.database import supabase, PlayerJoinInfo


app = FastAPI(title="Jackbox Magico Player Join API")

VALID_HOUSES = {"Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"}
MAX_PLAYERS = 8
MAX_PLAYERS_PER_HOUSE = 2
MAX_PLAYER_NAME_LENGTH = 15


def clean_room_code(room_code: str):
    code = str(room_code or "").upper().strip()
    if not code:
        raise HTTPException(status_code=400, detail="Código de sala vacío")
    if len(code) != 4 or not code.isalpha():
        raise HTTPException(status_code=400, detail="Código de sala inválido")
    return code


def clean_player_name(player_name: str):
    name = " ".join(str(player_name or "").strip().split())
    if not name:
        raise HTTPException(status_code=400, detail="Nombre de jugador vacío")
    if len(name) > MAX_PLAYER_NAME_LENGTH:
        raise HTTPException(status_code=400, detail=f"El nombre no puede exceder {MAX_PLAYER_NAME_LENGTH} caracteres")
    return name


def validate_house(house: str):
    if house not in VALID_HOUSES:
        raise HTTPException(status_code=400, detail="Casa inválida")
    return house


def get_room_by_code(room_code: str):
    code = clean_room_code(room_code)
    room = (
        supabase.table("rooms")
        .select("id, status, game_state")
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


def ensure_tv_host(state: dict):
    state = deepcopy(state or {})
    state["host"] = {
        "name": "TV",
        "managed_by": "tv",
        "authority": "tv_screen",
    }
    state["managed_by"] = "tv"
    state["host_authority"] = "tv"
    state["story_controlled_by"] = "tv"
    state["story_autopilot"] = True

    lifecycle = state.get("lifecycle") if isinstance(state.get("lifecycle"), dict) else {}
    lifecycle["host_authority"] = "tv"
    lifecycle["tv_connected"] = True
    state["lifecycle"] = lifecycle
    return state


@app.post("/api/player/join")
async def join_room(info: PlayerJoinInfo):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    room_code = clean_room_code(info.room_code)
    player_name = clean_player_name(info.player_name)
    house = validate_house(info.house)

    room = get_room_by_code(room_code)
    room_id = room["id"]
    status = room.get("status")
    state = ensure_tv_host(room.get("game_state") or {"phase": "lobby"})

    existing_player = (
        supabase.table("players")
        .select("id, name, house, score")
        .eq("room_id", room_id)
        .eq("name", player_name)
        .execute()
    )
    is_reconnect = bool(existing_player.data)

    players_in_room = get_players(room_id)

    if not is_reconnect and len(players_in_room) >= MAX_PLAYERS:
        raise HTTPException(status_code=403, detail="La sala ya tiene 8 jugadores")

    if not is_reconnect:
        players_same_house = [
            player for player in players_in_room
            if player.get("house") == house
        ]
        if len(players_same_house) >= MAX_PLAYERS_PER_HOUSE:
            raise HTTPException(status_code=403, detail="Esa casa ya tiene 2 jugadores")

    if not is_reconnect and status != "lobby":
        raise HTTPException(status_code=403, detail="Partida ya en curso")

    if not is_reconnect:
        insert_result = supabase.table("players").insert({
            "room_id": room_id,
            "name": player_name,
            "house": house,
        }).execute()

        if not getattr(insert_result, "data", None):
            raise HTTPException(status_code=500, detail="No se pudo registrar el jugador")

    supabase.table("rooms").update({
        "game_state": state,
    }).eq("room_code", room_code).execute()

    return {
        "message": "¡Bienvenido de vuelta!" if is_reconnect else "¡Bienvenido!",
        "reconnected": is_reconnect,
        "is_host": False,
        "host_token": None,
        "host_name": "TV",
        "player_name": player_name,
        "house": house,
    }
