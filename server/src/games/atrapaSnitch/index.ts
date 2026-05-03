import { GameModule, GameUpdateResult } from '../base';
import { Player } from '../../types/events';
import { SnitchState, MotionSegment } from './types';

export class AtrapaSnitch implements GameModule {
  id = 'atrapa_snitch' as const;
  name = 'Atrapa la Snitch';

  private readonly MAX_ATTEMPTS = 5;
  private readonly LAG_COMPENSATION_MS = 80;

  init(players: Player[]): SnitchState {
    const durationMs = 25000;
    const startedAt = Date.now();

    return {
      phase: 'playing', // For now, skip instructions for speed
      snitchSegments: this.generateSegments(startedAt, durationMs, 2000, 3000),
      zoneSegments: this.generateSegments(startedAt, durationMs, 4000, 6000),
      catches: [],
      playerAttempts: {},
      startedAt,
      durationMs
    };
  }

  getTvState(state: SnitchState) {
    return {
      phase: state.phase,
      snitchSegments: state.snitchSegments,
      zoneSegments: state.zoneSegments,
      catches: state.catches.slice(-5), // Only last 5 for UI feed
      startedAt: state.startedAt,
      durationMs: state.durationMs
    };
  }

  getPlayerState(state: SnitchState, player: Player) {
    const attempts = state.playerAttempts[player.clientId] || 0;
    return {
      phase: state.phase,
      attemptsRemaining: this.MAX_ATTEMPTS - attempts,
      canCatch: attempts < this.MAX_ATTEMPTS && state.phase === 'playing'
    };
  }

  handlePlayerAction(state: SnitchState, player: Player, action: any): GameUpdateResult {
    if (state.phase !== 'playing') return { state };
    
    const attempts = state.playerAttempts[player.clientId] || 0;
    if (attempts >= this.MAX_ATTEMPTS) return { state };

    state.playerAttempts[player.clientId] = attempts + 1;

    // VALIDATION
    const catchTime = (action.timestamp || Date.now()) - this.LAG_COMPENSATION_MS;
    const snitchPos = this.getPositionAt(state.snitchSegments, catchTime);
    const zonePos = this.getPositionAt(state.zoneSegments, catchTime);

    if (!snitchPos || !zonePos) {
      return { state }; // Outside game time
    }

    const distance = Math.sqrt(
      Math.pow(snitchPos.x - zonePos.x, 2) + 
      Math.pow(snitchPos.y - zonePos.y, 2)
    );

    const result = this.calculateCatchResult(distance);
    
    if (result.points > 0) {
      state.catches.push({
        clientId: player.clientId,
        playerName: player.name,
        house: player.house,
        distance,
        points: result.points,
        timestamp: catchTime,
        label: result.label
      });
    }

    return {
      state,
      events: [
        { 
          type: 'catch_result', 
          payload: { ...result, distance, attemptsRemaining: this.MAX_ATTEMPTS - (attempts + 1) }, 
          target: 'players' 
        }
      ]
    };
  }

  handleHostAction(state: SnitchState, action: string): GameUpdateResult {
    if (action === 'next') {
      if (state.phase === 'playing') {
        state.phase = 'results';
        return { state };
      } else {
        return { state, finished: true };
      }
    }
    return { state };
  }

  private generateSegments(startTime: number, totalDuration: number, minSeg: number, maxSeg: number): MotionSegment[] {
    const segments: MotionSegment[] = [];
    let currentT = startTime;
    const endTime = startTime + totalDuration;

    // Start center
    let lastX = 50;
    let lastY = 50;

    while (currentT < endTime) {
      const duration = Math.min(endTime - currentT, minSeg + Math.random() * (maxSeg - minSeg));
      const nextX = 10 + Math.random() * 80;
      const nextY = 10 + Math.random() * 80;

      segments.push({
        startTime: currentT,
        endTime: currentT + duration,
        startX: lastX,
        startY: lastY,
        endX: nextX,
        endY: nextY,
        easing: Math.random() > 0.5 ? 'ease-in-out' : 'linear'
      });

      lastX = nextX;
      lastY = nextY;
      currentT += duration;
    }

    return segments;
  }

  private getPositionAt(segments: MotionSegment[], time: number): { x: number, y: number } | null {
    const seg = segments.find(s => time >= s.startTime && time <= s.endTime);
    if (!seg) return null;

    let t = (time - seg.startTime) / (seg.endTime - seg.startTime);
    
    if (seg.easing === 'ease-in-out') {
      t = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    return {
      x: seg.startX + (seg.endX - seg.startX) * t,
      y: seg.startY + (seg.endY - seg.startY) * t
    };
  }

  private calculateCatchResult(distance: number): { points: number, label: string } {
    if (distance <= 3.8) return { points: 180, label: '¡CAPTURADA! (Legendaria)' };
    if (distance <= 6.0) return { points: 130, label: '¡CAPTURADA! (Perfecta)' };
    if (distance <= 9.8) return { points: 90, label: '¡CAPTURADA! (Gran Captura)' };
    if (distance <= 14.8) return { points: 45, label: '¡CAPTURADA! (Cerca)' };
    return { points: 0, label: 'FALLO' };
  }
}
