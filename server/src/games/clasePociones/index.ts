import { GameModule, GameUpdateResult } from '../base';
import { Player } from '../../types/events';
import { INGREDIENTS } from './data';

interface PocionesState {
  phase: 'sequence' | 'input' | 'results';
  mode: 'normal' | 'inverso';
  sequence: string[];
  playerAnswers: Map<string, { sequence: string[], elapsedMs: number }>;
  roundNumber: number;
  totalRounds: number;
  durationMs: number;
  startedAt: number;
  results: any | null;
}

export class ClasePociones implements GameModule {
  id = 'clase_pociones' as const;
  name = 'Clase de Pociones';

  init(players: Player[]): PocionesState {
    return {
      phase: 'sequence',
      mode: 'normal',
      sequence: [],
      playerAnswers: new Map(),
      roundNumber: 0,
      totalRounds: 3,
      durationMs: 15000,
      startedAt: 0,
      results: null
    };
  }

  getTvState(state: PocionesState) {
    return {
      phase: state.phase,
      mode: state.mode,
      sequence: state.sequence.map(id => INGREDIENTS.find(i => i.id === id)),
      roundNumber: state.roundNumber,
      totalRounds: state.totalRounds,
      answerCount: state.playerAnswers.size,
      results: state.results
    };
  }

  getPlayerState(state: PocionesState, player: Player) {
    return {
      phase: state.phase,
      mode: state.mode,
      alreadySubmitted: state.playerAnswers.has(player.clientId),
      ingredients: INGREDIENTS.map(i => ({ id: i.id, icon: i.icon }))
    };
  }

  handlePlayerAction(state: PocionesState, player: Player, action: any): GameUpdateResult {
    if (state.phase !== 'input') return { state };
    if (state.playerAnswers.has(player.clientId)) return { state };

    state.playerAnswers.set(player.clientId, {
      sequence: action.sequence,
      elapsedMs: Date.now() - state.startedAt
    });

    return {
      state,
      events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }]
    };
  }

  handleHostAction(state: PocionesState, action: string): GameUpdateResult {
    if (action === 'next') {
      if (state.phase === 'sequence') {
        state.phase = 'input';
        state.startedAt = Date.now();
        return { state };
      } else if (state.phase === 'input') {
        return this.resolveRound(state);
      } else {
        return this.startNextRound(state);
      }
    }
    return { state };
  }

  private startNextRound(state: PocionesState): GameUpdateResult {
    state.roundNumber++;
    if (state.roundNumber > state.totalRounds) {
      return { state, finished: true };
    }

    state.phase = 'sequence';
    state.mode = state.roundNumber === 3 ? 'inverso' : 'normal';
    state.playerAnswers.clear();
    state.results = null;
    
    // Sequence length grows
    const len = 3 + state.roundNumber;
    state.sequence = [];
    for (let i = 0; i < len; i++) {
      state.sequence.push(INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)].id);
    }

    return { state };
  }

  private resolveRound(state: PocionesState): GameUpdateResult {
    const targetSeq = state.mode === 'inverso' ? [...state.sequence].reverse() : state.sequence;
    
    const results: any[] = [];
    state.playerAnswers.forEach((ans, clientId) => {
      let matches = 0;
      ans.sequence.forEach((ing, i) => {
        if (ing === targetSeq[i]) matches++;
      });

      const isPerfect = matches === targetSeq.length;
      const points = matches * 20 + (isPerfect ? 50 : 0);
      
      results.push({
        clientId,
        matches,
        total: targetSeq.length,
        isPerfect,
        points
      });
    });

    state.phase = 'results';
    state.results = {
      correctSequence: targetSeq.map(id => INGREDIENTS.find(i => i.id === id)),
      ranking: results.sort((a, b) => b.points - a.points)
    };

    return { state };
  }
}
