from copy import deepcopy

INSTRUCTIONS_BY_GAME = {
    "trivia_magica": {
        "title": "Trivia del Mundo Mágico",
        "subtitle": "Demuestra cuánto sabes antes de que el reloj te traicione.",
        "lines": [
            "Cada jugador responde desde su celular.",
            "Tendrás poco tiempo para elegir A, B, C o D.",
            "Responder rápido puede darte puntos extra.",
            "Las rachas de respuestas correctas también suman bonus."
        ],
        "duration_seconds": 8,
        "visual_theme": "gran_comedor"
    },

    "artes_ridiculas": {
        "title": "Defensa Contra las Artes Ridículas",
        "subtitle": "Una clase dramática contra amenazas absurdas.",
        "lines": [
            "La TV mostrará una amenaza ridícula.",
            "Elige la mejor respuesta desde tu celular.",
            "Una respuesta es correcta.",
            "Algunas respuestas falsas pueden ser tan graciosas que también dan bonus."
        ],
        "duration_seconds": 8,
        "visual_theme": "clase_defensa"
    },

    "atrapa_snitch": {
        "title": "Atrapa la Snitch",
        "subtitle": "Reflejos, precisión y un poco de suerte mágica.",
        "lines": [
            "Observa la pantalla principal.",
            "Toca en tu celular cuando creas que es el momento exacto.",
            "La precisión determina tu puntaje.",
            "Cada intento cuenta."
        ],
        "duration_seconds": 8,
        "visual_theme": "quidditch"
    },

    "clase_pociones": {
        "title": "Clase de Pociones",
        "subtitle": "Memoriza la receta antes de que desaparezca.",
        "lines": [
            "Primero observa la receta en la TV.",
            "Después mezcla los ingredientes desde tu celular.",
            "El orden correcto da más puntos.",
            "Los errores pueden arruinar la poción."
        ],
        "duration_seconds": 8,
        "visual_theme": "pociones"
    },

    "duelo_hechizos": {
        "title": "Duelo de Hechizos",
        "subtitle": "Prepara tu varita y elige con inteligencia.",
        "lines": [
            "Solo los duelistas seleccionados responden.",
            "Cada jugador elige un hechizo desde su celular.",
            "Algunas combinaciones vencen a otras.",
            "Si hay empate, puede activarse un choque de varitas."
        ],
        "duration_seconds": 8,
        "visual_theme": "duelo"
    },

    "sombrero_burlon": {
        "title": "Sombrero Burlón",
        "subtitle": "El sombrero hará preguntas incómodas, sospechosas o ridículas.",
        "lines": [
            "Cada jugador vota desde su celular.",
            "No puedes votar por ti mismo.",
            "El jugador más votado gana puntos.",
            "Puede haber desempate si la magia se pone intensa."
        ],
        "duration_seconds": 8,
        "visual_theme": "sombrero"
    },

    "mapa_travieso": {
        "title": "El Mapa Travieso",
        "subtitle": "Observa, memoriza y responde antes de que el mapa te delate.",
        "lines": [
            "La TV mostrará objetos mágicos en un mapa.",
            "Memoriza su ubicación.",
            "Después responde desde tu celular.",
            "Responder rápido y correcto puede dar bonus."
        ],
        "duration_seconds": 8,
        "visual_theme": "mapa"
    },

    "caldero_mentiroso": {
        "title": "El Caldero Mentiroso",
        "subtitle": "Engaña, acusa o salva la poción.",
        "lines": [
            "Cada jugador recibirá un ingrediente secreto.",
            "Puedes meterlo al caldero, descartarlo o acusar a otro jugador.",
            "Al final se revelará si la poción sobrevivió o explotó.",
            "La estrategia vale tanto como la suerte."
        ],
        "duration_seconds": 8,
        "visual_theme": "caldero"
    },

    "patronus_personalizado": {
        "title": "Patronus Personalizado",
        "subtitle": "La creatividad también puede ganar puntos.",
        "lines": [
            "Cada jugador participa desde su celular.",
            "Propón o vota por la opción más divertida.",
            "Recibir votos suma puntos.",
            "La respuesta más creativa puede cambiar el marcador."
        ],
        "duration_seconds": 8,
        "visual_theme": "patronus"
    },

    "copa_final": {
        "title": "Copa de las Casas: Pregunta Final",
        "subtitle": "La última oportunidad para cambiarlo todo.",
        "lines": [
            "Los jugadores o casas podrán apostar puntos.",
            "Una respuesta correcta suma la apuesta.",
            "Una respuesta incorrecta puede costar caro.",
            "Nada está decidido hasta el último hechizo."
        ],
        "duration_seconds": 8,
        "visual_theme": "copa_final"
    }
}

def build_instruction_scene(game_id: str, previous_state: dict, next_phase: str = None) -> dict:
    """
    Construye una escena de instrucciones antes de iniciar un minijuego.
    Esta escena no ejecuta el minijuego todavía.
    Solo prepara a los jugadores.
    """
    state = deepcopy(previous_state or {})
    instructions = INSTRUCTIONS_BY_GAME.get(game_id)

    if not instructions:
        instructions = {
            "title": "Siguiente Prueba",
            "subtitle": "Prepárate para la siguiente ronda.",
            "lines": [
                "Mira la pantalla principal.",
                "Usa tu celular cuando se active la ronda.",
                "Sigue las instrucciones del juego."
            ],
            "duration_seconds": 6,
            "visual_theme": "default"
        }

    state.update({
        "phase": "scene_instructions",
        "scene_type": "instructions",
        "current_game_id": game_id,
        "target_phase": next_phase or "start_game",
        "instruction_title": instructions["title"],
        "instruction_subtitle": instructions["subtitle"],
        "instruction_lines": instructions["lines"],
        "instruction_duration_seconds": instructions["duration_seconds"],
        "instruction_visual_theme": instructions["visual_theme"],
        "cta": "Presiona OK para iniciar"
    })

    return state
