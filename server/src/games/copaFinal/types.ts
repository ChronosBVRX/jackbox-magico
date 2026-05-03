import { Player } from '../../types/events';

export type CopaPhase = 'wager' | 'question' | 'results';

export interface FinalQuestion {
  id: string;
  category: string;
  difficulty: 'experto';
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  narratorLine?: string;
}

export interface FinalAnswer {
  clientId: string;
  answer: string;
  elapsedMs: number;
}

export interface CopaFinalState {
  phase: CopaPhase;
  question: FinalQuestion | null;
  wagers: Record<string, number>; // clientId -> amount
  answers: Record<string, FinalAnswer>; // clientId -> answer
  startedAt: number;
  wagerDurationMs: number;
  questionDurationMs: number;
  results: any | null;
  players: Player[];
  roomScores: Record<string, number>; // clientId -> score
}
