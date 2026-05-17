import urllib.request
import json
import os

API_KEY = "794d57f3b8e20873b6c77cf4f9e37b3dff326ebabe8db171f2daa07556881a7d"
VOICE_ID = "GQNy96khQRJ4O3A6XG6n" # Hermione Granger

os.makedirs("public/assets/audio/voice_lines", exist_ok=True)

lines = [
    {
        "filename": "public/assets/audio/voice_lines/dictado_intro.mp3",
        "text": "Dictado Mágico. Escuchen con atención el siguiente fragmento de audio clasificado del mundo mágico y transcríbanlo exactamente en sus celulares antes de que se agote el tiempo. La precisión y la rapidez les otorgarán la victoria, pero el Host tendrá el poder de premiar las respuestas más graciosas."
    },
    {
        "filename": "public/assets/audio/voice_lines/dictado_voting.mp3",
        "text": "¡El tiempo de dictado ha terminado! Host, revisa las transcripciones en tu celular y premia con Galeones extra a aquellos magos cuyas respuestas hayan sido absolutamente hilarantes."
    },
    {
        "filename": "public/assets/audio/voice_lines/dictado_results.mp3",
        "text": "¡Aquí están los resultados del Dictado Mágico! Veamos quién tiene el oído más agudo de todo Hogwarts."
    },
    # 10 Historias Clave
    {
        "filename": "public/assets/audio/voice_lines/dictado_historia_1.mp3",
        "text": "Un documento clasificado del Ministerio revela que la cicatriz de Harry Potter no tiene forma de rayo por la maldición de Voldemort. En realidad, se cayó de frente contra una waflera eléctrica en la cocina de los Dursley mientras intentaba robarse un nugget de pollo los domingos."
    },
    {
        "filename": "public/assets/audio/voice_lines/dictado_historia_2.mp3",
        "text": "Fred y George fueron vetados de por vida de Gringotts tras intentar cambiar tres mil pesos en monedas de chocolate por galeones de oro reales. El duende principal declaró que el truco casi funciona, de no ser porque el chocolate se derritió en la bóveda de Bellatrix Lestrange."
    },
    {
        "filename": "public/assets/audio/voice_lines/dictado_historia_3.mp3",
        "text": "Caos en la prisión de Azkaban. Tres dementores renunciaron tras quejarse de que absorber la felicidad de los prisioneros ya no es lo mismo desde que metieron a un mago influencer que solo piensa en su número de seguidores y en hacer bailes de TikTok en su celda."
    },
    {
        "filename": "public/assets/audio/voice_lines/dictado_historia_4.mp3",
        "text": "Hagrid desató el pánico en el Gran Comedor al confundir un lote de poción multijugos con su tarro de pulque curado de avena. El guardabosques pasó tres días transformado en un tlacuache gigante con botas que intentaba morderle los talones a la profesora McGonagall."
    },
    {
        "filename": "public/assets/audio/voice_lines/dictado_historia_5.mp3",
        "text": "Severus Snape suspendió la clase de Pociones porque alguien le cambió el ingrediente secreto por veneno de escorpión pirata y champú anticaspa. Albus Dumbledore testificó que, por primera vez en cuarenta años, el cabello de Snape tenía un delicioso aroma a manzana verde."
    },
    {
        "filename": "public/assets/audio/voice_lines/dictado_historia_6.mp3",
        "text": "Un reporte del Profeta expuso un torneo ilegal de Quidditch en reversa. Los jugadores debían volar de cabeza atados a una Nimbus mil doscientos mientras cargaban un garrafón de agua purificada. El buscador de Slytherin terminó incrustado en el trasero del tonto de Neville Longbottom."
    },
    {
        "filename": "public/assets/audio/voice_lines/dictado_historia_7.mp3",
        "text": "Dobby causó revuelo en el Callejón Diagon tras gastarse todo el oro de su libertad en unos tenis de diseñador con luces LED y una chamarra antibalas fosforescente. El elfo libre fue visto presumiening su outfit aesthetic frente a los mortífagos del bar."
    },
    {
        "filename": "public/assets/audio/voice_lines/dictado_historia_8.mp3",
        "text": "Ron Weasley reprobó su examen de Transformaciones de forma catastrófica. Intentó convertir una rata vieja en una copa de plata, pero el hechizo falló y creó un híbrido mutante: un termo de café con bigotes que muerde a cualquiera que intente tomar un trago."
    },
    {
        "filename": "public/assets/audio/voice_lines/dictado_historia_9.mp3",
        "text": "El Sombrero Seleccionador se declaró en huelga de hambre tras lavarse por error con los calcetines sucios de Ron. El artefacto mágico ahora solo grita groserías en francés y manda a todos los estudiantes de primer ingreso directo a la cocina a lavar los platos."
    },
    {
        "filename": "public/assets/audio/voice_lines/dictado_historia_10.mp3",
        "text": "Se filtra que el verdadero motivo por el cual el Señor Tenebroso odia la Navidad es porque su tía abuela de Ecatepec siempre le regalaba un suéter tejido tres tallas más grande y una loción barata que le irritaba la piel donde se supone que va la nariz."
    }
]

url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
headers = {
    "xi-api-key": API_KEY,
    "Content-Type": "application/json"
}

print("Iniciando generación de voces para Dictado Mágico con ElevenLabs (Voz: Hermione)...")

for item in lines:
    print(f"Generando {item['filename']} con voz de Hermione...")
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

print("Generación de voces de Dictado Mágico con Hermione completada.")
