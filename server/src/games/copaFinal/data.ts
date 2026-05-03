import { FinalQuestion } from './types';

export const FINAL_POOL: FinalQuestion[] = [
  {
    id: 'f1',
    category: 'sabiduria',
    difficulty: 'experto',
    question: "¿Qué objeto destruye Harry con el colmillo del basilisco dentro de la Cámara Secreta?",
    options: ["El diario de Tom Riddle", "El guardapelo de Slytherin", "La copa de Hufflepuff", "La diadema de Ravenclaw"],
    correctAnswer: "El diario de Tom Riddle",
    explanation: "En la Cámara Secreta, Harry usa el colmillo del basilisco para destruir el diario de Tom Riddle."
  },
  {
    id: 'f2',
    category: 'escena',
    difficulty: 'experto',
    question: "En la primera película, ¿qué pieza de ajedrez mágico queda asociada al sacrificio de Ron?",
    options: ["El caballo", "La reina", "La torre", "El alfil"],
    correctAnswer: "El caballo",
    explanation: "Ron juega como caballo y se sacrifica para que Harry pueda continuar."
  }
];

export const NARRATOR_OPENING = [
  "Llegamos al momento donde se separan los magos valientes de los que solo vinieron por papas.",
  "Una sola pregunta puede cambiar la historia de la Copa.",
  "¿Apostarán con inteligencia o con la confianza absurda de un Gryffindor?"
];
