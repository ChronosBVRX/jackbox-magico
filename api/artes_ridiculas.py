import random

POOL = [
    {"question": "Te atacan con una deuda de 3 meses.", "options": ["Ignorar", "Bloquear", "Contraatacar", "Huir dignamente"], "correct": "Bloquear"},
    {"question": "Un dementor te cobra la tanda.", "options": ["Ignorar", "Bloquear", "Contraatacar", "Huir dignamente"], "correct": "Contraatacar"},
]


def build_state():
    item = random.choice(POOL)
    return {
        "phase": "artes_ridiculas",
        "question": item["question"],
        "options": item["options"],
        "correct": item["correct"],
        "points_correct": 100,
        "points_wrong": -20,
    }
