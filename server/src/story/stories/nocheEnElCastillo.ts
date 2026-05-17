import { StoryDefinition } from '../storyTypes';

export const nocheEnElCastillo: StoryDefinition = {
  id: "noche_en_el_castillo",
  title: "Noche en el Castillo",
  shortTitle: "Noche en el Castillo",
  description: "Una historia más misteriosa donde las casas exploran pasillos, retratos, mapas y secretos hasta descubrir quién domina la noche.",
  estimatedMinutes: 40,
  recommendedPlayers: "4 a 8 jugadores",
  difficulty: "normal",
  tone: "mysterious",
  steps: [
    {
      id: "noche_inicio",
      type: "dialogue",
      title: "La noche cae sobre el castillo",
      subtitle: "Algo se mueve en los pasillos",
      visual: "castle_night",
      voiceSlot: "noche_castillo_inicio",
      lines: [
        "La noche cayó sobre el castillo y algo se mueve entre los pasillos.",
        "Nadie sabe si es magia antigua, una broma o alguien que claramente no sabe respetar horarios.",
        "Las casas deberán investigar, competir y sobrevivir a la noche.",
        "La Copa observa desde las sombras."
      ]
    },
    {
      id: "instrucciones_mapa_noche",
      type: "instructions",
      title: "Primer rastro",
      instructionGameId: "mapa_travieso",
      voiceSlot: "instructions_mapa_travieso"
    },
    {
      id: "mapa_noche_1",
      type: "fixed_minigame",
      gameId: "mapa_travieso",
      title: "El Mapa Travieso",
      reason: "El mapa revela los primeros movimientos de la noche."
    },
    {
      id: "retratos_despiertan",
      type: "dialogue",
      title: "Los retratos despiertan",
      subtitle: "Nadie pidió su opinión",
      visual: "haunted_gallery",
      voiceSlot: "noche_castillo_retratos",
      lines: [
        "Un marco cruje. Luego otro. Pronto, todos los retratos parecen tener algo que decir.",
        "La mayoría habla al mismo tiempo. Como una junta, pero con más polvo.",
        "Entre los rumores puede esconderse una pista verdadera."
      ]
    },
    {
      id: "instrucciones_retratos_noche",
      type: "instructions",
      title: "Escucha los rumores",
      instructionGameId: "retratos_chismosos",
      voiceSlot: "instructions_retratos_chismosos"
    },
    {
      id: "retratos_noche_1",
      type: "fixed_minigame",
      gameId: "retratos_chismosos",
      title: "Retratos Chismosos",
      reason: "Los retratos entregarán pistas, aunque no necesariamente con humildad."
    },
    {
      id: "marcador_noche_1",
      type: "scoreboard",
      title: "Primer avance de la investigación",
      scoreboardTitle: "Las casas siguen el rastro",
      voiceSlot: "story_scoreboard"
    },
    {
      id: "defensa_noche",
      type: "dialogue",
      title: "Un peligro absurdo aparece",
      subtitle: "No todo misterio es elegante",
      visual: "ridiculous_threat",
      voiceSlot: "noche_castillo_artes",
      lines: [
        "Una sombra apareció al fondo del pasillo.",
        "Por un momento pareció una amenaza seria.",
        "Luego empezó a quejarse de que nadie le respondió un mensaje.",
        "Es momento de defenderse contra las artes ridículas."
      ]
    },
    {
      id: "instrucciones_artes_noche",
      type: "instructions",
      title: "Defensa inesperada",
      instructionGameId: "artes_ridiculas",
      voiceSlot: "instructions_artes_ridiculas"
    },
    {
      id: "artes_noche_1",
      type: "fixed_minigame",
      gameId: "artes_ridiculas",
      title: "Defensa Contra las Artes Ridículas",
      reason: "La noche no solo trae oscuridad. También trae situaciones incómodas."
    },
    {
      id: "caldero_sospechoso",
      type: "dialogue",
      title: "El caldero escondido",
      subtitle: "Alguien está saboteando la poción",
      visual: "hidden_cauldron",
      voiceSlot: "noche_castillo_caldero",
      lines: [
        "En una sala abandonada, un caldero hierve sin supervisión.",
        "Eso nunca es buena señal.",
        "Cada casa tiene ingredientes. No todos tienen buenas intenciones.",
        "La pregunta es simple: ¿salvarán la poción o la harán explotar con estilo?"
      ]
    },
    {
      id: "instrucciones_caldero_noche",
      type: "instructions",
      title: "Prueba de engaño",
      instructionGameId: "caldero_mentiroso",
      voiceSlot: "instructions_caldero_mentiroso"
    },
    {
      id: "caldero_noche_1",
      type: "fixed_minigame",
      gameId: "caldero_mentiroso",
      title: "El Caldero Mentiroso",
      reason: "La investigación se convierte en sabotaje."
    },
    {
      id: "marcador_noche_2",
      type: "scoreboard",
      title: "Segundo avance de la noche",
      scoreboardTitle: "La confianza empieza a escasear",
      voiceSlot: "story_scoreboard"
    },
    {
      id: "hechizos_antiguos",
      type: "dialogue",
      title: "Hechizos en la pared",
      subtitle: "Letras incompletas",
      visual: "glowing_runes",
      voiceSlot: "noche_castillo_hechizo",
      lines: [
        "En una pared de piedra aparecen palabras incompletas.",
        "Son hechizos antiguos, o tal vez apuntes de alguien con muy mala letra.",
        "Completar los encantamientos puede revelar el camino final."
      ]
    },
    {
      id: "instrucciones_hechizo_noche",
      type: "instructions",
      title: "Completa el encantamiento",
      instructionGameId: "hechizo_incompleto",
      voiceSlot: "instructions_hechizo_incompleto"
    },
    {
      id: "hechizo_noche_1",
      type: "fixed_minigame",
      gameId: "hechizo_incompleto",
      title: "Hechizo Incompleto",
      reason: "Las palabras correctas abrirán el siguiente paso."
    },
    {
      id: "patronus_noche",
      type: "dialogue",
      title: "La oscuridad se acerca",
      subtitle: "La luz debe tomar forma",
      visual: "patronus_light",
      voiceSlot: "noche_castillo_patronus",
      lines: [
        "La oscuridad se cerró alrededor del grupo.",
        "Para avanzar, cada jugador debe imaginar una defensa luminosa.",
        "Algunos invocarán algo noble. Otros, algo profundamente cuestionable.",
        "Ambos casos serán juzgados."
      ]
    },
    {
      id: "instrucciones_patronus_noche",
      type: "instructions",
      title: "Invoca tu luz",
      instructionGameId: "patronus_personalizado",
      voiceSlot: "instructions_patronus_personalizado"
    },
    {
      id: "patronus_noche_1",
      type: "fixed_minigame",
      gameId: "patronus_personalizado",
      title: "Patronus Personalizado",
      reason: "La creatividad puede iluminar incluso la noche más rara."
    },
    {
      id: "marcador_noche_3",
      type: "scoreboard",
      title: "Antes del amanecer",
      scoreboardTitle: "El misterio casi termina",
      voiceSlot: "story_scoreboard"
    },
    {
      id: "trivia_misterio_final",
      type: "dialogue",
      title: "La última pista",
      subtitle: "Todo apunta a la Copa",
      visual: "final_clue",
      voiceSlot: "story_transition_trivia",
      lines: [
        "La última pista no estaba en el mapa, ni en los retratos, ni en el caldero.",
        "Estaba en lo que cada casa sabía desde el principio.",
        "La Copa exige respuestas antes del amanecer."
      ]
    },
    {
      id: "instrucciones_trivia_noche",
      type: "instructions",
      title: "Trivia del misterio",
      instructionGameId: "trivia_magica",
      voiceSlot: "instructions_trivia_magica"
    },
    {
      id: "trivia_noche_final",
      type: "trivia_block",
      title: "Bloque de Trivia: El secreto del castillo",
      questions: 5,
      reason: "La noche se resolverá con conocimiento."
    },
    {
      id: "marcador_noche_final",
      type: "scoreboard",
      title: "Marcador antes de la Copa Final",
      scoreboardTitle: "La noche deja sus favoritos",
      voiceSlot: "story_scoreboard"
    },
    {
      id: "instrucciones_copa_noche",
      type: "instructions",
      title: "La decisión final",
      instructionGameId: "copa_final",
      voiceSlot: "instructions_copa_final"
    },
    {
      id: "copa_final_noche",
      type: "copa_final",
      gameId: "copa_final",
      title: "Copa Final",
      reason: "La casa ganadora dominará la noche."
    },
    {
      id: "cierre_noche",
      type: "story_complete",
      title: "Amanece en el castillo",
      subtitle: "La Copa ya eligió",
      voiceSlot: "noche_castillo_cierre",
      lines: [
        "El sol aparece sobre las torres.",
        "El misterio terminó, aunque algunos todavía no entienden qué pasó.",
        "La Copa sí lo entendió. Y ya eligió a la casa ganadora."
      ]
    }
  ]
};
