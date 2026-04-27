import random

POOL = [
    {"question": "Si apuestas 200 y aciertas, ¿cuánto ganas?", "options": ["0", "100", "200", "400"], "correct": "400"},
    {"question": "¿Qué apuesta te deja igual aunque falles?", "options": ["0", "100", "200", "300"], "correct": "0"},
]


def build_state():
    item = random.choice(POOL)
    return {
        "phase": "copa_final",
        "question": item["question"],
        "options": item["options"],
        "correct": item["correct"],
        "points_correct": 300,
        "points_wrong": 0,
    }
