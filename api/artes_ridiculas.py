import random
import time
import uuid
import json
from copy import deepcopy

ROUND_SECONDS = 6
FAST_BONUS_LIMIT = 2.4
PARTIAL_REVEAL_SECONDS = 4

POINTS_CORRECT = 100
POINTS_FAST = 30
POINTS_STREAK_3 = 80
POINTS_WRONG = -20
POINTS_FUNNY_FALSE = 20

# Structured POOL (subset for brevity, I will include the full one in the final version or use the previous one)
# I will use the full bank from the previous successful write but with the refined logic.

# ... (POOL remains same as previous write) ...
POOL = [
    {
        "id": "finanzas_001", "category": "finanzas", "intensity": "media", "difficulty": "media",
        "question": "Un dementor se acerca, pero no viene por tu alma… viene por tu quincena.",
        "options": ["Invocar un Patronus con recibos de nómina", "Lanzar Protego Presupuestum sobre la cartera", "Ofrecerle pagar en abonos chiquitos", "Declararte emocionalmente insolvente"],
        "correct": "Invocar un Patronus con recibos de nómina", "funniest": "Ofrecerle pagar en abonos chiquitos",
        "explanation": "El Patronus financiero protege el alma, la cartera y la dignidad de fin de quincena.",
        "narrator": "Hoy aprenderemos a defendernos de peligros oscuros, como llegar al día quince con treinta y dos pesos."
    },
    {
        "id": "finanzas_002", "category": "finanzas", "intensity": "media", "difficulty": "media",
        "question": "Un boggart toma la forma de tu estado de cuenta después del Buen Fin.",
        "options": ["Usar Riddikulus y convertirlo en cashback", "Revisar movimientos con Lumos Financiero", "Meter el celular al arroz por si se arregla", "Cubrirlo con una sábana de 'yo no fui'"],
        "correct": "Usar Riddikulus y convertirlo en cashback", "funniest": "Meter el celular al arroz por si se arregla",
        "explanation": "El contrahechizo correcto transforma el terror financiero en una ilusión de control.",
        "narrator": "El miedo más profundo del mago moderno no vive en el bosque prohibido, vive en la banca móvil."
    },
    {
        "id": "finanzas_003", "category": "finanzas", "intensity": "media", "difficulty": "dificil",
        "question": "Un duende te ofrece meses sin intereses, pero sonríe demasiado.",
        "options": ["Leer las letras chiquitas con Lumos Legal", "Preguntar si acepta pago con dignidad", "Firmar solo si la pluma no tiembla", "Pedirle una simulación antes de venderle tu alma"],
        "correct": "Leer las letras chiquitas con Lumos Legal", "funniest": "Preguntar si acepta pago con dignidad",
        "explanation": "Si un duende sonríe durante un contrato, alguien está perdiendo algo.",
        "narrator": "La primera regla contra las artes ridículas: jamás firmes algo que brille más que tu sentido común."
    },
    {
        "id": "finanzas_004", "category": "finanzas", "intensity": "suave", "difficulty": "media",
        "question": "Tu tarjeta fue rechazada y el datáfono te mira con decepción.",
        "options": ["Mantener la calma y probar otro método de pago", "Acusar al datáfono de mortífago bancario", "Lanzar un hechizo de 'sí tengo, pero no aquí'", "Pedirle al aparato que no te exhiba"],
        "correct": "Mantener la calma y probar otro método de pago", "funniest": "Pedirle al aparato que no te exhiba",
        "explanation": "La verdadera defensa financiera empieza por no pelearte con una terminal.",
        "narrator": "La oscuridad no siempre usa capa. A veces dice 'declinada'."
    },
    {
        "id": "finanzas_005", "category": "finanzas", "intensity": "caos", "difficulty": "dificil",
        "question": "Un basilisco financiero te promete inversión segura por inbox.",
        "options": ["No mirarlo directo y bloquearlo", "Pedirle estados financieros auditados por Gringotts", "Preguntarle si también vende perfumes", "Mandarlo al grupo familiar para que lo investiguen"],
        "correct": "No mirarlo directo y bloquearlo", "funniest": "Preguntarle si también vende perfumes",
        "explanation": "Si la gran oportunidad llega por mensaje raro, probablemente ya mordió a tres muggles.",
        "narrator": "Recuerden: rendimiento garantizado y foto de perfil sospechosa son señales de magia oscura."
    },
    {
        "id": "ex_001", "category": "ex_y_drama", "intensity": "media", "difficulty": "media",
        "question": "Tu ex aparece con un giratiempo para reclamar cosas del pasado.",
        "options": ["Romper el ciclo temporal con responsabilidad afectiva", "Lanzar Expecto Bloqueum antes del 'tenemos que hablar'", "Pedir audiencia con el Ministerio de Relaciones Pasadas", "Decir: eso pasó en otra línea temporal"],
        "correct": "Romper el ciclo temporal con responsabilidad afectiva", "funniest": "Decir: eso pasó en otra línea temporal",
        "explanation": "El giratiempo no debe usarse para revivir discusiones que ya hasta Facebook olvidó.",
        "narrator": "Mucho cuidado, clase. No toda criatura oscura flota; algunas escriben 'tenemos que hablar'."
    },
    {
        "id": "ex_002", "category": "ex_y_drama", "intensity": "media", "difficulty": "dificil",
        "question": "Una lechuza llega con un mensaje que dice: 'tenemos que hablar'.",
        "options": ["Usar el encantamiento de límites sanos", "Responder con un pergamino de disponibilidad emocional", "Fingir que la lechuza se equivocó de castillo", "Pedir que primero mande orden del Ministerio"],
        "correct": "Usar el encantamiento de límites sanos", "funniest": "Fingir que la lechuza se equivocó de castillo",
        "explanation": "Hay mensajes que pesan más que una maldición imperdonable.",
        "narrator": "La defensa emocional también es parte del plan de estudios, aunque nadie la pase a la primera."
    },
    {
        "id": "ex_003", "category": "ex_y_drama", "intensity": "media", "difficulty": "media",
        "question": "Tu ex invoca un Pensadero lleno de capturas viejas.",
        "options": ["Cerrar el Pensadero y no volver al juicio", "Pedir cadena de custodia emocional", "Decir que esas capturas son de otra temporada", "Lanzar Obliviate, pero solo al grupo de amigos"],
        "correct": "Cerrar el Pensadero y no volver al juicio", "funniest": "Pedir cadena de custodia emocional",
        "explanation": "No todo recuerdo merece audiencia pública ni segunda temporada.",
        "narrator": "El pasado es peligroso cuando viene editado en capturas."
    },
    {
        "id": "familia_001", "category": "familia", "intensity": "suave", "difficulty": "facil",
        "question": "Tu tía manda una cadena de buenos días con 47 flores mágicas.",
        "options": ["Silenciar el grupo con Silencio Totalum", "Responder con un dragón animado para camuflarte", "Mandar un Patronus de buenos deseos", "Cambiarte de familia por decreto mágico"],
        "correct": "Silenciar el grupo con Silencio Totalum", "funniest": "Cambiarte de familia por decreto mágico",
        "explanation": "No todo brillo en WhatsApp es magia buena.",
        "narrator": "No teman a los mortífagos. Teman al tío que manda cadenas a las seis de la mañana."
    },
    {
        "id": "familia_002", "category": "familia", "intensity": "media", "difficulty": "media",
        "question": "La familia pregunta frente a todos: '¿y la novia?'",
        "options": ["Usar Nebulus y cambiar de tema con elegancia", "Invocar un PowerPoint de evasión", "Decir que está en Azkaban por discreta", "Responder: primero pasen la salsa"],
        "correct": "Usar Nebulus y cambiar de tema con elegancia", "funniest": "Invocar un PowerPoint de evasión",
        "explanation": "Hay preguntas familiares que ni un auror entrenado soporta sin humo táctico.",
        "narrator": "La cena familiar es el verdadero Torneo de los Tres Magos."
    },
    {
        "id": "familia_003", "category": "familia", "intensity": "media", "difficulty": "media",
        "question": "Un tío fantasma dice: 'en mis tiempos sí se podía'.",
        "options": ["Aplicar paciencia espectral", "Preguntarle si cotizó en galeones", "Atravesarlo como comentario de Facebook", "Ofrecerle actualizar su CV de ultratumba"],
        "correct": "Aplicar paciencia espectral", "funniest": "Preguntarle si cotizó en galeones",
        "explanation": "La nostalgia agresiva se combate con paciencia y distancia segura.",
        "narrator": "No todos los fantasmas están muertos. Algunos solo viven comparando generaciones."
    },
    {
        "id": "trabajo_001", "category": "trabajo", "intensity": "media", "difficulty": "dificil",
        "question": "Una junta aparece en tu calendario con el título: 'rápido, no nos tardamos'.",
        "options": ["Pedir agenda, objetivo y hora de salida", "Lanzar PudoSerCorreo Maxima", "Entrar con cara de estatua encantada", "Fingir que Zoom te convirtió en fantasma"],
        "correct": "Pedir agenda, objetivo y hora de salida", "funniest": "Fingir que Zoom te convirtió en fantasma",
        "explanation": "La defensa avanzada contra juntas no es huir; es poner límites antes de la diapositiva 47.",
        "narrator": "Clase, hoy enfrentaremos una amenaza antigua: reuniones que pudieron ser mensaje."
    },
    {
        "id": "trabajo_002", "category": "trabajo", "intensity": "media", "difficulty": "media",
        "question": "Te asignan una tarea 'sencilla' que requiere tres departamentos.",
        "options": ["Pedir alcance por escrito antes de aceptar", "Llorar en formato institucional", "Invocar a Recursos Humanos como criatura neutral", "Decir: claro, para ayer queda"],
        "correct": "Pedir alcance por escrito antes de aceptar", "funniest": "Llorar en formato institucional",
        "explanation": "La palabra 'sencillo' ha causado más daños que muchos hechizos.",
        "narrator": "La magia laboral consiste en documentar antes de que te documenten."
    },
    {
        "id": "trabajo_003", "category": "trabajo", "intensity": "media", "difficulty": "media",
        "question": "Un compañero dice 'yo te ayudo' y desaparece como capa invisible.",
        "options": ["Confirmar acuerdos por escrito", "Poner su foto en el Mapa del Merodeador", "Invocarlo con Accio Responsabilidad", "Hacerle altar con pendientes"],
        "correct": "Confirmar acuerdos por escrito", "funniest": "Invocarlo con Accio Responsabilidad",
        "explanation": "Los compromisos verbales se evaporan más rápido que poción barata.",
        "narrator": "El verdadero hechizo de oficina es 'te lo mando al rato'."
    },
    {
        "id": "burocracia_001", "category": "burocracia", "intensity": "media", "difficulty": "media",
        "question": "Una ventanilla mágica te pide copia de una copia.",
        "options": ["Sacar duplicado encantado y guardar evidencia", "Entregar una foto de la impresora", "Preguntar si aceptan pergamino emocional", "Mandar al elfo doméstico a formarse"],
        "correct": "Sacar duplicado encantado y guardar evidencia", "funniest": "Entregar una foto de la impresora",
        "explanation": "En la burocracia, el papel se reproduce como criatura salvaje.",
        "narrator": "La magia administrativa es repetir el trámite hasta que el trámite se canse."
    },
    {
        "id": "burocracia_002", "category": "burocracia", "intensity": "caos", "difficulty": "media",
        "question": "El sistema se cae justo cuando ya ibas a terminar.",
        "options": ["Guardar evidencia y respirar antes de reintentar", "Ofrecerle café al servidor", "Lanzar Reparo al monitor con fe", "Declarar duelo formal contra la plataforma"],
        "correct": "Guardar evidencia y respirar antes de reintentar", "funniest": "Ofrecerle café al servidor",
        "explanation": "No hay magia más oscura que 'intente más tarde'.",
        "narrator": "El servidor siempre cae cuando huele esperanza."
    },
    {
        "id": "burocracia_003", "category": "burocracia", "intensity": "media", "difficulty": "dificil",
        "question": "Un formulario encantado no acepta tu CURP porque 'algo salió mal'.",
        "options": ["Revisar datos y volver a intentar sin insultar al sistema", "Cambiarte legalmente a Algo Salió Mal", "Copiar y pegar con ritual de paciencia", "Pedirle al formulario que sea más específico"],
        "correct": "Revisar datos y volver a intentar sin insultar al sistema", "funniest": "Cambiarte legalmente a Algo Salió Mal",
        "explanation": "Los formularios no odian a nadie. Odian a todos por igual.",
        "narrator": "La burocracia digital combina tecnología moderna con sufrimiento medieval."
    },
    {
        "id": "restaurante_001", "category": "restaurante", "intensity": "media", "difficulty": "media",
        "question": "La cuenta llega y todos empiezan a estudiar el techo.",
        "options": ["Aplicar Cuentas Separadas Totalum", "Declararte decoración del lugar", "Invocar al mesero como testigo protegido", "Usar Accio Ticket para revisar el daño"],
        "correct": "Aplicar Cuentas Separadas Totalum", "funniest": "Declararte decoración del lugar",
        "explanation": "El verdadero duelo empieza cuando llega la cuenta.",
        "narrator": "Hoy aprenderemos defensa avanzada contra uno de los horrores más antiguos: la cuenta compartida."
    },
    {
        "id": "redes_001", "category": "redes_sociales", "intensity": "media", "difficulty": "media",
        "question": "Un troll comenta 'yo opino diferente' y escribe 18 párrafos.",
        "options": ["No alimentar al troll", "Responder con un sticker de Dobby cansado", "Pedirle bibliografía en formato mágico", "Lanzar Silencio Digitalis"],
        "correct": "No alimentar al troll", "funniest": "Responder con un sticker de Dobby cansado",
        "explanation": "En internet, el hechizo más poderoso es ignorar.",
        "narrator": "El troll digital no vive bajo puentes. Vive en comentarios con mayúsculas."
    },
    {
        "id": "caos_001", "category": "caos_cotidiano", "intensity": "suave", "difficulty": "facil",
        "question": "Pierdes el celular y lo tienes en la mano.",
        "options": ["Respirar y revisar tu propia mano", "Acusar a un duende invisible", "Pedirle al celular que se manifieste", "Activar Accio Sentido Común"],
        "correct": "Respirar y revisar tu propia mano", "funniest": "Acusar a un duende invisible",
        "explanation": "La mente humana es el laberinto más barato del castillo.",
        "narrator": "No todo objeto perdido está perdido. A veces solo nos está juzgando."
    },
    {
        "id": "tecnologia_001", "category": "tecnologia", "intensity": "media", "difficulty": "media",
        "question": "El WiFi del castillo dice conectado, pero sin internet.",
        "options": ["Reiniciar el router mágico con ritual de 10 segundos", "Lanzar Lumos al módem para intimidarlo", "Rezarle a San Modemius del Buffering", "Culpar a Peeves por robarse la señal"],
        "correct": "Reiniciar el router mágico con ritual de 10 segundos", "funniest": "Rezarle a San Modemius del Buffering",
        "explanation": "La magia muggle más poderosa sigue siendo apagar y prender.",
        "narrator": "No hay oscuridad más profunda que tener señal y no tener internet."
    }
]

