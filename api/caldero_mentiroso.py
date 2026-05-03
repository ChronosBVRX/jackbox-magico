import random
import time
import uuid
from copy import deepcopy
from typing import Dict, List, Optional, Tuple


PHASE = "caldero_mentiroso"
RESULTS_PHASE = "results_caldero_mentiroso"
MAX_PLAYERS = 8
STARTING_STABILITY = 3
SUBMIT_SECONDS = 70
STATE_VERSION = "caldero-mentiroso-v1"

INGREDIENT_TYPES = {
    "bueno": {
        "label": "Bueno",
        "emoji": "🌿",
        "effect": 1,
        "tone": "Parece noble. Eso casi siempre significa problemas menores.",
    },
    "malo": {
        "label": "Malo",
        "emoji": "🦴",
        "effect": -1,
        "tone": "Huele a pasillo prohibido y a decisión cuestionable.",
    },
    "explosivo": {
        "label": "Explosivo",
        "emoji": "💥",
        "effect": -3,
        "tone": "No late, pero definitivamente quiere hacer escándalo.",
    },
    "dorado": {
        "label": "Dorado",
        "emoji": "✨",
        "effect": 2,
        "tone": "Brilla como si hubiera pagado palco en el Mundial de Quidditch.",
    },
}

INGREDIENT_NAMES = {
    "bueno": [
        "Raíz de Mandrágora calmada",
        "Hoja de Díctamo decente",
        "Lágrima de Fénix económica",
        "Menta de Invernadero 3",
        "Polvo de Luna bien portado",
    ],
    "malo": [
        "Baba de Troll con actitud",
        "Uña de Sapo rencoroso",
        "Moho de Mazmorra sospechoso",
        "Pelo de Kneazle de dudosa procedencia",
        "Ceniza de Caldero usado en martes",
    ],
    "explosivo": [
        "Escama de Colacuerno nerviosa",
        "Chispa de Varita resentida",
        "Semilla de Mandrágora gritona",
        "Cristal de Erumpent miniatura",
        "Polvo de Explosión convenientemente etiquetado",
    ],
    "dorado": [
        "Gota Dorada de Suerte líquida",
        "Lámina de Felix Felicis pirata",
        "Azafrán de Gringotts",
        "Brillo de Snitch en polvo",
        "Esencia de Puntos Extra",
    ],
}

TYPE_DECK = [
    "bueno",
    "bueno",
    "bueno",
    "malo",
    "malo",
    "explosivo",
    "explosivo",
    "dorado",
]

ACTION_ALIASES = {
    "meter": "meter",
    "meter al caldero": "meter",
    "meter_al_caldero": "meter",
    "caldero": "meter",
    "descartar": "descartar",
    "descarta": "descartar",
    "discard": "descartar",
    "acusar": "acusar",
    "acusa": "acusar",
    "accuse": "acusar",
}

NARRATOR_LINES = [
    "Pueden mentir, claro. No sería la primera vez que un mago finge inocencia.",
    "El caldero no juzga. Solo burbujea con decepción.",
    "Aquí todos son inocentes hasta que la mesa tiembla.",
    "Si alguien sonríe demasiado, probablemente trae algo explosivo o cobra quincena.",
    "La confianza es importante. Por eso este juego la destruye con estilo.",
]


def now_ts() -> int:
    return int(time.time())


def normalize_name(value: str) -> str:
    return str(value or "").strip()


def normalize_action(value: str) -> Optional[str]:
    key = str(value or "").strip().lower()
    return ACTION_ALIASES.get(key)


def build_state():
    return {
        "phase": PHASE,
        "game_id": "caldero_mentiroso",
        "state_version": STATE_VERSION,
        "round_id": str(uuid.uuid4()),
        "started_at": now_ts(),
        "submit_seconds": SUBMIT_SECONDS,
        "stability_start": STARTING_STABILITY,
        "question": "El Caldero Mentiroso exige ingredientes... y mentiras convincentes.",
        "narrator_line": random.choice(NARRATOR_LINES),
        "options": ["Meter al caldero", "Descartar", "Acusar a otro jugador"],
        "rules_summary": [
            "Cada jugador recibe un ingrediente secreto.",
            "Puedes meterlo, descartarlo o acusar a alguien de sabotear la poción.",
            "La TV no revela los ingredientes hasta el final.",
            "La poción inicia con 3 puntos de estabilidad.",
            "Bueno +1 · Malo -1 · Explosivo -3 · Dorado +2.",
        ],
        # La función sanitize_game_state de api/main.py elimina correct antes de resultados.
        # Lo usamos como bóveda privada para que los ingredientes no aparezcan en la TV.
        "correct": {
            "ingredients_by_player": {},
            "assigned_order": [],
        },
        # sanitize_game_state convierte answers en {jugador: True}; así no se filtra la acción.
        "answers": {},
        "caldero_claims": {},  # {player_name: {claim: str, submitted_at: int}}
        "caldero_public_log": [],
        "point_events": [],
    }


