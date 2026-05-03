export const GENERAL_VOICE_EVENTS = [
  "boot",
  "lobby",
  "rules",
  "round_start",
  "threat",
  "correct",
  "wrong",
  "timeout",
  "fast_bonus",
  "streak_bonus",
  "humor_bonus",
  "leaderboard",
  "winner",
  "final",
  "system",
  "explanation"
] as const;

export type GeneralVoiceEvent = typeof GENERAL_VOICE_EVENTS[number];
