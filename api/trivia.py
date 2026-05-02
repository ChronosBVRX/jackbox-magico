import random
import time
import uuid
from copy import deepcopy

from fastapi import APIRouter, HTTPException, Request

from api.database import supabase


router = APIRouter()

GAME_ID = "trivia_magica"
PHASE = "trivia"

QUESTION_SECONDS = 20
DEFAULT_TOTAL_QUESTIONS = 25

DIFFICULTY_POINTS = {
    "facil": 50,
    "fácil": 50,
    "media": 100,
    "dificil": 150,
    "difícil": 150,
    "experto": 200,
}

FASTEST_CORRECT_BONUS = 40
STREAK_3_BONUS = 100
WRONG_POINTS = 0

ANSWER_LABELS = ["A", "B", "C", "D"]

NARRATOR_CORRECT_LINES = [
    "Hermione estaría orgullosa.",
    "Respuesta correcta. Diez puntos imaginarios para tu ego.",
    "Eso fue más rápido que una Snitch asustada.",
    "Muy bien. Hasta McGonagall levantó la ceja con respeto.",
    "Correcto. Esa varita sí trae pila.",
    "Bien jugado. Eso sí fue magia y no puro entusiasmo.",
    "Respuesta digna del Gran Comedor.",
    "Eso estuvo tan limpio que Filch no encontró polvo.",
]

NARRATOR_WRONG_LINES = [
    "Incorrecto, eso dolió más que un regaño de Snape.",
    "No. Hasta un retrato dormido lo habría sabido.",
    "Fallaste. La lechuza llegó, pero con malas noticias.",
    "Incorrecto. Ese hechizo se te fue chueco.",
    "No fue esa. Respira, joven mago, respira.",
    "Error mágico. Tu varita acaba de pedir vacaciones.",
    "Incorrecto. Voldemort se rio poquito.",
    "Eso no era. Pero se sintió dramático.",
]

FASTEST_LINES = [
    "¡Respuesta correcta más rápida!",
    "¡Reflejos de buscador!",
    "¡Velocidad nivel Snitch!",
    "¡Contestó antes de que el pergamino terminara de secarse!",
]

STREAK_LINES = [
    "¡Racha de 3 correctas!",
    "¡Modo Hermione activado!",
    "¡Tres al hilo, esto ya parece clase particular!",
    "¡Racha mágica! Cuidado, se está poniendo serio.",
]


