import random

POOL = [
    {"question": "Wingardium Levi___", "options": ["osa", "oso", "iza", "ina"], "correct": "osa"},
    {"question": "Protego Tot___", "options": ["um", "em", "is", "ar"], "correct": "um"},
]


def build_state():
    item = random.choice(POOL)
    return {
        "phase": "hechizo_incompleto",
        "question": item["question"],
        "options": item["options"],
        "correct": item["correct"],
        "points_correct": 80,
        "points_wrong": 0,
    }
