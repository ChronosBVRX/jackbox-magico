import json
import random
import time
import uuid
from fastapi import APIRouter, HTTPException

from api.database import supabase


router = APIRouter()

# Expanded Ingredients Bank (40+ items)
INGREDIENTS = [
    {"name": "Esencia lunar", "emoji": "🌙", "type": "raro"},
    {"name": "Polvo de dragón", "emoji": "🐉", "type": "caos"},
    {"name": "Raíz de mandrágora", "emoji": "🌱", "type": "base"},
    {"name": "Lágrima de fénix", "emoji": "🔥", "type": "brillante"},
    {"name": "Moco de troll", "emoji": "🤢", "type": "base"},
    {"name": "Escama de basilisco", "emoji": "🐍", "type": "oscuro"},
    {"name": "Pluma plateada", "emoji": "🪶", "type": "raro"},
    {"name": "Hongo del Bosque Prohibido", "emoji": "🍄", "type": "base"},
    {"name": "Rocío de unicornio", "emoji": "🦄", "type": "brillante"},
    {"name": "Ceniza de salamandra", "emoji": "🦎", "type": "base"},
    {"name": "Cristal de sirena", "emoji": "💎", "type": "raro"},
    {"name": "Sal negra encantada", "emoji": "🧂", "type": "oscuro"},
    {"name": "Aceite de sombra", "emoji": "🕯️", "type": "oscuro"},
    {"name": "Pétalo de noche eterna", "emoji": "🥀", "type": "oscuro"},
    {"name": "Miel de abeja mágica", "emoji": "🍯", "type": "base"},
    {"name": "Colmillo molido", "emoji": "🦷", "type": "caos"},
    {"name": "Baba de sapo elegante", "emoji": "🐸", "type": "base"},
    {"name": "Polvo de estrella cansada", "emoji": "⭐", "type": "brillante"},
    {"name": "Brillo de Snitch molido", "emoji": "⚡", "type": "brillante"},
    {"name": "Raíz de grito leve", "emoji": "👂", "type": "base"},
    {"name": "Escama de dragón miniatura", "emoji": "🦖", "type": "caos"},
    {"name": "Nube embotellada", "emoji": "☁️", "type": "raro"},
    {"name": "Lágrima de fantasma dramático", "emoji": "👻", "type": "oscuro"},
    {"name": "Azúcar de calabaza encantada", "emoji": "🎃", "type": "base"},
    {"name": "Pétalo de rosa nocturna", "emoji": "🌹", "type": "raro"},
    {"name": "Pluma de hipogrifo presumido", "emoji": "🦅", "type": "raro"},
    {"name": "Arena de reloj mágico", "emoji": "⏳", "type": "raro"},
    {"name": "Saliva de duende financiero", "emoji": "💰", "type": "caos"},
    {"name": "Polvo de biblioteca vieja", "emoji": "📚", "type": "base"},
    {"name": "Esencia de vela flotante", "emoji": "🕯️", "type": "brillante"},
    {"name": "Humo de chimenea escolar", "emoji": "💨", "type": "base"},
    {"name": "Fragmento de espejo terco", "emoji": "🪞", "type": "caos"},
    {"name": "Sombra de pasillo prohibido", "emoji": "👤", "type": "oscuro"},
    {"name": "Ceniza de fénix", "emoji": "🌋", "type": "brillante"},
    {"name": "Sal negra de mazmorra", "emoji": "🌑", "type": "oscuro"},
    {"name": "Pétalo de noche eterna", "emoji": "🌑", "type": "oscuro"},
    {"name": "Polvo de luna nerviosa", "emoji": "🌖", "type": "raro"},
    {"name": "Gota de tinta invisible", "emoji": "🖋️", "type": "oscuro"},
    {"name": "Chispa de varita usada", "emoji": "🪄", "type": "brillante"},
    {"name": "Semilla de mandrágora tímida", "emoji": "🥔", "type": "base"},
    {"name": "Jarabe de caldero viejo", "emoji": "🥣", "type": "base"},
    {"name": "Escarcha de torre norte", "emoji": "❄️", "type": "raro"},
    {"name": "Polvo de pergamino antiguo", "emoji": "📜", "type": "base"},
    {"name": "Risa embotellada de Peeves", "emoji": "🎭", "type": "caos"},
    {"name": "Lágrima de retrato ofendido", "emoji": "🖼️", "type": "raro"},
    {"name": "Fragmento de mapa travieso", "emoji": "🗺️", "type": "caos"},
    {"name": "Esencia de rana de chocolate", "emoji": "🍫", "type": "base"},
    {"name": "Burbuja de cerveza de mantequilla", "emoji": "🍺", "type": "brillante"},
    {"name": "Hilo de capa invisible", "emoji": "🧵", "type": "raro"},
    {"name": "Pizca de mala decisión", "emoji": "🤦", "type": "caos"},
    {"name": "Aroma de mazmorra limpia", "emoji": "🧼", "type": "base"},
]

