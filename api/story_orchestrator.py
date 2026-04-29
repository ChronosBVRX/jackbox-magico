"""Motor narrativo para el modo Historia de Jackbox Mágico.

Este módulo NO toca Supabase ni reemplaza los minijuegos existentes. Su objetivo es
servir como capa neutral para que `api/main.py` pueda pedir: qué historia existe,
qué bloque sigue, cuándo mandar a trivia, cuándo mandar a minijuego y cuándo cerrar
con la Copa Final.

La integración recomendada es:
1. Crear sala con mode="story" y story_id.
2. Guardar `story_state` dentro de rooms.game_state.
3. Después de cada bloque o resultado, llamar `advance_story_state`.
4. Cuando el step sea `minigame_random`, usar `pick_minigame_for_story`.
"""

from __future__ import annotations

import random
from copy import deepcopy
from typing import Any, Dict, Iterable, List, Optional


DEFAULT_TRIVIA_GAME_ID = "trivia_magica"
DEFAULT_FINAL_GAME_ID = "copa_final"

# Minijuegos disponibles para alternar dentro del modo historia.
# Se excluyen trivia_magica y copa_final porque son el eje y el cierre.
STORY_MINIGAME_POOL = [
    "atrapa_snitch",
    "duelo_hechizos",
    "sombrero_burlon",
    "clase_pociones",
    "artes_ridiculas",
    "mapa_travieso",
    "retratos_chismosos",
    "hechizo_incompleto",
    "caldero_mentiroso",
    "patronus_personalizado",
]


