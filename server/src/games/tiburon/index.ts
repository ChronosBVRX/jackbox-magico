import { GameModule, GameUpdateResult } from '../base';
import { Player } from '../../types/events';
import { TiburonState, TiburonCreation } from './types';

export class ElTiburon implements GameModule {
  id = 'el_tiburon' as const;
  name = 'El Tiburón de los Negocios Mágicos';

  private readonly PROMPTS_CATALOG = [
    { prompt: 'Escarbato rabioso con alas de murciélago gigante', category: 'hagrid' as const },
    { prompt: 'Varita explosiva defectuosa con sabor a regaliz y queso', category: 'weasley' as const },
    { prompt: 'Gnomo de jardín con esmoquin elegante y actitud prepotente', category: 'hagrid' as const },
    { prompt: 'Sombrero Seleccionador con rabietas y dolor de cabeza', category: 'weasley' as const },
    { prompt: 'Caldero autorevolvente que escupe lava verde', category: 'weasley' as const },
    { prompt: 'Girasol mordedor con dientes de sable', category: 'hagrid' as const },
    { prompt: 'Hipogrifo perezoso con ruedas de patineta en las patas', category: 'hagrid' as const },
    { prompt: 'Filtro de amor caducado con olor a calcetín sucio', category: 'weasley' as const },
    { prompt: 'Mandrágora cantora de ópera desafinada', category: 'hagrid' as const },
    { prompt: 'Galeón falso que muerde los dedos de quien lo toca', category: 'weasley' as const }
  ];

  init(players: Player[]): TiburonState {
    const validPlayers = players.filter(p => p.isConnected);
    const shuffledPrompts = [...this.PROMPTS_CATALOG].sort(() => 0.5 - Math.random());
    const creations: Record<string, TiburonCreation> = {};

    validPlayers.forEach((player, idx) => {
      const promptObj = shuffledPrompts[idx % shuffledPrompts.length];
      creations[player.clientId] = {
        id: player.clientId,
        prompt: promptObj.prompt,
        category: promptObj.category,
        topAuthorId: player.clientId,
        topAuthorName: player.name,
        topAuthorHouse: player.house,
        topLines: '',
        bottomAuthorId: '',
        bottomAuthorName: '',
        bottomAuthorHouse: '',
        bottomLines: '',
        investments: {},
        totalInvestment: 0
      };
    });

    return {
      phase: 'drawing_top',
      prompts: shuffledPrompts,
      creations,
      currentPitchIndex: 0,
      startedAt: Date.now(),
      durationMs: 45000,
      results: null
    };
  }

  getTvState(state: TiburonState) {
    if (state.phase === 'results') {
      return { phase: 'results', results: state.results };
    }
    if (state.phase === 'pitching') {
      const creationList = Object.values(state.creations);
      const currentCreation = creationList[state.currentPitchIndex] || null;
      return {
        phase: 'pitching',
        currentPitchIndex: state.currentPitchIndex,
        totalCreations: creationList.length,
        currentCreation,
        investorsCount: currentCreation ? Object.keys(currentCreation.investments).length : 0
      };
    }
    const submittedCount = Object.values(state.creations).filter(c => {
      return state.phase === 'drawing_top' ? c.topLines !== '' : c.bottomLines !== '';
    }).length;

    return {
      phase: state.phase,
      submittedCount,
      totalPlayers: Object.keys(state.creations).length,
      startedAt: state.startedAt,
      durationMs: state.durationMs
    };
  }

  getPlayerState(state: TiburonState, player: Player) {
    if (state.phase === 'results') return { phase: 'results' };

    if (state.phase === 'pitching') {
      const creationList = Object.values(state.creations);
      const currentCreation = creationList[state.currentPitchIndex] || null;
      const myInvestment = currentCreation ? (currentCreation.investments[player.clientId] || 0) : 0;
      return {
        phase: 'pitching',
        currentCreationPrompt: currentCreation ? currentCreation.prompt : '',
        currentCreationCategory: currentCreation ? currentCreation.category : '',
        myInvestment,
        isAuthor: currentCreation ? (currentCreation.topAuthorId === player.clientId || currentCreation.bottomAuthorId === player.clientId) : false
      };
    }

    if (state.phase === 'drawing_top') {
      const myCreation = state.creations[player.clientId];
      return {
        phase: 'drawing_top',
        prompt: myCreation ? myCreation.prompt : '',
        category: myCreation ? myCreation.category : '',
        alreadySubmitted: myCreation ? myCreation.topLines !== '' : false
      };
    }

    if (state.phase === 'drawing_bottom') {
      const myCreation = Object.values(state.creations).find(c => c.bottomAuthorId === player.clientId);
      return {
        phase: 'drawing_bottom',
        prompt: '??? (Concepto Oculto - Modo Complemento)',
        topLines: myCreation ? myCreation.topLines : '',
        alreadySubmitted: myCreation ? myCreation.bottomLines !== '' : false
      };
    }

    return { phase: state.phase };
  }

