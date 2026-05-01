import random
import time
import unicodedata
import uuid
from copy import deepcopy
from typing import Any, Dict, List, Optional

PHASE_BETTING = "copa_final_betting"
PHASE_QUESTION = "copa_final_question"
RESULTS_PHASE = "results_copa_final"
LEGACY_PHASE = "copa_final"
HOUSES = ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"]
WAGER_CHOICES = [0, 100, 200, 300]
ALL_IN_VALUE = "ALL_IN"
ALL_IN_BONUS = 200
DEFAULT_CONFLICT_MODE = "first_wins"
QUESTION_SECONDS_BY_TYPE = {"sabiduria": 22, "valor": 5, "lealtad": 10, "astucia": 18, "memoria": 20, "escena": 18}
NARRATOR_OPENING = [
    "Llegamos al momento donde se separan los magos valientes de los que solo vinieron por papas.",
    "Una sola pregunta puede cambiar la historia de la Copa.",
    "¿Apostarán con inteligencia o con la confianza absurda de un Gryffindor?",
    "La Copa de las Casas está en juego.",
]
STORY_COPA_NARRATOR = {
    "copa_encantada_loca": "La Copa despertó con resaca y exige puntos. Hagan sus apuestas y traten de no enojarla.",
    "peeves_hackeo_trivia": "Peeves se robó los puntos. Si ganan, se los devuelve; si pierden, los usa para comprar bombas fétidas.",
    "ministerio_cancelo_diversion": "Examen final del Ministerio. Cualquier apuesta se tomará como declaración oficial de bienes mágicos.",
    "torneo_cuatro_casas": "La prueba final del Torneo. Pongan en juego su orgullo, su casa y hasta la dignidad de su mascota.",
    "grimorio_excusas_prohibidas": "El Grimorio cerró sus páginas. Ya no hay excusas, solo su respuesta contra el destino.",
    "banquete_hechizos_descompuestos": "El gran postre final. Si se equivocan, los que explotan son ustedes.",
}
HUMILIATIONS = [
    "Todo o nada... y eligieron nada con pasos extra. El Sombrero está evitando contacto visual.",
    "Esa apuesta cayó más fuerte que estudiante bajando las escaleras móviles sin fijarse.",
    "La Copa respetó su valentía, pero no su respuesta. Qué momento tan educativo y tan triste.",
    "Apostaron como campeones y respondieron como si la pregunta estuviera en pársel.",
    "El Gran Comedor acaba de guardar silencio por respeto... y por pena ajena.",
]
FINAL_POOL = [
    {"final_type":"sabiduria","final_label":"Final de Sabiduría","question":"¿Qué objeto destruye Harry con el colmillo del basilisco dentro de la Cámara Secreta?","options":["El diario de Tom Riddle","El guardapelo de Slytherin","La copa de Hufflepuff","La diadema de Ravenclaw"],"correct":"El diario de Tom Riddle","explanation":"En la Cámara Secreta, Harry usa el colmillo del basilisco para destruir el diario de Tom Riddle.","narrator":"Final de Sabiduría: aquí no gana quien grita más fuerte, sino quien sí puso atención entre papas y refresco."},
    {"final_type":"valor","final_label":"Final de Valor","question":"Respuesta en 5 segundos: ¿qué hechizo se usa para desarmar al oponente?","options":["Expelliarmus","Lumos","Accio","Alohomora"],"correct":"Expelliarmus","explanation":"Expelliarmus es el encantamiento desarmador más reconocido en los duelos.","narrator":"Final de Valor: cinco segundos. Ni el Ministerio responde tan rápido, pero ustedes sí tienen que hacerlo."},
    {"final_type":"lealtad","final_label":"Final de Lealtad","question":"Sin hablar entre ustedes: ¿qué cualidad representa mejor a Hufflepuff?","options":["Lealtad","Ambición","Ingenio","Temeridad"],"correct":"Lealtad","explanation":"Hufflepuff se asocia con la lealtad, el trabajo honesto y la constancia.","narrator":"Final de Lealtad: si los dos integrantes no coinciden, el castillo sospechará desorganización emocional.","conflict_mode":"mark_conflict"},
    {"final_type":"astucia","final_label":"Final de Astucia","question":"Pregunta con trampa: si una capa de invisibilidad te vuelve invisible, ¿qué NO oculta necesariamente?","options":["El ruido que haces","Tu sombra mágica","El color de tus calcetas","El tamaño de tu varita"],"correct":"El ruido que haces","explanation":"Ser invisible no significa ser silencioso. La astucia también consiste en no caminar como hipogrifo con botas.","narrator":"Final de Astucia: cuidado, la respuesta correcta está escondida como excusa de alumno que no estudió."},
    {"final_type":"memoria","final_label":"Final de Memoria","question":"Recuerda la secuencia mágica mostrada: ¿cuál fue el orden correcto?","sequence":["🪄 Varita","📖 Diario","🏆 Copa","🦉 Lechuza"],"options":["Varita → Diario → Copa → Lechuza","Diario → Varita → Lechuza → Copa","Copa → Varita → Diario → Lechuza","Lechuza → Copa → Diario → Varita"],"correct":"Varita → Diario → Copa → Lechuza","explanation":"La secuencia correcta era Varita, Diario, Copa y Lechuza.","narrator":"Final de Memoria: el castillo mostrará una secuencia. No parpadeen como si fuera final de telenovela."},
    {"final_type":"escena","final_label":"Pregunta de Escena","question":"En la primera película, ¿qué pieza de ajedrez mágico queda asociada al sacrificio de Ron?","options":["El caballo","La reina","La torre","El alfil"],"correct":"El caballo","explanation":"Ron juega como caballo y se sacrifica para que Harry pueda continuar.","narrator":"Pregunta de escena: si no recuerdan esto, mínimo respondan con dignidad teatral."},
]