# Expanded Potion Names Bank (40+ items)
POTION_NAMES = [
    "Poción Anti-Cruda Mágica", "Elixir de Dignidad Instantánea", "Filtro para No Contestarle al Profesor",
    "Poción de Valentía Dudosa", "Tónico para Sobrevivir al Lunes", "Jarabe de Memoria Selectiva",
    "Poción para Fingir que Entendiste", "Elixir de Encanto Social", "Brebaje para No Explotar en Grupo Familiar",
    "Poción de Serenidad Antes de Pagar la Cuenta", "Caldo Burbujeante de Buenas Decisiones",
    "Filtro de Concentración para Magos Distraídos", "Poción para No Mandar Mensajes Impulsivos",
    "Elixir de Paciencia con Muggles", "Antídoto contra Decisiones de Madrugada", "Jarabe para Aceptar que Perdiste",
    "Tónico de Puntualidad Imposible", "Poción de Carisma Sospechoso", "Brebaje de Humildad Temporal",
    "Elixir de Sueño en Clase", "Poción para Fingir Seguridad", "Filtro de Excusas Creíbles",
    "Jarabe de Silencio en Reuniones", "Poción contra Hambre de Medianoche", "Elixir para No Pelear por la Cuenta",
    "Antídoto contra Celos de Casa", "Tónico de Calma Antes del Duelo", "Brebaje de Buena Suerte Dudosa",
    "Poción de Disciplina Instantánea", "Filtro de Valentía para Karaoke", "Poción para Recordar Contraseñas",
    "Elixir de No Hacer Drama", "Jarabe de Concentración de Último Minuto", "Antídoto contra Chisme Excesivo",
    "Brebaje de Responsabilidad Temporal", "Poción para No Decir “Yo Sí Sabía”", "Tónico de Supervivencia Familiar",
    "Filtro para Evitar Revancha", "Elixir de Elegancia Bajo Presión", "Poción para No Explotar el Caldero",
]

NARRATOR_LINES = [
    "Si el caldero explota, no me culpen, yo sí di instrucciones.",
    "Esa poción no mataría a nadie… probablemente.",
    "Recuerden: primero se lee la receta, luego se arruina con confianza.",
    "Una gota de más y podrían terminar oliendo a pasillo de mazmorra.",
    "Esto es clase de pociones, no licuado experimental de madrugada.",
    "Si sale humo morado, aplaudan; si sale verde, corran con elegancia.",
    "La diferencia entre poción y desastre es seguir el orden, jóvenes.",
    "Hoy aprenderemos química mágica y responsabilidad civil limitada.",
]

# Scoring Constants
POINTS_PERFECT = 150
POINTS_ONE_ERROR = 80
POINTS_TWO_ERRORS = 40
POINTS_THREE_OR_MORE = 0
POINTS_FASTEST_PERFECT = 50
POINTS_HOUSE_MOST_PERFECT = 50 # Per player now


def _now():
    return time.time()


def _ingredient_names():
    return [item["name"] for item in INGREDIENTS]


def _ingredient_map():
    return {item["name"]: item for item in INGREDIENTS}


