import random

POOL = [
    {"question": "¿Dónde estaba escondida la varita rota?", "options": ["Pasillo Norte", "Biblioteca", "Torre del Reloj", "Patio Central"], "correct": "Biblioteca"},
    {"question": "¿Dónde apareció el fantasma?", "options": ["Mazmorras", "Gran Comedor", "Enfermería", "Ala Oeste"], "correct": "Mazmorras"},
]


def build_state():
    item = random.choice(POOL)
    return {
        "phase": "mapa_travieso",
        "question": item["question"],
        "options": item["options"],
        "correct": item["correct"],
        "points_correct": 100,
        "points_wrong": 0,
    }
