import random
import string
import uuid
import asyncio
from copy import deepcopy
from typing import Optional

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
 codex/fix-jackbox-party-game-logic-and-audio-nde22r
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

 main
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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

app.mount("/assets", StaticFiles(directory="public/assets"), name="assets")
app.mount("/voice-assets", StaticFiles(directory="assets"), name="voice-assets")
app.mount("/data", StaticFiles(directory="data"), name="data")
app.mount("/tv", StaticFiles(directory="public/tv"), name="tv")
app.mount("/mobile", StaticFiles(directory="public/mobile"), name="mobile")


TV_HOST_NAME = "TV"


@app.get("/")
async def home_redirect():
    return RedirectResponse(url="/tv/index.html")


class SnitchCatchInfo(BaseModel):
    room_code: str
    player_name: str
    client_elapsed_ms: Optional[int] = None


def generate_room_code():
    return "".join(random.choices(string.ascii_uppercase, k=4))


def generate_host_token():
    return str(uuid.uuid4())


def make_tv_host(tv_token: Optional[str] = None) -> dict:
    host = {
        "name": TV_HOST_NAME,
        "managed_by": "tv",
        "authority": "tv_screen",
    }

    if tv_token:
        host["token"] = str(tv_token)

    return host


def state_has_tv_authority(state: dict) -> bool:
    state = state or {}
    host = state.get("host")

    return (
        isinstance(host, dict)
        and host.get("name") == TV_HOST_NAME
        and host.get("managed_by") == "tv"
        and state.get("host_authority") == "tv"
    )


def force_tv_authority(state: Optional[dict]) -> dict:
    """
    Fuente única de verdad:
    La TV siempre es el host.
    Ningún celular puede reclamar host aunque entre primero.
    """
    state = deepcopy(state or {})

    state["host"] = make_tv_host()
    state["managed_by"] = "tv"
    state["host_authority"] = "tv"
    state["story_controlled_by"] = "tv"
    state["story_autopilot"] = True

    lifecycle = state.get("lifecycle")
    if not isinstance(lifecycle, dict):
        lifecycle = {}

    lifecycle["host_authority"] = "tv"
    lifecycle["tv_connected"] = True

    state["lifecycle"] = lifecycle

    return state


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


def format_snitch_response(result: dict):
    return {
        "message": result.get("message", "Intento registrado."),
        "accepted": result.get("accepted", False),
        "points": result.get("points_preview", 0),
        "grade": result.get("grade"),
        "label": result.get("label"),
        "delta_ms": result.get("delta_ms"),
        "caught": result.get("caught", False),
        "precision": result.get("precision", 0),
        "attempts_used": result.get("attempts_used", 0),
        "attempts_total": result.get("attempts_total", 5),
    }


def get_snitch_attempt_count_from_state(state: dict, player_name: str):
    attempts_by_player = (state or {}).get("attempts_by_player", {})

    if not isinstance(attempts_by_player, dict):
        return 0

    attempts = attempts_by_player.get(player_name)

    if isinstance(attempts, list):
        return len(attempts)

    if isinstance(attempts, int):
        return attempts

    return 0


def parse_int_or_none(value):
    if value is None:
        return None

    try:
        return int(value)
    except Exception:
        return None


async def read_json_body_flexible(request: Request):
    raw_body = await request.body()

    print("========== RAW REQUEST BODY =========", flush=True)
    print(raw_body.decode("utf-8", errors="replace"), flush=True)
    print("========== END RAW BODY =========", flush=True)

    if not raw_body:
        return {}

    try:
        return await request.json()
    except Exception as error:
        print("ERROR PARSING JSON:", repr(error), flush=True)
        raise HTTPException(
            status_code=400,
            detail=f"JSON inválido: {repr(error)}"
        )


