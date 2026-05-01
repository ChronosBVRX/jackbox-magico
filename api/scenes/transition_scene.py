from copy import deepcopy

def build_transition_scene(
    previous_state: dict,
    title: str,
    subtitle: str = "",
    next_action: str = "continue",
    duration_seconds: int = 5,
    next_game_id: str = None
) -> dict:
    """
    Construye una escena de transición entre bloques, preguntas o minijuegos.
    """
    state = deepcopy(previous_state or {})

    state.update({
        "phase": "scene_transition",
        "scene_type": "transition",
        "transition_title": title,
        "transition_subtitle": subtitle,
        "transition_duration_seconds": duration_seconds,
        "next_action": next_action,
        "next_game_id": next_game_id,
        "cta": "Presiona OK para continuar"
    })

    return state
