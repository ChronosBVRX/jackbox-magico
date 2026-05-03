import random
import time
import uuid
from fastapi import APIRouter, HTTPException

from api.database import supabase


router = APIRouter()

# Categorized Prompts Bank (150+ questions)
SOMBRERO_PROMPTS_BANK = {
    "familiar": [
        "¿Quién usaría magia para no levantarse por el control remoto?",
        "¿Quién llegaría tarde al Expreso de Hogwarts aunque viva enfrente?",
        "¿Quién perdería su varita y culparía a un elfo doméstico?",
        "¿Quién intentaría hacer una poción siguiendo un tutorial de TikTok?",
        "¿Quién adoptaría una criatura mágica sin leer las instrucciones?",
        "¿Quién se dormiría en clase de Historia de la Magia y despertaría aplaudiendo?",
        "¿Quién usaría Accio para traer la comida desde la cocina?",
        "¿Quién se pondría la túnica al revés y diría que es moda europea?",
        "¿Quién preguntaría si los dementores aceptan transferencia?",
        "¿Quién llevaría lonche al Gran Comedor por si no le gusta la comida?",
        "¿Quién usaría un giratiempo para dormir cinco minutos más?",
        "¿Quién tendría una varita solo para cambiarle a la tele?",
        "¿Quién pediría permiso para entrar al Bosque Prohibido?",
        "¿Quién llevaría suéter aunque el dragón esté echando fuego?",
        "¿Quién le pondría nombre cariñoso a una escoba?",
    ],
    "chisme": [
        "¿Quién sería el primero en decir “yo no fui” antes de que pase algo?",
        "¿Quién escucharía un secreto y lo llamaría información de interés público?",
        "¿Quién sería retrato chismoso en un pasillo de Hogwarts?",
        "¿Quién sabría todos los rumores pero juraría que no se mete en nada?",
        "¿Quién diría “no quiero opinar” y luego daría un discurso de 20 minutos?",
        "¿Quién tendría un grupo secreto para hablar del otro grupo secreto?",
        "¿Quién sería el informante oficial del Sombrero Burlón?",
        "¿Quién diría “te lo digo porque te quiero” antes de quemar a alguien?",
        "¿Quién leería el chat completo y fingiría que apenas se enteró?",
        "¿Quién usaría un Pensadero solo para guardar chismes?",
        "¿Quién sería capaz de decir “yo no digo nada” y decirlo todo?",
        "¿Quién tendría el chisme antes que El Profeta?",
        "¿Quién sería administrador de un grupo de WhatsApp mágico sin permiso?",
        "¿Quién preguntaría “¿qué pasó?” aunque ya sabe todo?",
        "¿Quién convertiría una noticia pequeña en escándalo de castillo?",
    ],
    "restaurante": [
        "¿Quién pediría algo “solo para probar” y terminaría comiéndose la mitad?",
        "¿Quién diría “no tengo hambre” y luego robaría papas?",
        "¿Quién se acabaría la cerveza de mantequilla y culparía a Peeves?",
        "¿Quién pediría la cuenta y desaparecería con capa invisible?",
        "¿Quién haría sobremesa de tres horas con una sola bebida?",
        "¿Quién le tomaría foto a la comida hasta que se enfríe?",
        "¿Quién pediría “lo de siempre” aunque nunca haya ido?",
        "¿Quién se sentaría en la mejor mesa y actuaría como prefecto?",
        "¿Quién pediría postre diciendo que es “para compartir” y no compartiría?",
        "¿Quién intentaría pagar con galeones falsos?",
        "¿Quién pediría salsa para una poción ancestral?",
        "¿Quién preguntaría si la cerveza de mantequilla tiene refill?",
        "¿Quién llegaría “solo a saludar” y se quedaría a cenar?",
        "¿Quién se llevaría el último pedazo sin preguntar?",
        "¿Quién pediría recomendación y luego ordenaría lo mismo de siempre?",
    ],
    "caos": [
        "¿Quién lanzaría un hechizo sin saber pronunciarlo?",
        "¿Quién abriría una puerta prohibida solo porque decía “no abrir”?",
        "¿Quién mezclaría pociones para ver “qué pasa”?",
        "¿Quién sería expulsado de clase por hacer reír al profesor?",
        "¿Quién invocaría algo peligroso y diría “qué bonito perrito”?",
        "¿Quién usaría magia para ganar una discusión absurda?",
        "¿Quién convertiría una reunión tranquila en juicio mágico?",
        "¿Quién prendería una vela flotante y casi incendiaría el castillo?",
        "¿Quién entraría al Bosque Prohibido con chanclas?",
        "¿Quién haría un plan malísimo pero con mucha seguridad?",
        "¿Quién usaría un hechizo prohibido para abrir una bolsa de papas?",
        "¿Quién sería el primero en tocar el botón rojo del Ministerio?",
        "¿Quién rompería una reliquia y diría que ya estaba así?",
        "¿Quién causaría caos y luego preguntaría “¿qué hice?”",
        "¿Quién haría explotar el caldero y pediría otra oportunidad?",
    ],
    "sospechoso": [
        "¿Quién tendría más cara de esconder un ingrediente explosivo?",
        "¿Quién sonreiría demasiado antes de traicionar a su casa?",
        "¿Quién sería interrogado por el Ministerio solo por su actitud?",
        "¿Quién diría “confía en mí” y automáticamente nadie confiaría?",
        "¿Quién vendería mapas falsos del castillo?",
        "¿Quién cambiaría las reglas del juego si va perdiendo?",
        "¿Quién culparía a su varita por todas sus malas decisiones?",
        "¿Quién aparecería justo cuando desaparece el pastel?",
        "¿Quién sería el principal sospechoso aunque no haya hecho nada?",
        "¿Quién tiene vibra de villano, pero de bajo presupuesto?",
        "¿Quién escondería pruebas en la Sala de los Menesteres?",
        "¿Quién tendría coartada preparada antes del problema?",
        "¿Quién parece inocente, pero el Sombrero no le cree nada?",
        "¿Quién sería capaz de sabotear y luego ayudar a investigar?",
        "¿Quién tendría cara de “yo sé algo, pero no diré nada”?",
    ],
    "amigos": [
        "¿Quién sería el líder del grupo aunque nadie lo eligió?",
        "¿Quién organizaría todo y aun así llegaría tarde?",
        "¿Quién diría “vámonos temprano” y sería el último en irse?",
        "¿Quién se perdería aunque todos caminen juntos?",
        "¿Quién pediría silencio y luego sería quien más habla?",
        "¿Quién haría una promesa dramática y la olvidaría en cinco minutos?",
        "¿Quién se tomaría demasiado en serio una dinámica de juego?",
        "¿Quién reclamaría puntos como si estuviera en juicio?",
        "¿Quién festejaría una victoria mínima como si ganó la Copa de las Casas?",
        "¿Quién sería capaz de hacer trampa y sentirse orgulloso?",
        "¿Quién haría una alianza y la rompería en la siguiente ronda?",
        "¿Quién diría “yo los cuido” y se perdería primero?",
        "¿Quién llevaría snacks y los escondería?",
        "¿Quién sería el primero en pedir revancha?",
        "¿Quién convencería a todos de un plan que ni entiende?",
    ],
    "escuela_magica": [
        "¿Quién copiaría la tarea con una pluma encantada?",
        "¿Quién llegaría a clase sin libro, sin varita y sin vergüenza?",
        "¿Quién intentaría sobornar al Sombrero Seleccionador?",
        "¿Quién se sentaría hasta atrás para no participar?",
        "¿Quién sería prefecto solo para regañar a los demás?",
        "¿Quién reprobaría Pociones por improvisar demasiado?",
        "¿Quién sería excelente en Encantamientos pero pésimo en sentido común?",
        "¿Quién usaría magia para evitar hacer exposición?",
        "¿Quién pediría prórroga para una tarea que nunca empezó?",
        "¿Quién convertiría una clase seria en concurso de memes?",
        "¿Quién se aprendería el hechizo incorrecto con mucha seguridad?",
        "¿Quién preguntaría si la tarea cuenta para calificación cuando ya terminó la clase?",
        "¿Quién llevaría acordeón mágico al examen?",
        "¿Quién sería castigado por hablar con los retratos en clase?",
        "¿Quién entraría a la biblioteca solo para tomarse fotos?",
    ],
    "dramatico": [
        "¿Quién actuaría como si perder 10 puntos fuera tragedia nacional?",
        "¿Quién haría una entrada dramática aunque solo va al baño?",
        "¿Quién narraría su propia derrota como película épica?",
        "¿Quién lloraría por perder y luego pediría revancha inmediata?",
        "¿Quién diría “esto no se queda así” después de una votación?",
        "¿Quién tendría discurso preparado para cuando gane?",
        "¿Quién se ofendería porque el Sombrero dijo la verdad?",
        "¿Quién pediría recuento de votos mágicos?",
        "¿Quién haría campaña para no ser votado?",
        "¿Quién se tomaría una broma como si fuera decreto del Ministerio?",
        "¿Quién pondría música triste después de perder?",
        "¿Quién pediría una disculpa pública del Sombrero?",
        "¿Quién diría “me retiro del torneo” y volvería a los dos minutos?",
        "¿Quién haría mirada intensa antes de votar?",
        "¿Quién convertiría un empate en novela de tres temporadas?",
    ],
    "ridiculo": [
        "¿Quién usaría un hechizo para acomodarse el fleco?",
        "¿Quién pediría una varita con Bluetooth?",
        "¿Quién intentaría domesticar una escoba rebelde hablándole bonito?",
        "¿Quién le pondría nombre a su caldero?",
        "¿Quién se retaría solo a un duelo y perdería?",
        "¿Quién le pediría consejos amorosos a un retrato?",
        "¿Quién haría fila para entrar a Azkaban solo por curiosidad?",
        "¿Quién compraría una capa invisible en oferta y se quejaría porque no la encuentra?",
        "¿Quién confundiría una poción poderosa con clericot?",
        "¿Quién usaría un hechizo ancestral para abrir una bolsa de papas?",
        "¿Quién le pondría funda a su varita?",
        "¿Quién intentaría cargar su escoba por USB?",
        "¿Quién usaría “Lumos” para buscar el celular que trae en la mano?",
        "¿Quién se asustaría con su propio Patronus?",
        "¿Quién pediría instrucciones para usar una puerta mágica?",
    ],
    "secreto": [
        "¿Quién sería el más probable de culpar a otro y salirse con la suya?",
        "¿Quién parece inocente, pero no le creemos nada?",
        "¿Quién sería capaz de vender una poción caducada con buena publicidad?",
        "¿Quién sería el más peligroso si tuviera una varita de verdad?",
        "¿Quién sería el primero en abandonar una misión cuando se pone difícil?",
        "¿Quién se ve más confiable, pero es el verdadero problema?",
        "¿Quién tiene cara de saber más de lo que dice?",
        "¿Quién haría una alianza y la rompería cinco minutos después?",
        "¿Quién tiene más probabilidades de causar caos por accidente?",
        "¿Quién sería juzgado injustamente… pero igual algo hizo?",
        "¿Quién escondería el último postre y actuaría ofendido?",
        "¿Quién sería capaz de cambiar votos con una sonrisa?",
        "¿Quién convencería a todos de que el culpable es otro?",
        "¿Quién parece héroe, pero tiene energía de villano secundario?",
        "¿Quién merece una investigación del Ministerio por actitud sospechosa?",
    ]
}

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