def record_snitch_catch(room_code: str, player_name: str, client_elapsed_ms=None):
    room_code = str(room_code or "").upper().strip()
    player_name = str(player_name or "").strip()

    if not room_code:
        raise HTTPException(status_code=400, detail="Falta room_code")

    if not player_name:
        raise HTTPException(status_code=400, detail="Falta player_name")

    last_result = None

    for _ in range(3):
        room = (
            supabase.table("rooms")
            .select("id, game_state")
            .eq("room_code", room_code)
            .execute()
        )

        if not room.data:
            raise HTTPException(status_code=404, detail="Sala no encontrada")

        state = deepcopy(room.data[0].get("game_state") or {})

        result = atrapa_snitch.submit_catch(
            state=state,
            player_name=player_name,
            client_elapsed_ms=client_elapsed_ms,
        )

        last_result = result

        supabase.table("rooms").update({
            "game_state": result["state"],
        }).eq("room_code", room_code).execute()

        verify_room = (
            supabase.table("rooms")
            .select("game_state")
            .eq("room_code", room_code)
            .execute()
        )

        if not verify_room.data:
            return result

        verify_state = verify_room.data[0].get("game_state") or {}
        expected = int(result.get("attempts_used") or 0)
        saved = get_snitch_attempt_count_from_state(verify_state, player_name)

        if not result.get("accepted") or saved >= expected:
            result["state"] = verify_state
            return result

    return last_result or {
        "state": {},
        "accepted": False,
        "message": "No se pudo registrar el intento.",
        "points_preview": 0,
    }


