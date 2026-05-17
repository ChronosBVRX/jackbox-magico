import urllib.request
import json
import os

API_KEY = "794d57f3b8e20873b6c77cf4f9e37b3dff326ebabe8db171f2daa07556881a7d"
VOICE_ID = "twq6c9tK89O36XNHCv2Q" # Sombrero Seleccionador

lines = [
    {
        "filename": "public/assets/audio/voice_lines/15_impostor_sombrero.mp3",
        "text": "El Impostor de Hogwarts. La televisión asignará un lugar secreto del castillo a todo el grupo. Todos verán el lugar en su celular... excepto uno, que recibirá el rol de Espía Mortífago y estará completamente perdido. Háganse preguntas sutiles entre ustedes para descubrir quién no sabe dónde están, pero cuidado: si son demasiado obvios, el Espía adivinará el lugar y ganará la partida."
    },
    {
        "filename": "public/assets/audio/voice_lines/impostor_voting.mp3",
        "text": "¡El tiempo se ha agotado! Es hora de señalar con la varita. Voten en sus celulares por quien crean que es el mortífago infiltrado."
    },
    {
        "filename": "public/assets/audio/voice_lines/impostor_res_loyal.mp3",
        "text": "¡Atrapado! Los magos leales han detectado al impostor con sus astutas preguntas. ¡Una victoria brillante para Hogwarts!"
    },
    {
        "filename": "public/assets/audio/voice_lines/impostor_res_spy.mp3",
        "text": "¡Engaño maestro! El Espía Mortífago logró confundir a todos y sobrevivió a la votación. El mal triunfa en las sombras."
    },
    {
        "filename": "public/assets/audio/voice_lines/impostor_res_spy_guess.mp3",
        "text": "¡Impresionante! El Espía Mortífago adivinó el lugar secreto y logró salirse con la suya. Sus descripciones fueron demasiado obvias."
    },
    {
        "filename": "public/assets/audio/voice_lines/impostor_res_spy_tie.mp3",
        "text": "¡Empate en la votación! Ante la duda y la confusión, el Espía Mortífago escapa ileso entre la niebla."
    },
    {
        "filename": "public/assets/audio/voice_lines/impostor_res_spy_survived.mp3",
        "text": "¡Engaño maestro! El Espía Mortífago logró confundir a todos e incriminó a un inocente. Pura astucia tenebrosa."
    }
]

url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
headers = {
    "xi-api-key": API_KEY,
    "Content-Type": "application/json"
}

print("Iniciando generación de voces con ElevenLabs (Voz: Sombrero Seleccionador)...")

for item in lines:
    print(f"Generando {item['filename']}...")
    data = {
        "text": item["text"],
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.8
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

print("Generación de voces completada.")
