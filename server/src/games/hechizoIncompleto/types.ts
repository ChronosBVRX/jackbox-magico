import { Player } from '../../types/events';

export type HechizoPhase = 'spell' | 'results';

export interface IncompleteSpell {
  id: string;
  category: 'hechizo' | 'frase' | 'efecto' | 'objeto' | 'criatura';
  incompleteText: string;
  context: string;
  options: string[];
  correctAnswer: string;
  completedText: string;
  explanation: string;
  difficulty: 'facil' | 'media' | 'dificil' | 'experto';
}

export interface SpellAnswer {
  clientId: string;
  answer: string;
  elapsedMs: number;
}

export interface HechizoState {
  phase: HechizoPhase;
  roundNumber: number;
  totalRounds: number;
  currentSpell: IncompleteSpell | null;
  answeredClients: Record<string, SpellAnswer>;
  startedAt: number;
  durationMs: number;
  results: any | null;
  usedIds: string[];
  players: Player[];
  streaks: Record<string, number>;
}
