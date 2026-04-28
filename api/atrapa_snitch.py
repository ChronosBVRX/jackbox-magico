import math
import random
from copy import deepcopy
from datetime import datetime, timedelta, timezone


GAME_ID = "atrapa_snitch"

ARENA_WIDTH = 1280
ARENA_HEIGHT = 720

VISIBLE_MARGIN_X = 120
VISIBLE_MARGIN_Y = 85

ZONE_RADIUS = 92
SNITCH_RADIUS = 24

ATTEMPTS_TOTAL = 5
ROUND_DURATION_SECONDS = 18
INTRO_DELAY_MS = 1100

GRADE_TABLE = [
    ("perfect", "¡PERFECTO!", 320, 24),
    ("great", "¡CASI MÁGICO!", 220, 52),
    ("good", "¡BUENA!", 140, 82),
    ("close", "¡POR POCO!", 70, 112),
]


def utc_now():
    return datetime.now(timezone.utc)


def isoformat_z(dt: datetime):
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_iso(dt_str: str):
    if not dt_str:
        return utc_now()

    normalized = dt_str.replace("Z", "+00:00")
    return datetime.fromisoformat(normalized)


def clamp(value, min_value, max_value):
    return max(min_value, min(max_value, value))


def lerp(a, b, t):
    return a + (b - a) * t


def ease_value(name: str, t: float):
    t = clamp(t, 0.0, 1.0)

    if name == "easeOutQuad":
        return 1 - (1 - t) * (1 - t)

    if name == "easeInOutQuad":
        return 2 * t * t if t < 0.5 else 1 - pow(-2 * t + 2, 2) / 2

    if name == "easeOutCubic":
        return 1 - pow(1 - t, 3)

    if name == "easeInOutCubic":
        return 4 * t * t * t if t < 0.5 else 1 - pow(-2 * t + 2, 3) / 2

    # default
    return -(math.cos(math.pi * t) - 1) / 2


def random_point(rng: random.Random, x_min, x_max, y_min, y_max, center_bias=0.5):
    if rng.random() < center_bias:
        center_x = (x_min + x_max) / 2
        center_y = (y_min + y_max) / 2
        x = rng.triangular(x_min, x_max, center_x)
        y = rng.triangular(y_min, y_max, center_y)
    else:
        x = rng.uniform(x_min, x_max)
        y = rng.uniform(y_min, y_max)

    return x, y


def distance(x1, y1, x2, y2):
    return math.hypot(x2 - x1, y2 - y1)


def pick_next_point(rng, current_x, current_y, kind="snitch"):
    if kind == "snitch":
        x_min = VISIBLE_MARGIN_X
        x_max = ARENA_WIDTH - VISIBLE_MARGIN_X
        y_min = VISIBLE_MARGIN_Y
        y_max = ARENA_HEIGHT - VISIBLE_MARGIN_Y
        min_distance = 180
        center_bias = 0.65
    else:
        x_min = VISIBLE_MARGIN_X + 80
        x_max = ARENA_WIDTH - VISIBLE_MARGIN_X - 80
        y_min = VISIBLE_MARGIN_Y + 45
        y_max = ARENA_HEIGHT - VISIBLE_MARGIN_Y - 45
        min_distance = 140
        center_bias = 0.75

    for _ in range(30):
        x, y = random_point(rng, x_min, x_max, y_min, y_max, center_bias=center_bias)
        if distance(current_x, current_y, x, y) >= min_distance:
            return x, y

    return random_point(rng, x_min, x_max, y_min, y_max, center_bias=center_bias)