TRIVIA_POOL = [
    {
        "categoria": "hechizos",
        "dificultad": "facil",
        "pregunta": "¿Qué hechizo se usa para encender la punta de la varita?",
        "opciones": ["Lumos", "Accio", "Alohomora", "Expelliarmus"],
        "respuestaCorrecta": "Lumos",
        "comentarioNarrador": "Básico, útil y perfecto para no tropezar como muggle.",
    },
    {
        "categoria": "hechizos",
        "dificultad": "facil",
        "pregunta": "¿Qué hechizo se usa para desarmar al oponente?",
        "opciones": ["Expelliarmus", "Lumos", "Riddikulus", "Obliviate"],
        "respuestaCorrecta": "Expelliarmus",
        "comentarioNarrador": "El clásico de Harry. Simple, efectivo y muy dramático.",
    },
    {
        "categoria": "hechizos",
        "dificultad": "facil",
        "pregunta": "¿Qué hechizo abre cerraduras?",
        "opciones": ["Alohomora", "Expecto Patronum", "Accio", "Protego"],
        "respuestaCorrecta": "Alohomora",
        "comentarioNarrador": "Ideal para puertas, no para evadir responsabilidades.",
    },
    {
        "categoria": "hechizos",
        "dificultad": "media",
        "pregunta": "¿Qué hechizo se usa contra un boggart?",
        "opciones": ["Riddikulus", "Sectumsempra", "Petrificus Totalus", "Incendio"],
        "respuestaCorrecta": "Riddikulus",
        "comentarioNarrador": "La defensa más poderosa: volver ridículo lo que te asusta.",
    },
    {
        "categoria": "hechizos",
        "dificultad": "media",
        "pregunta": "¿Qué hechizo invoca un Patronus?",
        "opciones": ["Expecto Patronum", "Protego", "Accio", "Confundus"],
        "respuestaCorrecta": "Expecto Patronum",
        "comentarioNarrador": "Con recuerdos felices, no con mensajes de tu ex.",
    },
    {
        "categoria": "hechizos",
        "dificultad": "media",
        "pregunta": "¿Qué hechizo se usa para atraer objetos?",
        "opciones": ["Accio", "Depulso", "Obliviate", "Lumos"],
        "respuestaCorrecta": "Accio",
        "comentarioNarrador": "También serviría para traer las papas a la mesa.",
    },
    {
        "categoria": "hechizos",
        "dificultad": "media",
        "pregunta": "¿Qué hechizo borra o modifica recuerdos?",
        "opciones": ["Obliviate", "Aguamenti", "Levicorpus", "Stupefy"],
        "respuestaCorrecta": "Obliviate",
        "comentarioNarrador": "Útil para olvidar errores, pero no para el SAT.",
    },
    {
        "categoria": "hechizos",
        "dificultad": "dificil",
        "pregunta": "¿Qué hechizo usa Hermione para reparar los lentes de Harry?",
        "opciones": ["Oculus Reparo", "Reparo Totalum", "Lumos Maxima", "Accio Lentes"],
        "respuestaCorrecta": "Oculus Reparo",
        "comentarioNarrador": "La magia también sabe de óptica básica.",
    },
    {
        "categoria": "hechizos",
        "dificultad": "dificil",
        "pregunta": "¿Qué hechizo deja el cuerpo rígido como tabla?",
        "opciones": ["Petrificus Totalus", "Riddikulus", "Protego", "Alohomora"],
        "respuestaCorrecta": "Petrificus Totalus",
        "comentarioNarrador": "Neville lo vivió. Y no lo recomienda.",
    },
    {
        "categoria": "hechizos",
        "dificultad": "experto",
        "pregunta": "¿Qué hechizo oscuro crea heridas como cortes de espada?",
        "opciones": ["Sectumsempra", "Morsmordre", "Imperio", "Crucio"],
        "respuestaCorrecta": "Sectumsempra",
        "comentarioNarrador": "Cuando el libro dice príncipe, pero la consecuencia dice demanda.",
    },
    {
        "categoria": "personajes",
        "dificultad": "facil",
        "pregunta": "¿Quién es el mejor amigo pelirrojo de Harry?",
        "opciones": ["Ron Weasley", "Draco Malfoy", "Neville Longbottom", "Cedric Diggory"],
        "respuestaCorrecta": "Ron Weasley",
        "comentarioNarrador": "Pelirrojo, leal y con hambre casi profesional.",
    },
    {
        "categoria": "personajes",
        "dificultad": "facil",
        "pregunta": "¿Quién es la amiga brillante de Harry y Ron?",
        "opciones": ["Hermione Granger", "Luna Lovegood", "Ginny Weasley", "Cho Chang"],
        "respuestaCorrecta": "Hermione Granger",
        "comentarioNarrador": "Sin Hermione, la saga duraba película y media.",
    },
    {
        "categoria": "personajes",
        "dificultad": "facil",
        "pregunta": "¿Quién es el guardabosques de Hogwarts?",
        "opciones": ["Rubeus Hagrid", "Remus Lupin", "Sirius Black", "Arthur Weasley"],
        "respuestaCorrecta": "Rubeus Hagrid",
        "comentarioNarrador": "Gigante de corazón, peligroso para permisos escolares.",
    },
    {
        "categoria": "personajes",
        "dificultad": "media",
        "pregunta": "¿Quién es el padrino de Harry?",
        "opciones": ["Sirius Black", "Remus Lupin", "Severus Snape", "Arthur Weasley"],
        "respuestaCorrecta": "Sirius Black",
        "comentarioNarrador": "Padrino, fugitivo y experto en entradas dramáticas.",
    },
    {
        "categoria": "personajes",
        "dificultad": "media",
        "pregunta": "¿Quién es conocido como Ojoloco Moody?",
        "opciones": ["Alastor Moody", "Horace Slughorn", "Argus Filch", "Cornelius Fudge"],
        "respuestaCorrecta": "Alastor Moody",
        "comentarioNarrador": "Vigilancia constante. Hasta para ir por pan.",
    },
    {
        "categoria": "personajes",
        "dificultad": "media",
        "pregunta": "¿Quién mata a Nagini en la batalla final?",
        "opciones": ["Neville Longbottom", "Ron Weasley", "Luna Lovegood", "Draco Malfoy"],
        "respuestaCorrecta": "Neville Longbottom",
        "comentarioNarrador": "De tímido a leyenda. Crecimiento de personaje nivel premium.",
    },
    {
        "categoria": "personajes",
        "dificultad": "dificil",
        "pregunta": "¿Quién traicionó a los padres de Harry ante Voldemort?",
        "opciones": ["Peter Pettigrew", "Sirius Black", "Remus Lupin", "Barty Crouch Jr."],
        "respuestaCorrecta": "Peter Pettigrew",
        "comentarioNarrador": "La rata era literal y emocional.",
    },
    {
        "categoria": "personajes",
        "dificultad": "dificil",
        "pregunta": "¿Qué personaje usa el diario de Tom Riddle y abre la Cámara de los Secretos?",
        "opciones": ["Ginny Weasley", "Luna Lovegood", "Hermione Granger", "Cho Chang"],
        "respuestaCorrecta": "Ginny Weasley",
        "comentarioNarrador": "Moraleja: no confíes en diarios demasiado intensos.",
    },
    {
        "categoria": "personajes",
        "dificultad": "experto",
        "pregunta": "¿Cuál es el nombre completo de Voldemort antes de convertirse en el Señor Tenebroso?",
        "opciones": ["Tom Sorvolo Riddle", "Tom Marvolo Black", "Thomas Salazar Riddle", "Tom Gaunt Lestrange"],
        "respuestaCorrecta": "Tom Sorvolo Riddle",
        "comentarioNarrador": "El nombre ya venía con vibra de problema administrativo.",
    },
    {
        "categoria": "personajes",
        "dificultad": "experto",
        "pregunta": "¿Quién fue el falso Moody en el Torneo de los Tres Magos?",
        "opciones": ["Barty Crouch Jr.", "Lucius Malfoy", "Peter Pettigrew", "Fenrir Greyback"],
        "respuestaCorrecta": "Barty Crouch Jr.",
        "comentarioNarrador": "Suplantación de identidad nivel: todo el ciclo escolar.",
    },
    {
        "categoria": "criaturas",
        "dificultad": "facil",
        "pregunta": "¿Qué criatura custodia la Cámara de los Secretos?",
        "opciones": ["Basilisco", "Hipogrifo", "Dementor", "Troll"],
        "respuestaCorrecta": "Basilisco",
        "comentarioNarrador": "Una serpiente enorme. Nada ideal para turismo escolar.",
    },
    {
        "categoria": "criaturas",
        "dificultad": "facil",
        "pregunta": "¿Qué criaturas absorben la felicidad?",
        "opciones": ["Dementores", "Elfos domésticos", "Duendes", "Acromántulas"],
        "respuestaCorrecta": "Dementores",
        "comentarioNarrador": "Como lunes con trámite pendiente, pero con túnica.",
    },
    {
        "categoria": "criaturas",
        "dificultad": "media",
        "pregunta": "¿Cómo se llama el hipogrifo que ayuda a Harry y Hermione?",
        "opciones": ["Buckbeak", "Norberto", "Fawkes", "Aragog"],
        "respuestaCorrecta": "Buckbeak",
        "comentarioNarrador": "Con los hipogrifos se saluda con respeto, no con confianza.",
    },
    {
        "categoria": "criaturas",
        "dificultad": "media",
        "pregunta": "¿Qué criatura es Aragog?",
        "opciones": ["Acromántula", "Hipogrifo", "Dragón", "Thestral"],
        "respuestaCorrecta": "Acromántula",
        "comentarioNarrador": "Araña gigante. Porque una normal no era suficientemente traumática.",
    },
    {
        "categoria": "criaturas",
        "dificultad": "media",
        "pregunta": "¿Qué animal es Fawkes?",
        "opciones": ["Fénix", "Lechuza", "Cuervo", "Hipogrifo"],
        "respuestaCorrecta": "Fénix",
        "comentarioNarrador": "Renace de las cenizas. Muy dramático, muy útil.",
    },
    {
        "categoria": "criaturas",
        "dificultad": "dificil",
        "pregunta": "¿Quiénes pueden ver a los thestrals?",
        "opciones": ["Quienes han presenciado la muerte", "Quienes hablan pársel", "Quienes son animagos", "Quienes usan la capa de invisibilidad"],
        "respuestaCorrecta": "Quienes han presenciado la muerte",
        "comentarioNarrador": "Una respuesta intensa para una criatura intensa.",
    },
    {
        "categoria": "criaturas",
        "dificultad": "dificil",
        "pregunta": "¿Qué dragón enfrenta Harry en el Torneo de los Tres Magos?",
        "opciones": ["Colacuerno Húngaro", "Galés Verde", "Bola de Fuego Chino", "Hocicorto Sueco"],
        "respuestaCorrecta": "Colacuerno Húngaro",
        "comentarioNarrador": "Como examen final, pero con fuego y demanda laboral.",
    },
    {
        "categoria": "criaturas",
        "dificultad": "experto",
        "pregunta": "¿Qué criatura parece una planta bebé que grita al ser arrancada?",
        "opciones": ["Mandrágora", "Mimbulus mimbletonia", "Tentácula venenosa", "Branquialgas"],
        "respuestaCorrecta": "Mandrágora",
        "comentarioNarrador": "Botánica, pero con trauma auditivo.",
    },
    {
        "categoria": "objetos mágicos",
        "dificultad": "facil",
        "pregunta": "¿Qué objeto hace invisible a quien lo usa?",
        "opciones": ["Capa de invisibilidad", "Giratiempo", "Recordadora", "Mapa del Merodeador"],
        "respuestaCorrecta": "Capa de invisibilidad",
        "comentarioNarrador": "Perfecta para escaparse, pésima para rendir cuentas.",
    },
    {
        "categoria": "objetos mágicos",
        "dificultad": "facil",
        "pregunta": "¿Qué objeto dorado se atrapa en el Quidditch?",
        "opciones": ["Snitch dorada", "Bludger", "Quaffle", "Recordadora"],
        "respuestaCorrecta": "Snitch dorada",
        "comentarioNarrador": "Pequeña, rápida y con ego de protagonista.",
    },
    {
        "categoria": "objetos mágicos",
        "dificultad": "media",
        "pregunta": "¿Qué objeto permite viajar unas horas en el tiempo?",
        "opciones": ["Giratiempo", "Pensadero", "Copa de fuego", "Guardapelo"],
        "respuestaCorrecta": "Giratiempo",
        "comentarioNarrador": "Ideal para estudiar, no para corregir conversaciones incómodas.",
    },
    {
        "categoria": "objetos mágicos",
        "dificultad": "media",
        "pregunta": "¿Qué objeto muestra pasadizos y personas dentro de Hogwarts?",
        "opciones": ["Mapa del Merodeador", "Pensadero", "Espejo de Oesed", "Recordadora"],
        "respuestaCorrecta": "Mapa del Merodeador",
        "comentarioNarrador": "GPS mágico con tendencias chismosas.",
    },
    {
        "categoria": "objetos mágicos",
        "dificultad": "media",
        "pregunta": "¿Qué objeto muestra el deseo más profundo de quien lo mira?",
        "opciones": ["Espejo de Oesed", "Pensadero", "Recordadora", "Giratiempo"],
        "respuestaCorrecta": "Espejo de Oesed",
        "comentarioNarrador": "Un espejo que te conoce más que tu terapeuta.",
    },
    {
        "categoria": "objetos mágicos",
        "dificultad": "dificil",
        "pregunta": "¿Qué objeto permite ver recuerdos almacenados?",
        "opciones": ["Pensadero", "Copa de fuego", "Mapa del Merodeador", "Deluminador"],
        "respuestaCorrecta": "Pensadero",
        "comentarioNarrador": "Como ver historias ajenas, pero con permiso institucional.",
    },
    {
        "categoria": "objetos mágicos",
        "dificultad": "dificil",
        "pregunta": "¿Qué objeto elige a los campeones del Torneo de los Tres Magos?",
        "opciones": ["Copa de fuego", "Snitch dorada", "Sombrero Seleccionador", "Varita de Saúco"],
        "respuestaCorrecta": "Copa de fuego",
        "comentarioNarrador": "Democracia mágica con filtros cuestionables.",
    },
    {
        "categoria": "objetos mágicos",
        "dificultad": "experto",
        "pregunta": "¿Cuál de estos objetos es una Reliquia de la Muerte?",
        "opciones": ["Piedra de la Resurrección", "Giratiempo", "Recordadora", "Copa de fuego"],
        "respuestaCorrecta": "Piedra de la Resurrección",
        "comentarioNarrador": "Reliquia poderosa, emocionalmente peligrosa.",
    },
    {
        "categoria": "películas",
        "dificultad": "facil",
        "pregunta": "¿En qué película aparece por primera vez Hogwarts?",
        "opciones": ["La piedra filosofal", "La cámara secreta", "El prisionero de Azkaban", "El cáliz de fuego"],
        "respuestaCorrecta": "La piedra filosofal",
        "comentarioNarrador": "La primera llegada al castillo nunca se olvida.",
    },
    {
        "categoria": "películas",
        "dificultad": "facil",
        "pregunta": "¿En qué película aparece el basilisco?",
        "opciones": ["La cámara secreta", "La orden del Fénix", "El cáliz de fuego", "El misterio del príncipe"],
        "respuestaCorrecta": "La cámara secreta",
        "comentarioNarrador": "Una cámara secreta con cero mantenimiento preventivo.",
    },
    {
        "categoria": "películas",
        "dificultad": "media",
        "pregunta": "¿En qué película aparece el Torneo de los Tres Magos?",
        "opciones": ["El cáliz de fuego", "La orden del Fénix", "El prisionero de Azkaban", "Las reliquias de la muerte parte 1"],
        "respuestaCorrecta": "El cáliz de fuego",
        "comentarioNarrador": "Competencia escolar con alto índice de peligro.",
    },
    {
        "categoria": "películas",
        "dificultad": "media",
        "pregunta": "¿En qué película Harry forma el Ejército de Dumbledore?",
        "opciones": ["La orden del Fénix", "El misterio del príncipe", "El cáliz de fuego", "La cámara secreta"],
        "respuestaCorrecta": "La orden del Fénix",
        "comentarioNarrador": "Cuando la escuela falla, se arma el grupo de estudio clandestino.",
    },
    {
        "categoria": "películas",
        "dificultad": "dificil",
        "pregunta": "¿En qué película aparece el Giratiempo como elemento clave?",
        "opciones": ["El prisionero de Azkaban", "El cáliz de fuego", "La piedra filosofal", "La orden del Fénix"],
        "respuestaCorrecta": "El prisionero de Azkaban",
        "comentarioNarrador": "Viaje temporal, rescate doble y estrés académico.",
    },
    {
        "categoria": "películas",
        "dificultad": "dificil",
        "pregunta": "¿En qué película se revela el libro del Príncipe Mestizo?",
        "opciones": ["El misterio del príncipe", "La orden del Fénix", "Las reliquias de la muerte parte 2", "El cáliz de fuego"],
        "respuestaCorrecta": "El misterio del príncipe",
        "comentarioNarrador": "Libro usado, apuntes peligrosos y consecuencias graves.",
    },
    {
        "categoria": "películas",
        "dificultad": "experto",
        "pregunta": "¿En qué película se destruye la diadema de Ravenclaw?",
        "opciones": ["Las reliquias de la muerte parte 2", "Las reliquias de la muerte parte 1", "El misterio del príncipe", "La orden del Fénix"],
        "respuestaCorrecta": "Las reliquias de la muerte parte 2",
        "comentarioNarrador": "Sala de los Menesteres: útil hasta que arde todo.",
    },
    {
        "categoria": "profesores",
        "dificultad": "facil",
        "pregunta": "¿Quién enseña Pociones durante gran parte de la saga?",
        "opciones": ["Severus Snape", "Remus Lupin", "Filius Flitwick", "Sybill Trelawney"],
        "respuestaCorrecta": "Severus Snape",
        "comentarioNarrador": "Pociones, sarcasmo y tensión permanente.",
    },
    {
        "categoria": "profesores",
        "dificultad": "facil",
        "pregunta": "¿Quién enseña Transformaciones?",
        "opciones": ["Minerva McGonagall", "Pomona Sprout", "Dolores Umbridge", "Sybill Trelawney"],
        "respuestaCorrecta": "Minerva McGonagall",
        "comentarioNarrador": "Elegancia, disciplina y cero paciencia para tonterías.",
    },
    {
        "categoria": "profesores",
        "dificultad": "media",
        "pregunta": "¿Qué profesor enseña Defensa Contra las Artes Oscuras en el tercer año?",
        "opciones": ["Remus Lupin", "Gilderoy Lockhart", "Quirinus Quirrell", "Dolores Umbridge"],
        "respuestaCorrecta": "Remus Lupin",
        "comentarioNarrador": "El mejor maestro de defensa y una persona muy loba.",
    },
    {
        "categoria": "profesores",
        "dificultad": "media",
        "pregunta": "¿Quién enseña Herbología?",
        "opciones": ["Pomona Sprout", "Minerva McGonagall", "Sybill Trelawney", "Madam Hooch"],
        "respuestaCorrecta": "Pomona Sprout",
        "comentarioNarrador": "Plantas mágicas: bonitas, útiles y a veces gritonas.",
    },
    {
        "categoria": "profesores",
        "dificultad": "media",
        "pregunta": "¿Quién enseña Encantamientos?",
        "opciones": ["Filius Flitwick", "Horace Slughorn", "Argus Filch", "Remus Lupin"],
        "respuestaCorrecta": "Filius Flitwick",
        "comentarioNarrador": "Pequeño de estatura, gigante en magia.",
    },
    {
        "categoria": "profesores",
        "dificultad": "dificil",
        "pregunta": "¿Quién enseña Adivinación?",
        "opciones": ["Sybill Trelawney", "Pomona Sprout", "Dolores Umbridge", "Poppy Pomfrey"],
        "respuestaCorrecta": "Sybill Trelawney",
        "comentarioNarrador": "Predicciones intensas, lentes enormes y mucho incienso emocional.",
    },
    {
        "categoria": "profesores",
        "dificultad": "dificil",
        "pregunta": "¿Quién enseña Defensa Contra las Artes Oscuras en segundo año?",
        "opciones": ["Gilderoy Lockhart", "Remus Lupin", "Alastor Moody", "Severus Snape"],
        "respuestaCorrecta": "Gilderoy Lockhart",
        "comentarioNarrador": "Más ego que utilidad práctica.",
    },
    {
        "categoria": "profesores",
        "dificultad": "experto",
        "pregunta": "¿Quién reemplaza a Snape como profesor de Pociones en sexto año?",
        "opciones": ["Horace Slughorn", "Filius Flitwick", "Remus Lupin", "Barty Crouch Jr."],
        "respuestaCorrecta": "Horace Slughorn",
        "comentarioNarrador": "Coleccionista de alumnos destacados y cenas convenientes.",
    },
    {
        "categoria": "villanos",
        "dificultad": "facil",
        "pregunta": "¿Quién es el principal enemigo de Harry?",
        "opciones": ["Lord Voldemort", "Lucius Malfoy", "Fenrir Greyback", "Gilderoy Lockhart"],
        "respuestaCorrecta": "Lord Voldemort",
        "comentarioNarrador": "El villano que ni nariz necesitaba para oler el drama.",
    },
    {
        "categoria": "villanos",
        "dificultad": "media",
        "pregunta": "¿Quién mata a Sirius Black en el Ministerio?",
        "opciones": ["Bellatrix Lestrange", "Lucius Malfoy", "Dolores Umbridge", "Peter Pettigrew"],
        "respuestaCorrecta": "Bellatrix Lestrange",
        "comentarioNarrador": "Una escena que dolió en todos los idiomas.",
    },
    {
        "categoria": "villanos",
        "dificultad": "media",
        "pregunta": "¿Quién es la profesora enviada por el Ministerio en La orden del Fénix?",
        "opciones": ["Dolores Umbridge", "Bellatrix Lestrange", "Narcissa Malfoy", "Rita Skeeter"],
        "respuestaCorrecta": "Dolores Umbridge",
        "comentarioNarrador": "Color rosa, voz dulce y energía de pesadilla institucional.",
    },
    {
        "categoria": "villanos",
        "dificultad": "dificil",
        "pregunta": "¿Qué mortífago pierde una mano y luego recibe una mano plateada?",
        "opciones": ["Peter Pettigrew", "Lucius Malfoy", "Barty Crouch Jr.", "Fenrir Greyback"],
        "respuestaCorrecta": "Peter Pettigrew",
        "comentarioNarrador": "La peor promoción laboral del mundo mágico.",
    },
    {
        "categoria": "villanos",
        "dificultad": "dificil",
        "pregunta": "¿Quién es la serpiente de Voldemort?",
        "opciones": ["Nagini", "Aragog", "Fawkes", "Norberta"],
        "respuestaCorrecta": "Nagini",
        "comentarioNarrador": "Mascota, horrocrux y pésima noticia.",
    },
    {
        "categoria": "frases en español latino",
        "dificultad": "facil",
        "pregunta": "¿Qué frase se usa para activar el Mapa del Merodeador?",
        "opciones": ["Juro solemnemente que mis intenciones no son buenas", "Lumos Máxima", "Mischief completo", "Abierto hasta el amanecer"],
        "respuestaCorrecta": "Juro solemnemente que mis intenciones no son buenas",
        "comentarioNarrador": "Una frase elegante para declarar que vas a hacer travesuras.",
    },
    {
        "categoria": "frases en español latino",
        "dificultad": "facil",
        "pregunta": "¿Qué frase se usa para cerrar el Mapa del Merodeador?",
        "opciones": ["Travesura realizada", "Mapa cerrado", "Fin de la magia", "Mischief terminado"],
        "respuestaCorrecta": "Travesura realizada",
        "comentarioNarrador": "Corto, efectivo y perfecto para ocultar evidencia.",
    },
    {
        "categoria": "frases en español latino",
        "dificultad": "media",
        "pregunta": "¿Qué corrige Hermione al enseñar Wingardium Leviosa?",
        "opciones": ["La pronunciación", "El color de la varita", "La postura de Quidditch", "La casa de Ron"],
        "respuestaCorrecta": "La pronunciación",
        "comentarioNarrador": "No es solo decirlo, es decirlo con superioridad académica.",
    },
    {
        "categoria": "frases en español latino",
        "dificultad": "media",
        "pregunta": "¿Qué palabra dice Snape que resume gran parte de su historia?",
        "opciones": ["Siempre", "Nunca", "Lumos", "Adiós"],
        "respuestaCorrecta": "Siempre",
        "comentarioNarrador": "Una palabra, demasiada carga emocional.",
    },
    {
        "categoria": "escenas icónicas",
        "dificultad": "facil",
        "pregunta": "¿Dónde compra Harry su primera varita?",
        "opciones": ["Ollivanders", "Gringotts", "Las Tres Escobas", "Borgin y Burkes"],
        "respuestaCorrecta": "Ollivanders",
        "comentarioNarrador": "La varita elige al mago. El ticket no elige al bolsillo.",
    },
    {
        "categoria": "escenas icónicas",
        "dificultad": "facil",
        "pregunta": "¿Qué deporte mágico se juega con escobas?",
        "opciones": ["Quidditch", "Ajedrez mágico", "Gobstones", "Exploding Snap"],
        "respuestaCorrecta": "Quidditch",
        "comentarioNarrador": "Deporte escolar con altura, golpes y cero sentido de seguridad.",
    },
    {
        "categoria": "escenas icónicas",
        "dificultad": "media",
        "pregunta": "¿Qué pieza de ajedrez monta Ron en la primera película?",
        "opciones": ["Caballo", "Torre", "Alfil", "Rey"],
        "respuestaCorrecta": "Caballo",
        "comentarioNarrador": "Ajedrez mágico: estrategia, sacrificio y contusiones.",
    },
    {
        "categoria": "escenas icónicas",
        "dificultad": "media",
        "pregunta": "¿Cómo llegan Harry y Ron a Hogwarts en la segunda película?",
        "opciones": ["En el auto volador", "En un dragón", "En la moto de Sirius", "En un traslador"],
        "respuestaCorrecta": "En el auto volador",
        "comentarioNarrador": "Llegar tarde es malo. Llegar en auto volador es legendario.",
    },
    {
        "categoria": "escenas icónicas",
        "dificultad": "dificil",
        "pregunta": "¿Qué criatura salva a Harry en la Cámara de los Secretos?",
        "opciones": ["Fawkes", "Buckbeak", "Dobby", "Hedwig"],
        "respuestaCorrecta": "Fawkes",
        "comentarioNarrador": "Fénix de emergencia, servicio completo.",
    },
    {
        "categoria": "escenas icónicas",
        "dificultad": "dificil",
        "pregunta": "¿En qué lugar se destruye el diario de Tom Riddle?",
        "opciones": ["Cámara de los Secretos", "Gran Comedor", "Bosque Prohibido", "Ministerio de Magia"],
        "respuestaCorrecta": "Cámara de los Secretos",
        "comentarioNarrador": "Diario destruido, trauma desbloqueado.",
    },
    {
        "categoria": "escenas icónicas",
        "dificultad": "experto",
        "pregunta": "¿Qué objeto usa Harry para respirar bajo el agua en la segunda prueba del Torneo?",
        "opciones": ["Branquialgas", "Giratiempo", "Poción multijugos", "Deluminador"],
        "respuestaCorrecta": "Branquialgas",
        "comentarioNarrador": "Sabor dudoso, utilidad indiscutible.",
    },
    {
        "categoria": "casas de Hogwarts",
        "dificultad": "facil",
        "pregunta": "¿Qué casa tiene como símbolo un león?",
        "opciones": ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"],
        "respuestaCorrecta": "Gryffindor",
        "comentarioNarrador": "Valentía, drama y ganas de romper reglas.",
    },
    {
        "categoria": "casas de Hogwarts",
        "dificultad": "facil",
        "pregunta": "¿Qué casa tiene como símbolo una serpiente?",
        "opciones": ["Slytherin", "Ravenclaw", "Hufflepuff", "Gryffindor"],
        "respuestaCorrecta": "Slytherin",
        "comentarioNarrador": "Ambición, elegancia y reputación complicada.",
    },
    {
        "categoria": "casas de Hogwarts",
        "dificultad": "media",
        "pregunta": "¿A qué casa pertenece Luna Lovegood?",
        "opciones": ["Ravenclaw", "Hufflepuff", "Gryffindor", "Slytherin"],
        "respuestaCorrecta": "Ravenclaw",
        "comentarioNarrador": "Creativa, extraña y más sabia de lo que parece.",
    },
    {
        "categoria": "casas de Hogwarts",
        "dificultad": "media",
        "pregunta": "¿A qué casa pertenece Cedric Diggory?",
        "opciones": ["Hufflepuff", "Ravenclaw", "Slytherin", "Gryffindor"],
        "respuestaCorrecta": "Hufflepuff",
        "comentarioNarrador": "Leal, noble y demasiado bueno para ese torneo.",
    },
    {
        "categoria": "horrocruxes",
        "dificultad": "media",
        "pregunta": "¿Qué objeto de Tom Riddle es un horrocrux?",
        "opciones": ["Diario", "Capa", "Giratiempo", "Recordadora"],
        "respuestaCorrecta": "Diario",
        "comentarioNarrador": "Un diario con más red flags que romance tóxico.",
    },
    {
        "categoria": "horrocruxes",
        "dificultad": "media",
        "pregunta": "¿Qué serpiente es un horrocrux?",
        "opciones": ["Nagini", "Aragog", "Fawkes", "Norberta"],
        "respuestaCorrecta": "Nagini",
        "comentarioNarrador": "Serpiente, compañera y pésima noticia.",
    },
    {
        "categoria": "horrocruxes",
        "dificultad": "dificil",
        "pregunta": "¿Qué objeto de Hufflepuff se convierte en horrocrux?",
        "opciones": ["Copa", "Diadema", "Espada", "Guardapelo"],
        "respuestaCorrecta": "Copa",
        "comentarioNarrador": "Una copa elegante con contenido moralmente cuestionable.",
    },
    {
        "categoria": "horrocruxes",
        "dificultad": "dificil",
        "pregunta": "¿Qué objeto de Ravenclaw se convierte en horrocrux?",
        "opciones": ["Diadema", "Copa", "Guardapelo", "Diario"],
        "respuestaCorrecta": "Diadema",
        "comentarioNarrador": "Sabiduría, pero poseída por el peor inquilino.",
    },
    {
        "categoria": "lugares",
        "dificultad": "facil",
        "pregunta": "¿Cómo se llama el banco de los magos?",
        "opciones": ["Gringotts", "Ollivanders", "Honeydukes", "Azkaban"],
        "respuestaCorrecta": "Gringotts",
        "comentarioNarrador": "Banco mágico: más seguro que tu contraseña, casi siempre.",
    },
    {
        "categoria": "lugares",
        "dificultad": "facil",
        "pregunta": "¿Cómo se llama la prisión mágica?",
        "opciones": ["Azkaban", "Hogsmeade", "Gringotts", "Beauxbatons"],
        "respuestaCorrecta": "Azkaban",
        "comentarioNarrador": "Vacaciones no incluidas. Dementores sí.",
    },
    {
        "categoria": "lugares",
        "dificultad": "media",
        "pregunta": "¿Dónde se encuentra la estación para abordar el Expreso de Hogwarts?",
        "opciones": ["King's Cross", "Hogsmeade", "Gringotts", "El Ministerio"],
        "respuestaCorrecta": "King's Cross",
        "comentarioNarrador": "La magia empieza con una pared y mucha confianza.",
    },
    {
        "categoria": "lugares",
        "dificultad": "media",
        "pregunta": "¿Qué pueblo mágico visitan los estudiantes de Hogwarts?",
        "opciones": ["Hogsmeade", "Godric's Hollow", "Little Whinging", "Privet Drive"],
        "respuestaCorrecta": "Hogsmeade",
        "comentarioNarrador": "Dulces, cerveza de mantequilla y excursión con permiso.",
    },
    {
        "categoria": "quidditch",
        "dificultad": "facil",
        "pregunta": "¿Qué jugador busca la Snitch dorada?",
        "opciones": ["Buscador", "Guardián", "Golpeador", "Cazador"],
        "respuestaCorrecta": "Buscador",
        "comentarioNarrador": "El puesto con más presión y mejor foto de portada.",
    },
    {
        "categoria": "quidditch",
        "dificultad": "media",
        "pregunta": "¿Qué pelota se usa para anotar en los aros?",
        "opciones": ["Quaffle", "Bludger", "Snitch", "Recordadora"],
        "respuestaCorrecta": "Quaffle",
        "comentarioNarrador": "La pelota normal en un deporte nada normal.",
    },
    {
        "categoria": "quidditch",
        "dificultad": "media",
        "pregunta": "¿Qué pelotas golpean a los jugadores en Quidditch?",
        "opciones": ["Bludgers", "Quaffles", "Snitches", "Mandrágoras"],
        "respuestaCorrecta": "Bludgers",
        "comentarioNarrador": "Como si volar en escoba no fuera suficiente riesgo.",
    },

    {
        "categoria": "hechizos cotidianos",
        "dificultad": "facil",
        "pregunta": "¿Qué hechizo usarías para arreglar tus lentes rotos después de subirte al metro en hora pico?",
        "opciones": ["Oculus Reparo", "Lumos", "Sectumsempra", "Avada Kedavra"],
        "respuestaCorrecta": "Oculus Reparo",
        "comentarioNarrador": "Avada Kedavra era muy extremo para unos lentes rotos, ¿no crees?",
    },
    {
        "categoria": "vida adulta mágica",
        "dificultad": "media",
        "pregunta": "¿Si tu ex te manda un mensaje a las 3 AM, qué hechizo le lanzas a tu celular?",
        "opciones": ["Obliviate", "Incendio", "Bombarda Máxima", "Reducto"],
        "respuestaCorrecta": "Incendio",
        "comentarioNarrador": "Fuego. La única solución razonable para un 'hola perdida'.",
    },
    {
        "categoria": "criaturas problemáticas",
        "dificultad": "media",
        "pregunta": "¿Qué criatura mágica te chuparía toda la alegría igual que el SAT?",
        "opciones": ["Dementor", "Boggart", "Duendecillo de Cornualles", "Nargle"],
        "respuestaCorrecta": "Dementor",
        "comentarioNarrador": "Al menos el Dementor no te pide firma electrónica para atacarte.",
    },
    {
        "categoria": "transporte mágico",
        "dificultad": "media",
        "pregunta": "¿Cómo llegas a Hogwarts si perdiste el tren porque te quedaste tragando tacos de canasta?",
        "opciones": ["Ford Anglia Volador", "Microbús Mágico", "Uber en escoba", "Traslador"],
        "respuestaCorrecta": "Ford Anglia Volador",
        "comentarioNarrador": "Llegar en coche volador es tener estilo, chocar contra el sauce boxeador es tener pésimo seguro.",
    },
    {
        "categoria": "artefactos misteriosos",
        "dificultad": "dificil",
        "pregunta": "¿Qué artefacto mágico te diría exactamente cuántas deudas tienes en Coppel si lo miras fijo?",
        "opciones": ["El Espejo de Oesed", "El Chivatoscopio", "El Pensadero", "La Recordadora"],
        "respuestaCorrecta": "El Espejo de Oesed",
        "comentarioNarrador": "El espejo muestra tu mayor deseo: liquidar esa licuadora a 48 meses sin intereses.",
    },
    {
        "categoria": "hechizos oscuros",
        "dificultad": "experto",
        "pregunta": "¿Qué maldición imperdonable te da ganas de lanzarle al wey que no pone direccional?",
        "opciones": ["Cruciatus", "Imperius", "Avada Kedavra", "Sectumsempra"],
        "respuestaCorrecta": "Cruciatus",
        "comentarioNarrador": "Ilegal en el mundo mágico, pero tentadora en Periférico.",
    },
    {
        "categoria": "criaturas domésticas",
        "dificultad": "facil",
        "pregunta": "¿A quién llamarías para que te limpie el cuarto después de la peda?",
        "opciones": ["Dobby", "Kreacher", "Winky", "Tu mamá (con la chancla)"],
        "respuestaCorrecta": "Dobby",
        "comentarioNarrador": "Un calcetín sucio y te abandona, ojo con las propinas.",
    },
    {
        "categoria": "quidditch y deportes",
        "dificultad": "media",
        "pregunta": "¿Qué pelota del Quidditch te golpea tan duro como darte cuenta de que es quincena y ya no tienes dinero?",
        "opciones": ["Bludger", "Quaffle", "Snitch", "La del Cruz Azul"],
        "respuestaCorrecta": "Bludger",
        "comentarioNarrador": "Masa sólida diseñada para romperte los huesos... y tus ilusiones financieras.",
    },
    {
        "categoria": "personajes y drama",
        "dificultad": "dificil",
        "pregunta": "¿Qué maestro de Hogwarts sería el típico profe de universidad que te reprueba por no poner comas?",
        "opciones": ["Severus Snape", "Minerva McGonagall", "Dolores Umbridge", "Gilderoy Lockhart"],
        "respuestaCorrecta": "Severus Snape",
        "comentarioNarrador": "Diez puntos menos para tu casa por falta de formato APA.",
    },
    {
        "categoria": "vida escolar",
        "dificultad": "media",
        "pregunta": "¿Qué poción te tomarías antes de exponer en clase para verte muy salsa?",
        "opciones": ["Felix Felicis", "Poción Multijugos", "Veritaserum", "Amortentia"],
        "respuestaCorrecta": "Felix Felicis",
        "comentarioNarrador": "Suerte líquida. Básicamente un Red Bull pero mágico y caro.",
    },
    {
        "categoria": "horrocruxes",
        "dificultad": "media",
        "pregunta": "¿Qué harías si descubres que tu tesis de licenciatura es un Horrocrux?",
        "opciones": ["Apuñalarla con un colmillo de basilisco", "Mandarla a encuadernar en piel", "Dejársela a Dumbledore", "Llorar en posición fetal"],
        "respuestaCorrecta": "Apuñalarla con un colmillo de basilisco",
        "comentarioNarrador": "Si te costó el alma hacerla, técnicamente es un horrocrux.",
    },
    {
        "categoria": "hechizos defensivos",
        "dificultad": "facil",
        "pregunta": "¿Qué patronus invocarías para defenderte del señor de los tamales que ya no trae de verde?",
        "opciones": ["Un bolillo", "Expecto Patronum", "Un ajolote", "Una doña enojada"],
        "respuestaCorrecta": "Expecto Patronum",
        "comentarioNarrador": "No servirá de mucho si ya se acabaron los tamales verdes, la verdad.",
    },
    {
        "categoria": "villanos",
        "dificultad": "media",
        "pregunta": "¿Quién es la señora de los gatos, pero en versión dictadora escolar con fetiches por el rosa?",
        "opciones": ["Dolores Umbridge", "Bellatrix Lestrange", "Rita Skeeter", "Narcissa Malfoy"],
        "respuestaCorrecta": "Dolores Umbridge",
        "comentarioNarrador": "Si el departamento de quejas tuviera cara, sería la suya.",
    },
    {
        "categoria": "artefactos",
        "dificultad": "media",
        "pregunta": "¿Con qué mapa puedes stalkear a tu crush por todo el castillo sin que se entere?",
        "opciones": ["Mapa del Merodeador", "Google Maps", "Espejo de Oesed", "Chivatoscopio"],
        "respuestaCorrecta": "Mapa del Merodeador",
        "comentarioNarrador": "Tóxico, mágico y extremadamente útil.",
    },
    {
        "categoria": "criaturas",
        "dificultad": "dificil",
        "pregunta": "¿Qué criatura usarías como Uber para ir al Aurrerá volando sin pagar gasolina?",
        "opciones": ["Hipogrifo", "Thestral", "Dragón", "Escoba de segunda mano"],
        "respuestaCorrecta": "Hipogrifo",
        "comentarioNarrador": "Nada más no lo ofendas o te deja a medio periférico.",
    },
    {
        "categoria": "lugares",
        "dificultad": "facil",
        "pregunta": "¿Dónde escondes las chelas para que no te las encuentren tus papás?",
        "opciones": ["Sala de los Menesteres", "Cámara de los Secretos", "Bosque Prohibido", "En el refri, y que sea lo que Dios quiera"],
        "respuestaCorrecta": "Sala de los Menesteres",
        "comentarioNarrador": "Aparece justo cuando la necesitas y con hielos.",
    },
    {
        "categoria": "hechizos",
        "dificultad": "facil",
        "pregunta": "¿Qué hechizo usas para alcanzar el control remoto sin levantarte del sillón?",
        "opciones": ["Accio", "Levicorpus", "Alohomora", "Ascendio"],
        "respuestaCorrecta": "Accio",
        "comentarioNarrador": "El sueño de todo perezoso mágico.",
    },
    {
        "categoria": "personajes",
        "dificultad": "experto",
        "pregunta": "¿Quién es el típico vato que se roba el crédito del trabajo en equipo en la uni?",
        "opciones": ["Gilderoy Lockhart", "Draco Malfoy", "Peter Pettigrew", "Lucius Malfoy"],
        "respuestaCorrecta": "Gilderoy Lockhart",
        "comentarioNarrador": "El maestro de colgarse medallitas ajenas y salir bien en la foto.",
    },
    {
        "categoria": "magia",
        "dificultad": "media",
        "pregunta": "¿Cómo te evitas el tráfico godín de las 6 PM?",
        "opciones": ["Aparición", "Polvos Flu", "Traslador", "Llorando en el coche"],
        "respuestaCorrecta": "Aparición",
        "comentarioNarrador": "Teletransporte. Cuidado de no dejar una pierna en la oficina.",
    },
    {
        "categoria": "hechizos",
        "dificultad": "media",
        "pregunta": "¿Qué hechizo usarías si se va la luz justo cuando estabas viendo el final de la novela?",
        "opciones": ["Lumos Máxima", "Incendio", "Sonorus", "Crucio (al poste de luz)"],
        "respuestaCorrecta": "Lumos Máxima",
        "comentarioNarrador": "O podrías usar el celular, pero la magia da más estilo.",
    },
    {
        "categoria": "pociones",
        "dificultad": "dificil",
        "pregunta": "¿Qué poción le darías a ese tío necio en Navidad para que diga la verdad sobre los terrenos de la abuela?",
        "opciones": ["Veritaserum", "Amortentia", "Felix Felicis", "Poción Multijugos"],
        "respuestaCorrecta": "Veritaserum",
        "comentarioNarrador": "Suero de la verdad. Prepárate para secretos que no querías saber.",
    },
    {
        "categoria": "hechizos",
        "dificultad": "media",
        "pregunta": "¿Cómo callas al de las tortillas que trae la bocina a todo volumen a las 7 AM?",
        "opciones": ["Silencio", "Muffliato", "Sectumsempra", "Avada Kedavra"],
        "respuestaCorrecta": "Silencio",
        "comentarioNarrador": "Paz y tranquilidad mágica, sin ir a la cárcel de Azkaban.",
    },
    {
        "categoria": "criaturas",
        "dificultad": "dificil",
        "pregunta": "¿Qué criatura se disfraza de tus peores miedos, como ver 'Escribiendo...' de tu jefe el domingo?",
        "opciones": ["Boggart", "Dementor", "Basilisco", "Lethifold"],
        "respuestaCorrecta": "Boggart",
        "comentarioNarrador": "Para vencerlo, ríete. O renuncia, ambas sirven.",
    },
    {
        "categoria": "películas",
        "dificultad": "experto",
        "pregunta": "¿Qué profesor de Defensa contra las Artes Oscuras olía a ajo como taquería callejera?",
        "opciones": ["Quirinus Quirrell", "Remus Lupin", "Gilderoy Lockhart", "Mad-Eye Moody"],
        "respuestaCorrecta": "Quirinus Quirrell",
        "comentarioNarrador": "Ocultaba a Voldemort en la nuca y espantaba vampiros... o eso decía.",
    },
    {
        "categoria": "magia",
        "dificultad": "facil",
        "pregunta": "¿Qué usas para volar sin pagar sobrepeso de equipaje en Aeroméxico?",
        "opciones": ["Escoba Saeta de Fuego", "Alfombra voladora", "Polvos Flu", "Ford Anglia Volador"],
        "respuestaCorrecta": "Escoba Saeta de Fuego",
        "comentarioNarrador": "Cero hasta 100 en 10 segundos. Ojo con los mosquitos.",
    },
    {
        "categoria": "objetos",
        "dificultad": "media",
        "pregunta": "¿Qué objeto te avisa que se te olvidó algo, pero no te dice qué (como cuando vas al súper)?",
        "opciones": ["La Recordadora", "El Chivatoscopio", "El Mapa del Merodeador", "La snitch dorada"],
        "respuestaCorrecta": "La Recordadora",
        "comentarioNarrador": "El objeto mágico más estresante y menos útil jamás inventado.",
    },
    {
        "categoria": "criaturas",
        "dificultad": "dificil",
        "pregunta": "¿Qué animal te regalarían tus tías en tu cumpleaños mágico, en lugar de dinero?",
        "opciones": ["Lechuza", "Rata", "Sapo", "Gato"],
        "respuestaCorrecta": "Sapo",
        "comentarioNarrador": "Neville tenía uno. Nadie sabía por qué.",
    },
    {
        "categoria": "hechizos",
        "dificultad": "media",
        "pregunta": "¿Con qué hechizo inflas a la tía criticona que opina de tu peso en la cena navideña?",
        "opciones": ["Hechizo inflador (como a Marge)", "Engorgio", "Reducto", "Levicorpus"],
        "respuestaCorrecta": "Hechizo inflador (como a Marge)",
        "comentarioNarrador": "Harry la mandó a la estratosfera. Pésimo manejo de ira, pero se lo merecía.",
    },
]