# Updated Points for 3-round format
POINTS_MOST_VOTED_ROUND = 60
POINTS_PER_VOTE_ROUND = 10
POINTS_ZERO_VOTES_ROUND = 15
POINTS_OVERALL_WINNER = 100
POINTS_OVERALL_WINNER_HOUSE = 60


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


def _get_random_prompt(round_index, used_ids):
    # Difficulty/Chaos progression
    if round_index == 0:
        categories = ["familiar", "ridiculo", "escuela_magica"]
    elif round_index == 1:
        categories = ["chisme", "sospechoso", "restaurante", "amigos"]
    else:
        categories = ["caos", "dramatico", "secreto", "sospechoso"]

    eligible_prompts = []
    for cat in categories:
        for p in SOMBRERO_PROMPTS_BANK.get(cat, []):
            p_id = f"{cat}_{p[:20]}" # Simple ID
            if p_id not in used_ids:
                eligible_prompts.append({"id": p_id, "text": p, "category": cat, "secret": cat == "secreto"})

    if not eligible_prompts:
        # Reset if empty
        cat = random.choice(list(SOMBRERO_PROMPTS_BANK.keys()))
        p = random.choice(SOMBRERO_PROMPTS_BANK[cat])
        return {"id": "reset_" + str(uuid.uuid4())[:8], "text": p, "category": cat, "secret": cat == "secreto"}

    return random.choice(eligible_prompts)


