import { Player } from '../../types/events';

export type PocionesPhase = 'memorize' | 'mix' | 'results';

export interface Ingredient {
  id: string;
  name: string;
  emoji: string;
}

export interface PotionRecipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  difficulty: 'facil' | 'media' | 'dificil' | 'caos';
  narratorLine?: string;
}

export interface PotionAnswer {
  clientId: string;
  selectedIngredientIds: string[];
  elapsedMs: number;
}

export interface PocionesState {
  phase: PocionesPhase;
  roundNumber: number;
  totalRounds: number;
  potion: PotionRecipe | null;
  availableIngredients: Ingredient[];
  answers: Record<string, PotionAnswer>;
  startedAt: number;
  memorizeDurationMs: number;
  mixDurationMs: number;
  mode: 'normal' | 'reverse' | 'decoy' | 'smoke' | 'unstable';
  results: any | null;
  players: Player[];
}
