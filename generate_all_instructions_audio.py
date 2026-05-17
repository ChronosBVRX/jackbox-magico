import urllib.request
import json
import os

API_KEY = "794d57f3b8e20873b6c77cf4f9e37b3dff326ebabe8db171f2daa07556881a7d"

VOICES = {
    "hermione": "GQNy96khQRJ4O3A6XG6n",
    "ron": "cwxZy0z8ps5vaLwBNTQb",
    "harry": "race19ljmfSkreQGGOQj",
    "snape": "PZwYzXK45TUNWPGmFt8r",
    "sombrero": "twq6c9tK89O36XNHCv2Q",
    "luna": "uwEe934y6ErFEYryj6C4",
    "dobby": "IZvhakWjeBCpk8Bw65zg",
    "hagrid": "nonrBbEeFOSLjZVqWLOZ",
    "mcgonagall": "jJIAFhrl2K15gywskit9",
    "dumbledore": "I6zPaRWyhm8Ix5uLzoqH"
}

os.makedirs("public/assets/audio/voice_lines", exist_ok=True)

instructions = [
    {
        "filename": "public/assets/audio/voice_lines/01_trivia_magica_hermione.mp3",
        "voice": "hermione",
        "text": "Trivia del Mundo Mágico. Demuestra quién realmente puso atención en clase y quién solo vino por la cerveza de mantequilla. En la pantalla de la televisión aparecerá una pregunta con cuatro opciones. Cada mago deberá responder rápidamente desde su celular. Recuerden que responder correctamente suma puntos, pero hacerlo con rapidez les otorgará un bono especial. ¡Prepárense!"
    },
    {
        "filename": "public/assets/audio/voice_lines/06_artes_ridiculas_ron.mp3",
        "voice": "ron",
        "text": "Defensa Contra las Artes Ridículas. Porque no todos los peligros oscuros vienen con capa; algunos vienen con recibos y mensajes sin contestar. En la televisión aparecerá una amenaza absurda y en sus celulares deberán elegir la mejor defensa. Hay una respuesta correcta, pero si no la saben, elijan la opción más graciosa, ¡el humor también se premia en este castillo!"
    },
    {
        "filename": "public/assets/audio/voice_lines/02_atrapa_snitch_harry.mp3",
        "voice": "harry",
        "text": "Atrapa la Snitch. Pongan a prueba sus reflejos y la velocidad de sus dedos. En la televisión verán una Snitch Dorada volando a toda velocidad. En sus celulares tendrán un botón de captura. Presiónenlo justo en el instante en que la Snitch pase por el centro del aro. Tienen intentos limitados, así que calculen el momento perfecto para conseguir el puntaje legendario."
    },
    {
        "filename": "public/assets/audio/voice_lines/03_duelo_hechizos_snape.mp3",
        "voice": "snape",
        "text": "Duelo de Hechizos. Dos varitas, una arena y cero garantías de dignidad. La televisión seleccionará a dos duelistas, quienes deberán elegir su hechizo desde el celular. Recuerden que ciertos hechizos vencen a otros según las artes oscuras. Si ambos eligen el mismo encantamiento, habrá un choque de varitas y ganará quien presione su pantalla más rápido. ¡En guardia!"
    },
    {
        "filename": "public/assets/audio/voice_lines/04_sombrero_burlon_sombrero.mp3",
        "voice": "sombrero",
        "text": "El Sombrero Burlón. No solo selecciono casas, también juzgo personalidades con una precisión incómoda. En la televisión mostraré una descripción peculiar y en sus celulares deberán votar por el mago de la sala que mejor encaje con ella. No pueden votarse a sí mismos. Quien reciba más votos se llevará la gloria de la ronda."
    },
    {
        "filename": "public/assets/audio/voice_lines/05_clase_pociones_snape.mp3",
        "voice": "snape",
        "text": "Clase de Pociones. Memoriza, mezcla y ruega que tu caldero no explote en pedazos. La televisión mostrará una secuencia exacta de ingredientes. Mírenla con mucha atención porque desaparecerá. Luego, en sus celulares, deberán tocar los ingredientes exactamente en el mismo orden. Un solo error arruinará la mezcla, así que concéntrense."
    },
    {
        "filename": "public/assets/audio/voice_lines/07_mapa_travieso_luna.mp3",
        "voice": "luna",
        "text": "El Mapa Travieso. El mapa revela todo, excepto tu capacidad para recordar dónde viste las cosas. En la televisión aparecerá un pergamino mágico lleno de personajes y objetos. Mírenlo bien antes de que se oculte. Luego, en sus celulares, respondan rápidamente en qué lugar exacto se encontraba el objetivo. Los nargles no les ayudarán esta vez."
    },
    {
        "filename": "public/assets/audio/voice_lines/10_caldero_mentiroso_dobby.mp3",
        "voice": "dobby",
        "text": "El Caldero Mentiroso. La confianza es un lujo que aquí no tenemos. Cada jugador recibirá un ingrediente secreto en su celular. Podrán meterlo al caldero, descartarlo o acusar a otro mago de sabotaje. La televisión revelará al final si la poción sobrevive o explota. ¡Dobby advierte que hay mortífagos infiltrados mintiendo en la mesa!"
    },
    {
        "filename": "public/assets/audio/voice_lines/08_retratos_chismosos_hagrid.mp3",
        "voice": "hagrid",
        "text": "Retratos Chismosos. Las paredes oyen y los cuadros exageran. En la televisión aparecerá un retrato mágico narrando un chisme o una pista muy jugosa. En sus celulares deberán adivinar de qué personaje del mundo mágico está hablando. Respondan lo antes posible para llevarse los puntos extra de rapidez. ¡No se queden callados!"
    },
    {
        "filename": "public/assets/audio/voice_lines/09_hechizo_incompleto_mcgonagall.mp3",
        "voice": "mcgonagall",
        "text": "Hechizo Incompleto. Una palabra equivocada y podrían convertir una lámpara en una tragedia. En la televisión verán un encantamiento o frase mágica a la que le falta la parte final. En sus celulares, elijan rápidamente la opción que completa correctamente el texto. La precisión y la velocidad serán generosamente recompensadas en mi clase."
    },
    {
        "filename": "public/assets/audio/voice_lines/11_patronus_personalizado_luna.mp3",
        "voice": "luna",
        "text": "Patronus Personalizado. El hechizo más poderoso contra la oscuridad y la falta de creatividad. La televisión mostrará un tema o dilema curioso. En sus celulares, escriban una propuesta breve y divertida. Después, todos votarán por la idea más original. No pueden votar por su propia creación. ¡Dejen que su magia interior brille!"
    },
    {
        "filename": "public/assets/audio/voice_lines/12_copa_final_dumbledore.mp3",
        "voice": "dumbledore",
        "text": "La Copa Final. La última pregunta, la gran apuesta y la oportunidad definitiva para alcanzar la gloria. En sus celulares deberán apostar una parte de los puntos que han acumulado. Luego, respondan la pregunta decisiva en la televisión. Si aciertan, sumarán su apuesta; si fallan, la perderán para siempre. ¡Que gane la mejor casa!"
    },
    {
        "filename": "public/assets/audio/voice_lines/14_beso_boda_muerte_luna.mp3",
        "voice": "luna",
        "text": "Beso, Boda, Muerte. El juego donde descubrimos los secretos más oscuros del protagonista. La televisión elegirá a un jugador, quien asignará en su celular un Beso, una Boda o un Avada Kedavra a tres personajes famosos. Los demás magos deberán predecir exactamente qué decidió el protagonista. ¡Adivinar el combo perfecto les dará una victoria espectacular!"
    },
    {
        "filename": "public/assets/audio/voice_lines/15_impostor_sombrero.mp3",
        "voice": "sombrero",
        "text": "El Impostor de Hogwarts. Deducción, engaño y paranoia pura. La televisión asignará un lugar secreto del castillo. Todos verán el lugar en su celular, excepto el Espía Mortífago, que estará completamente perdido. Háganse preguntas sutiles para descubrir quién no sabe dónde están. Pero cuidado: si son demasiado obvios, el espía adivinará el lugar y ganará la partida."
    },
    {
        "filename": "public/assets/audio/voice_lines/tiburon_intro.mp3",
        "voice": "hagrid",
        "text": "El Tiburón de los Negocios Mágicos. Porque el mundo mágico necesita nuevos inventos absurdos. En sus celulares, el primer jugador dibujará la parte superior de un concepto extraño. Luego el lienzo pasará a otro mago que solo verá el corte final y completará la parte inferior. Al final, presentaremos las creaciones en la televisión y votaremos invirtiendo nuestros Galeones."
    },
    {
        "filename": "public/assets/audio/voice_lines/dictado_intro.mp3",
        "voice": "hermione",
        "text": "Dictado Mágico. Un desafío contrarreloj para sus oídos y pulgares. Escuchen con mucha atención la anécdota clasificada que sonará en la televisión. Transcriban exactamente lo que escuchen en su celular antes de que se agote el tiempo. El Ministerio evaluará su precisión matemática, pero el Host podrá otorgar un bono gigante a las respuestas más divertidas."
    }
]

print("Iniciando generación/verificación de audios de instrucciones para los 16 minijuegos...")

for item in instructions:
    voice_id = VOICES.get(item["voice"])
    filename = item["filename"]
    print(f"\nProcesando {filename} (Voz: {item['voice']})...")
    
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json"
    }
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
            with open(filename, "wb") as f:
                f.write(response.read())
        print(f" -> [ÉXITO] Audio generado y guardado en {filename}")
    except Exception as e:
        print(f" -> [ERROR] Fallo al generar {filename}: {e}")

print("\nProceso de generación de audios de instrucciones completado.")