def _now():
    return time.time()


def normalize_difficulty(value: str):
    value = str(value or "media").strip().lower()
    value = value.replace("í", "i").replace("á", "a")
    return value


def difficulty_points(value: str):
    normalized = normalize_difficulty(value)
    return DIFFICULTY_POINTS.get(normalized, 100)


def shuffle_options(question: dict):
    options = list(question["opciones"])
    random.shuffle(options)
    return options


def get_answer_label(options, correct):
    try:
        index = options.index(correct)
        return ANSWER_LABELS[index]
    except ValueError:
        return ""


def build_question_view(question: dict, options=None):
    options = options or shuffle_options(question)
    correct = question["respuestaCorrecta"]

    return {
        "categoria": question["categoria"],
        "dificultad": question["dificultad"],
        "pregunta": question["pregunta"],
        "opciones": options,
        "respuestaCorrecta": correct,
        "respuestaLabel": get_answer_label(options, correct),
        "comentarioNarrador": question["comentarioNarrador"],
        "puntosBase": difficulty_points(question["dificultad"]),
    }


def pick_question(previous_state=None):
    previous_state = previous_state or {}
    trivia_session = previous_state.get("trivia_session") or {}

    used_ids = trivia_session.get("used_question_ids") or []
    used_ids = set(used_ids)

    indexed_pool = list(enumerate(TRIVIA_POOL))
    available = [
        (idx, question)
        for idx, question in indexed_pool
        if idx not in used_ids
    ]

    if not available:
        available = indexed_pool
        used_ids = set()

    question_id, question = random.choice(available)
    return question_id, deepcopy(question), list(used_ids)