def _shuffle_options(options: List[str]) -> List[str]:
    shuffled = list(options or [])
    random.shuffle(shuffled)
    return shuffled


def normalize_text(value: Any) -> str:
    text = str(value or "").strip().lower()
    text = "".join(char for char in unicodedata.normalize("NFD", text) if unicodedata.category(char) != "Mn")
    return " ".join(text.replace("→", "->").split())


def _private_store(state: dict) -> dict:
    private = state.get("correct") if isinstance(state.get("correct"), dict) else {}
    private.setdefault("answer", private.get("answer") or state.get("correct_label"))
    private.setdefault("question_payload", private.get("question_payload") or {})
    private.setdefault("wagers_by_house", {})
    private.setdefault("wagers_by_player", {})
    state["correct"] = private
    return private


def _public_wager_status(private_wagers: dict) -> dict:
    return {house: {"sealed": True, "house": house, "submitted_by": entry.get("submitted_by"), "submitted_at": entry.get("submitted_at"), "auto": bool(entry.get("auto"))} for house, entry in (private_wagers or {}).items()}


def build_state(previous_state: Optional[dict] = None) -> dict:
    item = deepcopy(random.choice(FINAL_POOL))
    final_type = item.get("final_type", "sabiduria")
    duration = int(item.get("duration_seconds") or QUESTION_SECONDS_BY_TYPE.get(final_type, 18))
    
    story_id = (previous_state or {}).get("story", {}).get("story_id")
    narrator_line = STORY_COPA_NARRATOR.get(story_id) or item.get("narrator") or random.choice(NARRATOR_OPENING)

    payload = {"final_type": final_type, "final_label": item.get("final_label", "Pregunta Final"), "question": item.get("question"), "options": _shuffle_options(item.get("options", [])), "sequence": item.get("sequence", []), "explanation": item.get("explanation", ""), "narrator": narrator_line, "duration_seconds": duration}
    return {
        "phase": PHASE_BETTING,
        "game_id": "copa_final",
        "title": "Copa de las Casas: Pregunta Final",
        "subtitle": "Ronda final con apuesta secreta por casa",
        "round_id": str(uuid.uuid4()),
        "created_at": time.time(),
        "started_at": time.time(),
        "betting_started_at": time.time(),
        "question_started_at": None,
        "duration_seconds": duration,
        "final_type": final_type,
        "final_label": item.get("final_label", "Pregunta Final"),
        "question_hidden": True,
        "question": "Apuestas secretas en curso. La pregunta final se revelará cuando el host lo decida.",
        "options": [],
        "correct": {"answer": item.get("correct"), "question_payload": payload, "wagers_by_house": {}, "wagers_by_player": {}},
        "narrator": random.choice(NARRATOR_OPENING),
        "intro_lines": NARRATOR_OPENING,
        "wager_options": [{"label":"0 puntos","value":0,"all_in":False,"tone":"safe"},{"label":"100 puntos","value":100,"all_in":False,"tone":"low"},{"label":"200 puntos","value":200,"all_in":False,"tone":"medium"},{"label":"300 puntos","value":300,"all_in":False,"tone":"high"},{"label":"Todo o nada","value":ALL_IN_VALUE,"all_in":True,"tone":"legendary"}],
        "wager_status_by_house": {},
        "answered": {},
        "house_answers": {},
        "answer_conflicts": {},
        "settings": {"conflict_mode": item.get("conflict_mode", DEFAULT_CONFLICT_MODE), "cap_wager_to_house_score": True, "missing_wager_defaults_to_zero": True, "all_in_bonus": ALL_IN_BONUS},
        "visual": {"scene":"great_hall_final_ceremony","background":"Gran Comedor, copa brillante, velas flotantes, escudos de casas, luz dorada cinematográfica","accent":"gold_epic_finale"},
        "sound_cue": "reveal",
        "rules_text": [
            "1. Esta es la última oportunidad de ganar puntos.",
            "2. Apuesta cuántos puntos quieres arriesgar de tu casa.",
            "3. Si aciertas ganas lo apostado, si fallas lo pierdes."
        ],
    }


