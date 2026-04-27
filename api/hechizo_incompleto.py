import random

COMPLETAR = [
    ("Wingardium Levi___", "osa", ["osa", "oso", "iza", "ina"]),
    ("Protego Tot___", "um", ["um", "em", "is", "ar"]),
    ("Expecto Patro___", "num", ["num", "nus", "nim", "nor"]),
    ("Aloho___", "mora", ["mora", "mero", "moro", "mira"]),
    ("Expelliar___", "mus", ["mus", "mes", "mas", "mox"]),
    ("Impe___", "rius", ["rius", "rion", "ríos", "rium"]),
]


def build_state():
    inicio, correcto, opciones = random.choice(COMPLETAR)
    return {
        "phase": "hechizo_incompleto",
        "question": inicio,
        "options": opciones,
        "correct": correcto,
        "points_correct": 80,
        "points_wrong": 0,
    }
