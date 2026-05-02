import json
import random
import time
import uuid
from pathlib import Path


GAME_ID = "hechizo_incompleto"
PHASE = "hechizo_incompleto"
RESULTS_PHASE = "results_hechizo_incompleto"

ROUND_SECONDS = 7
FAST_BONUS_LIMIT = 3.0

POINTS_CORRECT = 80
POINTS_FAST = 40
POINTS_STREAK_5 = 150
POINTS_WRONG_NORMAL = 0
POINTS_WRONG_EXPERT = -20
STREAK_TARGET = 5

ANSWER_LABELS = ["A", "B", "C", "D"]
DATA_PATH = Path(__file__).with_name("hechizo_incompleto_bank.json")

STORY_HECHIZO_NARRATOR = {
    "copa_encantada_loca": "La Copa olvidó la otra mitad de la palabra. Si explota algo, fue su culpa.",
    "peeves_hackeo_trivia": "Peeves borró los pergaminos con baba de gusarajo. Adivinen lo que falta.",
    "ministerio_cancelo_diversion": "El Ministerio evalúa ortografía mágica. Las fallas serán anexadas a su expediente.",
    "torneo_cuatro_casas": "Hechizos bajo presión. Un tartamudeo y le restan 50 puntos a su casa.",
    "grimorio_excusas_prohibidas": "El Grimorio dice que la varita está chueca. Prueben que se equivocan.",
    "banquete_hechizos_descompuestos": "Tienen la boca llena de polvo de aparición, pronuncien bien o se quedan mudos.",
}


