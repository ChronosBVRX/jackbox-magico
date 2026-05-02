import math
import random
import time
import uuid
from copy import deepcopy


GAME_ID = "atrapa_snitch"

ROUND_DURATION_SECONDS = 24
ATTEMPTS_TOTAL = 5

ARENA_WIDTH = 100
ARENA_HEIGHT = 100

SNITCH_RADIUS = 3.2
ZONE_RADIUS = 9.5

POINTS_LEGENDARY = 180
POINTS_PERFECT = 130
POINTS_GREAT = 90
POINTS_CLOSE = 45
POINTS_MISS = -20

BONUS_BEST_SEEKER = 80


NARRATOR_LINES = [
    "¡La Snitch se volvió loca!",
    "No parpadeen. La Snitch huele el miedo.",
    "Ese bicho dorado tiene más cambios de dirección que grupo de WhatsApp organizando cena.",
    "La zona de captura se mueve. La Snitch acelera. Su dignidad está en juego.",
    "Si fallan, no pasa nada. Bueno sí, todos lo van a ver en la TV.",
    "Buscadores listos: esto ya no es tutorial, esto es humillación premium.",
]

MISS_LINES = [
    "¡SE ESCAPÓ!",
    "¡AIRE PURO!",
    "¡LA SALUDASTE!",
    "¡TOCASTE EL VACÍO!",
    "¡ESO ERA CON EL DEDO, NO CON FE!",
    "¡LA SNITCH YA IBA EN OTRO CÓDIGO POSTAL!",
]

CLOSE_LINES = [
    "¡POR POQUITO!",
    "¡LE ROZASTE EL ALA!",
    "¡CASI LE DAS UN SUSTO!",
    "¡ESO ESTUVO CERCA!",
]

GREAT_LINES = [
    "¡BUENÍSIMA!",
    "¡REFLEJO DE BUSCADOR!",
    "¡ESA SÍ OLÍA A MAGIA!",
    "¡LA SNITCH SINTIÓ PRESIÓN!",
]

PERFECT_LINES = [
    "¡CAPTURA PERFECTA!",
    "¡BUSCADOR LEGENDARIO!",
    "¡ESO FUE CINE!",
    "¡NI HARRY EN SUS MEJORES DÍAS!",
]

LEGENDARY_LINES = [
    "¡BUSCADOR LEGENDARIO!",
    "¡LA SNITCH FUE HUMILLADA!",
    "¡ATRAPADA CON ELEGANCIA!",
    "¡ESO MERECE FOTO EN EL PROFETA!",
]

FAKE_OBJECTS = [
    {"emoji": "🦇", "label": "murciélago dramático"},
    {"emoji": "👻", "label": "fantasma metiche"},
    {"emoji": "⚫", "label": "bludger chismosa"},
    {"emoji": "✨", "label": "brillo sospechoso"},
    {"emoji": "🌫️", "label": "sombra intensa"},
    {"emoji": "🪙", "label": "moneda tramposa"},
]


def _now():
    return time.time()


def _safe_float(value, fallback=0.0):
    try:
        return float(value)
    except Exception:
        return fallback


def _safe_int(value, fallback=0):
    try:
        return int(value)
    except Exception:
        return fallback


def _clamp(value, min_value, max_value):
    return max(min_value, min(max_value, value))


def _lerp(a, b, t):
    return a + (b - a) * t


def _ease(name, t):
    t = _clamp(t, 0.0, 1.0)

    if name == "linear":
        return t

    if name == "ease_out_quad":
        return 1 - (1 - t) * (1 - t)

    if name == "ease_in_quad":
        return t * t

    if name == "ease_in_out_quad":
        return 2 * t * t if t < 0.5 else 1 - pow(-2 * t + 2, 2) / 2

    if name == "ease_out_cubic":
        return 1 - pow(1 - t, 3)

    if name == "ease_in_out_cubic":
        return 4 * t * t * t if t < 0.5 else 1 - pow(-2 * t + 2, 3) / 2

    return -(math.cos(math.pi * t) - 1) / 2


def _distance(a, b):
    return math.hypot(float(a["x"]) - float(b["x"]), float(a["y"]) - float(b["y"]))


