export interface MotionSegment {
  startTime: number;
  endTime: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  easing: 'linear' | 'ease-in-out';
}

export interface SnitchState {
  phase: 'instructions' | 'playing' | 'results';
  snitchSegments: MotionSegment[];
  zoneSegments: MotionSegment[];
  catches: Array<{
    clientId: string;
    playerName: string;
    house: string;
    distance: number;
    points: number;
    timestamp: number;
    label: string;
  }>;
  playerAttempts: Record<string, number>;
  startedAt: number;
  durationMs: number;
}
