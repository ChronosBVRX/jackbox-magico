import json
import random
import time
import uuid


INGREDIENTS = [
    {"name": "Esencia lunar", "emoji": "🌙"},
    {"name": "Polvo de dragón", "emoji": "🐉"},
    {"name": "Raíz de mandrágora", "emoji": "🌱"},
    {"name": "Lágrima de fénix", "emoji": "🔥"},
    {"name": "Moco de troll", "emoji": "🤢"},
    {"name": "Escama de basilisco", "emoji": "🐍"},
    {"name": "Pluma plateada", "emoji": "🪶"},
    {"name": "Hongo del Bosque Prohibido", "emoji": "🍄"},
    {"name": "Rocío de unicornio", "emoji": "🦄"},
    {"name": "Ceniza de salamandra", "emoji": "🦎"},
    {"name": "Cristal de sirena", "emoji": "💎"},
    {"name": "Sal negra encantada", "emoji": "🧂"},
    {"name": "Aceite de sombra", "emoji": "🕯️"},
    {"name": "Pétalo de noche eterna", "emoji": "🥀"},
    {"name": "Miel de abeja mágica", "emoji": "🍯"},
    {"name": "Colmillo molido", "emoji": "🦷"},
]

POTION_NAMES = [
    "Poción Anti-Cruda Mágica",
    "Elixir de Dignidad Instantánea",
    "Filtro para No Contestarle al Profesor",
    "Poción de Valentía Dudosa",
    "Tónico para Sobrevivir al Lunes",
    "Jarabe de Memoria Selectiva",
    "Poción para Fingir que Entendiste",
    "Elixir de Encanto Social",
    "Brebaje para No Explotar en Grupo Familiar",
    "Poción de Serenidad Antes de Pagar la Cuenta",
    "Caldo Burbujeante de Buenas Decisiones",
    "Filtro de Concentración para Magos Distraídos",
]

NARRATOR_LINES = [
    "Si el caldero explota, no me culpen, yo sí di instrucciones.",
    "Esa poción no mataría a nadie… probablemente.",
    "Recuerden: primero se lee la receta, luego se arruina con confianza.",
    "Una gota de más y podrían terminar oliendo a pasillo de mazmorra.",
    "Esto es clase de pociones, no licuado experimental de madrugada.",
    "Si sale humo morado, aplaudan; si sale verde, corran con elegancia.",
    "La diferencia entre poción y desastre es seguir el orden, jóvenes.",
    "Hoy aprenderemos química mágica y responsabilidad civil limitada.",
]

STORY_POCIONES_NARRATOR = {
    "copa_encantada_loca": "La Copa pide una poción improvisada. Mézclenle a ver qué sale.",
    "peeves_hackeo_trivia": "Peeves escondió la receta. Si explota, él se ríe. Si no, también.",
    "ministerio_cancelo_diversion": "Evaluación estandarizada de Pociones. Cualquier explosión será deducida de su sueldo.",
    "torneo_cuatro_casas": "Prueba oficial de pociones. No le pongan chile que no es pozole.",
    "grimorio_excusas_prohibidas": "Si explota, el Grimorio dirá que fue porque mercurio estaba retrógrado.",
    "banquete_hechizos_descompuestos": "El postre mutó. Ayuden a preparar el antídoto rápido.",
}

MEMORIZE_SECONDS = 7
MIX_SECONDS = 15

POINTS_PERFECT = 150
POINTS_ONE_ERROR = 80
POINTS_TWO_ERRORS = 40
POINTS_THREE_OR_MORE = 0
POINTS_FASTEST_PERFECT = 50
POINTS_HOUSE_MOST_PERFECT = 100


def _now():
    return time.time()


def _shuffle(items):
    copied = items[:]
    random.shuffle(copied)
    return copied


def _ingredient_names():
    return [item["name"] for item in INGREDIENTS]


def _ingredient_map():
    return {item["name"]: item for item in INGREDIENTS}


def _pick_recipe():
    length = random.randint(4, 6)
    return random.sample(_ingredient_names(), length)


