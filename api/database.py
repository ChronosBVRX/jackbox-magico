import os
from pydantic import BaseModel
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Aquí guardamos la estructura de los datos que nos envía el celular
class PlayerJoinInfo(BaseModel):
    room_code: str
    player_name: str
    house: str

class AnswerInfo(BaseModel):
    room_code: str
    player_name: str
    answer: str