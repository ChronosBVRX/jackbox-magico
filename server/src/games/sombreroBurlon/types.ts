import { Player } from '../../types/events';

export type SombreroPhase = 'prompt' | 'round_results' | 'final_results';

export interface SombreroPrompt {
  id: string;
  text: string;
  category: 'gracioso' | 'sospechoso' | 'dramatico' | 'social' | 'magico';
  narratorLine?: string;
}

export interface SombreroState {
  phase: SombreroPhase;
  roundNumber: number;
  totalRounds: number;
  currentPrompt: SombreroPrompt | null;
  prompts: SombreroPrompt[];
  votes: Record<string, string>; // voterClientId -> votedClientId
  roundResults: any | null;
  finalResults: any | null;
  startedAt: number;
  durationMs: number;
  usedPromptIds: string[];
  players: Player[];
  cumulativeScores: Record<string, { name: string; house: string; votes: number; points: number; reasons: string[] }>;
}
