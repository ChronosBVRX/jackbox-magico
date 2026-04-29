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


def get_host_from_state(state: dict):
    host = (state or {}).get("host")
    return host if isinstance(host, dict) else None


def validate_host(state: dict, info: HostControlInfo):
    host = get_host_from_state(state)

    if not host:
        raise HTTPException(status_code=403, detail="Esta sala todavía no tiene host")

    if host.get("name") != info.player_name:
        raise HTTPException(status_code=403, detail="No eres el host de esta sala")

    if host.get("token") != info.host_token:
        raise HTTPException(status_code=403, detail="Token de host inválido")

    return host


@app.get("/api/story-prepare/health")
async def health():
    return {
        "status": "ok",
        "message": "Preparador de modo Historia listo.",
    }


@app.post("/api/story-prepare/host/{room_code}")
async def prepare_existing_room_for_story(room_code: str, info: StoryPrepareInfo):
    room = get_room(room_code)
    current_state = deepcopy(room.get("game_state") or {})
    host = validate_host(current_state, info)

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

    supabase.table("rooms").update({
        "status": "lobby",
        "game_state": new_state,
    }).eq("room_code", clean_room_code(room_code)).execute()

    return {
        "message": "Sala preparada en modo Historia",
        "room_code": clean_room_code(room_code),
        "story_id": info.story_id,
        "story_title": story.get("title"),
        "story": get_story_public_payload(story_state),
    }
