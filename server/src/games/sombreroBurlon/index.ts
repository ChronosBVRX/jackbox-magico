import { GameModule, GameUpdateResult } from '../base';
import { Player } from '../../types/events';
import { SombreroState, SombreroPrompt } from './types';
import { SOMBRERO_PROMPTS_BANK, SOMBRERO_LINES } from './data';
import { calculateRoundScores, SOMBRERO_SCORING } from './scoring';

export class SombreroBurlon implements GameModule {
  id = 'sombrero_burlon' as const;
  name = 'El Sombrero Burlón';

  init(players: Player[]): SombreroState {
    const cumulativeScores: Record<string, { name: string; house: string; votes: number; points: number; reasons: string[] }> = {};
    players.forEach(p => {
      cumulativeScores[p.clientId] = { name: p.name, house: p.house || 'Gryffindor', votes: 0, points: 0, reasons: [] };
    });

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
      players,
      cumulativeScores
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
    
    roundScores.forEach(rs => {
      if (state.cumulativeScores[rs.clientId]) {
        state.cumulativeScores[rs.clientId].votes += rs.votes;
        state.cumulativeScores[rs.clientId].points += rs.points;
        state.cumulativeScores[rs.clientId].reasons.push(rs.reason);
      }
    });

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
    
    const ranking = Object.values(state.cumulativeScores).sort((a, b) => b.points - a.points);
    const winner = ranking[0];

    state.finalResults = {
      correctAnswer: winner ? `¡${winner.name} es el favorito del Sombrero!` : "El Sombrero Burlón",
      narratorComment: winner ? `"${winner.name} ha sido coronado como el mago más notorio de la noche."` : '"Nadie destacó ante el sombrero."',
      ranking
    };
    
    return { 
      state, 
      finished: true,
      events: [
        {
          type: 'voice_cue',
          payload: {
            cueKey: 'sombrero_final',
            text: winner ? `¡El sombrero burlón ha dictado su sentencia final! ${winner.name} se lleva la corona de la noche.` : 'El sombrero ha terminado su juicio.'
          },
          target: 'all'
        }
      ]
    };
  }
}