def _random_point(rng, kind="snitch"):
    if kind == "snitch":
        # Mantenerla más visible: no se va hasta las orillas.
        x_min, x_max = 10, 90
        y_min, y_max = 16, 82
        center_bias = 0.68
    else:
        # Zona de captura más centrada para que la acción esté visible.
        x_min, x_max = 18, 82
        y_min, y_max = 22, 76
        center_bias = 0.82

    if rng.random() < center_bias:
        return {
            "x": rng.triangular(x_min, x_max, 50),
            "y": rng.triangular(y_min, y_max, 50),
        }

    return {
        "x": rng.uniform(x_min, x_max),
        "y": rng.uniform(y_min, y_max),
    }


def _next_point_far_enough(rng, current, kind="snitch"):
    min_dist = 22 if kind == "snitch" else 14

    for _ in range(40):
        point = _random_point(rng, kind)
        if _distance(current, point) >= min_dist:
            return point

    return _random_point(rng, kind)


def _build_motion_segments(rng, duration_seconds, kind="snitch"):
    segments = []
    elapsed = 0.0
    current = _random_point(rng, kind)

    while elapsed < duration_seconds:
        remaining = duration_seconds - elapsed

        if kind == "snitch":
            dash = rng.random() < 0.30
            sudden_turn = rng.random() < 0.24

            if dash:
                segment_duration = rng.uniform(0.42, 0.68)
                wobble = rng.uniform(1.6, 3.2)
                speed_label = "dash"
                easing = rng.choice(["ease_out_cubic", "ease_out_quad", "linear"])
            elif sudden_turn:
                segment_duration = rng.uniform(0.60, 0.92)
                wobble = rng.uniform(2.2, 4.2)
                speed_label = "quiebre"
                easing = rng.choice(["ease_in_out_quad", "ease_out_cubic"])
            else:
                segment_duration = rng.uniform(0.95, 1.55)
                wobble = rng.uniform(1.6, 4.0)
                speed_label = "fluida"
                easing = rng.choice(["ease_in_out_sine", "ease_in_out_quad", "ease_in_out_cubic"])

            next_point = _next_point_far_enough(rng, current, kind="snitch")

        else:
            # La zona también se mueve más rápido, pero no tanto como la Snitch.
            quick_zone = rng.random() < 0.34

            if quick_zone:
                segment_duration = rng.uniform(0.55, 0.9)
                wobble = rng.uniform(0.8, 1.8)
                speed_label = "zona_rápida"
                easing = rng.choice(["ease_in_out_quad", "ease_out_quad"])
            else:
                segment_duration = rng.uniform(0.95, 1.55)
                wobble = rng.uniform(0.5, 1.3)
                speed_label = "zona_fluida"
                easing = rng.choice(["ease_in_out_sine", "ease_in_out_cubic"])

            next_point = _next_point_far_enough(rng, current, kind="zone")

        segment_duration = min(segment_duration, remaining)

        segment = {
            "id": str(uuid.uuid4()),
            "kind": kind,
            "t0": round(elapsed, 4),
            "t1": round(elapsed + segment_duration, 4),
            "x0": round(current["x"], 4),
            "y0": round(current["y"], 4),
            "x1": round(next_point["x"], 4),
            "y1": round(next_point["y"], 4),
            "easing": easing,
            "wobble": round(wobble, 4),
            "wave": round(rng.uniform(1.2, 4.8), 4),
            "phase": round(rng.uniform(0, math.pi * 2), 4),
            "speed_label": speed_label,
        }

        segments.append(segment)
        current = next_point
        elapsed += segment_duration

    return segments


def _build_fake_objects(rng, duration_seconds):
    fake_objects = []

    for index in range(12):
        start = rng.uniform(1.2, duration_seconds - 1.2)
        point_a = _random_point(rng, "snitch")
        point_b = _next_point_far_enough(rng, point_a, "snitch")
        fake = rng.choice(FAKE_OBJECTS)

        fake_objects.append({
            "id": f"fake-{index + 1}",
            "emoji": fake["emoji"],
            "label": fake["label"],
            "t0": round(start, 3),
            "t1": round(start + rng.uniform(0.65, 1.15), 3),
            "x0": round(point_a["x"], 3),
            "y0": round(point_a["y"], 3),
            "x1": round(point_b["x"], 3),
            "y1": round(point_b["y"], 3),
            "size": round(rng.uniform(2.8, 5.2), 2),
            "spin": round(rng.uniform(-2.8, 2.8), 3),
        })

    return fake_objects