def build_state(room_code=None, previous_state=None):
    previous_state = previous_state or {}
    
    # Selection of difficulty and mode
    rand = random.random()
    if rand < 0.3:
        difficulty = "facil"
        recipe_length = 4
        memorize_seconds = 8
        mix_seconds = 17
    elif rand < 0.8:
        difficulty = "media"
        recipe_length = 5
        memorize_seconds = 7
        mix_seconds = 15
    else:
        difficulty = "caos"
        recipe_length = 6
        memorize_seconds = 6
        mix_seconds = 13

    modes = ["normal", "reverse", "decoy", "smoke", "unstable"]
    potion_mode = random.choice(modes)
    
    if potion_mode == "unstable":
        mix_seconds = max(8, mix_seconds - 3)
        memorize_seconds = max(5, memorize_seconds - 1)

    recipe = random.sample(_ingredient_names(), recipe_length)
    
    # For mobile display: pick 12 ingredients including the recipe ones
    all_names = _ingredient_names()
    pool_size = 15 if potion_mode == "decoy" else 12
    shuffled_ingredients = list(set(recipe + random.sample(all_names, pool_size - len(recipe))))
    random.shuffle(shuffled_ingredients)

    story_id = previous_state.get("story", {}).get("story_id")
    narrator_line = random.choice(NARRATOR_LINES)

    return {
        "phase": "clase_pociones",
        "game_id": "clase_pociones",
        "round_id": str(uuid.uuid4()),
        "title": "Clase de Pociones",
        "subtitle": f"Modo: {potion_mode.upper()} | Dificultad: {difficulty.upper()}",
        "potion_name": random.choice(POTION_NAMES),
        "potion_mode": potion_mode,
        "difficulty": difficulty,
        "question": "Memoriza la receta antes de que desaparezca.",
        "narrator": narrator_line,
        "recipe": recipe,
        "recipe_length": recipe_length,
        "ingredients": INGREDIENTS,
        "ingredient_map": _ingredient_map(),
        "shuffled_ingredients": shuffled_ingredients,
        "memorize_seconds": memorize_seconds,
        "mix_seconds": mix_seconds,
        "started_at": _now(),
        "answers": {},
        "potion_submitted_players": [],
        "pociones_result": None,
        "point_events": [],
        "scored": False,
        "host": previous_state.get("host"),
        "points_config": {
            "perfect": POINTS_PERFECT,
            "one_error": POINTS_ONE_ERROR,
            "two_errors": POINTS_TWO_ERRORS,
            "house_bonus": POINTS_HOUSE_MOST_PERFECT,
        }
    }


def _calculate_errors(recipe, submitted, mode="normal"):
    target_recipe = recipe[::-1] if mode == "reverse" else recipe
    
    errors = 0
    max_len = max(len(target_recipe), len(submitted))

    for index in range(max_len):
        expected = target_recipe[index] if index < len(target_recipe) else None
        received = submitted[index] if index < len(submitted) else None

        if expected != received:
            errors += 1

    return errors


def submit_recipe_answer(state, player_name, answer, client_elapsed_ms=None):
    state = state or {}
    if state.get("phase") != "clase_pociones":
        return {"state": state, "accepted": False, "message": "Clase terminada."}

    answers = state.get("answers", {})
    if player_name in answers:
        return {"state": state, "accepted": True, "message": "Ya entregaste."}

    total_elapsed = max(0, _now() - float(state.get("started_at", _now())))
    if client_elapsed_ms is not None:
        try:
            total_elapsed = max(0, int(client_elapsed_ms) / 1000)
        except Exception: pass

    memorize_seconds = int(state.get("memorize_seconds", 7))
    mix_seconds = int(state.get("mix_seconds", 15))
    mix_elapsed = max(0, total_elapsed - memorize_seconds)
    is_late = mix_elapsed > mix_seconds

    recipe = state.get("recipe", [])
    mode = state.get("potion_mode", "normal")
    
    # Handle list or string answer
    if isinstance(answer, str):
        try: submitted = json.loads(answer)
        except: submitted = [answer]
    else:
        submitted = answer or []

    errors = _calculate_errors(recipe, submitted, mode)
    if is_late:
        errors = max(errors, 3)

    points = 0
    if errors == 0: points = POINTS_PERFECT
    elif errors == 1: points = POINTS_ONE_ERROR
    elif errors == 2: points = POINTS_TWO_ERRORS

    result = {
        "player_name": player_name,
        "submitted": submitted,
        "errors": errors,
        "points": points,
        "perfect": errors == 0,
        "late": is_late,
        "mix_elapsed_seconds": round(mix_elapsed, 3),
        "exploded": errors >= 3,
    }

    answers[player_name] = result
    state["answers"] = answers
    state["potion_submitted_players"] = list(answers.keys())

    msg = "Poción perfecta. El caldero está orgulloso."
    if errors == 1: msg = "Casi perfecta. Solo un error mágico menor."
    elif errors == 2: msg = "La poción sobrevivió, pero con trauma."
    elif errors >= 3: msg = "El caldero explotó con dignidad cuestionable."

    return {
        "state": state,
        "accepted": True,
        "message": msg,
        "points_preview": points,
        "errors": errors,
        "perfect": errors == 0,
        "exploded": errors >= 3,
    }


