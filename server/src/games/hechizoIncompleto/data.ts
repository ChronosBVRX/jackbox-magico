import { IncompleteSpell } from './types';

export const SPELL_BANK: IncompleteSpell[] = [
  {
    id: 'wingardium',
    category: 'hechizo',
    difficulty: 'facil',
    incompleteText: "Wingardium Levi___",
    context: "Encantamiento de levitación",
    options: ["osa", "oso", "uza", "isa"],
    correctAnswer: "osa",
    completedText: "Wingardium Leviosa",
    explanation: "Pronuncien bien, por favor. Una vocal mal puesta y alguien termina con una pluma en la nariz."
  },
  {
    id: 'patronum',
    category: 'hechizo',
    difficulty: 'media',
    incompleteText: "Expecto Patro___",
    context: "Defensa contra dementores",
    options: ["num", "nam", "nus", "nium"],
    correctAnswer: "num",
    completedText: "Expecto Patronum",
    explanation: "Correcto. Con eso espantas dementores y, con suerte, pensamientos de lunes."
  },
  {
    id: 'managed',
    category: 'frase',
    difficulty: 'media',
    incompleteText: "Travesura ___",
    context: "Para cerrar el Mapa del Merodeador",
    options: ["realizada", "terminada", "completada", "cancelada"],
    correctAnswer: "realizada",
    completedText: "Travesura realizada",
    explanation: "Bien. Travesura realizada, evidencia desaparecida y Filch confundido."
  },
  {
    id: 'sectumsempra',
    category: 'hechizo',
    difficulty: 'experto',
    incompleteText: "Sectum___",
    context: "Hechizo de ataque avanzado",
    options: ["sempra", "sempro", "sombra", "sempre"],
    correctAnswer: "sempra",
    completedText: "Sectumsempra",
    explanation: "Cuidado con ese hechizo. Si lo pronuncias mal, no es latín mágico: es invento de borracho."
  }
];

export const NARRATOR_LINES = [
  "Pronuncien bien, por favor.",
  "La varita escucha. El problema es que ustedes a veces no.",
  "Siete segundos. Ni Hermione revisaba tan rápido.",
  "Eso no fue latín mágico, eso fue invento de borracho."
];
