import { Player } from '../../types/events';

export type PatronusPhase = 'submit' | 'vote' | 'results';

export interface PatronusPrompt {
  id: string;
  text: string;
  tone: 'gracioso' | 'raro' | 'dramatico' | 'tierno' | 'absurdo';
  narratorLine?: string;
}

export interface PatronusSubmission {
  id: string;
  clientId: string;
  playerName: string;
  house: string;
  text: string;
  createdAt: number;
}

export interface PatronusState {
  phase: PatronusPhase;
  prompt: PatronusPrompt | null;
  submissions: Record<string, PatronusSubmission>; // clientId -> Submission
  votes: Record<string, string>; // voterClientId -> submissionId
  startedAt: number;
  submitDurationMs: number;
  voteDurationMs: number;
  results: any | null;
  players: Player[];
}
