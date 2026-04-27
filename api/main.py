import random
import string
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Importamos la base de datos y los módulos de minijuegos
from api.database import supabase, PlayerJoinInfo, AnswerInfo
from api import trivia
from api import duelo

app = FastAPI(title="Hogwarts Snacks API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Conectamos los módulos (Minijuegos) al cerebro principal
app.include_router(trivia.router)
app.include_router(duelo.router)

def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase, k=4))

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Cerebro principal funcionando perfectamente."}

# --- RUTAS DE LOBBY Y JUGADORES ---

@app.post("/api/host/create_room")
async def create_room():
    if not supabase: raise HTTPException(status_code=500, detail="Faltan credenciales")
    code = generate_room_code()
    initial_state = {"phase": "lobby"}
    supabase.table("rooms").insert({"room_code": code, "status": "lobby", "game_state": initial_state}).execute()
    return {"message": "Sala creada", "room_code": code}

@app.post("/api/player/join")
async def join_room(info: PlayerJoinInfo):
    if not supabase: raise HTTPException(status_code=500, detail="Faltan credenciales")
    room = supabase.table("rooms").select("id, status").eq("room_code", info.room_code.upper()).execute()
    if not room.data: raise HTTPException(status_code=404, detail="Sala no encontrada")
    if room.data[0]['status'] != 'lobby': raise HTTPException(status_code=403, detail="Partida ya en curso")
    try:
        supabase.table("players").insert({"room_id": room.data[0]['id'], "name": info.player_name, "house": info.house}).execute()
        return {"message": "¡Bienvenido!"}
    except Exception:
        raise HTTPException(status_code=400, detail="Nombre en uso.")

@app.get("/api/room/{room_code}/status")
async def get_room_status(room_code: str):
    if not supabase: raise HTTPException(status_code=500, detail="Faltan credenciales")
    room = supabase.table("rooms").select("id, status, game_state").eq("room_code", room_code.upper()).execute()
    if not room.data: raise HTTPException(status_code=404, detail="Sala no encontrada")
    players = supabase.table("players").select("name, house, score").eq("room_id", room.data[0]['id']).execute()
    return {"status": room.data[0]['status'], "game_state": room.data[0]['game_state'], "players": players.data}

# --- EL ÁRBITRO DE PUNTOS ---

@app.post("/api/player/submit_answer")
async def submit_answer(info: AnswerInfo):
    room = supabase.table("rooms").select("id, game_state").eq("room_code", info.room_code.upper()).execute()
    if not room.data: return {"message": "Error"}
    
    state = room.data[0]['game_state']
    player_won = False
    
    # El Árbitro califica la Trivia
    if state.get('phase') == 'trivia':
        if info.answer == state.get('correct'):
            player_won = True
            
    # El Árbitro califica el Duelo
    elif state.get('phase') == 'duelo':
        enemy = state.get('enemy_move')
        p_move = info.answer
        if p_move == "Protección" and enemy == "Contraataque": player_won = True
        elif p_move == "Contraataque" and enemy == "Esquivar": player_won = True
        elif p_move == "Esquivar" and enemy == "Protección": player_won = True
    
    # Si ganó, sumamos 100 puntos
    if player_won:
        player = supabase.table("players").select("id, score").eq("room_id", room.data[0]['id']).eq("name", info.player_name).execute()
        if player.data:
            new_score = player.data[0]['score'] + 100
            supabase.table("players").update({"score": new_score}).eq("id", player.data[0]['id']).execute()
            
    return {"message": "Respuesta guardada"}

@app.post("/api/host/{room_code}/reveal")
async def reveal_results(room_code: str):
    room = supabase.table("rooms").select("game_state").eq("room_code", room_code.upper()).execute()
    state = room.data[0]['game_state']
    
    if state.get('phase') == 'trivia': state['phase'] = 'results_trivia'
    elif state.get('phase') == 'duelo': state['phase'] = 'results_duelo'
        
    supabase.table("rooms").update({"game_state": state}).eq("room_code", room_code.upper()).execute()
    return {"message": "Resultados revelados"}