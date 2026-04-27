import random

ATAQUES = [
    ("Te lanzan una deuda de 3 meses", "Bloquear"),
    ("Un dementor te cobra la tanda", "Contraatacar"),
    ("Suegra encantada aparece en duelo", "Huir dignamente"),
    ("Duende revisa tu historial crediticio", "Ignorar"),
    ("Te llega carta del banco mágico", "Bloquear"),
    ("Boggart con tu ex te persigue", "Huir dignamente"),
]


def build_state():
    ataque, correcto = random.choice(ATAQUES)
    return {
        "phase": "artes_ridiculas",
        "question": f"{ataque}. ¿Qué haces?",
        "options": ["Ignorar", "Bloquear", "Contraatacar", "Huir dignamente"],
        "correct": correcto,
        "points_correct": 100,
        "points_wrong": -20,
    }
