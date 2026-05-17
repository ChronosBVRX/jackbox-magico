export interface TiburonCreation {
  id: string;
  prompt: string;
  category: 'hagrid' | 'weasley';
  topAuthorId: string;
  topAuthorName: string;
  topAuthorHouse: string;
  topLines: string; // Data URL del dibujo superior
  bottomAuthorId: string;
  bottomAuthorName: string;
  bottomAuthorHouse: string;
  bottomLines: string; // Data URL del dibujo inferior
  investments: Record<string, number>; // clientId -> cantidad invertida en Galeones
  totalInvestment: number;
}

export interface TiburonState {
  phase: 'drawing_top' | 'drawing_bottom' | 'pitching' | 'results';
  prompts: { prompt: string; category: 'hagrid' | 'weasley' }[];
  creations: Record<string, TiburonCreation>;
  currentPitchIndex: number;
  startedAt: number;
  durationMs: number;
  results: {
    ranking: {
      creationId: string;
      prompt: string;
      category: 'hagrid' | 'weasley';
      topAuthorName: string;
      bottomAuthorName: string;
      totalInvestment: number;
      topAuthorHouse: string;
      bottomAuthorHouse: string;
      topLines: string;
      bottomLines: string;
    }[];
    winner: TiburonCreation | null;
  } | null;
}
