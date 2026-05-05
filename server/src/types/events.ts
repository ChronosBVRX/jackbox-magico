import { StoryState } from '../story/storyTypes';
import { GameId } from '../data/gameCatalog';

export type VoiceCueType = 'event' | 'instruction' | 'voiceSlot' | 'winner' | 'audioFile';

export interface VoiceCue {
  type: VoiceCueType;
  eventName?: string;
  gameId?: GameId | string;
  slotId?: string;
  stepId?: string;
  audioPath?: string;
  winnerHouse?: string;
  delayMs?: number;
  cooldownMs?: number;
  interrupt?: boolean;
  force?: boolean;
}

export interface Player {
  clientId: string;
  name: string;
  house: string;
  gender: 'wizard' | 'witch';
  points: number; // Renamed score to points for clarity with V1
  streak: number;
  isConnected: boolean;
}

export interface RoomState {
  roomCode: string;
  status: 'lobby' | 'playing' | 'story' | 'results' | 'final_results';
  players: Player[];
  currentGameId: string | null;
  phase: string;
  durationMs: number;
  startedAt: number | null;
  serverTime: number;
  storyState?: StoryState;
}

export interface ServerToClientEvents {
  room_created: (roomCode: string) => void;
  room_state: (state: RoomState) => void;
  error_message: (message: string) => void;
  game_started: (gameId: string) => void;
  game_state: (data: any) => void;
  game_player_state: (data: any) => void;
  trivia_question: (data: any) => void;
  answer_ack: (data: { success: boolean }) => void;
  answer_count: (data: { count: number; total: number }) => void;
  round_results: (data: any) => void;
  scoreboard_state: (data: any) => void;
  game_error: (message: string) => void;
  pong: () => void;
  voice_cue: (cue: VoiceCue) => void;
}

export interface ClientToServerEvents {
  tv_create_room: () => void;
  player_join: (data: {
    roomCode: string;
    clientId: string;
    name: string;
    house: string;
    gender: 'wizard' | 'witch';
  }) => void;
  tv_start_game: (gameId: string) => void;
  tv_debug_start_game: (gameId: string) => void;
  tv_select_story: (storyId: string) => void;
  tv_story_next: () => void;
  answer_submit: (data: { answer: string }) => void;
  player_action: (data: any) => void;
  tv_next_round: () => void;
  tv_back_to_lobby: () => void;
  tv_close_room: () => void;
  heartbeat: () => void;
}

export interface InterServerEvents {}

export interface SocketData {
  clientId: string;
  roomCode: string;
  isTv: boolean;
}
