from copy import deepcopy

from fastapi import FastAPI, HTTPException

from api.database import supabase, PlayerJoinInfo
from api.services import room_service, player_service


app = FastAPI(title="Jackbox Magico Player Join API")




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

    # Validar entrada usando el servicio
    name = player_service.clean_player_name(info.player_name)
    
    room = room_service.get_room_by_code(info.room_code)
    room_id = room["id"]
    status = room.get("status")
    state = ensure_tv_host(room.get("game_state") or {"phase": "lobby"})

    # Usar el servicio para validar unión
    player_service.validate_player_join(room_id, name, info.house)

    # Verificar si es reconexión
    existing_player = (
        supabase.table("players")
        .select("id")
        .eq("room_id", room_id)
        .eq("name", name)
        .execute()
    )
    is_reconnect = bool(existing_player.data)

    if not is_reconnect and status != "lobby":
        raise HTTPException(status_code=403, detail="Partida ya en curso")

    if not is_reconnect:
        supabase.table("players").insert({
            "room_id": room_id,
            "name": name,
            "house": info.house,
            "gender": info.gender or "wizard"
        }).execute()

    # Actualizar estado usando el servicio con bloqueo optimista
    room_service.update_room_with_version(room["room_code"], state, room.get("state_version", 0))

    return {
        "message": "¡Bienvenido de vuelta!" if is_reconnect else "¡Bienvenido!",
        "reconnected": is_reconnect,
        "is_host": False,
        "host_token": None,
        "host_name": "TV",
    }
