import random
import time
import uuid


ROUND_SECONDS = 6
FAST_BONUS_LIMIT = 2.4

POINTS_CORRECT = 100
POINTS_FAST = 30
POINTS_STREAK_3 = 80
POINTS_WRONG = -20
POINTS_FUNNY_FALSE = 20


POOL = [
    {
        "question": "Un dementor se acerca, pero no viene por tu alma… viene por tu quincena.",
        "options": [
            "Invocar un Patronus con recibos de nómina",
            "Hacerte el muerto fiscalmente",
            "Decirle: joven, yo ya pagué",
            "Ofrecerle pagar en abonos chiquitos",
        ],
        "correct": "Invocar un Patronus con recibos de nómina",
        "funniest": "Ofrecerle pagar en abonos chiquitos",
        "explanation": "El Patronus financiero protege el alma, la cartera y la dignidad de fin de quincena.",
        "narrator": "Hoy aprenderemos a defendernos de peligros oscuros, como llegar al día quince con treinta y dos pesos.",
    },
    {
        "question": "Tu ex aparece con un giratiempo para reclamar cosas del pasado.",
        "options": [
            "Romper el giratiempo con responsabilidad afectiva",
            "Negar todo como político en rueda de prensa",
            "Lanzar un Expecto Bloqueum",
            "Pedirle que primero saque cita por ventanilla",
        ],
        "correct": "Romper el giratiempo con responsabilidad afectiva",
        "funniest": "Pedirle que primero saque cita por ventanilla",
        "explanation": "El giratiempo no debe usarse para revivir discusiones que ya hasta Facebook olvidó.",
        "narrator": "Mucho cuidado, clase. No toda criatura oscura flota; algunas escriben ‘tenemos que hablar’.",
    },
    {
        "question": "Un boggart toma la forma de tu estado de cuenta después del Buen Fin.",
        "options": [
            "Gritar Riddikulus y convertirlo en cashback",
            "Cerrar la app bancaria y fingir paz mental",
            "Meter el celular al arroz",
            "Culpar a Mercurio retrógrado",
        ],
        "correct": "Gritar Riddikulus y convertirlo en cashback",
        "funniest": "Meter el celular al arroz",
        "explanation": "El contrahechizo correcto transforma el terror financiero en una ilusión de control.",
        "narrator": "Recuerden: el miedo más profundo del mago moderno no vive en el bosque prohibido, vive en la banca móvil.",
    },
    {
        "question": "Un duende del banco mágico te ofrece un préstamo ‘sin letras chiquitas’.",
        "options": [
            "Leer el contrato con lupa encantada",
            "Firmar porque trae pluma bonita",
            "Preguntar si acepta pagos con stickers",
            "Huir dejando una nube con forma de buró de crédito",
        ],
        "correct": "Leer el contrato con lupa encantada",
        "funniest": "Preguntar si acepta pagos con stickers",
        "explanation": "Jamás se confía en un préstamo que sonríe más que el vendedor.",
        "narrator": "La primera regla contra las artes ridículas: si dice ‘sin intereses’, probablemente ya te cobró el alma.",
    },
    {
        "question": "Una lechuza llega con una carta de Hogwarts… pero es del SAT.",
        "options": [
            "Revisar la notificación antes de entrar en pánico",
            "Cambiarte el nombre a Lord Evadóremort",
            "Mandarla con el vecino",
            "Responder con un meme y esperanza",
        ],
        "correct": "Revisar la notificación antes de entrar en pánico",
        "funniest": "Cambiarte el nombre a Lord Evadóremort",
        "explanation": "No todo pergamino oficial es una maldición, pero casi todos dan taquicardia.",
        "narrator": "Clase, hay hechizos imperdonables… y luego están las notificaciones fiscales un viernes por la tarde.",
    },
    {
        "question": "Una criatura oscura te propone dividir la cuenta entre ocho, pero solo tres comieron.",
        "options": [
            "Aplicar el encantamiento de cuentas separadas",
            "Desaparecer al baño hasta que paguen",
            "Decir que solo respiraste cerca de la comida",
            "Invocar al mesero como testigo protegido",
        ],
        "correct": "Aplicar el encantamiento de cuentas separadas",
        "funniest": "Decir que solo respiraste cerca de la comida",
        "explanation": "La justicia mágica empieza cuando cada quien paga sus propias alitas.",
        "narrator": "Hoy veremos defensa avanzada contra uno de los horrores más antiguos: la cuenta dividida entre ocho.",
    },
    {
        "question": "Un mortífago te amenaza con agregarte a un grupo de WhatsApp familiar.",
        "options": [
            "Activar silencio por un año inmediatamente",
            "Mandar buenos días con glitter para camuflarte",
            "Responder ‘jajaja’ a todo sin leer",
            "Cambiar de número y de identidad mágica",
        ],
        "correct": "Activar silencio por un año inmediatamente",
        "funniest": "Cambiar de número y de identidad mágica",
        "explanation": "Silenciar el grupo es magia defensiva básica de supervivencia social.",
        "narrator": "No teman a los mortífagos. Teman al tío que manda cadenas a las seis de la mañana.",
    },
    {
        "question": "Un espejo mágico te muestra cómo te verías si hubieras dormido ocho horas.",
        "options": [
            "Aceptar la visión y tomar agua",
            "Acusar al espejo de usar filtros",
            "Romperlo por revelar secretos de Estado",
            "Preguntarle si también arregla ojeras emocionales",
        ],
        "correct": "Aceptar la visión y tomar agua",
        "funniest": "Preguntarle si también arregla ojeras emocionales",
        "explanation": "La defensa contra el cansancio empieza con hidratación y dejar TikTok a las 2 AM.",
        "narrator": "Algunos espejos muestran deseos. Este muestra consecuencias.",
    },
    {
        "question": "Un profesor sospechoso te pide tarea que nunca dejó.",
        "options": [
            "Solicitar evidencia en el Pensadero académico",
            "Inventar que se la comió una mandrágora",
            "Decir ‘la subí a Classroom’ con seguridad",
            "Llorar en formato APA",
        ],
        "correct": "Solicitar evidencia en el Pensadero académico",
        "funniest": "Llorar en formato APA",
        "explanation": "Toda tarea fantasma debe comprobarse con recuerdos verificables.",
        "narrator": "La magia más peligrosa es la memoria selectiva de un profesor con café.",
    },
    {
        "question": "Un basilisco aparece en la fila del banco y solo hay una ventanilla abierta.",
        "options": [
            "Evitar contacto visual y tomar turno",
            "Pedirle que también haga fila",
            "Ofrecerle cambiar su ficha",
            "Convertirte en estatua por voluntad propia",
        ],
        "correct": "Evitar contacto visual y tomar turno",
        "funniest": "Convertirte en estatua por voluntad propia",
        "explanation": "Ante filas eternas, conservar la calma es magia nivel auror.",
        "narrator": "El basilisco petrifica con la mirada; la burocracia, con el tiempo estimado de espera.",
    },
    {
        "question": "Un fantasma del castillo te dice: ‘yo en mis tiempos sí trabajaba de verdad’.",
        "options": [
            "Usar el encantamiento de paciencia institucional",
            "Preguntarle si cotizó en galeones",
            "Atravesarlo como si fuera comentario de Facebook",
            "Ofrecerle actualizar su CV espectral",
        ],
        "correct": "Usar el encantamiento de paciencia institucional",
        "funniest": "Preguntarle si cotizó en galeones",
        "explanation": "La paciencia es el escudo más fuerte contra la nostalgia agresiva.",
        "narrator": "No todos los fantasmas están muertos. Algunos solo viven comparando generaciones.",
    },
    {
        "question": "Una araña gigante te invita a una reunión que pudo ser mensaje.",
        "options": [
            "Lanzar el hechizo ‘PudoSerCorreo’",
            "Llevar café y perder la esperanza",
            "Hacerte telaraña en la silla",
            "Preguntar si habrá minuta o solo sufrimiento",
        ],
        "correct": "Lanzar el hechizo ‘PudoSerCorreo’",
        "funniest": "Preguntar si habrá minuta o solo sufrimiento",
        "explanation": "La magia ejecutiva consiste en evitar reuniones innecesarias antes de que pongan fecha.",
        "narrator": "Clase, hoy enfrentaremos una amenaza antigua: juntas que pudieron ser mensaje.",
    },
]