def build_trivia_state(room_code=None, previous_state=None):
    previous_state = previous_state or {}
    previous_session = previous_state.get("trivia_session") or {}

    previous_round_number = int(previous_session.get("round_number") or 0)
    total_questions = int(previous_session.get("total_questions") or DEFAULT_TOTAL_QUESTIONS)

    question_id, question, used_ids = pick_question(previous_state)
    options = shuffle_options(question)
    question_view = build_question_view(question, options)

    used_ids.append(question_id)

    return {
        "phase": PHASE,
        "game_id": GAME_ID,
        "round_id": str(uuid.uuid4()),
        "round_number": previous_round_number + 1,
        "title": "Trivia del Mundo Mágico",
        "subtitle": "Modo principal de Copa de las Casas. Responde rápido, acumula rachas y defiende tu casa.",
        "question": question_view["pregunta"],
        "options": question_view["opciones"],
        "correct": question_view["respuestaCorrecta"],
        "correct_label": question_view["respuestaLabel"],
        "category": question_view["categoria"],
        "difficulty": question_view["dificultad"],
        "narrator": question_view["comentarioNarrador"],
        "duration_seconds": QUESTION_SECONDS,
        "started_at": _now() + 3.5,
        "points_correct": question_view["puntosBase"],
        "points_wrong": WRONG_POINTS,
        "points_fastest": FASTEST_CORRECT_BONUS,
        "points_streak_3": STREAK_3_BONUS,
        "question_payload": question_view,
        "answered": {},
        "answers": {},
        "answer_order": [],
        "correct_players": [],
        "fastest_correct": None,
        "trivia_result": None,
        "point_events": [],
        "scored": False,
        "host": previous_state.get("host"),
        "trivia_session": {
            "room_code": room_code,
            "round_number": previous_round_number + 1,
            "total_questions": total_questions,
            "used_question_ids": used_ids,
            "streaks": previous_session.get("streaks") or {},
            "correct_counts": previous_session.get("correct_counts") or {},
            "wrong_counts": previous_session.get("wrong_counts") or {},
            "fastest_counts": previous_session.get("fastest_counts") or {},
            "history": previous_session.get("history") or [],
        },
        "visual": {
            "mode": "premium_great_hall",
            "theme": "gran_comedor",
        },
    }