def build_sombrero_state(room_code: str, previous_state=None, round_index=0):
    previous_state = previous_state or {}

    room_id_internal = previous_state.get("room_id_internal")
    if not room_id_internal:
        room = _get_room(room_code)
        room_id_internal = room["id"]

    players = _get_players(room_id_internal)
    names = _player_names(players)

    used_ids = previous_state.get("used_prompt_ids", [])
    prompt = _get_random_prompt(round_index, used_ids)
    used_ids.append(prompt["id"])

    return {
        "phase": "sombrero",
        "game_id": "sombrero_burlon",
        "round_id": str(uuid.uuid4()),
        "title": "Sombrero Burlón",
        "subtitle": f"Pregunta {round_index + 1} de 3",
        "question": prompt["text"],
        "current_prompt": prompt,
        "sombrero_round_index": round_index,
        "sombrero_total_rounds": 3,
        "sombrero_rounds": previous_state.get("sombrero_rounds", []),
        "used_prompt_ids": used_ids,
        "options": names,
        "eligible_voters": names,
        "votes_by_voter": {},
        "votes_by_target": _empty_vote_counts(names),
        "voted_players": [],
        "voted_count": 0,
        "total_voters": len(names),
        "started_at": _now(),
        "duration_seconds": 25,
        "round_reveal": None,
        "round_reveal_started_at": None,
        "round_reveal_seconds": 6,
        "point_events": previous_state.get("point_events", []),
        "room_id_internal": room_id_internal,
        "room_code_internal": room_code.upper(),
        "scored": False,
    }


