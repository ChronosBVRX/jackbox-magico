import { PatronusPrompt } from './types';

export const PATRONUS_PROMPTS: PatronusPrompt[] = [
  // Familiares
  {
    id: 'p1',
    text: "Tu Patronus aparece, pero viene raro. ¿Qué forma tiene?",
    tone: 'gracioso',
    category: 'familiar'
  },
  {
    id: 'p2',
    text: "Si tu capa invisible tuviera un defecto gracioso, ¿cuál sería?",
    tone: 'raro',
    category: 'familiar'
  },
  {
    id: 'p3',
    text: "¿Qué forma tendría el Patronus de un mago que le tiene miedo a la oscuridad?",
    tone: 'tierno',
    category: 'familiar'
  },
  {
    id: 'p4',
    text: "Un hechizo inventado para que tu hermano menor deje de molestarte.",
    tone: 'gracioso',
    category: 'familiar'
  },
  {
    id: 'p5',
    text: "¿Qué criatura mágica te comería primero el almuerzo en la escuela?",
    tone: 'absurdo',
    category: 'familiar'
  },
  // Adultos
  {
    id: 'p6',
    text: "¿Qué diría un dementor después de revisar tu cuenta bancaria a fin de mes?",
    tone: 'absurdo',
    category: 'adultos'
  },
  {
    id: 'p7',
    text: "¿Qué forma tendría el Patronus de un mago que tiene resaca un domingo?",
    tone: 'gracioso',
    category: 'adultos'
  },
  {
    id: 'p8',
    text: "Si Voldemort tuviera un grupo de WhatsApp familiar, ¿cómo se llamaría?",
    tone: 'dramatico',
    category: 'adultos'
  },
  {
    id: 'p9',
    text: "¿Qué objeto mágico usarías para ignorar los mensajes de tu ex?",
    tone: 'raro',
    category: 'adultos'
  },
  {
    id: 'p10',
    text: "El peor regalo mágico que podrías recibir en un intercambio de oficina.",
    tone: 'absurdo',
    category: 'adultos'
  }
];

export const NARRATOR_LINES = [
  "Tu Patronus ha aparecido… y necesita terapia.",
  "Un dementor acaba de arrepentirse de haber venido.",
  "Expecto Patronum… versión presupuesto limitado, dignidad opcional.",
  "La luz del Patronus revela... cosas que preferiría no haber visto."
];