def _private_box(state: dict) -> dict:
    box = state.setdefault("correct", {})
    if not isinstance(box, dict):
        box = {}
        state["correct"] = box

    box.setdefault("ingredients_by_player", {})
    box.setdefault("assigned_order", [])
    return box


def _used_type_counts(box: dict) -> Dict[str, int]:
    counts = {key: 0 for key in INGREDIENT_TYPES.keys()}
    for ingredient in box.get("ingredients_by_player", {}).values():
        ingredient_type = ingredient.get("type")
        if ingredient_type in counts:
            counts[ingredient_type] += 1
    return counts


def _draw_type(box: dict) -> str:
    counts = _used_type_counts(box)
    remaining = []

    for item in TYPE_DECK:
        if counts.get(item, 0) < TYPE_DECK.count(item):
            remaining.append(item)

    if remaining:
        return random.choice(remaining)

    return random.choices(
        population=["bueno", "malo", "explosivo", "dorado"],
        weights=[38, 25, 22, 15],
        k=1,
    )[0]


def _make_ingredient(ingredient_type: str) -> dict:
    config = INGREDIENT_TYPES[ingredient_type]
    return {
        "id": str(uuid.uuid4()),
        "type": ingredient_type,
        "label": config["label"],
        "emoji": config["emoji"],
        "name": random.choice(INGREDIENT_NAMES[ingredient_type]),
        "effect": config["effect"],
        "tone": config["tone"],
    }


def ensure_player_secret(
    state: dict,
    player_name: str,
    player_house: Optional[str] = None,
) -> Tuple[dict, dict, bool]:
    player_name = normalize_name(player_name)
    if not player_name:
        raise ValueError("Falta player_name")

    box = _private_box(state)
    ingredients = box["ingredients_by_player"]

    if player_name in ingredients:
        return state, ingredients[player_name], False

    ingredient_type = _draw_type(box)
    ingredient = _make_ingredient(ingredient_type)
    ingredient["player_name"] = player_name
    ingredient["house"] = player_house

    ingredients[player_name] = ingredient
    box["assigned_order"].append(player_name)

    return state, ingredient, True


def ensure_players_have_secrets(state: dict, players: List[dict]) -> dict:
    for player in players or []:
        ensure_player_secret(
            state=state,
            player_name=player.get("name"),
            player_house=player.get("house"),
        )
    return state


def get_player_view(state: dict, player_name: str, players: Optional[List[dict]] = None) -> dict:
    player_name = normalize_name(player_name)
    player_house = None

    for player in players or []:
        if player.get("name") == player_name:
            player_house = player.get("house")
            break

    state, ingredient, _ = ensure_player_secret(state, player_name, player_house)
    answers = state.get("answers", {}) if isinstance(state.get("answers"), dict) else {}

    public_players = []
    for player in players or []:
        name = player.get("name")
        public_players.append({
            "name": name,
            "house": player.get("house"),
            "submitted": bool(answers.get(name)),
        })

    return {
        "phase": state.get("phase"),
        "round_id": state.get("round_id"),
        "started_at": state.get("started_at"),
        "submit_seconds": state.get("submit_seconds", SUBMIT_SECONDS),
        "ingredient": ingredient,
        "already_submitted": bool(answers.get(player_name)),
        "my_action": answers.get(player_name),
        "submitted_count": len(answers.keys()),
        "total_players": len(players or []),
        "players": public_players,
        "narrator_line": state.get("narrator_line"),
    }