def submit_vote(state, voter_name, target_name):
    state = state or {}

    if state.get("phase") != "sombrero" or state.get("round_reveal"):
        return {
            "state": state,
            "accepted": False,
            "message": "El Sombrero Burlón no acepta votos en este momento.",
        }

    eligible_voters = state.get("eligible_voters", [])
    options = state.get("options", [])

    if voter_name not in eligible_voters:
        return {"state": state, "accepted": False, "message": "No perteneces a esta sala."}

    if target_name == voter_name:
        return {"state": state, "accepted": False, "message": "No puedes votar por ti mismo."}

    if target_name not in options:
        return {"state": state, "accepted": False, "message": "Ese jugador no está disponible."}

    votes_by_voter = state.get("votes_by_voter", {})
    if voter_name in votes_by_voter:
        return {"state": state, "accepted": True, "message": "Ya habías votado."}

    votes_by_voter[voter_name] = target_name
    votes_by_target = state.get("votes_by_target", {})
    votes_by_target[target_name] = int(votes_by_target.get(target_name, 0)) + 1

    state["votes_by_voter"] = votes_by_voter
    state["votes_by_target"] = votes_by_target
    state["voted_players"] = list(votes_by_voter.keys())
    state["voted_count"] = len(state["voted_players"])

    return {
        "state": state,
        "accepted": True,
        "message": "Voto registrado.",
    }


def _top_targets(votes_by_target):
    if not votes_by_target:
        return [], 0
    max_votes = max(votes_by_target.values())
    if max_votes == 0:
        return [], 0
    top = [name for name, count in votes_by_target.items() if count == max_votes]
    return top, max_votes


