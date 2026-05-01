from fastapi import FastAPI, HTTPException
from api.database import supabase
from api.services import room_service

app = FastAPI(title="Jackbox Magico TV Room API")

@app.post("/api/host/create_room")
async def create_room():
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    code = room_service.generate_unique_room_code()
    
    game_state = {
        "phase": "lobby",
        "host": room_service.make_tv_host(),
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
        "state_version": 0
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
