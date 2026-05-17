import { GameModule, GameUpdateResult } from '../base';
import { Player } from '../../types/events';
import { RetratosState, PortraitClue, PortraitAnswer } from './types';
import { PORTRAIT_BANK, NARRATOR_LINES } from './data';
import { calculatePoints, RETRATOS_SCORING } from './scoring';

export class RetratosChismosos implements GameModule {
  id = 'retratos_chismosos' as const;
  name = 'Retratos Chismosos';

  init(players: Player[]): RetratosState {
    return {
      phase: 'clue',
      roundNumber: 0,
      totalRounds: 3,
      currentClue: null,
      answeredClients: {},
      startedAt: Date.now(),
      durationMs: 24000,
      results: null,
      usedIds: [],
      players,
      currentClueIndex: 0
    };
  }

  getTvState(state: RetratosState) {
    return {
      phase: state.phase,
      roundNumber: state.roundNumber,
      totalRounds: state.totalRounds,
      currentClue: state.currentClue ? {
        ...state.currentClue,
        clue: state.currentClue.pistas ? state.currentClue.pistas[state.currentClueIndex] : state.currentClue.clue
      } : null,
      answerCount: Object.keys(state.answeredClients).length,
      totalPlayers: state.players.length,
      results: state.results,
      clueIndex: state.currentClueIndex
    };
  }

  getPlayerState(state: RetratosState, player: Player) {
    return {
      phase: state.phase,
      question: state.currentClue?.question,
      options: state.currentClue?.options || [],
      alreadyAnswered: !!state.answeredClients[player.clientId],
      clueIndex: state.currentClueIndex
    };
  }

  handlePlayerAction(state: RetratosState, player: Player, action: any): GameUpdateResult {
    if (state.phase !== 'clue') return { state };
    if (action.type !== 'portrait_answer') return { state };
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

  handleHostAction(state: RetratosState, action: string): GameUpdateResult {
    if (action === 'next') {
      if (state.phase === 'clue') {
        return this.resolveRound(state);
      } else if (state.phase === 'results') {
        return this.startNextRound(state);
      }
    }
    return { state };
  }

  onTick(state: RetratosState): GameUpdateResult {
    if (state.phase === 'clue') {
      const elapsed = Date.now() - state.startedAt;
      const newIndex = Math.min(2, Math.floor(elapsed / 8000));
      if (newIndex !== state.currentClueIndex) {
        state.currentClueIndex = newIndex;
        return { state };
      }
    }
    return { state };
  }

  private startNextRound(state: RetratosState): GameUpdateResult {
    state.roundNumber++;
    if (state.roundNumber > state.totalRounds) {
      return { state, finished: true };
    }

    const available = PORTRAIT_BANK.filter(b => !state.usedIds.includes(b.id));
    const clue = available.length > 0 
      ? available[Math.floor(Math.random() * available.length)] 
      : PORTRAIT_BANK[Math.floor(Math.random() * PORTRAIT_BANK.length)];
    
    state.usedIds.push(clue.id);
    state.currentClue = clue;
    state.phase = 'clue';
    state.answeredClients = {};
    state.results = null;
    state.startedAt = Date.now();
    state.currentClueIndex = 0;

    return { state };
  }

  private resolveRound(state: RetratosState): GameUpdateResult {
    const pointEvents: any[] = [];
    const playerResults: any[] = [];
    const houseAcuracy: Record<string, number> = {};

    state.players.forEach(p => {
      const ans = state.answeredClients[p.clientId];
      const correct = ans?.answer === state.currentClue?.correctAnswer;
      const points = calculatePoints(correct, ans ? Math.floor(ans.elapsedMs / 8000) : 2);

      if (points > 0) {
        pointEvents.push({
          clientId: p.clientId,
          points,
          reason: `Pista ${Math.floor(ans.elapsedMs / 8000) + 1} (+${points})`,
          house: p.house
        });
        houseAcuracy[p.house] = (houseAcuracy[p.house] || 0) + 1;
      }

      playerResults.push({
        name: p.name,
        house: p.house,
        correct,
        points,
        answer: ans?.answer || 'Sin respuesta'
      });
    });

    // Bonuses
    const correctAnswers = Object.values(state.answeredClients)
      .filter(a => a.answer === state.currentClue?.correctAnswer)
      .sort((a, b) => a.elapsedMs - b.elapsedMs);
    
    if (correctAnswers.length > 0) {
      pointEvents.push({
        clientId: correctAnswers[0].clientId,
        points: RETRATOS_SCORING.FASTEST_BONUS,
        reason: "Susurro más rápido (+30)"
      });
    }

    Object.entries(houseAcuracy).forEach(([house, count]) => {
      if (count >= 2) {
        state.players.filter(p => p.house === house).forEach(p => {
          pointEvents.push({ clientId: p.clientId, points: RETRATOS_SCORING.HOUSE_BONUS / 2, reason: "Dúo de chismosos (+40)" });
        });
      }
    });

    state.phase = 'results';
    state.results = {
      correctAnswer: state.currentClue?.correctAnswer,
      explanation: state.currentClue?.explanation,
      ranking: playerResults.sort((a, b) => b.points - a.points),
      narrator: NARRATOR_LINES[Math.floor(Math.random() * NARRATOR_LINES.length)]
    };

    return { state, pointEvents };
  }
}
