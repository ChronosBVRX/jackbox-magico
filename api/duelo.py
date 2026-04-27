import random
from fastapi import APIRouter
from api.database import supabase

router = APIRouter()

DUEL_ATTACKS = [
    "Un rival lanza un hechizo de ataque. ¿Qué respondes?",
    "Te intentan desarmar frente al Gran Comedor. ¿Cómo reaccionas?",
    "Te llega un Bombarda al escritorio. ¿Qué haces?",
    "Un oponente intenta aturdirte por la espalda. ¿Tu movimiento?",
    "Te apuntan con un hechizo desconocido en un pasillo oscuro. ¿Respuesta?",
    "Duelo amistoso en clase: el rival acelera el ritmo. ¿Qué eliges?",
    "Tu enemigo abre con magia agresiva. ¿Cómo lo contrarrestas?",
    "Te atacan antes de estar listo. ¿Qué decisión tomas?",
    "Hay magia en cadena hacia tu posición. ¿Cuál es tu jugada?",
    "Escuchas un '¡Expulso!' directo a ti. ¿Qué haces?",
]

DUEL_OPTIONS = ["Protección", "Contraataque", "Esquivar"]


def build_duelo_state():
    return {
        "phase": "duelo",
        "question": random.choice(DUEL_ATTACKS),
        "attack_msg": random.choice(DUEL_ATTACKS),
        "options": DUEL_OPTIONS,
        "enemy_move": random.choice(DUEL_OPTIONS),
    }


@router.post("/api/host/{room_code}/start_duelo")
async def start_duelo(room_code: str):
    new_state = build_duelo_state()
    supabase.table("rooms").update({"status": "playing", "game_state": new_state}).eq("room_code", room_code.upper()).execute()
    return {"message": "Duelo de Hechizos iniciado"}
