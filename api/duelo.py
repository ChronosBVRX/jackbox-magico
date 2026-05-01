import random
import time
import uuid
from fastapi import APIRouter, HTTPException

from api.database import supabase


router = APIRouter()

DUEL_OPTIONS = [
    "Expelliarmus",
    "Protego",
    "Stupefy",
    "Esquivar",
    "Rictusempra",
]

DUEL_RULES = {
    "Expelliarmus": "Rictusempra",
    "Protego": "Expelliarmus",
    "Stupefy": "Protego",
    "Esquivar": "Stupefy",
    "Rictusempra": "Esquivar",
}

SPELL_COPY = {
    "Expelliarmus": {
        "emoji": "🪄",
        "label": "Expelliarmus",
        "description": "Desarma con estilo dramático.",
    },
    "Protego": {
        "emoji": "🛡️",
        "label": "Protego",
        "description": "Bloquea como quien ignora mensajes incómodos.",
    },
    "Stupefy": {
        "emoji": "💥",
        "label": "Stupefy",
        "description": "Aturde más fuerte que regaño de profesora estricta.",
    },
    "Esquivar": {
        "emoji": "💨",
        "label": "Esquivar",
        "description": "Te haces humo con dignidad.",
    },
    "Rictusempra": {
        "emoji": "😂",
        "label": "Rictusempra",
        "description": "Ataque de cosquillas mágicas y humillación pública.",
    },
}

DUEL_NARRATOR_LINES = [
    "¡Varitas arriba!",
    "Ese hechizo pegó más fuerte que regaño de profesora estricta.",
    "Hoy aprenderemos que la magia también sirve para defender el orgullo.",
    "Recuerden: elegancia primero, humillación después.",
    "El duelo empieza cuando la dignidad abandona el salón.",
]

STORY_DUEL_LINES = {
    "copa_encantada_loca": "La Copa exige sangre... o al menos un buen hechizo desarmador.",
    "peeves_hackeo_trivia": "Peeves dice que el perdedor tendrá que lavarle los calzoncillos a Filch.",
    "ministerio_cancelo_diversion": "Duelo oficial. Queda estrictamente prohibido divertirse o sonreír.",
    "torneo_cuatro_casas": "Torneo oficial. Si pierden, le restan puntos a su casa y dignidad a su apellido.",
    "grimorio_excusas_prohibidas": "El Grimorio ya escribió la excusa del perdedor: 'Se me resbaló la varita por el sudor'.",
    "banquete_hechizos_descompuestos": "Duelo sobre la mesa. Cuidado con tirarle la sopa de calabaza al director.",
}

POINTS_WIN = 150
POINTS_FAST = 30
POINTS_CLASH_WIN = 80
POINTS_TIMEOUT = -30

DUEL_SECONDS = 5
CLASH_SECONDS = 5


def _now():
    return time.time()


def _round_time(client_elapsed_ms=None, started_at=None):
    if client_elapsed_ms is not None:
        try:
            return max(0, int(client_elapsed_ms) / 1000)
        except Exception:
            pass

    if started_at is None:
        return 0

    return max(0, _now() - float(started_at))


def _get_room(room_code: str):
    room = (
        supabase.table("rooms")
        .select("id")
        .eq("room_code", room_code.upper())
        .execute()
    )

    if not room.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    return room.data[0]


def _get_players(room_id: int):
    players = (
        supabase.table("players")
        .select("name, house, score")
        .eq("room_id", room_id)
        .execute()
    )

    return players.data or []


def _pick_duelists(room_code: str):
    room = _get_room(room_code)
    players = _get_players(room["id"])

    if len(players) < 2:
        return []

    houses = {}
    for player in players:
        houses.setdefault(player["house"], []).append(player)

    distinct_houses = list(houses.keys())

    if len(distinct_houses) >= 2:
        selected_houses = random.sample(distinct_houses, 2)
        player_a = random.choice(houses[selected_houses[0]])
        player_b = random.choice(houses[selected_houses[1]])
    else:
        sampled = random.sample(players, 2)
        player_a = sampled[0]
        player_b = sampled[1]

    return [
        {
            "name": player_a["name"],
            "house": player_a["house"],
        },
        {
            "name": player_b["name"],
            "house": player_b["house"],
        },
    ]