def _shuffle_options(options):
    shuffled = options[:]
    random.shuffle(shuffled)
    return shuffled


def build_state(previous_state=None, humor_mode=True):
    previous_state = previous_state or {}

    preserved_streaks = (
        previous_state.get("streaks")
        or previous_state.get("artes_streaks")
        or {}
    )

    item = random.choice(POOL)

    return {
        "phase": "artes_ridiculas",
        "game_id": "artes_ridiculas",
        "title": "Defensa Contra las Artes Ridículas",
        "subtitle": "Clase práctica de supervivencia mágica, social y financiera",
        "round_id": str(uuid.uuid4()),
        "question": item["question"],
        "options": _shuffle_options(item["options"]),
        "correct": item["correct"],
        "funniest": item["funniest"],
        "explanation": item["explanation"],
        "narrator": item["narrator"],
        "duration_seconds": ROUND_SECONDS,
        "started_at": time.time(),
        "humor_mode": humor_mode,
        "points_correct": POINTS_CORRECT,
        "points_fast": POINTS_FAST,
        "points_streak_3": POINTS_STREAK_3,
        "points_wrong": POINTS_WRONG,
        "points_funny_false": POINTS_FUNNY_FALSE,
        "answered": {},
        "last_results": {},
        "streaks": preserved_streaks,
        "visual": {
            "scene": "dark_magic_classroom",
            "background": "pizarron, velas flotantes, criaturas oscuras caricaturizadas",
            "accent": "ridiculous_defense",
        },
        "sound_cue": random.choice(["dark_pop", "spell_hit", "mystery_bell"]),
    }


