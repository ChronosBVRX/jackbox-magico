import random
import string
import uuid
from copy import deepcopy

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from api.database import (
    supabase,
    PlayerJoinInfo,
    AnswerInfo,
    HostControlInfo,
    DuelClashTapInfo,
    SombreroStartInfo,
)
from api import trivia, duelo, sombrero
from api import clase_pociones, atrapa_snitch, retratos_chismosos, mapa_travieso
from api import hechizo_incompleto, artes_ridiculas, caldero_mentiroso, patronus_personalizado, copa_final
from api.game_catalog import GAME_CATALOG


app = FastAPI(title="Hogwarts Snacks API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trivia.router)
app.include_router(duelo.router)
app.include_router(sombrero.router)


def generate_room_code():
    return "".join(random.choices(string.ascii_uppercase, k=4))


def generate_host_token():
    return str(uuid.uuid4())


def add_points(room_id: int, player_name: str, points: int):
    if points == 0 or not player_name:
        return

    player = (
        supabase.table("players")
        .select("id, score")
        .eq("room_id", room_id)
        .eq("name", player_name)
        .execute()
    )

    if player.data:
        current_score = player.data[0].get("score") or 0

        supabase.table("players").update({
            "score": current_score + points
        }).eq("id", player.data[0]["id"]).execute()


def apply_point_events(room_id: int, point_events: list):
    for event in point_events:
        add_points(
            room_id=room_id,
            player_name=event.get("player_name"),
            points=int(event.get("points") or 0),
        )


def get_room_by_code(room_code: str):
    room = (
        supabase.table("rooms")
        .select("id, status, game_state")
        .eq("room_code", room_code.upper())
        .execute()
    )

    if not room.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    return room.data[0]


def get_players(room_id: int):
    players = (
        supabase.table("players")
        .select("name, house, score")
        .eq("room_id", room_id)
        .execute()
    )

    return players.data or []


def get_host_from_state(state: dict):
    state = state or {}
    host = state.get("host")

    if isinstance(host, dict):
        return host

    return None


def sanitize_game_state(state: dict):
    public_state = deepcopy(state or {})
    phase = public_state.get("phase", "lobby")

    host = public_state.get("host")
    if isinstance(host, dict):
        public_state["host"] = {
            "name": host.get("name"),
            "claimed": bool(host.get("name")),
        }

    if not phase.startswith("results_"):
        public_state.pop("correct", None)
        public_state.pop("funniest", None)
        public_state.pop("last_results", None)
        public_state.pop("duel_result", None)
        public_state.pop("point_events", None)
        public_state.pop("sombrero_result", None)
        public_state.pop("pociones_result", None)
        public_state.pop("snitch_result", None)
        public_state.pop("votes_by_voter", None)
        public_state.pop("votes_by_target", None)

        answered = public_state.get("answered")
        if isinstance(answered, dict):
            public_state["answered"] = {
                name: True for name in answered.keys()
            }

        answers = public_state.get("answers")
        if isinstance(answers, dict):
            public_state["answers"] = {
                name: True for name in answers.keys()
            }

        attempts_by_player = public_state.get("attempts_by_player")
        if isinstance(attempts_by_player, dict):
            public_state["attempts_by_player"] = {
                name: len(attempts or [])
                for name, attempts in attempts_by_player.items()
            }

    return public_state


def ensure_host_in_state(state: dict, host: dict):
    state = state or {}

    if host:
        state["host"] = host

    return state


def validate_mobile_host(room_code: str, info: HostControlInfo):
    room = get_room_by_code(room_code)
    state = room.get("game_state") or {}
    host = get_host_from_state(state)

    if not host:
        raise HTTPException(status_code=403, detail="Esta sala todavía no tiene host")

    if host.get("name") != info.player_name:
        raise HTTPException(status_code=403, detail="No eres el host de esta sala")

    if host.get("token") != info.host_token:
        raise HTTPException(status_code=403, detail="Token de host inválido")

    return room


def build_game_state(room_code: str, game_id: str, previous_state: dict):
    if game_id == "trivia_magica":
        return trivia.build_trivia_state()

    if game_id == "duelo_hechizos":
        return duelo.build_duelo_state(
            room_code=room_code,
            previous_state=previous_state,
        )

    if game_id == "sombrero_burlon":
        return sombrero.build_sombrero_state(
            room_code=room_code,
            previous_state=previous_state,
        )

    if game_id == "clase_pociones":
        return clase_pociones.build_state(
            room_code=room_code,
            previous_state=previous_state,
        )

    if game_id == "atrapa_snitch":
        return atrapa_snitch.build_state(
            room_code=room_code,
            previous_state=previous_state,
        )

    if game_id == "retratos_chismosos":
        return retratos_chismosos.build_state()

    if game_id == "mapa_travieso":
        return mapa_travieso.build_state()

    if game_id == "hechizo_incompleto":
        return hechizo_incompleto.build_state()

    if game_id == "artes_ridiculas":
        return artes_ridiculas.build_state(
            previous_state=previous_state,
            humor_mode=True,
        )

    if game_id == "caldero_mentiroso":
        return caldero_mentiroso.build_state()

    if game_id == "patronus_personalizado":
        return patronus_personalizado.build_state(room_code)

    if game_id == "copa_final":
        return copa_final.build_state()

    raise HTTPException(status_code=400, detail="Juego sin constructor")


def start_game_internal(room_code: str, game_id: str):
    if game_id not in GAME_CATALOG:
        raise HTTPException(status_code=404, detail="Juego no existe en el catálogo")

    room = get_room_by_code(room_code)
    previous_state = room.get("game_state") or {}
    host = get_host_from_state(previous_state)

    new_state = build_game_state(
        room_code=room_code,
        game_id=game_id,
        previous_state=previous_state,
    )

    new_state = ensure_host_in_state(new_state, host)

    supabase.table("rooms").update({
        "status": "playing",
        "game_state": new_state,
    }).eq("room_code", room_code.upper()).execute()

    return {
        "message": f"{GAME_CATALOG[game_id]['name']} iniciado",
        "game_id": game_id,
    }


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "message": "Cerebro principal funcionando.",
    }


