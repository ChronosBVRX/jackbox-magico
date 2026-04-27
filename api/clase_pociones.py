import random

POOL = [
    {"question": "¿Qué ingrediente va en el paso 3?", "options": ["2 polvos rojos", "1 raíz dorada", "3 gotas azules", "1 pluma plateada"], "correct": "2 polvos rojos"},
    {"question": "¿Qué ingrediente va al final?", "options": ["Polvo de dragón", "Lágrima lunar", "Esencia brillante", "Hongo travieso"], "correct": "Esencia brillante"},
]


def build_state():
    item = random.choice(POOL)
    return {
        "phase": "clase_pociones",
        "question": item["question"],
        "options": item["options"],
        "correct": item["correct"],
        "points_correct": 100,
        "points_wrong": 40,
    }