def build_duelo_state(room_code: str = None, previous_state=None):
    previous_state = previous_state or {}
    duelists = _pick_duelists(room_code) if room_code else []

    if len(duelists) < 2:
        return {
            "phase": "duelo",
            "game_id": "duelo_hechizos",
            "round_id": str(uuid.uuid4()),
            "title": "Duelo de Hechizos",
            "question": "Se necesitan al menos 2 jugadores para iniciar un duelo.",
            "narrator": "El salón de duelos está listo, pero faltan magos con valor cuestionable.",
            "options": [],
            "duelists": [],
            "answers": {},
            "started_at": _now(),
            "duration_seconds": DUEL_SECONDS,
            "points_win": POINTS_WIN,
            "points_fast": POINTS_FAST,
            "points_clash_win": POINTS_CLASH_WIN,
            "points_timeout": POINTS_TIMEOUT,
            "scored": False,
            "host": previous_state.get("host"),
        }

    story_id = previous_state.get("story", {}).get("story_id")
    narrator_line = STORY_DUEL_LINES.get(story_id, random.choice(DUEL_NARRATOR_LINES))

    return {
        "phase": "duelo",
        "game_id": "duelo_hechizos",
        "round_id": str(uuid.uuid4()),
        "title": "Duelo de Hechizos",
        "subtitle": "Dos casas se enfrentan. Cinco hechizos. Una dignidad en riesgo.",
        "question": "¡Varitas arriba! Elige tu hechizo antes de que termine la cuenta.",
        "narrator": narrator_line,
        "options": DUEL_OPTIONS,
        "spell_copy": SPELL_COPY,
        "duelists": duelists,
        "answers": {},
        "started_at": _now(),
        "duration_seconds": DUEL_SECONDS,
        "points_win": POINTS_WIN,
        "points_fast": POINTS_FAST,
        "points_clash_win": POINTS_CLASH_WIN,
        "points_timeout": POINTS_TIMEOUT,
        "scored": False,
        "clash": None,
        "duel_result": None,
        "point_events": [],
        "host": previous_state.get("host"),
    }


def _duelist_names(state):
    return [d["name"] for d in state.get("duelists", [])]


def _duelist_house(state, player_name):
    for duelist in state.get("duelists", []):
        if duelist.get("name") == player_name:
            return duelist.get("house")

    return None


def _is_duelist(state, player_name):
    return player_name in _duelist_names(state)


def submit_spell_answer(state, player_name, answer, client_elapsed_ms=None):
    state = state or {}

    if state.get("phase") != "duelo":
        return {
            "state": state,
            "accepted": False,
            "message": "El duelo no acepta hechizos en esta fase.",
        }

    if not _is_duelist(state, player_name):
        return {
            "state": state,
            "accepted": False,
            "message": "No eres duelista en esta ronda.",
        }

    if answer not in DUEL_OPTIONS:
        return {
            "state": state,
            "accepted": False,
            "message": "Hechizo inválido.",
        }

    answers = state.get("answers", {})

    if player_name in answers:
        return {
            "state": state,
            "accepted": True,
            "message": "Ya habías elegido hechizo.",
        }

    elapsed = _round_time(
        client_elapsed_ms=client_elapsed_ms,
        started_at=state.get("started_at"),
    )

    if elapsed > int(state.get("duration_seconds", DUEL_SECONDS)):
        return {
            "state": state,
            "accepted": False,
            "message": "Fuera de tiempo.",
        }

    answers[player_name] = {
        "spell": answer,
        "elapsed_seconds": round(elapsed, 3),
    }

    state["answers"] = answers

    duelists = _duelist_names(state)

    if all(name in answers for name in duelists):
        spell_a = answers[duelists[0]]["spell"]
        spell_b = answers[duelists[1]]["spell"]

        if spell_a == spell_b:
            state["phase"] = "duelo_clash"
            state["question"] = "¡Choque de varitas! Presiona tan rápido como puedas durante 5 segundos."
            state["narrator"] = "¡Choque de varitas! Esto se va a resolver a punta de terquedad mágica."
            state["clash"] = {
                "started_at": _now(),
                "duration_seconds": CLASH_SECONDS,
                "taps": {
                    duelists[0]: 0,
                    duelists[1]: 0,
                },
            }

    return {
        "state": state,
        "accepted": True,
        "message": "Hechizo guardado.",
    }


