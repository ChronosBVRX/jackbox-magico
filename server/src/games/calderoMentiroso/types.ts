import { Player } from '../../types/events';

export type CalderoPhase = 'action' | 'reveal' | 'results';

export type IngredientType = 'good' | 'bad' | 'explosive' | 'gold';

export interface Ingredient {
  id: string;
  name: string;
  type: IngredientType;
  emoji: string;
  stabilityEffect: number;
  description: string;
}

export type CalderoAction = 
  | { type: 'add' }
  | { type: 'discard' }
  | { type: 'accuse'; targetClientId: string };

export interface CalderoState {
  phase: CalderoPhase;
  assignments: Record<string, Ingredient>; // clientId -> Ingredient
  actions: Record<string, CalderoAction>; // clientId -> Action
  startedAt: number;
  durationMs: number;
  baseStability: number;
  finalStability: number | null;
  exploded: boolean | null;
  results: any | null;
  players: Player[];
  publicLog: { playerName: string; text: string }[];
}
