import random
import string
import uuid
from typing import Optional, Dict, Any
from fastapi import HTTPException
from api.database import supabase

TV_HOST_NAME = "TV"

def generate_room_code() -> str:
    """Genera un código de sala de 4 letras mayúsculas."""
    return "".join(random.choices(string.ascii_uppercase, k=4))

def generate_unique_room_code() -> str:
    """Genera un código de sala único verificando contra la base de datos."""
    if not supabase:
        # Fallback si no hay DB (local dev)
        return generate_room_code()
        
    for _ in range(15):
        code = generate_room_code()
        existing = (
            supabase.table("rooms")
            .select("id")
            .eq("room_code", code)
            .execute()
        )
        if not existing.data:
            return code
            
    raise HTTPException(status_code=500, detail="No se pudo generar un código de sala único tras múltiples intentos.")

def get_room_by_code(room_code: str):
    """Obtiene una sala por su código."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Base de datos no configurada")
        
    code = str(room_code or "").upper().strip()
    if not code:
        raise HTTPException(status_code=400, detail="Código de sala inválido")
        
    room = (
        supabase.table("rooms")
        .select("id, room_code, status, game_state, state_version")
        .eq("room_code", code)
        .execute()
    )
    
    if not room.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
        
    return room.data[0]

def update_room_with_version(room_code: str, new_state: dict, current_version: int):
    """
    Actualiza el estado de la sala de forma segura usando Optimistic Locking.
    Requiere que la tabla 'rooms' tenga una columna 'state_version'.
    """
    if not supabase: return
    
    code = str(room_code or "").upper().strip()
    
    # Intentar actualizar solo si la versión coincide
    result = (
        supabase.table("rooms")
        .update({
            "game_state": new_state,
            "state_version": current_version + 1
        })
        .eq("room_code", code)
        .eq("state_version", current_version)
        .execute()
    )
    
    if not result.data:
        # Si no se actualizó nada, hubo un conflicto de concurrencia
        raise HTTPException(
            status_code=409, 
            detail="Conflicto de estado. Alguien más actualizó la sala. Intenta de nuevo."
        )
    return result.data[0]

def make_tv_host(tv_token: Optional[str] = None) -> dict:
    """Crea el objeto host para la TV."""
    host = {
        "name": TV_HOST_NAME,
        "managed_by": "tv",
        "authority": "tv_screen",
    }
    if tv_token:
        host["token"] = str(tv_token)
    return host

def state_has_tv_authority(state: dict) -> bool:
    """Verifica si el estado actual está bajo la autoridad de la TV."""
    state = state or {}
    host = state.get("host")
    return (
        isinstance(host, dict)
        and host.get("name") == TV_HOST_NAME
        and host.get("managed_by") == "tv"
        and state.get("host_authority") == "tv"
    )

def get_host_from_state(state: dict) -> Optional[dict]:
    """Obtiene el objeto host del estado actual."""
    host = (state or {}).get("host")
    return host if isinstance(host, dict) else None

def validate_host(state: dict, player_name: str, host_token: str):
    """Valida que el jugador y el token coincidan con el host de la sala."""
    host = get_host_from_state(state)

    if not host:
        raise HTTPException(status_code=403, detail="Esta sala todavía no tiene host")

    if host.get("name") != player_name:
        raise HTTPException(status_code=403, detail="No eres el host de esta sala")

    if host.get("token") != host_token:
        raise HTTPException(status_code=403, detail="Token de host inválido")

    return host
