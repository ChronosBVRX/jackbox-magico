import random
import string
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Importamos la base de datos y los módulos de minijuegos
from api.database import supabase, PlayerJoinInfo, AnswerInfo
from api import trivia
from api import duelo
from api import sombrero

app = FastAPI(title="Hogwarts Snacks API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Conectamos los módulos
app.include_router(trivia.router)
app.include_router(duelo.router)
app.include_router(sombrero.router)

def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase, k=4))

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Cerebro principal funcionando."}

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

@app.post("/api/player/submit_answer")
async def submit_answer(info: AnswerInfo):
    room = supabase.table("rooms").select("id, game_state").eq("room_code", info.room_code.upper()).execute()
    if not room.data: return {"message": "Error"}
    
    state = room.data[0]['game_state']
    player_won = False
    
    # Calificación Trivia
    if state.get('phase') == 'trivia':
        if info.answer == state.get('correct'): player_won = True
            
    # Calificación Duelo
    elif state.get('phase') == 'duelo':
        enemy = state.get('enemy_move')
        p_move = info.answer
        if p_move == "Protección" and enemy == "Contraataque": player_won = True
        elif p_move == "Contraataque" and enemy == "Esquivar": player_won = True
        elif p_move == "Esquivar" and enemy == "Protección": player_won = True
        
    # Registro de Votos del Sombrero
    elif state.get('phase') == 'sombrero':
        voted_for = info.answer
        votes = state.get('votes', {})
        votes[voted_for] = votes.get(voted_for, 0) + 1
        state['votes'] = votes
        supabase.table("rooms").update({"game_state": state}).eq("room_code", info.room_code.upper()).execute()
    
    if player_won:
        player = supabase.table("players").select("id, score").eq("room_id", room.data[0]['id']).eq("name", info.player_name).execute()
        if player.data:
            new_score = player.data[0]['score'] + 100
            supabase.table("players").update({"score": new_score}).eq("id", player.data[0]['id']).execute()
            
    return {"message": "Respuesta guardada"}

@app.post("/api/host/{room_code}/reveal")
async def reveal_results(room_code: str):
    room = supabase.table("rooms").select("id, game_state").eq("room_code", room_code.upper()).execute()
    state = room.data[0]['game_state']
    room_id = room.data[0]['id']
    
    if state.get('phase') == 'trivia': 
        state['phase'] = 'results_trivia'
    elif state.get('phase') == 'duelo': 
        state['phase'] = 'results_duelo'
    elif state.get('phase') == 'sombrero': 
        state['phase'] = 'results_sombrero'
        votes = state.get('votes', {})
        
        if votes:
            winner = max(votes, key=votes.get)
            state['correct'] = f"{winner} ({votes[winner]} votos)"
            
            players = supabase.table("players").select("id, name, score").eq("room_id", room_id).execute()
            for p in players.data:
                p_name = p['name']
                if p_name in votes:
                    pts = votes[p_name] * 10
                    if p_name == winner: pts += 80
                    supabase.table("players").update({"score": p['score'] + pts}).eq("id", p['id']).execute()
                    
    supabase.table("rooms").update({"game_state": state}).eq("room_code", room_code.upper()).execute()
    return {"message": "Resultados revelados"}

# --- NUEVA FUNCIÓN PARA ROMPER EL LOOP ---
@app.post("/api/host/{room_code}/return_lobby")
async def return_lobby(room_code: str):
    new_state = {"phase": "lobby"}
    supabase.table("rooms").update({
        "status": "lobby", 
        "game_state": new_state
    }).eq("room_code", room_code.upper()).execute()
    return {"message": "De vuelta al lobby"}