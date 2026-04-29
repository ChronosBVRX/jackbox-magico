"""Ciclo de vida de salas: heartbeat, cierre limpio y expiración.

Vercel no ofrece un worker persistente para cerrar salas en segundo plano. Por eso
este módulo usa una estrategia segura para entorno serverless:

1. La TV manda heartbeat mientras la sala está abierta.
2. Si el heartbeat deja de llegar, el endpoint de estado reporta la sala como expirada.
3. Los móviles limpian localStorage cuando detectan `closed` o `expired`.
4. El host puede cerrar manualmente la sala con su host_token.
5. La TV puede cerrar manualmente usando un tv_token que reclama con el primer heartbeat.
"""

from __future__ import annotations

import time
from copy import deepcopy
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.database import HostControlInfo, supabase


app = FastAPI(title="Jackbox Mágico Room Lifecycle API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


HEARTBEAT_EXPIRES_AFTER_SECONDS = 75


class TvHeartbeatInfo(BaseModel):
    tv_token: str


class TvCloseInfo(BaseModel):
    tv_token: str
    reason: Optional[str] = "tv_closed"


class HostCloseInfo(HostControlInfo):
    reason: Optional[str] = "host_closed"


def now_ts() -> int:
    return int(time.time())


def clean_room_code(room_code: str) -> str:
    code = str(room_code or "").upper().strip()
    if not code:
        raise HTTPException(status_code=400, detail="Código de sala vacío")
    return code


def require_supabase():
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales de Supabase")


def get_room(room_code: str):
    require_supabase()
    code = clean_room_code(room_code)

    room = (
        supabase.table("rooms")
        .select("id, room_code, status, game_state")
        .eq("room_code", code)
        .execute()
    )

    if not room.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    return room.data[0]


def update_room(room_code: str, status: Optional[str] = None, state: Optional[dict] = None):
    require_supabase()
    payload = {}

    if status is not None:
        payload["status"] = status

    if state is not None:
        payload["game_state"] = state

    if payload:
        supabase.table("rooms").update(payload).eq("room_code", clean_room_code(room_code)).execute()


def get_host_from_state(state: dict):
    host = (state or {}).get("host")
    return host if isinstance(host, dict) else None


def validate_host(state: dict, info: HostControlInfo):
    host = get_host_from_state(state)

    if not host:
        raise HTTPException(status_code=403, detail="Esta sala todavía no tiene host")

    if host.get("name") != info.player_name:
        raise HTTPException(status_code=403, detail="No eres el host de esta sala")

    if host.get("token") != info.host_token:
        raise HTTPException(status_code=403, detail="Token de host inválido")

    return host


def get_lifecycle(state: dict) -> dict:
    lifecycle = (state or {}).get("lifecycle")
    return lifecycle if isinstance(lifecycle, dict) else {}


def is_closed_status(status: str) -> bool:
    return status in {"closed", "expired"}


def is_expired_by_heartbeat(status: str, state: dict) -> bool:
    if is_closed_status(status):
        return True

    lifecycle = get_lifecycle(state)
    heartbeat = lifecycle.get("tv_heartbeat_at")

    # Si nunca hubo heartbeat de TV, no expiramos automáticamente para no cerrar
    # salas antiguas o pruebas manuales sin el nuevo script.
    if not heartbeat:
        return False

    try:
        heartbeat = int(heartbeat)
    except Exception:
        return False

    return now_ts() - heartbeat > HEARTBEAT_EXPIRES_AFTER_SECONDS


def mark_closed_state(state: dict, reason: str, status: str = "closed") -> dict:
    new_state = deepcopy(state or {})
    lifecycle = get_lifecycle(new_state)

    lifecycle.update({
        "closed": True,
        "closed_at": now_ts(),
        "closed_reason": reason,
        "status": status,
    })

    new_state["phase"] = status
    new_state["lifecycle"] = lifecycle
    new_state["closed_reason"] = reason

    return new_state


@app.get("/api/room-lifecycle/health")
async def health():
    return {
        "status": "ok",
        "message": "Room lifecycle listo.",
    }


@app.post("/api/room-lifecycle/tv/{room_code}/heartbeat")
async def tv_heartbeat(room_code: str, info: TvHeartbeatInfo):
    room = get_room(room_code)
    status = room.get("status") or "lobby"
    state = deepcopy(room.get("game_state") or {})

    if is_closed_status(status):
        return {
            "status": status,
            "closed": True,
            "expired": status == "expired",
            "message": "La sala ya está cerrada.",
        }

    tv_token = str(info.tv_token or "").strip()
    if not tv_token:
        raise HTTPException(status_code=400, detail="Falta tv_token")

    lifecycle = get_lifecycle(state)
    saved_token = lifecycle.get("tv_token")

    if saved_token and saved_token != tv_token:
        raise HTTPException(status_code=403, detail="Token de TV inválido")

    lifecycle.update({
        "tv_token": tv_token,
        "tv_heartbeat_at": now_ts(),
        "tv_connected": True,
        "closed": False,
        "status": status,
    })

    state["lifecycle"] = lifecycle
    update_room(room_code, state=state)

    return {
        "status": status,
        "closed": False,
        "expired": False,
        "heartbeat_at": lifecycle["tv_heartbeat_at"],
        "expires_after_seconds": HEARTBEAT_EXPIRES_AFTER_SECONDS,
    }


@app.get("/api/room-lifecycle/status/{room_code}")
async def lifecycle_status(room_code: str):
    room = get_room(room_code)
    status = room.get("status") or "lobby"
    state = deepcopy(room.get("game_state") or {})
    lifecycle = get_lifecycle(state)

    expired = is_expired_by_heartbeat(status, state) and status not in {"closed", "expired"}

    if expired:
        state = mark_closed_state(state, reason="tv_heartbeat_expired", status="expired")
        update_room(room_code, status="expired", state=state)
        status = "expired"
        lifecycle = get_lifecycle(state)

    return {
        "room_code": clean_room_code(room_code),
        "status": status,
        "phase": state.get("phase"),
        "closed": status in {"closed", "expired"} or bool(lifecycle.get("closed")),
        "expired": status == "expired",
        "closed_reason": lifecycle.get("closed_reason") or state.get("closed_reason"),
        "tv_heartbeat_at": lifecycle.get("tv_heartbeat_at"),
        "now": now_ts(),
        "expires_after_seconds": HEARTBEAT_EXPIRES_AFTER_SECONDS,
    }


@app.post("/api/room-lifecycle/host/{room_code}/close")
async def close_room_by_host(room_code: str, info: HostCloseInfo):
    room = get_room(room_code)
    state = deepcopy(room.get("game_state") or {})

    validate_host(state, info)

    reason = info.reason or "host_closed"
    new_state = mark_closed_state(state, reason=reason, status="closed")
    update_room(room_code, status="closed", state=new_state)

    return {
        "message": "Sala cerrada correctamente",
        "room_code": clean_room_code(room_code),
        "status": "closed",
        "reason": reason,
    }


@app.post("/api/room-lifecycle/tv/{room_code}/close")
async def close_room_by_tv(room_code: str, info: TvCloseInfo):
    room = get_room(room_code)
    state = deepcopy(room.get("game_state") or {})
    lifecycle = get_lifecycle(state)

    tv_token = str(info.tv_token or "").strip()
    saved_token = lifecycle.get("tv_token")

    if not tv_token:
        raise HTTPException(status_code=400, detail="Falta tv_token")

    if saved_token and saved_token != tv_token:
        raise HTTPException(status_code=403, detail="Token de TV inválido")

    # Si aún no había token guardado, la TV actual lo reclama antes de cerrar.
    lifecycle["tv_token"] = tv_token
    state["lifecycle"] = lifecycle

    reason = info.reason or "tv_closed"
    new_state = mark_closed_state(state, reason=reason, status="closed")
    update_room(room_code, status="closed", state=new_state)

    return {
        "message": "Sala cerrada desde TV",
        "room_code": clean_room_code(room_code),
        "status": "closed",
        "reason": reason,
    }