DEFAULT_POOL = [
    {
        "id": "wingardium_leviosa",
        "type": "hechizo",
        "difficulty": "facil",
        "question": "Wingardium Levi___",
        "options": ["osa", "oso", "uza", "isa"],
        "correct": "osa",
        "narrator_comment": "Pronuncien bien, por favor. Una vocal mal puesta y alguien termina con una pluma en la nariz.",
    },
    {
        "id": "expecto_patronum",
        "type": "hechizo",
        "difficulty": "media",
        "question": "Expecto Patro___",
        "options": ["num", "nam", "nus", "nium"],
        "correct": "num",
        "narrator_comment": "Correcto. Con eso espantas dementores y, con suerte, pensamientos de lunes.",
    },
    {
        "id": "expelliarmus",
        "type": "hechizo",
        "difficulty": "facil",
        "question": "Expelli___",
        "options": ["armus", "armis", "ormus", "asmus"],
        "correct": "armus",
        "narrator_comment": "El clásico de Harry: sencillo, dramático y útil para quitarle la varita al intenso de la mesa.",
    },
    {
        "id": "alohomora",
        "type": "hechizo",
        "difficulty": "facil",
        "question": "Aloho___",
        "options": ["mora", "moro", "mira", "mura"],
        "correct": "mora",
        "narrator_comment": "Abre cerraduras, no conversaciones que claramente ya debieron terminar.",
    },
    {
        "id": "petrificus_totalus",
        "type": "hechizo",
        "difficulty": "media",
        "question": "Petrificus Tot___",
        "options": ["alus", "olis", "alis", "ulus"],
        "correct": "alus",
        "narrator_comment": "Bien. Neville lo vivió y aun así terminó siendo más valiente que todos nosotros.",
    },
    {
        "id": "riddikulus",
        "type": "hechizo",
        "difficulty": "media",
        "question": "Riddi___",
        "options": ["kulus", "culus", "colus", "kilus"],
        "correct": "kulus",
        "narrator_comment": "Correcto. El boggart se ríe, pero tú también, y eso psicológicamente cuenta.",
    },
    {
        "id": "sectumsempra",
        "type": "hechizo",
        "difficulty": "experto",
        "question": "Sectum___",
        "options": ["sempra", "sempro", "sombra", "sempre"],
        "correct": "sempra",
        "narrator_comment": "Cuidado con ese hechizo. Si lo pronuncias mal, no es latín mágico: es invento de borracho.",
    },
    {
        "id": "oculus_reparo",
        "type": "hechizo",
        "difficulty": "media",
        "question": "Oculus Re___",
        "options": ["paro", "pero", "pairo", "puro"],
        "correct": "paro",
        "narrator_comment": "Correcto. Magia oftálmica básica para salvar lentes y dignidad.",
    },
    {
        "id": "obliviate",
        "type": "hechizo",
        "difficulty": "dificil",
        "question": "Obli___",
        "options": ["viate", "veate", "vium", "viosa"],
        "correct": "viate",
        "narrator_comment": "Útil para recuerdos. No recomendado para borrar deudas, capturas ni audios comprometedores.",
    },
    {
        "id": "lumos_maxima",
        "type": "hechizo",
        "difficulty": "facil",
        "question": "Lumos ___",
        "options": ["Máxima", "Mínima", "Mágica", "Mortal"],
        "correct": "Máxima",
        "narrator_comment": "Correcto. Luz suficiente para encontrar la mesa, la varita o la dignidad perdida.",
    },
    {
        "id": "mischief_managed",
        "type": "frase",
        "difficulty": "media",
        "question": "Para cerrar el Mapa del Merodeador: Travesura ___",
        "options": ["realizada", "terminada", "completada", "cancelada"],
        "correct": "realizada",
        "narrator_comment": "Bien. Travesura realizada, evidencia desaparecida y Filch confundido.",
    },
    {
        "id": "solemnly_swear",
        "type": "frase",
        "difficulty": "media",
        "question": "Juro solemnemente que mis intenciones no son ___",
        "options": ["buenas", "malas", "claras", "santas"],
        "correct": "buenas",
        "narrator_comment": "Correcto. Frase elegante para anunciar que vas a hacer exactamente lo que no debías.",
    },
    {
        "id": "levicorpus",
        "type": "hechizo",
        "difficulty": "dificil",
        "question": "Levi___",
        "options": ["corpus", "corpos", "cuerpus", "curpus"],
        "correct": "corpus",
        "narrator_comment": "Correcto, por un momento sonaste como alguien que sí estudió.",
    },
    {
        "id": "morsmordre",
        "type": "hechizo",
        "difficulty": "experto",
        "question": "Mors___",
        "options": ["mordre", "mordra", "morte", "mordrex"],
        "correct": "mordre",
        "narrator_comment": "Ese no se grita en reuniones familiares. Ni en karaoke. Ni por accidente.",
    },
    {
        "id": "protego",
        "type": "hechizo",
        "difficulty": "facil",
        "question": "Pro___",
        "options": ["tego", "tigo", "tega", "togo"],
        "correct": "tego",
        "narrator_comment": "Escudo básico. Sirve contra hechizos y contra comentarios pasivo-agresivos.",
    },
    {
        "id": "accio",
        "type": "hechizo",
        "difficulty": "facil",
        "question": "Ac___",
        "options": ["cio", "sio", "xio", "zio"],
        "correct": "cio",
        "narrator_comment": "Muy bien. Ahora úsalo con responsabilidad, no para atraer papas de otra mesa.",
    },
    {
        "id": "confundus",
        "type": "hechizo",
        "difficulty": "dificil",
        "question": "Con___",
        "options": ["fundus", "fundo", "fendus", "fundis"],
        "correct": "fundus",
        "narrator_comment": "Correcto. El hechizo favorito de quien explica una cuenta dividida entre ocho.",
    },
    {
        "id": "aguamenti",
        "type": "hechizo",
        "difficulty": "media",
        "question": "Agua___",
        "options": ["menti", "mente", "manti", "mundi"],
        "correct": "menti",
        "narrator_comment": "Bien. Agua mágica, ideal para incendios, dragones y nachos demasiado enchilados.",
    },
    {
        "id": "nox",
        "type": "hechizo",
        "difficulty": "facil",
        "question": "Para apagar Lumos se dice: ___",
        "options": ["Nox", "Knox", "Lux", "Nexus"],
        "correct": "Nox",
        "narrator_comment": "Correcto. Oscuridad activada. Responsabilidad emocional no incluida.",
    },
    {
        "id": "avada_kedavra",
        "type": "hechizo",
        "difficulty": "experto",
        "question": "Avada Ke___",
        "options": ["davra", "dabro", "dabra", "devra"],
        "correct": "davra",
        "narrator_comment": "Eso está muy oscuro para una convivencia familiar. Pero sí, la pronunciación fue correcta.",
    },
]


def _as_text(value):
    return str(value or "").strip()


def _normalize_difficulty(value):
    normalized = _as_text(value).lower()
    normalized = normalized.replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
    if normalized in {"facil", "media", "dificil", "experto"}:
        return normalized
    return "media"


def _fallback_wrong_options(correct):
    fallback = [
        "um",
        "osa",
        "armus",
        "mora",
        "kulus",
        "num",
        "realizada",
        "buenas",
        "Nox",
    ]
    return [option for option in fallback if option != correct]


