import { SombreroPrompt } from './types';

export const SOMBRERO_PROMPTS_BANK: Record<string, string[]> = {
  familiar: [
    "¿Quién usaría magia para no levantarse por el control remoto?",
    "¿Quién llegaría tarde al Expreso de Hogwarts aunque viva enfrente?",
    "¿Quién perdería su varita y culparía a un elfo doméstico?",
    "¿Quién intentaría hacer una poción siguiendo un tutorial de TikTok?",
    "¿Quién se dormiría en clase de Historia de la Magia y despertaría aplaudiendo?"
  ],
  chisme: [
    "¿Quién sería el primero en decir “yo no fui” antes de que pase algo?",
    "¿Quién escucharía un secreto y lo llamaría información de interés público?",
    "¿Quién sería retrato chismoso en un pasillo de Hogwarts?",
    "¿Quién sabría todos los rumores pero juraría que no se mete en nada?"
  ],
  caos: [
    "¿Quién lanzaría un hechizo sin saber pronunciarlo?",
    "¿Quién abriría una puerta prohibida solo porque decía “no abrir”?",
    "¿Quién mezclaría pociones para ver “qué pasa”?",
    "¿Quién invocaría algo peligroso y diría “qué bonito perrito”?"
  ],
  sospechoso: [
    "¿Quién tendría más cara de esconder un ingrediente explosivo?",
    "¿Quién sonreiría demasiado antes de traicionar a su casa?",
    "¿Quién sería interrogado por el Ministerio solo por su actitud?",
    "¿Quién tiene vibra de villano, pero de bajo presupuesto?"
  ],
  dramatico: [
    "¿Quién actuaría como si perder 10 puntos fuera tragedia nacional?",
    "¿Quién haría una entrada dramática aunque solo va al baño?",
    "¿Quién narraría su propia derrota como película épica?",
    "¿Quién se ofendería porque el Sombrero dijo la verdad?"
  ]
};

export const SOMBRERO_LINES = [
  "El sombrero ha hablado, y como siempre, sin tantita prudencia.",
  "Qué sorpresa… bueno, no tanta. El sombrero ya lo veía venir.",
  "La democracia mágica acaba de humillar a alguien con mucho cariño.",
  "El veredicto es cruel, innecesario y absolutamente divertido.",
  "El sombrero no juzga… bueno sí, pero con estilo."
];
