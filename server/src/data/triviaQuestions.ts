export type TriviaQuestion = {
  id: string;
  category: string;
  difficulty: "facil" | "media" | "dificil" | "experto";
  question: string;
  options: string[];
  correctAnswer: string;
  narratorComment: string;
};

export const triviaQuestions: TriviaQuestion[] = [
  // HECHIZOS
  {
    id: "hechizos_facil_001",
    category: "hechizos",
    difficulty: "facil",
    question: "¿Qué hechizo se usa para encender la punta de la varita?",
    options: ["Lumos", "Accio", "Alohomora", "Expelliarmus"],
    correctAnswer: "Lumos",
    narratorComment: "Básico, útil y perfecto para no tropezar como muggle."
  },
  {
    id: "hechizos_facil_002",
    category: "hechizos",
    difficulty: "facil",
    question: "¿Qué hechizo se usa para desarmar al oponente?",
    options: ["Expelliarmus", "Lumos", "Riddikulus", "Obliviate"],
    correctAnswer: "Expelliarmus",
    narratorComment: "El clásico de Harry. Simple, efectivo y muy dramático."
  },
  {
    id: "hechizos_facil_003",
    category: "hechizos",
    difficulty: "facil",
    question: "¿Qué hechizo abre cerraduras?",
    options: ["Alohomora", "Expecto Patronum", "Accio", "Protego"],
    correctAnswer: "Alohomora",
    narratorComment: "Ideal para puertas, no para evadir responsabilidades."
  },
  {
    id: "hechizos_media_001",
    category: "hechizos",
    difficulty: "media",
    question: "¿Qué hechizo se usa contra un boggart?",
    options: ["Riddikulus", "Sectumsempra", "Petrificus Totalus", "Incendio"],
    correctAnswer: "Riddikulus",
    narratorComment: "La defensa más poderosa: volver ridículo lo que te asusta."
  },
  {
    id: "hechizos_media_002",
    category: "hechizos",
    difficulty: "media",
    question: "¿Qué hechizo invoca un Patronus?",
    options: ["Expecto Patronum", "Protego", "Accio", "Confundus"],
    correctAnswer: "Expecto Patronum",
    narratorComment: "Con recuerdos felices, no con mensajes de tu ex."
  },
  {
    id: "hechizos_media_003",
    category: "hechizos",
    difficulty: "media",
    question: "¿Qué hechizo se usa para atraer objetos?",
    options: ["Accio", "Depulso", "Obliviate", "Lumos"],
    correctAnswer: "Accio",
    narratorComment: "También serviría para traer las papas a la mesa."
  },
  {
    id: "hechizos_media_004",
    category: "hechizos",
    difficulty: "media",
    question: "¿Qué hechizo borra o modifica recuerdos?",
    options: ["Obliviate", "Aguamenti", "Levicorpus", "Stupefy"],
    correctAnswer: "Obliviate",
    narratorComment: "Útil para olvidar errores, pero no para el SAT."
  },
  {
    id: "hechizos_dificil_001",
    category: "hechizos",
    difficulty: "dificil",
    question: "¿Qué hechizo usa Hermione para reparar los lentes de Harry?",
    options: ["Oculus Reparo", "Reparo Totalum", "Lumos Maxima", "Accio Lentes"],
    correctAnswer: "Oculus Reparo",
    narratorComment: "La magia también sabe de óptica básica."
  },
  {
    id: "hechizos_dificil_002",
    category: "hechizos",
    difficulty: "dificil",
    question: "¿Qué hechizo deja el cuerpo rígido como tabla?",
    options: ["Petrificus Totalus", "Riddikulus", "Protego", "Alohomora"],
    correctAnswer: "Petrificus Totalus",
    narratorComment: "Neville lo vivió. Y no lo recomienda."
  },
  {
    id: "hechizos_experto_001",
    category: "hechizos",
    difficulty: "experto",
    question: "¿Qué hechizo oscuro crea heridas como cortes de espada?",
    options: ["Sectumsempra", "Morsmordre", "Imperio", "Crucio"],
    correctAnswer: "Sectumsempra",
    narratorComment: "Cuando el libro dice príncipe, pero la consecuencia dice demanda."
  },

  // PERSONAJES
  {
    id: "personajes_facil_001",
    category: "personajes",
    difficulty: "facil",
    question: "¿Quién es el mejor amigo pelirrojo de Harry?",
    options: ["Ron Weasley", "Draco Malfoy", "Neville Longbottom", "Cedric Diggory"],
    correctAnswer: "Ron Weasley",
    narratorComment: "Pelirrojo, leal y con hambre casi profesional."
  },
  {
    id: "personajes_facil_002",
    category: "personajes",
    difficulty: "facil",
    question: "¿Quién es la amiga brillante de Harry y Ron?",
    options: ["Hermione Granger", "Luna Lovegood", "Ginny Weasley", "Cho Chang"],
    correctAnswer: "Hermione Granger",
    narratorComment: "Sin Hermione, la saga duraba película y media."
  },
  {
    id: "personajes_facil_003",
    category: "personajes",
    difficulty: "facil",
    question: "¿Quién es el guardabosques de Hogwarts?",
    options: ["Rubeus Hagrid", "Remus Lupin", "Sirius Black", "Arthur Weasley"],
    correctAnswer: "Rubeus Hagrid",
    narratorComment: "Gigante de corazón, peligroso para permisos escolares."
  },
  {
    id: "personajes_media_001",
    category: "personajes",
    difficulty: "media",
    question: "¿Quién es el padrino de Harry?",
    options: ["Sirius Black", "Remus Lupin", "Severus Snape", "Arthur Weasley"],
    correctAnswer: "Sirius Black",
    narratorComment: "Padrino, fugitivo y experto en entradas dramáticas."
  },
  {
    id: "personajes_media_002",
    category: "personajes",
    difficulty: "media",
    question: "¿Quién es conocido como Ojoloco Moody?",
    options: ["Alastor Moody", "Horace Slughorn", "Argus Filch", "Cornelius Fudge"],
    correctAnswer: "Alastor Moody",
    narratorComment: "Vigilancia constante. Hasta para ir por pan."
  },
  {
    id: "personajes_media_003",
    category: "personajes",
    difficulty: "media",
    question: "¿Quién mata a Nagini en la batalla final?",
    options: ["Neville Longbottom", "Ron Weasley", "Luna Lovegood", "Draco Malfoy"],
    correctAnswer: "Neville Longbottom",
    narratorComment: "De tímido a leyenda. Crecimiento de personaje nivel premium."
  },
  {
    id: "personajes_dificil_001",
    category: "personajes",
    difficulty: "dificil",
    question: "¿Quién traicionó a los padres de Harry ante Voldemort?",
    options: ["Peter Pettigrew", "Sirius Black", "Remus Lupin", "Barty Crouch Jr."],
    correctAnswer: "Peter Pettigrew",
    narratorComment: "La rata era literal y emocional."
  },
  {
    id: "personajes_dificil_002",
    category: "personajes",
    difficulty: "dificil",
    question: "¿Qué personaje usa el diario de Tom Riddle y abre la Cámara de los Secretos?",
    options: ["Ginny Weasley", "Luna Lovegood", "Hermione Granger", "Cho Chang"],
    correctAnswer: "Ginny Weasley",
    narratorComment: "Moraleja: no confíes en diarios demasiado intensos."
  },
  {
    id: "personajes_experto_001",
    category: "personajes",
    difficulty: "experto",
    question: "¿Cuál es el nombre completo de Voldemort antes de convertirse en el Señor Tenebroso?",
    options: ["Tom Sorvolo Riddle", "Tom Marvolo Black", "Thomas Salazar Riddle", "Tom Gaunt Lestrange"],
    correctAnswer: "Tom Sorvolo Riddle",
    narratorComment: "El nombre ya venía con vibra de problema administrativo."
  },
  {
    id: "personajes_experto_002",
    category: "personajes",
    difficulty: "experto",
    question: "¿Quién fue el falso Moody en el Torneo de los Tres Magos?",
    options: ["Barty Crouch Jr.", "Lucius Malfoy", "Peter Pettigrew", "Fenrir Greyback"],
    correctAnswer: "Barty Crouch Jr.",
    narratorComment: "Suplantación de identidad nivel: todo el ciclo escolar."
  },

  // CRIATURAS
  {
    id: "criaturas_facil_001",
    category: "criaturas",
    difficulty: "facil",
    question: "¿Qué criatura custodia la Cámara de los Secretos?",
    options: ["Basilisco", "Hipogrifo", "Dementor", "Troll"],
    correctAnswer: "Basilisco",
    narratorComment: "Una serpiente enorme. Nada ideal para turismo escolar."
  },
  {
    id: "criaturas_facil_002",
    category: "criaturas",
    difficulty: "facil",
    question: "¿Qué criaturas absorben la felicidad?",
    options: ["Dementores", "Elfos domésticos", "Duendes", "Acromántulas"],
    correctAnswer: "Dementores",
    narratorComment: "Como lunes con trámite pendiente, pero con túnica."
  },
  {
    id: "criaturas_media_001",
    category: "criaturas",
    difficulty: "media",
    question: "¿Cómo se llama el hipogrifo que ayuda a Harry y Hermione?",
    options: ["Buckbeak", "Norberto", "Fawkes", "Aragog"],
    correctAnswer: "Buckbeak",
    narratorComment: "Con los hipogrifos se saluda con respeto, no con confianza."
  },
  {
    id: "criaturas_media_002",
    category: "criaturas",
    difficulty: "media",
    question: "¿Qué criatura es Aragog?",
    options: ["Acromántula", "Hipogrifo", "Dragón", "Thestral"],
    correctAnswer: "Acromántula",
    narratorComment: "Araña gigante. Porque una normal no era suficientemente traumática."
  },
  {
    id: "criaturas_media_003",
    category: "criaturas",
    difficulty: "media",
    question: "¿Qué animal es Fawkes?",
    options: ["Fénix", "Lechuza", "Cuervo", "Hipogrifo"],
    correctAnswer: "Fénix",
    narratorComment: "Renace de las cenizas. Muy dramático, muy útil."
  },
  {
    id: "criaturas_dificil_001",
    category: "criaturas",
    difficulty: "dificil",
    question: "¿Quiénes pueden ver a los thestrals?",
    options: ["Quienes han presenciado la muerte", "Quienes hablan pársel", "Quienes son animagos", "Quienes usan la capa de invisibilidad"],
    correctAnswer: "Quienes han presenciado la muerte",
    narratorComment: "Una respuesta intensa para una criatura intensa."
  },
  {
    id: "criaturas_dificil_002",
    category: "criaturas",
    difficulty: "dificil",
    question: "¿Qué dragón enfrenta Harry en el Torneo de los Tres Magos?",
    options: ["Colacuerno Húngaro", "Galés Verde", "Bola de Fuego Chino", "Hocicorto Sueco"],
    correctAnswer: "Colacuerno Húngaro",
    narratorComment: "Como examen final, pero con fuego y demanda laboral."
  },
  {
    id: "criaturas_experto_001",
    category: "criaturas",
    difficulty: "experto",
    question: "¿Qué criatura parece una planta bebé que grita al ser arrancada?",
    options: ["Mandrágora", "Mimbulus mimbletonia", "Tentácula venenosa", "Branquialgas"],
    correctAnswer: "Mandrágora",
    narratorComment: "Botánica, pero con trauma auditivo."
  },

  // OBJETOS MÁGICOS
  {
    id: "objetos_facil_001",
    category: "objetos mágicos",
    difficulty: "facil",
    question: "¿Qué objeto hace invisible a quien lo usa?",
    options: ["Capa de invisibilidad", "Giratiempo", "Recordadora", "Mapa del Merodeador"],
    correctAnswer: "Capa de invisibilidad",
    narratorComment: "Perfecta para escaparse, pésima para rendir cuentas."
  },
  {
    id: "objetos_facil_002",
    category: "objetos mágicos",
    difficulty: "facil",
    question: "¿Qué objeto dorado se atrapa en el Quidditch?",
    options: ["Snitch dorada", "Bludger", "Quaffle", "Recordadora"],
    correctAnswer: "Snitch dorada",
    narratorComment: "Pequeña, rápida y con ego de protagonista."
  },
  {
    id: "objetos_media_001",
    category: "objetos mágicos",
    difficulty: "media",
    question: "¿Qué objeto permite viajar unas horas en el tiempo?",
    options: ["Giratiempo", "Pensadero", "Copa de fuego", "Guardapelo"],
    correctAnswer: "Giratiempo",
    narratorComment: "Ideal para estudiar, no para corregir conversaciones incómodas."
  },
  {
    id: "objetos_media_002",
    category: "objetos mágicos",
    difficulty: "media",
    question: "¿Qué objeto muestra pasadizos y personas dentro de Hogwarts?",
    options: ["Mapa del Merodeador", "Pensadero", "Espejo de Oesed", "Recordadora"],
    correctAnswer: "Mapa del Merodeador",
    narratorComment: "GPS mágico con tendencias chismosas."
  },
  {
    id: "objetos_media_003",
    category: "objetos mágicos",
    difficulty: "media",
    question: "¿Qué objeto muestra el deseo más profundo de quien lo mira?",
    options: ["Espejo de Oesed", "Pensadero", "Recordadora", "Giratiempo"],
    correctAnswer: "Espejo de Oesed",
    narratorComment: "Un espejo que te conoce más que tu terapeuta."
  },
  {
    id: "objetos_dificil_001",
    category: "objetos mágicos",
    difficulty: "dificil",
    question: "¿Qué objeto permite ver recuerdos almacenados?",
    options: ["Pensadero", "Copa de fuego", "Mapa del Merodeador", "Deluminador"],
    correctAnswer: "Pensadero",
    narratorComment: "Como ver historias ajedas, pero con permiso institucional."
  },
  {
    id: "objetos_dificil_002",
    category: "objetos mágicos",
    difficulty: "dificil",
    question: "¿Qué objeto elige a los campeones del Torneo de los Tres Magos?",
    options: ["Copa de fuego", "Snitch dorada", "Sombrero Seleccionador", "Varita de Saúco"],
    correctAnswer: "Copa de fuego",
    narratorComment: "Democracia mágica con filtros cuestionables."
  },
  {
    id: "objetos_experto_001",
    category: "objetos mágicos",
    difficulty: "experto",
    question: "¿Cuál de estos objetos es una Reliquia de la Muerte?",
    options: ["Piedra de la Resurrección", "Giratiempo", "Recordadora", "Copa de fuego"],
    correctAnswer: "Piedra de la Resurrección",
    narratorComment: "Reliquia poderosa, emocionalmente peligrosa."
  },

  // PELÍCULAS
  {
    id: "peliculas_facil_001",
    category: "películas",
    difficulty: "facil",
    question: "¿En qué película aparece por primera vez Hogwarts?",
    options: ["La piedra filosofal", "La cámara secreta", "El prisionero de Azkaban", "El cáliz de fuego"],
    correctAnswer: "La piedra filosofal",
    narratorComment: "La primera llegada al castillo nunca se olvida."
  },
  {
    id: "peliculas_facil_002",
    category: "películas",
    difficulty: "facil",
    question: "¿En qué película aparece el basilisco?",
    options: ["La cámara secreta", "La orden del Fénix", "El cáliz de fuego", "El misterio del príncipe"],
    correctAnswer: "La cámara secreta",
    narratorComment: "Una cámara secreta con cero mantenimiento preventivo."
  },
  {
    id: "peliculas_media_001",
    category: "películas",
    difficulty: "media",
    question: "¿En qué película aparece el Torneo de los Tres Magos?",
    options: ["El cáliz de fuego", "La orden del Fénix", "El prisionero de Azkaban", "Las reliquias de la muerte parte 1"],
    correctAnswer: "El cáliz de fuego",
    narratorComment: "Competencia escolar con alto índice de peligro."
  },
  {
    id: "peliculas_media_002",
    category: "películas",
    difficulty: "media",
    question: "¿En qué película Harry forma el Ejército de Dumbledore?",
    options: ["La orden del Fénix", "El misterio del príncipe", "El cáliz de fuego", "La cámara secreta"],
    correctAnswer: "La orden del Fénix",
    narratorComment: "Cuando la escuela falla, se arma el grupo de estudio clandestino."
  },
  {
    id: "peliculas_dificil_001",
    category: "películas",
    difficulty: "dificil",
    question: "¿En qué película aparece el Giratiempo como elemento clave?",
    options: ["El prisionero de Azkaban", "El cáliz de fuego", "La piedra filosofal", "La orden del Fénix"],
    correctAnswer: "El prisionero de Azkaban",
    narratorComment: "Viaje temporal, rescate doble y estrés académico."
  },
  {
    id: "peliculas_dificil_002",
    category: "películas",
    difficulty: "dificil",
    question: "¿En qué película se revela el libro del Príncipe Mestizo?",
    options: ["El misterio del príncipe", "La orden del Fénix", "Las reliquias de la muerte parte 2", "El cáliz de fuego"],
    correctAnswer: "El misterio del príncipe",
    narratorComment: "Libro usado, apuntes peligrosos y consecuencias graves."
  },
  {
    id: "peliculas_experto_001",
    category: "películas",
    difficulty: "experto",
    question: "¿En qué película se destruye la diadema de Ravenclaw?",
    options: ["Las reliquias de la muerte parte 2", "Las reliquias de la muerte parte 1", "El misterio del príncipe", "La orden del Fénix"],
    correctAnswer: "Las reliquias de la muerte parte 2",
    narratorComment: "Sala de los Menesteres: útil hasta que arde todo."
  },

  // PROFESORES
  {
    id: "profesores_facil_001",
    category: "profesores",
    difficulty: "facil",
    question: "¿Quién enseña Pociones durante gran parte de la saga?",
    options: ["Severus Snape", "Remus Lupin", "Filius Flitwick", "Sybill Trelawney"],
    correctAnswer: "Severus Snape",
    narratorComment: "Pociones, sarcasmo y tensión permanente."
  },
  {
    id: "profesores_facil_002",
    category: "profesores",
    difficulty: "facil",
    question: "¿Quién enseña Transformaciones?",
    options: ["Minerva McGonagall", "Pomona Sprout", "Dolores Umbridge", "Sybill Trelawney"],
    correctAnswer: "Minerva McGonagall",
    narratorComment: "Elegancia, disciplina y cero paciencia para tonterías."
  },
  {
    id: "profesores_media_001",
    category: "profesores",
    difficulty: "media",
    question: "¿Qué profesor enseña Defensa Contra las Artes Oscuras en el tercer año?",
    options: ["Remus Lupin", "Gilderoy Lockhart", "Quirinus Quirrell", "Dolores Umbridge"],
    correctAnswer: "Remus Lupin",
    narratorComment: "El mejor maestro de defensa y una persona muy loba."
  },
  {
    id: "profesores_media_002",
    category: "profesores",
    difficulty: "media",
    question: "¿Quién enseña Herbología?",
    options: ["Pomona Sprout", "Minerva McGonagall", "Sybill Trelawney", "Madam Hooch"],
    correctAnswer: "Pomona Sprout",
    narratorComment: "Plantas mágicas: bonitas, útiles y a veces gritonas."
  },
  {
    id: "profesores_media_003",
    category: "profesores",
    difficulty: "media",
    question: "¿Quién enseña Encantamientos?",
    options: ["Filius Flitwick", "Horace Slughorn", "Argus Filch", "Remus Lupin"],
    correctAnswer: "Filius Flitwick",
    narratorComment: "Pequeño de estatura, gigante en magia."
  },
  {
    id: "profesores_dificil_001",
    category: "profesores",
    difficulty: "dificil",
    question: "¿Quién enseña Adivinación?",
    options: ["Sybill Trelawney", "Pomona Sprout", "Dolores Umbridge", "Poppy Pomfrey"],
    correctAnswer: "Sybill Trelawney",
    narratorComment: "Predicciones intensas, lentes enormes y mucho incienso emocional."
  },
  {
    id: "profesores_dificil_002",
    category: "profesores",
    difficulty: "dificil",
    question: "¿Quién enseña Defensa Contra las Artes Oscuras en segundo año?",
    options: ["Gilderoy Lockhart", "Remus Lupin", "Alastor Moody", "Severus Snape"],
    correctAnswer: "Gilderoy Lockhart",
    narratorComment: "Más ego que utilidad práctica."
  },
  {
    id: "profesores_experto_001",
    category: "profesores",
    difficulty: "experto",
    question: "¿Quién reemplaza a Snape como profesor de Pociones en sexto año?",
    options: ["Horace Slughorn", "Filius Flitwick", "Remus Lupin", "Barty Crouch Jr."],
    correctAnswer: "Horace Slughorn",
    narratorComment: "Coleccionista de alumnos destacados y cenas convenientes."
  },

  // VILLANOS
  {
    id: "villanos_facil_001",
    category: "villanos",
    difficulty: "facil",
    question: "¿Quién es el principal enemigo de Harry?",
    options: ["Lord Voldemort", "Lucius Malfoy", "Fenrir Greyback", "Gilderoy Lockhart"],
    correctAnswer: "Lord Voldemort",
    narratorComment: "El villano que ni nariz necesitaba para oler el drama."
  },
  {
    id: "villanos_media_001",
    category: "villanos",
    difficulty: "media",
    question: "¿Quién mata a Sirius Black en el Ministerio?",
    options: ["Bellatrix Lestrange", "Lucius Malfoy", "Dolores Umbridge", "Peter Pettigrew"],
    correctAnswer: "Bellatrix Lestrange",
    narratorComment: "Una escena que dolió en todos los idiomas."
  },
  {
    id: "villanos_media_002",
    category: "villanos",
    difficulty: "media",
    question: "¿Quién es la profesora enviada por el Ministerio en La orden del Fénix?",
    options: ["Dolores Umbridge", "Bellatrix Lestrange", "Narcissa Malfoy", "Rita Skeeter"],
    correctAnswer: "Dolores Umbridge",
    narratorComment: "Color rosa, voz dulce y energía de pesadilla institucional."
  },
  {
    id: "villanos_dificil_001",
    category: "villanos",
    difficulty: "dificil",
    question: "¿Qué mortífago pierde una mano y luego recibe una mano plateada?",
    options: ["Peter Pettigrew", "Lucius Malfoy", "Barty Crouch Jr.", "Fenrir Greyback"],
    correctAnswer: "Peter Pettigrew",
    narratorComment: "La peor promoción laboral del mundo mágico."
  },
  {
    id: "villanos_dificil_002",
    category: "villanos",
    difficulty: "dificil",
    question: "¿Quién es la serpiente de Voldemort?",
    options: ["Nagini", "Aragog", "Fawkes", "Norberta"],
    correctAnswer: "Nagini",
    narratorComment: "Mascota, horrocrux y pésima noticia."
  },

  // FRASES
  {
    id: "frases_facil_001",
    category: "frases",
    difficulty: "facil",
    question: "¿Qué frase se usa para activar el Mapa del Merodeador?",
    options: ["Juro solemnemente que mis intenciones no son buenas", "Lumos Máxima", "Mischief completo", "Abierto hasta el amanecer"],
    correctAnswer: "Juro solemnemente que mis intenciones no son buenas",
    narratorComment: "Una frase elegante para declarar que vas a hacer travesuras."
  },
  {
    id: "frases_facil_002",
    category: "frases",
    difficulty: "facil",
    question: "¿Qué frase se usa para cerrar el Mapa del Merodeador?",
    options: ["Travesura realizada", "Mapa cerrado", "Fin de la magia", "Mischief terminado"],
    correctAnswer: "Travesura realizada",
    narratorComment: "Corto, efectivo y perfecto para ocultar evidencia."
  },
  {
    id: "frases_media_001",
    category: "frases",
    difficulty: "media",
    question: "¿Qué corrige Hermione al enseñar Wingardium Leviosa?",
    options: ["La pronunciación", "El color de la varita", "La postura de Quidditch", "La casa de Ron"],
    correctAnswer: "La pronunciación",
    narratorComment: "No es solo decirlo, es decirlo con superioridad académica."
  },
  {
    id: "frases_media_002",
    category: "frases",
    difficulty: "media",
    question: "¿Qué palabra dice Snape que resume gran parte de su historia?",
    options: ["Siempre", "Nunca", "Lumos", "Adiós"],
    correctAnswer: "Siempre",
    narratorComment: "Una palabra, demasiada carga emocional."
  },

  // ESCENAS
  {
    id: "escenas_facil_001",
    category: "escenas",
    difficulty: "facil",
    question: "¿Dónde compra Harry su primera varita?",
    options: ["Ollivanders", "Gringotts", "Las Tres Escobas", "Borgin y Burkes"],
    correctAnswer: "Ollivanders",
    narratorComment: "La varita elige al mago. El ticket no elige al bolsillo."
  },
  {
    id: "escenas_facil_002",
    category: "escenas",
    difficulty: "facil",
    question: "¿Qué deporte mágico se juega con escobas?",
    options: ["Quidditch", "Ajedrez mágico", "Gobstones", "Exploding Snap"],
    correctAnswer: "Quidditch",
    narratorComment: "Deporte escolar con altura, golpes y cero sentido de seguridad."
  },
  {
    id: "escenas_media_001",
    category: "escenas",
    difficulty: "media",
    question: "¿Qué pieza de ajedrez monta Ron en la primera película?",
    options: ["Caballo", "Torre", "Alfil", "Rey"],
    correctAnswer: "Caballo",
    narratorComment: "Ajedrez mágico: estrategia, sacrificio y contusiones."
  },
  {
    id: "escenas_media_002",
    category: "escenas",
    difficulty: "media",
    question: "¿Cómo llegan Harry y Ron a Hogwarts en la segunda película?",
    options: ["En el auto volador", "En un dragón", "En la moto de Sirius", "En un traslador"],
    correctAnswer: "En el auto volador",
    narratorComment: "Llegar tarde es malo. Llegar en auto volador es legendario."
  },
  {
    id: "escenas_dificil_001",
    category: "escenas",
    difficulty: "dificil",
    question: "¿Qué criatura salva a Harry en la Cámara de los Secretos?",
    options: ["Fawkes", "Buckbeak", "Dobby", "Hedwig"],
    correctAnswer: "Fawkes",
    narratorComment: "Fénix de emergencia, servicio completo."
  },
  {
    id: "escenas_dificil_002",
    category: "escenas",
    difficulty: "dificil",
    question: "¿En qué lugar se destruye el diario de Tom Riddle?",
    options: ["Cámara de los Secretos", "Gran Comedor", "Bosque Prohibido", "Ministerio de Magia"],
    correctAnswer: "Cámara de los Secretos",
    narratorComment: "Diario destruido, trauma desbloqueado."
  },
  {
    id: "escenas_experto_001",
    category: "escenas",
    difficulty: "experto",
    question: "¿Qué objeto usa Harry para respirar bajo el agua en la segunda prueba del Torneo?",
    options: ["Branquialgas", "Giratiempo", "Poción multijugos", "Deluminador"],
    correctAnswer: "Branquialgas",
    narratorComment: "Sabor dudoso, utilidad indiscutible."
  },

  // CASAS
  {
    id: "casas_facil_001",
    category: "casas",
    difficulty: "facil",
    question: "¿Qué casa tiene como símbolo un león?",
    options: ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"],
    correctAnswer: "Gryffindor",
    narratorComment: "Valentía, drama y ganas de romper reglas."
  },
  {
    id: "casas_facil_002",
    category: "casas",
    difficulty: "facil",
    question: "¿Qué casa tiene como símbolo una serpiente?",
    options: ["Slytherin", "Ravenclaw", "Hufflepuff", "Gryffindor"],
    correctAnswer: "Slytherin",
    narratorComment: "Ambición, elegancia y reputación complicada."
  },
  {
    id: "casas_media_001",
    category: "casas",
    difficulty: "media",
    question: "¿A qué casa pertenece Luna Lovegood?",
    options: ["Ravenclaw", "Hufflepuff", "Gryffindor", "Slytherin"],
    correctAnswer: "Ravenclaw",
    narratorComment: "Creativa, extraña y más sabia de lo que parece."
  },
  {
    id: "casas_media_002",
    category: "casas",
    difficulty: "media",
    question: "¿A qué casa pertenece Cedric Diggory?",
    options: ["Hufflepuff", "Ravenclaw", "Slytherin", "Gryffindor"],
    correctAnswer: "Hufflepuff",
    narratorComment: "Leal, noble y demasiado bueno para ese torneo."
  },

  // HORROCRUXES
  {
    id: "horrocruxes_media_001",
    category: "horrocruxes",
    difficulty: "media",
    question: "¿Qué objeto de Tom Riddle es un horrocrux?",
    options: ["Diario", "Capa", "Giratiempo", "Recordadora"],
    correctAnswer: "Diario",
    narratorComment: "Un diario con más red flags que romance tóxico."
  },
  {
    id: "horrocruxes_media_002",
    category: "horrocruxes",
    difficulty: "media",
    question: "¿Qué serpiente es un horrocrux?",
    options: ["Nagini", "Aragog", "Fawkes", "Norberta"],
    correctAnswer: "Nagini",
    narratorComment: "Serpiente, compañera y pésima noticia."
  },
  {
    id: "horrocruxes_dificil_001",
    category: "horrocruxes",
    difficulty: "dificil",
    question: "¿Qué objeto de Hufflepuff se convierte en horrocrux?",
    options: ["Copa", "Diadema", "Espada", "Guardapelo"],
    correctAnswer: "Copa",
    narratorComment: "Una copa elegante con contenido moralmente cuestionable."
  },
  {
    id: "horrocruxes_dificil_002",
    category: "horrocruxes",
    difficulty: "dificil",
    question: "¿Qué objeto de Ravenclaw se convierte en horrocrux?",
    options: ["Diadema", "Copa", "Guardapelo", "Diario"],
    correctAnswer: "Diadema",
    narratorComment: "Sabiduría, pero poseída por el peor inquilino."
  },

  // LUGARES
  {
    id: "lugares_facil_001",
    category: "lugares",
    difficulty: "facil",
    question: "¿Cómo se llama el banco de los magos?",
    options: ["Gringotts", "Ollivanders", "Honeydukes", "Azkaban"],
    correctAnswer: "Gringotts",
    narratorComment: "Banco mágico: más seguro que tu contraseña, casi siempre."
  },
  {
    id: "lugares_facil_002",
    category: "lugares",
    difficulty: "facil",
    question: "¿Cómo se llama la prisión mágica?",
    options: ["Azkaban", "Hogsmeade", "Gringotts", "Beauxbatons"],
    correctAnswer: "Azkaban",
    narratorComment: "Vacaciones no incluidas. Dementores sí."
  },
  {
    id: "lugares_media_001",
    category: "lugares",
    difficulty: "media",
    question: "¿Dónde se encuentra la estación para abordar el Expreso de Hogwarts?",
    options: ["King's Cross", "Hogsmeade", "Gringotts", "El Ministerio"],
    correctAnswer: "King's Cross",
    narratorComment: "La magia empieza con una pared y mucha confianza."
  },
  {
    id: "lugares_media_002",
    category: "lugares",
    difficulty: "media",
    question: "¿Qué pueblo mágico visitan los estudiantes de Hogwarts?",
    options: ["Hogsmeade", "Godric's Hollow", "Little Whinging", "Privet Drive"],
    correctAnswer: "Hogsmeade",
    narratorComment: "Dulces, cerveza de mantequilla y excursión con permiso."
  },

  // QUIDDITCH
  {
    id: "quidditch_facil_001",
    category: "quidditch",
    difficulty: "facil",
    question: "¿Qué jugador busca la Snitch dorada?",
    options: ["Buscador", "Guardián", "Golpeador", "Cazador"],
    correctAnswer: "Buscador",
    narratorComment: "El puesto con más presión y mejor foto de portada."
  },
  {
    id: "quidditch_media_001",
    category: "quidditch",
    difficulty: "media",
    question: "¿Qué pelota se usa para anotar en los aros?",
    options: ["Quaffle", "Bludger", "Snitch", "Recordadora"],
    correctAnswer: "Quaffle",
    narratorComment: "La pelota normal en un deporte nada normal."
  },
  {
    id: "quidditch_media_002",
    category: "quidditch",
    difficulty: "media",
    question: "¿Qué pelotas golpean a los jugadores en Quidditch?",
    options: ["Bludgers", "Quaffles", "Snitches", "Mandrágoras"],
    correctAnswer: "Bludgers",
    narratorComment: "Como si volar en escoba no fuera suficiente riesgo."
  },

  // HUMOR Y VIDA MAGICA (EXTRAS)
  {
    id: "humor_facil_001",
    category: "humor",
    difficulty: "facil",
    question: "¿Qué hechizo usarías para arreglar tus lentes rotos?",
    options: ["Oculus Reparo", "Lumos", "Sectumsempra", "Avada Kedavra"],
    correctAnswer: "Oculus Reparo",
    narratorComment: "Avada Kedavra era muy extremo para unos lentes rotos."
  },
  {
    id: "humor_media_001",
    category: "humor",
    difficulty: "media",
    question: "¿Si tu ex te manda un mensaje a las 3 AM, qué hechizo le lanzas?",
    options: ["Incendio", "Obliviate", "Bombarda Máxima", "Reducto"],
    correctAnswer: "Incendio",
    narratorComment: "Fuego. La única solución razonable para un 'hola perdida'."
  },
  {
    id: "humor_media_002",
    category: "humor",
    difficulty: "media",
    question: "¿Qué criatura mágica te chuparía toda la alegría igual que el SAT?",
    options: ["Dementor", "Boggart", "Duendecillo de Cornualles", "Nargle"],
    correctAnswer: "Dementor",
    narratorComment: "Al menos el Dementor no te pide firma electrónica."
  },
  {
    id: "humor_media_003",
    category: "humor",
    difficulty: "media",
    question: "¿Cómo llegas a Hogwarts si perdiste el tren por comer tacos?",
    options: ["Ford Anglia Volador", "Microbús Mágico", "Uber en escoba", "Traslador"],
    correctAnswer: "Ford Anglia Volador",
    narratorComment: "Llegar en coche volador es tener estilo."
  }
];
