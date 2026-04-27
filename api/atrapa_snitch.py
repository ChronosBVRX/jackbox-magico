import random

POOL = [
    {"question": "¡AHORA!", "options": ["¡TOCAR!", "No tocar"], "correct": "¡TOCAR!"},
    {"question": "NO TOQUES", "options": ["¡TOCAR!", "No tocar"], "correct": "No tocar"},
]


def build_state():
    item = random.choice(POOL)
    return {
        "phase": "atrapa_snitch",
        "question": item["question"],
        "options": item["options"],
        "correct": item["correct"],
        "points_correct": 150,
        "points_wrong": -30,
    }
