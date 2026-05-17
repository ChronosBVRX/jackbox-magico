import { StoryDefinition } from '../storyTypes';

export const copaRotativaMagica: StoryDefinition = {
  id: "copa_rotativa_magica",
  title: "Torneo Mágico Rotativo (Modo Infinito)",
  shortTitle: "Torneo Rotativo",
  description: "La experiencia definitiva de Hogwarts. Cada vez que juegues, la Copa seleccionará preguntas de trivia y minijuegos completamente diferentes. ¡Ninguna partida será igual a la anterior!",
  estimatedMinutes: 45,
  recommendedPlayers: "4 a 8 jugadores",
  difficulty: "normal",
  tone: "epic",
  steps: [
    {
      id: "bienvenida_torneo_rotativo",
      type: "dialogue",
      title: "El Torneo Mágico Rotativo",
      subtitle: "Un desafío infinito",
      visual: "great_hall_intro",
      voiceSlot: "copa_clasica_bienvenida",
      lines: [
        "Las puertas del Gran Comedor se abren para dar inicio al Torneo Mágico Rotativo.",
        "A diferencia de las competencias comunes, esta noche el castillo ha decidido cambiar las reglas.",
        "Cada bloque de trivia tendrá preguntas nuevas y cada minijuego será seleccionado al azar por la magia del castillo.",
        "Prepárense para lo inesperado. Tomen sus varitas y que comience el torneo."
      ]
    },
    {
      id: "instrucciones_trivia_1",
      type: "instructions",
      title: "Primer Bloque de Trivia",
      instructionGameId: "trivia_magica",
      voiceSlot: "instructions_trivia_magica"
    },
    {
      id: "trivia_bloque_1",
      type: "trivia_block",
      title: "Trivia: Primer Desafío",
      subtitle: "3 Preguntas para abrir el marcador",
      questions: 3,
      reason: "Tres preguntas para separar a los sabios de los suertudos.",
      voiceSlot: "story_transition_trivia"
    },
    {
      id: "marcador_1",
      type: "scoreboard",
      title: "Primer Corte del Torneo",
      scoreboardTitle: "El marcador cobra vida",
      voiceSlot: "story_scoreboard"
    },
    {
      id: "instrucciones_minijuego_1",
      type: "instructions",
      title: "Primer Minijuego Sorpresa",
      instructionGameId: "random",
      voiceSlot: "story_transition_minigame"
    },
    {
      id: "minijuego_1",
      type: "minigame_random",
      title: "Primer Minijuego Sorpresa",
      reason: "El castillo ha seleccionado una prueba especial para medir sus habilidades."
    },
    {
      id: "marcador_2",
      type: "scoreboard",
      title: "Segundo Corte del Torneo",
      scoreboardTitle: "Los puntos se acumulan",
      voiceSlot: "story_scoreboard"
    },
    {
      id: "instrucciones_trivia_2",
      type: "instructions",
      title: "Segundo Bloque de Trivia",
      instructionGameId: "trivia_magica",
      voiceSlot: "instructions_trivia_magica"
    },
    {
      id: "trivia_bloque_2",
      type: "trivia_block",
      title: "Trivia: Segundo Desafío",
      subtitle: "2 Preguntas de nivel intermedio",
      questions: 2,
      reason: "La dificultad aumenta y cada acierto vale oro.",
      voiceSlot: "story_transition_trivia"
    },
    {
      id: "marcador_3",
      type: "scoreboard",
      title: "Tercer Corte del Torneo",
      scoreboardTitle: "Mitad de camino",
      voiceSlot: "story_scoreboard"
    },
    {
      id: "instrucciones_minijuego_2",
      type: "instructions",
      title: "Segundo Minijuego Sorpresa",
      instructionGameId: "random",
      voiceSlot: "story_transition_minigame"
    },
    {
      id: "minijuego_2",
      type: "minigame_random",
      title: "Segundo Minijuego Sorpresa",
      reason: "Una nueva prueba al azar para sacudir las posiciones en la tabla."
    },
    {
      id: "marcador_4",
      type: "scoreboard",
      title: "Cuarto Corte del Torneo",
      scoreboardTitle: "La tensión se respira en el Gran Comedor",
      voiceSlot: "story_scoreboard"
    },
    {
      id: "instrucciones_trivia_3",
      type: "instructions",
      title: "Tercer Bloque de Trivia",
      instructionGameId: "trivia_magica",
      voiceSlot: "instructions_trivia_magica"
    },
    {
      id: "trivia_bloque_3",
      type: "trivia_block",
      title: "Trivia: Pregunta Decisiva",
      subtitle: "1 Pregunta de alto riesgo",
      questions: 1,
      reason: "Una sola pregunta antes del sprint final.",
      voiceSlot: "story_transition_trivia"
    },
    {
      id: "marcador_5",
      type: "scoreboard",
      title: "Quinto Corte del Torneo",
      scoreboardTitle: "Último vistazo antes de la recta final",
      voiceSlot: "story_scoreboard"
    },
    {
      id: "instrucciones_minijuego_3",
      type: "instructions",
      title: "Tercer Minijuego Sorpresa",
      instructionGameId: "random",
      voiceSlot: "story_transition_minigame"
    },
    {
      id: "minijuego_3",
      type: "minigame_random",
      title: "Tercer Minijuego Sorpresa",
      reason: "La última prueba sorpresa antes de disputar la Copa Final."
    },
    {
      id: "marcador_antes_final",
      type: "scoreboard",
      title: "Marcador Previo a la Gran Final",
      scoreboardTitle: "Posiciones definitivas antes de apostar",
      voiceSlot: "story_scoreboard"
    },
    {
      id: "copa_final_intro",
      type: "dialogue",
      title: "La Copa Final",
      subtitle: "El momento de la verdad",
      visual: "final_cup",
      voiceSlot: "copa_clasica_final_intro",
      lines: [
        "El Torneo Mágico Rotativo ha llegado a su cumbre.",
        "Todo lo acumulado en trivia y minijuegos los ha traído hasta aquí.",
        "Es momento de arriesgar sus puntos en una última y decisiva pregunta.",
        "Hagan sus apuestas. La Copa Final aguarda al campeón."
      ]
    },
    {
      id: "instrucciones_copa_final",
      type: "instructions",
      title: "Instrucciones de la Copa Final",
      instructionGameId: "copa_final",
      voiceSlot: "instructions_copa_final"
    },
    {
      id: "copa_final",
      type: "copa_final",
      gameId: "copa_final",
      title: "La Copa Final",
      reason: "La última pregunta decidirá la gloria."
    },
    {
      id: "cierre_copa_rotativa",
      type: "story_complete",
      title: "El Torneo ha Concluido",
      subtitle: "¡Tenemos un Campeón!",
      voiceSlot: "copa_clasica_cierre",
      lines: [
        "El Torneo Mágico Rotativo ha llegado a su fin.",
        "La Copa reconoce la adaptabilidad, la astucia y la perseverancia de la casa ganadora.",
        "Celebren su victoria, y recuerden: la próxima vez que jueguen, los desafíos serán completamente diferentes."
      ]
    }
  ]
};
