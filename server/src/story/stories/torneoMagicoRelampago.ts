import { StoryDefinition } from '../storyTypes';

export const torneoMagicoRelampago: StoryDefinition = {
  id: "torneo_magico_relampago",
  title: "Torneo Mágico Relámpago",
  shortTitle: "Torneo Relámpago",
  description: "Una versión rápida, intensa y divertida para grupos que quieren acción inmediata. Menos historia, más caos mágico.",
  estimatedMinutes: 20,
  recommendedPlayers: "2 a 8 jugadores",
  difficulty: "familiar",
  tone: "comedy",
  steps: [
    {
      id: "torneo_inicio",
      type: "dialogue",
      title: "Torneo Mágico Relámpago",
      subtitle: "Poco tiempo, mucho desorden",
      visual: "lightning_tournament",
      voiceSlot: "torneo_relampago_inicio",
      lines: [
        "Bienvenidos al Torneo Mágico Relámpago.",
        "Aquí no hay tiempo para discursos largos, explicaciones solemnes ni dignidad excesiva.",
        "Las casas competirán en pruebas rápidas.",
        "Quien pestañee, pierda puntos o culpe al celular, probablemente será recordado."
      ]
    },
    {
      id: "instrucciones_trivia_relampago",
      type: "instructions",
      title: "Calentamiento rápido",
      instructionGameId: "trivia_magica",
      voiceSlot: "instructions_trivia_magica"
    },
    {
      id: "trivia_relampago_1",
      type: "trivia_block",
      title: "Trivia Relámpago",
      questions: 3,
      reason: "La Copa quiere empezar rápido.",
      voiceSlot: "torneo_relampago_trivia"
    },
    {
      id: "instrucciones_snitch_relampago",
      type: "instructions",
      title: "Reflejos inmediatos",
      instructionGameId: "atrapa_snitch",
      voiceSlot: "instructions_atrapa_snitch"
    },
    {
      id: "snitch_relampago",
      type: "fixed_minigame",
      gameId: "atrapa_snitch",
      title: "Atrapa la Snitch",
      reason: "Nada dice competencia justa como una bola dorada moviéndose sin piedad.",
      voiceSlot: "torneo_relampago_snitch"
    },
    {
      id: "marcador_relampago_1",
      type: "scoreboard",
      title: "Marcador veloz",
      scoreboardTitle: "Primer golpe al orgullo",
      voiceSlot: "story_scoreboard"
    },
    {
      id: "instrucciones_artes_relampago",
      type: "instructions",
      title: "Defensa absurda",
      instructionGameId: "artes_ridiculas",
      voiceSlot: "instructions_artes_ridiculas"
    },
    {
      id: "artes_relampago",
      type: "fixed_minigame",
      gameId: "artes_ridiculas",
      title: "Defensa Contra las Artes Ridículas",
      reason: "La Copa exige reflejos mentales y sentido del humor.",
      voiceSlot: "torneo_relampago_artes"
    },
    {
      id: "instrucciones_duelo_relampago",
      type: "instructions",
      title: "Duelo rápido",
      instructionGameId: "duelo_hechizos",
      voiceSlot: "instructions_duelo_hechizos"
    },
    {
      id: "duelo_relampago",
      type: "fixed_minigame",
      gameId: "duelo_hechizos",
      title: "Duelo de Hechizos",
      reason: "Dos jugadores se enfrentarán antes de que alguien pida revancha.",
      voiceSlot: "torneo_relampago_duelo"
    },
    {
      id: "marcador_relampago_2",
      type: "scoreboard",
      title: "Marcador antes del cierre",
      scoreboardTitle: "Ya casi pueden presumir o excusarse",
      voiceSlot: "story_scoreboard"
    },
    {
      id: "instrucciones_copa_relampago",
      type: "instructions",
      title: "Final inmediata",
      instructionGameId: "copa_final",
      voiceSlot: "instructions_copa_final"
    },
    {
      id: "copa_final_relampago",
      type: "copa_final",
      gameId: "copa_final",
      title: "Copa Final",
      reason: "Una pregunta final para cerrar el caos.",
      voiceSlot: "torneo_relampago_final"
    },
    {
      id: "cierre_relampago",
      type: "story_complete",
      title: "El torneo terminó",
      subtitle: "Rápido, injusto y glorioso",
      voiceSlot: "torneo_relampago_cierre",
      lines: [
        "El Torneo Relámpago ha terminado.",
        "Fue breve, intenso y probablemente dejó más preguntas que respuestas.",
        "La Copa reconoce a la casa ganadora.",
        "Las demás pueden decir que estaban calentando."
      ]
    }
  ]
};