def house_scores(players: List[dict]) -> Dict[str, int]:
    scores = {house: 0 for house in HOUSES}
    for player in players or []:
        house = player.get("house")
        scores[house] = scores.get(house, 0) + int(player.get("score") or 0)
    return scores


def house_members(players: List[dict], house: str) -> List[dict]:
    return [player for player in players or [] if player.get("house") == house]


def active_houses(players: List[dict]) -> List[str]:
    return [house for house in HOUSES if house_members(players, house)]


def get_player_house(players: List[dict], player_name: str) -> Optional[str]:
    for player in players or []:
        if player.get("name") == player_name:
            return player.get("house")
    return None


def normalize_wager_value(value: Any) -> Any:
    text = str(value).strip().upper()
    if text in {"ALL_IN", "TODO", "TODO_O_NADA", "TODO O NADA", "ALL"}:
        return ALL_IN_VALUE
    try:
        return int(value)
    except Exception:
        return value


def resolve_wager_amount(value: Any, house_score: int, cap_to_score: bool = True) -> dict:
    selected = normalize_wager_value(value)
    house_score = max(0, int(house_score or 0))
    if selected == ALL_IN_VALUE:
        return {"raw": ALL_IN_VALUE, "amount": house_score, "all_in": True, "label": "Todo o nada", "capped": False}
    if selected not in WAGER_CHOICES:
        raise ValueError("Apuesta inválida. Usa 0, 100, 200, 300 o Todo o nada.")
    capped_amount = min(int(selected), house_score) if cap_to_score else int(selected)
    return {"raw": int(selected), "amount": int(capped_amount), "all_in": False, "label": f"{int(selected)} puntos", "capped": int(capped_amount) != int(selected)}


def submit_wager(state: dict, player_name: str, player_house: str, wager: Any, players: List[dict]) -> dict:
    state = deepcopy(state or {})
    if state.get("phase") != PHASE_BETTING:
        return {"state": state, "accepted": False, "message": "Las apuestas ya se cerraron."}
    if not player_house:
        return {"state": state, "accepted": False, "message": "No se encontró tu casa en esta sala."}
    scores = house_scores(players)
    cap_to_score = bool((state.get("settings") or {}).get("cap_wager_to_house_score", True))
    try:
        wager_info = resolve_wager_amount(wager, scores.get(player_house, 0), cap_to_score)
    except ValueError as error:
        return {"state": state, "accepted": False, "message": str(error)}
    private = _private_store(state)
    wagers_by_house = private.get("wagers_by_house") or {}
    wagers_by_player = private.get("wagers_by_player") or {}
    if player_house in wagers_by_house:
        return {"state": state, "accepted": True, "already_submitted": True, "message": f"{player_house} ya selló su apuesta. La primera decisión se conserva.", "wager": {"sealed": True}}
    entry = {**wager_info, "house": player_house, "submitted_by": player_name, "submitted_at": time.time(), "house_score_at_bet": int(scores.get(player_house, 0))}
    wagers_by_house[player_house] = entry
    wagers_by_player[player_name] = entry
    private["wagers_by_house"] = wagers_by_house
    private["wagers_by_player"] = wagers_by_player
    state["wager_status_by_house"] = _public_wager_status(wagers_by_house)
    state["narrator"] = random.choice(["Apuesta sellada. El castillo guarda secretos mejor que un grupo de WhatsApp familiar.", "La casa ha apostado. Ahora toca fingir tranquilidad.", "Apuesta recibida. La Copa acaba de ponerse interesante."])
    message = f"Apuesta registrada para {player_house}: {entry['label']}"
    if entry.get("capped"):
        message += f". Se ajustó a {entry['amount']} por puntos disponibles."
    return {"state": state, "accepted": True, "message": message, "wager": entry}