def _position_at(segments, elapsed_seconds):
    if not segments:
        return {"x": 50, "y": 50}

    if elapsed_seconds <= segments[0]["t0"]:
        return {
            "x": segments[0]["x0"],
            "y": segments[0]["y0"],
        }

    selected = segments[-1]

    for segment in segments:
        if segment["t0"] <= elapsed_seconds <= segment["t1"]:
            selected = segment
            break

    duration = max(0.001, selected["t1"] - selected["t0"])
    raw_t = _clamp((elapsed_seconds - selected["t0"]) / duration, 0, 1)
    eased = _ease(selected.get("easing", "ease_in_out_sine"), raw_t)

    x = _lerp(selected["x0"], selected["x1"], eased)
    y = _lerp(selected["y0"], selected["y1"], eased)

    dx = selected["x1"] - selected["x0"]
    dy = selected["y1"] - selected["y0"]
    length = max(0.001, math.hypot(dx, dy))

    nx = -dy / length
    ny = dx / length

    wobble = selected.get("wobble", 0)
    wave = selected.get("wave", 1)
    phase = selected.get("phase", 0)

    flutter_base = math.sin(raw_t * math.pi)
    flutter = math.sin((raw_t * math.pi * 2 * wave) + phase) * wobble * flutter_base

    x += nx * flutter
    y += ny * flutter

    if selected.get("kind") == "snitch":
        x = _clamp(x, 7, 93)
        y = _clamp(y, 12, 86)
    else:
        x = _clamp(x, 14, 86)
        y = _clamp(y, 18, 82)

    return {
        "x": round(x, 4),
        "y": round(y, 4),
        "segment_id": selected.get("id"),
        "speed_label": selected.get("speed_label"),
    }


def _elapsed_seconds(state, client_elapsed_ms=None):
    started_at = _safe_float(state.get("started_at"), _now())
    server_elapsed = max(0, _now() - started_at)

    if client_elapsed_ms is None:
        return server_elapsed

    try:
        client_elapsed = max(0, int(client_elapsed_ms) / 1000)
    except Exception:
        return server_elapsed

    # Si el cliente está razonablemente sincronizado, lo usamos por precisión.
    if abs(client_elapsed - server_elapsed) <= 1.8:
        return client_elapsed

    return server_elapsed


def _judge_distance(distance_units):
    if distance_units <= 3.8:
        return {
            "grade": "legendary",
            "label": random.choice(LEGENDARY_LINES),
            "points_preview": POINTS_LEGENDARY,
            "caught": True,
            "precision": 100,
        }

    if distance_units <= 6.0:
        precision = int(max(92, 100 - distance_units * 1.1))
        return {
            "grade": "perfect",
            "label": random.choice(PERFECT_LINES),
            "points_preview": POINTS_PERFECT,
            "caught": True,
            "precision": precision,
        }

    if distance_units <= 9.8:
        precision = int(max(74, 95 - distance_units * 2.2))
        return {
            "grade": "great",
            "label": random.choice(GREAT_LINES),
            "points_preview": POINTS_GREAT,
            "caught": True,
            "precision": precision,
        }

    if distance_units <= 14.8:
        precision = int(max(48, 84 - distance_units * 2.4))
        return {
            "grade": "close",
            "label": random.choice(CLOSE_LINES),
            "points_preview": POINTS_CLOSE,
            "caught": True,
            "precision": precision,
        }

    precision = int(max(0, 60 - distance_units * 2.2))

    return {
        "grade": "miss",
        "label": random.choice(MISS_LINES),
        "points_preview": POINTS_MISS,
        "caught": False,
        "precision": precision,
    }


def build_state(room_code=None, previous_state=None):
    previous_state = previous_state or {}
    rng = random.Random()

    snitch_motion = _build_motion_segments(rng, ROUND_DURATION_SECONDS, "snitch")
    zone_motion = _build_motion_segments(rng, ROUND_DURATION_SECONDS, "zone")

    return {
        "phase": "atrapa_snitch",
        "game_id": GAME_ID,
        "round_id": str(uuid.uuid4()),
        "title": "Atrapa la Snitch",
        "subtitle": "La Snitch cambia de dirección y velocidad. El aro también se mueve. No pestañees.",
        "question": "Presiona ¡ATRAPAR! justo cuando la Snitch entre al aro encantado.",
        "narrator": random.choice(NARRATOR_LINES),
        "started_at": _now(),
        "duration_seconds": ROUND_DURATION_SECONDS,
        "attempts_total": ATTEMPTS_TOTAL,
        "arena": {
            "width": ARENA_WIDTH,
            "height": ARENA_HEIGHT,
            "snitch_radius": SNITCH_RADIUS,
            "zone_radius": ZONE_RADIUS,
        },
        "snitch_motion": snitch_motion,
        "zone_motion": zone_motion,
        "fake_objects": _build_fake_objects(rng, ROUND_DURATION_SECONDS),
        "attempts_by_player": {},
        "snitch_submitted_players": [],
        "snitch_feed": [],
        "snitch_result": None,
        "point_events": [],
        "scored": False,
        "host": previous_state.get("host"),
        "difficulty": {
            "name": "Party Game Caótico",
            "description": "Snitch rápida, aro móvil, cambios repentinos y señuelos visuales.",
        },
        "points": {
            "legendary": POINTS_LEGENDARY,
            "perfect": POINTS_PERFECT,
            "great": POINTS_GREAT,
            "close": POINTS_CLOSE,
            "miss": POINTS_MISS,
            "best_seeker_bonus": BONUS_BEST_SEEKER,
        },
    }