STORY_CATALOG: Dict[str, Dict[str, Any]] = {
    "copa_encantada_loca": {
        "title": "La Copa Encantada se volvió loca",
        "tone": "épico, absurdo y competitivo",
        "description": (
            "La Copa de las Casas empieza normal, pero la copa empieza a cambiar "
            "reglas, exigir pruebas ridículas y repartir drama como si fuera pastel de cumpleaños."
        ),
        "intro": [
            "Bienvenidos a la Copa de las Casas. La copa está brillando, el Gran Comedor está listo y nadie ha leído el reglamento. Excelente señal.",
            "La trivia iniciará de forma civilizada... hasta que la magia decida comportarse como WiFi de castillo antiguo.",
        ],
        "finale_intro": (
            "La Copa ha hablado: ninguna casa merece ganar todavía. Qué fuerte. "
            "Solo la Pregunta Final decidirá quién sale con gloria y quién con una excusa muy bien redactada."
        ),
        "steps": [
            {"type": "dialogue", "lines": ["La Copa despierta y exige sabiduría. O mínimo que no contesten como muggles con sueño."]},
            {"type": "trivia_block", "questions": 4},
            {"type": "minigame_random", "reason": "La Copa detectó exceso de confianza y activó una prueba sorpresa."},
            {"type": "trivia_block", "questions": 4},
            {"type": "minigame_random", "reason": "Una chispa salió de la Copa y convirtió la siguiente ronda en caos académico."},
            {"type": "trivia_block", "questions": 3},
            {"type": "copa_final"},
        ],
    },
    "peeves_hackeo_trivia": {
        "title": "Peeves hackeó la trivia",
        "tone": "caos, bromas y sabotaje mágico",
        "description": (
            "Peeves altera preguntas, roba turnos, activa minijuegos sin permiso y convierte "
            "la Copa de las Casas en una auditoría de paciencia."
        ),
        "intro": [
            "La trivia iba perfectamente... hasta que Peeves descubrió el botón de 'siguiente ronda'.",
            "Si algo sale mal, no fue bug. Fue actividad paranormal con mala actitud.",
        ],
        "finale_intro": (
            "Peeves intentó arruinar la noche, pero olvidó algo: aquí hay casas con orgullo, hambre y acceso a celulares."
        ),
        "steps": [
            {"type": "dialogue", "lines": ["Peeves aparece flotando con una libreta que claramente no es suya. Esto pinta ilegal."]},
            {"type": "trivia_block", "questions": 3},
            {"type": "minigame_random", "reason": "Peeves robó las respuestas y las escondió en una prueba absurda."},
            {"type": "trivia_block", "questions": 4},
            {"type": "minigame_random", "reason": "Peeves activó otra prueba porque nadie le puso contraseña al sistema."},
            {"type": "trivia_block", "questions": 4},
            {"type": "copa_final"},
        ],
    },
    "ministerio_cancelo_diversion": {
        "title": "El Ministerio canceló la diversión",
        "tone": "burocracia mágica, sarcasmo y rebelión estudiantil",
        "description": (
            "Un inspector del Ministerio llega a regular la Copa, prohibir la emoción y pedir formatos por triplicado. "
            "Las casas deberán demostrar que la diversión también puede tener fundamento mágico."
        ),
        "intro": [
            "Atención: el Ministerio envió un inspector. Nadie haga contacto visual con el reglamento.",
            "La Copa seguirá, pero ahora cada risa será registrada como incidente administrativo menor.",
        ],
        "finale_intro": (
            "El Ministerio pide una última evidencia de competencia. Qué conveniente: justo teníamos una Pregunta Final cargada de tensión."
        ),
        "steps": [
            {"type": "dialogue", "lines": ["El inspector toma nota: 'demasiado entusiasmo'. Eso aquí cuenta como delito mágico menor."]},
            {"type": "trivia_block", "questions": 4},
            {"type": "minigame_random", "reason": "El Ministerio exige una evaluación práctica, porque arruinar fiestas también requiere metodología."},
            {"type": "trivia_block", "questions": 4},
            {"type": "minigame_random", "reason": "El inspector duda de sus capacidades. Grave error: ahora toca humillarlo con puntos."},
            {"type": "trivia_block", "questions": 3},
            {"type": "copa_final"},
        ],
    },
    "torneo_cuatro_casas": {
        "title": "El Torneo de las Cuatro Casas",
        "tone": "competencia clásica, épica y familiar",
        "description": (
            "Las cuatro casas compiten en una versión formal de la Copa, con pruebas de conocimiento, reflejos, memoria, humor y valor."
        ),
        "intro": [
            "Esta noche no gana quien grite más fuerte. Bueno, tal vez ayuda, pero oficialmente gana quien junte más puntos.",
            "Cuatro casas. Una copa. Cero garantías de que el narrador sea imparcial.",
        ],
        "finale_intro": (
            "La ceremonia final comienza. Las velas flotan, los escudos brillan y una casa ya está preparando discurso como si esto fuera graduación."
        ),
        "steps": [
            {"type": "dialogue", "lines": ["La primera prueba será de conocimiento. Respiren. O no. Eso ya es estrategia personal."]},
            {"type": "trivia_block", "questions": 5},
            {"type": "minigame_random", "reason": "El torneo exige una prueba práctica para separar a los sabios de los confiados."},
            {"type": "trivia_block", "questions": 4},
            {"type": "minigame_random", "reason": "Las casas están demasiado parejas. Hora de ponerle chile mágico al asunto."},
            {"type": "trivia_block", "questions": 3},
            {"type": "copa_final"},
        ],
    },
    "grimorio_excusas_prohibidas": {
        "title": "El Grimorio de las Excusas Prohibidas",
        "tone": "misterio cómico, drama escolar y excusas imposibles",
        "description": (
            "Aparece un libro maldito que inventa excusas para justificar respuestas equivocadas. "
            "Cada casa deberá derrotar al Grimorio antes de que convenza a todos de que 'lo sabía, pero me distraje'."
        ),
        "intro": [
            "Un libro apareció en la mesa principal. Dice 'Grimorio de las Excusas Prohibidas'. Ya empezamos mal.",
            "El Grimorio promete justificar cualquier error. Incluso ese de confundir a un hipogrifo con un pollo con autoestima.",
        ],
        "finale_intro": (
            "El Grimorio abre su última página. Si fallan, dirá que fue por Mercurio retrógrado. Si aciertan, diremos que fue talento."
        ),
        "steps": [
            {"type": "dialogue", "lines": ["El Grimorio susurra: 'No fallaste, solo respondiste en una línea temporal alternativa'. Sospechoso."]},
            {"type": "trivia_block", "questions": 4},
            {"type": "minigame_random", "reason": "El Grimorio activó una excusa viviente y ahora hay que desmentirla jugando."},
            {"type": "trivia_block", "questions": 3},
            {"type": "minigame_random", "reason": "El Grimorio invocó una prueba para comprobar quién domina el arte de no improvisar tan feo."},
            {"type": "trivia_block", "questions": 4},
            {"type": "copa_final"},
        ],
    },
    "banquete_hechizos_descompuestos": {
        "title": "El Banquete de los Hechizos Descompuestos",
        "tone": "fiesta mágica, comida encantada y caos familiar",
        "description": (
            "Durante el banquete, varios hechizos caen sobre la comida, los retratos y las mesas. "
            "La única forma de salvar la noche es competir en trivia y pruebas mágicas antes de que todo el castillo pida la cuenta."
        ),
        "intro": [
            "El banquete comenzó tranquilo: velas flotantes, comida mágica y una mesa que acaba de estornudar confeti. Normalísimo.",
            "Alguien lanzó un hechizo mal pronunciado y ahora el postre exige derechos laborales. La Copa debe continuar."
        ],
        "finale_intro": (
            "El banquete está al borde del desastre, pero todavía queda una oportunidad para salvar la noche y levantar la Copa."
        ),
        "steps": [
            {"type": "dialogue", "lines": ["Las mesas tiemblan. El jugo de calabaza burbujea. Una servilleta acaba de retar a duelo a un tenedor."]},
            {"type": "trivia_block", "questions": 3},
            {"type": "minigame_random", "reason": "La comida encantada exige una prueba antes de dejar que continúe la cena."},
            {"type": "trivia_block", "questions": 4},
            {"type": "minigame_random", "reason": "Un hechizo cayó sobre las mesas y ahora todo se resuelve con puntos, como debe ser."},
            {"type": "trivia_block", "questions": 4},
            {"type": "copa_final"},
        ],
    },
}


