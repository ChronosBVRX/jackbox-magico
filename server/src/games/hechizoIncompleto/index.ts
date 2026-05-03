import { GameModule, GameUpdateResult } from '../base';
import { Player } from '../../types/events';
import { HechizoState, IncompleteSpell, SpellAnswer } from './types';
import { SPELL_BANK, NARRATOR_LINES } from './data';
import { calculateSpellPoints, HECHIZO_SCORING } from './scoring';

export class HechizoIncompleto implements GameModule {
  id = 'hechizo_incompleto' as const;
  name = 'Hechizo Incompleto';

  init(players: Player[]): HechizoState {
    return {
      phase: 'spell',
      roundNumber: 0,
      totalRounds: 5,
      currentSpell: null,
      answeredClients: {},
      startedAt: Date.now(),
      durationMs: 7000,
      results: null,
      usedIds: [],
      players,
      streaks: {}
    };
  }

  getTvState(state: HechizoState) {
    return {
      phase: state.phase,
      roundNumber: state.roundNumber,
      totalRounds: state.totalRounds,
      currentSpell: state.currentSpell,
      answerCount: Object.keys(state.answeredClients).length,
      totalPlayers: state.players.length,
      results: state.results
    };
  }

  getPlayerState(state: HechizoState, player: Player) {
    return {
      phase: state.phase,
      options: state.currentSpell?.options || [],
      alreadyAnswered: !!state.answeredClients[player.clientId],
      streak: state.streaks[player.clientId] || 0
    };
  }

  handlePlayerAction(state: HechizoState, player: Player, action: any): GameUpdateResult {
    if (state.phase !== 'spell') return { state };
    if (action.type !== 'spell_answer') return { state };
    if (state.answeredClients[player.clientId]) return { state };

    state.answeredClients[player.clientId] = {
      clientId: player.clientId,
      answer: action.answer,
      elapsedMs: Date.now() - state.startedAt
    };

    return {
      state,
      events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }]
    };
  }

  handleHostAction(state: HechizoState, action: string): GameUpdateResult {
    if (action === 'next') {
      if (state.phase === 'spell') {
        return this.resolveRound(state);
      } else if (state.phase === 'results') {
        return this.startNextRound(state);
      }
    }
    return { state };
  }

  private startNextRound(state: HechizoState): GameUpdateResult {
    state.roundNumber++;
    if (state.roundNumber > state.totalRounds) {
      return { state, finished: true };
    }

    const available = SPELL_BANK.filter(s => !state.usedIds.includes(s.id));
    const spell = available.length > 0 
      ? available[Math.floor(Math.random() * available.length)] 
      : SPELL_BANK[Math.floor(Math.random() * SPELL_BANK.length)];
    
    state.usedIds.push(spell.id);
    state.currentSpell = spell;
    state.phase = 'spell';
    state.answeredClients = {};
    state.results = null;
    state.startedAt = Date.now();

    return { state };
  }

  private resolveRound(state: HechizoState): GameUpdateResult {
    const pointEvents: any[] = [];
    const playerResults: any[] = [];

    state.players.forEach(p => {
      const ans = state.answeredClients[p.clientId];
      const correct = ans?.answer === state.currentSpell?.correctAnswer;
      
      if (correct) {
        state.streaks[p.clientId] = (state.streaks[p.clientId] || 0) + 1;
      } else {
        state.streaks[p.clientId] = 0;
      }

      const points = calculateSpellPoints(
        correct, 
        ans?.elapsedMs || 9999, 
        state.currentSpell?.difficulty || 'media', 
        state.streaks[p.clientId]
      );

      if (points !== 0) {
        pointEvents.push({
          clientId: p.clientId,
          points,
          reason: correct ? (ans!.elapsedMs < HECHIZO_SCORING.FAST_LIMIT_MS ? "Correcto + Rapidez" : "Correcto") : "Fallo (Modo Experto)",
          house: p.house
        });
      }

      playerResults.push({
        name: p.name,
        house: p.house,
        correct,
        points,
        streak: state.streaks[p.clientId]
      });
    });

    state.phase = 'results';
    state.results = {
      correctAnswer: state.currentSpell?.correctAnswer,
      completedText: state.currentSpell?.completedText,
      explanation: state.currentSpell?.explanation,
      ranking: playerResults.sort((a, b) => b.points - a.points),
      narrator: NARRATOR_LINES[Math.floor(Math.random() * NARRATOR_LINES.length)]
    };

    return { state, pointEvents };
  }
}
