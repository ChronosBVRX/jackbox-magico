import random
from api.database import supabase

PROMPTS = [
    "Tu Patronus sale raro, ¿quién en esta sala lo entrenaría peor?",
    "¿Quién tendría el Patronus más caótico en una peda mágica?",
    "¿Quién invocaría un Patronus en el peor momento posible?",
    "¿Quién tendría un Patronus más útil para escapar de deudas?",
    "¿Quién tendría un Patronus que da más risa que miedo?",
    "¿Quién tendría un Patronus que llega tarde siempre?",
]


def build_state(room_code: str):
    room = supabase.table("rooms").select("id").eq("room_code", room_code.upper()).execute()
    players = supabase.table("players").select("name").eq("room_id", room.data[0]["id"]).execute()
    return {
        "phase": "patronus_personalizado",
        "question": random.choice(PROMPTS),
        "options": [p["name"] for p in players.data],
        "votes": {},
    }