def build_state(room_code=None, previous_state=None):
    previous_state = previous_state or {}

    recipe = _pick_recipe()
    shuffled_ingredients = _shuffle(_ingredient_names())

    story_id = previous_state.get("story", {}).get("story_id")
    narrator_line = STORY_POCIONES_NARRATOR.get(story_id, random.choice(NARRATOR_LINES))

    return {
        "phase": "clase_pociones",
        "game_id": "clase_pociones",
        "round_id": str(uuid.uuid4()),
        "title": "Clase de Pociones",
        "subtitle": "Memoriza la receta. Luego prepárala en tu celular sin volar el caldero.",
        "potion_name": random.choice(POTION_NAMES),
        "question": "Memoriza la receta antes de que desaparezca.",
        "narrator": narrator_line,
        "recipe": recipe,
        "recipe_length": len(recipe),
        "ingredients": INGREDIENTS,
        "ingredient_map": _ingredient_map(),
        "shuffled_ingredients": shuffled_ingredients,
        "memorize_seconds": MEMORIZE_SECONDS,
        "mix_seconds": MIX_SECONDS,
        "started_at": _now(),
        "answers": {},
        "potion_submitted_players": [],
        "pociones_result": None,
        "point_events": [],
        "scored": False,
        "host": previous_state.get("host"),
        "points": {
            "perfect": POINTS_PERFECT,
            "one_error": POINTS_ONE_ERROR,
            "two_errors": POINTS_TWO_ERRORS,
            "three_or_more": POINTS_THREE_OR_MORE,
            "fastest_perfect": POINTS_FASTEST_PERFECT,
            "house_most_perfect": POINTS_HOUSE_MOST_PERFECT,
        },
    }


def _parse_answer(answer):
    if isinstance(answer, list):
        return [str(item) for item in answer]

    if not isinstance(answer, str):
        return []

    try:
        parsed = json.loads(answer)
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
    except Exception:
        pass

    if "||" in answer:
        return [part.strip() for part in answer.split("||") if part.strip()]

    return [answer.strip()] if answer.strip() else []


def _calculate_errors(recipe, submitted):
    errors = 0
    max_len = max(len(recipe), len(submitted))

    for index in range(max_len):
        expected = recipe[index] if index < len(recipe) else None
        received = submitted[index] if index < len(submitted) else None

        if expected != received:
            errors += 1

    return errors


def _points_for_errors(errors):
    if errors == 0:
        return POINTS_PERFECT

    if errors == 1:
        return POINTS_ONE_ERROR

    if errors == 2:
        return POINTS_TWO_ERRORS

    return POINTS_THREE_OR_MORE


def submit_recipe_answer(state, player_name, answer, client_elapsed_ms=None):
    state = state or {}

    if state.get("phase") != "clase_pociones":
        return {
            "state": state,
            "accepted": False,
            "message": "La clase de pociones no acepta respuestas en esta fase.",
        }

    answers = state.get("answers", {})

    if player_name in answers:
        return {
            "state": state,
            "accepted": True,
            "message": "Ya entregaste tu poción.",
        }

    started_at = float(state.get("started_at", _now()))
    total_elapsed = max(0, _now() - started_at)

    if client_elapsed_ms is not None:
        try:
            total_elapsed = max(0, int(client_elapsed_ms) / 1000)
        except Exception:
            pass

    memorize_seconds = int(state.get("memorize_seconds", MEMORIZE_SECONDS))
    mix_seconds = int(state.get("mix_seconds", MIX_SECONDS))

    mix_elapsed = max(0, total_elapsed - memorize_seconds)
    is_late = mix_elapsed > mix_seconds

    recipe = state.get("recipe", [])
    submitted = _parse_answer(answer)

    errors = _calculate_errors(recipe, submitted)

    if is_late:
        errors = max(errors, 3)

    points_preview = _points_for_errors(errors)

    result = {
        "player_name": player_name,
        "submitted": submitted,
        "errors": errors,
        "points_preview": points_preview,
        "perfect": errors == 0,
        "late": is_late,
        "mix_elapsed_seconds": round(mix_elapsed, 3),
        "exploded": errors >= 3,
    }

    answers[player_name] = result

    state["answers"] = answers
    state["potion_submitted_players"] = list(answers.keys())

    if errors == 0:
        message = "Poción perfecta. El caldero está orgulloso."
    elif errors == 1:
        message = "Casi perfecta. Solo un error mágico menor."
    elif errors == 2:
        message = "La poción sobrevivió, pero con trauma."
    else:
        message = "El caldero explotó con dignidad cuestionable."

    return {
        "state": state,
        "accepted": True,
        "message": message,
        "points_preview": points_preview,
        "errors": errors,
        "perfect": errors == 0,
        "exploded": errors >= 3,
    }