def resolve_for_reveal(state, players=None):
    state = state or {}
    if state.get("scored"):
        return state, state.get("point_events", []), True

    players = players or []
    answers = state.get("answers", {})
    events = []
    player_results = []
    perfect_by_house = {}

    for player in players:
        name = player.get("name")
        house = player.get("house")

        if name in answers:
            res = answers[name]
        else:
            res = {"player_name": name, "submitted": [], "errors": 99, "points": 0, "perfect": False, "late": True, "exploded": True, "mix_elapsed_seconds": None}

        points = res.get("points", 0)
        label = "Receta perfecta" if res.get("perfect") else f"{res.get('errors')} errores"
        if res.get("exploded"): label = "Explosión de caldero"

        events.append({"player_name": name, "house": house, "points": points, "label": label})
        
        if res.get("perfect"):
            perfect_by_house[house] = perfect_by_house.get(house, 0) + 1
            
        player_results.append({**res, "house": house, "points": points, "label": label})

    # Fastest Perfect
    perfects = [r for r in player_results if r.get("perfect") and r.get("mix_elapsed_seconds") is not None]
    fastest = None
    if perfects:
        perfects.sort(key=lambda x: x["mix_elapsed_seconds"])
        fastest = perfects[0]
        events.append({"player_name": fastest["player_name"], "house": fastest["house"], "points": POINTS_FASTEST_PERFECT, "label": "Maestro Pocionero (Más rápido)"})

    # House Bonus (Shared)
    if perfect_by_house:
        max_p = max(perfect_by_house.values())
        winning_houses = [h for h, c in perfect_by_house.items() if c == max_p and c > 0]
        for house in winning_houses:
            for player in players:
                if player.get("house") == house:
                    events.append({"player_name": player["name"], "house": house, "points": POINTS_HOUSE_MOST_PERFECT, "label": "Bonus de Casa: Excelencia Alquímica"})

    state["phase"] = "results_clase_pociones"
    state["pociones_result"] = {
        "potion_name": state.get("potion_name"),
        "potion_mode": state.get("potion_mode"),
        "player_results": player_results,
        "fastest_perfect": fastest,
        "summary": "La clase terminó. Algunos calderos sobrevivieron. Otros serán recordados con respeto.",
        "narrator": random.choice([
            "Esa poción no mataría a nadie… probablemente.",
            "Vi menos humo en una reunión de profesores discutiendo presupuesto.",
            "Excelente trabajo para quienes no hicieron un cráter.",
        ]),
        "stats": {
            "perfect_count": len(perfects),
            "explosion_count": len([r for r in player_results if r.get("exploded")])
        }
    }
    state["point_events"] = events
    state["scored"] = True
    return state, events, True


@router.post("/api/host/{room_code}/start_pociones")
async def start_pociones(room_code: str):
    new_state = build_state(room_code)
    supabase.table("rooms").update({
        "status": "playing",
        "game_state": new_state,
    }).eq("room_code", room_code.upper()).execute()
    return {"message": "Clase de Pociones iniciada"}