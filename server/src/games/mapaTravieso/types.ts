import { Player } from '../../types/events';

export type MapaPhase = 'observe' | 'answer' | 'results';

export interface MapZone {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface MapItem {
  id: string;
  name: string;
  emoji: string;
}

export interface MapLocation {
  item: MapItem;
  zone: MapZone;
}

export interface MapTarget {
  itemId: string;
  itemName: string;
  itemEmoji: string;
  question: string;
  correctZoneId: string;
  options: MapZone[];
}

export interface MapAnswer {
  clientId: string;
  zoneId: string;
  elapsedMs: number;
}

export interface MapaState {
  phase: MapaPhase;
  roundNumber: number;
  totalRounds: number;
  mapLayout: MapLocation[];
  target: MapTarget | null;
  answers: Record<string, MapAnswer>;
  startedAt: number;
  observeDurationMs: number;
  answerDurationMs: number;
  mode: 'normal' | 'filch' | 'moving_stairs';
  results: any | null;
  players: Player[];
}