@app.get("/api/games")
async def list_games():
    return {
        "games": GAME_CATALOG,
    }


@app.post("/api/host/create_room")
async def create_room():
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    code = generate_room_code()

    supabase.table("rooms").insert({
        "room_code": code,
        "status": "lobby",
        "game_state": {
            "phase": "lobby",
            "host": None,
        },
    }).execute()

    return {
        "message": "Sala creada",
        "room_code": code,
    }


@app.post("/api/player/join")
async def join_room(info: PlayerJoinInfo):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    room = get_room_by_code(info.room_code)
    room_id = room["id"]
    state = room.get("game_state") or {"phase": "lobby"}
    status = room.get("status")

    existing_player = (
        supabase.table("players")
        .select("id, name, house, score")
        .eq("room_id", room_id)
        .eq("name", info.player_name)
        .execute()
    )

    is_reconnect = bool(existing_player.data)

    players_in_room = get_players(room_id)

    if not is_reconnect and len(players_in_room) >= 8:
        raise HTTPException(status_code=403, detail="La sala ya tiene 8 jugadores")

    if not is_reconnect:
        players_same_house = [
            player for player in players_in_room
            if player.get("house") == info.house
        ]

        if len(players_same_house) >= 2:
            raise HTTPException(status_code=403, detail="Esa casa ya tiene 2 jugadores")

    if not is_reconnect and status != "lobby":
        raise HTTPException(status_code=403, detail="Partida ya en curso")

    if not is_reconnect:
        supabase.table("players").insert({
            "room_id": room_id,
            "name": info.player_name,
            "house": info.house,
        }).execute()

    host = get_host_from_state(state)
    is_host = False
    host_token_to_return = None

    if not host:
        host_token = info.host_token or generate_host_token()

        host = {
            "name": info.player_name,
            "token": host_token,
        }

        state["host"] = host

        supabase.table("rooms").update({
            "game_state": state
        }).eq("room_code", info.room_code.upper()).execute()

        is_host = True
        host_token_to_return = host_token

    else:
        if host.get("name") == info.player_name and info.host_token == host.get("token"):
            is_host = True
            host_token_to_return = host.get("token")

    return {
        "message": "¡Bienvenido de vuelta!" if is_reconnect else "¡Bienvenido!",
        "reconnected": is_reconnect,
        "is_host": is_host,
        "host_token": host_token_to_return,
        "host_name": host.get("name") if host else None,
    }


