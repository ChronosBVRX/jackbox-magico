import { GameModule, GameUpdateResult } from '../base';
import { Player } from '../../types/events';
import { SnitchState, MotionSegment } from './types';

export class AtrapaSnitch implements GameModule {
  id = 'atrapa_snitch' as const;
  name = 'Atrapa la Snitch';

  private readonly MAX_ATTEMPTS = 15;
  private readonly LAG_COMPENSATION_MS = 80;

  init(players: Player[]): SnitchState {
    const durationMs = 25000;
    const startedAt = Date.now();

    const state: SnitchState = {
      phase: 'playing',
      snitchSegments: this.generateSegments(startedAt, durationMs, 500, 1200),
      zoneSegments: this.generateSegments(startedAt, durationMs, 1500, 2500),
      catches: [],
      playerAttempts: {},
      startedAt,
      durationMs,
      results: null
    };

    return state;
  }

  getTvState(state: SnitchState) {
    if (state.phase === 'results') {
      return { phase: 'results', results: state.results };
    }

    const houseScores: { [house: string]: number } = {
      Gryffindor: 0,
      Slytherin: 0,
      Ravenclaw: 0,
      Hufflepuff: 0
    };

    state.catches.forEach(c => {
      const h = c.house || 'Gryffindor';
      if (houseScores[h] !== undefined) {
        houseScores[h] += c.points;
      } else {
        houseScores[h] = c.points;
      }
    });

    return {
      phase: state.phase,
      snitchSegments: state.snitchSegments,
      zoneSegments: state.zoneSegments,
      catches: state.catches.slice(-5),
      houseScores,
      startedAt: state.startedAt,
      durationMs: state.durationMs
    };
  }

  getPlayerState(state: SnitchState, player: Player) {
    if (state.phase === 'results') return { phase: 'results' };
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

    const catchTime = (action.timestamp || Date.now()) - this.LAG_COMPENSATION_MS;
    const snitchPos = this.getPositionAt(state.snitchSegments, catchTime);
    const zonePos = this.getPositionAt(state.zoneSegments, catchTime);

    if (!snitchPos || !zonePos) {
      return { state };
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

        const playerMap: { [clientId: string]: { name: string; house: string; points: number; bestCatch: string } } = {};
        
        state.catches.forEach(c => {
          if (!playerMap[c.clientId]) {
            playerMap[c.clientId] = { name: c.playerName, house: c.house, points: 0, bestCatch: c.label };
          }
          playerMap[c.clientId].points += c.points;
          if (c.points > 100) playerMap[c.clientId].bestCatch = c.label;
        });

        const ranking = Object.values(playerMap).sort((a, b) => b.points - a.points);
        const winner = ranking[0];

        const narratorComments = [
          "¡Qué espectáculo! Algunos volaron como halcones, otros rebotaron contra el suelo como sacos de papas.",
          "Madame Hooch está conmovida. O tal vez solo se le metió una mosca al ojo.",
          "El buscador estrella será la envidia de todo Hogwarts... hasta que le toque limpiar las jaulas de las lechuzas.",
          "Una persecución digna de la Copa Mundial de Quidditch. ¡Casi me da un infarto de tanta emoción!"
        ];
        const randomComment = narratorComments[Math.floor(Math.random() * narratorComments.length)];

        state.results = {
          correctAnswer: winner ? `¡${winner.name} es el Buscador Estrella!` : "¡Nadie atrapó la Snitch!",
          narratorComment: winner ? `"${randomComment}" - Comentarista de Quidditch` : '"¡Pésimo vuelo! Madame Hooch los ha mandado a clases de recuperación con Filch."',
          ranking
        };

        const pointEvents: any[] = [];
        state.catches.forEach(c => {
          pointEvents.push({
            clientId: c.clientId,
            points: c.points,
            gameId: 'atrapa_snitch',
            label: c.label
          });
        });

        return { 
          state,
          pointEvents,
          events: [
            { 
              type: 'voice_cue', 
              payload: { 
                cueKey: 'snitch_results', 
                text: winner ? `¡Increíble! ${winner.name} ha capturado la Snitch dorada con una técnica espectacular. ${randomComment}` : '¡Qué desastre de partido! Nadie atrapó la Snitch. Madame Hooch está furiosa.' 
              }, 
              target: 'all' 
            }
          ]
        };
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
    if (distance <= 3.8) return { points: 180, label: '¡AGARRE BUCAL! (Te tragaste la Snitch como Harry en su 1er año)' };
    if (distance <= 6.0) return { points: 130, label: '¡MANIOBRA WRONSKI! (Casi te rompes la crisma, pero la tienes)' };
    if (distance <= 9.8) return { points: 90, label: '¡ROZANDO LAS ALAS! (Le arrancaste una pluma dorada)' };
    if (distance <= 14.8) return { points: 45, label: '¡AGARRE DE AXILA! (Atrapada de milagro, el árbitro duda)' };
    return { points: 0, label: '¡BLUDGER EN LA CARA! (Atrapaste una mosca gorda en lugar de la Snitch)' };
  }
}