def score_answer(state: dict, player_name: str, answer: str, client_elapsed_ms=None):
    state = deepcopy(state or {})
    player_name = str(player_name or "").strip()
    answer = str(answer or "").strip()

    if state.get("phase") != PHASE:
        return {
            "state": state,
            "accepted": False,
            "message": "La trivia no está activa.",
            "points": 0,
            "correct": False,
        }

    if not player_name:
        return {
            "state": state,
            "accepted": False,
            "message": "No se detectó jugador.",
            "points": 0,
            "correct": False,
        }

    answered = state.get("answered") or {}

    if answered.get(player_name):
        return {
            "state": state,
            "accepted": False,
            "message": "Ya respondiste esta pregunta.",
            "points": 0,
            "correct": False,
        }

    started_at = float(state.get("started_at") or _now())
    duration = float(state.get("duration_seconds") or QUESTION_SECONDS)

    if client_elapsed_ms is not None:
        elapsed = max(0, int(client_elapsed_ms) / 1000)
    else:
        elapsed = max(0, _now() - started_at)

    if elapsed > duration + 1:
        return {
            "state": state,
            "accepted": False,
            "message": "Se acabó el tiempo.",
            "points": 0,
            "correct": False,
            "late": True,
        }

    correct_answer = state.get("correct")
    is_correct = answer == correct_answer

    base_points = int(state.get("points_correct") or 100)
    points = base_points if is_correct else WRONG_POINTS

    answers = state.get("answers") or {}
    answer_order = state.get("answer_order") or []
    correct_players = state.get("correct_players") or []

    answers[player_name] = {
        "answer": answer,
        "correct": is_correct,
        "elapsed_seconds": round(elapsed, 3),
        "points_base": points,
    }

    answered[player_name] = True

    answer_order.append({
        "player_name": player_name,
        "answer": answer,
        "correct": is_correct,
        "elapsed_seconds": round(elapsed, 3),
    })

    if is_correct:
        correct_players.append(player_name)

    state["answers"] = answers
    state["answered"] = answered
    state["answer_order"] = answer_order
    state["correct_players"] = correct_players

    if is_correct:
        message = random.choice(NARRATOR_CORRECT_LINES)
    else:
        message = random.choice(NARRATOR_WRONG_LINES)

    return {
        "state": state,
        "accepted": True,
        "message": message,
        "points": points,
        "correct": is_correct,
        "elapsed_seconds": round(elapsed, 3),
    }


