import urllib.request
import json
import os

API_KEY = "794d57f3b8e20873b6c77cf4f9e37b3dff326ebabe8db171f2daa07556881a7d"
VOICE_ID = "I6zPaRWyhm8Ix5uLzoqH" # Dumbledore

os.makedirs("public/assets/audio/voice_lines", exist_ok=True)

lines = [
    {
        "filename": "public/assets/audio/voice_lines/leader_dumbledore_gryffindor.mp3",
        "text": "Gryffindor lidera el marcador por ahora. Pero no se confíen, en esta escuela las mesas giran más rápido que un giratiempo."
    },
    {
        "filename": "public/assets/audio/voice_lines/leader_dumbledore_slytherin.mp3",
        "text": "Slytherin va a la cabeza del marcador. Astucia pura y una ambición digna de admirar."
    },
    {
        "filename": "public/assets/audio/voice_lines/leader_dumbledore_ravenclaw.mp3",
        "text": "Ravenclaw está dominando la tabla de posiciones. La inteligencia y la precisión rinden frutos."
    },
    {
        "filename": "public/assets/audio/voice_lines/leader_dumbledore_hufflepuff.mp3",
        "text": "Hufflepuff lidera la competencia. La perseverancia, el trabajo en equipo y la paciencia marcan el paso."
    },
    {
        "filename": "public/assets/audio/voice_lines/leader_dumbledore_empate.mp3",
        "text": "Tenemos un empate en la cima del marcador. La tensión es palpable en el Gran Comedor."
    }
]

url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
headers = {
    "xi-api-key": API_KEY,
    "Content-Type": "application/json"
}

print("Iniciando generación de voces de líderes con ElevenLabs (Voz: Dumbledore)...")

for item in lines:
    print(f"Generando {item['filename']} con voz de Dumbledore...")
    data = {
        "text": item["text"],
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.45,
            "similarity_boost": 0.80
        }
    }
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as response:
            with open(item["filename"], "wb") as f:
                f.write(response.read())
        print(f"  -> Guardado exitosamente en {item['filename']}")
    except Exception as e:
        print(f"  -> Error al generar {item['filename']}: {e}")

print("Generación de voces de líderes con Dumbledore completada.")
