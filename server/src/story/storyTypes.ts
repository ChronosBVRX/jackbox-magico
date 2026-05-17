import { GameId } from '../data/gameCatalog';

export type StoryStepType =
  | "dialogue"
  | "instructions"
  | "trivia_block"
  | "fixed_minigame"
  | "minigame_random"
  | "scoreboard"
  | "copa_final"
  | "story_complete";

export type StoryTone =
  | "epic"
  | "mysterious"
  | "comedy"
  | "dramatic"
  | "ceremonial";

export type StoryStep = {
  id: string;
  type: StoryStepType;
  title: string;
  subtitle?: string;
  lines?: string[];
  reason?: string;
  gameId?: GameId;
  questions?: number;
  pool?: GameId[];
  tone?: StoryTone;
  visual?: string;
  voiceSlot?: string;
  scoreboardTitle?: string;
  instructionGameId?: GameId | 'random';
};

export type StoryDefinition = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  estimatedMinutes: number;
  recommendedPlayers: string;
  difficulty: "familiar" | "normal" | "competitiva";
  tone: StoryTone;
  steps: StoryStep[];
};

export type StoryState = {
  storyId: string;
  currentStepIndex: number;
  usedMinigames: GameId[];
  recentMinigames: GameId[];
  selectedMinigame?: GameId | null;
  storyCompleted: boolean;
};