def _add_point_event(events, player_name, points, label):
    if not player_name or points == 0:
        return

    events.append({
        "player_name": player_name,
        "points": points,
        "label": label,
    })


def resolve_for_reveal(state: dict, players=None):
    state = deepcopy(state or {})
    players = players or []

    if state.get("scored"):
        return state, state.get("point_events", []), True

    answers = state.get("answers") or {}
    session = state.get("trivia_session") or {}

    streaks = session.get("streaks") or {}
    correct_counts = session.get("correct_counts") or {}
    wrong_counts = session.get("wrong_counts") or {}
    fastest_counts = session.get("fastest_counts") or {}

    point_events = []
    player_results = []

    correct_entries = [
        {
            "player_name": name,
            **payload,
        }
        for name, payload in answers.items()
        if payload.get("correct")
    ]

    fastest_correct = None

    if correct_entries:
        fastest_correct = min(
            correct_entries,
            key=lambda item: float(item.get("elapsed_seconds") or 999),
        )

    for player in players:
        name = player.get("name")
        house = player.get("house")
        payload = answers.get(name)

        if not payload:
            streaks[name] = 0
            player_results.append({
                "player_name": name,
                "house": house,
                "answered": False,
                "correct": False,
                "answer": None,
                "elapsed_seconds": None,
                "points": 0,
                "labels": ["Sin respuesta"],
            })
            continue

        is_correct = bool(payload.get("correct"))
        points = 0
        labels = []

        if is_correct:
            base = int(payload.get("points_base") or state.get("points_correct") or 100)
            points += base
            labels.append(f"Correcta +{base}")

            streaks[name] = int(streaks.get(name) or 0) + 1
            correct_counts[name] = int(correct_counts.get(name) or 0) + 1

            if fastest_correct and fastest_correct.get("player_name") == name:
                points += FASTEST_CORRECT_BONUS
                fastest_counts[name] = int(fastest_counts.get(name) or 0) + 1
                labels.append(random.choice(FASTEST_LINES) + f" +{FASTEST_CORRECT_BONUS}")

            if streaks[name] > 0 and streaks[name] % 3 == 0:
                points += STREAK_3_BONUS
                labels.append(random.choice(STREAK_LINES) + f" +{STREAK_3_BONUS}")

        else:
            streaks[name] = 0
            wrong_counts[name] = int(wrong_counts.get(name) or 0) + 1
            labels.append("Incorrecta")

        _add_point_event(
            point_events,
            name,
            points,
            " · ".join(labels),
        )

        player_results.append({
            "player_name": name,
            "house": house,
            "answered": True,
            "correct": is_correct,
            "answer": payload.get("answer"),
            "elapsed_seconds": payload.get("elapsed_seconds"),
            "points": points,
            "labels": labels,
            "streak": streaks.get(name, 0),
        })

    history = session.get("history") or []
    history.append({
        "round_number": state.get("round_number"),
        "question": state.get("question"),
        "category": state.get("category"),
        "difficulty": state.get("difficulty"),
        "correct": state.get("correct"),
        "correct_label": state.get("correct_label"),
        "fastest_correct": fastest_correct,
        "player_results": player_results,
    })

    session["streaks"] = streaks
    session["correct_counts"] = correct_counts
    session["wrong_counts"] = wrong_counts
    session["fastest_counts"] = fastest_counts
    session["history"] = history[-60:]

    state["phase"] = "results_trivia"
    state["trivia_session"] = session
    state["trivia_result"] = {
        "correct": state.get("correct"),
        "correct_label": state.get("correct_label"),
        "commentary": state.get("narrator"),
        "fastest_correct": fastest_correct,
        "player_results": player_results,
        "narrator_correct": random.choice(NARRATOR_CORRECT_LINES),
        "narrator_wrong": random.choice(NARRATOR_WRONG_LINES),
        "summary": "Pregunta resuelta. El host puede avanzar a la siguiente pregunta.",
    }
    state["point_events"] = point_events
    state["scored"] = True

    return state, point_events, True


