import random
import time
import uuid
from collections import defaultdict


DURATION_SECONDS = 24
CLUE_SECONDS = 8
POINTS_BY_CLUE = {
    1: 150,
    2: 100,
    3: 60,
}
FASTEST_CORRECT_BONUS = 30
HOUSE_DOUBLE_CORRECT_BONUS = 80


# Estructura editable del juego.
# Puedes agregar/quitar rondas respetando estas llaves:
# pistas, opciones, respuestaCorrecta, categoria y comentarioFinal.
ROUNDS = [
    {
        "categoria": "Personaje",
        "pistas": [
            "Yo no debería decir esto, pero lo vi todo desde mi marco: siempre parecía llegar tarde, sucio y con una criatura rara en la bolsa.",
            "Tenía más confianza con los animales peligrosos que con cualquier adulto responsable del castillo.",
            "Si algo rugía, babeaba o podía comerse a un estudiante, él decía: ‘no muerde… mucho’."
        ],
        "opciones": ["Hagrid", "Filch", "Lockhart", "Neville"],
        "respuestaCorrecta": "Hagrid",
        "comentarioFinal": "Era Hagrid. Más tierno que peligroso… aunque sus mascotas opinaban lo contrario."
    },
    {
        "categoria": "Objeto mágico",
        "pistas": [
            "Ese objeto causó más problemas que estudiante con capa invisible. Y sí, lo digo con toda la autoridad de un retrato que no puede correr.",
            "Quien lo usaba podía meterse donde no debía, ver lo que no debía y luego hacerse el sorprendido.",
            "No desaparece los problemas, solo al estudiante que los provoca."
        ],
        "opciones": ["Capa de invisibilidad", "Giratiempo", "Mapa del Merodeador", "Pensadero"],
        "respuestaCorrecta": "Capa de invisibilidad",
        "comentarioFinal": "Era la Capa de invisibilidad. Perfecta para esconderte… pésima para tomar buenas decisiones."
    },
    {
        "categoria": "Lugar",
        "pistas": [
            "Ese sitio tiene más secretos que grupo familiar de WhatsApp silenciado desde 2017.",
            "Aparece cuando alguien necesita algo… o cuando el guion necesita salvar a todos elegantemente.",
            "No siempre está donde lo buscas, pero cuando aparece, trae muebles, entrenamiento y drama adolescente."
        ],
        "opciones": ["Sala de los Menesteres", "Cámara Secreta", "Aula de Pociones", "Bosque Prohibido"],
        "respuestaCorrecta": "Sala de los Menesteres",
        "comentarioFinal": "Era la Sala de los Menesteres. El coworking mágico más conveniente de todo el castillo."
    },
    {
        "categoria": "Criatura",
        "pistas": [
            "Lo vi pasar una vez y desde entonces finjo que soy pintura abstracta para no hacer contacto visual.",
            "No es precisamente una mascota para tener en departamento pequeño.",
            "Con una mirada te deja más tieso que alumno en examen sorpresa."
        ],
        "opciones": ["Basilisco", "Hipogrifo", "Dementor", "Thestral"],
        "respuestaCorrecta": "Basilisco",
        "comentarioFinal": "Era el Basilisco. Consejo de retrato: si algo sisea en tuberías, no vayas a investigar."
    },
    {
        "categoria": "Profesor",
        "pistas": [
            "Ese profesor entraba al salón y hasta las velas bajaban la flama por respeto… o por miedo, una de dos.",
            "Tenía más sarcasmo que paciencia y más secretos que ingredientes en su almacén.",
            "Si te miraba feo, sentías que acababas de reprobar una materia que ni cursabas."
        ],
        "opciones": ["Snape", "Dumbledore", "Lupin", "Flitwick"],
        "respuestaCorrecta": "Snape",
        "comentarioFinal": "Era Snape. El único capaz de convertir una pausa incómoda en calificación reprobatoria."
    },
    {
        "categoria": "Objeto mágico",
        "pistas": [
            "Yo no debería decir esto, pero ese objeto escuchó más planes imprudentes que la puerta de una dirección escolar.",
            "No solo muestra lugares: delata pasos, nombres y travesuras con una elegancia sospechosa.",
            "Jura solemnemente que sus intenciones no son buenas. Qué bonito cinismo."
        ],
        "opciones": ["Mapa del Merodeador", "Diario de Tom Riddle", "Espejo de Oesed", "Recordadora"],
        "respuestaCorrecta": "Mapa del Merodeador",
        "comentarioFinal": "Era el Mapa del Merodeador. El GPS oficial de quien claramente no pidió permiso."
    },
    {
        "categoria": "Personaje",
        "pistas": [
            "Lo vi desde mi marco intentando verse misterioso, pero se le notaba lo dramático hasta en la postura.",
            "Tenía una relación complicada con serpientes, diarios, anillos y decisiones pésimas de juventud.",
            "Su mayor problema era no tener nariz… y aun así meterse en asuntos de todos."
        ],
        "opciones": ["Voldemort", "Sirius Black", "Lucius Malfoy", "Gilderoy Lockhart"],
        "respuestaCorrecta": "Voldemort",
        "comentarioFinal": "Era Voldemort. Mucho poder, poca nariz y cero terapia."
    },
    {
        "categoria": "Lugar",
        "pistas": [
            "Ese lugar olía a humedad, secretos antiguos y decisiones administrativas muy cuestionables.",
            "No era precisamente el sitio ideal para una excursión escolar, aunque algunos insistieron en bajar.",
            "Si escuchas una voz rara en las paredes, tal vez no sea la plomería."
        ],
        "opciones": ["Cámara Secreta", "Banco Gringotts", "Torre de Astronomía", "Callejón Diagon"],
        "respuestaCorrecta": "Cámara Secreta",
        "comentarioFinal": "Era la Cámara Secreta. El peor ejemplo de ‘sótano con potencial’."
    },
]