def submit_catch(state, player_name, client_elapsed_ms=None):
    state = deepcopy(state or {})
    player_name = str(player_name or "").strip()

    if not player_name:
        return {
            "state": state,
            "accepted": False,
            "message": "No se detectó jugador.",
            "points_preview": 0,
            "attempts_used": 0,
            "attempts_total": ATTEMPTS_TOTAL,
            "grade": "miss",
            "caught": False,
            "precision": 0,
            "delta_ms": 0,
        }

    if state.get("phase") != "atrapa_snitch":
        return {
            "state": state,
            "accepted": False,
            "message": "La Snitch no está en juego.",
            "points_preview": 0,
            "attempts_used": 0,
            "attempts_total": state.get("attempts_total", ATTEMPTS_TOTAL),
            "grade": "miss",
            "caught": False,
            "precision": 0,
            "delta_ms": 0,
        }

    attempts_total = _safe_int(state.get("attempts_total"), ATTEMPTS_TOTAL)
    attempts_by_player = state.get("attempts_by_player", {})

    if not isinstance(attempts_by_player, dict):
        attempts_by_player = {}

    player_attempts = attempts_by_player.get(player_name, [])

    if not isinstance(player_attempts, list):
        player_attempts = []

    if len(player_attempts) >= attempts_total:
        return {
            "state": state,
            "accepted": False,
            "message": f"Ya usaste tus {attempts_total} intentos.",
            "points_preview": 0,
            "attempts_used": len(player_attempts),
            "attempts_total": attempts_total,
            "grade": "done",
            "caught": False,
            "precision": 0,
            "delta_ms": 0,
        }

    elapsed = _elapsed_seconds(state, client_elapsed_ms)
    
    # Compensación de latencia humana/red/render (aprox 80ms)
    elapsed = max(0, elapsed - 0.08)
    
    duration = _safe_float(state.get("duration_seconds"), ROUND_DURATION_SECONDS)

    if elapsed > duration + 1.5:
        return {
            "state": state,
            "accepted": False,
            "message": "La ronda ya terminó.",
            "points_preview": 0,
            "attempts_used": len(player_attempts),
            "attempts_total": attempts_total,
            "grade": "late",
            "caught": False,
            "precision": 0,
            "delta_ms": 0,
        }

    snitch_pos = _position_at(state.get("snitch_motion", []), elapsed)
    zone_pos = _position_at(state.get("zone_motion", []), elapsed)

    distance_units = _distance(snitch_pos, zone_pos)
    grade = _judge_distance(distance_units)

    attempt = {
        "id": str(uuid.uuid4()),
        "attempt_number": len(player_attempts) + 1,
        "player_name": player_name,
        "elapsed_seconds": round(elapsed, 3),
        "distance_units": round(distance_units, 3),
        "grade": grade["grade"],
        "label": grade["label"],
        "points_preview": grade["points_preview"],
        "caught": grade["caught"],
        "precision": grade["precision"],
        "snitch_position": snitch_pos,
        "zone_position": zone_pos,
        "server_time": _now(),
    }

    player_attempts.append(attempt)
    attempts_by_player[player_name] = player_attempts
    state["attempts_by_player"] = attempts_by_player

    state["snitch_submitted_players"] = [
        name
        for name, attempts in attempts_by_player.items()
        if isinstance(attempts, list) and len(attempts) >= attempts_total
    ]

    feed = state.get("snitch_feed", [])

    if not isinstance(feed, list):
        feed = []

    if grade["grade"] == "legendary":
        emoji = "🏆"
    elif grade["grade"] == "perfect":
        emoji = "⚡"
    elif grade["grade"] == "great":
        emoji = "✨"
    elif grade["grade"] == "close":
        emoji = "😮"
    else:
        emoji = "💨"

    feed.append({
        "id": attempt["id"],
        "player_name": player_name,
        "grade": grade["grade"],
        "label": grade["label"],
        "points_preview": grade["points_preview"],
        "precision": grade["precision"],
        "distance_units": round(distance_units, 2),
        "emoji": emoji,
        "elapsed_seconds": round(elapsed, 2),
    })

    state["snitch_feed"] = feed[-8:]

    return {
        "state": state,
        "accepted": True,
        "message": grade["label"],
        "attempts_used": len(player_attempts),
        "attempts_total": attempts_total,
        "points_preview": grade["points_preview"],
        "grade": grade["grade"],
        "label": grade["label"],
        "delta_ms": int(distance_units * 100),
        "caught": grade["caught"],
        "precision": grade["precision"],
    }


