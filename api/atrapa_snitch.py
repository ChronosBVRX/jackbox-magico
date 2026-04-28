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
    "La Snitch va más rápido que chisme en grupo de WhatsApp.",
    "Respiren, miren la zona iluminada y no se dejen engañar por cualquier cosa brillante.",
]

FALSE_OBJECTS = [
    {"type": "dementor", "label": "Sombra tipo dementor", "emoji": "🌫️"},
    {"type": "bludger", "label": "Bludger falsa", "emoji": "⚫"},
    {"type": "coin", "label": "Moneda brillante sospechosa", "emoji": "🪙"},
    {"type": "bat", "label": "Murciélago dramático", "emoji": "🦇"},
    {"type": "spark", "label": "Destello tramposo", "emoji": "✨"},
    {"type": "ghost", "label": "Fantasma metiche", "emoji": "👻"},
]

POINTS_PERFECT = 120
POINTS_CLOSE = 70
POINTS_MISS = -30
POINTS_BEST_REFLEX = 50
POINTS_BEST_HOUSE_AVG = 100

ATTEMPTS_TOTAL = 5
ROUND_DURATION_SECONDS = 26


def _now():
    return time.time()


def _build_capture_windows():
    base_times = [3.1, 7.2, 11.4, 15.7, 20.1]
    lanes = ["top", "middle", "bottom", "middle", "top"]
    directions = ["left_to_right", "right_to_left", "left_to_right", "right_to_left", "left_to_right"]

    windows = []

    for index, base in enumerate(base_times):
        center = round(base + random.uniform(-0.28, 0.28), 3)

        windows.append({
            "id": f"snitch-{index + 1}",
            "attempt_number": index + 1,
            "center_time": center,
            "lane": lanes[index],
            "direction": directions[index],
            "speed_label": random.choice(["rápida", "errante", "tramposa", "nerviosa", "salvajemente dorada"]),
            "perfect_window_ms": max(120, 260 - (index * 30)),
            "close_window_ms": max(390, 760 - (index * 70)),
            "zone_shift": random.choice([-70, -48, -24, 0, 24, 48, 70]),
            "curve_strength": random.choice([18, 26, 34, 42]),
            "burst": random.choice([0.85, 1.0, 1.15, 1.28]),
        })

    return windows


def _build_false_objects(capture_windows):
    false_objects = []
    possible_offsets = [-0.9, -0.62, 0.45, 0.72]

    for index, window in enumerate(capture_windows):
        bait = random.choice(FALSE_OBJECTS)
        offset = random.choice(possible_offsets)
        false_time = max(1.6, round(float(window["center_time"]) + offset, 3))

        false_objects.append({
            **bait,
            "id": f"fake-{index + 1}",
            "time": false_time,
            "lane": random.choice(["top", "middle", "bottom"]),
            "bait_window_ms": random.choice([250, 290, 330]),
            "direction": random.choice(["left_to_right", "right_to_left"]),
        })

    while len(false_objects) < 7:
        bait = random.choice(FALSE_OBJECTS)

        false_objects.append({
            **bait,
            "id": f"fake-extra-{len(false_objects) + 1}",
            "time": round(random.uniform(2.4, 23.0), 3),
            "lane": random.choice(["top", "middle", "bottom"]),
            "bait_window_ms": random.choice([240, 280, 320]),
            "direction": random.choice(["left_to_right", "right_to_left"]),
        })

    return false_objects