def score_answer(state, player_name, answer, client_elapsed_ms=None):
    now = time.time()
    started_at = float(state.get("started_at", now))
    elapsed_seconds = max(0, now - started_at)

    if client_elapsed_ms is not None:
        try:
            elapsed_seconds = max(0, int(client_elapsed_ms) / 1000)
        except Exception:
            pass

    answered = state.get("answered", {})
    last_results = state.get("last_results", {})
    streaks = state.get("streaks", {})

    if player_name in answered:
        previous = last_results.get(player_name, {})
        return {
            "state": state,
            "points": 0,
            "correct": previous.get("correct", False),
            "late": previous.get("late", False),
            "funny_bonus": previous.get("funny_bonus", False),
            "labels": previous.get("labels", []),
            "message": "Ya habías respondido esta ronda.",
        }

    correct_answer = state.get("correct")
    funniest_answer = state.get("funniest")
    humor_mode = bool(state.get("humor_mode", True))

    is_late = elapsed_seconds > int(state.get("duration_seconds", ROUND_SECONDS))
    is_correct = answer == correct_answer
    is_funniest_false = humor_mode and answer == funniest_answer and not is_correct

    points = 0
    labels = []

    if is_late:
        points = 0
        labels.append("Fuera de tiempo")
        streaks[player_name] = 0

    elif is_correct:
        points += POINTS_CORRECT
        labels.append("+100 correcta")

        if elapsed_seconds <= FAST_BONUS_LIMIT:
            points += POINTS_FAST
            labels.append("+30 rapidez")

        streaks[player_name] = int(streaks.get(player_name, 0)) + 1

        if streaks[player_name] > 0 and streaks[player_name] % 3 == 0:
            points += POINTS_STREAK_3
            labels.append("+80 racha de 3")

    else:
        points += POINTS_WRONG
        labels.append("-20 error")
        streaks[player_name] = 0

        if is_funniest_false:
            points += POINTS_FUNNY_FALSE
            labels.append("+20 falsa más graciosa")

    result = {
        "answer": answer,
        "elapsed_seconds": round(elapsed_seconds, 2),
        "points": points,
        "correct": is_correct,
        "funny_bonus": is_funniest_false,
        "late": is_late,
        "labels": labels,
    }

    answered[player_name] = result
    last_results[player_name] = result

    state["answered"] = answered
    state["last_results"] = last_results
    state["streaks"] = streaks

    return {
        "state": state,
        "points": points,
        "correct": is_correct,
        "late": is_late,
        "funny_bonus": is_funniest_false,
        "labels": labels,
        "message": "Respuesta guardada",
    }
