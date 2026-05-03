import { StoryDefinition } from '../storyTypes';

export const copaCasasClasica: StoryDefinition = {
  id: "copa_casas_clasica",
  title: "Copa de las Casas Clásica",
  shortTitle: "Copa Clásica",
  description: "Una experiencia balanceada para iniciar a cualquier grupo. Combina trivia, votaciones, clases mágicas, duelos y una gran pregunta final.",
  estimatedMinutes: 35,
  recommendedPlayers: "2 a 8 jugadores",
  difficulty: "normal",
  tone: "epic",
  steps: [
    {
      id: "bienvenida_gran_comedor",
      type: "dialogue",
      title: "Bienvenidos al Gran Comedor",
      subtitle: "La Copa despierta",
      visual: "great_hall_intro",
      voiceSlot: "copa_clasica_bienvenida",
      lines: [
        "Las velas flotan sobre el Gran Comedor y la Copa de las Casas ha despertado.",
        "Esta noche, cada respuesta, cada voto y cada decisión moverá el destino de las casas.",
        "No importa si vienes con sabiduría, suerte o exceso de confianza. La Copa lo contará todo.",
        "Tomen sus celulares. Desde ahora, cada uno sostiene una varita."
      ]
    },
    {
      id: "instrucciones_trivia_inicial",
      type: "instructions",
      title: "Primera prueba",
      instructionGameId: "trivia_magica",
      voiceSlot: "instructions_trivia_magica"
    },
    {
      id: "trivia_calentamiento",
      type: "trivia_block",
      title: "Bloque de Trivia: El inicio del curso",
      subtitle: "Preguntas de calentamiento",
      questions: 5,
      reason: "La Copa comenzará midiendo el conocimiento básico de cada casa.",
      voiceSlot: "story_transition_trivia"
    },
    {
      id: "marcador_1",
      type: "scoreboard",
      title: "Primer corte de la Copa",
      scoreboardTitle: "El primer movimiento del marcador",
      voiceSlot: "story_scoreboard"
    },
    {
      id: "aparece_sombrero",
      type: "dialogue",
      title: "El Sombrero interrumpe",
      subtitle: "Una opinión no solicitada",
      visual: "sorting_hat",
      voiceSlot: "copa_clasica_sombrero_intro",
      lines: [
        "Justo cuando todos pensaban que la competencia sería seria, el Sombrero decidió opinar.",
        "La Copa permite conocimiento, pero el Sombrero exige juicio social.",
        "Respiren profundo. Algunas verdades van a caer con más fuerza que un libro de Encantamientos."
      ]
    },
    {
      id: "instrucciones_sombrero",
      type: "instructions",
      title: "Prueba social",
      instructionGameId: "sombrero_burlon",
      voiceSlot: "instructions_sombrero_burlon"
    },
    {
      id: "sombrero_burlon_1",
      type: "fixed_minigame",
      gameId: "sombrero_burlon",
      title: "El Sombrero Burlón",
      reason: "El Sombrero quiere saber quiénes son realmente los presentes."
    },
    {
      id: "marcador_2",
      type: "scoreboard",
      title: "Segundo corte de la Copa",
      scoreboardTitle: "La dignidad también da puntos",
      voiceSlot: "story_scoreboard"
    },
    {
      id: "clase_pociones_intro",
      type: "dialogue",
      title: "Clase de Pociones",
      subtitle: "El caldero está listo",
      visual: "potions_class",
      voiceSlot: "copa_clasica_pociones_intro",
      lines: [
        "El aire cambia. Un aroma extraño sale de los calderos.",
        "La siguiente prueba no premia solo la memoria. Premia la calma bajo presión.",
        "Quien mezcle bien ganará puntos. Quien mezcle mal… al menos dará espectáculo."
      ]
    },
    {
      id: "instrucciones_pociones",
      type: "instructions",
      title: "Prueba de memoria",
      instructionGameId: "clase_pociones",
      voiceSlot: "instructions_clase_pociones"
    },
    {
      id: "clase_pociones_1",
      type: "fixed_minigame",
      gameId: "clase_pociones",
      title: "Clase de Pociones",
      reason: "Las casas deberán preparar una receta antes de que el caldero pierda la paciencia."
    },
    {
      id: "marcador_3",
      type: "scoreboard",
      title: "Tercer corte de la Copa",
      scoreboardTitle: "El caldero ha hablado",
      voiceSlot: "story_scoreboard"
    },
    {
      id: "castillo_en_movimiento",
      type: "dialogue",
      title: "El castillo se mueve",
      subtitle: "El mapa aparece",
      visual: "moving_castle",
      voiceSlot: "copa_clasica_mapa_intro",
      lines: [
        "Las escaleras cambian. Los pasillos se estiran. Alguien jura haber visto una sombra correr.",
        "En medio del caos, aparece un mapa antiguo.",
        "Observen bien. Lo que vean ahora tal vez desaparezca en segundos."
      ]
    },
    {
      id: "instrucciones_mapa",
      type: "instructions",
      title: "Prueba de observación",
      instructionGameId: "mapa_travieso",
      voiceSlot: "instructions_mapa_travieso"
    },
    {
      id: "mapa_travieso_1",
      type: "fixed_minigame",
      gameId: "mapa_travieso",
      title: "El Mapa Travieso",
      reason: "El castillo oculta pistas y la Copa premia a quien recuerda."
    },
    {
      id: "retratos_murmuran",
      type: "dialogue",
      title: "Los retratos murmuran",
      subtitle: "Pistas entre marcos",
      visual: "portrait_gallery",
      voiceSlot: "copa_clasica_retratos_intro",
      lines: [
        "Los retratos del castillo comenzaron a murmurar.",
        "Algunos dicen verdades. Otros exageran. Todos se sienten importantes.",
        "Escuchen con cuidado, porque hasta el chisme puede esconder una respuesta correcta."
      ]
    },
    {
      id: "instrucciones_retratos",
      type: "instructions",
      title: "Prueba de pistas",
      instructionGameId: "retratos_chismosos",
      voiceSlot: "instructions_retratos_chismosos"
    },
    {
      id: "retratos_1",
      type: "fixed_minigame",
      gameId: "retratos_chismosos",
      title: "Retratos Chismosos",
      reason: "Los retratos han decidido participar, aunque nadie se los pidió."
    },
    {
      id: "marcador_4",
      type: "scoreboard",
      title: "Cuarto corte de la Copa",
      scoreboardTitle: "Las casas empiezan a separarse",
      voiceSlot: "story_scoreboard"
    },
    {
      id: "arena_duelo",
      type: "dialogue",
      title: "La sala se convierte en arena",
      subtitle: "Varitas listas",
      visual: "duel_arena",
      voiceSlot: "copa_clasica_duelo_intro",
      lines: [
        "Las luces bajan. Dos nombres resuenan en el Gran Comedor.",
        "La Copa exige valentía, reflejos y una cantidad razonable de dramatismo.",
        "Es hora de un duelo."
      ]
    },
    {
      id: "instrucciones_duelo",
      type: "instructions",
      title: "Prueba de estrategia",
      instructionGameId: "duelo_hechizos",
      voiceSlot: "instructions_duelo_hechizos"
    },
    {
      id: "duelo_1",
      type: "fixed_minigame",
      gameId: "duelo_hechizos",
      title: "Duelo de Hechizos",
      reason: "Dos representantes se enfrentarán por el honor de sus casas."
    },
    {
      id: "prueba_final_previa",
      type: "dialogue",
      title: "Antes de la gran final",
      subtitle: "La Copa se prepara",
      visual: "final_before",
      lines: [
        "El marcador está vivo. Algunas casas respiran tranquilas. Otras hacen matemáticas desesperadas.",
        "Todavía queda una última oportunidad para cambiarlo todo.",
        "Pero antes, la Copa exige un último bloque de conocimiento."
      ]
    },
    {
      id: "instrucciones_trivia_final",
      type: "instructions",
      title: "Último bloque de trivia",
      instructionGameId: "trivia_magica",
      voiceSlot: "instructions_trivia_magica"
    },
    {
      id: "trivia_final_previa",
      type: "trivia_block",
      title: "Bloque de Trivia: Conocimiento avanzado",
      questions: 5,
      reason: "La Copa pondrá a prueba a quienes dicen saberlo todo.",
      voiceSlot: "story_transition_trivia"
    },
    {
      id: "marcador_antes_final",
      type: "scoreboard",
      title: "Marcador antes de la final",
      scoreboardTitle: "Última mirada antes de apostar",
      voiceSlot: "story_scoreboard"
    },
    {
      id: "copa_final_intro",
      type: "dialogue",
      title: "La Copa Final",
      subtitle: "Todo puede cambiar",
      visual: "final_cup",
      voiceSlot: "copa_clasica_final_intro",
      lines: [
        "Las velas se detienen. El Gran Comedor guarda silencio.",
        "Una pregunta puede levantar a una casa o hundirla con elegancia.",
        "Hagan sus apuestas. La Copa Final comienza."
      ]
    },
    {
      id: "instrucciones_copa_final",
      type: "instructions",
      title: "Instrucciones finales",
      instructionGameId: "copa_final",
      voiceSlot: "instructions_copa_final"
    },
    {
      id: "copa_final",
      type: "copa_final",
      gameId: "copa_final",
      title: "La Copa Final",
      reason: "La última pregunta decidirá la gloria."
    },
    {
      id: "cierre_copa_clasica",
      type: "story_complete",
      title: "La Copa ha decidido",
      subtitle: "Una casa se alza sobre las demás",
      voiceSlot: "copa_clasica_cierre",
      lines: [
        "La competencia ha terminado.",
        "La Copa reconoce conocimiento, instinto, estrategia y una alarmante capacidad para acusar amigos.",
        "La casa ganadora puede celebrar. Las demás pueden decir que era amistoso."
      ]
    }
  ]
};
