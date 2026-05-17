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
    clue: 'Se viste como villano y se ofende cuando le dicen sospechoso. Entraba al salón y hasta las velas bajaban la flama por miedo.',
    pistas: [
      "Se viste como villano y se ofende cuando le dicen sospechoso. Entraba al salón y hasta las velas bajaban la flama por miedo.",
      "Tenía más sarcasmo que paciencia y más secretos que ingredientes en su almacén.",
      "Si te miraba feo, sentías que acababas de reprobar una materia que ni cursabas."
    ],
    question: '¿A qué profesor se refiere?',
    options: ["Snape", "Dumbledore", "Lupin", "Flitwick"],
    correctAnswer: "Snape",
    explanation: "Era Snape. El único capaz de convertir una pausa incómoda en calificación reprobatoria."
  },
  {
    id: 'harry',
    portraitName: 'El Retrato de la Escalera',
    portraitMood: 'dramatico',
    category: 'Personaje',
    clue: 'Este personaje tiene más traumas que sentido común. Su mejor habilidad es tomar malas decisiones y depender de sus amigos.',
    pistas: [
      "Este personaje tiene más traumas que sentido común. Su mejor habilidad es tomar malas decisiones y depender de sus amigos.",
      "Siempre se metía en problemas mortales y terminaba ganando puntos para su casa por pura suerte.",
      "Llevaba una marca en la frente y unos lentes redondos rotos la mitad del tiempo."
    ],
    question: '¿De quién está chismeando el retrato?',
    options: ["Harry Potter", "Ron Weasley", "Draco Malfoy", "Neville Longbottom"],
    correctAnswer: "Harry Potter",
    explanation: "Era Harry Potter. El elegido para tener la peor suerte del mundo mágico."
  },
  {
    id: 'ron',
    portraitName: 'El Retrato del Gran Comedor',
    portraitMood: 'burlon',
    category: 'Personaje',
    clue: 'Siempre hablaba con la boca llena, rompía su varita y se ofendía cuando le decían que su rata olía raro.',
    pistas: [
      "Siempre hablaba con la boca llena, rompía su varita y se ofendía cuando le decían que su rata olía raro.",
      "Su estrategia para todo era gritar, ponerse rojo y esperar que Hermione tuviera la respuesta.",
      "Su prenda favorita era un suéter tejido color granate con una letra gigante en el pecho."
    ],
    question: '¿De quién está chismeando el retrato?',
    options: ["Ron Weasley", "Harry Potter", "Seamus Finnigan", "Dean Thomas"],
    correctAnswer: "Ron Weasley",
    explanation: "Era Ron Weasley. El rey del drama adolescente y los suéteres que pican."
  },
  {
    id: 'voldemort',
    portraitName: 'El Retrato Oscuro',
    portraitMood: 'misterioso',
    category: 'Villano',
    clue: 'Hizo un berrinche histórico de varias décadas porque no pudo ganarle a un bebé en cuna.',
    pistas: [
      "Hizo un berrinche histórico de varias décadas porque no pudo ganarle a un bebé en cuna.",
      "Dividió su alma en tantos pedazos que terminó pareciendo reptil sin nariz ni amigos reales.",
      "Le daba tanto miedo a la gente que preferían decirle ‘El innombrable’ para no invocarlo."
    ],
    question: '¿A qué villano se refiere?',
    options: ["Voldemort", "Grindelwald", "Lucius Malfoy", "Barty Crouch Jr."],
    correctAnswer: "Voldemort",
    explanation: "Era Voldemort. El mago oscuro con peor manejo de la frustración en la historia."
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
  },
  {
    id: 'torneo_trizmago',
    portraitName: 'El Retrato del Trofeo',
    portraitMood: 'dramatico',
    category: 'Momento Icónico',
    clue: 'Un evento escolar donde la idea de diversión era enfrentar adolescentes contra dragones y laberintos mortales.',
    pistas: [
      "Un evento escolar donde la idea de diversión era enfrentar adolescentes contra dragones y laberintos mortales.",
      "Asistieron escuelas extranjeras con entradas dramáticas y bailes bastante incómodos.",
      "Todo terminó en tragedia, un trofeo traslador y el regreso del villano sin nariz."
    ],
    question: '¿De qué evento se trata?',
    options: ["Torneo de los Tres Magos", "Copa Mundial de Quidditch", "Baile de Navidad", "Batalla de Hogwarts"],
    correctAnswer: "Torneo de los Tres Magos",
    explanation: "Era el Torneo de los Tres Magos. Las peores normas de seguridad escolar jamás vistas."
  }
];

export const NARRATOR_LINES = [
  "Yo no debería decir esto, pero lo vi todo desde mi marco.",
  "Tengo siglos colgado aquí; claro que sé cosas.",
  "No es chisme si lo dice un retrato con marco dorado."
];
