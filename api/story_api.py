"""Endpoints del modo Historia.

Este archivo puede funcionar de dos formas:
1. Como router importable desde `api/main.py`.
2. Como app serverless independiente en Vercel para `/api/story/...`.

Esto permite probar catálogo, inicio, avance y selección de minijuegos sin tocar
todavía el flujo principal de trivia/minijuegos.
"""

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from api.story_orchestrator import (
    STORY_MINIGAME_POOL,
    advance_story_state,
    build_story_state,
    get_current_step,
    get_story,
    get_story_public_payload,
    list_stories,
    pick_minigame_for_story,
)


app = FastAPI(title="Jackbox Mágico Story API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/api/story", tags=["story"])


class StoryStartInfo(BaseModel):
    story_id: str


class StoryAdvanceInfo(BaseModel):
    story_state: dict


class MinigamePickInfo(BaseModel):
    used_minigames: list[str] = Field(default_factory=list)
    recent_minigames: list[str] = Field(default_factory=list)
    allowed_pool: list[str] | None = None
    random_seed: str | None = None


@router.get("/health")
async def story_health():
    return {
        "status": "ok",
        "message": "Motor narrativo listo.",
    }


@router.get("/catalog")
async def story_catalog():
    return {
        "stories": list_stories(),
        "minigame_pool": STORY_MINIGAME_POOL,
    }


@router.get("/{story_id}")
async def story_detail(story_id: str):
    try:
        story = get_story(story_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Historia no encontrada")

    return {
        "story_id": story_id,
        "story": story,
    }


@router.post("/start")
async def story_start(info: StoryStartInfo):
    try:
        state = build_story_state(info.story_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Historia no encontrada")

    return {
        "message": "Modo historia preparado",
        "story_state": state,
        "public_story": get_story_public_payload(state),
        "current_step": get_current_step(state),
    }


@router.post("/advance")
async def story_advance(info: StoryAdvanceInfo):
    state = advance_story_state(info.story_state)

    return {
        "message": "Historia avanzada" if not state.get("story_completed") else "Historia completada",
        "story_state": state,
        "public_story": get_story_public_payload(state),
        "current_step": get_current_step(state),
    }


@router.post("/pick-minigame")
async def story_pick_minigame(info: MinigamePickInfo):
    result = pick_minigame_for_story(
        used_minigames=info.used_minigames,
        recent_minigames=info.recent_minigames,
        allowed_pool=info.allowed_pool,
        random_seed=info.random_seed,
    )

    return {
        "message": "Minijuego seleccionado",
        **result,
    }


app.include_router(router)
