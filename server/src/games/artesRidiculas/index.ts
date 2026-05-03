import { GameModule, GameUpdateResult } from '../base';
import { Player } from '../../types/events';
import { THREAT_POOL, Threat } from './data';

interface ArtesState {
  roundNumber: number;
  totalRounds: number;
  currentThreat: Threat | null;
  answeredClients: Map<string, { answer: string; elapsedMs: number }>;
  startedAt: number;
  durationMs: number;
  results: any | null;
  usedIds: string[];
}

export class ArtesRidiculas implements GameModule {
  id = 'artes_ridiculas' as const;
  name = 'Defensa Contra las Artes Ridículas';

  init(players: Player[]): ArtesState {
    return {
      roundNumber: 0,
      totalRounds: 3,
      currentThreat: null,
      answeredClients: new Map(),
      startedAt: 0,
      durationMs: 15000,
      results: null,
      usedIds: []
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
      options: state.currentThreat?.options,
      durationMs: state.durationMs,
      startedAt: state.startedAt,
      answerCount: state.answeredClients.size
    };
  }

  getPlayerState(state: ArtesState, player: Player) {
    if (state.results) return { phase: 'results' };
    
    return {
      phase: 'threat',
      alreadyAnswered: state.answeredClients.has(player.clientId),
      options: ['A', 'B', 'C', 'D']
    };
  }

  handlePlayerAction(state: ArtesState, player: Player, action: any): GameUpdateResult {
    if (state.results) return { state };
    if (state.answeredClients.has(player.clientId)) return { state };

    const elapsedMs = Date.now() - state.startedAt;
    state.answeredClients.set(player.clientId, { answer: action.answer, elapsedMs });

    return {
      state,
      events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }]
    };
  }

  handleHostAction(state: ArtesState, action: string): GameUpdateResult {
    if (action === 'next') {
      if (state.results || state.roundNumber === 0) {
        return this.startNextRound(state);
      } else {
        return this.resolveRound(state);
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
    
    // Pick threat by difficulty progression
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
        points = -20;
        labels.push('-20 Error');
        if (isFunny) {
          points += 20;
          labels.push('+20 Falsa Graciosa');
        }
      }

      pointEvents.push({ clientId, points, reason: labels.join(', ') });
      results.push({ clientId, isCorrect, isFunny, points, labels });
    });

    state.results = {
      correctAnswer: state.currentThreat.correct,
      explanation: state.currentThreat.explanation,
      narratorComment: state.currentThreat.narrator,
      results
    };

    return { 
      state,
      events: [{ type: 'round_results', payload: state.results, target: 'all' }]
    };
  }
}
