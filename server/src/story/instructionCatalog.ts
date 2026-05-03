import { GameId } from '../data/gameCatalog';

export interface Instruction {
  title: string;
  subtitle: string;
  rules: string[];
  tvInstructions: string[];
  mobileInstructions: string[];
  scoring: string;
  voiceSlot: string;
  startButton: string;
}

export const INSTRUCTION_CATALOG: Record<GameId, Instruction> = {
  trivia_magica: {
    title: "Trivia del Mundo Mágico",
    subtitle: "Demuestra quién realmente puso atención y quién solo vino por la cerveza de mantequilla.",
    rules: [
      "La TV mostrará una pregunta con cuatro opciones.",
      "Cada jugador responde desde su celular.",
      "Responder correctamente suma puntos.",
      "Responder rápido puede dar puntos extra.",
      "Las rachas de aciertos pueden cambiar el marcador."
    ],
    tvInstructions: [
      "Lee la pregunta en pantalla.",
      "Observa cuántos jugadores han respondido.",
      "Avanza a resultados cuando termine la ronda."
    ],
    mobileInstructions: [
      "Elige la respuesta correcta en tu celular.",
      "Una vez enviada, no podrás cambiarla.",
      "Mira la TV para ver el resultado."
    ],
    scoring: "Correcta: puntos según dificultad. Rapidez: bono adicional. Racha: bono especial por varias correctas consecutivas.",
    voiceSlot: "instructions_trivia_magica",
    startButton: "Comenzar trivia"
  },
  artes_ridiculas: {
    title: "Defensa Contra las Artes Ridículas",
    subtitle: "Porque no todos los peligros oscuros vienen con capa. Algunos vienen con recibos, exes y mensajes sin contestar.",
    rules: [
      "La TV mostrará una amenaza absurda.",
      "Cada jugador elige la mejor defensa.",
      "Hay una respuesta correcta y respuestas falsas graciosas.",
      "La opción más graciosa puede dar puntos extra si fallas."
    ],
    tvInstructions: [
      "Presenta la amenaza ridícula.",
      "Observa cuántos jugadores respondieron.",
      "Revela cuál era la defensa correcta."
    ],
    mobileInstructions: [
      "Elige la defensa que creas correcta.",
      "Si no sabes, al menos intenta ser gracioso.",
      "Tu respuesta se bloquea al enviarla."
    ],
    scoring: "Correcta: +100. Rapidez: +30. Falsa graciosa: +20. Error común: -20.",
    voiceSlot: "instructions_artes_ridiculas",
    startButton: "Iniciar defensa"
  },
  atrapa_snitch: {
    title: "Atrapa la Snitch",
    subtitle: "Reflejos, precisión y una cantidad preocupante de confianza en tus dedos.",
    rules: [
      "La TV mostrará una Snitch en movimiento.",
      "En tu celular tendrás un botón de captura.",
      "Presiona cuando la Snitch esté dentro del aro.",
      "Tienes intentos limitados.",
      "La precisión determina los puntos."
    ],
    tvInstructions: [
      "Observa la Snitch y el aro de captura.",
      "La TV mostrará las mejores capturas.",
      "Al final se revelará quién fue el mejor buscador."
    ],
    mobileInstructions: [
      "Pulsa el botón de captura en el momento exacto.",
      "No desperdicies tus intentos.",
      "Cada intento cuenta."
    ],
    scoring: "Captura legendaria: +180. Captura perfecta: +130. Gran captura: +90. Cerca: +45. Fallo: 0.",
    voiceSlot: "instructions_atrapa_snitch",
    startButton: "Soltar la Snitch"
  },
  duelo_hechizos: {
    title: "Duelo de Hechizos",
    subtitle: "Dos varitas. Una arena. Cero garantías de dignidad.",
    rules: [
      "La TV elegirá dos duelistas.",
      "Cada duelista selecciona un hechizo desde su celular.",
      "Algunos hechizos vencen a otros.",
      "Si ambos eligen lo mismo, habrá choque de varitas.",
      "En el choque, gana quien pulse más rápido."
    ],
    tvInstructions: [
      "Presenta a los duelistas.",
      "Espera a que elijan hechizo.",
      "Revela el resultado o activa el choque de varitas."
    ],
    mobileInstructions: [
      "Si eres duelista, elige tu hechizo.",
      "Si hay choque, pulsa rápidamente.",
      "Si no eres duelista, mira la TV."
    ],
    scoring: "Victoria de duelo: puntos principales. Choque ganado: bono adicional. No responder: penalización o derrota automática.",
    voiceSlot: "instructions_duelo_hechizos",
    startButton: "Comenzar duelo"
  },
  sombrero_burlon: {
    title: "El Sombrero Burlón",
    subtitle: "El sombrero no solo selecciona casas. También juzga personalidades con una precisión incómoda.",
    rules: [
      "La TV mostrará una frase del Sombrero.",
      "Cada jugador vota por quien mejor encaje.",
      "No puedes votarte a ti mismo.",
      "El jugador más votado gana puntos.",
      "Recibir votos también suma."
    ],
    tvInstructions: [
      "Lee la frase del Sombrero.",
      "Espera a que todos voten.",
      "Revela al más señalado por la magia social."
    ],
    mobileInstructions: [
      "Elige a otro jugador.",
      "No puedes votarte a ti mismo.",
      "Tu voto es secreto hasta la revelación."
    ],
    scoring: "Voto recibido: +10. Más votado de la ronda: +60. Cero votos: +15 de consuelo. Ganador global: +100.",
    voiceSlot: "instructions_sombrero_burlon",
    startButton: "Consultar al Sombrero"
  },
  clase_pociones: {
    title: "Clase de Pociones",
    subtitle: "Memoriza, mezcla y ruega que el caldero no presente una queja formal.",
    rules: [
      "La TV mostrará una receta de ingredientes.",
      "Memoriza el orden.",
      "Después, mezcla desde tu celular.",
      "Algunos modos pueden invertir o dificultar la receta.",
      "Menos errores significa más puntos."
    ],
    tvInstructions: [
      "Muestra la receta durante la fase de memorización.",
      "Luego oculta la receta y muestra el caldero.",
      "Revela quién preparó la mejor poción."
    ],
    mobileInstructions: [
      "Primero mira la TV.",
      "Después toca los ingredientes en el orden correcto.",
      "Puedes limpiar tu selección antes de enviar."
    ],
    scoring: "Poción perfecta: +150. Un error: +80. Dos errores: +40. Más errores: 0. Rapidez: bono adicional.",
    voiceSlot: "instructions_clase_pociones",
    startButton: "Abrir el caldero"
  },
  mapa_travieso: {
    title: "El Mapa Travieso",
    subtitle: "El mapa revela todo… excepto tu capacidad para recordar dónde viste las cosas.",
    rules: [
      "La TV mostrará un mapa con objetos o personajes.",
      "Memoriza la ubicación de cada elemento.",
      "Luego la TV ocultará el mapa.",
      "Tu celular mostrará una pregunta de ubicación.",
      "Responde dónde estaba el objetivo."
    ],
    tvInstructions: [
      "Muestra el mapa durante la observación.",
      "Oculta los elementos durante la fase de respuesta.",
      "Revela la ubicación correcta al final."
    ],
    mobileInstructions: [
      "Observa la TV.",
      "Cuando aparezcan opciones, elige la ubicación correcta.",
      "Responde rápido para ganar más puntos."
    ],
    scoring: "Respuesta correcta: +100. Rapidez: +30. Modo difícil fallado: -20.",
    voiceSlot: "instructions_mapa_travieso",
    startButton: "Abrir el mapa"
  },
  caldero_mentiroso: {
    title: "El Caldero Mentiroso",
    subtitle: "La confianza es importante. Por eso este juego la destruye en menos de un minuto.",
    rules: [
      "Cada jugador recibe un ingrediente secreto.",
      "Puedes meterlo al caldero, descartarlo o acusar a alguien.",
      "La TV no revelará ingredientes hasta el final.",
      "La estabilidad decidirá si la poción sobrevive o explota.",
      "Acusar correctamente puede cambiar el marcador."
    ],
    tvInstructions: [
      "Muestra el caldero y el contador de acciones.",
      "No reveles ingredientes antes del final.",
      "Al cerrar la ronda, revela acciones e ingredientes."
    ],
    mobileInstructions: [
      "Mira tu ingrediente secreto.",
      "Decide si lo metes, lo descartas o acusas a alguien.",
      "No todos están jugando limpio."
    ],
    scoring: "Ingrediente bueno exitoso: +120. Ingrediente dorado exitoso: +180. Acusación correcta: +70. Acusación incorrecta: -30. Descartar explosivo: +35. No actuar: -20.",
    voiceSlot: "instructions_caldero_mentiroso",
    startButton: "Encender caldero"
  },
  retratos_chismosos: {
    title: "Retratos Chismosos",
    subtitle: "Los muros oyen. Los retratos exageran. Tú intenta adivinar.",
    rules: [
      "La TV mostrará un retrato con una pista.",
      "El retrato hablará con tono sospechosamente chismoso.",
      "Los jugadores eligen la respuesta correcta.",
      "La rapidez puede dar puntos extra."
    ],
    tvInstructions: [
      "Muestra el retrato y la pista.",
      "Presenta las opciones.",
      "Revela la respuesta y el comentario del retrato."
    ],
    mobileInstructions: [
      "Lee la pista en la TV.",
      "Elige la opción correcta.",
      "No te fíes demasiado del retrato, pero tampoco lo ignores."
    ],
    scoring: "Correcta: +100. Rapidez: +30. Error: 0.",
    voiceSlot: "instructions_retratos_chismosos",
    startButton: "Escuchar retratos"
  },
  hechizo_incompleto: {
    title: "Hechizo Incompleto",
    subtitle: "Una palabra equivocada y tal vez conviertas una lámpara en deuda emocional.",
    rules: [
      "La TV mostrará un hechizo, frase o encantamiento incompleto.",
      "Elige la opción que completa correctamente el texto.",
      "Responder rápido puede dar puntos extra."
    ],
    tvInstructions: [
      "Muestra el hechizo incompleto.",
      "Presenta las opciones.",
      "Revela la forma correcta al final."
    ],
    mobileInstructions: [
      "Elige la palabra o frase correcta.",
      "Una vez enviada, no se puede cambiar.",
      "Mira la TV para el resultado."
    ],
    scoring: "Correcta: +80. Difícil: hasta +120. Rapidez: +30. Error: 0.",
    voiceSlot: "instructions_hechizo_incompleto",
    startButton: "Completar hechizo"
  },
  patronus_personalizado: {
    title: "Patronus Personalizado",
    subtitle: "El hechizo más poderoso contra la oscuridad… y contra la falta de creatividad.",
    rules: [
      "La TV mostrará un tema.",
      "Cada jugador escribe una propuesta de Patronus.",
      "Después todos votan por la mejor propuesta.",
      "No puedes votar por la tuya.",
      "La propuesta más votada gana."
    ],
    tvInstructions: [
      "Muestra el tema creativo.",
      "Espera propuestas.",
      "Después muestra las propuestas para votación.",
      "Revela el ranking final."
    ],
    mobileInstructions: [
      "Escribe una propuesta breve.",
      "Luego vota por otra propuesta.",
      "No puedes votar por ti mismo."
    ],
    scoring: "Participar: +20. Cada voto recibido: +10. Primer lugar: +120. Segundo lugar: +80. Casa ganadora por votos: bono adicional.",
    voiceSlot: "instructions_patronus_personalizado",
    startButton: "Conjurar Patronus"
  },
  copa_final: {
    title: "La Copa Final",
    subtitle: "La última pregunta. La última apuesta. La última oportunidad para fingir seguridad.",
    rules: [
      "Cada jugador apuesta parte de sus puntos.",
      "Después responde una pregunta final.",
      "Si acierta, suma su apuesta.",
      "Si falla, la pierde.",
      "La casa con más puntos gana la Copa."
    ],
    tvInstructions: [
      "Muestra el marcador antes de apostar.",
      "Esperas las apuestas.",
      "Presenta la pregunta final.",
      "Revela la respuesta y la casa ganadora."
    ],
    mobileInstructions: [
      "Elige cuánto apostar.",
      "Responde la pregunta final.",
      "Mira la TV para el resultado definitivo."
    ],
    scoring: "Correcta: suma apuesta. Incorrecta: pierde apuesta. Todo o nada: puede tener bono especial. Sin respuesta: pierde apuesta si apostó.",
    voiceSlot: "instructions_copa_final",
    startButton: "Levantar la Copa"
  }
};