def _best_attempt(attempts):
    if not attempts:
        return None

    return max(
        attempts,
        key=lambda attempt: (
            int(attempt.get("points_preview", 0)),
            int(attempt.get("precision", 0)),
            -float(attempt.get("distance_units", 999)),
        )
    )


def _add_event(events, player_name, house, points, label):
    events.append({
        "player_name": player_name,
        "house": house,
        "points": points,
        "label": label,
    })


def resolve_for_reveal(state, players=None):
    state = deepcopy(state or {})
    players = players or []

    if state.get("scored"):
        return state, state.get("point_events", []), True

    attempts_by_player = state.get("attempts_by_player", {})

    if not isinstance(attempts_by_player, dict):
        attempts_by_player = {}

    events = []
    player_results = []
    best_overall = None

    for player in players:
        name = player.get("name")
        house = player.get("house")
        attempts = attempts_by_player.get(name, [])

        if not isinstance(attempts, list):
            attempts = []

        best = _best_attempt(attempts)
        total_points = int(best.get("points_preview", 0)) if best else 0

        if best:
            _add_event(
                events,
                name,
                house,
                total_points,
                f"Mejor intento: {best.get('label')} · {best.get('precision', 0)}% precisión"
            )

            if best_overall is None:
                best_overall = {
                    "player_name": name,
                    "house": house,
                    "attempt": best,
                }
            else:
                current_key = (
                    int(best.get("points_preview", 0)),
                    int(best.get("precision", 0)),
                    -float(best.get("distance_units", 999)),
                )
                previous = best_overall["attempt"]
                previous_key = (
                    int(previous.get("points_preview", 0)),
                    int(previous.get("precision", 0)),
                    -float(previous.get("distance_units", 999)),
                )

                if current_key > previous_key:
                    best_overall = {
                        "player_name": name,
                        "house": house,
                        "attempt": best,
                    }

        player_results.append({
            "player_name": name,
            "house": house,
            "attempts": attempts,
            "best_attempt": best,
            "total_points": total_points,
            "attempts_used": len(attempts),
        })

    if best_overall:
        _add_event(
            events,
            best_overall["player_name"],
            best_overall["house"],
            BONUS_BEST_SEEKER,
            f"Bonus: Mejor buscador de la ronda"
        )

        for result in player_results:
            if result["player_name"] == best_overall["player_name"]:
                result["best_seeker_bonus"] = BONUS_BEST_SEEKER
                result["total_points"] += BONUS_BEST_SEEKER
            else:
                result["best_seeker_bonus"] = 0
    else:
        for result in player_results:
            result["best_seeker_bonus"] = 0

    player_results.sort(
        key=lambda item: (
            int(item.get("total_points", 0)),
            int((item.get("best_attempt") or {}).get("precision", 0)),
            -float((item.get("best_attempt") or {}).get("distance_units", 999)),
        ),
        reverse=True,
    )

    state["phase"] = "results_atrapa_snitch"
    state["correct"] = "La Snitch fue perseguida con distintos niveles de dignidad."
    state["snitch_result"] = {
        "summary": "Ronda caótica: velocidad, cambios de dirección, aro móvil y varios toques al vacío.",
        "narrator": random.choice([
            "La Snitch sobrevivió, pero algunas reputaciones no.",
            "Hubo magia, reflejos y varios dedos llegando tarde.",
            "La Snitch fue perseguida con pasión y con poquito control emocional.",
            "Algunos vieron el futuro. Otros vieron puro aire.",
        ]),
        "player_results": player_results,
        "best_overall": best_overall,
        "snitch_feed": state.get("snitch_feed", []),
    }
    state["point_events"] = events
    state["scored"] = True

    return state, events, True