def list_stories() -> List[Dict[str, Any]]:
    """Devuelve un resumen seguro para mostrar en host/celular."""
    return [
        {
            "story_id": story_id,
            "title": story["title"],
            "tone": story["tone"],
            "description": story["description"],
            "steps": len(story["steps"]),
        }
        for story_id, story in STORY_CATALOG.items()
    ]


def get_story(story_id: str) -> Dict[str, Any]:
    """Obtiene una historia por id y regresa copia para evitar mutaciones accidentales."""
    if story_id not in STORY_CATALOG:
        raise KeyError(f"Historia no encontrada: {story_id}")

    return deepcopy(STORY_CATALOG[story_id])


def build_story_state(story_id: str) -> Dict[str, Any]:
    """Crea el estado inicial del modo historia."""
    story = get_story(story_id)
    return {
        "mode": "story",
        "story_id": story_id,
        "story_title": story["title"],
        "story_step_index": 0,
        "story_completed": False,
        "current_story_step": deepcopy(story["steps"][0]),
        "used_minigames": [],
        "recent_minigames": [],
        "trivia_questions_in_block": 0,
        "narration": {
            "intro": story.get("intro", []),
            "finale_intro": story.get("finale_intro"),
        },
    }


def get_current_step(story_state: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Regresa el step actual de una partida de historia."""
    if not story_state or story_state.get("story_completed"):
        return None

    story_id = story_state.get("story_id")
    if not story_id:
        return None

    story = get_story(story_id)
    index = int(story_state.get("story_step_index") or 0)

    if index < 0 or index >= len(story["steps"]):
        return None

    return deepcopy(story["steps"][index])


def advance_story_state(story_state: Dict[str, Any]) -> Dict[str, Any]:
    """Avanza al siguiente step; si ya no hay más, marca la historia como completa."""
    state = deepcopy(story_state or {})
    story_id = state.get("story_id")

    if not story_id:
        return state

    story = get_story(story_id)
    next_index = int(state.get("story_step_index") or 0) + 1

    if next_index >= len(story["steps"]):
        state["story_completed"] = True
        state["current_story_step"] = None
        state["story_step_index"] = next_index
        return state

    state["story_step_index"] = next_index
    state["current_story_step"] = deepcopy(story["steps"][next_index])
    return state


def pick_minigame_for_story(
    used_minigames: Optional[Iterable[str]] = None,
    recent_minigames: Optional[Iterable[str]] = None,
    allowed_pool: Optional[Iterable[str]] = None,
    random_seed: Optional[str] = None,
) -> Dict[str, Any]:
    """Elige minijuego evitando repeticiones obvias.

    Reglas:
    - No elegir trivia ni copa final.
    - Evitar el último minijuego jugado.
    - Evitar juegos usados 2 o más veces si todavía hay opciones frescas.
    - Permitir semilla para reproducir una selección durante depuración.
    """
    pool = list(allowed_pool or STORY_MINIGAME_POOL)
    used = list(used_minigames or [])
    recent = list(recent_minigames or [])

    blocked_last = set(recent[-1:])
    fresh_candidates = [game_id for game_id in pool if game_id not in blocked_last and used.count(game_id) < 2]
    candidates = fresh_candidates or [game_id for game_id in pool if game_id not in blocked_last] or pool

    rng = random.Random(random_seed) if random_seed is not None else random
    selected = rng.choice(candidates)

    next_used = used + [selected]
    next_recent = (recent + [selected])[-3:]

    return {
        "game_id": selected,
        "used_minigames": next_used,
        "recent_minigames": next_recent,
    }


def merge_story_into_game_state(game_state: Dict[str, Any], story_state: Dict[str, Any]) -> Dict[str, Any]:
    """Inserta metadata narrativa sin destruir el estado del minijuego actual."""
    state = deepcopy(game_state or {})
    state["story"] = deepcopy(story_state or {})
    return state


def get_story_public_payload(story_state: Dict[str, Any]) -> Dict[str, Any]:
    """Payload seguro para que TV/celular sepan en qué capítulo van."""
    state = story_state or {}
    return {
        "mode": state.get("mode"),
        "story_id": state.get("story_id"),
        "story_title": state.get("story_title"),
        "story_step_index": state.get("story_step_index", 0),
        "story_completed": bool(state.get("story_completed")),
        "current_story_step": state.get("current_story_step"),
        "recent_minigames": state.get("recent_minigames", []),
    }
