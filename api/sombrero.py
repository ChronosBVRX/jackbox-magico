import random
import time
import uuid
from fastapi import APIRouter, HTTPException

from api.database import supabase


router = APIRouter()

SOMBRERO_PROMPTS = [
    "¿Quién usaría una capa invisible para no pagar la cuenta?",
    "¿Quién vendería pociones falsas afuera de la escuela?",
    "¿Quién terminaría castigado por contestarle al profesor más serio?",
    "¿Quién sería el primero en intentar un hechizo prohibido y decir que fue accidente?",
    "¿Quién se perdería en una escalera mágica aunque tuviera mapa?",
    "¿Quién usaría magia imperdonable para no lavar los platos?",
    "¿Quién sería el peor mesero en Hogwarts Snacks & Foods por estar en el chisme?",
    "¿Quién fingiría ser prefecto para saltarse la fila?",
    "¿Quién convertiría una clase seria en karaoke mágico?",
    "¿Quién vendería boletos para ver una pelea de fantasmas?",
    "¿Quién se tomaría una poción sin preguntar para qué sirve?",
    "¿Quién haría trampa en Quidditch y todavía pediría aplausos?",
    "¿Quién terminaría adoptando una criatura peligrosa porque ‘se veía tierna’?",
    "¿Quién usaría un giratiempo para dormir cinco minutos más?",
    "¿Quién le pondría salsa a una poción ancestral?",
]

SOMBRERO_LINES = [
    "El sombrero ha hablado, y como siempre, sin tantita prudencia.",
    "Qué sorpresa… bueno, no tanta. El sombrero ya lo veía venir.",
    "La democracia mágica acaba de humillar a alguien con mucho cariño.",
    "El veredicto es cruel, innecesario y absolutamente divertido.",
    "El sombrero no juzga… bueno sí, pero con estilo.",
    "Una votación digna del Gran Comedor y de un grupo de WhatsApp sin moderador.",
    "El elegido ha sido señalado por la comunidad mágica. Qué fuerte.",
    "Ni el Pensadero quería guardar este momento.",
]

POINTS_MOST_VOTED = 120
POINTS_PER_VOTE = 15
POINTS_WINNER_HOUSE = 80
POINTS_ZERO_VOTES = 30


def _now():
    return time.time()


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


def _player_names(players):
    return [player["name"] for player in players]


def _player_house(players, player_name):
    for player in players:
        if player.get("name") == player_name:
            return player.get("house")

    return None


def _empty_vote_counts(options):
    return {name: 0 for name in options}


def build_sombrero_state(room_code: str, previous_state=None, custom_question=None, tied_options=None, tiebreak_round=0):
    previous_state = previous_state or {}

    room = _get_room(room_code)
    players = _get_players(room["id"])

    names = _player_names(players)

    prompt = custom_question or random.choice(SOMBRERO_PROMPTS)

    if tied_options:
        phase = "sombrero_tiebreak"
        question = f"Desempate del Sombrero Burlón: {prompt}"
        options = tied_options
        narrator = "¡Empate! El sombrero exige otra votación porque aparentemente el drama no fue suficiente."
    else:
        phase = "sombrero"
        question = prompt
        options = names
        narrator = "El Sombrero Burlón está listo para destruir amistades con democracia mágica."

    return {
        "phase": phase,
        "game_id": "sombrero_burlon",
        "round_id": str(uuid.uuid4()),
        "title": "Sombrero Burlón",
        "subtitle": "Votación social, sarcasmo mágico y amistades bajo evaluación.",
        "question": question,
        "base_question": prompt,
        "narrator": narrator,
        "players": players,
        "options": options,
        "eligible_voters": names,
        "votes_by_voter": {},
        "votes_by_target": _empty_vote_counts(options),
        "voted_players": [],
        "voted_count": 0,
        "total_voters": len(names),
        "started_at": _now(),
        "tiebreak_round": tiebreak_round,
        "previous_rounds": previous_state.get("previous_rounds", []),
        "point_events": [],
        "sombrero_result": None,
        "correct": None,
        "scored": False,
        "host": previous_state.get("host"),
        "points_most_voted": POINTS_MOST_VOTED,
        "points_per_vote": POINTS_PER_VOTE,
        "points_winner_house": POINTS_WINNER_HOUSE,
        "points_zero_votes": POINTS_ZERO_VOTES,
    }