def submit_clash_tap(state, player_name):
    state = state or {}

    if state.get("phase") != "duelo_clash":
        return {
            "state": state,
            "accepted": False,
            "taps": 0,
            "message": "No hay choque de varitas activo.",
        }

    if not _is_duelist(state, player_name):
        return {
            "state": state,
            "accepted": False,
            "taps": 0,
            "message": "No eres duelista en este choque.",
        }

    clash = state.get("clash") or {}
    started_at = float(clash.get("started_at", _now()))
    duration = int(clash.get("duration_seconds", CLASH_SECONDS))
    elapsed = max(0, _now() - started_at)

    if elapsed > duration:
        return {
            "state": state,
            "accepted": False,
            "taps": clash.get("taps", {}).get(player_name, 0),
            "message": "El choque ya terminó.",
        }

    taps = clash.get("taps", {})
    taps[player_name] = int(taps.get(player_name, 0)) + 1
    clash["taps"] = taps
    state["clash"] = clash

    return {
        "state": state,
        "accepted": True,
        "taps": taps[player_name],
        "message": "Tap registrado.",
    }


def _add_event(events, player_name, house, points, label):
    events.append({
        "player_name": player_name,
        "house": house,
        "points": points,
        "label": label,
    })


def _fastest_answer_player(state):
    answers = state.get("answers", {})
    valid = []

    for name, data in answers.items():
        if "elapsed_seconds" in data:
            valid.append((name, data.get("elapsed_seconds", 999)))

    if not valid:
        return None

    valid.sort(key=lambda item: item[1])
    return valid[0][0]


def _spell_winner(spell_a, spell_b):
    if spell_a == spell_b:
        return None

    if DUEL_RULES.get(spell_a) == spell_b:
        return "a"

    if DUEL_RULES.get(spell_b) == spell_a:
        return "b"

    return None


