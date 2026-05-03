import { GameModule, GameUpdateResult } from '../base';
import { Player } from '../../types/events';
import { PocionesState, Ingredient, PotionRecipe } from './types';
import { INGREDIENTS_BANK, POTION_NAMES, NARRATOR_LINES } from './data';
import { calculatePotionErrors, getPointsForErrors, POCIONES_SCORING } from './scoring';

export class ClasePociones implements GameModule {
  id = 'clase_pociones' as const;
  name = 'Clase de Pociones';

  init(players: Player[]): PocionesState {
    return {
      phase: 'memorize',
      roundNumber: 0,
      totalRounds: 3,
      potion: null,
      availableIngredients: [],
      answers: {},
      startedAt: Date.now(),
      memorizeDurationMs: 8000,
      mixDurationMs: 15000,
      mode: 'normal',
      results: null,
      players
    };
  }

  getTvState(state: PocionesState) {
    return {
      phase: state.phase,
      roundNumber: state.roundNumber,
      totalRounds: state.totalRounds,
      potion: state.potion,
      mode: state.mode,
      answerCount: Object.keys(state.answers).length,
      totalPlayers: state.players.length,
      results: state.results
    };
  }

  getPlayerState(state: PocionesState, player: Player) {
    return {
      phase: state.phase,
      alreadySubmitted: !!state.answers[player.clientId],
      ingredients: state.availableIngredients.map(i => ({ id: i.id, emoji: i.emoji })),
      mode: state.mode
    };
  }

  handlePlayerAction(state: PocionesState, player: Player, action: any): GameUpdateResult {
    if (state.phase !== 'mix') return { state };
    if (action.type !== 'potion_submit') return { state };
    if (state.answers[player.clientId]) return { state };

    state.answers[player.clientId] = {
      clientId: player.clientId,
      selectedIngredientIds: action.selectedIngredientIds,
      elapsedMs: Date.now() - state.startedAt
    };

    return {
      state,
      events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }]
    };
  }

  handleHostAction(state: PocionesState, action: string): GameUpdateResult {
    if (action === 'next') {
      if (state.phase === 'memorize') {
        state.phase = 'mix';
        state.startedAt = Date.now();
        return { state };
      } else if (state.phase === 'mix') {
        return this.resolveRound(state);
      } else if (state.phase === 'results') {
        return this.startNextRound(state);
      }
    }
    return { state };
  }

  private startNextRound(state: PocionesState): GameUpdateResult {
    state.roundNumber++;
    if (state.roundNumber > state.totalRounds) {
      return { state, finished: true };
    }

    const modes: PocionesState['mode'][] = ['normal', 'reverse', 'decoy', 'smoke', 'unstable'];
    state.mode = modes[Math.floor(Math.random() * modes.length)];
    
    const recipeLen = 3 + state.roundNumber;
    const recipeIngredients = this.getRandomIngredients(recipeLen);
    
    state.potion = {
      id: `potion_${Date.now()}`,
      name: POTION_NAMES[Math.floor(Math.random() * POTION_NAMES.length)],
      ingredients: recipeIngredients,
      difficulty: 'media',
      narratorLine: NARRATOR_LINES[Math.floor(Math.random() * NARRATOR_LINES.length)]
    };

    // Prepare available ingredients for mobile (pool of 12)
    const pool = [...recipeIngredients];
    while (pool.length < 12) {
      const extra = INGREDIENTS_BANK[Math.floor(Math.random() * INGREDIENTS_BANK.length)];
      if (!pool.find(p => p.id === extra.id)) pool.push(extra);
    }
    state.availableIngredients = pool.sort(() => Math.random() - 0.5);

    state.phase = 'memorize';
    state.answers = {};
    state.results = null;
    state.startedAt = Date.now();

    return { state };
  }

  private getRandomIngredients(count: number): Ingredient[] {
    const shuffled = [...INGREDIENTS_BANK].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  private resolveRound(state: PocionesState): GameUpdateResult {
    const targetIds = state.mode === 'reverse' 
      ? [...state.potion!.ingredients].reverse().map(i => i.id)
      : state.potion!.ingredients.map(i => i.id);

    const pointEvents: any[] = [];
    const playerResults: any[] = [];

    state.players.forEach(p => {
      const ans = state.answers[p.clientId];
      const submittedIds = ans ? ans.selectedIngredientIds : [];
      const errors = calculatePotionErrors(targetIds, submittedIds);
      const points = getPointsForErrors(errors);

      pointEvents.push({
        clientId: p.clientId,
        points,
        reason: errors === 0 ? "Receta perfecta" : `${errors} errores`,
        house: p.house
      });

      playerResults.push({
        name: p.name,
        house: p.house,
        errors,
        points,
        perfect: errors === 0
      });
    });

    state.phase = 'results';
    state.results = {
      potionName: state.potion?.name,
      correctSequence: state.potion?.ingredients,
      ranking: playerResults.sort((a, b) => b.points - a.points)
    };

    return { state, pointEvents };
  }
}
