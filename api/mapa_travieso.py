import random

OBJETOS = ["varita rota", "poción azul", "llave flotante", "capa invisible", "mapa viejo", "snitch dorada"]
LUGARES = ["Biblioteca", "Mazmorras", "Patio Central", "Torre del Reloj", "Invernadero", "Ala Oeste"]


def build_state():
    correcto = random.choice(LUGARES)
    objeto = random.choice(OBJETOS)
    opciones = [correcto] + random.sample([l for l in LUGARES if l != correcto], 3)
    random.shuffle(opciones)
    return {
        "phase": "mapa_travieso",
        "question": f"El mapa mostró por 5 segundos una {objeto}. ¿En qué zona estaba?",
        "options": opciones,
        "correct": correcto,
        "points_correct": 100,
        "points_wrong": 0,
    }
