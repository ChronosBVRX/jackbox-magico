import { GameModule, GameUpdateResult } from '../base';
import { Player } from '../../types/events';
import { triviaQuestions, TriviaQuestion } from '../../data/triviaQuestions';
import { calculateTriviaPoints } from '../../engine/scoring';

interface TriviaState {
  roundNumber: number;
  totalRounds: number;
  currentQuestion: TriviaQuestion | null;
  answeredClients: Set<string>;
  roundAnswers: Array<{ clientId: string; answer: string; elapsedMs: number }>;
  startedAt: number;
  durationMs: number;
  results: any | null;
  playerCount: number;
}

export class TriviaMagica implements GameModule {
  id = 'trivia_magica' as const;
  name = 'Trivia del Mundo Mágico';

  init(players: Player[]): TriviaState {
    const firstQuestion = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
    return {
      roundNumber: 1,
      totalRounds: 5,
      currentQuestion: firstQuestion,
      answeredClients: new Set(),
      roundAnswers: [],
      startedAt: Date.now(),
      durationMs: 20000,
      results: null,
      playerCount: players.length
    };
  }

  getTvState(state: TriviaState) {
    if (state.results) return { phase: 'results', ...state.results };
    
    return {
      phase: 'question',
      roundNumber: state.roundNumber,
      totalRounds: state.totalRounds,
      category: state.currentQuestion?.category,
      question: state.currentQuestion?.question,
      options: state.currentQuestion?.options || [],
      durationMs: state.durationMs,
      startedAt: state.startedAt,
      answerCount: state.answeredClients.size,
      totalPlayers: state.playerCount
    };
  }

  getPlayerState(state: TriviaState, player: Player) {
    if (state.results) return { phase: 'results' };
    
    return {
      phase: 'question',
      question: state.currentQuestion?.question,
      options: state.currentQuestion?.options || [],
      alreadyAnswered: state.answeredClients.has(player.clientId),
      durationMs: state.durationMs,
      startedAt: state.startedAt
    };
  }

  handlePlayerAction(state: TriviaState, player: Player, action: any): GameUpdateResult {
    if (state.results) return { state };
    if (state.answeredClients.has(player.clientId)) return { state };

    const elapsedMs = Date.now() - state.startedAt;
    
    const rawAnswer = action.answer;
    let normalizedAnswer = rawAnswer;

    const labels = ['A', 'B', 'C', 'D'];
    const labelIndex = labels.indexOf(rawAnswer);

    if (labelIndex >= 0 && state.currentQuestion?.options[labelIndex]) {
      normalizedAnswer = state.currentQuestion.options[labelIndex];
    }

    state.answeredClients.add(player.clientId);
    state.roundAnswers.push({ clientId: player.clientId, answer: normalizedAnswer, elapsedMs });

    return {
      state,
      events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }]
    };
  }

  handleHostAction(state: TriviaState, action: string): GameUpdateResult {
    if (action === 'next') {
      if (!state.results && state.currentQuestion) {
        return this.resolveRound(state);
      }
      if (state.results) {
        return this.startNextRound(state);
      }
    }
    return { state };
  }

  private startNextRound(state: TriviaState): GameUpdateResult {
    state.roundNumber++;
    if (state.roundNumber > state.totalRounds) {
      return { state, finished: true };
    }

    state.results = null;
    state.answeredClients.clear();
    state.roundAnswers = [];
    state.currentQuestion = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
    state.startedAt = Date.now();

    return { state };
  }

  private resolveRound(state: TriviaState): GameUpdateResult {
    if (!state.currentQuestion) return { state };

    const results: any[] = [];
    let fastestClientId: string | null = null;
    let minElapsed = Infinity;

    state.roundAnswers.forEach(ans => {
      if (ans.answer === state.currentQuestion?.correctAnswer && ans.elapsedMs < minElapsed) {
        minElapsed = ans.elapsedMs;
        fastestClientId = ans.clientId;
      }
    });

    // Scoring logic is handled by the engine normally, but for now we'll put it here or return point events
    // Let's use a point_events pattern
    const pointEvents: any[] = [];

    state.roundAnswers.forEach(ans => {
      const isCorrect = ans.answer === state.currentQuestion?.correctAnswer;
      const isFastest = ans.clientId === fastestClientId;
      
      // We need streak here... for now simplified
      const { points, labels } = calculateTriviaPoints(state.currentQuestion!.difficulty, isCorrect, isFastest, 0);
      
      pointEvents.push({
        clientId: ans.clientId,
        points,
        reason: labels.join(', ')
      });

      results.push({
        clientId: ans.clientId,
        isCorrect,
        points,
        labels
      });
    });

    state.results = {
      correctAnswer: state.currentQuestion.correctAnswer,
      narratorComment: state.currentQuestion.narratorComment,
      results
    };

    return { 
      state,
      events: [{ type: 'round_results', payload: state.results, target: 'all' }]
    };
  }
}
