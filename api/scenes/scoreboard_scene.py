from copy import deepcopy

HOUSE_ORDER = [
    "Gryffindor",
    "Slytherin",
    "Ravenclaw",
    "Hufflepuff",
]

HOUSE_LABELS = {
    "Gryffindor": "Gryffindor",
    "Slytherin": "Slytherin",
    "Ravenclaw": "Ravenclaw",
    "Hufflepuff": "Hufflepuff",
}

HOUSE_ICONS = {
    "Gryffindor": "🦁",
    "Slytherin": "🐍",
    "Ravenclaw": "🦅",
    "Hufflepuff": "🦡",
}

def calculate_house_scores(players: list) -> list:
    totals = {house: 0 for house in HOUSE_ORDER}

    for player in players or []:
        house = player.get("house")
        score = int(player.get("score") or 0)

        if house not in totals:
            totals[house] = 0

        totals[house] += score

    result = []
    for house, score in totals.items():
        result.append({
            "house": house,
            "label": HOUSE_LABELS.get(house, house),
            "icon": HOUSE_ICONS.get(house, "✨"),
            "score": score
        })

    result.sort(key=lambda item: item["score"], reverse=True)
    return result

def get_top_player(players: list):
    if not players:
        return None

    sorted_players = sorted(
        players,
        key=lambda player: int(player.get("score") or 0),
        reverse=True
    )

    top = sorted_players[0]
    return {
        "name": top.get("name"),
        "house": top.get("house"),
        "score": int(top.get("score") or 0),
        "icon": HOUSE_ICONS.get(top.get("house"), "✨")
    }

def build_scoreboard_scene(
    previous_state: dict,
    players: list,
    title: str = "Marcador de la Copa de las Casas",
    subtitle: str = "Así va la competencia hasta este momento.",
    next_action: str = "continue"
) -> dict:
    """
    Construye una escena separada para mostrar el marcador general.
    Debe usarse después de resultados y antes de continuar.
    """
    state = deepcopy(previous_state or {})
    house_scores = calculate_house_scores(players)
    leader = house_scores[0] if house_scores else None
    top_player = get_top_player(players)

    state.update({
        "phase": "scene_scoreboard",
        "scene_type": "scoreboard",
        "scoreboard_title": title,
        "scoreboard_subtitle": subtitle,
        "house_scores": house_scores,
        "leader": leader,
        "top_player": top_player,
        "next_action": next_action,
        "cta": "Presiona OK para continuar"
    })

    return state
