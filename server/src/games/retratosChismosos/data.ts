import { PortraitClue } from './types';

export const PORTRAIT_BANK: PortraitClue[] = [
  {
    id: 'hagrid',
    portraitName: 'El Retrato del Guardabosque',
    portraitMood: 'chismoso',
    category: 'Personaje',
    clue: 'Yo no debería decir esto, pero lo vi todo desde mi marco: siempre parecía llegar tarde, sucio y con una criatura rara en la bolsa.',
    pistas: [
      "Yo no debería decir esto, pero lo vi todo desde mi marco: siempre parecía llegar tarde, sucio y con una criatura rara en la bolsa.",
      "Tenía más confianza con los animales peligrosos que con cualquier adulto responsable del castillo.",
      "Si algo rugía, babeaba o podía comerse a un estudiante, él decía: ‘no muerde… mucho’."
    ],
    question: '¿De quién está chismeando el retrato?',
    options: ["Hagrid", "Filch", "Lockhart", "Neville"],
    correctAnswer: "Hagrid",
    explanation: "Era Hagrid. Más tierno que peligroso… aunque sus mascotas opinaban lo contrario."
  },
  {
    id: 'snape',
    portraitName: 'El Retrato del Sótano',
    portraitMood: 'ofendido',
    category: 'Profesor',
    clue: 'Ese profesor entraba al salón y hasta las velas bajaban la flama por respeto… o por miedo, una de dos.',
    pistas: [
      "Ese profesor entraba al salón y hasta las velas bajaban la flama por respeto… o por miedo, una de dos.",
      "Tenía más sarcasmo que paciencia y más secretos que ingredientes en su almacén.",
      "Si te miraba feo, sentías que acababas de reprobar una materia que ni cursabas."
    ],
    question: '¿A qué profesor se refiere?',
    options: ["Snape", "Dumbledore", "Lupin", "Flitwick"],
    correctAnswer: "Snape",
    explanation: "Era Snape. El único capaz de convertir una pausa incómoda en calificación reprobatoria."
  },
  {
    id: 'sala_menesteres',
    portraitName: 'El Retrato del Séptimo Piso',
    portraitMood: 'misterioso',
    category: 'Lugar',
    clue: 'Ese sitio tiene más secretos que grupo familiar de WhatsApp silenciado.',
    pistas: [
      "Ese sitio tiene más secretos que grupo familiar de WhatsApp silenciado.",
      "Aparece cuando alguien necesita algo… o cuando el guion necesita salvar a todos.",
      "No siempre está donde lo buscas, pero cuando aparece, trae lo que necesitas."
    ],
    question: '¿Qué lugar está describiendo?',
    options: ["Sala de los Menesteres", "Cámara Secreta", "Aula de Pociones", "Bosque Prohibido"],
    correctAnswer: "Sala de los Menesteres",
    explanation: "Era la Sala de los Menesteres. El coworking mágico más conveniente del castillo."
  }
];

export const NARRATOR_LINES = [
  "Yo no debería decir esto, pero lo vi todo desde mi marco.",
  "Tengo siglos colgado aquí; claro que sé cosas.",
  "No es chisme si lo dice un retrato con marco dorado."
];