def generate_motion_segments(rng: random.Random, total_duration_ms: int, kind="snitch"):
    if kind == "snitch":
        start_x, start_y = random_point(
            rng,
            VISIBLE_MARGIN_X,
            ARENA_WIDTH - VISIBLE_MARGIN_X,
            VISIBLE_MARGIN_Y,
            ARENA_HEIGHT - VISIBLE_MARGIN_Y,
            center_bias=0.70,
        )
    else:
        start_x, start_y = random_point(
            rng,
            VISIBLE_MARGIN_X + 80,
            ARENA_WIDTH - VISIBLE_MARGIN_X - 80,
            VISIBLE_MARGIN_Y + 45,
            ARENA_HEIGHT - VISIBLE_MARGIN_Y - 45,
            center_bias=0.85,
        )

    segments = []
    current_x = start_x
    current_y = start_y
    current_time = 0

    while current_time < total_duration_ms:
        remaining = total_duration_ms - current_time

        if kind == "snitch":
            dash = rng.random() < 0.38

            if dash:
                duration = rng.randint(260, 430)
                flutter_amp = rng.uniform(10, 24)
                flutter_freq = rng.uniform(2.4, 4.4)
                easing = rng.choice(["easeOutQuad", "easeOutCubic", "easeInOutQuad"])
            else:
                duration = rng.randint(540, 980)
                flutter_amp = rng.uniform(18, 44)
                flutter_freq = rng.uniform(1.2, 2.5)
                easing = rng.choice(["easeInOutSine", "easeInOutQuad", "easeInOutCubic"])

            x1, y1 = pick_next_point(rng, current_x, current_y, kind="snitch")

        else:
            duration = rng.randint(900, 1700)
            flutter_amp = rng.uniform(8, 18)
            flutter_freq = rng.uniform(0.7, 1.2)
            easing = rng.choice(["easeInOutSine", "easeInOutQuad", "easeInOutCubic"])
            x1, y1 = pick_next_point(rng, current_x, current_y, kind="zone")

        duration = min(duration, remaining)
        t0 = current_time
        t1 = current_time + duration

        segments.append({
            "kind": kind,
            "t0": t0,
            "t1": t1,
            "x0": current_x,
            "y0": current_y,
            "x1": x1,
            "y1": y1,
            "easing": easing,
            "flutter_amp": flutter_amp,
            "flutter_freq": flutter_freq,
            "flutter_phase": rng.uniform(0, math.pi * 2),
        })

        current_x = x1
        current_y = y1
        current_time = t1

    return segments


def get_segment_for_time(segments, elapsed_ms):
    if not segments:
        return None

    if elapsed_ms <= 0:
        return segments[0]

    last_segment = segments[-1]

    if elapsed_ms >= last_segment["t1"]:
        return last_segment

    for segment in segments:
        if segment["t0"] <= elapsed_ms <= segment["t1"]:
            return segment

    return last_segment


def get_position_from_segments(segments, elapsed_ms):
    if not segments:
        return {"x": ARENA_WIDTH / 2, "y": ARENA_HEIGHT / 2}

    segment = get_segment_for_time(segments, elapsed_ms)
    duration = max(1, segment["t1"] - segment["t0"])
    raw_t = (elapsed_ms - segment["t0"]) / duration
    raw_t = clamp(raw_t, 0.0, 1.0)

    eased = ease_value(segment.get("easing", "easeInOutSine"), raw_t)

    x = lerp(segment["x0"], segment["x1"], eased)
    y = lerp(segment["y0"], segment["y1"], eased)

    dx = segment["x1"] - segment["x0"]
    dy = segment["y1"] - segment["y0"]
    length = max(1.0, math.hypot(dx, dy))

    normal_x = -dy / length
    normal_y = dx / length

    flutter_base = math.sin(raw_t * math.pi)
    flutter_wave = math.sin((raw_t * math.pi * 2 * segment.get("flutter_freq", 1.0)) + segment.get("flutter_phase", 0.0))
    flutter = flutter_base * flutter_wave * segment.get("flutter_amp", 0.0)

    if segment.get("kind") == "snitch":
        flutter += math.sin((raw_t * math.pi * 4) + segment.get("flutter_phase", 0.0) * 0.65) * segment.get("flutter_amp", 0.0) * 0.18 * flutter_base

    x += normal_x * flutter
    y += normal_y * flutter

    x = clamp(x, VISIBLE_MARGIN_X * 0.6, ARENA_WIDTH - VISIBLE_MARGIN_X * 0.6)
    y = clamp(y, VISIBLE_MARGIN_Y * 0.6, ARENA_HEIGHT - VISIBLE_MARGIN_Y * 0.6)

    return {
        "x": x,
        "y": y,
        "segment": segment,
        "segment_progress": raw_t,
    }


def compute_precision(distance_px):
    max_distance = 128
    if distance_px >= max_distance:
        return 0

    return int(round(100 * (1 - (distance_px / max_distance))))


def evaluate_catch(distance_px):
    for grade, label, points, threshold in GRADE_TABLE:
        if distance_px <= threshold:
            return {
                "grade": grade,
                "label": label,
                "points": points,
                "caught": True,
            }

    return {
        "grade": "miss",
        "label": "¡FALLASTE!",
        "points": 0,
        "caught": False,
    }


def get_elapsed_ms(state: dict, client_elapsed_ms=None):
    duration_ms = int(state.get("duration_seconds", ROUND_DURATION_SECONDS) * 1000)
    started_at = parse_iso(state.get("started_at"))

    if client_elapsed_ms is None:
        elapsed_ms = int((utc_now() - started_at).total_seconds() * 1000)
    else:
        elapsed_ms = int(client_elapsed_ms)

    return clamp(elapsed_ms, -INTRO_DELAY_MS, duration_ms + 2000)


