import urllib.request
import json
import os

API_KEY = "794d57f3b8e20873b6c77cf4f9e37b3dff326ebabe8db171f2daa07556881a7d"
VOICE_ID = "I6zPaRWyhm8Ix5uLzoqH" # Dumbledore

os.makedirs("public/assets/audio/ui", exist_ok=True)

lines = [
    {
        "filename": "public/assets/audio/ui/ui_hover_1.mp3",
        "text": "Mmm... interesante."
    },
    {
        "filename": "public/assets/audio/ui/ui_hover_2.mp3",
        "text": "Veamos qué tenemos aquí."
    },
    {
        "filename": "public/assets/audio/ui/ui_hover_3.mp3",
        "text": "Curiosa elección."
    },
    {
        "filename": "public/assets/audio/ui/ui_hover_4.mp3",
        "text": "Una decisión peculiar."
    },
    {
        "filename": "public/assets/audio/ui/ui_select.mp3",
        "text": "¡Excelente decisión! Las reglas del torneo han sido escritas."
    },
    {
        "filename": "public/assets/audio/ui/ui_transition.mp3",
        "text": "¡Que comience el Torneo Mágico Rotativo!"
    },
    {
        "filename": "public/assets/audio/ui/ui_back.mp3",
        "text": "Volvamos atrás, entonces."
    },
    {
        "filename": "public/assets/audio/ui/ui_confirm.mp3",
        "text": "Todo está listo. Preparen sus varitas."
    }
]

url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
headers = {
    "xi-api-key": API_KEY,
    "Content-Type": "application/json"
}

print("Iniciando generación de sonidos de interfaz (UI) con ElevenLabs (Voz: Dumbledore)...")

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

print("Generación de sonidos de interfaz completada.")
