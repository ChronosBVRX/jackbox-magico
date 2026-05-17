import { GameModule, GameUpdateResult } from '../base';
import { Player } from '../../types/events';
import { THREAT_POOL, Threat } from './data';

interface ArtesState {
  roundNumber: number;
  totalRounds: number;
  currentThreat: Threat | null;
  answeredClients: Map<string, { playerName: string; house: string; answer: string; elapsedMs: number }>;
  startedAt: number;
  durationMs: number;
  results: any | null;
  usedIds: string[];
  playerCount: number;
}

export class ArtesRidiculas implements GameModule {
  id = 'artes_ridiculas' as const;
  name = 'Defensa Contra las Artes Ridículas';

  init(players: Player[], options?: any): ArtesState {
    const totalRounds = options?.questionCount || 3;
    const firstThreat = THREAT_POOL.filter(t => t.difficulty === 'facil')[Math.floor(Math.random() * THREAT_POOL.filter(t => t.difficulty === 'facil').length)];
    return {
      roundNumber: 1,
      totalRounds,
      currentThreat: firstThreat,
      answeredClients: new Map(),
      startedAt: Date.now(),
      durationMs: 15000,
      results: null,
      usedIds: [firstThreat.id],
      playerCount: players.length
    };
  }

  getTvState(state: ArtesState) {
    if (state.results) return { phase: 'results', ...state.results };
    
    return {
      phase: 'threat',
      roundNumber: state.roundNumber,
      totalRounds: state.totalRounds,
      category: state.currentThreat?.category,
      question: state.currentThreat?.question,
      options: state.currentThreat?.options || [],
      durationMs: state.durationMs,
      startedAt: state.startedAt,
      answerCount: state.answeredClients.size,
      totalPlayers: state.playerCount
    };
  }

  getPlayerState(state: ArtesState, player: Player) {
    if (state.results) return { phase: 'results' };
    
    return {
      phase: 'threat',
      question: state.currentThreat?.question,
      options: state.currentThreat?.options || [],
      alreadyAnswered: state.answeredClients.has(player.clientId),
      durationMs: state.durationMs,
      startedAt: state.startedAt
    };
  }

  handlePlayerAction(state: ArtesState, player: Player, action: any): GameUpdateResult {
    if (state.results) return { state };
    if (state.answeredClients.has(player.clientId)) return { state };

    const elapsedMs = Date.now() - state.startedAt;
    
    const rawAnswer = action.answer;
    let normalizedAnswer = rawAnswer;

    const labels = ['A', 'B', 'C', 'D'];
    const labelIndex = labels.indexOf(rawAnswer);

    if (labelIndex >= 0 && state.currentThreat?.options[labelIndex]) {
      normalizedAnswer = state.currentThreat.options[labelIndex];
    }

    state.answeredClients.set(player.clientId, { playerName: player.name, house: player.house, answer: normalizedAnswer, elapsedMs });

    return {
      state,
      events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }]
    };
  }

  handleHostAction(state: ArtesState, action: string): GameUpdateResult {
    if (action === 'next') {
      if (!state.results && state.currentThreat) {
        return this.resolveRound(state);
      }
      if (state.results) {
        return this.startNextRound(state);
      }
    }
    return { state };
  }

  private startNextRound(state: ArtesState): GameUpdateResult {
    state.roundNumber++;
    if (state.roundNumber > state.totalRounds) {
      return { state, finished: true };
    }

    state.results = null;
    state.answeredClients.clear();
    
    const diff = state.roundNumber === 1 ? 'facil' : (state.roundNumber === 2 ? 'media' : 'dificil');
    const available = THREAT_POOL.filter(t => t.difficulty === diff && !state.usedIds.includes(t.id));
    const threat = available.length > 0 
      ? available[Math.floor(Math.random() * available.length)]
      : THREAT_POOL[Math.floor(Math.random() * THREAT_POOL.length)];
    
    state.currentThreat = threat;
    state.usedIds.push(threat.id);
    state.startedAt = Date.now();

    return { state };
  }

  private resolveRound(state: ArtesState): GameUpdateResult {
    if (!state.currentThreat) return { state };

    const results: any[] = [];
    const pointEvents: any[] = [];

    state.answeredClients.forEach((ans, clientId) => {
      const isCorrect = ans.answer === state.currentThreat?.correct;
      const isFunny = ans.answer === state.currentThreat?.funniest;
      
      let points = 0;
      let labels: string[] = [];

      if (isCorrect) {
        points = 100;
        labels.push('+100 Correcta');
        if (ans.elapsedMs < 3000) {
          points += 30;
          labels.push('+30 Rapidez');
        }
      } else {
        if (isFunny) {
          points = 40;
          labels.push('+40 Respuesta Graciosa');
        } else {
          points = 0;
          labels.push('0 Incorrecta');
        }
      }

      pointEvents.push({ clientId, points, reason: labels.join(', ') });
      results.push({ clientId, playerName: ans.playerName, house: ans.house, isCorrect, isFunny, points, labels });
    });

    state.results = {
      correctAnswer: state.currentThreat.correct,
      explanation: state.currentThreat.explanation,
      narratorComment: state.currentThreat.narrator,
      results
    };

    return { 
      state,
      events: [{ type: 'round_results', payload: state.results, target: 'all' }],
      pointEvents
    };
  }
}
