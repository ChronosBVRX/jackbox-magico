import random
from fastapi import APIRouter
from api.database import supabase

router = APIRouter()

SOMBRERO_PROMPTS = [
    "¿Quién intentaría un hechizo prohibido y diría que fue accidente?",
    "¿Quién vendería pociones falsas en el recreo?",
    "¿Quién se perdería en una escalera mágica?",
    "¿Quién discutiría con un retrato por horas?",
    "¿Quién usaría magia para no lavar los platos?",
    "¿Quién sería expulsado por hacer bromas en clase?",
    "¿Quién abriría una tienda de varitas piratas?",
    "¿Quién tomaría Felix Felicis para una cita?",
    "¿Quién invocaría un patronus en una peda para presumir?",
    "¿Quién sería peor prefecto porque se distrae con chisme?",
    "¿Quién sobreviviría mejor una guardia nocturna en Hogwarts?",
    "¿Quién sería el primero en romper una escoba nueva?",
    "¿Quién confundiría una poción con salsa picante?",
    "¿Quién se dormiría en Historia de la Magia cada clase?",
    "¿Quién intentaría abrir la Cámara de los Secretos por curiosidad?",
]


def build_sombrero_state(room_code: str):
    room = supabase.table("rooms").select("id").eq("room_code", room_code.upper()).execute()
    players = supabase.table("players").select("name").eq("room_id", room.data[0]["id"]).execute()
    nombres_jugadores = [p["name"] for p in players.data]

    return {
        "phase": "sombrero",
        "question": random.choice(SOMBRERO_PROMPTS),
        "options": nombres_jugadores,
        "votes": {},
    }


@router.post("/api/host/{room_code}/start_sombrero")
async def start_sombrero(room_code: str):
    new_state = build_sombrero_state(room_code)
    supabase.table("rooms").update({"status": "playing", "game_state": new_state}).eq("room_code", room_code.upper()).execute()
    return {"message": "Sombrero Burlón iniciado"}
