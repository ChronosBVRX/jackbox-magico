import { GameModule, GameUpdateResult } from '../base';
import { Player } from '../../types/events';
import { CalderoState, Ingredient, IngredientType, CalderoAction } from './types';
import { INGREDIENT_CONFIGS, INGREDIENT_NAMES, NARRATOR_LINES } from './data';
import { CALDERO_SCORING } from './scoring';

export class CalderoMentiroso implements GameModule {
  id = 'caldero_mentiroso' as const;
  name = 'El Caldero Mentiroso';

  init(players: Player[]): CalderoState {
    const assignments: Record<string, Ingredient> = {};
    const deck: IngredientType[] = ['good', 'good', 'good', 'bad', 'bad', 'explosive', 'explosive', 'gold'];
    const shuffledDeck = [...deck].sort(() => Math.random() - 0.5);

    players.forEach((p, i) => {
      const type = shuffledDeck[i % shuffledDeck.length];
      const config = INGREDIENT_CONFIGS[type];
      assignments[p.clientId] = {
        id: `ing_${i}`,
        type,
        name: INGREDIENT_NAMES[type][Math.floor(Math.random() * INGREDIENT_NAMES[type].length)],
        emoji: config.emoji,
        stabilityEffect: config.effect,
        description: config.tone
      };
    });

    return {
      phase: 'action',
      assignments,
      actions: {},
      startedAt: Date.now(),
      durationMs: 60000,
      baseStability: 3,
      finalStability: null,
      exploded: null,
      results: null,
      players,
      publicLog: []
    };
  }

  getTvState(state: CalderoState) {
    const currentStability = state.baseStability + Object.entries(state.actions).reduce((sum, [id, a]) => {
      return sum + (a.type === 'add' ? state.assignments[id].stabilityEffect : 0);
    }, 0);

    return {
      phase: state.phase,
      actionCount: Object.keys(state.actions).length,
      totalPlayers: state.players.length,
      publicLog: state.publicLog,
      results: state.results,
      currentStability
    };
  }

  getPlayerState(state: CalderoState, player: Player) {
    const ing = state.assignments[player.clientId];
    let objective = "";
    if (ing?.type === 'good') objective = "🎯 Objetivo: Agrégalo al caldero para ganar +120 pts (si no explota).";
    else if (ing?.type === 'bad') objective = "🎯 Objetivo: Agrégalo para sabotear (+40 pts si explota) o descártalo.";
    else if (ing?.type === 'explosive') objective = "🎯 Objetivo: Agrégalo para causar explosión (+80 pts) o descártalo para salvar a tu casa (+60 pts).";
    else if (ing?.type === 'gold') objective = "🎯 Objetivo: Agrégalo para obtener la máxima gloria (+180 pts si no explota).";

    return {
      phase: state.phase,
      myIngredient: ing ? { ...ing, objective } : null,
      alreadyActed: !!state.actions[player.clientId],
      players: state.players
        .filter(p => p.clientId !== player.clientId)
        .map(p => ({ clientId: p.clientId, name: p.name, house: p.house }))
    };
  }

