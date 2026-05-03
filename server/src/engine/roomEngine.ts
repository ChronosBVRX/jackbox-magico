import { RoomState, Player } from '../types/events';

export class RoomEngine {
  private rooms: Map<string, RoomState> = new Map();

  createRoom(): string {
    const code = this.generateCode();
    const newState: RoomState = {
      roomCode: code,
      status: 'lobby',
      players: [],
      currentGameId: null,
      phase: 'lobby',
      durationMs: 0,
      startedAt: null,
      serverTime: Date.now(),
    };
    this.rooms.set(code, newState);
    return code;
  }

  getRoom(code: string): RoomState | undefined {
    const state = this.rooms.get(code.toUpperCase());
    if (state) {
      state.serverTime = Date.now();
    }
    return state;
  }

  getPlayer(roomCode: string, clientId: string): Player | undefined {
    const room = this.getRoom(roomCode);
    return room?.players.find(p => p.clientId === clientId);
  }

  addPlayer(roomCode: string, playerData: Omit<Player, 'points' | 'streak' | 'isConnected'>): { success: boolean; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Sala no encontrada' };

    if (room.players.length >= 8) {
      return { success: false, error: 'Sala llena (máximo 8 jugadores)' };
    }

    // Regla: Máximo 2 por casa
    const houseCount = room.players.filter(p => p.house === playerData.house).length;
    if (houseCount >= 2) {
      return { success: false, error: `La casa ${playerData.house} ya tiene 2 miembros` };
    }

    // Verificar si el jugador ya existe (por clientId)
    const existingPlayer = room.players.find(p => p.clientId === playerData.clientId);
    if (existingPlayer) {
      existingPlayer.isConnected = true;
      existingPlayer.name = playerData.name; 
      return { success: true };
    }

    // Verificar nombre único
    if (room.players.find(p => p.name.toLowerCase() === playerData.name.toLowerCase())) {
      return { success: false, error: 'Ese nombre ya está en uso' };
    }

    room.players.push({
      ...playerData,
      points: 0,
      streak: 0,
      isConnected: true,
    });

    return { success: true };
  }

  setRoomStatus(roomCode: string, status: RoomState['status']) {
    const room = this.getRoom(roomCode);
    if (room) room.status = status;
  }

  setRoomPhase(roomCode: string, phase: string) {
    const room = this.getRoom(roomCode);
    if (room) room.phase = phase;
  }

  setCurrentGameId(roomCode: string, gameId: string | null) {
    const room = this.getRoom(roomCode);
    if (room) room.currentGameId = gameId;
  }

  setPlayerConnection(roomCode: string, clientId: string, isConnected: boolean) {
    const room = this.getRoom(roomCode);
    if (!room) return;
    const player = room.players.find(p => p.clientId === clientId);
    if (player) {
      player.isConnected = isConnected;
    }
  }

  applyPointEvents(roomCode: string, events: any[]) {
    const room = this.getRoom(roomCode);
    if (!room) return;

    events.forEach(ev => {
      if (!ev.clientId) return;
      const player = room.players.find(p => p.clientId === ev.clientId);
      if (player) {
        const pointsToAdd = Number(ev.points);
        if (!isNaN(pointsToAdd)) {
          player.points += pointsToAdd;
        }
      }
    });
  }

  getScoreboard(roomCode: string) {
    const room = this.getRoom(roomCode);
    if (!room) return [];
    return [...room.players]
      .sort((a, b) => b.points - a.points)
      .map(p => ({
        clientId: p.clientId,
        name: p.name,
        house: p.house,
        points: p.points,
        isConnected: p.isConnected
      }));
  }

  getHouseScoreboard(roomCode: string) {
    const room = this.getRoom(roomCode);
    if (!room) return [];
    
    const houses = ['Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff'];
    return houses.map(house => ({
      house,
      points: room.players
        .filter(p => p.house === house)
        .reduce((sum, p) => sum + p.points, 0)
    }));
  }

  resetRoomToLobby(roomCode: string) {
    const room = this.getRoom(roomCode);
    if (room) {
      room.status = 'lobby';
      room.currentGameId = null;
      room.phase = 'lobby';
    }
  }

  getConnectedPlayers(roomCode: string): Player[] {
    const room = this.getRoom(roomCode);
    return room ? room.players.filter(p => p.isConnected) : [];
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Evitar duplicados (muy poco probable con 4 letras pero por seguridad)
    if (this.rooms.has(code)) return this.generateCode();
    return code;
  }
}

export const roomEngine = new RoomEngine();
