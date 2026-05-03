import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  InterServerEvents, 
  SocketData 
} from '../types/events';
import { roomEngine } from '../engine/roomEngine';
import { createGameModule } from '../games/gameFactory';
import { GameModule } from '../games/base';

export function setupSocketServer(httpServer: HttpServer) {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  const activeGames: Map<string, { module: GameModule, state: any }> = new Map();

  io.on('connection', (socket) => {
    socket.on('tv_create_room', () => {
      const roomCode = roomEngine.createRoom();
      socket.data.roomCode = roomCode;
      socket.data.isTv = true;
      socket.join(roomCode);
      socket.emit('room_created', roomCode);
      const state = roomEngine.getRoom(roomCode);
      if (state) socket.emit('room_state', state);
    });

    socket.on('player_join', (data) => {
      const { roomCode, clientId, name, house, gender } = data;
      const result = roomEngine.addPlayer(roomCode, { clientId, name, house, gender });
      if (result.success) {
        socket.data.roomCode = roomCode;
        socket.data.clientId = clientId;
        socket.data.isTv = false;
        socket.join(roomCode);
        const state = roomEngine.getRoom(roomCode);
        if (state) io.to(roomCode).emit('room_state', state);
      } else {
        socket.emit('error_message', result.error || 'Error al unirse');
      }
    });

    socket.on('tv_start_game', (gameId) => {
      const { roomCode, isTv } = socket.data;
      if (!isTv || !roomCode) return;

      const module = createGameModule(gameId as any);
      if (!module) {
        socket.emit('error_message', 'Minijuego no soportado o deshabilitado.');
        return;
      }

      const room = roomEngine.getRoom(roomCode);
      if (!room) return;

      const state = module.init(room.players);
      activeGames.set(roomCode, { module, state });

      roomEngine.setRoomStatus(roomCode, 'playing');
      roomEngine.setCurrentGameId(roomCode, gameId);

      // Notify start
      io.to(roomCode).emit('game_started', gameId);
      
      // Send initial state
      updateGameClients(roomCode);
    });

    socket.on('player_action', (data) => {
      handlePlayerInteraction(data);
    });

    socket.on('answer_submit', (data) => {
      handlePlayerInteraction(data);
    });

    function handlePlayerInteraction(data: any) {
      const { roomCode, clientId } = socket.data;
      if (!roomCode || !clientId) return;

      const game = activeGames.get(roomCode);
      if (game) {
        const player = roomEngine.getPlayer(roomCode, clientId);
        if (!player) return;

        const result = game.module.handlePlayerAction(game.state, player, data);
        game.state = result.state;
        
        if (result.events) {
          result.events.forEach(ev => {
            if (ev.target === 'players') socket.emit(ev.type as any, ev.payload);
            else io.to(roomCode).emit(ev.type as any, ev.payload);
          });
        }

        updateGameClients(roomCode);
      }
    }

    socket.on('tv_next_round', () => {
      const { roomCode, isTv } = socket.data;
      if (!isTv || !roomCode) return;

      const game = activeGames.get(roomCode);
      if (game) {
        const result = game.module.handleHostAction(game.state, 'next');
        game.state = result.state;
        
        if (result.finished) {
          activeGames.delete(roomCode);
          roomEngine.setRoomStatus(roomCode, 'lobby');
          io.to(roomCode).emit('room_state', roomEngine.getRoom(roomCode)!);
        } else {
          updateGameClients(roomCode);
        }
      }
    });

    function updateGameClients(roomCode: string) {
      const game = activeGames.get(roomCode);
      if (!game) return;

      const room = roomEngine.getRoom(roomCode);
      if (!room) return;

      // TV View
      io.to(roomCode).emit('game_state' as any, game.module.getTvState(game.state));

      // Individual Player Views
      room.players.forEach(p => {
        io.to(p.clientId).emit('game_player_state' as any, game.module.getPlayerState(game.state, p));
      });
    }

    socket.on('disconnect', () => {
      const { roomCode, clientId, isTv } = socket.data;
      if (roomCode && clientId && !isTv) {
        roomEngine.setPlayerConnection(roomCode, clientId, false);
        const state = roomEngine.getRoom(roomCode);
        if (state) io.to(roomCode).emit('room_state', state);
      }
    });
  });

  return io;
}
