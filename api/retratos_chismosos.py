import random

POOL = [
    {"question": "Tiene paciencia infinita, pero cuando se enoja todos corren.", "options": ["McGonagall", "Hagrid", "Filch", "Luna"], "correct": "McGonagall"},
    {"question": "Ama reglas, rondas nocturnas y quitar puntos.", "options": ["Snape", "Filch", "Neville", "Cedric"], "correct": "Filch"},
]


def build_state():
    item = random.choice(POOL)
    return {
        "phase": "retratos_chismosos",
        "question": item["question"],
        "options": item["options"],
        "correct": item["correct"],
        "points_correct": 100,
        "points_wrong": 0,
    }