def _add_event(events, player_name, house, points, label):
    events.append({
        "player_name": player_name,
        "house": house,
        "points": points,
        "label": label,
    })


def _house_of(players, player_name):
    for player in players:
        if player.get("name") == player_name:
            return player.get("house")

    return None


def _first_player_in_house(players, house):
    for player in players:
        if player.get("house") == house:
            return player.get("name")

    return None


def resolve_for_reveal(state, players=None):
    state = state or {}

    if state.get("scored"):
        return state, state.get("point_events", []), True

    players = players or []
    answers = state.get("answers", {})
    recipe = state.get("recipe", [])

    events = []
    player_results = []
    perfect_by_house = {}

    for player in players:
        name = player.get("name")
        house = player.get("house")

        if name in answers:
            result = answers[name]
        else:
            result = {
                "player_name": name,
                "submitted": [],
                "errors": 99,
                "points_preview": 0,
                "perfect": False,
                "late": True,
                "mix_elapsed_seconds": None,
                "exploded": True,
            }

        errors = int(result.get("errors", 99))
        points = _points_for_errors(errors)
        perfect = errors == 0

        label = "Receta perfecta"
        if errors == 1:
            label = "Un error"
        elif errors == 2:
            label = "Dos errores"
        elif errors >= 3:
            label = "Explosión de caldero"

        _add_event(events, name, house, points, label)

        if perfect:
            perfect_by_house[house] = perfect_by_house.get(house, 0) + 1

        player_results.append({
            **result,
            "player_name": name,
            "house": house,
            "points": points,
            "label": label,
        })

    perfect_results = [
        result for result in player_results
        if result.get("perfect") and result.get("mix_elapsed_seconds") is not None
    ]

    fastest_perfect = None

    if perfect_results:
        perfect_results.sort(key=lambda item: item.get("mix_elapsed_seconds", 999))
        fastest_perfect = perfect_results[0]

        _add_event(
            events,
            fastest_perfect["player_name"],
            fastest_perfect["house"],
            POINTS_FASTEST_PERFECT,
            "Poción perfecta más rápida",
        )

    winning_houses = []

    if perfect_by_house:
        max_perfect = max(perfect_by_house.values())

        winning_houses = [
            house for house, count in perfect_by_house.items()
            if count == max_perfect and count > 0
        ]

        for house in winning_houses:
            receiver = _first_player_in_house(players, house)

            if receiver:
                _add_event(
                    events,
                    receiver,
                    house,
                    POINTS_HOUSE_MOST_PERFECT,
                    "Casa con más recetas perfectas",
                )

    explosions = [
        result for result in player_results
        if int(result.get("errors", 99)) >= 3
    ]

    state["phase"] = "results_clase_pociones"
    state["correct"] = state.get("potion_name", "Poción finalizada")
    state["pociones_result"] = {
        "potion_name": state.get("potion_name"),
        "recipe": recipe,
        "player_results": player_results,
        "fastest_perfect": fastest_perfect,
        "winning_houses": winning_houses,
        "explosions": explosions,
        "summary": "La clase terminó. Algunos calderos sobrevivieron. Otros serán recordados con respeto.",
        "narrator": random.choice([
            "Esa poción no mataría a nadie… probablemente.",
            "Vi menos humo en una reunión de profesores discutiendo presupuesto.",
            "Si alguien pregunta, esta explosión era parte del programa académico.",
            "Excelente trabajo. Bueno, excelente para quienes no hicieron un cráter.",
        ]),
    }
    state["point_events"] = events
    state["scored"] = True

    return state, events, True