def _shuffle_options(options):
    shuffled = options[:]
    random.shuffle(shuffled)
    return shuffled

def _select_threat(used_ids, difficulty=None):
    pool = POOL
    if difficulty:
        pool = [t for t in POOL if t.get("difficulty") == difficulty]
        if not pool: pool = POOL
    
    available = [t for t in pool if t["id"] not in used_ids]
    if not available: available = POOL
    
    threat = random.choice(available)
    return threat

def build_state(previous_state=None, humor_mode=True):
    previous_state = previous_state or {}
    used_ids = previous_state.get("used_threat_ids", [])
    streaks = previous_state.get("streaks") or previous_state.get("artes_streaks") or {}
    
    threat = _select_threat(used_ids, "facil")
    used_ids.append(threat["id"])
    
    return {
        "phase": "artes_ridiculas",
        "game_id": "artes_ridiculas",
        "round_id": str(uuid.uuid4()),
        "title": "Defensa Contra las Artes Ridículas",
        "subtitle": "Clase de Supervivencia Absurda",
        
        "artes_round_index": 0,
        "artes_total_rounds": 3,
        "artes_rounds": [],
        "used_threat_ids": used_ids,
        "streaks": streaks,
        "humor_mode": humor_mode,
        "scored": False,
        
        "question": threat["question"],
        "options": _shuffle_options(threat["options"]),
        "correct": threat["correct"],
        "funniest": threat["funniest"],
        "explanation": threat["explanation"],
        "narrator": threat["narrator"],
        "threat_id": threat["id"],
        
        "duration_seconds": ROUND_SECONDS,
        "started_at": time.time(),
        "round_reveal": False,
        "round_reveal_started_at": None,
        "round_reveal_seconds": PARTIAL_REVEAL_SECONDS,
        
        "answered": {},
        "point_events": [],
        "artes_result": None
    }