def build_state(room_code: str, previous_state=None):
    previous_state = previous_state or {}
    previous_round = int(previous_state.get("round_id") or 0)

    rng = random.Random()
    duration_ms = ROUND_DURATION_SECONDS * 1000

    started_at = utc_now() + timedelta(milliseconds=INTRO_DELAY_MS)

    snitch_segments = generate_motion_segments(rng, duration_ms, kind="snitch")
    zone_segments = generate_motion_segments(rng, duration_ms, kind="zone")

    return {
        "game_id": GAME_ID,
        "phase": "atrapa_snitch",
        "room_code": room_code,
        "round_id": previous_round + 1,
        "duration_seconds": ROUND_DURATION_SECONDS,
        "intro_delay_ms": INTRO_DELAY_MS,
        "started_at": isoformat_z(started_at),
        "attempts_total": ATTEMPTS_TOTAL,
        "attempts_by_player": {},
        "snitch_submitted_players": [],
        "arena": {
            "width": ARENA_WIDTH,
            "height": ARENA_HEIGHT,
            "visible_margin_x": VISIBLE_MARGIN_X,
            "visible_margin_y": VISIBLE_MARGIN_Y,
            "zone_radius": ZONE_RADIUS,
            "snitch_radius": SNITCH_RADIUS,
        },
        "snitch_segments": snitch_segments,
        "zone_segments": zone_segments,
        "snitch_result": None,
        "point_events": [],
        "title": "Atrapa la Snitch Dorada",
        "subtitle": "Calcula el momento exacto y atrápala dentro del aro encantado.",
    }


def submit_catch(state: dict, player_name: str, client_elapsed_ms=None):
    state = deepcopy(state or {})

    if state.get("phase") != "atrapa_snitch":
        return {
            "state": state,
            "accepted": False,
            "message": "La Snitch no está en juego.",
            "points_preview": 0,
            "attempts_used": 0,
            "attempts_total": state.get("attempts_total", ATTEMPTS_TOTAL),
            "grade": "miss",
            "label": "No disponible",
            "caught": False,
            "precision": 0,
            "delta_ms": 0,
        }

    player_name = str(player_name or "").strip()

    if not player_name:
        return {
            "state": state,
            "accepted": False,
            "message": "Falta el nombre del jugador.",
            "points_preview": 0,
            "attempts_used": 0,
            "attempts_total": state.get("attempts_total", ATTEMPTS_TOTAL),
            "grade": "miss",
            "label": "Sin nombre",
            "caught": False,
            "precision": 0,
            "delta_ms": 0,
        }

    duration_ms = int(state.get("duration_seconds", ROUND_DURATION_SECONDS) * 1000)
    attempts_total = int(state.get("attempts_total", ATTEMPTS_TOTAL))

    elapsed_ms = get_elapsed_ms(state, client_elapsed_ms)

    if elapsed_ms < 0:
        attempts_by_player = state.get("attempts_by_player", {})
        current_attempts = attempts_by_player.get(player_name, [])
        return {
            "state": state,
            "accepted": False,
            "message": "Todavía no inicia la ronda.",
            "points_preview": 0,
            "attempts_used": len(current_attempts),
            "attempts_total": attempts_total,
            "grade": "miss",
            "label": "Muy pronto",
            "caught": False,
            "precision": 0,
            "delta_ms": 0,
        }

    if elapsed_ms > duration_ms:
        attempts_by_player = state.get("attempts_by_player", {})
        current_attempts = attempts_by_player.get(player_name, [])
        return {
            "state": state,
            "accepted": False,
            "message": "La ronda ya terminó.",
            "points_preview": 0,
            "attempts_used": len(current_attempts),
            "attempts_total": attempts_total,
            "grade": "miss",
            "label": "Tarde",
            "caught": False,
            "precision": 0,
            "delta_ms": 0,
        }

    attempts_by_player = state.setdefault("attempts_by_player", {})
    player_attempts = attempts_by_player.get(player_name, [])

    if len(player_attempts) >= attempts_total:
        return {
            "state": state,
            "accepted": False,
            "message": "Ya agotaste tus intentos.",
            "points_preview": 0,
            "attempts_used": len(player_attempts),
            "attempts_total": attempts_total,
            "grade": "miss",
            "label": "Sin intentos",
            "caught": False,
            "precision": 0,
            "delta_ms": 0,
        }

    snitch_pos = get_position_from_segments(state.get("snitch_segments", []), elapsed_ms)
    zone_pos = get_position_from_segments(state.get("zone_segments", []), elapsed_ms)

    dist = distance(snitch_pos["x"], snitch_pos["y"], zone_pos["x"], zone_pos["y"])
    judged = evaluate_catch(dist)
    precision = compute_precision(dist)

    attempt = {
        "attempt_number": len(player_attempts) + 1,
        "elapsed_ms": elapsed_ms,
        "distance_px": round(dist, 2),
        "grade": judged["grade"],
        "label": judged["label"],
        "points": judged["points"],
        "caught": judged["caught"],
        "precision": precision,
        "snitch": {
            "x": round(snitch_pos["x"], 2),
            "y": round(snitch_pos["y"], 2),
        },
        "zone": {
            "x": round(zone_pos["x"], 2),
            "y": round(zone_pos["y"], 2),
        },
    }

    player_attempts.append(attempt)
    attempts_by_player[player_name] = player_attempts

    submitted = set(state.get("snitch_submitted_players", []))
    submitted.add(player_name)
    state["snitch_submitted_players"] = sorted(list(submitted))

    return {
        "state": state,
        "accepted": True,
        "message": judged["label"],
        "points_preview": judged["points"],
        "attempts_used": len(player_attempts),
        "attempts_total": attempts_total,
        "grade": judged["grade"],
        "label": judged["label"],
        "caught": judged["caught"],
        "precision": precision,
        "delta_ms": 0,
    }


