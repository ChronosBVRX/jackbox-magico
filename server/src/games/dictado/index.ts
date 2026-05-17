import { GameModule, GameUpdateResult } from '../base';
import { Player } from '../../types/events';
import { DictadoState, DictadoStory, DictadoSubmission } from './types';

const STORIES_CATALOG: DictadoStory[] = [
  {
    id: 1,
    title: "La cicatriz",
    originalText: "Un documento clasificado del Ministerio revela que la cicatriz de Harry Potter no tiene forma de rayo por la maldición de Voldemort. En realidad, se cayó de frente contra una waflera eléctrica en la cocina de los Dursley mientras intentaba robarse un nugget de pollo los domingos.",
    noisyBarText: "La cicatriz de Harry Potter no tiene forma de rayo por Voldemort; se cayó contra una waflera eléctrica robando un nugget de pollo.",
    voiceId: "twq6c9tK89O36XNHCv2Q",
    audioUrl: "assets/audio/voice_lines/dictado_historia_1.mp3",
    durationMs: 35000
  },
  {
    id: 2,
    title: "El boicot",
    originalText: "Fred y George fueron vetados de por vida de Gringotts tras intentar cambiar tres mil pesos en monedas de chocolate por galeones de oro reales. El duende principal declaró que el truco casi funciona, de no ser porque el chocolate se derritió en la bóveda de Bellatrix Lestrange.",
    noisyBarText: "Fred y George fueron vetados de Gringotts por intentar cambiar monedas de chocolate por galeones; el truco casi funciona pero se derritieron.",
    voiceId: "twq6c9tK89O36XNHCv2Q",
    audioUrl: "assets/audio/voice_lines/dictado_historia_2.mp3",
    durationMs: 35000
  },
  {
    id: 3,
    title: "El drama",
    originalText: "Caos en la prisión de Azkaban. Tres dementores renunciaron tras quejarse de que absorber la felicidad de los prisioneros ya no es lo mismo desde que metieron a un mago influencer que solo piensa en su número de seguidores y en hacer bailes de TikTok en su celda.",
    noisyBarText: "Tres dementores renunciaron a Azkaban quejándose de un mago influencer que solo piensa en seguidores y bailes de TikTok.",
    voiceId: "twq6c9tK89O36XNHCv2Q",
    audioUrl: "assets/audio/voice_lines/dictado_historia_3.mp3",
    durationMs: 35000
  },
  {
    id: 4,
    title: "La dieta",
    originalText: "Hagrid desató el pánico en el Gran Comedor al confundir un lote de poción multijugos con su tarro de pulque curado de avena. El guardabosques pasó tres días transformado en un tlacuache gigante con botas que intentaba morderle los talones a la profesora McGonagall.",
    noisyBarText: "Hagrid confundió poción multijugos con pulque curado de avena y pasó tres días como un tlacuache gigante con botas.",
    voiceId: "twq6c9tK89O36XNHCv2Q",
    audioUrl: "assets/audio/voice_lines/dictado_historia_4.mp3",
    durationMs: 35000
  },
  {
    id: 5,
    title: "Las clases",
    originalText: "Severus Snape suspendió la clase de Pociones porque alguien le cambió el ingrediente secreto por veneno de escorpión pirata y champú anticaspa. Albus Dumbledore testificó que, por primera vez en cuarenta años, el cabello de Snape tenía un delicioso aroma a manzana verde.",
    noisyBarText: "Snape suspendió Pociones porque le cambiaron ingredientes por champú anticaspa; Dumbledore testificó que su cabello olía a manzana verde.",
    voiceId: "twq6c9tK89O36XNHCv2Q",
    audioUrl: "assets/audio/voice_lines/dictado_historia_5.mp3",
    durationMs: 35000
  },
  {
    id: 6,
    title: "El torneo",
    originalText: "Un reporte del Profeta expuso un torneo ilegal de Quidditch en reversa. Los jugadores debían volar de cabeza atados a una Nimbus mil doscientos mientras cargaban un garrafón de agua purificada. El buscador de Slytherin terminó incrustado en el trasero del tonto de Neville Longbottom.",
    noisyBarText: "Torneo ilegal de Quidditch en reversa volando de cabeza con un garrafón; el buscador terminó incrustado en Neville Longbottom.",
    voiceId: "twq6c9tK89O36XNHCv2Q",
    audioUrl: "assets/audio/voice_lines/dictado_historia_6.mp3",
    durationMs: 35000
  },
  {
    id: 7,
    title: "La moda",
    originalText: "Dobby causó revuelo en el Callejón Diagon tras gastarse todo el oro de su libertad en unos tenis de diseñador con luces LED y una chamarra antibalas fosforescente. El elfo libre fue visto presumiening su outfit aesthetic frente a los mortífagos del bar.",
    noisyBarText: "Dobby gastó su oro en tenis de diseñador con luces LED y chamarra fosforescente, presumiendo su outfit aesthetic ante mortífagos.",
    voiceId: "twq6c9tK89O36XNHCv2Q",
    audioUrl: "assets/audio/voice_lines/dictado_historia_7.mp3",
    durationMs: 35000
  },
  {
    id: 8,
    title: "Los TIMOS",
    originalText: "Ron Weasley reprobó su examen de Transformaciones de forma catastrófica. Intentó convertir una rata vieja en una copa de plata, pero el hechizo falló y creó un híbrido mutante: un termo de café con bigotes que muerde a cualquiera que intente tomar un trago.",
    noisyBarText: "Ron reprobó Transformaciones intentando convertir una rata en copa; creó un termo de café con bigotes que muerde.",
    voiceId: "twq6c9tK89O36XNHCv2Q",
    audioUrl: "assets/audio/voice_lines/dictado_historia_8.mp3",
    durationMs: 35000
  },
  {
    id: 9,
    title: "La crisis",
    originalText: "El Sombrero Seleccionador se declaró en huelga de hambre tras lavarse por error con los calcetines sucios de Ron. El artefacto mágico ahora solo grita groserías en francés y manda a todos los estudiantes de primer ingreso directo a la cocina a lavar los platos.",
    noisyBarText: "El Sombrero Seleccionador se lavó con calcetines de Ron; ahora grita groserías en francés y manda a los de primer ingreso a lavar platos.",
    voiceId: "twq6c9tK89O36XNHCv2Q",
    audioUrl: "assets/audio/voice_lines/dictado_historia_9.mp3",
    durationMs: 35000
  },
  {
    id: 10,
    title: "La tía",
    originalText: "Se filtra que el verdadero motivo por el cual el Señor Tenebroso odia la Navidad es porque su tía abuela de Ecatepec siempre le regalaba un suéter tejido tres tallas más grande y una loción barata que le irritaba la piel donde se supone que va la nariz.",
    noisyBarText: "Voldemort odia la Navidad porque su tía abuela de Ecatepec le regalaba un suéter enorme y loción barata que le irritaba sin nariz.",
    voiceId: "twq6c9tK89O36XNHCv2Q",
    audioUrl: "assets/audio/voice_lines/dictado_historia_10.mp3",
    durationMs: 35000
  }
];