def fill_missing_wagers(state: dict, players: List[dict]) -> dict:
    state = deepcopy(state or {})
    private = _private_store(state)
    wagers_by_house = private.get("wagers_by_house") or {}
    scores = house_scores(players)
    for house in active_houses(players):
        if house not in wagers_by_house:
            wagers_by_house[house] = {"raw": 0, "amount": 0, "all_in": False, "label": "0 puntos", "capped": False, "house": house, "submitted_by": None, "submitted_at": time.time(), "house_score_at_bet": int(scores.get(house, 0)), "auto": True}
    private["wagers_by_house"] = wagers_by_house
    state["wager_status_by_house"] = _public_wager_status(wagers_by_house)
    return state


def open_question(state: dict, players: List[dict]) -> dict:
    state = deepcopy(state or {})
    if state.get("phase") == PHASE_QUESTION:
        return {"state": state, "accepted": True, "already_open": True, "message": "La pregunta final ya está abierta."}
    if state.get("phase") != PHASE_BETTING:
        return {"state": state, "accepted": False, "message": "La Copa Final no está en fase de apuestas."}
    state = fill_missing_wagers(state, players)
    private = _private_store(state)
    payload = private.get("question_payload") or {}
    state["phase"] = PHASE_QUESTION
    state["question_hidden"] = False
    state["question"] = payload.get("question") or "Pregunta final"
    state["options"] = payload.get("options") or []
    state["sequence"] = payload.get("sequence") or []
    state["question_started_at"] = time.time()
    state["started_at"] = time.time()
    state["duration_seconds"] = int(payload.get("duration_seconds") or state.get("duration_seconds") or 18)
    state["narrator"] = payload.get("narrator") or "La Copa de las Casas está en juego."
    state["sound_cue"] = "reveal"
    return {"state": state, "accepted": True, "message": "Pregunta final revelada."}


def submit_house_answer(state: dict, player_name: str, player_house: str, answer: Any, client_elapsed_ms: Optional[int] = None) -> dict:
    state = deepcopy(state or {})
    if state.get("phase") != PHASE_QUESTION:
        return {"state": state, "accepted": False, "message": "La pregunta final todavía no acepta respuestas."}
    if not player_house:
        return {"state": state, "accepted": False, "message": "No se encontró tu casa en esta sala."}
    answer_text = str(answer or "").strip()
    if not answer_text:
        return {"state": state, "accepted": False, "message": "Respuesta vacía."}
    house_answers = state.get("house_answers") or {}
    answered = state.get("answered") or {}
    conflicts = state.get("answer_conflicts") or {}
    conflict_mode = (state.get("settings") or {}).get("conflict_mode", DEFAULT_CONFLICT_MODE)
    elapsed_seconds = None
    if client_elapsed_ms is not None:
        try:
            elapsed_seconds = max(0, int(client_elapsed_ms) / 1000)
        except Exception:
            pass
    if player_house not in house_answers:
        house_answers[player_house] = {"house": player_house, "answer": answer_text, "submitted_by": player_name, "submitted_at": time.time(), "elapsed_seconds": elapsed_seconds, "responses": {player_name: answer_text}}
        answered[player_name] = {"house": player_house, "answer": answer_text, "accepted_as_house_answer": True}
        message = "Respuesta de casa enviada."
    else:
        current = house_answers[player_house]
        current.setdefault("responses", {})[player_name] = answer_text
        answered[player_name] = {"house": player_house, "answer": answer_text, "accepted_as_house_answer": False}
        if normalize_text(current.get("answer")) != normalize_text(answer_text):
            conflicts[player_house] = {"house": player_house, "first_answer": current.get("answer"), "new_answer": answer_text, "first_by": current.get("submitted_by"), "conflict_by": player_name, "mode": conflict_mode}
            message = "Conflicto registrado entre integrantes de la casa." if conflict_mode == "mark_conflict" else "Respuesta recibida; se conserva la primera respuesta de la casa."
        else:
            message = "Ambos integrantes coincidieron. Lealtad desbloqueada."
        house_answers[player_house] = current
    state["house_answers"] = house_answers
    state["answered"] = answered
    state["answer_conflicts"] = conflicts
    return {"state": state, "accepted": True, "message": message}