def resolve_for_reveal(state):
    state = state or {}
    phase = state.get("phase")

    if state.get("scored"):
        return state, [], True

    events = []
    duelists = state.get("duelists", [])

    if len(duelists) < 2:
        state["phase"] = "results_duelo"
        state["correct"] = "Duelo cancelado"
        state["duel_result"] = {
            "type": "cancelled",
            "summary": "No había suficientes jugadores para un duelo.",
        }
        state["point_events"] = []
        state["scored"] = True
        return state, [], True

    p1 = duelists[0]["name"]
    p2 = duelists[1]["name"]
    h1 = duelists[0]["house"]
    h2 = duelists[1]["house"]

    answers = state.get("answers", {})
    has_p1 = p1 in answers
    has_p2 = p2 in answers

    if phase == "duelo":
        if has_p1 and has_p2:
            spell_1 = answers[p1]["spell"]
            spell_2 = answers[p2]["spell"]

            if spell_1 == spell_2:
                state["phase"] = "duelo_clash"
                state["question"] = "¡Choque de varitas! Presiona tan rápido como puedas durante 5 segundos."
                state["narrator"] = "¡Choque de varitas! Dos magos igual de tercos, justo lo que necesitaba la clase."
                state["clash"] = {
                    "started_at": _now(),
                    "duration_seconds": CLASH_SECONDS,
                    "taps": {
                        p1: 0,
                        p2: 0,
                    },
                }
                return state, [], False

            winner_key = _spell_winner(spell_1, spell_2)

            if winner_key == "a":
                winner = p1
                winner_house = h1
                loser = p2
                loser_house = h2
            else:
                winner = p2
                winner_house = h2
                loser = p1
                loser_house = h1

            _add_event(events, winner, winner_house, POINTS_WIN, "Victoria de duelo")

            fastest = _fastest_answer_player(state)
            if fastest:
                _add_event(
                    events,
                    fastest,
                    _duelist_house(state, fastest),
                    POINTS_FAST,
                    "Elección más rápida",
                )

            state["phase"] = "results_duelo"
            state["correct"] = f"{winner} gana con {answers[winner]['spell']}"
            state["duel_result"] = {
                "type": "spell_win",
                "winner": winner,
                "winner_house": winner_house,
                "loser": loser,
                "loser_house": loser_house,
                "spell_winner": answers[winner]["spell"],
                "spell_loser": answers[loser]["spell"],
                "summary": f"{winner} venció con {answers[winner]['spell']}.",
                "narrator": "Ese hechizo pegó más fuerte que regaño de profesora estricta.",
            }

        elif has_p1 and not has_p2:
            winner = p1
            winner_house = h1

            _add_event(events, winner, winner_house, POINTS_WIN, "Victoria por respuesta")
            _add_event(events, winner, winner_house, POINTS_FAST, "Elección más rápida")
            _add_event(events, p2, h2, POINTS_TIMEOUT, "No respondió a tiempo")

            state["phase"] = "results_duelo"
            state["correct"] = f"{winner} gana porque su rival no respondió"
            state["duel_result"] = {
                "type": "timeout",
                "winner": winner,
                "winner_house": winner_house,
                "summary": f"{p2} no respondió a tiempo. La varita no hace milagros si nadie la usa.",
                "narrator": "La puntualidad también es magia, jóvenes.",
            }

        elif has_p2 and not has_p1:
            winner = p2
            winner_house = h2

            _add_event(events, winner, winner_house, POINTS_WIN, "Victoria por respuesta")
            _add_event(events, winner, winner_house, POINTS_FAST, "Elección más rápida")
            _add_event(events, p1, h1, POINTS_TIMEOUT, "No respondió a tiempo")

            state["phase"] = "results_duelo"
            state["correct"] = f"{winner} gana porque su rival no respondió"
            state["duel_result"] = {
                "type": "timeout",
                "winner": winner,
                "winner_house": winner_house,
                "summary": f"{p1} no respondió a tiempo. Dramático, triste y muy de primer año.",
                "narrator": "La puntualidad también es magia, jóvenes.",
            }

        else:
            _add_event(events, p1, h1, POINTS_TIMEOUT, "No respondió a tiempo")
            _add_event(events, p2, h2, POINTS_TIMEOUT, "No respondió a tiempo")

            state["phase"] = "results_duelo"
            state["correct"] = "Nadie respondió"
            state["duel_result"] = {
                "type": "double_timeout",
                "summary": "Ambos duelistas se quedaron viendo la varita como si fuera control remoto sin pilas.",
                "narrator": "He visto duelos aburridos, pero esto fue una junta administrativa.",
            }

    elif phase == "duelo_clash":
        clash = state.get("clash") or {}
        taps = clash.get("taps", {})

        taps_1 = int(taps.get(p1, 0))
        taps_2 = int(taps.get(p2, 0))

        fastest = _fastest_answer_player(state)
        if fastest:
            _add_event(
                events,
                fastest,
                _duelist_house(state, fastest),
                POINTS_FAST,
                "Elección más rápida",
            )

        if taps_1 > taps_2:
            winner = p1
            winner_house = h1
            loser = p2
            loser_house = h2
            winner_taps = taps_1
            loser_taps = taps_2
        elif taps_2 > taps_1:
            winner = p2
            winner_house = h2
            loser = p1
            loser_house = h1
            winner_taps = taps_2
            loser_taps = taps_1
        else:
            state["phase"] = "results_duelo"
            state["correct"] = "Empate mágico"
            state["duel_result"] = {
                "type": "clash_tie",
                "summary": f"Ambos lograron {taps_1} pulsaciones. Mucha energía, poca resolución.",
                "narrator": "Esto fue tan parejo que hasta el retrato del fondo pidió desempate del desempate.",
                "taps": {
                    p1: taps_1,
                    p2: taps_2,
                },
            }
            state["point_events"] = events
            state["scored"] = True
            return state, events, True

        _add_event(events, winner, winner_house, POINTS_WIN, "Victoria de duelo")
        _add_event(events, winner, winner_house, POINTS_CLASH_WIN, "Ganó Choque de Varitas")

        state["phase"] = "results_duelo"
        state["correct"] = f"{winner} gana el Choque de Varitas"
        state["duel_result"] = {
            "type": "clash_win",
            "winner": winner,
            "winner_house": winner_house,
            "loser": loser,
            "loser_house": loser_house,
            "winner_taps": winner_taps,
            "loser_taps": loser_taps,
            "summary": f"{winner} ganó el choque con {winner_taps} pulsaciones contra {loser_taps}.",
            "narrator": "¡Choque de varitas! Eso fue menos técnica y más desesperación elegante.",
            "taps": {
                p1: taps_1,
                p2: taps_2,
            },
        }

    state["point_events"] = events
    state["scored"] = True

    return state, events, True


@router.post("/api/host/{room_code}/start_duelo")
async def start_duelo(room_code: str):
    new_state = build_duelo_state(room_code=room_code)

    supabase.table("rooms").update({
        "status": "playing",
        "game_state": new_state,
    }).eq("room_code", room_code.upper()).execute()

    return {
        "message": "Duelo de Hechizos iniciado",
    }