function calcularPorcentajeSimilitud(original: string, usuario: string): number {
  const sanitizar = (str: string) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remueve acentos
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()¿?¡!]/g, "") // Remueve puntuación
      .replace(/\s+/g, " ") // Colapsa espacios múltiples
      .trim();
  };

  const str1 = sanitizar(original);
  const str2 = sanitizar(usuario);

  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const b1 = getBigrams(str1);
  const b2 = getBigrams(str2);
  
  if (b1.size === 0 && b2.size === 0) return 100;
  if (b1.size === 0 || b2.size === 0) return 0;
  
  let intersection = 0;
  b2.forEach((bigram) => {
    if (b1.has(bigram)) intersection++;
  });

  const porcentaje = (2.0 * intersection) / (b1.size + b2.size);
  return Math.round(porcentaje * 100);
}

export class ElDictado implements GameModule {
  id = 'dictado_magico' as const;
  name = 'Dictado Mágico';

  init(players: Player[]): DictadoState {
    const validPlayers = players.filter(p => p.isConnected);
    const randomStory = STORIES_CATALOG[Math.floor(Math.random() * STORIES_CATALOG.length)];
    const submissions: Record<string, DictadoSubmission> = {};

    validPlayers.forEach(p => {
      submissions[p.clientId] = {
        clientId: p.clientId,
        playerName: p.name,
        playerHouse: p.house,
        transcription: '',
        similarity: 0,
        points: 0,
        isFunny: false
      };
    });

    return {
      phase: 'playing',
      currentStory: randomStory,
      submissions,
      startedAt: Date.now(),
      durationMs: randomStory.durationMs || 35000,
      audioRepeatCount: 0,
      results: null
    };
  }

