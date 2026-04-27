import random
from fastapi import APIRouter
from api.database import supabase

router = APIRouter()

TRIVIA_POOL = [
    {"q": "¿Qué hechizo se usa para desarmar al oponente?", "o": ["Expelliarmus", "Accio", "Lumos", "Protego"], "c": "Expelliarmus"},
    {"q": "¿Cómo se llama el deporte más famoso del mundo mágico?", "o": ["Quidditch", "Gobstones", "Ajedrez mágico", "Duelo de varitas"], "c": "Quidditch"},
    {"q": "¿Quién es el guardabosques de Hogwarts?", "o": ["Hagrid", "Snape", "Filch", "Lupin"], "c": "Hagrid"},
    {"q": "¿Qué objeto revela la ubicación de personas en Hogwarts?", "o": ["Mapa del Merodeador", "Pensadero", "Espejo de Oesed", "Giratiempos"], "c": "Mapa del Merodeador"},
    {"q": "¿Qué criatura puede nacer de un huevo de gallina incubado por un sapo?", "o": ["Basilisco", "Hipogrifo", "Acromántula", "Thestral"], "c": "Basilisco"},
    {"q": "¿Casa de Hermione Granger?", "o": ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"], "c": "Gryffindor"},
    {"q": "¿Qué hechizo ilumina la punta de la varita?", "o": ["Lumos", "Nox", "Incendio", "Reparo"], "c": "Lumos"},
    {"q": "¿Qué hechizo apaga la luz de la varita?", "o": ["Nox", "Lumos", "Finite", "Silencio"], "c": "Nox"},
    {"q": "¿Cómo se llama la prisión mágica?", "o": ["Azkaban", "Nurmengard", "Hogsmeade", "Gringotts"], "c": "Azkaban"},
    {"q": "¿Banco de los magos en Londres?", "o": ["Gringotts", "Flourish & Blotts", "Ollivanders", "Honeydukes"], "c": "Gringotts"},
    {"q": "¿Qué criatura guarda cámaras en Gringotts?", "o": ["Dragón", "Fénix", "Trol", "Unicornio"], "c": "Dragón"},
    {"q": "¿Qué hechizo usarías para reparar unos lentes?", "o": ["Reparo", "Episkey", "Scourgify", "Reducio"], "c": "Reparo"},
    {"q": "¿Quién enseña Pociones en los primeros años de Harry?", "o": ["Snape", "Slughorn", "Flitwick", "Sprout"], "c": "Snape"},
    {"q": "¿Cómo se llama el tren de Hogwarts?", "o": ["Hogwarts Express", "Knight Bus", "Durmstrang Rail", "Locomotora Fawkes"], "c": "Hogwarts Express"},
    {"q": "¿Desde qué andén sale el tren?", "o": ["9 3/4", "7 1/2", "10 1/4", "8 3/4"], "c": "9 3/4"},
    {"q": "¿Tienda famosa de varitas?", "o": ["Ollivanders", "Borgin & Burkes", "Madam Malkin", "Weasleys"], "c": "Ollivanders"},
    {"q": "¿Cuál es la mascota tradicional de Gryffindor?", "o": ["León", "Serpiente", "Águila", "Tejón"], "c": "León"},
    {"q": "¿Cuál es la mascota tradicional de Slytherin?", "o": ["Serpiente", "León", "Águila", "Tejón"], "c": "Serpiente"},
    {"q": "¿Cuál es la mascota tradicional de Ravenclaw?", "o": ["Águila", "Cuervo", "León", "Serpiente"], "c": "Águila"},
    {"q": "¿Cuál es la mascota tradicional de Hufflepuff?", "o": ["Tejón", "Cuervo", "Lobo", "Liebre"], "c": "Tejón"},
]


def build_trivia_state():
    pregunta = random.choice(TRIVIA_POOL)
    return {"phase": "trivia", "question": pregunta["q"], "options": pregunta["o"], "correct": pregunta["c"], "points_correct": 100, "points_wrong": 0}


@router.post("/api/host/{room_code}/start_trivia")
async def start_trivia(room_code: str):
    new_state = build_trivia_state()
    supabase.table("rooms").update({"status": "playing", "game_state": new_state}).eq("room_code", room_code.upper()).execute()
    return {"message": "Trivia iniciada"}
