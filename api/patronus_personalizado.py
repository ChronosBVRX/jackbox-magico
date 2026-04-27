import random
from api.database import supabase

PROMPTS = [
    "¿Qué Patronus absurdo te salvaría mejor en una peda mágica?",
    "¿Qué Patronus sería peor mesero en Hogwarts Snacks?",
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
