import random

PISTAS = [
    ("Le encanta romper reglas pero es leal a sus amigos.", "Harry"),
    ("Intelecto afilado y siempre trae respuestas.", "Hermione"),
    ("Le aterra todo, pero aparece cuando más se necesita.", "Neville"),
    ("Habla raro, ve cosas que otros no.", "Luna"),
    ("Maestro de pociones con pasado complejo.", "Snape"),
    ("Guardabosques gigante y de gran corazón.", "Hagrid"),
]
OPCIONES = ["Harry", "Hermione", "Ron", "Luna", "Neville", "Snape", "Hagrid", "Draco"]


def build_state():
    pista, correcto = random.choice(PISTAS)
    opciones = [correcto] + random.sample([o for o in OPCIONES if o != correcto], 3)
    random.shuffle(opciones)
    return {
        "phase": "retratos_chismosos",
        "question": f"Retrato parlante dice: '{pista}' ¿De quién habla?",
        "options": opciones,
        "correct": correcto,
        "points_correct": 100,
        "points_wrong": 0,
    }
