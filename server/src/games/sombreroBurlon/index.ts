import { GameModule, GameUpdateResult } from '../base';
import { Player } from '../../types/events';
import { HAT_PHRASES } from './data';

interface SombreroState {
  phase: 'hat_line' | 'voting' | 'results';
  currentPhrase: string;
  roundNumber: number;
  totalRounds: number;
  votes: Map<string, string>; // VoterID -> TargetID
  players: Player[];
  results: any | null;
}

export class SombreroBurlon implements GameModule {
  id = 'sombrero_burlon' as const;
  name = 'El Sombrero Burlón';

  init(players: Player[]): SombreroState {
    return {
      phase: 'hat_line',
      currentPhrase: '',
      roundNumber: 0,
      totalRounds: 3,
      votes: new Map(),
      players,
      results: null
    };
  }

  getTvState(state: SombreroState) {
    return {
      phase: state.phase,
      currentPhrase: state.currentPhrase,
      voteCount: state.votes.size,
      totalPlayers: state.players.length,
      results: state.results,
      roundNumber: state.roundNumber,
      totalRounds: state.totalRounds
    };
  }

  getPlayerState(state: SombreroState, player: Player) {
    return {
      phase: state.phase,
      alreadyVoted: state.votes.has(player.clientId),
      targets: state.players
        .filter(p => p.clientId !== player.clientId) // Can't vote for self
        .map(p => ({ clientId: p.clientId, name: p.name, house: p.house }))
    };
  }

  handlePlayerAction(state: SombreroState, player: Player, action: any): GameUpdateResult {
    if (state.phase !== 'voting') return { state };
    if (state.votes.has(player.clientId)) return { state };
    if (action.targetId === player.clientId) return { state }; // Anti-self-vote

    state.votes.set(player.clientId, action.targetId);

    return {
      state,
      events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }]
    };
  }

  handleHostAction(state: SombreroState, action: string): GameUpdateResult {
    if (action === 'next') {
      if (state.phase === 'hat_line') {
        state.phase = 'voting';
        return { state };
      } else if (state.phase === 'voting') {
        return this.resolveVotes(state);
      } else {
        return this.startNextRound(state);
      }
    }
    return { state };
  }

  private startNextRound(state: SombreroState): GameUpdateResult {
    state.roundNumber++;
    if (state.roundNumber > state.totalRounds) {
      return { state, finished: true };
    }

    state.phase = 'hat_line';
    state.votes.clear();
    state.results = null;
    state.currentPhrase = HAT_PHRASES[Math.floor(Math.random() * HAT_PHRASES.length)];

    return { state };
  }

  private resolveVotes(state: SombreroState): GameUpdateResult {
    const counts: Record<string, number> = {};
    state.votes.forEach(targetId => {
      counts[targetId] = (counts[targetId] || 0) + 1;
    });

    const results = state.players.map(p => ({
      clientId: p.clientId,
      name: p.name,
      house: p.house,
      votes: counts[p.clientId] || 0,
      points: (counts[p.clientId] || 0) * 50
    })).sort((a, b) => b.votes - a.votes);

    state.phase = 'results';
    state.results = {
      winner: results[0].votes > 0 ? results[0] : null,
      ranking: results
    };

    return { state };
  }
}
