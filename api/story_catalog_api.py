from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.story_orchestrator import STORY_CATALOG, STORY_MINIGAME_POOL
from api.game_catalog import GAME_CATALOG


app = FastAPI(title="Jackbox Mágico Story Catalog API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)


def get_game_name(game_id: str) -> str:
    game = GAME_CATALOG.get(game_id, {})
    return (
        game.get("short_name")
        or game.get("name")
        or game_id.replace("_", " ").title()
    )


def build_story_catalog():
    stories = []

    for story_id, story in STORY_CATALOG.items():
        steps = story.get("steps", [])

        trivia_blocks = [
            step for step in steps
            if step.get("type") == "trivia_block"
        ]

        minigame_steps = [
            step for step in steps
            if step.get("type") == "minigame_random"
        ]

        includes_final = any(
            step.get("type") == "copa_final"
            for step in steps
        )

        available_minigames = []

        for step in minigame_steps:
            pool = step.get("pool") or STORY_MINIGAME_POOL

            for game_id in pool:
                if game_id not in available_minigames:
                    available_minigames.append(game_id)

        available_minigame_names = [
            get_game_name(game_id)
            for game_id in available_minigames
        ]

        trivia_questions = sum(
            int(step.get("questions") or 0)
            for step in trivia_blocks
        )

        stories.append({
            "story_id": story_id,
            "title": story.get("title", "Historia mágica"),
            "tone": story.get("tone", "aventura mágica"),
            "description": story.get("description", ""),
            "steps": len(steps),
            "format": "Historia guiada con trivia, minijuegos sorpresa y Copa Final",
            "estimated_minutes": "18–28 min",
            "trivia_blocks": len(trivia_blocks),
            "trivia_questions": trivia_questions,
            "random_minigame_slots": len(minigame_steps),
            "includes_final": includes_final,
            "available_minigames": available_minigames,
            "available_minigame_names": available_minigame_names,
            "minigame_policy": (
                "No se juegan todos los minijuegos en una sola partida. "
                "La historia combina trivia con pruebas sorpresa elegidas del catálogo "
                "para mantener variedad y evitar repetición."
            ),
        })

    return stories


@app.get("/api/story/catalog")
async def story_catalog():
    return {
        "stories": build_story_catalog(),
        "minigame_pool": STORY_MINIGAME_POOL,
    }


@app.get("/api/story/health")
async def story_catalog_health():
    return {
        "status": "ok",
        "message": "Catálogo de historias funcionando.",
    }
