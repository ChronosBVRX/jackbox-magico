import { GameId } from '../data/gameCatalog';

export interface VoiceTimingRule {
  trigger: string;
  mode?: 'quick' | 'story' | 'all';
  stepType?: string;
  phase?: string;
  gameId?: GameId;
  action: 'event' | 'instruction' | 'voiceSlot' | 'winner' | 'audioFile';
  eventName?: string;
  use?: string;
  fallbackEvent?: string;
  delayMs?: number;
  cooldownMs?: number;
  interrupt?: boolean;
  force?: boolean;
}

export const VOICE_TIMING_RULES: VoiceTimingRule[] = [
  {
    trigger: "room_created",
    mode: "quick",
    action: "event",
    eventName: "lobby",
    delayMs: 500,
    cooldownMs: 4000
  },
  {
    trigger: "story_step_changed",
    stepType: "dialogue",
    action: "voiceSlot",
    fallbackEvent: "rules",
    delayMs: 300,
    interrupt: true
  },
  {
    trigger: "story_step_changed",
    stepType: "instructions",
    action: "instruction",
    use: "instructionGameId",
    delayMs: 300,
    interrupt: true
  },
  {
    trigger: "game_started",
    action: "event",
    eventName: "round_start",
    delayMs: 500,
    cooldownMs: 3000
  },
  {
    trigger: "game_state",
    phase: "threat",
    gameId: "artes_ridiculas",
    action: "event",
    eventName: "threat",
    delayMs: 200,
    cooldownMs: 3000
  },
  {
    trigger: "game_results",
    action: "event",
    eventName: "explanation",
    delayMs: 700,
    cooldownMs: 3000
  },
  {
    trigger: "scoreboard",
    action: "event",
    eventName: "leaderboard",
    delayMs: 500,
    cooldownMs: 5000
  },
  {
    trigger: "story_finished",
    action: "winner",
    delayMs: 800,
    interrupt: true
  }
];
