export interface VoiceSlot {
  id: string;
  label: string;
  legacyPath: string;
  enabled: boolean;
  moment?: string;
  recommendedDelayMs?: number;
}

export const STORY_VOICE_SLOTS: Record<string, VoiceSlot> = {
  // General Story Slots
  story_intro_general: {
    id: "story_intro_general",
    label: "Introducción General",
    legacyPath: "/assets/audio/voice_lines/00_intro_general_dumbledore.mp3",
    enabled: true,
    moment: "story_start",
    recommendedDelayMs: 300
  },
  story_transition_trivia: {
    id: "story_transition_trivia",
    label: "Transición a Trivia",
    legacyPath: "/assets/audio/voice_lines/story_transition_trivia.mp3",
    enabled: false,
    moment: "before_trivia",
    recommendedDelayMs: 300
  },
  story_scoreboard: {
    id: "story_scoreboard",
    label: "Pantalla de puntuación",
    legacyPath: "/assets/audio/voice_lines/story_scoreboard.mp3",
    enabled: false,
    moment: "scoreboard",
    recommendedDelayMs: 500
  },
  story_final_winner: {
    id: "story_final_winner",
    label: "Ganador final",
    legacyPath: "/assets/audio/voice_lines/story_final_winner.mp3",
    enabled: false,
    moment: "story_finished",
    recommendedDelayMs: 800
  },

  // Story 1: Copa de las Casas Clásica
  copa_clasica_bienvenida: {
    id: "copa_clasica_bienvenida",
    label: "Bienvenida Gran Comedor",
    legacyPath: "/assets/audio/voice_lines/story_copa_clasica_bienvenida.mp3",
    enabled: false
  },
  copa_clasica_sombrero_intro: {
    id: "copa_clasica_sombrero_intro",
    label: "Intro Sombrero Burlón",
    legacyPath: "/assets/audio/voice_lines/story_copa_clasica_sombrero_intro.mp3",
    enabled: false
  },
  copa_clasica_pociones_intro: {
    id: "copa_clasica_pociones_intro",
    label: "Intro Pociones",
    legacyPath: "/assets/audio/voice_lines/story_copa_clasica_pociones_intro.mp3",
    enabled: false
  },
  copa_clasica_mapa_intro: {
    id: "copa_clasica_mapa_intro",
    label: "Intro Mapa Travieso",
    legacyPath: "/assets/audio/voice_lines/story_copa_clasica_mapa_intro.mp3",
    enabled: false
  },
  copa_clasica_retratos_intro: {
    id: "copa_clasica_retratos_intro",
    label: "Intro Retratos",
    legacyPath: "/assets/audio/voice_lines/story_copa_clasica_retratos_intro.mp3",
    enabled: false
  },
  copa_clasica_duelo_intro: {
    id: "copa_clasica_duelo_intro",
    label: "Intro Duelo",
    legacyPath: "/assets/audio/voice_lines/story_copa_clasica_duelo_intro.mp3",
    enabled: false
  },
  copa_clasica_final_intro: {
    id: "copa_clasica_final_intro",
    label: "Intro Copa Final",
    legacyPath: "/assets/audio/voice_lines/story_copa_clasica_final_intro.mp3",
    enabled: false
  },
  copa_clasica_cierre: {
    id: "copa_clasica_cierre",
    label: "Cierre Copa Clásica",
    legacyPath: "/assets/audio/voice_lines/story_copa_clasica_cierre.mp3",
    enabled: false
  },

  // Story 2: Noche en el Castillo
  noche_castillo_inicio: {
    id: "noche_castillo_inicio",
    label: "Inicio Noche Castillo",
    legacyPath: "/assets/audio/voice_lines/story_noche_castillo_inicio.mp3",
    enabled: false
  },
  noche_castillo_mapa: {
    id: "noche_castillo_mapa",
    label: "Mapa Noche",
    legacyPath: "/assets/audio/voice_lines/story_noche_castillo_mapa.mp3",
    enabled: false
  },
  noche_castillo_retratos: {
    id: "noche_castillo_retratos",
    label: "Retratos Noche",
    legacyPath: "/assets/audio/voice_lines/story_noche_castillo_retratos.mp3",
    enabled: false
  },
  noche_castillo_artes: {
    id: "noche_castillo_artes",
    label: "Artes Noche",
    legacyPath: "/assets/audio/voice_lines/story_noche_castillo_artes.mp3",
    enabled: false
  },
  noche_castillo_caldero: {
    id: "noche_castillo_caldero",
    label: "Caldero Noche",
    legacyPath: "/assets/audio/voice_lines/story_noche_castillo_caldero.mp3",
    enabled: false
  },
  noche_castillo_hechizo: {
    id: "noche_castillo_hechizo",
    label: "Hechizo Noche",
    legacyPath: "/assets/audio/voice_lines/story_noche_castillo_hechizo.mp3",
    enabled: false
  },
  noche_castillo_patronus: {
    id: "noche_castillo_patronus",
    label: "Patronus Noche",
    legacyPath: "/assets/audio/voice_lines/story_noche_castillo_patronus.mp3",
    enabled: false
  },
  noche_castillo_final: {
    id: "noche_castillo_final",
    label: "Final Noche",
    legacyPath: "/assets/audio/voice_lines/story_noche_castillo_final.mp3",
    enabled: false
  },
  noche_castillo_cierre: {
    id: "noche_castillo_cierre",
    label: "Cierre Noche",
    legacyPath: "/assets/audio/voice_lines/story_noche_castillo_cierre.mp3",
    enabled: false
  },

  // Story 3: Torneo Relámpago
  torneo_relampago_inicio: {
    id: "torneo_relampago_inicio",
    label: "Inicio Torneo Relámpago",
    legacyPath: "/assets/audio/voice_lines/story_torneo_relampago_inicio.mp3",
    enabled: false
  },
  torneo_relampago_trivia: {
    id: "torneo_relampago_trivia",
    label: "Trivia Relámpago",
    legacyPath: "/assets/audio/voice_lines/story_torneo_relampago_trivia.mp3",
    enabled: false
  },
  torneo_relampago_snitch: {
    id: "torneo_relampago_snitch",
    label: "Snitch Relámpago",
    legacyPath: "/assets/audio/voice_lines/story_torneo_relampago_snitch.mp3",
    enabled: false
  },
  torneo_relampago_artes: {
    id: "torneo_relampago_artes",
    label: "Artes Relámpago",
    legacyPath: "/assets/audio/voice_lines/story_torneo_relampago_artes.mp3",
    enabled: false
  },
  torneo_relampago_duelo: {
    id: "torneo_relampago_duelo",
    label: "Duelo Relámpago",
    legacyPath: "/assets/audio/voice_lines/story_torneo_relampago_duelo.mp3",
    enabled: false
  },
  torneo_relampago_final: {
    id: "torneo_relampago_final",
    label: "Final Relámpago",
    legacyPath: "/assets/audio/voice_lines/story_torneo_relampago_final.mp3",
    enabled: false
  },
  torneo_relampago_cierre: {
    id: "torneo_relampago_cierre",
    label: "Cierre Relámpago",
    legacyPath: "/assets/audio/voice_lines/story_torneo_relampago_cierre.mp3",
    enabled: false
  },

  // Game Instructions
  instructions_trivia_magica: {
    id: "instructions_trivia_magica",
    label: "Instrucciones Trivia Mágica",
    legacyPath: "/assets/audio/voice_lines/01_trivia_magica_hermione.mp3",
    enabled: true,
    moment: "before_game",
    recommendedDelayMs: 300
  },
  instructions_artes_ridiculas: {
    id: "instructions_artes_ridiculas",
    label: "Instrucciones Artes Ridículas",
    legacyPath: "/assets/audio/voice_lines/06_artes_ridiculas_ron.mp3",
    enabled: true,
    moment: "before_game",
    recommendedDelayMs: 300
  },
  instructions_atrapa_snitch: {
    id: "instructions_atrapa_snitch",
    label: "Instrucciones Atrapa la Snitch",
    legacyPath: "/assets/audio/voice_lines/02_atrapa_snitch_harry.mp3",
    enabled: true,
    moment: "before_game",
    recommendedDelayMs: 300
  },
  instructions_duelo_hechizos: {
    id: "instructions_duelo_hechizos",
    label: "Instrucciones Duelo de Hechizos",
    legacyPath: "/assets/audio/voice_lines/03_duelo_hechizos_snape.mp3",
    enabled: true,
    moment: "before_game",
    recommendedDelayMs: 300
  },
  instructions_sombrero_burlon: {
    id: "instructions_sombrero_burlon",
    label: "Instrucciones Sombrero Burlón",
    legacyPath: "/assets/audio/voice_lines/04_sombrero_burlon_sombrero.mp3",
    enabled: true,
    moment: "before_game",
    recommendedDelayMs: 300
  },
  instructions_clase_pociones: {
    id: "instructions_clase_pociones",
    label: "Instrucciones Clase de Pociones",
    legacyPath: "/assets/audio/voice_lines/05_clase_pociones_snape.mp3",
    enabled: true,
    moment: "before_game",
    recommendedDelayMs: 300
  },
  instructions_mapa_travieso: {
    id: "instructions_mapa_travieso",
    label: "Instrucciones Mapa Travieso",
    legacyPath: "/assets/audio/voice_lines/07_mapa_travieso_luna.mp3",
    enabled: true,
    moment: "before_game",
    recommendedDelayMs: 300
  },
  instructions_caldero_mentiroso: {
    id: "instructions_caldero_mentiroso",
    label: "Instrucciones Caldero Mentiroso",
    legacyPath: "/assets/audio/voice_lines/10_caldero_mentiroso_dobby.mp3",
    enabled: true,
    moment: "before_game",
    recommendedDelayMs: 300
  },
  instructions_retratos_chismosos: {
    id: "instructions_retratos_chismosos",
    label: "Instrucciones Retratos Chismosos",
    legacyPath: "/assets/audio/voice_lines/08_retratos_chismosos_hagrid.mp3",
    enabled: true,
    moment: "before_game",
    recommendedDelayMs: 300
  },
  instructions_hechizo_incompleto: {
    id: "instructions_hechizo_incompleto",
    label: "Instrucciones Hechizo Incompleto",
    legacyPath: "/assets/audio/voice_lines/09_hechizo_incompleto_mcgonagall.mp3",
    enabled: true,
    moment: "before_game",
    recommendedDelayMs: 300
  },
  instructions_patronus_personalizado: {
    id: "instructions_patronus_personalizado",
    label: "Instrucciones Patronus Personalizado",
    legacyPath: "/assets/audio/voice_lines/11_patronus_personalizado_luna.mp3",
    enabled: true,
    moment: "before_game",
    recommendedDelayMs: 300
  },
  instructions_copa_final: {
    id: "instructions_copa_final",
    label: "Instrucciones Copa Final",
    legacyPath: "/assets/audio/voice_lines/12_copa_final_dumbledore.mp3",
    enabled: true,
    moment: "before_final",
    recommendedDelayMs: 300
  },
  cierre_ganador: {
    id: "cierre_ganador",
    label: "Cierre Ganador",
    legacyPath: "/assets/audio/voice_lines/13_cierre_ganador_sombrero.mp3",
    enabled: true,
    moment: "story_complete",
    recommendedDelayMs: 900
  }
};
