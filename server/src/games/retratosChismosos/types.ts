import { Player } from '../../types/events';

export type RetratosPhase = 'clue' | 'results';

export interface PortraitClue {
  id: string;
  portraitName: string;
  portraitMood: 'chismoso' | 'dramatico' | 'ofendido' | 'misterioso' | 'burlon';
  category: string;
  clue: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  narratorLine?: string;
  pistas?: string[]; // Used in V1 for progressive revealing
}

export interface PortraitAnswer {
  clientId: string;
  answer: string;
  elapsedMs: number;
}

export interface RetratosState {
  phase: RetratosPhase;
  roundNumber: number;
  totalRounds: number;
  currentClue: PortraitClue | null;
  answeredClients: Record<string, PortraitAnswer>;
  startedAt: number;
  durationMs: number;
  results: any | null;
  usedIds: string[];
  players: Player[];
  currentClueIndex: number;
}
