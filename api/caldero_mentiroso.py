import random

INGREDIENTES = [
    ("Esencia brillante", "Meter"),
    ("Raíz fermentada inestable", "Descartar"),
    ("Polvo de dragón puro", "Meter"),
    ("Hongo con chispa roja", "Descartar"),
    ("Lágrima lunar refinada", "Meter"),
    ("Frasco con humo verde", "Descartar"),
]


def build_state():
    ingrediente, correcto = random.choice(INGREDIENTES)
    return {
        "phase": "caldero_mentiroso",
        "question": f"Te toca '{ingrediente}'. ¿Meter o descartar?",
        "options": ["Meter", "Descartar"],
        "correct": correcto,
        "points_correct": 80,
        "points_wrong": -50,
    }
