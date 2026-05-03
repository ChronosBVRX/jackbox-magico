export type GameStatus = "planned" | "implemented" | "beta";

export type GameDefinition = {
  id: string;
  name: string;
  shortName: string;
  status: GameStatus;
  featured: boolean;
  mode: string;
  description: string;
  rules: string[];
  durationSeconds: number;
  recommendedRounds: number;
};

export const gameCatalog: Record<string, GameDefinition> = {
  trivia_magica: {
    id: "trivia_magica",
    name: "Trivia del Mundo Mágico",
    shortName: "Trivia Mágica",
    status: "implemented",
    featured: true,
    mode: "quiz_main",
    description: "Modo principal de la Copa de las Casas con preguntas de películas, hechizos, personajes, criaturas, objetos mágicos, profesores, villanos, frases en español latino y escenas icónicas.",
    rules: [
      "Cada jugador responde desde su celular con A, B, C o D.",
      "La pantalla principal muestra pregunta, categoría, dificultad y temporizador.",
      "Cada pregunta dura 20 segundos.",
      "La puntuación depende de la dificultad.",
      "La respuesta correcta más rápida recibe bonus.",
      "Cada racha de 3 respuestas correctas recibe bonus."
    ],
    durationSeconds: 20,
    recommendedRounds: 25
  },
  atrapa_snitch: {
    id: "atrapa_snitch",
    name: "Atrapa la Snitch",
    shortName: "Snitch",
    status: "planned",
    featured: true,
    mode: "precision_reaction",
    description: "Minijuego de precisión y reflejos. La Snitch se mueve por la pantalla y los jugadores deben tocar en el celular justo cuando entra al aro encantado.",
    rules: [],
    durationSeconds: 15,
    recommendedRounds: 1
  },
  duelo_hechizos: {
    id: "duelo_hechizos",
    name: "Duelo de Hechizos",
    shortName: "Duelo",
    status: "planned",
    featured: true,
    mode: "duel",
    description: "Dos jugadores se enfrentan eligiendo hechizos. Algunas combinaciones ganan, otras pierden y los empates pueden activar choque de varitas.",
    rules: [],
    durationSeconds: 30,
    recommendedRounds: 1
  },
  sombrero_burlon: {
    id: "sombrero_burlon",
    name: "Sombrero Burlón",
    shortName: "Sombrero",
    status: "planned",
    featured: true,
    mode: "social_vote",
    description: "Mini ronda social de 3 preguntas incómodas, graciosas o sospechosas. El Sombrero pone a prueba la reputación de cada jugador y casa.",
    rules: [],
    durationSeconds: 45,
    recommendedRounds: 1
  },
  clase_pociones: {
    id: "clase_pociones",
    name: "Clase de Pociones",
    shortName: "Pociones",
    status: "planned",
    featured: true,
    mode: "memory_recipe",
    description: "Minijuego de memoria y presión. La TV muestra una receta mágica y los jugadores deben reproducirla.",
    rules: [],
    durationSeconds: 40,
    recommendedRounds: 1
  },
  artes_ridiculas: {
    id: "artes_ridiculas",
    name: "Defensa Contra las Artes Ridículas",
    shortName: "Artes Ridículas",
    status: "planned",
    featured: true,
    mode: "quiz_humor",
    description: "Mini clase de 3 amenazas absurdas. Elige la defensa más sensata (o ridícula) contra los problemas de la vida mágica moderna.",
    rules: [],
    durationSeconds: 18,
    recommendedRounds: 1
  },
  caldero_mentiroso: {
    id: "caldero_mentiroso",
    name: "El Caldero Mentiroso",
    shortName: "Caldero",
    status: "planned",
    featured: true,
    mode: "social_bluff_strategy",
    description: "Juego social de engaño y estrategia. Cada jugador recibe un ingrediente secreto y decide si meterlo al caldero, descartarlo o acusar a otro jugador.",
    rules: [],
    durationSeconds: 70,
    recommendedRounds: 1
  }
};
