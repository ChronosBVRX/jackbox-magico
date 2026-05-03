"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketServer = setupSocketServer;
const socket_io_1 = require("socket.io");
const roomEngine_1 = require("../engine/roomEngine");
function setupSocketServer(httpServer) {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });
    io.on('connection', (socket) => {
        console.log('Nuevo cliente conectado:', socket.id);
        socket.on('tv_create_room', () => {
            const roomCode = roomEngine_1.roomEngine.createRoom();
            socket.data.roomCode = roomCode;
            socket.data.isTv = true;
            socket.join(roomCode);
            socket.emit('room_created', roomCode);
            const state = roomEngine_1.roomEngine.getRoom(roomCode);
            if (state) {
                socket.emit('room_state', state);
            }
            console.log(`Sala creada: ${roomCode}`);
        });
        socket.on('player_join', (data) => {
            const { roomCode, clientId, name, house, gender } = data;
            const result = roomEngine_1.roomEngine.addPlayer(roomCode, { clientId, name, house, gender });
            if (result.success) {
                socket.data.roomCode = roomCode;
                socket.data.clientId = clientId;
                socket.data.isTv = false;
                socket.join(roomCode);
                const state = roomEngine_1.roomEngine.getRoom(roomCode);
                if (state) {
                    io.to(roomCode).emit('room_state', state);
                }
                console.log(`Jugador ${name} se unió a ${roomCode}`);
            }
            else {
                socket.emit('error_message', result.error || 'Error desconocido al unirse');
            }
        });
        socket.on('heartbeat', () => {
            socket.emit('pong');
        });
        socket.on('disconnect', () => {
            const { roomCode, clientId, isTv } = socket.data;
            if (roomCode && clientId && !isTv) {
                roomEngine_1.roomEngine.setPlayerConnection(roomCode, clientId, false);
                const state = roomEngine_1.roomEngine.getRoom(roomCode);
                if (state) {
                    io.to(roomCode).emit('room_state', state);
                }
            }
            console.log('Cliente desconectado:', socket.id);
        });
    });
    return io;
}
