import { GameId } from '../games/base';

export interface GameInfo {
  id: GameId;
  name: string;
  shortName: string;
  status: 'beta' | 'ready' | 'stable' | 'dev';
  mode: 'quiz' | 'action' | 'strategy' | 'social' | 'memory';
  description: string;
  rules: string[];
  points: {
    min: number;
    max: number;
    description: string;
  };
  durationSeconds?: number;
  maxPlayers: number;
  maxPerHouse: number;
  enabled: boolean;
}

export const GAME_CATALOG: GameInfo[] = [
  {
    id: 'trivia_magica',
    name: 'Trivia del Mundo Mágico',
    shortName: 'Trivia',
    status: 'stable',
    mode: 'quiz',
    description: 'Demuestra tus conocimientos sobre el mundo mágico en este quiz clásico.',
    rules: [
      'Responde correctamente antes de que acabe el tiempo.',
      'Entre más rápido respondas, más puntos ganas.',
      'Mantén una racha de aciertos para obtener bonos de casa.'
    ],
    points: { min: 0, max: 200, description: '50-100 por acierto + bonos de rapidez y racha' },
    durationSeconds: 20,
    maxPlayers: 8,
    maxPerHouse: 2,
    enabled: true
  },
  {
    id: 'artes_ridiculas',
    name: 'Defensa Contra las Artes Ridículas',
    shortName: 'Artes Ridículas',
    status: 'beta',
    mode: 'quiz',
    description: 'Enfrenta amenazas absurdas del mundo cotidiano con soluciones creativas.',
    rules: [
      'Elige la defensa más adecuada para la situación.',
      'Si fallas, la opción más graciosa también da puntos.',
      'Son 3 subrondas de intensidad creciente.'
    ],
    points: { min: -20, max: 210, description: '100 por acierto + rapidez + racha. 20 por graciosa.' },
    durationSeconds: 15,
    maxPlayers: 8,
    maxPerHouse: 2,
    enabled: true
  },
  {
    id: 'atrapa_snitch',
    name: 'Atrapa la Snitch',
    shortName: 'Snitch',
    status: 'beta',
    mode: 'action',
    description: 'Reflejos puros. Captura la Snitch cuando entre en tu aro de visión.',
    rules: [
      'Presiona el botón justo cuando la Snitch esté dentro del aro.',
      'Tienes intentos limitados por ronda.',
      'La precisión determina el grado de captura (Legendaria, Perfecta, etc).'
    ],
    points: { min: -20, max: 180, description: 'Puntos según precisión + bonus al mejor buscador' },
    durationSeconds: 25,
    maxPlayers: 8,
    maxPerHouse: 2,
    enabled: true
  },
  {
    id: 'duelo_hechizos',
    name: 'Duelo de Hechizos',
    shortName: 'Duelo',
    status: 'beta',
    mode: 'strategy',
    description: 'Enfréntate en un duelo de varitas usando la tabla de ventajas mágicas.',
    rules: [
      'Elige un hechizo para vencer al de tu oponente.',
      'Si ambos eligen lo mismo, se activa un Choque de Varitas.',
      'En el choque, presiona repetidamente tu varita para ganar.'
    ],
    points: { min: -30, max: 260, description: 'Victoria de duelo + rapidez + choque' },
    durationSeconds: 7,
    maxPlayers: 8,
    maxPerHouse: 2,
    enabled: true
  },
  {
    id: 'sombrero_burlon',
    name: 'El Sombrero Burlón',
    shortName: 'Sombrero',
    status: 'beta',
    mode: 'social',
    description: 'Votación social. ¿Quién encaja mejor con la descripción del sombrero?',
    rules: [
      'El sombrero dirá una frase sobre alguien del grupo.',
      'Vota por el compañero que mejor encaje.',
      'Ganas puntos por cada voto que recibas.'
    ],
    points: { min: 0, max: 400, description: '50 puntos por voto recibido + bonus al más votado' },
    durationSeconds: 15,
    maxPlayers: 8,
    maxPerHouse: 2,
    enabled: true
  },
  {
    id: 'clase_pociones',
    name: 'Clase de Pociones',
    shortName: 'Pociones',
    status: 'beta',
    mode: 'memory',
    description: 'Memoria colectiva. Repite la secuencia de ingredientes en tu caldero.',
    rules: [
      'Mira la TV y memoriza el orden de los ingredientes.',
      'Repite la secuencia en tu móvil.',
      '¡Cuidado con el modo Inverso!'
    ],
    points: { min: 0, max: 250, description: 'Puntos por ingrediente correcto + bonus por poción perfecta' },
    durationSeconds: 20,
    maxPlayers: 8,
    maxPerHouse: 2,
    enabled: true
  },
  {
    id: 'mapa_travieso',
    name: 'El Mapa Travieso',
    shortName: 'Mapa',
    status: 'beta',
    mode: 'quiz',
    description: 'Observa el mapa y recuerda la ubicación de los objetos ocultos.',
    rules: [
      'Memoriza dónde están los personajes en el mapa.',
      'Responde su ubicación exacta cuando se oculten.',
      'Evita a Filch y las escaleras móviles.'
    ],
    points: { min: 0, max: 150, description: 'Acierto + rapidez' },
    durationSeconds: 15,
    maxPlayers: 8,
    maxPerHouse: 2,
    enabled: true
  },
  {
    id: 'retratos_chismosos',
    name: 'Retratos Chismosos',
    shortName: 'Retratos',
    status: 'dev',
    mode: 'quiz',
    description: 'Escucha los rumores de los retratos y adivina de quién están hablando.',
    rules: [
      'Lee las pistas que da el retrato.',
      'Identifica al personaje o lugar antes que los demás.',
      'El tono es sarcástico y lleno de chismes.'
    ],
    points: { min: 0, max: 100, description: 'Acierto + rapidez' },
    durationSeconds: 20,
    maxPlayers: 8,
    maxPerHouse: 2,
    enabled: false
  },
  {
    id: 'hechizo_incompleto',
    name: 'Hechizo Incompleto',
    shortName: 'Hechizo',
    status: 'dev',
    mode: 'quiz',
    description: 'Completa los encantamientos antiguos que han perdido algunas palabras.',
    rules: [
      'Lee el hechizo con espacios en blanco.',
      'Elige la palabra u opción correcta para completarlo.',
      'Rapidez es clave.'
    ],
    points: { min: 0, max: 100, description: 'Acierto + rapidez' },
    durationSeconds: 15,
    maxPlayers: 8,
    maxPerHouse: 2,
    enabled: false
  },
  {
    id: 'caldero_mentiroso',
    name: 'El Caldero Mentiroso',
    shortName: 'Caldero',
    status: 'beta',
    mode: 'strategy',
    description: 'Sabotaje y engaño. Mantén la poción estable o hazla explotar en secreto.',
    rules: [
      'Recibes un ingrediente secreto (Bueno, Malo o Explosivo).',
      'Elige si meterlo al caldero, descartarlo o acusar a alguien.',
      'La estabilidad final decide quién gana puntos.'
    ],
    points: { min: -50, max: 300, description: 'Supervivencia + sabotaje + acusaciones correctas' },
    durationSeconds: 60,
    maxPlayers: 8,
    maxPerHouse: 2,
    enabled: true
  },
  {
    id: 'patronus_personalizado',
    name: 'Patronus Personalizado',
    shortName: 'Patronus',
    status: 'dev',
    mode: 'social',
    description: 'Propón formas de Patronus para tus amigos y voten por la mejor.',
    rules: [
      'Escribe una propuesta creativa de Patronus para el tema dado.',
      'Vota por la propuesta más original de tus compañeros.',
      'Gana por ser el más votado.'
    ],
    points: { min: 0, max: 150, description: 'Votos recibidos + bonus ganador' },
    durationSeconds: 45,
    maxPlayers: 8,
    maxPerHouse: 2,
    enabled: false
  },
  {
    id: 'copa_final',
    name: 'Copa Final',
    shortName: 'Copa',
    status: 'dev',
    mode: 'quiz',
    description: 'Apuesta tus puntos acumulados en una última pregunta decisiva.',
    rules: [
      'Apuesta una parte de tus puntos actuales.',
      'Responde la pregunta final de alta dificultad.',
      'Si aciertas sumas tu apuesta, si fallas la pierdes.'
    ],
    points: { min: -500, max: 1000, description: 'Según apuesta' },
    durationSeconds: 30,
    maxPlayers: 8,
    maxPerHouse: 2,
    enabled: false
  }
];
