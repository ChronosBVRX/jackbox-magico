export interface Threat {
  id: string;
  category: string;
  difficulty: 'facil' | 'media' | 'dificil';
  question: string;
  options: string[];
  correct: string;
  funniest: string;
  explanation: string;
  narrator: string;
}

export const THREAT_POOL: Threat[] = [
  {
    id: "finanzas_001", category: "finanzas", difficulty: "media",
    question: "Un dementor se acerca, pero no viene por tu alma… viene por tu quincena.",
    options: ["Invocar un Patronus con recibos de nómina", "Lanzar Protego Presupuestum sobre la cartera", "Ofrecerle pagar en abonos chiquitos", "Declararte emocionalmente insolvente"],
    correct: "Invocar un Patronus con recibos de nómina", funniest: "Ofrecerle pagar en abonos chiquitos",
    explanation: "El Patronus financiero protege el alma, la cartera y la dignidad de fin de quincena.",
    narrator: "Hoy aprenderemos a defendernos de peligros oscuros, como llegar al día quince con treinta y dos pesos."
  },
  {
    id: "finanzas_002", category: "finanzas", difficulty: "media",
    question: "Un boggart toma la forma de tu estado de cuenta después del Buen Fin.",
    options: ["Usar Riddikulus y convertirlo en cashback", "Revisar movimientos con Lumos Financiero", "Meter el celular al arroz por si se arregla", "Cubrirlo con una sábana de 'yo no fui'"],
    correct: "Usar Riddikulus y convertirlo en cashback", funniest: "Meter el celular al arroz por si se arregla",
    explanation: "El contrahechizo correcto transforma el terror financiero en una ilusión de control.",
    narrator: "El miedo más profundo del mago moderno no vive en el bosque prohibido, vive en la banca móvil."
  },
  {
    id: "finanzas_003", category: "finanzas", difficulty: "dificil",
    question: "Un duende te ofrece meses sin intereses, pero sonríe demasiado.",
    options: ["Leer las letras chiquitas con Lumos Legal", "Preguntar si acepta pago con dignidad", "Firmar solo si la pluma no tiembla", "Pedirle una simulación antes de venderle tu alma"],
    correct: "Leer las letras chiquitas con Lumos Legal", funniest: "Preguntar si acepta pago con dignidad",
    explanation: "Si un duende sonríe durante un contrato, alguien está perdiendo algo.",
    narrator: "La primera regla contra las artes ridículas: jamás firmes algo que brille más que tu sentido común."
  },
  {
    id: "ex_001", category: "ex_y_drama", difficulty: "media",
    question: "Tu ex aparece con un giratiempo para reclamar cosas del pasado.",
    options: ["Romper el ciclo temporal con responsabilidad afectiva", "Lanzar Expecto Bloqueum antes del 'tenemos que hablar'", "Pedir audiencia con el Ministerio de Relaciones Pasadas", "Decir: eso pasó en otra línea temporal"],
    correct: "Romper el ciclo temporal con responsabilidad afectiva", funniest: "Decir: eso pasó en otra línea temporal",
    explanation: "El giratiempo no debe usarse para revivir discusiones que ya hasta Facebook olvidó.",
    narrator: "Mucho cuidado, clase. No toda criatura oscura flota; algunas escriben 'tenemos que hablar'."
  },
  {
    id: "familia_001", category: "familia", difficulty: "facil",
    question: "Tu tía manda una cadena de buenos días con 47 flores mágicas.",
    options: ["Silenciar el grupo con Silencio Totalum", "Responder con un dragón animado para camuflarte", "Mandar un Patronus de buenos deseos", "Cambiarte de familia por decreto mágico"],
    correct: "Silenciar el grupo con Silencio Totalum", funniest: "Cambiarte de familia por decreto mágico",
    explanation: "No todo brillo en WhatsApp es magia buena.",
    narrator: "No teman a los mortífagos. Teman al tío que manda cadenas a las seis de la mañana."
  },
  {
    id: "trabajo_001", category: "trabajo", difficulty: "dificil",
    question: "Una junta aparece en tu calendario con el título: 'rápido, no nos tardamos'.",
    options: ["Pedir agenda, objetivo y hora de salida", "Lanzar PudoSerCorreo Maxima", "Entrar con cara de estatua encantada", "Fingir que Zoom te convirtió en fantasma"],
    correct: "Pedir agenda, objetivo y hora de salida", funniest: "Fingir que Zoom te convirtió en fantasma",
    explanation: "La defensa avanzada contra juntas no es huir; es poner límites antes de la diapositiva 47.",
    narrator: "Clase, hoy enfrentaremos una amenaza antigua: reuniones que pudieron ser mensaje."
  },
  {
    id: "burocracia_001", category: "burocracia", difficulty: "media",
    question: "Una ventanilla mágica te pide copia de una copia.",
    options: ["Sacar duplicado encantado y guardar evidencia", "Entregar una foto de la impresora", "Preguntar si aceptan pergamino emocional", "Mandar al elfo doméstico a formarse"],
    correct: "Sacar duplicado encantado y guardar evidencia", funniest: "Entregar una foto de la impresora",
    explanation: "En la burocracia, el papel se reproduce como criatura salvaje.",
    narrator: "La magia administrativa es repetir el trámite hasta que el trámite se canse."
  }
];
