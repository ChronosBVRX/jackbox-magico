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
  status: 'lobby' | 'playing' | 'results' | 'final_results';
  players: Player[];
  currentGameId: string | null;
  phase: string;
  durationMs: number;
  startedAt: number | null;
  serverTime: number;
}

export interface ServerToClientEvents {
  room_created: (roomCode: string) => void;
  room_state: (state: RoomState) => void;
  error_message: (message: string) => void;
  game_started: (gameId: string) => void;
  trivia_question: (data: any) => void;
  answer_ack: (data: { success: boolean }) => void;
  answer_count: (data: { count: number; total: number }) => void;
  round_results: (data: any) => void;
  scoreboard_state: (data: any) => void;
  game_error: (message: string) => void;
  pong: () => void;
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
  answer_submit: (data: { answer: string }) => void;
  tv_next_round: () => void;
  tv_back_to_lobby: () => void;
  heartbeat: () => void;
}

export interface InterServerEvents {}

export interface SocketData {
  clientId: string;
  roomCode: string;
  isTv: boolean;
}
