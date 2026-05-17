export interface DictadoStory {
  id: number;
  title: string;
  originalText: string;
  voiceId: string;
  audioUrl: string;
}

export interface DictadoSubmission {
  clientId: string;
  playerName: string;
  playerHouse: string;
  transcription: string;
  similarity: number; // porcentaje 0-100
  points: number;
  isFunny?: boolean;
}

export interface DictadoState {
  phase: 'playing' | 'voting_host' | 'results';
  currentStory: DictadoStory;
  submissions: Record<string, DictadoSubmission>;
  startedAt: number;
  durationMs: number;
  results: {
    ranking: DictadoSubmission[];
    winner: DictadoSubmission | null;
  } | null;
}
