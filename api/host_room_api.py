import random
import string

from fastapi import FastAPI, HTTPException

from api.database import supabase


app = FastAPI(title="Jackbox Magico TV Room API")


def generate_room_code():
    return "".join(random.choices(string.ascii_uppercase, k=4))


def make_tv_host():
    return {
        "name": "TV",
        "managed_by": "tv",
        "authority": "tv_screen",
    }


@app.post("/api/host/create_room")
async def create_room():
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    code = generate_room_code()
    game_state = {
        "phase": "lobby",
        "host": make_tv_host(),
        "managed_by": "tv",
        "host_authority": "tv",
        "story_controlled_by": "tv",
        "story_autopilot": True,
        "lifecycle": {
            "host_authority": "tv",
            "tv_connected": True,
        },
    }

    supabase.table("rooms").insert({
        "room_code": code,
        "status": "lobby",
        "game_state": game_state,
    }).execute()

    return {
        "message": "Sala creada por TV",
        "room_code": code,
        "host": {
            "name": "TV",
            "claimed": True,
            "managed_by": "tv",
        },
    }
