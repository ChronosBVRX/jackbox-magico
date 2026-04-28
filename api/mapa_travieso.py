"""Minijuego: El Mapa Travieso.

Diseñado como estado modular para la app tipo party game. El backend genera una
ronda con mapa, zonas, objetos visibles por pocos segundos y una pregunta de
memoria. La estructura queda lista para polling actual o para emitir eventos con
Socket.IO en el futuro.
"""

import random
import time
from copy import deepcopy

ZONES = [
    {"id": "torre_norte", "name": "Torre Norte", "x": 16, "y": 14},
    {"id": "gran_comedor", "name": "Gran Comedor", "x": 49, "y": 20},
    {"id": "biblioteca", "name": "Biblioteca", "x": 77, "y": 18},
    {"id": "mazmorras", "name": "Mazmorras", "x": 24, "y": 72},
    {"id": "bano_embrujado", "name": "Baño Embrujado", "x": 52, "y": 62},
    {"id": "campo_quidditch", "name": "Campo de Quidditch", "x": 82, "y": 72},
    {"id": "bosque_prohibido", "name": "Bosque Prohibido", "x": 13, "y": 43},
    {"id": "aula_pociones", "name": "Aula de Pociones", "x": 63, "y": 42},
]

MAGIC_OBJECTS = [
    {"id": "varita_perdida", "name": "varita perdida", "emoji": "🪄"},
    {"id": "libro_prohibido", "name": "libro prohibido", "emoji": "📕"},
    {"id": "llave_voladora", "name": "llave voladora", "emoji": "🗝️"},
    {"id": "capa_invisible", "name": "capa invisible", "emoji": "🧥"},
    {"id": "rana_chocolate", "name": "rana de chocolate", "emoji": "🐸"},
    {"id": "copa_encantada", "name": "copa encantada", "emoji": "🏆"},
    {"id": "pluma_magica", "name": "pluma mágica", "emoji": "🪶"},
]

VARIANTS = [
    {
        "id": "normal",
        "name": "Mapa clásico",
        "observation_seconds": 8,
        "wrong_penalty": 0,
        "reorder_zones": False,
        "flavor": "Juro solemnemente que mis intenciones no son buenas.",
    },
    {
        "id": "escaleras_moviles",
        "name": "Escaleras móviles",
        "observation_seconds": 8,
        "wrong_penalty": 0,
        "reorder_zones": True,
        "flavor": "Las escaleras cambiaron de lugar. Nada personal, solo Hogwarts siendo Hogwarts.",
    },
    {
        "id": "modo_filch",
        "name": "Modo Filch",
        "observation_seconds": 5,
        "wrong_penalty": -20,
        "reorder_zones": False,
        "flavor": "Filch anda rondando con cara de que no le pagaron horas extra.",
    },
    {
        "id": "filch_escaleras",
        "name": "Filch + escaleras móviles",
        "observation_seconds": 5,
        "wrong_penalty": -20,
        "reorder_zones": True,
        "flavor": "Filch viene cerca y las escaleras decidieron traicionarte.",
    },
]

NARRATOR_LINES = [
    "Señores, el mapa no miente... solo se burla discretamente.",
    "Observen bien, porque después todos dirán: ‘yo sí lo vi’. Ajá.",
    "Quien memorice esto merece puntos. Quien no, merece ir con Filch.",
    "Si se pierde la varita, mínimo no pierdan la dignidad.",
]


def _shuffled_options(correct_zone_name: str):
    distractors = [zone["name"] for zone in ZONES if zone["name"] != correct_zone_name]
    options = random.sample(distractors, 3) + [correct_zone_name]
    random.shuffle(options)
    return options


def _build_object_layout():
    selected_objects = random.sample(MAGIC_OBJECTS, k=random.randint(5, 7))
    selected_zones = random.sample(ZONES, k=len(selected_objects))
    layout = []

    for magic_object, zone in zip(selected_objects, selected_zones):
        jitter_x = random.randint(-4, 4)
        jitter_y = random.randint(-4, 4)
        layout.append({
            "id": magic_object["id"],
            "name": magic_object["name"],
            "emoji": magic_object["emoji"],
            "zone_id": zone["id"],
            "zone": zone["name"],
            "x": max(7, min(93, zone["x"] + jitter_x)),
            "y": max(9, min(88, zone["y"] + jitter_y)),
        })

    return layout


