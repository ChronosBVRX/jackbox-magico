import { GameId } from '../games/base';
export { GameId };

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
    status: 'beta',
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
    enabled: true
  },
  {
    id: 'hechizo_incompleto',
    name: 'Hechizo Incompleto',
    shortName: 'Hechizo',
    status: 'beta',
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
    enabled: true
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
    status: 'beta',
    mode: 'social',
    description: 'Conjura un Patronus único respondiendo a situaciones mágicas y vota por el mejor.',
    rules: [
      'Responde creativamente al tema propuesto.',
      'Vota por el Patronus más original o divertido de tus compañeros.',
      'No puedes votar por ti mismo.'
    ],
    points: { min: 0, max: 200, description: 'Votos recibidos + bonus ganador' },
    durationSeconds: 90,
    maxPlayers: 8,
    maxPerHouse: 2,
    enabled: true
  },
  {
    id: 'copa_final',
    name: 'Copa Final',
    shortName: 'Final',
    status: 'beta',
    mode: 'quiz',
    description: 'La gran pregunta final donde apuestas tus puntos para ganar la Copa de las Casas.',
    rules: [
      'Apuesta una cantidad de tus puntos actuales.',
      'Responde la pregunta experta final.',
      'Si aciertas sumas la apuesta, si fallas la pierdes.'
    ],
    points: { min: -300, max: 500, description: 'Resultado de apuesta' },
    durationSeconds: 60,
    maxPlayers: 8,
    maxPerHouse: 2,
    enabled: true
  },
  {
    id: 'el_impostor',
    name: 'El Impostor de Hogwarts',
    shortName: 'Impostor',
    status: 'beta',
    mode: 'social',
    description: 'Deducción y engaño. Todos conocen el lugar secreto en Hogwarts excepto el espía mortífago.',
    rules: [
      'La TV asigna un lugar secreto a todos, menos al Espía.',
      'Hagan preguntas sutiles para descubrir quién no sabe dónde están.',
      'Voten por quién creen que es el impostor al final del tiempo.'
    ],
    points: { min: 0, max: 300, description: '150 por descubrir al espía, 300 al espía si sobrevive o adivina el lugar' },
    durationSeconds: 180,
    maxPlayers: 8,
    maxPerHouse: 2,
    enabled: true
  },
  {
    id: 'el_tiburon',
    name: 'El Tiburón de los Negocios Mágicos',
    shortName: 'Tiburón',
    status: 'beta',
    mode: 'social',
    description: 'Gartic Phone Modo Complemento. Dibuja criaturas extrañas y productos defectuosos en equipo sin saber qué era originalmente.',
    rules: [
      'Dibuja la parte superior de un concepto extraño.',
      'Pasa el lienzo a otro jugador que solo verá las líneas finales y completará la parte inferior.',
      'Presenta las creaciones en el Tanque de Tiburones y voten con sus Galeones.'
    ],
    points: { min: 0, max: 500, description: '300 a los autores ganadores + retornos de inversión en Galeones' },
    durationSeconds: 120,
    maxPlayers: 8,
    maxPerHouse: 2,
    enabled: true
  },
  {
    id: 'dictado_magico',
    name: 'Dictado Mágico',
    shortName: 'Dictado',
    status: 'premium',
    mode: 'social',
    description: 'Contrarreloj auditivo. Escucha un fragmento clasificado del mundo mágico y transcríbelo en tu celular bajo intensa presión.',
    rules: [
      'Escucha con atención la anécdota loca reproducida en la TV.',
      'Transcribe exactamente lo que escuches antes de que se agote el tiempo.',
      'Gana puntos por precisión de parentesco o por el voto del Host si tu respuesta fue hilarante.'
    ],
    points: { min: 0, max: 1300, description: 'Hasta 1000 puntos por precisión (Sørensen-Dice) + 300 de bono por respuesta hilarante' },
    durationSeconds: 60,
    maxPlayers: 8,
    maxPerHouse: 2,
    enabled: true
  }
];
