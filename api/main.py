import os
import random
import string
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

# Vercel inyectará estas variables
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Inicializamos Supabase solo si hay credenciales (para evitar errores al compilar)
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