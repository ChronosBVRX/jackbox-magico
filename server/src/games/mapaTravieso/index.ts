import { GameModule, GameUpdateResult } from '../base';
import { Player } from '../../types/events';
import { MapaState, MapLocation, MapZone, MapItem } from './types';
import { ZONES, MAGIC_OBJECTS, NARRATOR_LINES } from './data';
import { getBasePoints, MAPA_SCORING } from './scoring';

export class MapaTravieso implements GameModule {
  id = 'mapa_travieso' as const;
  name = 'El Mapa Travieso';

  init(players: Player[]): MapaState {
    return {
      phase: 'observe',
      roundNumber: 0,
      totalRounds: 3,
      mapLayout: [],
      target: null,
      answers: {},
      startedAt: Date.now(),
      observeDurationMs: 8000,
      answerDurationMs: 10000,
      mode: 'normal',
      results: null,
      players
    };
  }

  getTvState(state: MapaState) {
    return {
      phase: state.phase,
      roundNumber: state.roundNumber,
      totalRounds: state.totalRounds,
      mapLayout: state.phase === 'observe' ? state.mapLayout : [], // Hide layout in answer phase
      target: state.target,
      mode: state.mode,
      answerCount: Object.keys(state.answers).length,
      totalPlayers: state.players.length,
      results: state.results
    };
  }

  getPlayerState(state: MapaState, player: Player) {
    return {
      phase: state.phase,
      target: state.target,
      alreadyAnswered: !!state.answers[player.clientId],
      options: state.target?.options || []
    };
  }

  handlePlayerAction(state: MapaState, player: Player, action: any): GameUpdateResult {
    if (state.phase !== 'answer') return { state };
    if (action.type !== 'map_answer') return { state };
    if (state.answers[player.clientId]) return { state };

    state.answers[player.clientId] = {
      clientId: player.clientId,
      zoneId: action.zoneId,
      elapsedMs: Date.now() - state.startedAt
    };

    return {
      state,
      events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }]
    };
  }

  handleHostAction(state: MapaState, action: string): GameUpdateResult {
    if (action === 'next') {
      if (state.phase === 'observe') {
        state.phase = 'answer';
        state.startedAt = Date.now();
        return { state };
      } else if (state.phase === 'answer') {
        return this.resolveRound(state);
      } else if (state.phase === 'results') {
        return this.startNextRound(state);
      }
    }
    return { state };
  }

  private startNextRound(state: MapaState): GameUpdateResult {
    state.roundNumber++;
    if (state.roundNumber > state.totalRounds) {
      return { state, finished: true };
    }

    const modes: MapaState['mode'][] = ['normal', 'filch', 'moving_stairs'];
    state.mode = modes[Math.floor(Math.random() * modes.length)];
    state.observeDurationMs = state.mode === 'filch' ? 5000 : 8000;

    // Generate Layout
    const shuffledZones = [...ZONES].sort(() => Math.random() - 0.5);
    const shuffledItems = [...MAGIC_OBJECTS].sort(() => Math.random() - 0.5);
    const itemCount = 5;
    
    state.mapLayout = [];
    for (let i = 0; i < itemCount; i++) {
      state.mapLayout.push({
        item: shuffledItems[i],
        zone: shuffledZones[i]
      });
    }

    // Pick Target
    const targetLoc = state.mapLayout[Math.floor(Math.random() * state.mapLayout.length)];
    const options = [...ZONES].sort(() => Math.random() - 0.5).slice(0, 4);
    if (!options.find(o => o.id === targetLoc.zone.id)) {
      options[0] = targetLoc.zone;
    }

    state.target = {
      itemId: targetLoc.item.id,
      itemName: targetLoc.item.name,
      itemEmoji: targetLoc.item.emoji,
      question: `¿Dónde estaba el/la ${targetLoc.item.name}?`,
      correctZoneId: targetLoc.zone.id,
      options: options.sort(() => Math.random() - 0.5)
    };

    state.phase = 'observe';
    state.answers = {};
    state.results = null;
    state.startedAt = Date.now();

    return { state };
  }

  private resolveRound(state: MapaState): GameUpdateResult {
    const pointEvents: any[] = [];
    const playerResults: any[] = [];
    const houseAcuracy: Record<string, number> = {};

    state.players.forEach(p => {
      const ans = state.answers[p.clientId];
      const correct = ans?.zoneId === state.target?.correctZoneId;
      const points = getBasePoints(correct, state.mode);

      pointEvents.push({
        clientId: p.clientId,
        points,
        reason: correct ? "Ubicación correcta" : (state.mode === 'filch' ? "Filch te atrapó (-20)" : "Ubicación incorrecta"),
        house: p.house
      });

      if (correct) {
        houseAcuracy[p.house] = (houseAcuracy[p.house] || 0) + 1;
      }

      playerResults.push({
        name: p.name,
        house: p.house,
        correct,
        points
      });
    });

    // Fastest Bonus
    const correctAnswers = Object.values(state.answers)
      .filter(a => a.zoneId === state.target?.correctZoneId)
      .sort((a, b) => a.elapsedMs - b.elapsedMs);
    
    if (correctAnswers.length > 0) {
      const fastest = correctAnswers[0];
      pointEvents.push({
        clientId: fastest.clientId,
        points: MAPA_SCORING.FASTEST_BONUS,
        reason: "Explorador más rápido (+30)"
      });
    }

    // House Combo
    Object.entries(houseAcuracy).forEach(([house, count]) => {
      if (count >= 2) {
        state.players.filter(p => p.house === house).forEach(p => {
          pointEvents.push({
            clientId: p.clientId,
            points: MAPA_SCORING.HOUSE_COMBO,
            reason: "Dúo dinámico: Casa acertó (+80)"
          });
        });
      }
    });

    state.phase = 'results';
    state.results = {
      correctZone: ZONES.find(z => z.id === state.target?.correctZoneId),
      ranking: playerResults.sort((a, b) => b.points - a.points),
      narrator: NARRATOR_LINES[Math.floor(Math.random() * NARRATOR_LINES.length)]
    };

    return { state, pointEvents };
  }
}
