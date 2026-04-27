import random

POOL = [
    {"question": "El ingrediente se ve explosivo. ¿Qué haces?", "options": ["Meter", "Descartar"], "correct": "Descartar"},
    {"question": "Recibes esencia brillante confiable.", "options": ["Meter", "Descartar"], "correct": "Meter"},
]


def build_state():
    item = random.choice(POOL)
    return {
        "phase": "caldero_mentiroso",
        "question": item["question"],
        "options": item["options"],
        "correct": item["correct"],
        "points_correct": 80,
        "points_wrong": -50,
    }
