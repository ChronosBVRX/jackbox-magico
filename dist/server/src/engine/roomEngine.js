"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomEngine = exports.RoomEngine = void 0;
class RoomEngine {
    constructor() {
        this.rooms = new Map();
    }
    createRoom() {
        const code = this.generateCode();
        const newState = {
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
    getRoom(code) {
        const state = this.rooms.get(code.toUpperCase());
        if (state) {
            state.serverTime = Date.now();
        }
        return state;
    }
    addPlayer(roomCode, playerData) {
        const room = this.getRoom(roomCode);
        if (!room)
            return { success: false, error: 'Sala no encontrada' };
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
            existingPlayer.name = playerData.name; // Actualizar por si cambió
            return { success: true };
        }
        // Verificar nombre único
        if (room.players.find(p => p.name.toLowerCase() === playerData.name.toLowerCase())) {
            return { success: false, error: 'Ese nombre ya está en uso' };
        }
        room.players.push({
            ...playerData,
            score: 0,
            isConnected: true,
        });
        return { success: true };
    }
    setPlayerConnection(roomCode, clientId, isConnected) {
        const room = this.getRoom(roomCode);
        if (!room)
            return;
        const player = room.players.find(p => p.clientId === clientId);
        if (player) {
            player.isConnected = isConnected;
        }
    }
    generateCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        // Evitar duplicados (muy poco probable con 4 letras pero por seguridad)
        if (this.rooms.has(code))
            return this.generateCode();
        return code;
    }
}
exports.RoomEngine = RoomEngine;
exports.roomEngine = new RoomEngine();
