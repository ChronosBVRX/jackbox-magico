import random

INGREDIENTES = [
    "Lágrima lunar", "Polvo de dragón", "Raíz de sombra", "Esencia brillante", "Hongo travieso",
    "Escama de sirena", "Néctar de mandrágora", "Sal de fénix", "Pétalo nocturno", "Cristal de rocío",
]


def build_state():
    receta = random.sample(INGREDIENTES, 4)
    idx = random.randint(0, 3)
    correcto = receta[idx]
    opciones = [correcto] + random.sample([i for i in INGREDIENTES if i != correcto], 3)
    random.shuffle(opciones)
    return {
        "phase": "clase_pociones",
        "question": f"Receta: 1) {receta[0]} 2) {receta[1]} 3) {receta[2]} 4) {receta[3]}. ¿Cuál iba en el paso {idx+1}?",
        "options": opciones,
        "correct": correcto,
        "points_correct": 100,
        "points_wrong": 40,
    }
