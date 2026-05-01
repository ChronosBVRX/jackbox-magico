from api.scenes.instructions_scene import build_instruction_scene
from api.scenes.scoreboard_scene import build_scoreboard_scene
from api.scenes.transition_scene import build_transition_scene

def build_scene_before_game(game_id: str, previous_state: dict) -> dict:
    """
    Antes de cada minijuego, muestra instrucciones.
    """
    return build_instruction_scene(
        game_id=game_id,
        previous_state=previous_state,
        next_phase="start_game"
    )

def build_scene_after_round(previous_state: dict, players: list) -> dict:
    """
    Después de cada pregunta o minijuego, muestra marcador.
    """
    return build_scoreboard_scene(
        previous_state=previous_state,
        players=players,
        title="Marcador de la Copa de las Casas",
        subtitle="Así va la batalla por la gloria mágica.",
        next_action="continue_story"
    )

def build_scene_between_questions(previous_state: dict, players: list, next_question_number: int) -> dict:
    """
    Entre preguntas de trivia, muestra marcador breve.
    """
    return build_scoreboard_scene(
        previous_state=previous_state,
        players=players,
        title=f"Marcador antes de la pregunta {next_question_number}",
        subtitle="Todavía hay tiempo para remontar.",
        next_action="next_trivia_question"
    )

def build_next_game_transition(previous_state: dict, next_game_name: str, next_game_id: str) -> dict:
    """
    Transición antes de pasar a otro minijuego.
    """
    return build_transition_scene(
        previous_state=previous_state,
        title="La historia continúa...",
        subtitle=f"La siguiente prueba será: {next_game_name}",
        next_action="show_instructions",
        duration_seconds=5,
        next_game_id=next_game_id
    )

def build_safe_lobby_scene(previous_state: dict) -> dict:
    """
    Fallback seguro para regresar al lobby si el flujo no sabe qué hacer.
    """
    state = previous_state or {}
    return {
        **state,
        "phase": "lobby",
        "scene_type": "lobby",
        "cta": "Esperando jugadores"
    }
