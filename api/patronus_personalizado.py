import base64
import json
import random
import re
import time
import uuid
from pathlib import Path
from typing import Optional

from api.database import supabase

PROMPT_BANK_PATH = Path(__file__).with_name("patronus_prompts.json")
EVENT_PREFIX = "PATRONUS_V1"
MAX_ANSWER_LENGTH = 80

POINTS_FIRST = 150
POINTS_SECOND = 100
POINTS_PER_VOTE = 20
POINTS_NO_VOTES = 10
POINTS_WINNER_HOUSE = 100

FALLBACK_PROMPTS = [
    {"id": "p001", "mode": "family", "text": "Tu Patronus aparece, pero viene raro. ¿Qué forma tiene?"},
    {"id": "p002", "mode": "family", "text": "¿Qué diría un dementor después de revisar tu cuenta bancaria?"},
    {"id": "p003", "mode": "family", "text": "¿Qué hechizo usarías para evitar mensajes de tu ex?"},
    {"id": "p004", "mode": "family", "text": "Si tu capa invisible tuviera un defecto, ¿cuál sería?"},
]

FALLBACK_NARRATOR = [
    "Tu Patronus ha aparecido… y necesita terapia.",
    "Un dementor acaba de arrepentirse de haber venido.",
    "Expecto Patronum… versión presupuesto limitado, dignidad opcional.",
]


def _now():
    return time.time()


def _mode(value: Optional[str]):
    value = str(value or "family").strip().lower()
    return "adults" if value in {"adult", "adulto", "adultos", "18+", "picante"} else "family"


def _bank():
    if PROMPT_BANK_PATH.exists():
        try:
            with PROMPT_BANK_PATH.open("r", encoding="utf-8") as file:
                data = json.load(file)
                if isinstance(data, dict):
                    return data
        except Exception:
            pass

    return {
        "default_mode": "family",
        "prompts": FALLBACK_PROMPTS,
        "narrator_lines": FALLBACK_NARRATOR,
        "moderation": {
            "blocked_words_family": ["groseria_fuerte", "contenido_adulto", "insulto_directo"],
            "blocked_words_adults": ["odio", "violencia_sexual", "discriminacion"],
        },
    }


def sanitize_answer(answer: str, max_length: int = MAX_ANSWER_LENGTH):
    clean = re.sub(r"\s+", " ", str(answer or "")).replace("<", "").replace(">", "").strip()
    return clean[:max_length]


def has_blocked_words(answer: str, mode: str = "family"):
    bank = _bank()
    moderation = bank.get("moderation") or {}
    blocked = list(moderation.get("blocked_words_adults") or [])

    if _mode(mode) == "family":
        blocked += list(moderation.get("blocked_words_family") or [])

    text = answer.lower()
    return any(re.search(rf"\b{re.escape(str(word).lower())}\b", text) for word in blocked)


def validate_answer(answer: str, mode: str = "family", max_length: int = MAX_ANSWER_LENGTH):
    clean = sanitize_answer(answer, max_length)

    if not clean:
        return {"accepted": False, "answer": "", "message": "Escribe una respuesta. Tu Patronus no puede salir en blanco."}

    if has_blocked_words(clean, mode):
        return {"accepted": False, "answer": clean, "message": "Respuesta bloqueada por moderación mágica."}

    return {"accepted": True, "answer": clean, "message": "Respuesta aceptada por el Patronus."}


def _prompt(mode: str):
    bank = _bank()
    prompts = bank.get("prompts") or FALLBACK_PROMPTS
    mode = _mode(mode)

    if mode == "family":
        allowed = [p for p in prompts if _mode(p.get("mode")) == "family"]
    else:
        allowed = [p for p in prompts if _mode(p.get("mode")) in {"family", "adults"}]

    return random.choice(allowed or FALLBACK_PROMPTS)


def _narrator():
    return random.choice(_bank().get("narrator_lines") or FALLBACK_NARRATOR)