  getTvState(state: DictadoState) {
    if (state.phase === 'results') {
      return { phase: 'results', results: state.results };
    }
    if (state.phase === 'voting_host') {
      return {
        phase: 'voting_host',
        currentStoryTitle: state.currentStory.title,
        submissionsCount: Object.keys(state.submissions).length
      };
    }
    const submittedCount = Object.values(state.submissions).filter(s => s.transcription !== '').length;
    return {
      phase: state.phase,
      currentStoryTitle: state.currentStory.title,
      audioUrl: state.currentStory.audioUrl,
      noisyBarText: state.currentStory.noisyBarText,
      audioRepeatCount: state.audioRepeatCount,
      submittedCount,
      totalPlayers: Object.keys(state.submissions).length,
      startedAt: state.startedAt,
      durationMs: state.durationMs
    };
  }

  getPlayerState(state: DictadoState, player: Player) {
    if (state.phase === 'results') return { phase: 'results' };
    
    if (state.phase === 'voting_host') {
      return {
        phase: 'voting_host',
        isHost: player.isHost,
        submissions: Object.values(state.submissions)
      };
    }

    const mySub = state.submissions[player.clientId];
    return {
      phase: 'playing',
      isHost: player.isHost,
      currentStoryTitle: state.currentStory.title,
      noisyBarText: state.currentStory.noisyBarText,
      audioRepeatCount: state.audioRepeatCount,
      alreadySubmitted: mySub ? mySub.transcription !== '' : false
    };
  }

  handlePlayerAction(state: DictadoState, player: Player, action: any): GameUpdateResult {
    if (action.type === 'submit_dictado' && state.phase === 'playing') {
      const mySub = state.submissions[player.clientId];
      if (mySub) {
        mySub.transcription = action.transcription || '';
        mySub.similarity = calcularPorcentajeSimilitud(state.currentStory.originalText, mySub.transcription);
        mySub.points = Math.round(mySub.similarity * 4); // 100% = 400 pts (balanceado)
      }
      return { state, events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }] };
    }

    if (action.type === 'repeat_dictado_audio' && state.phase === 'playing') {
      state.audioRepeatCount = (state.audioRepeatCount || 0) + 1;
      return { state, events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }] };
    }

    if (action.type === 'award_funny' && state.phase === 'voting_host' && player.isHost) {
      const targetSub = state.submissions[action.targetClientId];
      if (targetSub && !targetSub.isFunny) {
        targetSub.isFunny = true;
        targetSub.points += 150; // Bono hilarante balanceado a 150 pts
      }
      return { state, events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }] };
    }

    return { state };
  }

  handleHostAction(state: DictadoState, action: string, players?: Player[]): GameUpdateResult {
    if (action === 'next') {
      if (state.phase === 'playing') {
        state.phase = 'voting_host';
        return {
          state,
          events: [
            {
              type: 'voice_cue',
              payload: {
                type: 'audioFile',
                audioPath: 'assets/audio/voice_lines/dictado_voting.mp3',
                interrupt: true,
                force: true
              },
              target: 'all'
            }
          ]
        };
      }

      if (state.phase === 'voting_host') {
        state.phase = 'results';
        const rankingList = Object.values(state.submissions).sort((a, b) => b.points - a.points);
        const winnerSub = rankingList.length > 0 ? rankingList[0] : null;

        state.results = {
          ranking: rankingList,
          winner: winnerSub
        };

        const pointEvents: any[] = rankingList.map(r => ({
          clientId: r.clientId,
          points: r.points,
          gameId: 'dictado_magico',
          label: r.isFunny ? `¡Precisión ${r.similarity}% + Bono Hilarante!` : `Precisión ${r.similarity}% en Dictado`
        }));

        return {
          state,
          pointEvents,
          events: [
            {
              type: 'voice_cue',
              payload: {
                type: 'audioFile',
                audioPath: 'assets/audio/voice_lines/dictado_results.mp3',
                interrupt: true,
                force: true
              },
              target: 'all'
            }
          ]
        };
      }

      if (state.phase === 'results') {
        return { state, finished: true };
      }
    }
    return { state };
  }
}