def resolve_for_reveal(state):
    state = state or {}
    if state.get("scored"):
        return state, state.get("point_events", []), True

    # If we are already in a partial reveal, it means we want to advance to the next round
    if state.get("round_reveal"):
        current_index = state.get("sombrero_round_index", 0)
        if current_index < 2:
            next_state = build_sombrero_state(
                room_code=state.get("room_code_internal", ""),
                previous_state=state,
                round_index=current_index + 1
            )
            return next_state, [], False
        else:
            # This shouldn't be reached as round 3 goes to results_sombrero
            pass

    players = state.get("players", [])
    votes_by_target = state.get("votes_by_target", {})
    top, top_votes = _top_targets(votes_by_target)

    # Tie-breaking by Hat (randomly)
    winner = random.choice(top) if top else None
    tie_broken_by_hat = len(top) > 1

    # Record point events for this sub-round
    round_events = []
    if not winner:
        for p in players:
            round_events.append({"player_name": p["name"], "house": p["house"], "points": POINTS_ZERO_VOTES_ROUND, "label": "Mago discreto (0 votos)"})
    else:
        for p in players:
            v_received = votes_by_target.get(p["name"], 0)
            if v_received > 0:
                round_events.append({"player_name": p["name"], "house": p["house"], "points": v_received * POINTS_PER_VOTE_ROUND, "label": f"{v_received} votos recibidos"})
            else:
                round_events.append({"player_name": p["name"], "house": p["house"], "points": POINTS_ZERO_VOTES_ROUND, "label": "Mago discreto (0 votos)"})
        
        winner_house = _player_house(players, winner)
        round_events.append({"player_name": winner, "house": winner_house, "points": POINTS_MOST_VOTED_ROUND, "label": "Elegido por el Sombrero"})

    # Store sub-round result
    current_round_data = {
        "round_number": state.get("sombrero_round_index", 0) + 1,
        "prompt": state.get("current_prompt"),
        "votes_by_target": votes_by_target,
        "winner": winner,
        "top_votes": top_votes,
        "tie_broken_by_hat": tie_broken_by_hat,
        "point_events": round_events
    }
    
    sombrero_rounds = state.get("sombrero_rounds", [])
    sombrero_rounds.append(current_round_data)
    state["sombrero_rounds"] = sombrero_rounds
    
    # Accumulate global point events
    all_events = state.get("point_events", [])
    all_events.extend(round_events)
    state["point_events"] = all_events

    current_index = state.get("sombrero_round_index", 0)
    if current_index < 2:
        # Partial Reveal
        state["round_reveal"] = current_round_data
        state["round_reveal_started_at"] = _now()
        return state, [], False
    else:
        # Final Result
        return _finalize_game(state)


def _finalize_game(state):
    sombrero_rounds = state.get("sombrero_rounds", [])
    players = state.get("players", [])
    
    # Calculate overall totals
    totals = {p["name"]: 0 for p in players}
    for r in sombrero_rounds:
        for name, count in r["votes_by_target"].items():
            totals[name] += count
            
    sorted_players = sorted(totals.items(), key=lambda x: x[1], reverse=True)
    overall_winner, max_votes = sorted_players[0]
    overall_winner_house = _player_house(players, overall_winner)
    
    events = state.get("point_events", [])
    events.append({"player_name": overall_winner, "house": overall_winner_house, "points": POINTS_OVERALL_WINNER, "label": "Gran Ganador del Sombrero"})
    events.append({"player_name": overall_winner, "house": overall_winner_house, "points": POINTS_OVERALL_WINNER_HOUSE, "label": "Bonus Casa Ganadora"})

    state["phase"] = "results_sombrero"
    state["sombrero_result"] = {
        "type": "multi_round",
        "winner": overall_winner,
        "winner_house": overall_winner_house,
        "max_votes": max_votes,
        "ranking": sorted_players,
        "rounds": sombrero_rounds,
        "summary": f"{overall_winner} fue el más señalado de la noche con {max_votes} votos totales.",
        "hat_line": random.choice(SOMBRERO_LINES)
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