  handlePlayerAction(state: TiburonState, player: Player, action: any): GameUpdateResult {
    if ((action.type === 'submit_top' || action.type === 'tiburon_submit_draw') && state.phase === 'drawing_top') {
      const myCreation = state.creations[player.clientId];
      if (myCreation) {
        myCreation.topLines = action.lines || 'data:image/png;base64,';
      }
      return { state, events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }] };
    }

    if ((action.type === 'submit_bottom' || action.type === 'tiburon_submit_draw') && state.phase === 'drawing_bottom') {
      const myCreation = Object.values(state.creations).find(c => c.bottomAuthorId === player.clientId);
      if (myCreation) {
        myCreation.bottomLines = action.lines || 'data:image/png;base64,';
      }
      return { state, events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }] };
    }

    if ((action.type === 'invest' || action.type === 'tiburon_invest') && state.phase === 'pitching') {
      const creationList = Object.values(state.creations);
      const currentCreation = creationList[state.currentPitchIndex];
      if (currentCreation) {
        const amount = Number(action.amount) || 100;
        currentCreation.investments[player.clientId] = amount;
        currentCreation.totalInvestment = Object.values(currentCreation.investments).reduce((a, b) => a + b, 0);
      }
      return { state, events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }] };
    }

    return { state };
  }

  handleHostAction(state: TiburonState, action: string, players?: Player[]): GameUpdateResult {
    if (action === 'next') {
      if (state.phase === 'drawing_top') {
        state.phase = 'drawing_bottom';
        state.startedAt = Date.now();
        state.durationMs = 45000;

        const creationKeys = Object.keys(state.creations);
        if (creationKeys.length > 1) {
          creationKeys.forEach((key, idx) => {
            const nextKey = creationKeys[(idx + 1) % creationKeys.length];
            const nextPlayer = players ? players.find(p => p.clientId === nextKey) : null;
            state.creations[key].bottomAuthorId = nextKey;
            state.creations[key].bottomAuthorName = nextPlayer ? nextPlayer.name : `Jugador ${idx + 2}`;
            state.creations[key].bottomAuthorHouse = nextPlayer ? nextPlayer.house : 'gryffindor';
          });
        } else if (creationKeys.length === 1) {
          const key = creationKeys[0];
          state.creations[key].bottomAuthorId = key;
          state.creations[key].bottomAuthorName = state.creations[key].topAuthorName;
          state.creations[key].bottomAuthorHouse = state.creations[key].topAuthorHouse;
        }

        return {
          state,
          events: [
            {
              type: 'voice_cue',
              payload: {
                type: 'audioFile',
                audioPath: 'assets/audio/voice_lines/tiburon_phase_bottom.mp3',
                interrupt: true,
                force: true
              },
              target: 'all'
            }
          ]
        };
      }

      if (state.phase === 'drawing_bottom') {
        state.phase = 'pitching';
        state.currentPitchIndex = 0;

        return {
          state,
          events: [
            {
              type: 'voice_cue',
              payload: {
                type: 'audioFile',
                audioPath: 'assets/audio/voice_lines/tiburon_phase_pitch.mp3',
                interrupt: true,
                force: true
              },
              target: 'all'
            }
          ]
        };
      }

      if (state.phase === 'pitching') {
        const creationList = Object.values(state.creations);
        if (state.currentPitchIndex < creationList.length - 1) {
          state.currentPitchIndex++;
          const pitchAudios = ['tiburon_pitch_01.mp3', 'tiburon_pitch_02.mp3', 'tiburon_pitch_03.mp3', 'tiburon_pitch_04.mp3'];
          const randomAudio = pitchAudios[state.currentPitchIndex % pitchAudios.length];

          return {
            state,
            events: [
              {
                type: 'voice_cue',
                payload: {
                  type: 'audioFile',
                  audioPath: `assets/audio/voice_lines/${randomAudio}`,
                  interrupt: true,
                  force: true
                },
                target: 'all'
              }
            ]
          };
        } else {
          state.phase = 'results';
          const rankingList = creationList.map(c => ({
            creationId: c.id,
            prompt: c.prompt,
            category: c.category,
            topAuthorName: c.topAuthorName,
            bottomAuthorName: c.bottomAuthorName,
            totalInvestment: c.totalInvestment,
            topAuthorHouse: c.topAuthorHouse,
            bottomAuthorHouse: c.bottomAuthorHouse,
            topLines: c.topLines,
            bottomLines: c.bottomLines
          })).sort((a, b) => b.totalInvestment - a.totalInvestment);

          const winnerCreation = rankingList.length > 0 ? state.creations[rankingList[0].creationId] : null;

          state.results = {
            ranking: rankingList,
            winner: winnerCreation
          };

          const pointEvents: any[] = [];
          if (winnerCreation) {
            pointEvents.push({
              clientId: winnerCreation.topAuthorId,
              points: 300,
              gameId: 'el_tiburon',
              label: '¡Magnate del Tanque (Autor Superior)!'
            });
            if (winnerCreation.bottomAuthorId !== winnerCreation.topAuthorId) {
              pointEvents.push({
                clientId: winnerCreation.bottomAuthorId,
                points: 300,
                gameId: 'el_tiburon',
                label: '¡Magnate del Tanque (Autor Inferior)!'
              });
            }
            Object.entries(winnerCreation.investments).forEach(([invId, amt]) => {
              pointEvents.push({
                clientId: invId,
                points: Math.floor(amt * 0.5),
                gameId: 'el_tiburon',
                label: `Retorno de Inversión (${amt} Galeones)`
              });
            });
          }

          return {
            state,
            pointEvents,
            events: [
              {
                type: 'voice_cue',
                payload: {
                  type: 'audioFile',
                  audioPath: 'assets/audio/voice_lines/tiburon_results.mp3',
                  interrupt: true,
                  force: true
                },
                target: 'all'
              }
            ]
          };
        }
      }

      if (state.phase === 'results') {
        return { state, finished: true };
      }
    }
    return { state };
  }
}
