import os
import random
import string
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="Hogwarts Snacks API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base de datos de preguntas de Trivia
TRIVIA_POOL = [
    {"q": "¿Qué hechizo usarías para no pagar la cuenta?", "o": ["Obliviate", "Lumos", "Expelliarmus", "Alohomora"], "c": "Obliviate"},
    {"q": "¿Qué criatura te robaría el aguinaldo?", "o": ["Dementor", "Escarbato", "Boggart", "Thestral"], "c": "Escarbato"},
    {"q": "¿Qué casa sobreviviría mejor a una peda mágica?", "o": ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"], "c": "Hufflepuff"},
    {"q": "Si tu suegra fuera un Boggart, ¿qué hechizo usarías?", "o": ["Riddikulus", "Avada Kedavra", "Protego", "Desmaio"], "c": "Riddikulus"}
]

class PlayerJoinInfo(BaseModel):
    room_code: str
    player_name: str
    house: str

class AnswerInfo(BaseModel):
    room_code: str
    player_name: str
    answer: str

@app.post("/api/host/create_room")
async def create_room():
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales de Supabase")
        
    code = ''.join(random.choices(string.ascii_uppercase, k=4))
    initial_state = {"phase": "lobby", "question": "", "options": [], "correct": ""}
    
    supabase.table("rooms").insert({
        "room_code": code, 
        "status": "lobby", 
        "game_state": initial_state
    }).execute()
    
    return {"room_code": code}

@app.post("/api/player/join")
async def join_room(info: PlayerJoinInfo):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales de Supabase")
        
    room = supabase.table("rooms").select("id, status").eq("room_code", info.room_code.upper()).execute()
    
    if not room.data: 
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    if room.data[0]['status'] != 'lobby':
        raise HTTPException(status_code=403, detail="La partida ya comenzó.")
    
    try:
        supabase.table("players").insert({
            "room_id": room.data[0]['id'], 
            "name": info.player_name, 
            "house": info.house
        }).execute()
        return {"message": "ok"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Ese nombre ya está en uso en esta sala.")

@app.get("/api/room/{room_code}/status")
async def get_room_status(room_code: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales de Supabase")
    
    room = supabase.table("rooms").select("id, status, game_state").eq("room_code", room_code.upper()).execute()
    if not room.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
        
    players = supabase.table("players").select("name, house, score").eq("room_id", room.data[0]['id']).execute()
    
    return {
        "status": room.data[0]['status'],
        "game_state": room.data[0]['game_state'],
        "players": players.data
    }

@app.post("/api/host/{room_code}/next_question")
async def next_question(room_code: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")
        
    pregunta = random.choice(TRIVIA_POOL)
    new_state = {
        "phase": "trivia",
        "question": pregunta['q'],
        "options": pregunta['o'],
        "correct": pregunta['c']
    }
    
    supabase.table("rooms").update({
        "status": "playing", 
        "game_state": new_state
    }).eq("room_code", room_code.upper()).execute()
    
    return {"message": "Pregunta lanzada"}

@app.post("/api/player/submit_answer")
async def submit_answer(info: AnswerInfo):
    return {"message": "Respuesta recibida"}