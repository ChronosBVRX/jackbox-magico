export interface Player {
  clientId: string;
  name: string;
  house: string;
  gender: 'wizard' | 'witch';
  score: number;
  isConnected: boolean;
}

export interface RoomState {
  roomCode: string;
  status: 'lobby' | 'rules' | 'playing' | 'results' | 'final_results';
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
  heartbeat: () => void;
}

export interface InterServerEvents {}

export interface SocketData {
  clientId: string;
  roomCode: string;
  isTv: boolean;
}