def best_attempt_for_player(attempts: list):
    if not attempts:
        return None

    return max(
        attempts,
        key=lambda item: (
            int(item.get("points", 0)),
            -float(item.get("distance_px", 99999)),
            int(item.get("precision", 0)),
            -int(item.get("attempt_number", 0)),
        )
    )


def resolve_for_reveal(state: dict, players: list):
    state = deepcopy(state or {})
    attempts_by_player = state.get("attempts_by_player", {}) or {}

    leaderboard = []
    point_events = []

    overall_best = None

    for player in players:
        player_name = player.get("name")
        house = player.get("house")
        attempts = attempts_by_player.get(player_name, [])
        best = best_attempt_for_player(attempts)

        base_points = int(best.get("points", 0)) if best else 0

        entry = {
            "player_name": player_name,
            "house": house,
            "attempts_used": len(attempts),
            "best_attempt": best,
            "points_awarded": base_points,
        }

        leaderboard.append(entry)

        if base_points > 0:
            point_events.append({
                "player_name": player_name,
                "points": base_points,
            })

        if best:
            if overall_best is None:
                overall_best = {
                    "player_name": player_name,
                    "house": house,
                    "best_attempt": best,
                }
            else:
                current = best
                champion = overall_best["best_attempt"]

                current_key = (
                    int(current.get("points", 0)),
                    -float(current.get("distance_px", 99999)),
                    int(current.get("precision", 0)),
                )
                champion_key = (
                    int(champion.get("points", 0)),
                    -float(champion.get("distance_px", 99999)),
                    int(champion.get("precision", 0)),
                )

                if current_key > champion_key:
                    overall_best = {
                        "player_name": player_name,
                        "house": house,
                        "best_attempt": best,
                    }

    leaderboard.sort(
        key=lambda row: (
            int((row.get("best_attempt") or {}).get("points", 0)),
            -float((row.get("best_attempt") or {}).get("distance_px", 99999)),
            int((row.get("best_attempt") or {}).get("precision", 0)),
        ),
        reverse=True,
    )

    winner_bonus = 0
    winner_name = None

    if overall_best and overall_best.get("best_attempt"):
        winner_name = overall_best["player_name"]
        winner_bonus = 90
        point_events.append({
            "player_name": winner_name,
            "points": winner_bonus,
        })

        for row in leaderboard:
            if row["player_name"] == winner_name:
                row["winner_bonus"] = winner_bonus
                row["points_awarded"] = int(row.get("points_awarded", 0)) + winner_bonus
            else:
                row["winner_bonus"] = 0

    for row in leaderboard:
        if "winner_bonus" not in row:
            row["winner_bonus"] = 0

    state["phase"] = "results_atrapa_snitch"
    state["point_events"] = point_events
    state["snitch_result"] = {
        "leaderboard": leaderboard,
        "winner_name": winner_name,
        "winner_bonus": winner_bonus,
        "attempts_by_player": attempts_by_player,
        "summary": "La Snitch cambia de dirección y velocidad. Gana quien mejor calcule el momento exacto.",
    }

    return state, point_events, True