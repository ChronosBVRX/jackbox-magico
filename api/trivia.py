import random
from fastapi import APIRouter
from api.database import supabase

# Creamos un "Mini-Cerebro" (Router) solo para la trivia
router = APIRouter()

# Base de datos de la Trivia
TRIVIA_POOL = [
    {"q": "¿Qué hechizo usarías para no pagar la cuenta?", "o": ["Obliviate", "Lumos", "Expelliarmus", "Alohomora"], "c": "Obliviate"},
    {"q": "¿Qué criatura te robaría el aguinaldo?", "o": ["Dementor", "Escarbato", "Boggart", "Thestral"], "c": "Escarbato"},
    {"q": "¿Qué casa sobreviviría mejor a una peda mágica?", "o": ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"], "c": "Hufflepuff"},
    {"q": "Si tu suegra fuera un Boggart, ¿qué hechizo usarías?", "o": ["Riddikulus", "Avada Kedavra", "Protego", "Desmaio"], "c": "Riddikulus"}
]

@router.post("/api/host/{room_code}/start_trivia")
async def start_trivia(room_code: str):
    pregunta = random.choice(TRIVIA_POOL)
    new_state = {
        "phase": "trivia", 
        "question": pregunta['q'], 
        "options": pregunta['o'], 
        "correct": pregunta['c']
    }
    supabase.table("rooms").update({
        "status": "playing", 
        "game_state": new_state
    }).eq("room_code", room_code.upper()).execute()
    
    return {"message": "Trivia iniciada"}