def submit_action(
    state: dict,
    player_name: str,
    player_house: Optional[str],
    action: str,
    target_name: Optional[str] = None,
    claim: Optional[str] = None,
    players: Optional[List[dict]] = None,
) -> dict:
    state = deepcopy(state or {})
    phase = state.get("phase")

    if phase != PHASE:
        return {
            "state": state,
            "accepted": False,
            "message": "El Caldero Mentiroso no está aceptando ingredientes ahora.",
        }

    player_name = normalize_name(player_name)
    action = normalize_action(action)

    if not player_name:
        return {"state": state, "accepted": False, "message": "Falta el nombre del jugador."}

    if action not in {"meter", "descartar", "acusar"}:
        return {"state": state, "accepted": False, "message": "Acción inválida para el caldero."}

    answers = state.setdefault("answers", {})
    if player_name in answers:
        return {
            "state": state,
            "accepted": False,
            "message": "Ya decidiste. El caldero no acepta arrepentimientos dramáticos.",
        }

    state, ingredient, _ = ensure_player_secret(state, player_name, player_house)

    clean_target = normalize_name(target_name)
    known_players = [player.get("name") for player in players or [] if player.get("name")]

    if action == "acusar":
        if not clean_target:
            return {"state": state, "accepted": False, "message": "Elige a quién acusar."}

        if clean_target == player_name:
            return {
                "state": state,
                "accepted": False,
                "message": "Acusarte a ti mismo es muy teatral, pero no cuenta.",
            }

        if known_players and clean_target not in known_players:
            return {
                "state": state,
                "accepted": False,
                "message": "Ese jugador no está en la sala.",
            }

        target_house = None
        for player in players or []:
            if player.get("name") == clean_target:
                target_house = player.get("house")
                break

        # Se asigna ingrediente al acusado para que la acusación pueda evaluarse al final
        # incluso si intenta esconderse como estatua del pasillo.
        ensure_player_secret(state, clean_target, target_house)

    answers[player_name] = {
        "player_name": player_name,
        "house": player_house,
        "action": action,
        "target": clean_target if action == "acusar" else None,
        "ingredient_id": ingredient.get("id"),
        "submitted_at": now_ts(),
    }

    if claim:
        claims = state.setdefault("caldero_claims", {})
        claims[player_name] = {
            "claim": str(claim).strip(),
            "submitted_at": now_ts(),
        }

    state.setdefault("caldero_public_log", []).append({
        "player_name": player_name,
        "house": player_house,
        "text": _public_action_line(player_name, action, claim),
        "at": now_ts(),
    })

    state["caldero_public_log"] = state.get("caldero_public_log", [])[-15:]

    return {
        "state": state,
        "accepted": True,
        "message": _action_confirmation(action),
        "action": action,
    }


def _public_action_line(player_name: str, action: str, claim: Optional[str] = None) -> str:
    line = ""
    if action == "meter":
        line = f"{player_name} se acercó al caldero con demasiada seguridad."
    elif action == "descartar":
        line = f"{player_name} descartó algo. O salvó a todos, o desperdició gloria."
    else:
        line = f"{player_name} acusó a alguien. El drama académico sube de nivel."

    if claim:
        return f"{player_name} declara: “{claim}”. {line}"
    return line


def _action_confirmation(action: str) -> str:
    if action == "meter":
        return "Ingrediente enviado. El caldero hizo burbujas de juicio."
    if action == "descartar":
        return "Ingrediente descartado. Nadie sabrá si fuiste prudente o cobarde."
    return "Acusación registrada. Pueden mentir, claro. Esto es una clase avanzada."


def reveal_results(state: dict, players: List[dict]) -> dict:
    state = deepcopy(state or {})

    if state.get("phase") == RESULTS_PHASE and state.get("caldero_result"):
        return {
            "state": state,
            "result": state.get("caldero_result"),
            "already_revealed": True,
        }

    ensure_players_have_secrets(state, players)

    result = calculate_results(state, players)

    state["phase"] = RESULTS_PHASE
    state["caldero_result"] = result
    state["point_events"] = result.get("point_events", [])
    state["revealed_at"] = now_ts()

    return {
        "state": state,
        "result": result,
        "already_revealed": False,
    }


