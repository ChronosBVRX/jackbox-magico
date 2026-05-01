"""Prepara una sala existente para modo Historia.

La TV ya crea una sala normal con `/api/host/create_room` y el primer celular que
entra reclama el host. Este endpoint permite convertir ESA MISMA sala en modo
Historia, evitando crear una segunda sala que confunda a los jugadores.
"""

from copy import deepcopy

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.database import HostControlInfo, supabase
from api.services import room_service
from api.story_orchestrator import build_story_state, get_story_public_payload, get_story


app = FastAPI(title="Jackbox Mágico Story Prepare API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StoryPrepareInfo(HostControlInfo):
    story_id: str




@app.get("/api/story-prepare/health")
async def health():
    return {
        "status": "ok",
        "message": "Preparador de modo Historia listo.",
    }


@app.post("/api/story-prepare/host/{room_code}")
async def prepare_existing_room_for_story(room_code: str, info: StoryPrepareInfo):
    room = room_service.get_room_by_code(room_code)
    current_state = deepcopy(room.get("game_state") or {})
    host = room_service.validate_host(current_state, info.player_name, info.host_token)

    if room.get("status") != "lobby":
        raise HTTPException(
            status_code=409,
            detail="Solo puedes preparar modo Historia desde el lobby.",
        )

    try:
        story_state = build_story_state(info.story_id)
        story = get_story(info.story_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Historia no encontrada")

    new_state = {
        **current_state,
        "phase": "lobby",
        "mode": "story",
        "host": host,
        "story": story_state,
        "story_public": get_story_public_payload(story_state),
        "story_dialogue": story.get("intro", []),
        "story_transition_reason": "Historia preparada. Cuando todos estén listos, inicia la aventura.",
    }

    room_service.update_room_with_version(room_code, new_state, room.get("state_version", 0))

    return {
        "message": "Sala preparada en modo Historia",
        "room_code": room["room_code"],
        "story_id": info.story_id,
        "story_title": story.get("title"),
        "story": get_story_public_payload(story_state),
    }
