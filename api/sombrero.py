import random
from fastapi import APIRouter
from api.database import supabase

router = APIRouter()

SOMBRERO_PROMPTS = [
    "¿Quién sería el primero en intentar un hechizo prohibido y decir que fue accidente?",
    "¿Quién vendería pociones falsas afuera del antro?",
    "¿Quién se perdería en una escalera mágica?",
    "¿Quién sería el peor mesero en Hogwarts Snacks & Foods por estar en el chisme?",
    "¿Quién usaría magia imperdonable para no lavar los platos?"
]

@router.post("/api/host/{room_code}/start_sombrero")
async def start_sombrero(room_code: str):
    prompt = random.choice(SOMBRERO_PROMPTS)
    
    # Extraemos los nombres de los jugadores en la sala para que sean las opciones de votación
    room = supabase.table("rooms").select("id").eq("room_code", room_code.upper()).execute()
    players = supabase.table("players").select("name").eq("room_id", room.data[0]['id']).execute()
    nombres_jugadores = [p['name'] for p in players.data]
    
    new_state = {
        "phase": "sombrero", 
        "question": prompt, 
        "options": nombres_jugadores,
        "votes": {} # Aquí se guardarán los votos estilo: {"Eduardo": 3, "Norma": 1}
    }
    
    supabase.table("rooms").update({
        "status": "playing", 
        "game_state": new_state
    }).eq("room_code", room_code.upper()).execute()
    
    return {"message": "Sombrero Burlón iniciado"}