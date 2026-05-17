import { GameModule, GameUpdateResult } from '../base';
import { Player } from '../../types/events';
import { CopaFinalState, FinalQuestion, FinalAnswer } from './types';
import { FINAL_POOL, NARRATOR_OPENING } from './data';
import { calculateCopaPoints, COPA_SCORING } from './scoring';

export class CopaFinal implements GameModule {
  id = 'copa_final' as const;
  name = 'Copa Final';

  init(players: Player[]): CopaFinalState {
    const question = FINAL_POOL[Math.floor(Math.random() * FINAL_POOL.length)];
    return {
      phase: 'wager',
      question,
      wagers: {},
      answers: {},
      startedAt: Date.now(),
      wagerDurationMs: 45000,
      questionDurationMs: 25000,
      results: null,
      players,
      roomScores: players.reduce((acc, p) => ({ ...acc, [p.clientId]: p.points }), {})
    };
  }

  getTvState(state: CopaFinalState) {
    return {
      phase: state.phase,
      question: state.phase === 'wager' ? null : state.question,
      wagerCount: Object.keys(state.wagers).length,
      answerCount: Object.keys(state.answers).length,
      totalPlayers: state.players.length,
      results: state.results,
      scores: state.players.map(p => ({ name: p.name, house: p.house, score: p.points }))
    };
  }

  getPlayerState(state: CopaFinalState, player: Player) {
    const wagerOptions = player.points < 100 ? [0, 100] : COPA_SCORING.WAGER_CHOICES.filter(w => w <= player.points);
    return {
      phase: state.phase,
      myScore: player.points,
      alreadyWagered: !!state.wagers[player.clientId],
      alreadyAnswered: !!state.answers[player.clientId],
      wagerOptions,
      options: state.phase === 'question' ? state.question?.options : []
    };
  }

  handlePlayerAction(state: CopaFinalState, player: Player, action: any): GameUpdateResult {
    if (state.phase === 'wager' && action.type === 'final_wager') {
      if (state.wagers[player.clientId] !== undefined) return { state };
      let amount = parseInt(action.amount);
      if (isNaN(amount)) return { state };
      
      const maxAllowed = Math.max(100, player.points);
      amount = Math.max(0, Math.min(amount, maxAllowed));
      state.wagers[player.clientId] = amount;
      
      return { state, events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }] };
    }

    if (state.phase === 'question' && action.type === 'final_answer') {
      if (state.answers[player.clientId]) return { state };
      
      state.answers[player.clientId] = {
        clientId: player.clientId,
        answer: action.answer,
        elapsedMs: Date.now() - state.startedAt
      };
      
      return { state, events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }] };
    }

    return { state };
  }

  handleHostAction(state: CopaFinalState, action: string): GameUpdateResult {
    if (action === 'next') {
      if (state.phase === 'wager') {
        state.phase = 'question';
        state.startedAt = Date.now();
        return { state };
      } else if (state.phase === 'question') {
        return this.resolveResults(state);
      } else if (state.phase === 'results') {
        return { state, finished: true };
      }
    }
    return { state };
  }

  private resolveResults(state: CopaFinalState): GameUpdateResult {
    const pointEvents: any[] = [];
    const playerResults: any[] = [];
    const houseScores: Record<string, number> = {};

    state.players.forEach(p => {
      const ans = state.answers[p.clientId];
      const wager = state.wagers[p.clientId] || 0;
      const correct = ans?.answer === state.question?.correctAnswer;
      
      // ALL_IN logic: if they wagered their full score (and it's > 0)
      const isAllIn = wager > 0 && wager === state.roomScores[p.clientId];
      
      const delta = calculateCopaPoints(correct, wager, isAllIn);

      pointEvents.push({
        clientId: p.clientId,
        points: delta,
        reason: correct ? (isAllIn ? "¡TODO O NADA ÉXITO! (+bonus)" : `Apuesta ganada (+${wager})`) : `Apuesta perdida (-${wager})`,
        house: p.house,
        correct
      });

      playerResults.push({
        name: p.name,
        house: p.house,
        correct,
        wager,
        points: delta,
        isAllIn
      });

      houseScores[p.house] = (houseScores[p.house] || 0) + (p.points + delta);
    });

    state.phase = 'results';
    
    // Sort houses to find winner
    const sortedHouses = Object.entries(houseScores).sort((a, b) => b[1] - a[1]);

    state.results = {
      correctAnswer: state.question?.correctAnswer,
      explanation: state.question?.explanation,
      ranking: playerResults.sort((a, b) => b.points - a.points),
      winnerHouse: sortedHouses.length > 0 ? sortedHouses[0][0] : null,
      narrator: NARRATOR_OPENING[Math.floor(Math.random() * NARRATOR_OPENING.length)]
    };

    return { state, pointEvents };
  }
}
