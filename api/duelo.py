import random
from fastapi import APIRouter
from api.database import supabase

router = APIRouter()

DUEL_ATTACKS = [
    "Un rival lanza un hechizo de ataque. ¿Qué respondes?",
    "Tu enemigo intenta desarmarte en medio del pasillo. ¿Cómo reaccionas?",
    "Te sorprenden con magia oscura. ¿Cuál es tu movimiento?",
]

DUEL_OPTIONS = ["Protección", "Contraataque", "Esquivar"]


def build_duelo_state():
    return {
        "phase": "duelo",
        "attack_msg": random.choice(DUEL_ATTACKS),
        "options": DUEL_OPTIONS,
        "enemy_move": random.choice(DUEL_OPTIONS),
    }


@router.post("/api/host/{room_code}/start_duelo")
async def start_duelo(room_code: str):
    new_state = build_duelo_state()
    supabase.table("rooms").update({
        "status": "playing",
        "game_state": new_state,
    }).eq("room_code", room_code.upper()).execute()

    return {"message": "Duelo de Hechizos iniciado"}
