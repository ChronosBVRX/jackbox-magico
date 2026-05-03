import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  InterServerEvents, 
  SocketData 
} from '../types/events';
import { roomEngine } from '../engine/roomEngine';

export function setupSocketServer(httpServer: HttpServer) {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const activeGames: Map<string, any> = new Map();

  io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado:', socket.id);

    socket.on('tv_create_room', () => {
      const roomCode = roomEngine.createRoom();
      socket.data.roomCode = roomCode;
      socket.data.isTv = true;
      socket.join(roomCode);
      socket.emit('room_created', roomCode);
      
      const state = roomEngine.getRoom(roomCode);
      if (state) {
        socket.emit('room_state', state);
      }
      console.log(`Sala creada: ${roomCode}`);
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
        if (state) {
          io.to(roomCode).emit('room_state', state);
        }
        console.log(`Jugador ${name} se unió a ${roomCode}`);
      } else {
        socket.emit('error_message', result.error || 'Error desconocido al unirse');
      }
    });

    socket.on('tv_start_game', (gameId) => {
      const { roomCode, isTv } = socket.data;
      if (!isTv || !roomCode) return;

      if (gameId === 'trivia_magica') {
        const { TriviaMagica } = require('../games/triviaMagica');
        const game = new TriviaMagica(roomCode, io, roomEngine);
        activeGames.set(roomCode, game);
        
        roomEngine.setRoomStatus(roomCode, 'playing');
        roomEngine.setCurrentGameId(roomCode, gameId);
        
        game.start();
        io.to(roomCode).emit('game_started', gameId);
      }
    });

    socket.on('answer_submit', (data) => {
      const { roomCode, clientId } = socket.data;
      if (!roomCode || !clientId) return;

      const game = activeGames.get(roomCode);
      if (game) {
        game.handleEvent('answer_submit', data, clientId);
      }
    });

    socket.on('tv_next_round', () => {
      const { roomCode, isTv } = socket.data;
      if (!isTv || !roomCode) return;

      const game = activeGames.get(roomCode);
      if (game) {
        game.handleEvent('tv_next_round', {}, 'HOST');
      }
    });

    socket.on('tv_back_to_lobby', () => {
      const { roomCode, isTv } = socket.data;
      if (!isTv || !roomCode) return;

      const game = activeGames.get(roomCode);
      if (game) {
        game.handleEvent('tv_back_to_lobby', {}, 'HOST');
        activeGames.delete(roomCode);
      }
    });

    socket.on('heartbeat', () => {
      socket.emit('pong');
    });

    socket.on('disconnect', () => {
      const { roomCode, clientId, isTv } = socket.data;
      if (roomCode && clientId && !isTv) {
        roomEngine.setPlayerConnection(roomCode, clientId, false);
        const state = roomEngine.getRoom(roomCode);
        if (state) {
          io.to(roomCode).emit('room_state', state);
        }
      }
      console.log('Cliente desconectado:', socket.id);
    });
  });

  return io;
}
