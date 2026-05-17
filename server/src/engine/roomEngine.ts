import { RoomState, Player } from '../types/events';
import { StoryState } from '../story/storyTypes';
import fs from 'fs';
import path from 'path';

export class RoomEngine {
  private rooms: Map<string, RoomState> = new Map();
  private backupFilePath = path.join(process.cwd(), 'data', 'rooms_backup.json');

  constructor() {
    if (fs.existsSync(this.backupFilePath)) {
      try {
        const data = fs.readFileSync(this.backupFilePath, 'utf-8');
        const entries = JSON.parse(data);
        this.rooms = new Map(entries);
        console.log(`[RoomEngine] Cargadas ${this.rooms.size} salas desde respaldo en disco.`);
      } catch (e) {
        console.error('[RoomEngine] Error cargando respaldo de salas:', e);
      }
    }
  }

  private saveBackup() {
    try {
      const dir = path.dirname(this.backupFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const entries = Array.from(this.rooms.entries());
      fs.writeFileSync(this.backupFilePath, JSON.stringify(entries, null, 2), 'utf-8');
    } catch (e) {
      console.error('[RoomEngine] Error guardando respaldo de salas:', e);
    }
  }

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
      debugMode: false,
    };
    this.rooms.set(code, newState);
    this.saveBackup();
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

  addPlayer(roomCode: string, playerData: Omit<Player, 'points' | 'streak' | 'isConnected' | 'isReady'>): { success: boolean; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Sala no encontrada' };

    if (room.players.length >= 8) {
      return { success: false, error: 'Sala llena (máximo 8 jugadores)' };
    }

    if (!playerData.name || !playerData.name.trim()) {
      return { success: false, error: 'El nombre es obligatorio' };
    }
    const cleanName = playerData.name.trim().substring(0, 20);

    const validHouses = ['Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff'];
    const validHouse = validHouses.includes(playerData.house) ? playerData.house : 'Gryffindor';

    const validGenders = ['wizard', 'witch'];
    const validGender = validGenders.includes(playerData.gender) ? playerData.gender : 'wizard';

    const sanitizedData = { ...playerData, name: cleanName, house: validHouse, gender: validGender as any };

    // Regla: Máximo 2 por casa
    const houseCount = room.players.filter(p => p.house === sanitizedData.house).length;
    if (houseCount >= 2) {
      return { success: false, error: `La casa ${sanitizedData.house} ya tiene 2 miembros` };
    }

    // Verificar si el jugador ya existe (por clientId)
    const existingPlayer = room.players.find(p => p.clientId === sanitizedData.clientId);
    if (existingPlayer) {
      existingPlayer.isConnected = true;
      existingPlayer.name = sanitizedData.name;
      existingPlayer.house = sanitizedData.house;
      existingPlayer.gender = sanitizedData.gender;
      this.saveBackup();
      return { success: true };
    }

    // Verificar nombre único
    if (room.players.find(p => p.name.toLowerCase() === sanitizedData.name.toLowerCase())) {
      return { success: false, error: 'Ese nombre ya está en uso' };
    }

    const isHost = room.players.length === 0;

    room.players.push({
      ...sanitizedData,
      points: 0,
      streak: 0,
      isConnected: true,
      isReady: false,
      isHost,
    });

    this.saveBackup();
    return { success: true };
  }

  setRoomStatus(roomCode: string, status: RoomState['status']) {
    const room = this.getRoom(roomCode);
    if (room) {
      room.status = status;
      this.saveBackup();
    }
  }

  setRoomPhase(roomCode: string, phase: string) {
    const room = this.getRoom(roomCode);
    if (room) {
      room.phase = phase;
      this.saveBackup();
    }
  }

  setCurrentGameId(roomCode: string, gameId: string | null) {
    const room = this.getRoom(roomCode);
    if (room) {
      room.currentGameId = gameId;
      this.saveBackup();
    }
  }

  setPlayerConnection(roomCode: string, clientId: string, isConnected: boolean) {
    const room = this.getRoom(roomCode);
    if (!room) return;
    const player = room.players.find(p => p.clientId === clientId);
    if (player) {
      player.isConnected = isConnected;
      this.saveBackup();
    }
  }

  toggleDebugMode(roomCode: string, enabled: boolean) {
    const room = this.getRoom(roomCode);
    if (room) {
      room.debugMode = enabled;
      this.saveBackup();
    }
  }

  setPlayerReady(roomCode: string, clientId: string, ready: boolean) {
    const room = this.getRoom(roomCode);
    if (!room) return;
    const player = room.players.find(p => p.clientId === clientId);
    if (player) {
      player.isReady = ready;
      this.saveBackup();
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
    this.saveBackup();
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

  setStoryState(roomCode: string, state: StoryState | undefined) {
    const room = this.getRoom(roomCode);
    if (room) {
      room.storyState = state;
      this.saveBackup();
    }
  }

  setPreInstructionGameId(roomCode: string, gameId: string, debug: boolean) {
    const room = this.getRoom(roomCode);
    if (room) {
      room.preInstruction = { gameId, debug };
      this.saveBackup();
    }
  }

  resetRoomToLobby(roomCode: string) {
    const room = this.getRoom(roomCode);
    if (room) {
      room.status = 'lobby';
      room.currentGameId = null;
      room.phase = 'lobby';
      room.storyState = undefined;
      room.preInstruction = undefined;
      this.saveBackup();
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
    if (this.rooms.has(code)) return this.generateCode();
    return code;
  }
}

export const roomEngine = new RoomEngine();
