"""Catálogo maestro de minijuegos y reglas base de puntuación.

El orden del diccionario importa porque el celular del host llena el selector
en el mismo orden. Por eso Trivia del Mundo Mágico queda primero: es el modo
principal de la Copa de las Casas.
"""

GAME_CATALOG = {
    "trivia_magica": {
        "name": "Trivia del Mundo Mágico",
        "short_name": "Trivia Mágica",
        "status": "implemented",
        "featured": True,
        "mode": "quiz_main",
        "players": {"max_total": 8, "max_per_house": 2},
        "description": "Modo principal de la Copa de las Casas con preguntas de películas, hechizos, personajes, criaturas, objetos mágicos, profesores, villanos, frases en español latino y escenas icónicas.",
        "rules": ["Cada jugador responde desde su celular con A, B, C o D.", "La pantalla principal muestra pregunta, categoría, dificultad y temporizador.", "Cada pregunta dura 10 segundos.", "La puntuación depende de la dificultad.", "La respuesta correcta más rápida recibe bonus.", "Cada racha de 3 respuestas correctas recibe bonus."],
        "duration_seconds": 10,
        "recommended_rounds": 25,
        "visual": {"theme": "Gran Comedor premium", "elements": ["velas flotantes", "pergaminos", "escudos de casas", "marcador de casas", "animaciones de acierto y error", "campana mágica"]},
        "points": {"facil": 50, "media": 100, "dificil": 150, "experto": 200, "fastest_correct_bonus": 40, "streak_3_bonus": 100, "wrong": 0, "no_answer": 0},
    },
    "atrapa_snitch": {
        "name": "Atrapa la Snitch", "short_name": "Snitch", "status": "implemented", "featured": True, "mode": "precision_reaction",
        "players": {"max_total": 8, "max_per_house": 2},
        "description": "Minijuego de precisión y reflejos. La Snitch se mueve por la pantalla y los jugadores deben tocar en el celular justo cuando entra al aro encantado.",
        "rules": ["Cada jugador tiene intentos limitados.", "La Snitch cambia de dirección y velocidad.", "El aro de captura también se mueve.", "La precisión determina el puntaje."],
        "points": {"legendary": 180, "perfect": 130, "great": 90, "close": 45, "miss": -20, "best_seeker_bonus": 80},
    },
    "duelo_hechizos": {
        "name": "Duelo de Hechizos", "short_name": "Duelo", "status": "implemented", "featured": True, "mode": "duel",
        "players": {"max_total": 8, "max_per_house": 2},
        "description": "Dos jugadores se enfrentan eligiendo hechizos. Algunas combinaciones ganan, otras pierden y los empates pueden activar choque de varitas.",
        "rules": ["Solo los duelistas elegidos responden.", "Elige un hechizo antes de que termine el tiempo.", "Algunas combinaciones tienen ventaja.", "En empate puede activarse una fase de tapping rápido."],
        "points": {"victory": 150, "fastest_bonus": 30, "clash_bonus": 80, "timeout_penalty": -30},
    },
    "sombrero_burlon": {
        "name": "Sombrero Burlón", "short_name": "Sombrero", "status": "implemented", "featured": True, "mode": "social_vote",
        "players": {"max_total": 8, "max_per_house": 2},
        "description": "Minijuego social de votación. El Sombrero hace una pregunta incómoda, graciosa o sospechosa y todos votan por el jugador que mejor encaje.",
        "rules": ["Cada jugador vota desde su celular.", "No puedes votar por ti mismo.", "El más votado gana puntos.", "Puede haber desempate."],
        "points": {"most_voted": 120, "vote_received": 15, "winner_house": 80, "zero_votes": 30},
    },
    "clase_pociones": {
        "name": "Clase de Pociones", "short_name": "Pociones", "status": "implemented", "featured": True, "mode": "memory_recipe",
        "players": {"max_total": 8, "max_per_house": 2},
        "description": "Minijuego de memoria. La TV muestra una receta por pocos segundos y luego cada jugador debe mezclar los ingredientes en el orden correcto.",
        "rules": ["Memoriza la receta en la pantalla principal.", "Cuando desaparezca, mezcla desde tu celular.", "El orden correcto da más puntos.", "Los errores reducen el puntaje."],
        "points": {"perfect": 150, "one_error": 80, "two_errors": 40, "three_or_more": 0, "fastest_perfect": 50, "house_most_perfect": 100},
    },
    "artes_ridiculas": {
        "name": "Defensa Contra las Artes Ridículas", "short_name": "Artes Ridículas", "status": "implemented", "featured": True, "mode": "quiz_humor",
        "players": {"max_total": 8, "max_per_house": 2},
        "description": "Parodia de clase de defensa mágica con amenazas absurdas y respuestas graciosas. Ideal para hacer reír al bar.",
        "rules": ["La TV muestra una amenaza ridícula.", "Cada jugador elige una respuesta.", "Una respuesta es correcta y otras son distractores humorísticos.", "Puede haber bonus por respuesta falsa graciosa."],
        "points": {"correct": 100, "fast_bonus": 30, "streak3": 80, "wrong": -20, "funny_false": 20},
    },
    "mapa_travieso": {
        "name": "El Mapa Travieso",
        "short_name": "Mapa Travieso",
        "status": "implemented",
        "featured": True,
        "mode": "memory_map",
        "players": {"max_total": 8, "max_per_house": 2},
        "description": "Minijuego de memoria inspirado en el Mapa del Merodeador. La TV muestra objetos mágicos sobre un mapa de castillo y luego los jugadores recuerdan dónde estaba el objeto preguntado.",
        "rules": ["Observa durante 8 segundos el mapa mágico del castillo.", "En modo Filch solo tendrás 5 segundos para memorizar.", "En Escaleras móviles las zonas cambian de posición.", "Responde desde tu celular dónde estaba el objeto indicado.", "Correcta +100, respuesta correcta más rápida +30, si ambos jugadores de una casa aciertan +80 extra.", "En modo difícil / Filch, fallar resta -20."],
        "duration_seconds": 18,
        "visual": {"theme": "Mapa del Merodeador en pergamino", "elements": ["pergamino antiguo", "tinta animada", "huellas caminando", "zonas del castillo", "objetos mágicos", "transición de ocultamiento", "sonidos misteriosos"]},
        "points": {"correct": 100, "fastest_bonus": 30, "house_combo_bonus": 80, "wrong_hard": -20, "wrong_normal": 0},
    },
    "retratos_chismosos": {
        "name": "Retratos Chismosos", "short_name": "Retratos", "status": "implemented", "featured": False, "mode": "quiz",
        "players": {"max_total": 8, "max_per_house": 2},
        "description": "Los retratos del castillo sueltan pistas, rumores y medias verdades. Los jugadores deben elegir la respuesta correcta.",
        "rules": ["Lee la pista del retrato.", "Elige la respuesta correcta.", "Responder rápido puede dar bonus."],
        "points": {"correct": 100, "quick_bonus": 30},
    },
    "hechizo_incompleto": {
        "name": "Hechizo Incompleto", "short_name": "Hechizo", "status": "implemented", "featured": False, "mode": "quiz",
        "players": {"max_total": 8, "max_per_house": 2},
        "description": "La TV muestra un hechizo incompleto y los jugadores deben completarlo antes que los demás.",
        "rules": ["Lee el hechizo incompleto.", "Elige la opción que lo completa correctamente.", "Responder rápido puede dar bonus."],
        "points": {"correct": 80, "fastest_bonus": 30},
    },
    "caldero_mentiroso": {
        "name": "El Caldero Mentiroso", "short_name": "Caldero", "status": "implemented", "featured": False, "mode": "bluff",
        "players": {"max_total": 8, "max_per_house": 2},
        "description": "Juego de engaño donde el caldero intenta confundir a los jugadores con ingredientes buenos y malos.",
        "rules": ["Identifica ingredientes confiables.", "Evita caer en el ingrediente falso.", "Engañar o detectar engaños da puntos."],
        "points": {"house_perfect": 150, "bad_ingredient": -50, "successful_bluff": 80},
    },
    "patronus_personalizado": {
        "name": "Patronus Personalizado", "short_name": "Patronus", "status": "implemented", "featured": False, "mode": "text_vote",
        "players": {"max_total": 8, "max_per_house": 2},
        "description": "Minijuego creativo donde los jugadores proponen o votan patronus personalizados y graciosos.",
        "rules": ["Cada jugador participa desde su celular.", "El grupo vota la opción más divertida o adecuada.", "Recibir votos suma puntos."],
        "points": {"first": 120, "second": 80, "vote_received": 10},
    },
    "copa_final": {
        "name": "Copa de las Casas: Pregunta Final", "short_name": "Copa Final", "status": "implemented", "featured": False, "mode": "wager",
        "players": {"max_total": 8, "max_per_house": 2},
        "description": "Ronda final con apuesta de puntos para cerrar la Copa de las Casas con tensión dramática.",
        "rules": ["Cada jugador o casa puede apostar puntos.", "La respuesta correcta suma la apuesta.", "La incorrecta puede perderla."],
        "points": {"bet_levels": [0, 100, 200, 300]},
    },
}