def get_room_by_code(room_code: str):
    clean_code = str(room_code or "").upper().strip()

    if not clean_code:
        raise HTTPException(status_code=400, detail="Código de sala vacío")

    room = (
        supabase.table("rooms")
        .select("id, status, game_state")
        .eq("room_code", clean_code)
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


def get_player_house(room_id: int, player_name: str):
    player = (
        supabase.table("players")
        .select("house")
        .eq("room_id", room_id)
        .eq("name", player_name)
        .execute()
    )

    if player.data:
        return player.data[0].get("house")

    return None


def get_host_from_state(state: dict):
    return make_tv_host()


def sanitize_game_state(state: dict):
    public_state = deepcopy(state or {})
    phase = public_state.get("phase", "lobby")

    host = public_state.get("host")
    if isinstance(host, dict):
        public_state["host"] = {
            "name": TV_HOST_NAME,
            "claimed": True,
            "managed_by": "tv",
        }
    else:
        public_state["host"] = {
            "name": TV_HOST_NAME,
            "claimed": True,
            "managed_by": "tv",
        }

    public_state["managed_by"] = "tv"
    public_state["host_authority"] = "tv"

    if not phase.startswith("results_"):
        public_state.pop("correct", None)
        public_state.pop("correct_label", None)
        public_state.pop("funniest", None)
        public_state.pop("last_results", None)
        public_state.pop("duel_result", None)
        public_state.pop("point_events", None)
        public_state.pop("sombrero_result", None)
        public_state.pop("pociones_result", None)
        public_state.pop("snitch_result", None)
        public_state.pop("trivia_result", None)
        public_state.pop("retratos_result", None)
        public_state.pop("mapa_result", None)
        public_state.pop("hechizo_result", None)
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


def ensure_host_in_state(state: dict, host: dict = None):
    return force_tv_authority(state)


def validate_mobile_host(room_code: str, info: HostControlInfo):
    raise HTTPException(
        status_code=403,
        detail="Los celulares no pueden ser host. La TV controla la partida.",
    )


def build_game_state(room_code: str, game_id: str, previous_state: dict):
    if game_id == "trivia_magica":
        return trivia.build_trivia_state(
            room_code=room_code.upper(),
            previous_state=previous_state,
        )

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
        return retratos_chismosos.build_state(
            previous_state=previous_state,
        )

    if game_id == "mapa_travieso":
        return mapa_travieso.build_state()

    if game_id == "hechizo_incompleto":
        return hechizo_incompleto.build_state(
            previous_state=previous_state,
        )

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
    previous_state = force_tv_authority(room.get("game_state") or {})

    new_state = build_game_state(
        room_code=room_code,
        game_id=game_id,
        previous_state=previous_state,
    )

    new_state = force_tv_authority(new_state)

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

    game_state = force_tv_authority({
        "phase": "lobby",
    })

    supabase.table("rooms").insert({
        "room_code": code,
        "status": "lobby",
        "game_state": game_state,
    }).execute()

    return {
        "message": "Sala creada por TV",
        "room_code": code,
        "host": {
            "name": TV_HOST_NAME,
            "claimed": True,
            "managed_by": "tv",
        },
    }


@app.post("/api/player/join")
async def join_room(info: PlayerJoinInfo):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    room = get_room_by_code(info.room_code)
    room_id = room["id"]
    status = room.get("status")

    state = force_tv_authority(room.get("game_state") or {"phase": "lobby"})

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

    supabase.table("rooms").update({
        "game_state": state,
    }).eq("room_code", info.room_code.upper()).execute()

    return {
        "message": "¡Bienvenido de vuelta!" if is_reconnect else "¡Bienvenido!",
        "reconnected": is_reconnect,
        "is_host": False,
        "host_token": None,
        "host_name": TV_HOST_NAME,
    }


@app.get("/api/room/{room_code}/status")
async def get_room_status(room_code: str):
    return get_public_room_snapshot(room_code)


def get_public_room_snapshot(room_code: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    if not room_code or len(str(room_code).strip()) < 4:
        raise HTTPException(
            status_code=400,
            detail=f"Código de sala inválido: {room_code}",
        )

    room = get_room_by_code(room_code)
    players = get_players(room["id"])

    raw_state = room.get("game_state") or {"phase": "lobby"}
    state = force_tv_authority(raw_state)

    if not state_has_tv_authority(raw_state):
        supabase.table("rooms").update({
            "game_state": state,
        }).eq("room_code", room_code.upper()).execute()

    public_state = sanitize_game_state(state)

    return {
        "status": room.get("status"),
        "game_state": public_state,
        "players": players,
        "host": {
            "name": TV_HOST_NAME,
            "claimed": True,
            "managed_by": "tv",
        },
        "server_ts": int(asyncio.get_event_loop().time() * 1000),
    }


@app.websocket("/api/ws/room/{room_code}")
async def ws_room_status(websocket: WebSocket, room_code: str):
    await websocket.accept()
    room_code = str(room_code or "").upper().strip()

    try:
        while True:
            try:
                snapshot = get_public_room_snapshot(room_code)
                await websocket.send_json({
                    "type": "room_status",
                    "room_code": room_code,
                    "payload": snapshot,
                })
            except HTTPException as error:
                await websocket.send_json({
                    "type": "room_error",
                    "room_code": room_code,
                    "detail": error.detail,
                    "status_code": error.status_code,
                })

            try:
                message = await asyncio.wait_for(websocket.receive_text(), timeout=0.65)
                if message == "close":
                    break
            except asyncio.TimeoutError:
                pass
    except WebSocketDisconnect:
        return


@app.post("/api/host/{room_code}/start_game/{game_id}")
async def start_game(room_code: str, game_id: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    return start_game_internal(room_code, game_id)


@app.post("/api/mobile/host/{room_code}/start_game/{game_id}")
async def mobile_host_start_game(room_code: str, game_id: str, info: HostControlInfo):
    raise HTTPException(
        status_code=403,
        detail="Los celulares no pueden iniciar juegos. La TV controla la partida.",
    )


@app.post("/api/mobile/host/{room_code}/start_sombrero_custom")
async def mobile_host_start_sombrero_custom(room_code: str, info: SombreroStartInfo):
    raise HTTPException(
        status_code=403,
        detail="Los celulares no pueden iniciar juegos. La TV controla la partida.",
    )


@app.post("/api/player/snitch_catch")
async def snitch_catch(request: Request):
    print("========== SNITCH CATCH REQUEST =========", flush=True)

    if not supabase:
        print("ERROR: Supabase no configurado", flush=True)
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    payload = await read_json_body_flexible(request)

    print("PAYLOAD:", payload, flush=True)

    room_code = (
        payload.get("room_code")
        or payload.get("room")
        or payload.get("roomCode")
        or payload.get("codigo")
        or request.query_params.get("room_code")
        or request.query_params.get("room")
    )

    player_name = (
        payload.get("player_name")
        or payload.get("player")
        or payload.get("playerName")
        or payload.get("name")
        or payload.get("nombre")
        or request.query_params.get("player_name")
        or request.query_params.get("name")
    )

    client_elapsed_ms = (
        payload.get("client_elapsed_ms")
        or payload.get("clientElapsedMs")
        or payload.get("elapsed_ms")
        or payload.get("elapsed")
        or request.query_params.get("client_elapsed_ms")
    )

    client_elapsed_ms = parse_int_or_none(client_elapsed_ms)

    print("room_code:", room_code, flush=True)
    print("player_name:", player_name, flush=True)
    print("client_elapsed_ms:", client_elapsed_ms, flush=True)

    if not room_code:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Falta room_code",
                "payload_recibido": payload,
            },
        )

    if not player_name:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Falta player_name",
                "payload_recibido": payload,
            },
        )

    try:
        room_debug = (
            supabase.table("rooms")
            .select("id, status, game_state")
            .eq("room_code", str(room_code).upper())
            .execute()
        )

        print("ROOM DEBUG:", room_debug.data, flush=True)

        if room_debug.data:
            debug_state = room_debug.data[0].get("game_state") or {}
            print("PHASE BEFORE:", debug_state.get("phase"), flush=True)
            print("ATTEMPTS BEFORE:", debug_state.get("attempts_by_player"), flush=True)

        result = record_snitch_catch(
            room_code=room_code,
            player_name=player_name,
            client_elapsed_ms=client_elapsed_ms,
        )

        print("RESULT ACCEPTED:", result.get("accepted"), flush=True)
        print("RESULT MESSAGE:", result.get("message"), flush=True)
        print("RESULT ATTEMPTS USED:", result.get("attempts_used"), flush=True)
        print("RESULT STATE ATTEMPTS:", result.get("state", {}).get("attempts_by_player"), flush=True)

        response = format_snitch_response(result)

        print("RESPONSE:", response, flush=True)
        print("========== END SNITCH CATCH =========", flush=True)

        return response

    except HTTPException:
        raise

    except Exception as error:
        print("SNITCH ERROR:", repr(error), flush=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error interno Snitch: {repr(error)}"
        )