def _load_bank():
    try:
        if DATA_PATH.exists():
            payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))

            if isinstance(payload, dict):
                payload = payload.get("items") or payload.get("frases") or payload.get("pool") or []

            if isinstance(payload, list) and payload:
                return payload
    except Exception:
        pass

    return DEFAULT_POOL


def _normalize_item(raw_item):
    raw_item = raw_item or {}

    question = (
        raw_item.get("question")
        or raw_item.get("prompt")
        or raw_item.get("frase")
        or raw_item.get("pregunta")
        or "Hechizo incompleto"
    )

    correct = (
        raw_item.get("correct")
        or raw_item.get("respuestaCorrecta")
        or raw_item.get("answer")
        or raw_item.get("respuesta")
        or ""
    )

    correct = _as_text(correct)
    options = raw_item.get("options") or raw_item.get("opciones") or []
    options = [_as_text(option) for option in options if _as_text(option)]

    if correct and correct not in options:
        options.append(correct)

    for fallback in _fallback_wrong_options(correct):
        if len(options) >= 4:
            break
        if fallback not in options:
            options.append(fallback)

    options = options[:4]

    if correct and correct not in options:
        if options:
            options[-1] = correct
        else:
            options = [correct]

    while len(options) < 4:
        filler = f"Opción {len(options) + 1}"
        if filler not in options:
            options.append(filler)

    return {
        "id": _as_text(raw_item.get("id")) or str(uuid.uuid4()),
        "type": _as_text(raw_item.get("type") or raw_item.get("tipo") or "hechizo"),
        "difficulty": _normalize_difficulty(raw_item.get("difficulty") or raw_item.get("dificultad")),
        "question": _as_text(question),
        "options": options,
        "correct": correct or options[0],
        "narrator_comment": _as_text(
            raw_item.get("narrator_comment")
            or raw_item.get("comentarioNarrador")
            or raw_item.get("comentario")
            or "Pronuncien bien, por favor."
        ),
    }


def _shuffle_options(options):
    shuffled = options[:]
    random.shuffle(shuffled)
    return shuffled


def _elapsed_seconds(state, client_elapsed_ms=None):
    now = time.time()
    started_at = float(state.get("started_at") or now)
    elapsed = max(0, now - started_at)

    if client_elapsed_ms is not None:
        try:
            elapsed = max(0, int(client_elapsed_ms) / 1000)
        except Exception:
            pass

    return elapsed


def build_state(previous_state=None):
    previous_state = previous_state or {}

    streaks = (
        previous_state.get("hechizo_streaks")
        or previous_state.get("streaks")
        or {}
    )

    item = _normalize_item(random.choice(_load_bank()))
    difficulty = item["difficulty"]
    expert_mode = difficulty == "experto"

    story_id = previous_state.get("story", {}).get("story_id")
    narrator_line = STORY_HECHIZO_NARRATOR.get(story_id, random.choice([
        "Pronuncien bien, por favor.",
        "La varita escucha. El problema es que ustedes a veces no.",
        "Siete segundos. Ni Hermione revisaba tan rápido, pero inténtenlo.",
        "Eso no fue latín mágico, eso fue invento de borracho.",
    ]))

    return {
        "phase": PHASE,
        "game_id": GAME_ID,
        "title": "Hechizo Incompleto",
        "subtitle": "Completa el encantamiento antes de que la magia se te vaya chueca",
        "round_id": str(uuid.uuid4()),
        "item_id": item["id"],
        "question_type": item["type"],
        "difficulty": difficulty,
        "question": item["question"],
        "options": _shuffle_options(item["options"]),
        "correct": item["correct"],
        "comment": item["narrator_comment"],
        "narrator": narrator_line,
        "duration_seconds": ROUND_SECONDS,
        "started_at": time.time(),
        "points_correct": POINTS_CORRECT,
        "points_fast": POINTS_FAST,
        "points_streak_5": POINTS_STREAK_5,
        "points_wrong": POINTS_WRONG_EXPERT if expert_mode else POINTS_WRONG_NORMAL,
        "fast_bonus_limit": FAST_BONUS_LIMIT,
        "streak_target": STREAK_TARGET,
        "expert_mode": expert_mode,
        "answers": {},
        "answered": {},
        "last_results": {},
        "hechizo_streaks": streaks,
        "visual": {
            "scene": "enchanted_parchment_spell_class",
            "background": "pergaminos, letras flotantes, chispas de varita, escudos de casas",
            "accent": "golden_spell_sparks",
        },
        "sound_cue": random.choice(["mystery_bell", "spell_hit", "dark_pop", "reveal"]),
        "rules_text": [
            "1. Completa la frase del hechizo lo más rápido que puedas.",
            "2. ¡Tienes poco tiempo, presiona rápido la opción correcta!"
        ],
    }


