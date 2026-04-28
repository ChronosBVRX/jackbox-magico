import random
import time
import uuid


NARRATOR_LINES = [
    "¡La Snitch está en juego!",
    "Ese toque fue tan lento que hasta un fantasma llegó primero.",
    "¡La atrapó!",
    "Atentos, jóvenes magos: no todo lo dorado se toca a lo loco.",
    "Si ven una sombra rara, no es la Snitch; es su ansiedad competitiva.",
    "La Snitch no espera a nadie, mucho menos a quien anda viendo memes.",
    "Ese reflejo estuvo más filoso que comentario de profesor amargado.",
    "Hoy aprenderemos que presionar tarde también es una forma de humillación.",
]

FALSE_OBJECTS = [
    {"type": "dementor", "label": "Sombra tipo dementor", "emoji": "🌫️"},
    {"type": "bludger", "label": "Bludger falsa", "emoji": "⚫"},
    {"type": "coin", "label": "Moneda brillante sospechosa", "emoji": "🪙"},
    {"type": "bat", "label": "Murciélago dramático", "emoji": "🦇"},
]

POINTS_PERFECT = 120
POINTS_CLOSE = 70
POINTS_MISS = -30
POINTS_BEST_REFLEX = 50
POINTS_BEST_HOUSE_AVG = 100

ATTEMPTS_TOTAL = 5
PERFECT_WINDOW_MS = 240
CLOSE_WINDOW_MS = 720
ROUND_DURATION_SECONDS = 23


def _now():
    return time.time()


def _build_capture_times():
    base_times = [2.0, 6.0, 10.0, 14.0, 18.0]
    return [
        round(base + random.uniform(-0.25, 0.25), 3)
        for base in base_times
    ]


def _build_false_objects(capture_times):
    possible_times = [3.8, 7.9, 12.2, 16.3, 20.1]
    random.shuffle(possible_times)

    false_objects = []

    for index, moment in enumerate(possible_times[:3]):
        item = random.choice(FALSE_OBJECTS)
        false_objects.append({
            **item,
            "time": round(moment + random.uniform(-0.3, 0.3), 3),
            "lane": random.choice(["top", "middle", "bottom"]),
            "id": f"false-{index + 1}",
        })

    return false_objects


def build_state(room_code=None, previous_state=None):
    previous_state = previous_state or {}
    capture_times = _build_capture_times()

    return {
        "phase": "atrapa_snitch",
        "game_id": "atrapa_snitch",
        "round_id": str(uuid.uuid4()),
        "title": "Atrapa la Snitch",
        "subtitle": "Cinco intentos. Toca cuando la Snitch cruce la zona iluminada.",
        "question": "Presiona ¡ATRAPAR! justo cuando la Snitch cruce la zona de captura.",
        "narrator": random.choice(NARRATOR_LINES),
        "started_at": _now(),
        "duration_seconds": ROUND_DURATION_SECONDS,
        "attempts_total": ATTEMPTS_TOTAL,
        "capture_times": capture_times,
        "false_objects": _build_false_objects(capture_times),
        "perfect_window_ms": PERFECT_WINDOW_MS,
        "close_window_ms": CLOSE_WINDOW_MS,
        "options": ["¡ATRAPAR!"],
        "attempts_by_player": {},
        "snitch_submitted_players": [],
        "snitch_result": None,
        "point_events": [],
        "scored": False,
        "host": previous_state.get("host"),
        "points": {
            "perfect": POINTS_PERFECT,
            "close": POINTS_CLOSE,
            "miss": POINTS_MISS,
            "best_reflex": POINTS_BEST_REFLEX,
            "best_house_average": POINTS_BEST_HOUSE_AVG,
        },
    }


def _elapsed_seconds(state, client_elapsed_ms=None):
    if client_elapsed_ms is not None:
        try:
            return max(0, int(client_elapsed_ms) / 1000)
        except Exception:
            pass

    started_at = float(state.get("started_at", _now()))
    return max(0, _now() - started_at)