@app.post("/api/player/submit_answer")
async def submit_answer(request: Request):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    payload = await read_json_body_flexible(request)

    room_code = (
        payload.get("room_code")
        or payload.get("roomCode")
        or payload.get("room")
        or payload.get("codigo")
    )

    player_name = (
        payload.get("player_name")
        or payload.get("playerName")
        or payload.get("player")
        or payload.get("name")
        or payload.get("nombre")
    )

    answer = (
        payload.get("answer")
        or payload.get("respuesta")
        or payload.get("value")
        or payload.get("option")
    )

    client_elapsed_ms = (
        payload.get("client_elapsed_ms")
        or payload.get("clientElapsedMs")
        or payload.get("elapsed_ms")
        or payload.get("elapsed")
    )

    client_elapsed_ms = parse_int_or_none(client_elapsed_ms)

    if not room_code:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Falta room_code",
                "payload_recibido": payload,
            },
        )

    if not player_name:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Falta player_name",
                "payload_recibido": payload,
            },
        )

    if answer is None:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Falta answer",
                "payload_recibido": payload,
            },
        )

    room_code = str(room_code).upper().strip()

    room = (
        supabase.table("rooms")
        .select("id, game_state")
        .eq("room_code", room_code)
        .execute()
    )

    if not room.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    room_id = room.data[0]["id"]
    state = room.data[0].get("game_state") or {}
    phase = state.get("phase")

    if phase == "trivia":
        result = trivia.score_answer(
            state=state,
            player_name=player_name,
            answer=answer,
            client_elapsed_ms=client_elapsed_ms,
        )

        supabase.table("rooms").update({
            "game_state": result["state"],
        }).eq("room_code", room_code).execute()

        return {
            "message": result.get("message", "Respuesta guardada."),
            "accepted": result.get("accepted", False),
            "points": result.get("points", 0),
            "correct": result.get("correct", False),
            "elapsed_seconds": result.get("elapsed_seconds"),
            "late": result.get("late", False),
        }

    elif phase == "duelo":
        result = duelo.submit_spell_answer(
            state=state,
            player_name=player_name,
            answer=answer,
            client_elapsed_ms=client_elapsed_ms,
        )

        supabase.table("rooms").update({
            "game_state": result["state"],
        }).eq("room_code", room_code).execute()

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
            voter_name=player_name,
            target_name=answer,
        )

        supabase.table("rooms").update({
            "game_state": result["state"],
        }).eq("room_code", room_code).execute()

        return {
            "message": result.get("message", "Voto registrado."),
            "accepted": result.get("accepted", False),
        }

    elif phase == "clase_pociones":
        result = clase_pociones.submit_recipe_answer(
            state=state,
            player_name=player_name,
            answer=answer,
            client_elapsed_ms=client_elapsed_ms,
        )

        supabase.table("rooms").update({
            "game_state": result["state"],
        }).eq("room_code", room_code).execute()

        return {
            "message": result.get("message", "Poción entregada."),
            "accepted": result.get("accepted", False),
            "points": result.get("points_preview", 0),
            "errors": result.get("errors", 0),
            "perfect": result.get("perfect", False),
            "exploded": result.get("exploded", False),
        }

    elif phase == "atrapa_snitch":
        result = record_snitch_catch(
            room_code=room_code,
            player_name=player_name,
            client_elapsed_ms=client_elapsed_ms,
        )

        return format_snitch_response(result)

    elif phase in {"patronus_personalizado"}:
        event = patronus_personalizado.decode_event_key(str(answer))

        if not event:
            return {
                "message": "Evento de Patronus inválido.",
                "accepted": False,
            }

        if event.get("round_id") != state.get("round_id"):
            return {
                "message": "Este evento pertenece a otra ronda de Patronus.",
                "accepted": False,
            }

        players = state.get("players") or get_players(room_id)
        state["players"] = players

        player_map = {
            player.get("name"): player
            for player in players
            if player.get("name")
        }

        if player_name not in player_map:
            return {
                "message": "No perteneces a esta sala de Patronus.",
                "accepted": False,
            }

        votes = state.get("votes", {}) or {}
        round_id = state.get("round_id")
        parsed = patronus_personalizado.parse_event_log(votes, round_id)

        event_type = event.get("type")

        if event_type == "answer":
            if event.get("player_name") != player_name:
                return {
                    "message": "No puedes enviar una respuesta a nombre de otro jugador.",
                    "accepted": False,
                }

            if player_name in parsed.get("submissions", {}):
                return {
                    "message": "Ya habías invocado tu Patronus.",
                    "accepted": True,
                }

            mode = (state.get("settings") or {}).get("mode", "family")

            validation = patronus_personalizado.validate_answer(
                event.get("answer", ""),
                mode=mode,
            )

            if not validation.get("accepted"):
                return {
                    "message": validation.get("message", "Respuesta no aceptada."),
                    "accepted": False,
                }

            player_house = player_map[player_name].get("house")

            event_key = patronus_personalizado.encode_answer_event(
                round_id=round_id,
                player_name=player_name,
                house=player_house,
                answer=validation.get("answer"),
            )

            votes[event_key] = 1
            state["votes"] = votes

            parsed = patronus_personalizado.parse_event_log(votes, round_id)
            state["submitted_count"] = len(parsed.get("submissions", {}))
            state["answers"] = {
                name: True
                for name in parsed.get("submissions", {}).keys()
            }

            supabase.table("rooms").update({
                "game_state": state,
            }).eq("room_code", room_code).execute()

            return {
                "message": "Respuesta invocada por el Patronus.",
                "accepted": True,
            }

        if event_type == "vote":
            if event.get("voter_name") != player_name:
                return {
                    "message": "No puedes votar a nombre de otro jugador.",
                    "accepted": False,
                }

            target_player = event.get("target_player")

            if target_player == player_name:
                return {
                    "message": "No puedes votar por tu propia respuesta, mago sospechoso.",
                    "accepted": False,
                }

            submissions = parsed.get("submissions", {})

            if target_player not in submissions:
                return {
                    "message": "Esa respuesta no está disponible para votar.",
                    "accepted": False,
                }

            if player_name in parsed.get("vote_by_voter", {}):
                return {
                    "message": "Ya habías votado. El Patronus no acepta doble voto.",
                    "accepted": True,
                }

            event_key = patronus_personalizado.encode_vote_event(
                round_id=round_id,
                voter_name=player_name,
                target_player=target_player,
            )

            votes[event_key] = 1
            state["votes"] = votes

            parsed = patronus_personalizado.parse_event_log(votes, round_id)
            state["voted_count"] = len(parsed.get("vote_by_voter", {}))

            supabase.table("rooms").update({
                "game_state": state,
            }).eq("room_code", room_code).execute()

            return {
                "message": "Voto registrado por el Patronus.",
                "accepted": True,
            }

        if event_type == "control":
            return {
                "message": "El control de Patronus se hace desde la TV.",
                "accepted": False,
            }

        return {
            "message": "Evento de Patronus no aceptado.",
            "accepted": False,
        }

    elif phase == "retratos_chismosos":
        player_house = get_player_house(
            room_id=room_id,
            player_name=player_name,
        )

        result = retratos_chismosos.score_answer(
            state=state,
            player_name=player_name,
            answer=answer,
            player_house=player_house,
            client_elapsed_ms=client_elapsed_ms,
        )

        supabase.table("rooms").update({
            "game_state": result["state"],
        }).eq("room_code", room_code).execute()

        return {
            "message": result.get("message", "Respuesta guardada"),
            "accepted": result.get("accepted", False),
            "points": result.get("points", 0),
            "correct": result.get("correct", False),
            "clue_number": result.get("clue_number"),
        }

    elif phase == "mapa_travieso":
        player_house = get_player_house(
            room_id=room_id,
            player_name=player_name,
        )

        result = mapa_travieso.score_answer(
            state=state,
            player_name=player_name,
            answer=answer,
            player_house=player_house,
            client_elapsed_ms=client_elapsed_ms,
        )

        if result.get("accepted"):
            add_points(room_id, player_name, result.get("points", 0))

        supabase.table("rooms").update({
            "game_state": result["state"],
        }).eq("room_code", room_code).execute()

        return {
            "message": result.get("message", "Respuesta guardada"),
            "accepted": result.get("accepted", False),
            "points": result.get("points", 0),
            "correct": result.get("correct", False),
        }

    elif phase == "hechizo_incompleto":
        player_house = get_player_house(
            room_id=room_id,
            player_name=player_name,
        )

        result = hechizo_incompleto.score_answer(
            state=state,
            player_name=player_name,
            answer=answer,
            player_house=player_house,
            client_elapsed_ms=client_elapsed_ms,
        )

        if result.get("accepted"):
            add_points(room_id, player_name, result.get("points", 0))

        supabase.table("rooms").update({
            "game_state": result["state"],
        }).eq("room_code", room_code).execute()

        return {
            "message": result.get("message", "Respuesta guardada"),
            "accepted": result.get("accepted", False),
            "points": result.get("points", 0),
            "correct": result.get("correct", False),
            "late": result.get("late", False),
            "elapsed_seconds": result.get("elapsed_seconds"),
            "labels": result.get("labels", []),
        }

    elif phase == "artes_ridiculas":
        result = artes_ridiculas.score_answer(
            state=state,
            player_name=player_name,
            answer=answer,
            client_elapsed_ms=client_elapsed_ms,
        )

        add_points(room_id, player_name, result.get("points", 0))

        supabase.table("rooms").update({
            "game_state": result["state"],
        }).eq("room_code", room_code).execute()

        return {
            "message": result.get("message", "Respuesta guardada"),
            "points": result.get("points", 0),
            "correct": result.get("correct", False),
            "late": result.get("late", False),
            "funny_bonus": result.get("funny_bonus", False),
            "labels": result.get("labels", []),
        }

    else:
        if answer == state.get("correct"):
            add_points(room_id, player_name, state.get("points_correct", 100))
        else:
            add_points(room_id, player_name, state.get("points_wrong", 0))

    return {
        "message": "Respuesta guardada",
        "accepted": True,
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

    state = force_tv_authority(room.data[0].get("game_state") or {})
    room_id = room.data[0]["id"]
    players = get_players(room_id)

    if state.get("phase") == "trivia":
        state, point_events, is_final = trivia.resolve_for_reveal(
            state=state,
            players=players,
        )

        if is_final:
            apply_point_events(room_id, point_events)

        state = force_tv_authority(state)

        supabase.table("rooms").update({
            "game_state": state,
        }).eq("room_code", room_code.upper()).execute()

        return {
            "message": "Trivia revelada",
            "is_final": is_final,
        }

    if state.get("phase") in {"duelo", "duelo_clash"}:
        state, point_events, is_final = duelo.resolve_for_reveal(state)

        if is_final:
            apply_point_events(room_id, point_events)

        state = force_tv_authority(state)

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

        state = force_tv_authority(state)

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

        state = force_tv_authority(state)

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

        state = force_tv_authority(state)

        supabase.table("rooms").update({
            "game_state": state,
        }).eq("room_code", room_code.upper()).execute()

        return {
            "message": "Atrapa la Snitch revelado",
            "is_final": is_final,
        }

    if state.get("phase") == "retratos_chismosos":
        state, point_events, is_final = retratos_chismosos.resolve_for_reveal(
            state=state,
            players=players,
        )

        if is_final:
            apply_point_events(room_id, point_events)

        state = force_tv_authority(state)

        supabase.table("rooms").update({
            "game_state": state,
        }).eq("room_code", room_code.upper()).execute()

        return {
            "message": "Retratos Chismosos revelado",
            "is_final": is_final,
        }

    if state.get("phase") == "mapa_travieso":
        state, point_events, is_final = mapa_travieso.resolve_for_reveal(
            state=state,
            players=players,
        )

        if is_final:
            apply_point_events(room_id, point_events)

        state = force_tv_authority(state)

        supabase.table("rooms").update({
            "game_state": state,
        }).eq("room_code", room_code.upper()).execute()

        return {
            "message": "El Mapa Travieso revelado",
            "is_final": is_final,
        }

    if state.get("phase") == "hechizo_incompleto":
        state, point_events, is_final = hechizo_incompleto.resolve_for_reveal(
            state=state,
            players=players,
        )

        if is_final:
            apply_point_events(room_id, point_events)

        state = force_tv_authority(state)

        supabase.table("rooms").update({
            "game_state": state,
        }).eq("room_code", room_code.upper()).execute()

        return {
            "message": "Hechizo Incompleto revelado",
            "is_final": is_final,
        }

    if state.get("phase") in {"patronus_personalizado", "results_patronus_personalizado"}:
        state["players"] = players

        if not state.get("scored"):
            result = patronus_personalizado.calculate_results(state)
            point_events = result.get("point_events", [])

            apply_point_events(room_id, point_events)

            state["point_events"] = point_events
            state["patronus_result"] = result
            state["votes_by_target"] = result.get("votes_by_target", {})
            state["votes_by_voter"] = result.get("votes_by_voter", {})
            state["scored"] = True

            ranking = result.get("ranking", [])

            if ranking:
                winner = ranking[0]
                state["correct"] = (
                    f"{winner.get('player_name')} "
                    f"({winner.get('votes', 0)} votos)"
                )
            else:
                state["correct"] = "Sin ganador"

        state["phase"] = "results_patronus_personalizado"
        state = force_tv_authority(state)

        supabase.table("rooms").update({
            "game_state": state,
        }).eq("room_code", room_code.upper()).execute()

        return {
            "message": "Patronus Personalizado revelado",
            "is_final": True,
        }

    if not str(state.get("phase", "")).startswith("results_"):
        state["phase"] = f"results_{state.get('phase', 'juego')}"

    state = force_tv_authority(state)

    supabase.table("rooms").update({
        "game_state": state,
    }).eq("room_code", room_code.upper()).execute()

    return {
        "message": "Resultados revelados",
    }


@app.post("/api/mobile/host/{room_code}/reveal")
async def mobile_host_reveal(room_code: str, info: HostControlInfo):
    raise HTTPException(
        status_code=403,
        detail="Los celulares no pueden revelar resultados. La TV controla la partida.",
    )


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

    lobby_state = force_tv_authority({
        "phase": "lobby",
    })

    if room.data:
        old_state = room.data[0].get("game_state") or {}

        if old_state.get("phase") == "results_artes_ridiculas":
            lobby_state["artes_streaks"] = old_state.get("streaks", {})

        if old_state.get("phase") in {"hechizo_incompleto", "results_hechizo_incompleto"}:
            lobby_state["hechizo_streaks"] = old_state.get(
                "hechizo_streaks",
                old_state.get("streaks", {}),
            )

        if old_state.get("phase") in {"trivia", "results_trivia"}:
            lobby_state["trivia_session"] = old_state.get("trivia_session", {})

    supabase.table("rooms").update({
        "status": "lobby",
        "game_state": lobby_state,
    }).eq("room_code", room_code.upper()).execute()

    return {
        "message": "De vuelta al lobby",
    }


@app.post("/api/mobile/host/{room_code}/return_lobby")
async def mobile_host_return_lobby(room_code: str, info: HostControlInfo):
    raise HTTPException(
        status_code=403,
        detail="Los celulares no pueden regresar al lobby. La TV controla la partida.",
    )


@app.get("/api/debug/snitch/{room_code}")
async def debug_snitch(room_code: str):
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

    room_data = room.data[0]
    state = force_tv_authority(room_data.get("game_state") or {})
    players = get_players(room_data["id"])

    return {
        "room_code": room_code.upper(),
        "room_status": room_data.get("status"),
        "phase": state.get("phase"),
        "game_id": state.get("game_id"),
        "round_id": state.get("round_id"),
        "started_at": state.get("started_at"),
        "duration_seconds": state.get("duration_seconds"),
        "attempts_total": state.get("attempts_total"),
        "attempts_by_player": state.get("attempts_by_player"),
        "snitch_submitted_players": state.get("snitch_submitted_players"),
        "players": players,
        "raw_game_state": state,
    }


@app.get("/api/debug/trivia/{room_code}")
async def debug_trivia(room_code: str):
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

    room_data = room.data[0]
    state = force_tv_authority(room_data.get("game_state") or {})
    players = get_players(room_data["id"])

    return {
        "room_code": room_code.upper(),
        "room_status": room_data.get("status"),
        "phase": state.get("phase"),
        "game_id": state.get("game_id"),
        "round_id": state.get("round_id"),
        "round_number": state.get("round_number"),
        "category": state.get("category"),
        "difficulty": state.get("difficulty"),
        "question": state.get("question"),
        "options": state.get("options"),
        "correct": state.get("correct"),
        "correct_label": state.get("correct_label"),
        "started_at": state.get("started_at"),
        "duration_seconds": state.get("duration_seconds"),
        "answered": state.get("answered"),
        "answers": state.get("answers"),
        "correct_players": state.get("correct_players"),
        "fastest_correct": state.get("fastest_correct"),
        "trivia_session": state.get("trivia_session"),
        "trivia_result": state.get("trivia_result"),
        "players": players,
        "raw_game_state": state,
    }


@app.get("/api/debug/mapa/{room_code}")
async def debug_mapa(room_code: str):
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

    room_data = room.data[0]
    state = force_tv_authority(room_data.get("game_state") or {})
    players = get_players(room_data["id"])

    return {
        "room_code": room_code.upper(),
        "room_status": room_data.get("status"),
        "phase": state.get("phase"),
        "game_id": state.get("game_id"),
        "round_id": state.get("round_id"),
        "started_at": state.get("started_at"),
        "observation_seconds": state.get("observation_seconds"),
        "answer_seconds": state.get("answer_seconds"),
        "variant": state.get("variant"),
        "question": state.get("question"),
        "options": state.get("options"),
        "correct": state.get("correct"),
        "correct_label": state.get("correct_label"),
        "target_object": state.get("target_object"),
        "answers": state.get("answers"),
        "mapa_result": state.get("mapa_result"),
        "players": players,
        "raw_game_state": state,
    }
