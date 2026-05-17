export interface KMKCharacter {
  id: string;
  name: string;
  movieTitle: string;
  description: string;
  emoji: string;
  image: string;
}

export interface KMKPlayerPrediction {
  clientId: string;
  playerName: string;
  house: string;
  prediction: Record<string, 'kiss' | 'marry' | 'kill'>;
  pointsAwarded: number;
  matches: number;
}

export interface BesoBodaMuerteState {
  phase: 'instructions' | 'predicting' | 'results';
  targetClientId: string;
  targetPlayerName: string;
  targetPlayerHouse: string;
  characters: KMKCharacter[];
  targetChoices: Record<string, 'kiss' | 'marry' | 'kill'> | null;
  playerPredictions: Record<string, KMKPlayerPrediction>;
  startedAt: number;
  durationMs: number;
  results?: any | null;
}
