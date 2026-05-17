import { StoryDefinition, StoryStep, StoryState } from './storyTypes';
import { getStoryById } from './storyCatalog';
import { GameId } from '../data/gameCatalog';

const STORY_MINIGAME_POOL: GameId[] = [
  "artes_ridiculas",
  "atrapa_snitch",
  "duelo_hechizos",
  "sombrero_burlon",
  "clase_pociones",
  "mapa_travieso",
  "caldero_mentiroso",
  "retratos_chismosos",
  "hechizo_incompleto",
  "patronus_personalizado",
  "beso_boda_muerte",
  "el_impostor",
  "el_tiburon",
  "dictado_magico"
];

const ACTION_MINIGAME_POOL: GameId[] = [
  "atrapa_snitch", "duelo_hechizos", "artes_ridiculas", "caldero_mentiroso"
];

const SOCIAL_MINIGAME_POOL: GameId[] = [
  "sombrero_burlon", "mapa_travieso", "retratos_chismosos", "patronus_personalizado",
  "beso_boda_muerte", "el_impostor", "el_tiburon", "dictado_magico"
];

export class StoryEngine {
  initStory(storyId: string, config?: any): StoryState | null {
    const story = getStoryById(storyId);
    if (!story) return null;

    return {
      storyId,
      currentStepIndex: 0,
      usedMinigames: [],
      recentMinigames: [],
      storyCompleted: false,
      config
    };
  }

  getCurrentStep(state: StoryState): StoryStep | null {
    const story = getStoryById(state.storyId);
    if (!story) return null;
    return story.steps[state.currentStepIndex] || null;
  }

  nextStep(state: StoryState): StoryState {
    const story = getStoryById(state.storyId);
    if (!story) return state;

    if (state.currentStepIndex < story.steps.length - 1) {
      state.currentStepIndex++;
      
      const nextStep = story.steps[state.currentStepIndex];
      if (nextStep.type === 'minigame_random') {
        if (state.pendingMinigame) {
          state.selectedMinigame = state.pendingMinigame;
          state.pendingMinigame = null;
        } else {
          state.selectedMinigame = this.pickRandomMinigame(state, nextStep.pool);
        }
      } else if (nextStep.type === 'fixed_minigame') {
        state.selectedMinigame = nextStep.gameId;
      } else if (nextStep.type === 'instructions') {
        if (nextStep.instructionGameId === 'random') {
          const picked = this.pickRandomMinigame(state, (nextStep as any).pool);
          state.selectedMinigame = picked;
          state.pendingMinigame = picked;
          nextStep.instructionGameId = picked;
        } else {
          state.selectedMinigame = nextStep.instructionGameId;
          state.pendingMinigame = nextStep.instructionGameId;
        }
      } else if (nextStep.type === 'copa_final') {
        state.selectedMinigame = 'copa_final';
      } else if (nextStep.type === 'trivia_block') {
        state.selectedMinigame = 'trivia_magica';
      } else {
        state.selectedMinigame = null;
      }
    } else {
      state.storyCompleted = true;
    }

    return state;
  }

  private pickRandomMinigame(state: StoryState, pool?: GameId[]): GameId {
    let availablePool = pool || STORY_MINIGAME_POOL;
    if (!pool && state.config?.minigameMode === 'action') {
      availablePool = ACTION_MINIGAME_POOL;
    } else if (!pool && state.config?.minigameMode === 'social') {
      availablePool = SOCIAL_MINIGAME_POOL;
    }
    
    // Filter out recent ones
    let options = availablePool.filter(id => !state.recentMinigames.includes(id));
    
    // If empty, use full pool except maybe the very last one
    if (options.length === 0) {
      options = availablePool.filter(id => id !== state.recentMinigames[state.recentMinigames.length - 1]);
    }

    const selected = options[Math.floor(Math.random() * options.length)] || availablePool[0];
    
    state.usedMinigames.push(selected);
    state.recentMinigames.push(selected);
    if (state.recentMinigames.length > 2) {
      state.recentMinigames.shift();
    }
    
    return selected;
  }
}

export const storyEngine = new StoryEngine();