  handlePlayerAction(state: CalderoState, player: Player, action: any): GameUpdateResult {
    if (state.phase !== 'action') return { state };
    if (action.type !== 'caldero_action') return { state };
    if (state.actions[player.clientId]) return { state };

    state.actions[player.clientId] = action.actionData;
    
    // Log public action (generic)
    let text = "";
    if (action.actionData.type === 'add') text = `${player.name} se acercó al caldero.`;
    else if (action.actionData.type === 'discard') text = `${player.name} descartó algo sospechoso.`;
    else text = `${player.name} lanzó una acusación dramática.`;

    state.publicLog.push({ playerName: player.name, text });

    return {
      state,
      events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }]
    };
  }

  handleHostAction(state: CalderoState, action: string): GameUpdateResult {
    if (action === 'next') {
      if (state.phase === 'action') {
        return this.resolveGame(state);
      } else if (state.phase === 'results') {
        return { state, finished: true };
      }
    }
    return { state };
  }

  private resolveGame(state: CalderoState): GameUpdateResult {
    let stability = state.baseStability;
    const pointEvents: any[] = [];
    const playerResults: any[] = [];
    
    // 1. Calculate Stability
    state.players.forEach(p => {
      const action = state.actions[p.clientId];
      const ingredient = state.assignments[p.clientId];
      if (action?.type === 'add') {
        stability += ingredient.stabilityEffect;
      }
    });

    const exploded = stability < 1;
    const correctlyAccused = new Set<string>(); // clientIds of those correctly accused

    // 2. Process Accusations
    state.players.forEach(p => {
      const action = state.actions[p.clientId];
      if (action?.type === 'accuse') {
        const targetId = action.targetClientId;
        const targetAction = state.actions[targetId];
        const targetIng = state.assignments[targetId];

        if (targetAction?.type === 'add') {
          if (targetIng.type === 'explosive') {
            correctlyAccused.add(targetId);
            pointEvents.push({ clientId: p.clientId, points: CALDERO_SCORING.ACCUSE_CORRECT_EXPLOSIVE, reason: "Acusación correcta: ¡Explosivo! (+90)" });
          } else if (targetIng.type === 'bad') {
            correctlyAccused.add(targetId);
            pointEvents.push({ clientId: p.clientId, points: CALDERO_SCORING.ACCUSE_CORRECT_BAD, reason: "Acusación correcta: Ingrediente malo (+40)" });
          } else {
            pointEvents.push({ clientId: p.clientId, points: CALDERO_SCORING.ACCUSE_INCORRECT, reason: "Acusación falsa (-30)" });
          }
        } else {
          pointEvents.push({ clientId: p.clientId, points: CALDERO_SCORING.ACCUSE_INCORRECT, reason: "Acusación falsa: No metió nada (-30)" });
        }
      }
    });

    // 3. Score Additions and Discards
    const goodHouseCounts: Record<string, number> = {};
    const affectedHouses = new Set<string>();

    state.players.forEach(p => {
      const action = state.actions[p.clientId];
      const ing = state.assignments[p.clientId];
      let playerPoints = 0;
      let reasons: string[] = [];

      if (!action) {
        playerPoints += CALDERO_SCORING.NO_ACTION;
        reasons.push("Inacción (-20)");
      } else if (action.type === 'add') {
        if (!exploded) {
          if (ing.type === 'good') {
            playerPoints += CALDERO_SCORING.SURVIVED_GOOD;
            reasons.push("Ingrediente bueno en poción estable (+120)");
            goodHouseCounts[p.house] = (goodHouseCounts[p.house] || 0) + 1;
          } else if (ing.type === 'gold') {
            playerPoints += CALDERO_SCORING.SURVIVED_GOLD;
            reasons.push("Ingrediente dorado en poción estable (+180)");
          }
        } else {
          if (ing.type === 'explosive' && !correctlyAccused.has(p.clientId)) {
            playerPoints += CALDERO_SCORING.EXPLOSIVE_NOT_ACCUSED;
            reasons.push("Sabotaje exitoso: Explosivo no detectado (+80)");
          } else if (ing.type === 'bad') {
            playerPoints += CALDERO_SCORING.BAD_IN_EXPLOSION;
            reasons.push("Caos: Mal ingrediente en explosión (+40)");
          }
          if (ing.type === 'good' || ing.type === 'gold') {
            affectedHouses.add(p.house);
          }
        }
      } else if (action.type === 'discard') {
        if (ing.type === 'explosive') {
          playerPoints += CALDERO_SCORING.DISCARD_EXPLOSIVE;
          reasons.push("Héroe anónimo: Descartaste un explosivo (+60)");
        }
      }

      if (playerPoints !== 0) {
        pointEvents.push({ clientId: p.clientId, points: playerPoints, reason: reasons.join(", ") });
      }

      playerResults.push({
        name: p.name,
        house: p.house,
        ingredient: ing,
        action: action?.type || 'none',
        points: playerPoints,
        reasons
      });
    });

    // House Bonuses
    if (!exploded) {
      const maxGood = Math.max(...Object.values(goodHouseCounts), 0);
      if (maxGood > 0) {
        Object.entries(goodHouseCounts).forEach(([house, count]) => {
          if (count === maxGood) {
            state.players.filter(p => p.house === house).forEach(p => {
              pointEvents.push({ clientId: p.clientId, points: CALDERO_SCORING.HOUSE_MOST_GOOD, reason: "Casa con más ingredientes buenos (+100)" });
            });
          }
        });
      }
    } else {
      affectedHouses.forEach(house => {
        state.players.filter(p => p.house === house).forEach(p => {
          pointEvents.push({ clientId: p.clientId, points: CALDERO_SCORING.EXPLOSION_HOUSE_PENALTY, reason: "Casa afectada por la explosión (-50)" });
        });
      });
    }

    state.phase = 'results';
    state.finalStability = stability;
    state.exploded = exploded;
    state.results = {
      exploded,
      stability,
      ranking: playerResults.sort((a, b) => b.points - a.points),
      narrator: exploded ? "La poción explotó. Alguien no fue honesto." : "La poción sobrevivió. ¡Salud mágica!"
    };

    return { state, pointEvents };
  }
}