def _shuffle_options(options):
    shuffled = list(options)
    random.shuffle(shuffled)
    return shuffled


def _current_clue_number(state, client_elapsed_ms=None):
    if client_elapsed_ms is not None:
        try:
            elapsed = max(0, int(client_elapsed_ms) / 1000)
        except Exception:
            elapsed = 0
    else:
        started = float(state.get("started_at") or time.time())
        elapsed = max(0, time.time() - started)

    if elapsed < CLUE_SECONDS:
        return 1
    if elapsed < CLUE_SECONDS * 2:
        return 2
    return 3


def build_state(previous_state=None):
    item = random.choice(ROUNDS)
    pistas = item["pistas"][:3]

    return {
        "phase": "retratos_chismosos",
        "game_id": "retratos_chismosos",
        "title": "Retratos Chismosos",
        "subtitle": "La galería habla, exagera y accidentalmente revela la verdad.",
        "round_id": str(uuid.uuid4()),
        "question": pistas[0],
        "pistas": pistas,
        "options": _shuffle_options(item["opciones"]),
        "correct": item["respuestaCorrecta"],
        "respuestaCorrecta": item["respuestaCorrecta"],
        "categoria": item["categoria"],
        "comentarioFinal": item["comentarioFinal"],
        "duration_seconds": DURATION_SECONDS,
        "clue_seconds": CLUE_SECONDS,
        "points_by_clue": POINTS_BY_CLUE,
        "points_correct": POINTS_BY_CLUE[1],
        "points_wrong": 0,
        "fastest_correct_bonus": FASTEST_CORRECT_BONUS,
        "house_double_correct_bonus": HOUSE_DOUBLE_CORRECT_BONUS,
        "started_at": time.time(),
        "answered": {},
        "last_results": {},
        "point_events": [],
        "visual": {
            "scene": "enchanted_portrait_gallery",
            "background": "galería de retratos encantados, marcos dorados, velas, sombras teatrales",
            "accent": "gossip_portrait",
            "mouth_animation": True,
        },
        "narrator": random.choice([
            "Yo no debería decir esto, pero lo vi todo desde mi marco.",
            "Tengo siglos colgado aquí; claro que sé cosas.",
            "No es chisme si lo dice un retrato con marco dorado.",
        ]),
    }


