from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from api.database import supabase

MAX_PLAYERS = 8
MAX_PER_HOUSE = 2

def get_players_in_room(room_id: int) -> List[Dict[str, Any]]:
    """Obtiene la lista de jugadores de una sala."""
    if not supabase: return []
    
    players = (
        supabase.table("players")
        .select("*")
        .eq("room_id", room_id)
        .execute()
    )
    return players.data or []

def validate_player_join(room_id: int, name: str, house: str):
    """Valida si un jugador puede unirse a la sala."""
    players = get_players_in_room(room_id)
    
    # 1. Límite total
    if len(players) >= MAX_PLAYERS:
        # Verificar si es reconexión
        if not any(p["name"].lower() == name.lower() for p in players):
            raise HTTPException(status_code=403, detail="La sala está llena (máximo 8 magos)")
            
    # 2. Límite por casa
    house_count = sum(1 for p in players if p["house"] == house)
    if house_count >= MAX_PER_HOUSE:
        # Verificar si es reconexión en la misma casa
        if not any(p["name"].lower() == name.lower() and p["house"] == house for p in players):
            raise HTTPException(status_code=403, detail=f"La casa {house} ya tiene a sus 2 representantes")
            
    # 3. Nombre duplicado (si no es el mismo jugador)
    for p in players:
        if p["name"].lower() == name.lower() and p["house"] != house:
            raise HTTPException(status_code=403, detail="Ya hay un mago con ese nombre en otra casa")

def clean_player_name(name: str) -> str:
    """Valida y limpia el nombre del jugador."""
    name = str(name or "").strip()
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Nombre demasiado corto")
    if len(name) > 15:
        raise HTTPException(status_code=400, detail="Nombre demasiado largo")
    return name