def _nearest_capture(state, elapsed, used_indexes):
    capture_times = state.get("capture_times", [])

    available = [
        (index, capture_time, abs(elapsed - capture_time))
        for index, capture_time in enumerate(capture_times)
        if index not in used_indexes
    ]

    if not available:
        return None, None, None

    available.sort(key=lambda item: item[2])
    index, capture_time, delta_seconds = available[0]

    return index, capture_time, delta_seconds


def _near_false_object(state, elapsed):
    false_objects = state.get("false_objects", [])

    if not false_objects:
        return None

    nearest = sorted(
        false_objects,
        key=lambda item: abs(float(item.get("time", 999)) - elapsed)
    )[0]

    delta_ms = abs(float(nearest.get("time", 999)) - elapsed) * 1000

    if delta_ms <= 320:
        return nearest

    return None


def _grade_attempt(delta_ms, false_object=None):
    if false_object:
        return {
            "grade": "false",
            "label": f"Objeto falso: {false_object.get('label', 'sombra sospechosa')}",
            "points_preview": POINTS_MISS,
            "caught": False,
        }

    if delta_ms <= PERFECT_WINDOW_MS:
        return {
            "grade": "perfect",
            "label": "Captura perfecta",
            "points_preview": POINTS_PERFECT,
            "caught": True,
        }

    if delta_ms <= CLOSE_WINDOW_MS:
        return {
            "grade": "close",
            "label": "Casi la atrapa",
            "points_preview": POINTS_CLOSE,
            "caught": True,
        }

    return {
        "grade": "miss",
        "label": "Fuera de tiempo",
        "points_preview": POINTS_MISS,
        "caught": False,
    }