def score_answer(state, player_name, answer, player_house=None, client_elapsed_ms=None):
    answered = state.get("answered", {})
    last_results = state.get("last_results", {})

    if player_name in answered:
        previous = last_results.get(player_name, {})
        return {
            "state": state,
            "accepted": False,
            "points": 0,
            "correct": previous.get("correct", False),
            "message": "Ya habías respondido esta ronda.",
        }

    clue_number = _current_clue_number(state, client_elapsed_ms)
    correct_answer = state.get("respuestaCorrecta") or state.get("correct")
    is_correct = answer == correct_answer
    points = POINTS_BY_CLUE.get(clue_number, 60) if is_correct else 0

    result = {
        "answer": answer,
        "correct": is_correct,
        "clue_number": clue_number,
        "base_points": points,
        "points": points,
        "house": player_house,
        "elapsed_ms": client_elapsed_ms,
        "labels": [f"+{points} pista {clue_number}"] if is_correct else ["Sin puntos"],
    }

    answered[player_name] = result
    last_results[player_name] = result

    state["answered"] = answered
    state["last_results"] = last_results

    return {
        "state": state,
        "accepted": True,
        "points": points,
        "correct": is_correct,
        "clue_number": clue_number,
        "message": "¡El retrato registró tu respuesta!",
    }


def resolve_for_reveal(state, players=None):
    players = players or []
    answered = state.get("answered", {}) or {}
    results = state.get("last_results", {}) or {}

    player_house = {p.get("name"): p.get("house") for p in players}
    correct_results = [
        (name, data)
        for name, data in results.items()
        if data.get("correct")
    ]

    fastest_name = None
    if correct_results:
        fastest_name = min(
            correct_results,
            key=lambda item: item[1].get("elapsed_ms") if item[1].get("elapsed_ms") is not None else 999999999,
        )[0]

    house_correct = defaultdict(list)
    point_events = []
    reveal_rows = []

    for name, data in results.items():
        house = data.get("house") or player_house.get(name)
        points = int(data.get("base_points") or data.get("points") or 0)
        labels = list(data.get("labels") or [])

        if data.get("correct") and name == fastest_name:
            points += FASTEST_CORRECT_BONUS
            labels.append(f"+{FASTEST_CORRECT_BONUS} rapidez")

        if data.get("correct") and house:
            house_correct[house].append(name)

        if points:
            point_events.append({"player_name": name, "points": points})

        reveal_rows.append({
            "player_name": name,
            "house": house,
            "answer": data.get("answer"),
            "correct": bool(data.get("correct")),
            "clue_number": data.get("clue_number"),
            "points": points,
            "labels": labels,
        })

    house_bonus_events = []
    for house, names in house_correct.items():
        if len(names) >= 2:
            # El bonus de casa se reparte entre los dos primeros acertantes de esa casa
            # para que impacte el marcador existente basado en jugadores.
            bonus_each = HOUSE_DOUBLE_CORRECT_BONUS // 2
            for name in names[:2]:
                point_events.append({"player_name": name, "points": bonus_each})
            house_bonus_events.append({
                "house": house,
                "players": names[:2],
                "points": HOUSE_DOUBLE_CORRECT_BONUS,
                "label": f"+{HOUSE_DOUBLE_CORRECT_BONUS} bonus de casa",
            })

    state["phase"] = "results_retratos_chismosos"
    state["correct"] = state.get("respuestaCorrecta") or state.get("correct")
    state["correct_label"] = state["correct"]
    state["point_events"] = point_events
    state["retratos_result"] = {
        "rows": reveal_rows,
        "fastest_correct": fastest_name,
        "house_bonus_events": house_bonus_events,
        "answered_count": len(answered),
    }

    return state, point_events, True