def score_answer(state, player_name, answer, player_house=None, client_elapsed_ms=None):
    state = state or {}
    player_name = _as_text(player_name)
    answer = _as_text(answer)
    elapsed = _elapsed_seconds(state, client_elapsed_ms)

    answered = state.get("answered") or {}
    answers = state.get("answers") or {}
    last_results = state.get("last_results") or {}
    streaks = state.get("hechizo_streaks") or state.get("streaks") or {}

    if not player_name:
        return {
            "state": state,
            "accepted": False,
            "points": 0,
            "correct": False,
            "late": False,
            "labels": [],
            "message": "Falta el nombre del jugador.",
        }

    if player_name in answered:
        previous = last_results.get(player_name) or answers.get(player_name) or {}
        return {
            "state": state,
            "accepted": False,
            "points": 0,
            "correct": bool(previous.get("correct")),
            "late": bool(previous.get("late")),
            "labels": previous.get("labels", []),
            "elapsed_seconds": previous.get("elapsed_seconds"),
            "message": "Ya habías respondido esta ronda.",
        }

    duration = int(state.get("duration_seconds") or ROUND_SECONDS)
    correct_answer = _as_text(state.get("correct"))
    difficulty = _normalize_difficulty(state.get("difficulty"))
    expert_mode = bool(state.get("expert_mode")) or difficulty == "experto"

    is_late = elapsed > duration
    is_correct = answer == correct_answer

    points = 0
    labels = []

    if is_late:
        is_correct = False
        streaks[player_name] = 0
        labels.append("Fuera de tiempo")

    elif is_correct:
        points += POINTS_CORRECT
        labels.append("+80 correcta")

        if elapsed < FAST_BONUS_LIMIT:
            points += POINTS_FAST
            labels.append("+40 rapidez")

        streaks[player_name] = int(streaks.get(player_name, 0) or 0) + 1

        if streaks[player_name] > 0 and streaks[player_name] % STREAK_TARGET == 0:
            points += POINTS_STREAK_5
            labels.append("+150 racha de 5")

    else:
        streaks[player_name] = 0
        if expert_mode:
            points += POINTS_WRONG_EXPERT
            labels.append("-20 modo experto")
        else:
            points += POINTS_WRONG_NORMAL
            labels.append("Error 0")

    result = {
        "answer": answer,
        "house": player_house,
        "elapsed_seconds": round(elapsed, 2),
        "points": points,
        "correct": is_correct,
        "late": is_late,
        "labels": labels,
        "streak": int(streaks.get(player_name, 0) or 0),
    }

    answered[player_name] = result
    answers[player_name] = result
    last_results[player_name] = result

    state["answered"] = answered
    state["answers"] = answers
    state["last_results"] = last_results
    state["hechizo_streaks"] = streaks

    if is_correct:
        message = random.choice([
            "Correcto, por un momento sonaste como alguien que sí estudió.",
            "Respuesta correcta. La varita no explotó, eso ya es avance.",
            "Bien pronunciado. McGonagall no se decepcionó tanto.",
        ])
    elif is_late:
        message = "Muy tarde. El pergamino ya cerró asistencia."
    else:
        message = "Incorrecto. Eso no fue latín mágico, eso fue invento de borracho."

    return {
        "state": state,
        "accepted": True,
        "points": points,
        "correct": is_correct,
        "late": is_late,
        "labels": labels,
        "elapsed_seconds": round(elapsed, 2),
        "message": message,
    }


def resolve_for_reveal(state, players=None):
    state = state or {}
    answers = state.get("answers") or state.get("answered") or {}

    correct_answers = {
        name: data
        for name, data in answers.items()
        if isinstance(data, dict) and data.get("correct")
    }

    fastest = None
    if correct_answers:
        fastest = min(
            correct_answers.items(),
            key=lambda item: float(item[1].get("elapsed_seconds") or 999),
        )[0]

    state["phase"] = RESULTS_PHASE
    state["hechizo_result"] = {
        "answers": answers,
        "fastest": fastest,
        "correct": state.get("correct"),
        "comment": state.get("comment"),
        "difficulty": state.get("difficulty"),
    }

    point_events = []
    for name, item in answers.items():
        if isinstance(item, dict):
            pts = int(item.get("points") or 0)
            if pts != 0:
                point_events.append({
                    "player_name": name,
                    "points": pts,
                })

    return state, point_events, True


POOL = DEFAULT_POOL