def score_answer(state, player_name, answer, client_elapsed_ms=None):
    now = time.time()
    started_at = float(state.get("started_at", now))
    elapsed_seconds = max(0, now - started_at)

    if client_elapsed_ms is not None:
        try: elapsed_seconds = max(0, int(client_elapsed_ms) / 1000)
        except: pass

    answered = state.get("answered", {})
    if player_name in answered:
        return {"state": state, "accepted": False, "message": "Ya respondiste."}

    correct_answer = state.get("correct")
    funniest_answer = state.get("funniest")
    humor_mode = bool(state.get("humor_mode", True))
    streaks = state.get("streaks", {})

    is_late = elapsed_seconds > int(state.get("duration_seconds", ROUND_SECONDS))
    is_correct = (answer == correct_answer)
    is_funniest_false = humor_mode and (answer == funniest_answer) and not is_correct

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
    state["answered"] = answered
    state["streaks"] = streaks

    return {
        "state": state, "accepted": True, "points": points, "correct": is_correct,
        "late": is_late, "funny_bonus": is_funniest_false, "labels": labels,
        "message": "Defensa registrada"
    }

def resolve_for_reveal(state, players=None):
    state = state or {}
    if state.get("scored"):
        return state, state.get("point_events", []), True

    # If we are NOT in reveal mode, ENTER reveal mode
    if not state.get("round_reveal"):
        state["round_reveal"] = True
        state["round_reveal_started_at"] = time.time()
        
        # Save current round data for final summary
        current_index = state.get("artes_round_index", 0)
        current_round_data = {
            "round_number": current_index + 1,
            "threat": {
                "id": state.get("threat_id"),
                "question": state.get("question"),
                "correct": state.get("correct"),
                "funniest": state.get("funniest"),
                "explanation": state.get("explanation"),
                "narrator": state.get("narrator")
            },
            "answered": deepcopy(state.get("answered", {}))
        }
        artes_rounds = state.get("artes_rounds", [])
        artes_rounds.append(current_round_data)
        state["artes_rounds"] = artes_rounds
        
        return state, [], False

    # If we ARE in reveal mode, MOVE to next round or FINISH
    state["round_reveal"] = False
    state["round_reveal_started_at"] = None
    
    current_index = state.get("artes_round_index", 0)
    total_rounds = state.get("artes_total_rounds", 3)
    
    if current_index < total_rounds - 1:
        # Move to next sub-round
        state["artes_round_index"] = current_index + 1
        
        used_ids = state.get("used_threat_ids", [])
        diff = "media" if state["artes_round_index"] == 1 else "dificil"
        threat = _select_threat(used_ids, diff)
        used_ids.append(threat["id"])
        
        state.update({
            "used_threat_ids": used_ids,
            "question": threat["question"],
            "options": _shuffle_options(threat["options"]),
            "correct": threat["correct"],
            "funniest": threat["funniest"],
            "explanation": threat["explanation"],
            "narrator": threat["narrator"],
            "threat_id": threat["id"],
            "started_at": time.time(),
            "answered": {}
        })
        return state, [], False
    else:
        # Final scoring
        players = players or []
        events = []
        artes_rounds = state.get("artes_rounds", [])
        
        total_points_by_player = {}
        correct_count = {}
        
        for r in artes_rounds:
            for p_name, res in r["answered"].items():
                total_points_by_player[p_name] = total_points_by_player.get(p_name, 0) + res.get("points", 0)
                if res.get("correct"): correct_count[p_name] = correct_count.get(p_name, 0) + 1
        
        for player in players:
            name = player["name"]
            p_total = total_points_by_player.get(name, 0)
            events.append({
                "player_name": name, 
                "house": player["house"], 
                "points": p_total, 
                "label": f"Artes Ridículas ({correct_count.get(name, 0)}/3)"
            })

        state["phase"] = "results_artes_ridiculas"
        state["scored"] = True
        state["point_events"] = events
        state["artes_result"] = {
            "type": "multi_round",
            "rounds": artes_rounds,
            "summary": "La clase ha terminado. Han sobrevivido con dignidad (o algo parecido).",
            "stats": {
                "total_correct": sum(correct_count.values())
            }
        }
        return state, events, True
