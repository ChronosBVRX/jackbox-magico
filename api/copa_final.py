import random

BETS = [0, 100, 200, 300]


def build_state():
    apuesta = random.choice(BETS[1:])
    correcto = str(apuesta * 2)
    opciones = [str(apuesta), str(apuesta * 2), str(apuesta + 100), str(max(apuesta - 100, 0))]
    opciones = list(dict.fromkeys(opciones))
    while len(opciones) < 4:
        opciones.append(str(random.choice([0, 100, 200, 300, 400, 500, 600])))
    random.shuffle(opciones)
    return {
        "phase": "copa_final",
        "question": f"Si apuestas {apuesta} y aciertas, ¿cuánto se suma a tu marcador?",
        "options": opciones[:4],
        "correct": correcto,
        "points_correct": apuesta,
        "points_wrong": -apuesta,
    }