def build_state(room_code=None, previous_state=None):
    previous_state = previous_state or {}
    capture_windows = _build_capture_windows()

    return {
        "phase": "atrapa_snitch",
        "game_id": "atrapa_snitch",
        "round_id": str(uuid.uuid4()),
        "title": "Atrapa la Snitch",
        "subtitle": "Cinco intentos. La zona se mueve, la Snitch acelera y hay señuelos.",
        "question": "Presiona ¡ATRAPAR! justo cuando la Snitch cruce la zona iluminada.",
        "narrator": random.choice(NARRATOR_LINES),
        "started_at": _now(),
        "duration_seconds": ROUND_DURATION_SECONDS,
        "attempts_total": ATTEMPTS_TOTAL,
        "capture_windows": capture_windows,
        "capture_times": [window["center_time"] for window in capture_windows],
        "false_objects": _build_false_objects(capture_windows),
        "options": ["¡ATRAPAR!"],
        "attempts_by_player": {},
        "snitch_submitted_players": [],
        "snitch_result": None,
        "point_events": [],
        "scored": False,
        "host": previous_state.get("host"),
        "difficulty": {
            "name": "Nocturna errante",
            "description": "La zona cambia de posición, la Snitch cambia carril y aparecen señuelos.",
        },
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


def _nearest_unused_window(state, elapsed, used_indexes):
    windows = state.get("capture_windows", [])

    available = []

    for index, window in enumerate(windows):
        if index not in used_indexes:
            center_time = float(window.get("center_time", 999))
            available.append((index, window, abs(elapsed - center_time)))

    if not available:
        return None, None, None

    available.sort(key=lambda item: item[2])

    index, window, delta_seconds = available[0]

    return index, window, delta_seconds


def _near_false_object(state, elapsed):
    false_objects = state.get("false_objects", [])

    if not false_objects:
        return None

    nearest = sorted(
        false_objects,
        key=lambda item: abs(float(item.get("time", 999)) - elapsed)
    )[0]

    delta_ms = abs(float(nearest.get("time", 999)) - elapsed) * 1000
    bait_window = int(nearest.get("bait_window_ms", 290))

    if delta_ms <= bait_window:
        return nearest

    return None


def _grade_attempt(delta_ms, window, false_object=None):
    if false_object:
        return {
            "grade": "false",
            "label": f"Señuelo: {false_object.get('label', 'sombra sospechosa')}",
            "points_preview": POINTS_MISS,
            "caught": False,
            "precision": 0,
        }

    perfect_window = int(window.get("perfect_window_ms", 220)) if window else 220
    close_window = int(window.get("close_window_ms", 700)) if window else 700

    if delta_ms <= perfect_window:
        precision = max(88, int(100 - (delta_ms / max(1, perfect_window)) * 10))

        return {
            "grade": "perfect",
            "label": f"Captura perfecta ({delta_ms} ms)",
            "points_preview": POINTS_PERFECT,
            "caught": True,
            "precision": precision,
        }

    if delta_ms <= close_window:
        precision = max(46, int(82 - (delta_ms / max(1, close_window)) * 34))

        return {
            "grade": "close",
            "label": f"Casi la atrapa ({delta_ms} ms)",
            "points_preview": POINTS_CLOSE,
            "caught": True,
            "precision": precision,
        }

    return {
        "grade": "miss",
        "label": f"Fuera de tiempo ({delta_ms} ms)",
        "points_preview": POINTS_MISS,
        "caught": False,
        "precision": 0,
    }


def submit_catch(state, player_name, client_elapsed_ms=None):
    state = state or {}

    if state.get("phase") != "atrapa_snitch":
        return {
            "state": state,
            "accepted": False,
            "message": "La Snitch no está en juego.",
            "points_preview": 0,
        }

    attempts_by_player = state.get("attempts_by_player", {})
    player_attempts = attempts_by_player.get(player_name, [])

    attempts_total = int(state.get("attempts_total", ATTEMPTS_TOTAL))

    if len(player_attempts) >= attempts_total:
        return {
            "state": state,
            "accepted": False,
            "message": "Ya usaste tus 5 intentos.",
            "attempts_used": len(player_attempts),
            "attempts_total": attempts_total,
            "points_preview": 0,
            "grade": "done",
        }

    elapsed = _elapsed_seconds(state, client_elapsed_ms)
    duration = float(state.get("duration_seconds", ROUND_DURATION_SECONDS))

    if elapsed > duration + 1.5:
        return {
            "state": state,
            "accepted": False,
            "message": "La ronda ya terminó.",
            "attempts_used": len(player_attempts),
            "attempts_total": attempts_total,
            "points_preview": 0,
            "grade": "late",
        }

    used_indexes = [
        attempt.get("capture_index")
        for attempt in player_attempts
        if attempt.get("capture_index") is not None
    ]

    capture_index, capture_window, delta_seconds = _nearest_unused_window(
        state=state,
        elapsed=elapsed,
        used_indexes=used_indexes,
    )

    false_object = _near_false_object(state, elapsed)

    if capture_window is None:
        delta_ms = 9999
        capture_time = None
    else:
        capture_time = float(capture_window.get("center_time", 0))
        delta_ms = int(round(delta_seconds * 1000))

    grade = _grade_attempt(delta_ms, capture_window, false_object=false_object)

    attempt = {
        "attempt_number": len(player_attempts) + 1,
        "elapsed_seconds": round(elapsed, 3),
        "capture_index": capture_index,
        "capture_window": capture_window,
        "capture_time": capture_time,
        "delta_ms": delta_ms,
        "grade": grade["grade"],
        "label": grade["label"],
        "points_preview": grade["points_preview"],
        "caught": grade["caught"],
        "precision": grade["precision"],
        "false_object": false_object,
    }

    player_attempts.append(attempt)
    attempts_by_player[player_name] = player_attempts

    state["attempts_by_player"] = attempts_by_player
    state["snitch_submitted_players"] = [
        name
        for name, attempts in attempts_by_player.items()
        if len(attempts) >= attempts_total
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
        "attempts_total": attempts_total,
        "points_preview": grade["points_preview"],
        "grade": grade["grade"],
        "label": grade["label"],
        "delta_ms": delta_ms,
        "caught": grade["caught"],
        "precision": grade["precision"],
    }


def _add_event(events, player_name, house, points, label):
    events.append({
        "player_name": player_name,
        "house": house,
        "points": points,
        "label": label,
    })


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
    attempts_total = int(state.get("attempts_total", ATTEMPTS_TOTAL))

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
        false_count = 0

        for attempt in attempts:
            points = int(attempt.get("points_preview", 0))
            total_points += points

            label = f"Intento {attempt.get('attempt_number')}: {attempt.get('label')}"
            _add_event(events, name, house, points, label)

            grade = attempt.get("grade")

            if grade == "perfect":
                perfect_count += 1
            elif grade == "close":
                close_count += 1
            elif grade == "false":
                false_count += 1
                miss_count += 1
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
                        "grade": grade,
                        "precision": attempt.get("precision", 0),
                    }

        remaining = attempts_total - len(attempts)

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
            "false_count": false_count,
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
            "La Snitch sobrevivió, pero varias dignidades no.",
        ]),
        "player_results": player_results,
        "best_reflex": best_reflex,
        "best_house_average": best_house_average,
        "house_averages": house_averages,
        "capture_windows": state.get("capture_windows", []),
    }
    state["point_events"] = events
    state["scored"] = True

    return state, events, True