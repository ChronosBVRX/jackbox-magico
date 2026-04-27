import random
from fastapi import APIRouter
from api.database import supabase

router = APIRouter()

TRIVIA_POOL = [
    {"q": "¿Qué hechizo usarías para no pagar la cuenta?", "o": ["Obliviate", "Lumos", "Expelliarmus", "Alohomora"], "c": "Obliviate"},
    {"q": "¿Qué criatura te robaría el aguinaldo?", "o": ["Dementor", "Escarbato", "Boggart", "Thestral"], "c": "Escarbato"},
    {"q": "¿Qué casa sobreviviría mejor a una peda mágica?", "o": ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"], "c": "Hufflepuff"},
    {"q": "Si tu suegra fuera un Boggart, ¿qué hechizo usarías?", "o": ["Riddikulus", "Avada Kedavra", "Protego", "Desmaio"], "c": "Riddikulus"},
]


def build_trivia_state():
    pregunta = random.choice(TRIVIA_POOL)
    return {
        "phase": "trivia",
        "question": pregunta["q"],
        "options": pregunta["o"],
        "correct": pregunta["c"],
    }


@router.post("/api/host/{room_code}/start_trivia")
async def start_trivia(room_code: str):
    new_state = build_trivia_state()
    supabase.table("rooms").update({
        "status": "playing",
        "game_state": new_state,
    }).eq("room_code", room_code.upper()).execute()

    return {"message": "Trivia iniciada"}