@app.get("/api/room/{room_code}/status")
async def get_room_status(room_code: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    room = get_room_by_code(room_code)
    players = get_players(room["id"])

    state = room.get("game_state") or {"phase": "lobby"}
    public_state = sanitize_game_state(state)

    host = get_host_from_state(state)

    return {
        "status": room.get("status"),
        "game_state": public_state,
        "players": players,
        "host": {
            "name": host.get("name") if host else None,
            "claimed": bool(host),
        },
    }


@app.post("/api/host/{room_code}/start_game/{game_id}")
async def start_game(room_code: str, game_id: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    return start_game_internal(room_code, game_id)


@app.post("/api/mobile/host/{room_code}/start_game/{game_id}")
async def mobile_host_start_game(room_code: str, game_id: str, info: HostControlInfo):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    validate_mobile_host(room_code, info)

    return start_game_internal(room_code, game_id)


@app.post("/api/mobile/host/{room_code}/start_sombrero_custom")
async def mobile_host_start_sombrero_custom(room_code: str, info: SombreroStartInfo):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    room = validate_mobile_host(room_code, info)
    previous_state = room.get("game_state") or {}
    host = get_host_from_state(previous_state)

    new_state = sombrero.build_sombrero_state(
        room_code=room_code,
        previous_state=previous_state,
        custom_question=info.question,
    )

    new_state = ensure_host_in_state(new_state, host)

    supabase.table("rooms").update({
        "status": "playing",
        "game_state": new_state,
    }).eq("room_code", room_code.upper()).execute()

    return {
        "message": "Sombrero Burlón iniciado",
        "game_id": "sombrero_burlon",
    }


@app.post("/api/player/submit_answer")
async def submit_answer(info: AnswerInfo):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    room = (
        supabase.table("rooms")
        .select("id, game_state")
        .eq("room_code", info.room_code.upper())
        .execute()
    )

    if not room.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    room_id = room.data[0]["id"]
    state = room.data[0].get("game_state") or {}
    phase = state.get("phase")

    if phase == "duelo":
        result = duelo.submit_spell_answer(
            state=state,
            player_name=info.player_name,
            answer=info.answer,
            client_elapsed_ms=info.client_elapsed_ms,
        )

        supabase.table("rooms").update({
            "game_state": result["state"],
        }).eq("room_code", info.room_code.upper()).execute()

        return {
            "message": result.get("message", "Hechizo guardado."),
            "accepted": result.get("accepted", False),
        }

    elif phase in {"duelo_clash"}:
        return {
            "message": "Usa el botón de Choque de Varitas.",
            "accepted": False,
        }

    elif phase in {"sombrero", "sombrero_tiebreak"}:
        result = sombrero.submit_vote(
            state=state,
            voter_name=info.player_name,
            target_name=info.answer,
        )

        supabase.table("rooms").update({
            "game_state": result["state"],
        }).eq("room_code", info.room_code.upper()).execute()

        return {
            "message": result.get("message", "Voto registrado."),
            "accepted": result.get("accepted", False),
        }

    elif phase == "clase_pociones":
        result = clase_pociones.submit_recipe_answer(
            state=state,
            player_name=info.player_name,
            answer=info.answer,
            client_elapsed_ms=info.client_elapsed_ms,
        )

        supabase.table("rooms").update({
            "game_state": result["state"],
        }).eq("room_code", info.room_code.upper()).execute()

        return {
            "message": result.get("message", "Poción entregada."),
            "accepted": result.get("accepted", False),
            "points": result.get("points_preview", 0),
            "errors": result.get("errors", 0),
            "perfect": result.get("perfect", False),
            "exploded": result.get("exploded", False),
        }

    elif phase == "atrapa_snitch":
        result = atrapa_snitch.submit_catch(
            state=state,
            player_name=info.player_name,
            client_elapsed_ms=info.client_elapsed_ms,
        )

        supabase.table("rooms").update({
            "game_state": result["state"],
        }).eq("room_code", info.room_code.upper()).execute()

        return {
            "message": result.get("message", "Intento registrado."),
            "accepted": result.get("accepted", False),
            "points": result.get("points_preview", 0),
            "grade": result.get("grade"),
            "label": result.get("label"),
            "delta_ms": result.get("delta_ms"),
            "caught": result.get("caught", False),
            "attempts_used": result.get("attempts_used", 0),
            "attempts_total": result.get("attempts_total", 5),
        }

    elif phase in {"patronus_personalizado"}:
        votes = state.get("votes", {})
        votes[info.answer] = votes.get(info.answer, 0) + 1
        state["votes"] = votes

        supabase.table("rooms").update({
            "game_state": state,
        }).eq("room_code", info.room_code.upper()).execute()

    elif phase == "artes_ridiculas":
        result = artes_ridiculas.score_answer(
            state=state,
            player_name=info.player_name,
            answer=info.answer,
            client_elapsed_ms=info.client_elapsed_ms,
        )

        add_points(room_id, info.player_name, result.get("points", 0))

        supabase.table("rooms").update({
            "game_state": result["state"],
        }).eq("room_code", info.room_code.upper()).execute()

        return {
            "message": result.get("message", "Respuesta guardada"),
            "points": result.get("points", 0),
            "correct": result.get("correct", False),
            "late": result.get("late", False),
            "funny_bonus": result.get("funny_bonus", False),
            "labels": result.get("labels", []),
        }

    else:
        if info.answer == state.get("correct"):
            add_points(room_id, info.player_name, state.get("points_correct", 100))
        else:
            add_points(room_id, info.player_name, state.get("points_wrong", 0))

    return {
        "message": "Respuesta guardada",
    }


@app.post("/api/player/duel_clash_tap")
async def duel_clash_tap(info: DuelClashTapInfo):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    room = (
        supabase.table("rooms")
        .select("id, game_state")
        .eq("room_code", info.room_code.upper())
        .execute()
    )

    if not room.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    state = room.data[0].get("game_state") or {}

    result = duelo.submit_clash_tap(
        state=state,
        player_name=info.player_name,
    )

    supabase.table("rooms").update({
        "game_state": result["state"],
    }).eq("room_code", info.room_code.upper()).execute()

    return {
        "message": result.get("message", "Tap registrado."),
        "accepted": result.get("accepted", False),
        "taps": result.get("taps", 0),
    }


@app.post("/api/host/{room_code}/reveal")
async def reveal_results(room_code: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    room = (
        supabase.table("rooms")
        .select("id, game_state")
        .eq("room_code", room_code.upper())
        .execute()
    )

    if not room.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    state = room.data[0].get("game_state") or {}
    room_id = room.data[0]["id"]
    players = get_players(room_id)

    if state.get("phase") in {"duelo", "duelo_clash"}:
        state, point_events, is_final = duelo.resolve_for_reveal(state)

        if is_final:
            apply_point_events(room_id, point_events)

        supabase.table("rooms").update({
            "game_state": state,
        }).eq("room_code", room_code.upper()).execute()

        return {
            "message": "Duelo revelado" if is_final else "Choque de varitas iniciado",
            "is_final": is_final,
        }

    if state.get("phase") in {"sombrero", "sombrero_tiebreak"}:
        state, point_events, is_final = sombrero.resolve_for_reveal(state)

        if is_final:
            apply_point_events(room_id, point_events)

        supabase.table("rooms").update({
            "game_state": state,
        }).eq("room_code", room_code.upper()).execute()

        return {
            "message": "Sombrero revelado" if is_final else "Desempate iniciado",
            "is_final": is_final,
        }

    if state.get("phase") == "clase_pociones":
        state, point_events, is_final = clase_pociones.resolve_for_reveal(
            state=state,
            players=players,
        )

        if is_final:
            apply_point_events(room_id, point_events)

        supabase.table("rooms").update({
            "game_state": state,
        }).eq("room_code", room_code.upper()).execute()

        return {
            "message": "Clase de Pociones revelada",
            "is_final": is_final,
        }

    if state.get("phase") == "atrapa_snitch":
        state, point_events, is_final = atrapa_snitch.resolve_for_reveal(
            state=state,
            players=players,
        )

        if is_final:
            apply_point_events(room_id, point_events)

        supabase.table("rooms").update({
            "game_state": state,
        }).eq("room_code", room_code.upper()).execute()

        return {
            "message": "Atrapa la Snitch revelado",
            "is_final": is_final,
        }

    if state.get("phase") in {"patronus_personalizado"}:
        votes = state.get("votes", {})

        if votes:
            winner = max(votes, key=votes.get)
            state["correct"] = f"{winner} ({votes[winner]} votos)"

            players_query = (
                supabase.table("players")
                .select("id, name, score")
                .eq("room_id", room_id)
                .execute()
            )

            for player in players_query.data:
                if player["name"] in votes:
                    pts = votes[player["name"]] * 10

                    if player["name"] == winner:
                        pts += 120

                    current_score = player.get("score") or 0

                    supabase.table("players").update({
                        "score": current_score + pts,
                    }).eq("id", player["id"]).execute()

    if not str(state.get("phase", "")).startswith("results_"):
        state["phase"] = f"results_{state.get('phase', 'juego')}"

    supabase.table("rooms").update({
        "game_state": state,
    }).eq("room_code", room_code.upper()).execute()

    return {
        "message": "Resultados revelados",
    }


@app.post("/api/mobile/host/{room_code}/reveal")
async def mobile_host_reveal(room_code: str, info: HostControlInfo):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    validate_mobile_host(room_code, info)

    return await reveal_results(room_code)


@app.post("/api/host/{room_code}/return_lobby")
async def return_lobby(room_code: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    room = (
        supabase.table("rooms")
        .select("game_state")
        .eq("room_code", room_code.upper())
        .execute()
    )

    lobby_state = {
        "phase": "lobby",
    }

    if room.data:
        old_state = room.data[0].get("game_state") or {}
        host = get_host_from_state(old_state)

        if host:
            lobby_state["host"] = host
        else:
            lobby_state["host"] = None

        if old_state.get("phase") == "results_artes_ridiculas":
            lobby_state["artes_streaks"] = old_state.get("streaks", {})
    else:
        lobby_state["host"] = None

    supabase.table("rooms").update({
        "status": "lobby",
        "game_state": lobby_state,
    }).eq("room_code", room_code.upper()).execute()

    return {
        "message": "De vuelta al lobby",
    }


@app.post("/api/mobile/host/{room_code}/return_lobby")
async def mobile_host_return_lobby(room_code: str, info: HostControlInfo):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    validate_mobile_host(room_code, info)

    return await return_lobby(room_code)