def calculate_results(state: dict, players: List[dict]) -> dict:
    box = _private_box(state)
    ingredients = box.get("ingredients_by_player", {})
    answers = state.get("answers", {}) if isinstance(state.get("answers"), dict) else {}

    players_by_name = {player.get("name"): player for player in players or [] if player.get("name")}
    point_events = []
    player_results = []
    stability = int(state.get("stability_start") or STARTING_STABILITY)

    def add_event(player_name: str, points: int, reason: str):
        if not player_name or points == 0:
            return
        point_events.append({
            "player_name": player_name,
            "points": int(points),
            "reason": reason,
        })

    cauldron_entries = []
    discarded_entries = []
    accusations = []

    for player_name, player in players_by_name.items():
        ingredient = ingredients.get(player_name)
        answer = answers.get(player_name)
        action = answer.get("action") if isinstance(answer, dict) else None

        if not ingredient:
            continue

        if action == "meter":
            stability += int(ingredient.get("effect") or 0)
            cauldron_entries.append(player_name)
        elif action == "descartar":
            discarded_entries.append(player_name)
        elif action == "acusar":
            accusations.append((player_name, answer.get("target")))
        else:
            add_event(player_name, -20, "no_decidio")

    survived = stability >= 1

    correctly_accused_targets = set()
    accusation_results = []

        is_correct_explosive = bool(
            target_answer
            and target_answer.get("action") == "meter"
            and target_ingredient
            and target_ingredient.get("type") == "explosivo"
        )
        is_correct_malo = bool(
            target_answer
            and target_answer.get("action") == "meter"
            and target_ingredient
            and target_ingredient.get("type") == "malo"
        )

        if is_correct_explosive:
            correctly_accused_targets.add(target)
            add_event(accuser, 90, "acusacion_correcta_explosivo")
        elif is_correct_malo:
            correctly_accused_targets.add(target)
            add_event(accuser, 40, "acusacion_correcta_malo")
        else:
            add_event(accuser, -30, "acusacion_incorrecta")

        accusation_results.append({
            "accuser": accuser,
            "target": target,
            "correct_explosive": is_correct_explosive,
            "correct_malo": is_correct_malo,
            "correct": is_correct_explosive or is_correct_malo,
        })

    if survived:
        good_house_counts: Dict[str, int] = {}

        for player_name in cauldron_entries:
            ingredient = ingredients[player_name]
            ingredient_type = ingredient.get("type")
            player_house = players_by_name.get(player_name, {}).get("house")

            if ingredient_type == "bueno":
                add_event(player_name, 120, "ingrediente_bueno_sobrevive")
                if player_house:
                    good_house_counts[player_house] = good_house_counts.get(player_house, 0) + 1

            if ingredient_type == "dorado":
                add_event(player_name, 180, "ingrediente_dorado_sobrevive")

        max_good = max(good_house_counts.values()) if good_house_counts else 0
        winning_good_houses = [
            house for house, count in good_house_counts.items()
            if count == max_good and count > 0
        ]

        for player in players or []:
            if player.get("house") in winning_good_houses:
                add_event(player.get("name"), 100, "casa_con_mas_buenos")
    else:
        affected_houses = set()

        for player_name in cauldron_entries:
            ingredient = ingredients[player_name]
            ingredient_type = ingredient.get("type")
            player_house = players_by_name.get(player_name, {}).get("house")

            if ingredient_type == "explosivo" and player_name not in correctly_accused_targets:
                add_event(player_name, 100, "explosivo_no_detectado")

            if ingredient_type == "malo":
                add_event(player_name, 50, "ingrediente_malo_explota")

            if ingredient_type in {"bueno", "dorado"} and player_house:
                affected_houses.add(player_house)

        for player in players or []:
            if player.get("house") in affected_houses:
                add_event(player.get("name"), -50, "casa_afectada_por_explosion")

    # Regla añadida para hacer viable el descarte: si tiras un explosivo, salvaste vidas.
    for player_name in discarded_entries:
        ingredient = ingredients.get(player_name)
        if ingredient and ingredient.get("type") == "explosivo":
            add_event(player_name, 60, "descarto_explosivo")

    points_by_player: Dict[str, int] = {}
    reasons_by_player: Dict[str, List[str]] = {}
    for event in point_events:
        player_name = event.get("player_name")
        points_by_player[player_name] = points_by_player.get(player_name, 0) + int(event.get("points") or 0)
        reasons_by_player.setdefault(player_name, []).append(event.get("reason"))

    for player_name, player in players_by_name.items():
        ingredient = ingredients.get(player_name) or {}
        answer = answers.get(player_name) if isinstance(answers.get(player_name), dict) else {}

        player_results.append({
            "player_name": player_name,
            "house": player.get("house"),
            "ingredient": ingredient,
            "action": answer.get("action") or "sin_accion",
            "claim": state.get("caldero_claims", {}).get(player_name, {}).get("claim"),
            "target": answer.get("target"),
            "points": points_by_player.get(player_name, 0),
            "reasons": reasons_by_player.get(player_name, []),
        })

    headline = "La poción sobrevivió" if survived else "La poción explotó"
    narration = (
        "Contra todo pronóstico, el caldero sigue entero. Alguien debería avisarle al profesor."
        if survived
        else "La poción explotó. Pésimo, pero hermoso. Diez puntos a quien no perdió las cejas."
    )

    return {
        "survived": survived,
        "headline": headline,
        "narration": narration,
        "stability_start": int(state.get("stability_start") or STARTING_STABILITY),
        "stability_final": stability,
        "submitted_count": len(answers.keys()),
        "meter_count": len(cauldron_entries),
        "discard_count": len(discarded_entries),
        "accuse_count": len(accusations),
        "cauldron_entries": cauldron_entries,
        "discarded_entries": discarded_entries,
        "accusations": accusation_results,
        "player_results": sorted(player_results, key=lambda item: item.get("points", 0), reverse=True),
        "point_events": point_events,
    }
