"""Catálogo maestro de minijuegos y reglas base de puntuación."""

GAME_CATALOG = {
    "duelo_hechizos": {
        "name": "Duelo de Hechizos",
        "status": "implemented",
        "mode": "duel",
        "points": {
            "victory": 150,
            "fastest_bonus": 30,
            "clash_bonus": 80,
            "timeout_penalty": -30,
        },
    },
    "sombrero_burlon": {
        "name": "Sombrero Burlón",
        "status": "implemented",
        "mode": "social_vote",
        "points": {
            "most_voted": 120,
            "vote_received": 15,
            "winner_house": 80,
            "zero_votes": 30,
        },
    },
    "clase_pociones": {
        "name": "Clase de Pociones",
        "status": "implemented",
        "mode": "memory_recipe",
        "points": {
            "perfect": 150,
            "one_error": 80,
            "two_errors": 40,
            "three_or_more": 0,
            "fastest_perfect": 50,
            "house_most_perfect": 100,
        },
    },
    "atrapa_snitch": {
        "name": "Atrapa la Snitch",
        "status": "implemented",
        "mode": "reaction",
        "points": {
            "first": 150,
            "second": 100,
            "third": 60,
            "false_tap": -30,
        },
    },
    "trivia_magica": {
        "name": "Trivia del Mundo Mágico",
        "status": "implemented",
        "mode": "quiz",
        "points": {
            "easy": 50,
            "medium": 100,
            "hard": 150,
        },
    },
    "retratos_chismosos": {
        "name": "Retratos Chismosos",
        "status": "implemented",
        "mode": "quiz",
        "points": {
            "correct": 100,
            "quick_bonus": 30,
        },
    },
    "mapa_travieso": {
        "name": "El Mapa Travieso",
        "status": "implemented",
        "mode": "memory",
        "points": {
            "correct": 100,
            "fastest_bonus": 40,
        },
    },
    "hechizo_incompleto": {
        "name": "Hechizo Incompleto",
        "status": "implemented",
        "mode": "quiz",
        "points": {
            "correct": 80,
            "fastest_bonus": 30,
        },
    },
    "artes_ridiculas": {
        "name": "Defensa Contra las Artes Ridículas",
        "status": "implemented",
        "mode": "quiz_humor",
        "points": {
            "correct": 100,
            "fast_bonus": 30,
            "streak3": 80,
            "wrong": -20,
            "funny_false": 20,
        },
    },
    "caldero_mentiroso": {
        "name": "El Caldero Mentiroso",
        "status": "implemented",
        "mode": "bluff",
        "points": {
            "house_perfect": 150,
            "bad_ingredient": -50,
            "successful_bluff": 80,
        },
    },
    "patronus_personalizado": {
        "name": "Patronus Personalizado",
        "status": "implemented",
        "mode": "text_vote",
        "points": {
            "first": 120,
            "second": 80,
            "vote_received": 10,
        },
    },
    "copa_final": {
        "name": "Copa de las Casas: Pregunta Final",
        "status": "implemented",
        "mode": "wager",
        "points": {
            "bet_levels": [0, 100, 200, 300],
        },
    },
}