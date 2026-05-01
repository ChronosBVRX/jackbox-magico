from typing import Dict, Any

def build_general_intro_scene(previous_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Escena de bienvenida inicial después del lobby.
    """
    state = previous_state.copy()
    state.update({
        "phase": "scene_intro",
        "scene_type": "intro",
        "intro_title": "¡Bienvenidos a Jackbox Mágico!",
        "intro_subtitle": "Prepárense para una aventura donde su conocimiento y rapidez serán sus mejores hechizos.",
        "intro_lines": [
            "Cada uno de ustedes representa una de las cuatro casas legendarias.",
            "Los puntos que ganen se acumularán para la Gran Copa de las Casas.",
            "La TV es el escenario principal; sigan siempre lo que ocurre aquí.",
            "Su celular es su varita: úsenlo solo para responder y actuar.",
            "¡Habrá trivias, retos de velocidad y muchas sorpresas mágicas!"
        ],
        "cta": "Entendido, profesor"
    })
    return state

def build_general_rules_scene(previous_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Escena de reglas generales del juego.
    """
    state = previous_state.copy()
    state.update({
        "phase": "scene_rules",
        "scene_type": "rules",
        "rules_title": "Reglas del Castillo",
        "rules_subtitle": "Incluso la magia tiene sus leyes. Síganlas para ganar gloria.",
        "rules_lines": [
            "Respondan siempre desde su celular lo más rápido posible.",
            "Rapidez = Bonus. Las ráfagas de respuestas correctas dan más puntos.",
            "Cuidado: algunas pruebas fallidas pueden quitar puntos a su casa.",
            "Después de cada ronda, revisaremos el marcador de la Copa.",
            "Al final, la casa con más puntos será la ganadora absoluta."
        ],
        "cta": "Estamos listos"
    })
    return state
