import { IncompleteSpell } from './types';

export const SPELL_BANK: IncompleteSpell[] = [
  {
    id: 'wingardium',
    category: 'hechizo',
    difficulty: 'facil',
    incompleteText: "Wingardium Levi___",
    context: "Pista: Hace flotar objetos (como plumas)",
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
    context: "Pista: Invoca un guardián de luz contra dementores",
    options: ["num", "nam", "nus", "nium"],
    correctAnswer: "num",
    completedText: "Expecto Patronum",
    explanation: "Correcto. Con eso espantas dementores y, con suerte, pensamientos de lunes."
  },
  {
    id: 'alohomora',
    category: 'hechizo',
    difficulty: 'facil',
    incompleteText: "Aloho___",
    context: "Pista: Abre cerraduras y puertas misteriosas",
    options: ["mora", "mara", "muro", "miro"],
    correctAnswer: "mora",
    completedText: "Alohomora",
    explanation: "El encanto de los ladrones y los estudiantes curiosos en el tercer piso."
  },
  {
    id: 'lumos',
    category: 'hechizo',
    difficulty: 'facil',
    incompleteText: "Lu___",
    context: "Pista: Enciende una luz mágica en la punta de la varita",
    options: ["mos", "mas", "mis", "mus"],
    correctAnswer: "mos",
    completedText: "Lumos",
    explanation: "La linterna mágica por excelencia para leer bajo las sábanas."
  },
  {
    id: 'expelliarmus',
    category: 'hechizo',
    difficulty: 'media',
    incompleteText: "Expelli___",
    context: "Pista: El hechizo favorito de Harry para desarmar",
    options: ["armus", "ormus", "ermis", "armos"],
    correctAnswer: "armus",
    completedText: "Expelliarmus",
    explanation: "Un clásico para quitarle la varita al oponente sin hacerle daño."
  },
  {
    id: 'reparo',
    category: 'hechizo',
    difficulty: 'facil',
    incompleteText: "Oculus Re___",
    context: "Pista: Repara los anteojos de Harry en el tren",
    options: ["paro", "pero", "piro", "puro"],
    correctAnswer: "paro",
    completedText: "Oculus Reparo",
    explanation: "Hermione arreglando la vista de Harry desde el primer día."
  },
  {
    id: 'managed',
    category: 'frase',
    difficulty: 'media',
    incompleteText: "Travesura ___",
    context: "Pista: Palabras mágicas para borrar el Mapa Travieso",
    options: ["realizada", "terminada", "completada", "hecha"],
    correctAnswer: "realizada",
    completedText: "Travesura realizada",
    explanation: "Bien. Travesura realizada, evidencia desaparecida y Filch confundido."
  }
];

export const NARRATOR_LINES = [
  "Pronuncien bien, por favor.",
  "La varita escucha. El problema es que ustedes a veces no.",
  "Siete segundos. Ni Hermione revisaba tan rápido.",
  "Eso no fue latín mágico, eso fue invento de borracho."
];