def _room(room_code: str):
    response = (
        supabase.table("rooms")
        .select("id")
        .eq("room_code", str(room_code or "").upper())
        .execute()
    )
    return response.data[0] if response.data else {}


def _players(room_id: int):
    response = (
        supabase.table("players")
        .select("name, house, score")
        .eq("room_id", room_id)
        .execute()
    )
    return response.data or []


def _b64(value: str):
    return base64.urlsafe_b64encode(str(value or "").encode("utf-8")).decode("ascii").rstrip("=")


def _unb64(value: str):
    try:
        return base64.urlsafe_b64decode((value + "=" * (-len(value) % 4)).encode("ascii")).decode("utf-8")
    except Exception:
        return ""


def encode_answer_event(round_id: str, player_name: str, house: str, answer: str):
    return "::".join([EVENT_PREFIX, "ANSWER", _b64(round_id), _b64(player_name), _b64(house), _b64(sanitize_answer(answer))])


def encode_vote_event(round_id: str, voter_name: str, target_player: str):
    return "::".join([EVENT_PREFIX, "VOTE", _b64(round_id), _b64(voter_name), _b64(target_player)])


def encode_control_event(round_id: str, action: str, host_name: str):
    return "::".join([EVENT_PREFIX, "CTRL", _b64(round_id), _b64(action), _b64(host_name)])


def decode_event_key(key: str):
    parts = str(key or "").split("::")

    if len(parts) < 4 or parts[0] != EVENT_PREFIX:
        return None

    if parts[1] == "ANSWER" and len(parts) >= 6:
        return {"type": "answer", "round_id": _unb64(parts[2]), "player_name": _unb64(parts[3]), "house": _unb64(parts[4]), "answer": _unb64(parts[5])}

    if parts[1] == "VOTE" and len(parts) >= 5:
        return {"type": "vote", "round_id": _unb64(parts[2]), "voter_name": _unb64(parts[3]), "target_player": _unb64(parts[4])}

    if parts[1] == "CTRL" and len(parts) >= 5:
        return {"type": "control", "round_id": _unb64(parts[2]), "action": _unb64(parts[3]), "host_name": _unb64(parts[4])}

    return None


def parse_event_log(votes: dict, round_id: str):
    submissions = {}
    vote_by_voter = {}
    controls = set()

    for key in (votes or {}).keys():
        event = decode_event_key(key)
        if not event or event.get("round_id") != round_id:
            continue

        if event["type"] == "answer" and event["player_name"] not in submissions:
            submissions[event["player_name"]] = {
                "player_name": event["player_name"],
                "house": event.get("house"),
                "answer": sanitize_answer(event.get("answer")),
            }

        if event["type"] == "vote":
            vote_by_voter[event["voter_name"]] = event["target_player"]

        if event["type"] == "control":
            controls.add(event["action"])

    return {"submissions": submissions, "vote_by_voter": vote_by_voter, "controls": controls}


