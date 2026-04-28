import random
import string

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from api.database import supabase, PlayerJoinInfo, AnswerInfo
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


def add_points(room_id: int, player_name: str, points: int):
    if points == 0:
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

    room = (
        supabase.table("rooms")
        .select("id, status")
        .eq("room_code", info.room_code.upper())
        .execute()
    )

    if not room.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    if room.data[0]["status"] != "lobby":
        raise HTTPException(status_code=403, detail="Partida ya en curso")

    try:
        supabase.table("players").insert({
            "room_id": room.data[0]["id"],
            "name": info.player_name,
            "house": info.house,
        }).execute()

        return {
            "message": "¡Bienvenido!",
        }
    except Exception:
        raise HTTPException(status_code=400, detail="Nombre en uso.")


@app.get("/api/room/{room_code}/status")
async def get_room_status(room_code: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    room = (
        supabase.table("rooms")
        .select("id, status, game_state")
        .eq("room_code", room_code.upper())
        .execute()
    )

    if not room.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    players = (
        supabase.table("players")
        .select("name, house, score")
        .eq("room_id", room.data[0]["id"])
        .execute()
    )

    return {
        "status": room.data[0]["status"],
        "game_state": room.data[0]["game_state"],
        "players": players.data,
    }


@app.post("/api/host/{room_code}/start_game/{game_id}")
async def start_game(room_code: str, game_id: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    if game_id not in GAME_CATALOG:
        raise HTTPException(status_code=404, detail="Juego no existe en el catálogo")

    current_room = (
        supabase.table("rooms")
        .select("id, game_state")
        .eq("room_code", room_code.upper())
        .execute()
    )

    if not current_room.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    previous_state = current_room.data[0].get("game_state") or {}

    if game_id == "trivia_magica":
        new_state = trivia.build_trivia_state()

    elif game_id == "duelo_hechizos":
        new_state = duelo.build_duelo_state()

    elif game_id == "sombrero_burlon":
        new_state = sombrero.build_sombrero_state(room_code)

    elif game_id == "clase_pociones":
        new_state = clase_pociones.build_state()

    elif game_id == "atrapa_snitch":
        new_state = atrapa_snitch.build_state()

    elif game_id == "retratos_chismosos":
        new_state = retratos_chismosos.build_state()

    elif game_id == "mapa_travieso":
        new_state = mapa_travieso.build_state()

    elif game_id == "hechizo_incompleto":
        new_state = hechizo_incompleto.build_state()

    elif game_id == "artes_ridiculas":
        new_state = artes_ridiculas.build_state(
            previous_state=previous_state,
            humor_mode=True,
        )

    elif game_id == "caldero_mentiroso":
        new_state = caldero_mentiroso.build_state()

    elif game_id == "patronus_personalizado":
        new_state = patronus_personalizado.build_state(room_code)

    elif game_id == "copa_final":
        new_state = copa_final.build_state()

    else:
        raise HTTPException(status_code=400, detail="Juego sin constructor")

    supabase.table("rooms").update({
        "status": "playing",
        "game_state": new_state,
    }).eq("room_code", room_code.upper()).execute()

    return {
        "message": f"{GAME_CATALOG[game_id]['name']} iniciado",
        "game_id": game_id,
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
        enemy = state.get("enemy_move")

        wins = (
            (info.answer == "Protección" and enemy == "Contraataque")
            or (info.answer == "Contraataque" and enemy == "Esquivar")
            or (info.answer == "Esquivar" and enemy == "Protección")
        )

        if wins:
            add_points(room_id, info.player_name, 100)

    elif phase in {"sombrero", "patronus_personalizado"}:
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

    if state.get("phase") in {"sombrero", "patronus_personalizado"}:
        votes = state.get("votes", {})

        if votes:
            winner = max(votes, key=votes.get)
            state["correct"] = f"{winner} ({votes[winner]} votos)"

            players = (
                supabase.table("players")
                .select("id, name, score")
                .eq("room_id", room_id)
                .execute()
            )

            for player in players.data:
                if player["name"] in votes:
                    pts = votes[player["name"]] * 10

                    if player["name"] == winner:
                        pts += 120 if state.get("phase") == "patronus_personalizado" else 80

                    current_score = player.get("score") or 0

                    supabase.table("players").update({
                        "score": current_score + pts,
                    }).eq("id", player["id"]).execute()

    state["phase"] = f"results_{state.get('phase', 'juego')}"

    supabase.table("rooms").update({
        "game_state": state,
    }).eq("room_code", room_code.upper()).execute()

    return {
        "message": "Resultados revelados",
    }


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

        if old_state.get("phase") == "results_artes_ridiculas":
            lobby_state["artes_streaks"] = old_state.get("streaks", {})

    supabase.table("rooms").update({
        "status": "lobby",
        "game_state": lobby_state,
    }).eq("room_code", room_code.upper()).execute()

    return {
        "message": "De vuelta al lobby",
    }