def _split_delta(delta: int, members: List[dict]) -> List[dict]:
    if not members or delta == 0:
        return []
    total, count = int(delta), len(members)
    base = int(total / count)
    remainder = total - base * count
    events = []
    for member in members:
        points = base
        if remainder:
            step = 1 if remainder > 0 else -1
            points += step
            remainder -= step
        events.append({"player_name": member.get("name"), "house": member.get("house"), "points": points, "reason": "copa_final_house_delta"})
    return events


def reveal_results(state: dict, players: List[dict]) -> dict:
    state = deepcopy(state or {})
    if state.get("phase") == RESULTS_PHASE and state.get("copa_final_result"):
        return {"state": state, "accepted": True, "already_revealed": True, "result": state.get("copa_final_result")}
    if state.get("phase") != PHASE_QUESTION:
        return {"state": state, "accepted": False, "message": "No se puede revelar: la pregunta final no está activa."}
    state = fill_missing_wagers(state, players)
    private = _private_store(state)
    wagers = private.get("wagers_by_house") or {}
    payload = private.get("question_payload") or {}
    answers = state.get("house_answers") or {}
    conflicts = state.get("answer_conflicts") or {}
    conflict_mode = (state.get("settings") or {}).get("conflict_mode", DEFAULT_CONFLICT_MODE)
    correct_answer = private.get("answer")
    house_results, point_events = [], []
    for house in active_houses(players):
        wager = wagers.get(house) or {"amount": 0, "all_in": False, "label": "0 puntos"}
        entry = answers.get(house)
        conflict = conflicts.get(house)
        forced_wrong = bool(conflict and conflict_mode == "mark_conflict")
        answer_text = entry.get("answer") if entry else None
        is_correct = bool(answer_text) and normalize_text(answer_text) == normalize_text(correct_answer) and not forced_wrong
        amount = int(wager.get("amount") or 0)
        all_in = bool(wager.get("all_in"))
        bonus = ALL_IN_BONUS if is_correct and all_in and amount > 0 else 0
        delta = (amount if is_correct else -amount) + bonus
        members = house_members(players, house)
        events = _split_delta(delta, members)
        point_events.extend(events)
        narrator = None
        if all_in and not is_correct and amount > 0:
            narrator = random.choice(HUMILIATIONS)
        elif is_correct and all_in and amount > 0:
            narrator = "Todo o nada y encima con clase. Esa jugada merece que las velas aplaudan."
        elif is_correct and amount == 0:
            narrator = "Correcto, pero sin apuesta. Conservador como profesor cuidando su quincena."
        elif not is_correct and amount == 0:
            narrator = "Fallaron, pero no perdieron puntos. Cobardía útil, dirían algunos."
        house_results.append({"house": house, "answer": answer_text, "correct": is_correct, "forced_wrong_by_conflict": forced_wrong, "conflict": conflict, "correct_answer": correct_answer, "wager": wager, "delta": delta, "bonus": bonus, "point_events": events, "narrator": narrator})
    house_results.sort(key=lambda item: item.get("delta", 0), reverse=True)
    result = {"title": "Resultado de la Pregunta Final", "final_label": state.get("final_label"), "final_type": state.get("final_type"), "question": state.get("question"), "correct_answer": correct_answer, "explanation": payload.get("explanation"), "houses": house_results, "largest_gain": max([item.get("delta", 0) for item in house_results] or [0]), "largest_loss": min([item.get("delta", 0) for item in house_results] or [0]), "revealed_at": time.time(), "narrator": "La Copa de las Casas ha escuchado sus apuestas. Algunas fueron estrategia; otras, contenido para terapia."}
    state["phase"] = RESULTS_PHASE
    state["question_hidden"] = False
    state["copa_final_result"] = result
    state["last_results"] = {item["house"]: item for item in house_results}
    state["point_events"] = point_events
    state["correct_label"] = correct_answer
    state["narrator"] = result["narrator"]
    state["revealed_wagers_by_house"] = wagers
    state.pop("correct", None)
    return {"state": state, "accepted": True, "already_revealed": False, "result": result}