def calculate_results(state: dict):
    state = state or {}
    players = state.get("players") or []
    player_names = {p.get("name") for p in players}
    parsed = parse_event_log(state.get("votes") or {}, state.get("round_id", ""))
    submissions = parsed["submissions"]
    valid_targets = set(submissions.keys())
    votes_by_target = {target: 0 for target in valid_targets}
    votes_by_voter = {}

    for voter, target in parsed["vote_by_voter"].items():
        if voter not in player_names or target not in valid_targets or voter == target:
            continue
        votes_by_voter[voter] = target
        votes_by_target[target] += 1

    ranking = sorted(
        submissions.values(),
        key=lambda item: (-votes_by_target.get(item["player_name"], 0), item["player_name"].lower()),
    )

    point_events = []

    def add_event(player_name, house, points, label):
        point_events.append({"player_name": player_name, "house": house, "points": points, "label": label})

    for item in submissions.values():
        count = votes_by_target.get(item["player_name"], 0)
        if count:
            add_event(item["player_name"], item.get("house"), count * POINTS_PER_VOTE, f"{count} voto(s) recibido(s)")
        else:
            add_event(item["player_name"], item.get("house"), POINTS_NO_VOTES, "Lástima mágica: respuesta sin votos")

    if ranking:
        add_event(ranking[0]["player_name"], ranking[0].get("house"), POINTS_FIRST, "Respuesta más votada")

    if len(ranking) > 1 and votes_by_target.get(ranking[1]["player_name"], 0) > 0:
        add_event(ranking[1]["player_name"], ranking[1].get("house"), POINTS_SECOND, "Segundo lugar")

    house_vote_totals = {}

    for target, count in votes_by_target.items():
        house = submissions[target].get("house")
        if house:
            house_vote_totals[house] = house_vote_totals.get(house, 0) + count

    winning_houses = []
    if house_vote_totals:
        best = max(house_vote_totals.values())
        if best > 0:
            winning_houses = [house for house, count in house_vote_totals.items() if count == best]

    for player in players:
        if player.get("house") in winning_houses:
            add_event(player.get("name"), player.get("house"), POINTS_WINNER_HOUSE, "Bonus casa con más votos acumulados")

    return {
        "submissions": list(submissions.values()),
        "votes_by_target": votes_by_target,
        "votes_by_voter": votes_by_voter,
        "ranking": [{**item, "votes": votes_by_target.get(item["player_name"], 0)} for item in ranking],
        "house_vote_totals": house_vote_totals,
        "winning_houses": winning_houses,
        "point_events": point_events,
    }


def build_state(room_code: str, previous_state=None, settings=None):
    previous_state = previous_state or {}
    settings = settings or {}
    bank = _bank()
    mode = _mode(settings.get("mode") or previous_state.get("settings", {}).get("mode") or bank.get("default_mode"))
    selected_prompt = _prompt(mode)
    room = _room(room_code)
    players = _players(room["id"]) if room.get("id") else []

    return {
        "phase": "patronus_personalizado",
        "game_id": "patronus_personalizado",
        "round_id": str(uuid.uuid4()),
        "title": "Patronus Personalizado",
        "subtitle": "Respuestas cortas, votación secreta y humor mágico en español latino.",
        "question": selected_prompt.get("text"),
        "prompt_id": selected_prompt.get("id"),
        "prompt_tags": selected_prompt.get("tags", []),
        "prompt_mode": mode,
        "narrator": _narrator(),
        "players": players,
        "options": [player.get("name") for player in players],
        "eligible_voters": [player.get("name") for player in players],
        "votes": {},
        "answers": {},
        "votes_by_voter": {},
        "votes_by_target": {},
        "submitted_count": 0,
        "voted_count": 0,
        "total_players": len(players),
        "started_at": _now(),
        "submit_seconds": int(settings.get("submit_seconds") or 75),
        "vote_seconds": int(settings.get("vote_seconds") or 45),
        "settings": {
            "mode": mode,
            "family_mode": mode == "family",
            "adult_mode": mode == "adults",
            "max_answer_length": MAX_ANSWER_LENGTH,
            "anonymous_default": True,
            "show_names": bool(settings.get("show_names", False)),
            "allow_host_force_vote": True,
            "allow_host_force_results": True,
        },
        "moderation": {
            "enabled": True,
            "basic_length_filter": True,
            "blocked_words_family": (bank.get("moderation") or {}).get("blocked_words_family", []),
            "blocked_words_adults": (bank.get("moderation") or {}).get("blocked_words_adults", []),
        },
        "points": {
            "first": POINTS_FIRST,
            "second": POINTS_SECOND,
            "vote_received": POINTS_PER_VOTE,
            "zero_votes": POINTS_NO_VOTES,
            "winner_house": POINTS_WINNER_HOUSE,
        },
        "socketio_ready": {
            "recommended_events": [
                "patronus:answer_submitted",
                "patronus:voting_opened",
                "patronus:vote_submitted",
                "patronus:results_revealed",
            ],
            "state_contract": "answers -> voting -> results; el frontend actual usa event log en votes para compatibilidad con polling.",
        },
        "point_events": [],
        "patronus_result": None,
        "scored": False,
        "host": previous_state.get("host"),
    }
