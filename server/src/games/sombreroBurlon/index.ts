import { GameModule, GameUpdateResult } from '../base';
import { Player } from '../../types/events';
import { SombreroState, SombreroPrompt } from './types';
import { SOMBRERO_PROMPTS_BANK, SOMBRERO_LINES } from './data';
import { calculateRoundScores, SOMBRERO_SCORING } from './scoring';

export class SombreroBurlon implements GameModule {
  id = 'sombrero_burlon' as const;
  name = 'El Sombrero Burlón';

  init(players: Player[]): SombreroState {
    return {
      phase: 'prompt',
      roundNumber: 0,
      totalRounds: 3,
      currentPrompt: null,
      prompts: [],
      votes: {},
      roundResults: null,
      finalResults: null,
      startedAt: Date.now(),
      durationMs: 25000,
      usedPromptIds: [],
      players
    };
  }

  getTvState(state: SombreroState) {
    return {
      phase: state.phase,
      roundNumber: state.roundNumber,
      totalRounds: state.totalRounds,
      prompt: state.currentPrompt,
      answerCount: Object.keys(state.votes).length,
      totalPlayers: state.players.length,
      durationMs: state.durationMs,
      startedAt: state.startedAt,
      roundResults: state.roundResults,
      finalResults: state.finalResults
    };
  }

  getPlayerState(state: SombreroState, player: Player) {
    return {
      phase: state.phase,
      prompt: state.currentPrompt,
      alreadyVoted: !!state.votes[player.clientId],
      targets: state.players
        .filter(p => p.clientId !== player.clientId)
        .map(p => ({ clientId: p.clientId, name: p.name, house: p.house }))
    };
  }

  handlePlayerAction(state: SombreroState, player: Player, action: any): GameUpdateResult {
    if (state.phase !== 'prompt') return { state };
    if (action.type !== 'vote') return { state };
    if (state.votes[player.clientId]) return { state };
    if (action.targetClientId === player.clientId) return { state };

    state.votes[player.clientId] = action.targetClientId;

    return {
      state,
      events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }]
    };
  }

  handleHostAction(state: SombreroState, action: string): GameUpdateResult {
    if (action === 'next') {
      if (state.phase === 'prompt') {
        return this.resolveRound(state);
      } else if (state.phase === 'round_results') {
        return this.startNextRound(state);
      }
    }
    return { state };
  }

  private startNextRound(state: SombreroState): GameUpdateResult {
    state.roundNumber++;
    if (state.roundNumber > state.totalRounds) {
      return this.finalizeGame(state);
    }

    state.phase = 'prompt';
    state.votes = {};
    state.roundResults = null;
    state.startedAt = Date.now();
    state.currentPrompt = this.getRandomPrompt(state);

    return { state };
  }

  private getRandomPrompt(state: SombreroState): SombreroPrompt {
    const categories = Object.keys(SOMBRERO_PROMPTS_BANK);
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const bank = SOMBRERO_PROMPTS_BANK[cat];
    const text = bank[Math.floor(Math.random() * bank.length)];
    
    return {
      id: `${cat}_${Date.now()}`,
      text,
      category: cat as any
    };
  }

  private resolveRound(state: SombreroState): GameUpdateResult {
    const playerIds = state.players.map(p => p.clientId);
    const roundScores = calculateRoundScores(state.votes, playerIds);
    
    const pointEvents = roundScores.map(rs => {
      const player = state.players.find(p => p.clientId === rs.clientId)!;
      return {
        clientId: rs.clientId,
        points: rs.points,
        reason: rs.reason,
        house: player.house
      };
    });

    state.phase = 'round_results';
    state.roundResults = {
      prompt: state.currentPrompt,
      ranking: roundScores.map(rs => {
        const p = state.players.find(p => p.clientId === rs.clientId)!;
        return { name: p.name, house: p.house, votes: rs.votes, points: rs.points };
      }).sort((a, b) => b.votes - a.votes),
      hatLine: SOMBRERO_LINES[Math.floor(Math.random() * SOMBRERO_LINES.length)]
    };

    return { state, pointEvents };
  }

  private finalizeGame(state: SombreroState): GameUpdateResult {
    state.phase = 'final_results';
    
    // In a real implementation we'd aggregate all rounds, 
    // but here we rely on the pointEvents sent each round to the engine.
    // We just show the winner of the last round or a summary.
    
    return { state, finished: true };
  }
}
