import os
import random
import string
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

# Variables inyectadas por Vercel
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="Hogwarts Snacks - Jackbox API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PlayerJoinInfo(BaseModel):
    room_code: str
    player_name: str
    house: str

def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase, k=4))

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "El servidor mágico está funcionando"}

@app.post("/api/host/create_room")
async def create_room():
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales de Supabase")
        
    code = generate_room_code()
    initial_state = {"phase": "lobby", "message": "Esperando a los magos..."}
    
    response = supabase.table("rooms").insert({
        "room_code": code,
        "status": "lobby",
        "game_state": initial_state
    }).execute()
    
    return {"message": "Sala creada", "room_code": code, "room_id": response.data[0]['id']}

@app.post("/api/player/join")
async def join_room(info: PlayerJoinInfo):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales de Supabase")
        
    # 1. Verificar que la sala exista
    room_res = supabase.table("rooms").select("id, status").eq("room_code", info.room_code.upper()).execute()
    
    if not room_res.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada. ¿Poción confundus?")
    
    if room_res.data[0]['status'] != 'lobby':
         raise HTTPException(status_code=403, detail="La partida ya comenzó. ¡Llegaste tarde a clases!")
         
    room_id = room_res.data[0]['id']
    
    # 2. Registrar al jugador en la tabla players
    try:
        player_res = supabase.table("players").insert({
            "room_id": room_id,
            "name": info.player_name,
            "house": info.house
        }).execute()
        
        return {
            "message": "¡Bienvenido a Hogwarts!", 
            "player_id": player_res.data[0]['id']
        }
    except Exception as e:
        # Esto atrapa el error si alguien intenta usar el mismo nombre en la misma sala
        raise HTTPException(status_code=400, detail="Ese nombre ya está en uso en esta sala.")
    @app.get("/api/room/{room_code}/status")
async def get_room_status(room_code: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales de Supabase")
        
    # 1. Buscar la sala
    room_res = supabase.table("rooms").select("id, status, game_state").eq("room_code", room_code.upper()).execute()
    
    if not room_res.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
        
    room = room_res.data[0]
    
    # 2. Buscar a todos los jugadores que tengan el ID de esa sala
    players_res = supabase.table("players").select("name, house, score").eq("room_id", room['id']).execute()
    
    return {
        "status": room['status'],
        "game_state": room['game_state'],
        "players": players_res.data
    }