def submit_vote(state, voter_name, target_name):
    state = state or {}

    if state.get("phase") not in {"sombrero", "sombrero_tiebreak"}:
        return {
            "state": state,
            "accepted": False,
            "message": "El Sombrero Burlón no acepta votos en esta fase.",
        }

    eligible_voters = state.get("eligible_voters", [])
    options = state.get("options", [])

    if voter_name not in eligible_voters:
        return {
            "state": state,
            "accepted": False,
            "message": "No perteneces a esta sala de votación.",
        }

    if target_name == voter_name:
        return {
            "state": state,
            "accepted": False,
            "message": "No puedes votar por ti mismo, mago sospechoso.",
        }

    if target_name not in options:
        return {
            "state": state,
            "accepted": False,
            "message": "Ese jugador no está disponible para esta votación.",
        }

    votes_by_voter = state.get("votes_by_voter", {})
    votes_by_target = state.get("votes_by_target", _empty_vote_counts(options))

    if voter_name in votes_by_voter:
        return {
            "state": state,
            "accepted": True,
            "message": "Ya habías votado. El sombrero no acepta doble chisme.",
        }

    votes_by_voter[voter_name] = target_name
    votes_by_target[target_name] = int(votes_by_target.get(target_name, 0)) + 1

    voted_players = list(votes_by_voter.keys())

    state["votes_by_voter"] = votes_by_voter
    state["votes_by_target"] = votes_by_target
    state["voted_players"] = voted_players
    state["voted_count"] = len(voted_players)

    return {
        "state": state,
        "accepted": True,
        "message": "Voto registrado por el Sombrero Burlón.",
    }


def _add_event(events, player_name, house, points, label):
    events.append({
        "player_name": player_name,
        "house": house,
        "points": points,
        "label": label,
    })


def _top_targets(votes_by_target):
    if not votes_by_target:
        return [], 0

    max_votes = max(votes_by_target.values())

    top = [
        name for name, count in votes_by_target.items()
        if count == max_votes
    ]

    return top, max_votes


def resolve_for_reveal(state):
    state = state or {}

    if state.get("scored"):
        return state, state.get("point_events", []), True

    phase = state.get("phase")
    players = state.get("players", [])
    options = state.get("options", [])
    votes_by_target = state.get("votes_by_target", _empty_vote_counts(options))

    top, top_votes = _top_targets(votes_by_target)

    if phase == "sombrero" and len(top) > 1 and top_votes > 0:
        previous_rounds = state.get("previous_rounds", [])
        previous_rounds.append({
            "question": state.get("question"),
            "votes_by_target": votes_by_target,
            "top": top,
            "top_votes": top_votes,
        })

        new_state = build_sombrero_state(
            room_code="",
            previous_state={
                **state,
                "previous_rounds": previous_rounds,
            },
            custom_question=state.get("base_question"),
            tied_options=top,
            tiebreak_round=1,
        )

        new_state["players"] = players
        new_state["eligible_voters"] = state.get("eligible_voters", [])
        new_state["total_voters"] = state.get("total_voters", len(players))
        new_state["host"] = state.get("host")

        return new_state, [], False

    events = []

    if not votes_by_target or top_votes <= 0:
        for player in players:
            _add_event(
                events,
                player["name"],
                player["house"],
                POINTS_ZERO_VOTES,
                "Mago discreto: cero votos",
            )

        state["phase"] = "results_sombrero"
        state["correct"] = "Nadie fue elegido"
        state["sombrero_result"] = {
            "type": "no_votes",
            "winner": None,
            "winner_house": None,
            "votes": 0,
            "summary": "Nadie recibió votos. El sombrero está decepcionado, pero discretamente.",
            "hat_line": "¿De verdad nadie quiso echar chisme? Qué generación tan prudente.",
            "votes_by_target": votes_by_target,
        }
        state["point_events"] = events
        state["scored"] = True

        return state, events, True

    if len(top) > 1:
        winner = random.choice(top)
        tie_broken_by_hat = True
    else:
        winner = top[0]
        tie_broken_by_hat = False

    winner_house = _player_house(players, winner)

    for player in players:
        name = player["name"]
        house = player["house"]
        votes_received = int(votes_by_target.get(name, 0))

        if votes_received > 0:
            _add_event(
                events,
                name,
                house,
                votes_received * POINTS_PER_VOTE,
                f"{votes_received} voto(s) recibido(s)",
            )

        if votes_received == 0:
            _add_event(
                events,
                name,
                house,
                POINTS_ZERO_VOTES,
                "Mago discreto: cero votos",
            )

    _add_event(
        events,
        winner,
        winner_house,
        POINTS_MOST_VOTED,
        "Jugador más votado",
    )

    _add_event(
        events,
        winner,
        winner_house,
        POINTS_WINNER_HOUSE,
        "Bonus casa del ganador",
    )

    hat_line = random.choice(SOMBRERO_LINES)

    if tie_broken_by_hat:
        hat_line = "El empate fue tan dramático que tuve que decidir yo. Qué agotador ser tan sabio."

    state["phase"] = "results_sombrero"
    state["correct"] = f"{winner} ({top_votes} votos)"
    state["sombrero_result"] = {
        "type": "winner",
        "winner": winner,
        "winner_house": winner_house,
        "votes": top_votes,
        "summary": f"{winner} fue elegido por el Sombrero Burlón con {top_votes} voto(s).",
        "hat_line": hat_line,
        "votes_by_target": votes_by_target,
        "tie_broken_by_hat": tie_broken_by_hat,
    }
    state["point_events"] = events
    state["scored"] = True

    return state, events, True


@router.post("/api/host/{room_code}/start_sombrero")
async def start_sombrero(room_code: str):
    new_state = build_sombrero_state(room_code)

    supabase.table("rooms").update({
        "status": "playing",
        "game_state": new_state,
    }).eq("room_code", room_code.upper()).execute()

    return {"message": "Sombrero Burlón iniciado"}
