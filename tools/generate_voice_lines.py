from __future__ import annotations

import json
from pathlib import Path

CHARACTERS = {
    "dumbledore": ["Dumbledore", "anciano sabio, cálido, juguetón, solemne pero pícaro"],
    "sombrero": ["Sombrero Seleccionador", "narrador teatral, burlón, misterioso, con humor seco"],
    "harry": ["Harry Potter", "joven héroe, cercano, valiente, ligeramente confundido por el caos"],
    "luna": ["Luna Lovegood", "soñadora, rara, tranquila, tierna y accidentalmente graciosa"],
    "mcgonagall": ["Profesora McGonagall", "profesora estricta, elegante, seca, sarcástica y disciplinada"],
}

RAW_LINES = [
    ("boot","dumbledore","bienvenida","Bienvenidos a la Copa de las Casas. Esta noche no gana el más sabio: gana quien conteste rápido y no haga el ridículo en público.","Al iniciar la app"),
    ("boot","mcgonagall","orden","Varitas abajo, celulares arriba. Y por favor, que nadie intente copiarse con un encantamiento barato.","Al iniciar la sala"),
    ("boot","sombrero","casas","Veamos qué casa tiene más valor, más astucia, más inteligencia… o al menos mejor señal de Wi-Fi.","Pantalla con QR"),
    ("lobby","harry","codigo","Escanea el código, entra a la sala y elige tu casa. Tranquilo, es menos peligroso que seguir arañas en el bosque.","Lobby con QR"),
    ("lobby","luna","paciencia","Si el juego tarda un poquito, tal vez los nargles están mordiendo el router. Respiremos y esperemos.","Esperando jugadores"),
    ("lobby","sombrero","jugadores","Ya casi estamos. Solo falta que los últimos magos dejen de pelear con el navegador del celular.","Faltan jugadores"),
    ("lobby","mcgonagall","listos","Cuando todos estén dentro, comenzaremos. Y no, cambiarse de casa a mitad del juego no es una estrategia válida.","Antes de iniciar"),
    ("lobby","dumbledore","comenzar","Que comience la noche. Recuerden: las respuestas correctas dan puntos; las respuestas dramáticas dan anécdotas.","Botón iniciar"),
    ("rules","mcgonagall","basicas","Reglas básicas: aparece una amenaza ridícula, tienes seis segundos para elegir la mejor defensa. Dudar demasiado también es una decisión… mala.","Reglas"),
    ("rules","dumbledore","puntos","Respuesta correcta: cien puntos. Respuesta rápida: treinta extra. Racha de tres: ochenta. Error: menos veinte y una lección de humildad.","Puntos"),
    ("rules","sombrero","humor","Si el modo humor está activo, la respuesta falsa más graciosa puede ganar veinte puntos. Porque en esta escuela hasta el caos tiene reglamento.","Modo humor"),
    ("rules","harry","celular","Tu celular es tu varita. No lo prestes, no lo tires y no lo uses para pedir comida durante la pregunta.","Controles"),
    ("rules","luna","consejo","A veces la respuesta más rara parece correcta. Pero a veces solo es rara. Esa es la magia de la confusión.","Consejo"),
    ("round_start","mcgonagall","ronda_01","Primera ronda. Respiren profundo. Nadie quiere perder contra una amenaza con menos dignidad que un boggart en chanclas.","Inicio de ronda"),
    ("round_start","dumbledore","ronda_02","Siguiente ronda. Las artes ridículas no descansan, como los tíos que mandan cadenas por WhatsApp.","Inicio de ronda"),
    ("round_start","sombrero","ronda_03","Nueva amenaza en camino. Si sobreviven a esto, tal vez sobrevivan a una junta que pudo ser correo.","Inicio de ronda"),
    ("round_start","harry","ronda_04","Atención, casas. Viene otra prueba. Y esta vez la vergüenza sí cuenta como daño mágico.","Inicio de ronda"),
    ("round_start","luna","ronda_05","Últimas rondas. Aquí se separan los magos valientes de los que solo venían por las papas.","Inicio de ronda"),
    ("threat","mcgonagall","dementor_quincena","Un dementor se acerca, pero no viene por tu alma: viene por tu quincena. Elige tu defensa.","Amenaza"),
    ("threat","harry","ex_giratiempo","Tu ex aparece con un giratiempo para reclamar cosas del pasado. Rápido, elige una salida digna.","Amenaza"),
    ("threat","dumbledore","patronus_deuda","Una deuda toma forma corpórea y exige que le invoques un patronus financiero. ¿Qué haces?","Amenaza"),
    ("threat","luna","nargle_router","Los nargles mordieron el router y ahora todos culpan al más inocente. Decide antes de que caiga la señal.","Amenaza"),
    ("threat","sombrero","sapo_chismoso","Un sapo chismoso amenaza con revelar todos tus mensajes de madrugada. Escoge la defensa.","Amenaza"),
    ("threat","mcgonagall","suegra_azkaban","Tu suegra llega con energía de Azkaban y una lista de preguntas incómodas. Tienes seis segundos.","Amenaza"),
    ("threat","harry","aranas_facturas","Una colonia de arañas gigantes trae facturas vencidas. No es el bosque prohibido: es fin de mes.","Amenaza"),
    ("threat","dumbledore","duelo_sin_saldo","Te retan a un duelo mágico, pero tu celular tiene dos por ciento y cero datos. Elige sabiamente.","Amenaza"),
    ("threat","luna","calcetin_poseido","Un calcetín poseído exige independencia laboral y prestaciones. La amenaza es real y huele raro.","Amenaza"),
    ("threat","sombrero","sorting_drama","El Sombrero detecta drama innecesario en la mesa. Hay que neutralizarlo antes de que se vuelva canon.","Amenaza"),
    ("threat","mcgonagall","profecia_cringe","Una profecía anuncia que alguien dirá algo cringe frente a todos. Eviten la tragedia.","Amenaza"),
    ("threat","harry","voldemort_cuenta","El que no debe ser nombrado aparece… y quiere dividir la cuenta exacta hasta los centavos.","Amenaza"),
    ("threat","dumbledore","boggart_nomina","Un boggart se convierte en tu recibo de nómina después de los descuentos. Defiéndete.","Amenaza"),
    ("threat","luna","fantasma_seen","Un fantasma te dejó en visto desde 1893 y ahora exige explicaciones. Extraño, pero urgente.","Amenaza"),
    ("threat","sombrero","muggle_celular","Un muggle confundido está grabando todo en vertical y con flash. Protejan la dignidad del grupo.","Amenaza"),
    ("correct","mcgonagall","excelente","Correcto. Una respuesta limpia, rápida y sorprendentemente civilizada.","Respuesta correcta"),
    ("correct","dumbledore","sabiduria","Muy bien. La sabiduría también consiste en no presionar cualquier botón como duende desesperado.","Respuesta correcta"),
    ("correct","harry","sobreviviste","Correcto. Sobreviviste, que en mi experiencia ya cuenta como plan de vida.","Respuesta correcta"),
    ("correct","luna","curioso","Correcto. Fue raro, pero funcionó. Como la mayoría de las cosas interesantes.","Respuesta correcta"),
    ("correct","sombrero","casa_orgullo","¡Correcto! Tu casa puede presumir esto durante aproximadamente ocho segundos.","Respuesta correcta"),
    ("wrong","mcgonagall","decepcion","Incorrecto. Cinco puntos menos para la autoestima y veinte menos en el marcador.","Error"),
    ("wrong","dumbledore","aprendizaje","No era esa. Pero todo error es una lección… excepto cuando todos lo vieron en pantalla grande.","Error"),
    ("wrong","harry","ouch","Incorrecto. Dolió menos que un Expelliarmus, pero más que quedar mal frente a tu mesa.","Error"),
    ("wrong","luna","nargles","No funcionó. Probablemente los nargles confundieron tu dedo.","Error"),
    ("wrong","sombrero","drama","Respuesta equivocada. El Sombrero detecta pánico, orgullo herido y una ligera necesidad de revancha.","Error"),
    ("timeout","mcgonagall","tarde","Se acabó el tiempo. En mi clase, seis segundos son seis segundos, no una sugerencia emocional.","Tiempo agotado"),
    ("timeout","dumbledore","silencio","El silencio también comunica… en este caso comunica que perdiste puntos.","Tiempo agotado"),
    ("timeout","harry","congelado","Te quedaste congelado. Y ni siquiera había dementores cerca.","Tiempo agotado"),
    ("timeout","luna","pensamiento","Pensaste demasiado. A veces las respuestas se van flotando, como zapatos en el techo.","Tiempo agotado"),
    ("timeout","sombrero","duda","La duda ganó esta ronda. Lamentablemente, la duda no está inscrita en ninguna casa.","Tiempo agotado"),
    ("fast_bonus","harry","reflejos","Bonus de rapidez. Esos reflejos sirven para duelos o para agarrar la última papa.","Bonus rápido"),
    ("fast_bonus","mcgonagall","preciso","Respuesta rápida. Precisión admirable, casi sospechosa.","Bonus rápido"),
    ("fast_bonus","dumbledore","veloz","Treinta puntos extra. La velocidad, cuando no se usa para huir de responsabilidades, es virtud.","Bonus rápido"),
    ("fast_bonus","luna","destello","Fuiste veloz. Vi un destello, o quizá era un nargle impresionado.","Bonus rápido"),
    ("fast_bonus","sombrero","instinto","Bonus rápido. Tu instinto eligió antes que tu ansiedad pudiera opinar.","Bonus rápido"),
    ("streak_bonus","dumbledore","racha","Racha de tres. La casa está entrando en una zona peligrosa: confianza con evidencia.","Racha"),
    ("streak_bonus","mcgonagall","disciplina","Tres correctas seguidas. Eso se llama disciplina. O suerte muy bien peinada.","Racha"),
    ("streak_bonus","harry","modo_heroe","Racha activada. Alguien empezó como alumno y terminó como protagonista.","Racha"),
    ("streak_bonus","luna","energia","Tres seguidas. Hay una energía extraña en el aire, pero de la buena.","Racha"),
    ("streak_bonus","sombrero","favorita","Racha de tres. El Sombrero no tiene favoritos, pero está tomando notas.","Racha"),
    ("humor_bonus","sombrero","falsa_graciosa","Bonus de humor. Esa respuesta era falsa, pero tuvo más personalidad que muchas defensas correctas.","Bonus humor"),
    ("humor_bonus","dumbledore","risa","Veinte puntos por hacer reír al caos. No todo en la vida es exactitud; a veces también es timing.","Bonus humor"),
    ("humor_bonus","luna","absurdo","Respuesta falsa, pero deliciosamente absurda. Los nargles aplauden.","Bonus humor"),
    ("humor_bonus","harry","me_rei","No salvó la ronda, pero sí salvó el ambiente. Bonus de humor concedido.","Bonus humor"),
    ("humor_bonus","mcgonagall","permitido","Normalmente no premio disparates. Hoy haré una excepción estrictamente reglamentada.","Bonus humor"),
    ("leaderboard","sombrero","lider","La tabla se mueve. Algunas casas suben, otras descubren el concepto de humildad.","Marcador"),
    ("leaderboard","mcgonagall","orden","Revisemos el marcador. Sin gritos, sin hechizos y sin culpar al celular.","Marcador"),
    ("leaderboard","dumbledore","camino","El marcador revela una verdad antigua: todavía puede pasar cualquier cosa, incluso una remontada ridícula.","Marcador"),
    ("leaderboard","harry","presion","Así va la competencia. La presión sube más rápido que una escoba mal calibrada.","Marcador"),
    ("leaderboard","luna","puntos","Los puntos bailan de forma misteriosa. Pero sí, alguien va ganando.","Marcador"),
    ("winner","dumbledore","gryffindor","Gryffindor gana la Copa de las Casas. Celebren con dignidad… o al menos con una foto donde todos salgan decentes.","Ganador"),
    ("winner","dumbledore","slytherin","Slytherin gana la Copa de las Casas. Celebren con dignidad… o al menos con una foto donde todos salgan decentes.","Ganador"),
    ("winner","dumbledore","ravenclaw","Ravenclaw gana la Copa de las Casas. Celebren con dignidad… o al menos con una foto donde todos salgan decentes.","Ganador"),
    ("winner","dumbledore","hufflepuff","Hufflepuff gana la Copa de las Casas. Celebren con dignidad… o al menos con una foto donde todos salgan decentes.","Ganador"),
    ("final","mcgonagall","cierre","La partida ha terminado. Felicidades a quienes ganaron y respeto absoluto a quienes vinieron a decorar el marcador.","Cierre"),
    ("final","harry","revancha","Buena partida. Si perdieron, recuerden: la revancha es una tradición mágica no oficial.","Cierre"),
    ("final","luna","amistad","Ganaron puntos, perdieron dignidad en algunos momentos y aun así todo salió bastante bonito.","Cierre"),
    ("final","sombrero","otra","El Sombrero recomienda otra partida. Dice que ciertas casas no pueden irse así, con ese marcador.","Cierre"),
    ("final","dumbledore","noche","Que la magia continúe. Y que nadie use la derrota como excusa para abandonar la mesa sin pagar.","Cierre"),
    ("system","mcgonagall","conexion","Parece que hubo un problema de conexión. Nadie se mueva: el caos técnico también se disciplina.","Sistema"),
    ("system","harry","reintento","Algo falló, pero seguimos vivos. Intenta de nuevo y no mires al servidor con miedo.","Sistema"),
    ("system","luna","router","El sistema está pensando. O el router está teniendo una experiencia espiritual.","Sistema"),
    ("system","sombrero","sala_llena","La sala está llena. El Sombrero sugiere esperar… o organizar una segunda mesa con menos drama.","Sistema"),
    ("system","dumbledore","reiniciar","Si todo falla, reiniciar también es una forma humilde de magia.","Sistema"),
    ("explanation","mcgonagall","exp_correcta","La defensa correcta funciona porque resuelve la amenaza sin causar una crisis secundaria, que ya es bastante pedir.","Explicación"),
    ("explanation","dumbledore","exp_absurda","La explicación es sencilla: en magia ridícula, la calma vence más que el pánico teatral.","Explicación"),
    ("explanation","harry","exp_error","Esa opción sonaba heroica, pero era exactamente el tipo de plan que termina con alguien corriendo por un pasillo.","Explicación"),
    ("explanation","luna","exp_rara","La opción rara no siempre es incorrecta. Pero esta vez sí. Tenía demasiada vibra de nargle.","Explicación"),
    ("explanation","sombrero","exp_graciosa","No era correcta, pero admito que tenía estilo. Y el estilo, aunque no salva vidas, salva reuniones.","Explicación"),
]

def build_catalog() -> dict:
    voice_lines = []
    for event, key, slug, text, usage in RAW_LINES:
        audio_file = f"{event}_{key}_{slug}.mp3"
        voice_lines.append({
            "id": f"{event}.{key}.{slug}",
            "event": event,
            "character": CHARACTERS[key][0],
            "voice_key": key,
            "audio_file": audio_file,
            "asset_path": f"assets/audio/voice_lines/{audio_file}",
            "text": text,
            "usage": usage,
            "mood": "humor mágico en español latino",
        })
    return {
        "version": "1.0.0",
        "project": "jackbox-magico",
        "description": "Catálogo central de referencias de audio para ElevenLabs.",
        "safety_note": "Usa voces originales o inspiradas en arquetipos mágicos. Evita clonar voces reales sin autorización.",
        "characters": {k: {"display_name": v[0], "direction": v[1]} for k, v in CHARACTERS.items()},
        "voice_lines": voice_lines,
    }

if __name__ == "__main__":
    output = Path(__file__).resolve().parents[1] / "data" / "voice_lines.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(build_catalog(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Catálogo generado: {output}")
    print(f"Frases registradas: {len(RAW_LINES)}")