@router.post("/api/host/{room_code}/start_trivia")
async def start_trivia(room_code: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    room = (
        supabase.table("rooms")
        .select("game_state")
        .eq("room_code", room_code.upper())
        .execute()
    )

    previous_state = {}

    if room.data:
        previous_state = room.data[0].get("game_state") or {}

    new_state = build_trivia_state(
        room_code=room_code.upper(),
        previous_state=previous_state,
    )

    supabase.table("rooms").update({
        "status": "playing",
        "game_state": new_state,
    }).eq("room_code", room_code.upper()).execute()

    return {
        "message": "Trivia del Mundo Mágico iniciada",
        "game_id": GAME_ID,
        "round_number": new_state.get("round_number"),
    }


@router.post("/api/host/{room_code}/trivia_next")
async def trivia_next(room_code: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    room = (
        supabase.table("rooms")
        .select("game_state")
        .eq("room_code", room_code.upper())
        .execute()
    )

    if not room.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    previous_state = room.data[0].get("game_state") or {}

    new_state = build_trivia_state(
        room_code=room_code.upper(),
        previous_state=previous_state,
    )

    supabase.table("rooms").update({
        "status": "playing",
        "game_state": new_state,
    }).eq("room_code", room_code.upper()).execute()

    return {
        "message": "Siguiente pregunta de trivia",
        "round_number": new_state.get("round_number"),
        "question": new_state.get("question"),
    }


@router.get("/api/trivia/questions")
async def get_trivia_questions():
    return {
        "total": len(TRIVIA_POOL),
        "questions": TRIVIA_POOL,
    }


@router.post("/api/player/trivia_answer")
async def trivia_answer_endpoint(request: Request):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    raw_body = await request.body()

    print("========== TRIVIA ANSWER RAW BODY ==========", flush=True)
    print(raw_body.decode("utf-8", errors="replace"), flush=True)
    print("========== END TRIVIA ANSWER RAW BODY ==========", flush=True)

    try:
        payload = await request.json()
    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"JSON inválido: {repr(error)}"
        )

    print("TRIVIA PAYLOAD:", payload, flush=True)

    room_code = (
        payload.get("room_code")
        or payload.get("room")
        or payload.get("roomCode")
        or payload.get("codigo")
    )

    player_name = (
        payload.get("player_name")
        or payload.get("player")
        or payload.get("playerName")
        or payload.get("name")
        or payload.get("nombre")
    )

    answer = payload.get("answer")
    answer_index = payload.get("answer_index")
    answer_label = payload.get("answer_label")
    client_elapsed_ms = payload.get("client_elapsed_ms")

    if not room_code:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Falta room_code",
                "payload_recibido": payload,
            },
        )

    if not player_name:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Falta player_name",
                "payload_recibido": payload,
            },
        )

    room_code = str(room_code).upper().strip()
    player_name = str(player_name).strip()

    room = (
        supabase.table("rooms")
        .select("id, status, game_state")
        .eq("room_code", room_code)
        .execute()
    )

    print("TRIVIA ROOM:", room.data, flush=True)

    if not room.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    room_data = room.data[0]
    state = room_data.get("game_state") or {}

    print("TRIVIA PHASE BEFORE:", state.get("phase"), flush=True)
    print("TRIVIA QUESTION:", state.get("question"), flush=True)
    print("TRIVIA OPTIONS:", state.get("options"), flush=True)
    print("TRIVIA ANSWERS BEFORE:", state.get("answers"), flush=True)

    if state.get("phase") != "trivia":
        raise HTTPException(
            status_code=409,
            detail={
                "error": "La trivia no está activa.",
                "phase_actual": state.get("phase"),
                "room_status": room_data.get("status"),
                "mensaje": "Si aparece lobby o results_trivia, la pregunta ya terminó o aún no inició.",
            },
        )

    options = state.get("options") or []

    if answer is None and answer_index is not None:
        try:
            idx = int(answer_index)
            if 0 <= idx < len(options):
                answer = options[idx]
        except Exception:
            answer = None

    if answer is None and answer_label is not None:
        label = str(answer_label).upper().strip()
        labels = ["A", "B", "C", "D"]

        if label in labels:
            idx = labels.index(label)
            if 0 <= idx < len(options):
                answer = options[idx]

    if answer is None:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Falta answer",
                "payload_recibido": payload,
                "opciones_actuales": options,
            },
        )

    try:
        client_elapsed_ms = int(client_elapsed_ms) if client_elapsed_ms is not None else None
    except Exception:
        client_elapsed_ms = None

    result = score_answer(
        state=state,
        player_name=player_name,
        answer=str(answer),
        client_elapsed_ms=client_elapsed_ms,
    )

    print("TRIVIA RESULT ACCEPTED:", result.get("accepted"), flush=True)
    print("TRIVIA RESULT MESSAGE:", result.get("message"), flush=True)
    print("TRIVIA RESULT CORRECT:", result.get("correct"), flush=True)
    print("TRIVIA ANSWERS AFTER:", result.get("state", {}).get("answers"), flush=True)

    supabase.table("rooms").update({
        "game_state": result["state"],
    }).eq("room_code", room_code).execute()

    verify = (
        supabase.table("rooms")
        .select("game_state")
        .eq("room_code", room_code)
        .execute()
    )

    saved_state = verify.data[0].get("game_state") if verify.data else {}
    saved_answers = (saved_state or {}).get("answers") or {}

    print("TRIVIA SAVED ANSWERS:", saved_answers, flush=True)

    return {
        "message": result.get("message", "Respuesta guardada."),
        "accepted": result.get("accepted", False),
        "points": result.get("points", 0),
        "correct": result.get("correct", False),
        "elapsed_seconds": result.get("elapsed_seconds"),
        "late": result.get("late", False),
        "phase": saved_state.get("phase"),
        "saved": player_name in saved_answers,
        "answer_saved": saved_answers.get(player_name),
    }

