import random

SEÑALES = ["¡AHORA!", "NO TOQUES", "¡TOCA YA!", "ESPERA", "¡SNITCH!", "TRAMPA"]


def build_state():
    señal = random.choice(SEÑALES)
    correcto = "¡TOCAR!" if señal in {"¡AHORA!", "¡TOCA YA!", "¡SNITCH!"} else "No tocar"
    return {
        "phase": "atrapa_snitch",
        "question": f"Señal del árbitro: {señal}",
        "options": ["¡TOCAR!", "No tocar"],
        "correct": correcto,
        "points_correct": 150,
        "points_wrong": -30,
    }
