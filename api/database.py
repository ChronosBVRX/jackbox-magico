import os
from typing import Optional

from pydantic import BaseModel
from supabase import create_client, Client


SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = None

if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


class PlayerJoinInfo(BaseModel):
    room_code: str
    player_name: str
    house: str
    host_token: Optional[str] = None


class AnswerInfo(BaseModel):
    room_code: str
    player_name: str
    answer: str
    client_elapsed_ms: Optional[int] = None


class HostControlInfo(BaseModel):
    player_name: str
    host_token: str


class DuelClashTapInfo(BaseModel):
    room_code: str
    player_name: str