@router.post("/api/trivia/{room_code}/finish")
async def finish_trivia_endpoint(request: Request, room_code: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Faltan credenciales")

    try:
        payload = await request.json()
    except Exception:
        payload = {}

    tv_token = payload.get("tv_token")
    force = payload.get("force", False)

    if not tv_token:
        raise HTTPException(status_code=403, detail="Falta tv_token. Solo la TV puede cerrar la pregunta.")

    room_code = str(room_code).upper().strip()

    room = (
        supabase.table("rooms")
        .select("id, game_state")
        .eq("room_code", room_code)
        .execute()
    )

    if not room.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    room_id = room.data[0]["id"]
    state = room.data[0].get("game_state") or {}

    if state.get("phase") != "trivia":
        return {"phase": state.get("phase")}

    if state.get("scored") or state.get("results_applied"):
        return {"phase": state.get("phase")}

    duration = float(state.get("duration_seconds") or 20)
    started_at = float(state.get("started_at") or 0)
    
    import time
    now = time.time()
    
    if not force and started_at > 0:
        elapsed = now - started_at
        if elapsed < duration:
            # Aún hay tiempo, no forzar cierre a menos que force == True
            return {"phase": state.get("phase")}

    players = (
        supabase.table("players")
        .select("name, house, score")
        .eq("room_id", room_id)
        .execute()
    ).data or []

    new_state, point_events, scored = resolve_for_reveal(state, players)

    if point_events:
        # Import local para no causar ciclos si main lo tiene
        from api.main import apply_point_events
        apply_point_events(room_id, point_events)

    new_state["results_applied"] = True

    supabase.table("rooms").update({
        "game_state": new_state,
    }).eq("room_code", room_code).execute()

    return {"phase": "results_trivia"}