def submit_catch(state, player_name, client_elapsed_ms=None):
    state = state or {}

    if state.get("phase") != "atrapa_snitch":
        return {
            "state": state,
            "accepted": False,
            "message": "La Snitch no está en juego.",
        }

    attempts_by_player = state.get("attempts_by_player", {})
    player_attempts = attempts_by_player.get(player_name, [])

    if len(player_attempts) >= int(state.get("attempts_total", ATTEMPTS_TOTAL)):
        return {
            "state": state,
            "accepted": False,
            "message": "Ya usaste tus 5 intentos.",
            "attempts_used": len(player_attempts),
            "points_preview": 0,
            "grade": "done",
        }

    elapsed = _elapsed_seconds(state, client_elapsed_ms)
    used_indexes = [
        attempt.get("capture_index")
        for attempt in player_attempts
        if attempt.get("capture_index") is not None
    ]

    capture_index, capture_time, delta_seconds = _nearest_capture(
        state=state,
        elapsed=elapsed,
        used_indexes=used_indexes,
    )

    false_object = _near_false_object(state, elapsed)

    if capture_index is None:
        delta_ms = 9999
    else:
        delta_ms = int(round(delta_seconds * 1000))

    grade = _grade_attempt(delta_ms, false_object=false_object)

    attempt = {
        "attempt_number": len(player_attempts) + 1,
        "elapsed_seconds": round(elapsed, 3),
        "capture_index": capture_index,
        "capture_time": capture_time,
        "delta_ms": delta_ms,
        "grade": grade["grade"],
        "label": grade["label"],
        "points_preview": grade["points_preview"],
        "caught": grade["caught"],
        "false_object": false_object,
    }

    player_attempts.append(attempt)
    attempts_by_player[player_name] = player_attempts

    state["attempts_by_player"] = attempts_by_player
    state["snitch_submitted_players"] = [
        name
        for name, attempts in attempts_by_player.items()
        if len(attempts) >= int(state.get("attempts_total", ATTEMPTS_TOTAL))
    ]

    if grade["grade"] == "perfect":
        message = "¡La atrapó! Captura perfecta."
    elif grade["grade"] == "close":
        message = "Casi perfecta. La Snitch sintió el aire."
    elif grade["grade"] == "false":
        message = "Eso no era la Snitch. Era una distracción muy dramática."
    else:
        message = "Ese toque fue tan lento que hasta un fantasma llegó primero."

    return {
        "state": state,
        "accepted": True,
        "message": message,
        "attempts_used": len(player_attempts),
        "attempts_total": int(state.get("attempts_total", ATTEMPTS_TOTAL)),
        "points_preview": grade["points_preview"],
        "grade": grade["grade"],
        "label": grade["label"],
        "delta_ms": delta_ms,
        "caught": grade["caught"],
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
    players = players or []

    if state.get("scored"):
        return state, state.get("point_events", []), True

    attempts_by_player = state.get("attempts_by_player", {})
    events = []
    player_results = []

    best_reflex = None
    house_positive_deltas = {}

    for player in players:
        name = player.get("name")
        house = player.get("house")
        attempts = attempts_by_player.get(name, [])

        total_points = 0
        best_delta = None
        perfect_count = 0
        close_count = 0
        miss_count = 0

        for attempt in attempts:
            points = int(attempt.get("points_preview", 0))
            total_points += points

            label = f"Intento {attempt.get('attempt_number')}: {attempt.get('label')}"
            _add_event(events, name, house, points, label)

            if attempt.get("grade") == "perfect":
                perfect_count += 1
            elif attempt.get("grade") == "close":
                close_count += 1
            else:
                miss_count += 1

            if attempt.get("caught"):
                delta = int(attempt.get("delta_ms", 9999))

                if best_delta is None or delta < best_delta:
                    best_delta = delta

                house_positive_deltas.setdefault(house, []).append(delta)

                if best_reflex is None or delta < best_reflex.get("delta_ms", 9999):
                    best_reflex = {
                        "player_name": name,
                        "house": house,
                        "delta_ms": delta,
                        "grade": attempt.get("grade"),
                    }

        remaining = int(state.get("attempts_total", ATTEMPTS_TOTAL)) - len(attempts)

        for index in range(max(0, remaining)):
            _add_event(events, name, house, POINTS_MISS, f"Intento no usado {index + 1}")
            total_points += POINTS_MISS
            miss_count += 1

        player_results.append({
            "player_name": name,
            "house": house,
            "attempts": attempts,
            "total_points": total_points,
            "best_delta_ms": best_delta,
            "perfect_count": perfect_count,
            "close_count": close_count,
            "miss_count": miss_count,
        })

    best_house_average = None
    house_averages = {}

    for house, deltas in house_positive_deltas.items():
        if deltas:
            avg = sum(deltas) / len(deltas)
            house_averages[house] = round(avg, 2)

            if best_house_average is None or avg < best_house_average.get("average_delta_ms", 9999):
                best_house_average = {
                    "house": house,
                    "average_delta_ms": round(avg, 2),
                }

    if best_reflex:
        _add_event(
            events,
            best_reflex["player_name"],
            best_reflex["house"],
            POINTS_BEST_REFLEX,
            f"Mejor reflejo de la ronda ({best_reflex['delta_ms']} ms)",
        )

    if best_house_average:
        receiver = _first_player_in_house(players, best_house_average["house"])

        if receiver:
            _add_event(
                events,
                receiver,
                best_house_average["house"],
                POINTS_BEST_HOUSE_AVG,
                f"Casa con mejor promedio ({best_house_average['average_delta_ms']} ms)",
            )

    state["phase"] = "results_atrapa_snitch"
    state["correct"] = "La Snitch fue capturada"
    state["snitch_result"] = {
        "summary": "La ronda terminó. Algunos atraparon oro; otros atraparon puro aire.",
        "narrator": random.choice([
            "¡La atrapó! Bueno… algunos. Otros saludaron a la Snitch cuando ya iba en otro código postal.",
            "Ese reflejo estuvo digno de Quidditch. Lo demás fue teatro experimental.",
            "La Snitch está impresionada. No por todos, pero algo es algo.",
            "Hubo magia, velocidad y varios toques con retraso emocional.",
        ]),
        "player_results": player_results,
        "best_reflex": best_reflex,
        "best_house_average": best_house_average,
        "house_averages": house_averages,
        "capture_times": state.get("capture_times", []),
    }
    state["point_events"] = events
    state["scored"] = True

    return state, events, True