def build_state():
    variant = deepcopy(random.choice(VARIANTS))
    zones = deepcopy(ZONES)

    if variant.get("reorder_zones"):
        # Cambia la distribución visual sin cambiar los nombres de las zonas.
        positions = [(zone["x"], zone["y"]) for zone in zones]
        random.shuffle(positions)
        for zone, (x, y) in zip(zones, positions):
            zone["x"] = x
            zone["y"] = y

    objects = _build_object_layout()
    target = random.choice(objects)
    correct_zone = target["zone"]

    return {
        "phase": "mapa_travieso",
        "round_id": f"mapa-{int(time.time())}-{random.randint(1000, 9999)}",
        "game_title": "El Mapa Travieso",
        "subtitle": "Memoria mágica · Copa de las Casas",
        "started_at": time.time(),
        "observation_seconds": variant["observation_seconds"],
        "answer_seconds": 10,
        "variant": variant,
        "zones": zones,
        "objects": objects,
        "target_object": {
            "id": target["id"],
            "name": target["name"],
            "emoji": target["emoji"],
        },
        "question": f"¿Dónde estaba la {target['name']}?" if target["name"].endswith("a") else f"¿Dónde estaba el {target['name']}?",
        "options": _shuffled_options(correct_zone),
        "correct": correct_zone,
        "correct_label": f"{target['emoji']} {target['name']} → {correct_zone}",
        "points_correct": 100,
        "points_wrong": variant["wrong_penalty"],
        "points_fastest": 30,
        "points_house_combo": 80,
        "answers": {},
        "narrator_line": random.choice(NARRATOR_LINES),
        "socket_ready": {
            "namespace": "/mapa-travieso",
            "events": [
                "mapa:round_started",
                "mapa:observation_finished",
                "mapa:answer_submitted",
                "mapa:round_revealed",
            ],
        },
    }


def score_answer(state: dict, player_name: str, answer: str, player_house: str = None, client_elapsed_ms=None):
    """Evalúa una respuesta sin mutar el estado original.

    Esta función queda lista para conectarse desde api/main.py o desde un evento
    Socket.IO. Evita doble respuesta, calcula correcto/error y guarda metadatos
    para poder resolver bonus de velocidad y bonus de casa al revelar.
    """

    next_state = deepcopy(state or {})
    answers = next_state.setdefault("answers", {})

    if player_name in answers:
        return {
            "state": next_state,
            "accepted": False,
            "message": "Ya habías respondido, travieso.",
            "points": 0,
            "correct": answers[player_name].get("correct", False),
        }

    correct = answer == next_state.get("correct")
    elapsed_ms = client_elapsed_ms

    if elapsed_ms is None:
        started_at = float(next_state.get("started_at") or time.time())
        observation = float(next_state.get("observation_seconds") or 8)
        elapsed_ms = max(0, int((time.time() - started_at - observation) * 1000))

    answers[player_name] = {
        "answer": answer,
        "correct": correct,
        "house": player_house,
        "elapsed_ms": int(elapsed_ms or 0),
        "base_points": next_state.get("points_correct", 100) if correct else next_state.get("points_wrong", 0),
    }

    return {
        "state": next_state,
        "accepted": True,
        "message": "Respuesta marcada en tinta mágica.",
        "points": answers[player_name]["base_points"],
        "correct": correct,
    }


def resolve_for_reveal(state: dict, players=None):
    """Calcula bonus finales para una futura integración backend completa."""

    next_state = deepcopy(state or {})
    answers = next_state.get("answers", {}) or {}
    players = players or []
    point_events = []

    correct_answers = [
        (name, data)
        for name, data in answers.items()
        if data.get("correct")
    ]

    fastest_name = None
    if correct_answers:
        fastest_name, fastest_data = min(
            correct_answers,
            key=lambda item: int(item[1].get("elapsed_ms") or 999999),
        )
        point_events.append({
            "player_name": fastest_name,
            "points": int(next_state.get("points_fastest") or 30),
            "reason": "Respuesta correcta más rápida",
        })

    house_to_correct = {}
    for player in players:
        name = player.get("name")
        house = player.get("house")
        if not name or not house:
            continue
        if answers.get(name, {}).get("correct"):
            house_to_correct.setdefault(house, []).append(name)

    house_bonuses = []
    for house, names in house_to_correct.items():
        if len(names) >= 2:
            house_bonuses.append({"house": house, "players": names})
            for name in names:
                point_events.append({
                    "player_name": name,
                    "points": int(next_state.get("points_house_combo") or 80),
                    "reason": "Los dos jugadores de la casa acertaron",
                })

    next_state["phase"] = "results_mapa_travieso"
    next_state["mapa_result"] = {
        "fastest": fastest_name,
        "house_bonuses": house_bonuses,
        "answers": answers,
    }
    next_state["point_events"] = point_events

    return next_state, point_events, True
