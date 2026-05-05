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
import { storyEngine } from '../story/storyEngine';
import { STORY_CATALOG } from '../story/storyCatalog';
import { INSTRUCTION_CATALOG } from '../story/instructionCatalog';
import { SCOREBOARD_LINES, TRIVIA_TRANSITION_LINES, MINIGAME_TRANSITION_LINES, FINAL_WINNER_LINES } from '../story/storyScreenCopy';

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
      socket.emit('voice_cue', { type: 'event', eventName: 'lobby', delayMs: 500, cooldownMs: 4000 });
      const state = roomEngine.getRoom(roomCode);
      if (state) socket.emit('room_state', state);
    });

    socket.on('tv_close_room', () => {
      const { roomCode, isTv } = socket.data;
      if (!isTv || !roomCode) return;
      
      // Notify all players
      io.to(roomCode).emit('error_message', 'La sala ha sido cerrada por el anfitrión.');
      // Actually delete room if you want or just reset
      roomEngine.resetRoomToLobby(roomCode); // Just in case
      // We could fully delete it too
      io.in(roomCode).socketsLeave(roomCode);
    });

    socket.on('player_join', (data) => {
      const { roomCode, clientId, name, house, gender } = data;
      const result = roomEngine.addPlayer(roomCode, { clientId, name, house, gender });
      if (result.success) {
        socket.data.roomCode = roomCode;
        socket.data.clientId = clientId;
        socket.data.isTv = false;
        socket.join(roomCode);
        socket.join(clientId); // Join personal room for private state updates
        const state = roomEngine.getRoom(roomCode);
        if (state) io.to(roomCode).emit('room_state', state);
      } else {
        socket.emit('error_message', result.error || 'Error al unirse');
      }
    });

    function startGameForRoom(roomCode: string, gameId: string, debug = false) {
      const room = roomEngine.getRoom(roomCode);
      if (!room) return { success: false, error: 'Sala no encontrada.' };

      const connectedPlayers = roomEngine.getConnectedPlayers(roomCode);
      const minRequired = debug ? 1 : 4;

      if (connectedPlayers.length < minRequired) {
        return {
          success: false,
          error: debug
            ? 'Entra con al menos un celular para iniciar el debug.'
            : `Este minijuego requiere al menos ${minRequired} jugadores.`
        };
      }

      const module = createGameModule(gameId as any);
      if (!module) {
        return { success: false, error: 'Minijuego no soportado o deshabilitado.' };
      }

      const playersForGame = debug
        ? buildDebugPlayersForGame(gameId, room.players)
        : room.players;

      const state = module.init(playersForGame);
      activeGames.set(roomCode, { module, state });

      roomEngine.setRoomStatus(roomCode, 'playing');
      roomEngine.setCurrentGameId(roomCode, gameId);

      io.to(roomCode).emit('game_started', gameId);
      updateGameClients(roomCode);

      return { success: true };
    }

    function buildDebugPlayersForGame(gameId: string, realPlayers: any[]) {
      const debugBots = [
        {
          clientId: 'debug_bot_1',
          name: 'Dobby Debug',
          house: 'Gryffindor',
          gender: 'wizard' as const,
          points: 0,
          streak: 0,
          isConnected: true
        },
        {
          clientId: 'debug_bot_2',
          name: 'Luna Debug',
          house: 'Ravenclaw',
          gender: 'witch' as const,
          points: 0,
          streak: 0,
          isConnected: true
        },
        {
          clientId: 'debug_bot_3',
          name: 'Snape Debug',
          house: 'Slytherin',
          gender: 'wizard' as const,
          points: 0,
          streak: 0,
          isConnected: true
        },
        {
          clientId: 'debug_bot_4',
          name: 'Cedric Debug',
          house: 'Hufflepuff',
          gender: 'wizard' as const,
          points: 0,
          streak: 0,
          isConnected: true
        }
      ];

      const minPlayersByGame: Record<string, number> = {
        duelo_hechizos: 2,
        sombrero_burlon: 4,
        caldero_mentiroso: 4,
        patronus_personalizado: 4,
        copa_final: 4
      };

      const targetCount = minPlayersByGame[gameId] || 1;
      const players = [...realPlayers];

      for (const bot of debugBots) {
        if (players.length >= targetCount) break;
        players.push(bot);
      }

      return players;
    }

    socket.on('tv_start_game', (gameId) => {
      const { roomCode, isTv } = socket.data;
      if (!isTv || !roomCode) return;

      const result = startGameForRoom(roomCode, gameId, false);
      if (!result.success) {
        socket.emit('error_message', result.error || 'No se pudo iniciar el juego.');
      }
    });

    socket.on('tv_debug_start_game', (gameId) => {
      const { roomCode, isTv } = socket.data;
      if (!isTv || !roomCode) return;

      const result = startGameForRoom(roomCode, gameId, true);
      if (!result.success) {
        socket.emit('error_message', result.error || 'No se pudo iniciar el modo debug.');
      }
    });

    socket.on('tv_back_to_lobby', () => {
      const { roomCode, isTv } = socket.data;
      if (!isTv || !roomCode) return;
      
      roomEngine.resetRoomToLobby(roomCode);
      const room = roomEngine.getRoom(roomCode);
      if (room) {
        io.to(roomCode).emit('room_state', room);
        io.to(roomCode).emit('game_started', null as any); // Clear game on clients
      }
    });

    socket.on('tv_select_story', (storyId) => {
      const { roomCode, isTv } = socket.data;
      if (!isTv || !roomCode) return;

      const connectedPlayers = roomEngine.getConnectedPlayers(roomCode);
      if (connectedPlayers.length < 4) {
        socket.emit('error_message', 'Se requieren al menos 4 jugadores para iniciar una historia.');
        return;
      }

      const storyState = storyEngine.initStory(storyId);
      if (!storyState) return;

      roomEngine.setRoomStatus(roomCode, 'story');
      roomEngine.setStoryState(roomCode, storyState);
      
      updateGameClients(roomCode);
    });

    socket.on('tv_story_next', () => {
      const { roomCode, isTv } = socket.data;
      if (!isTv || !roomCode) return;

      const room = roomEngine.getRoom(roomCode);
      if (!room || !room.storyState) return;

      const step = storyEngine.getCurrentStep(room.storyState);
      if (!step) return;

      // Handle transition based on current step
      if (step.type === 'instructions' || step.type === 'trivia_block' || step.type === 'fixed_minigame' || step.type === 'minigame_random' || step.type === 'copa_final') {
        const gameId = room.storyState.selectedMinigame;
        if (gameId) {
          const module = createGameModule(gameId as any);
          if (module) {
            const state = module.init(room.players);
            activeGames.set(roomCode, { module, state });
            roomEngine.setRoomStatus(roomCode, 'playing');
            roomEngine.setCurrentGameId(roomCode, gameId);
            io.to(roomCode).emit('game_started', gameId);
            updateGameClients(roomCode);
            return;
          }
        }
      }

      // If story complete, reset
      if (room.storyState.storyCompleted) {
        roomEngine.resetRoomToLobby(roomCode);
        const updated = roomEngine.getRoom(roomCode);
        if (updated) io.to(roomCode).emit('room_state', updated);
        return;
      }

      // Move to next step
      const nextState = storyEngine.nextStep(room.storyState);
      roomEngine.setStoryState(roomCode, nextState);
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

        if (result.pointEvents) {
          roomEngine.applyPointEvents(roomCode, result.pointEvents);
          
          io.to(roomCode).emit('scoreboard_state' as any, {
            players: roomEngine.getScoreboard(roomCode),
            houses: roomEngine.getHouseScoreboard(roomCode)
          });

          const updatedRoom = roomEngine.getRoom(roomCode);
          if (updatedRoom) io.to(roomCode).emit('room_state', updatedRoom);
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
        
        if (result.pointEvents) {
          roomEngine.applyPointEvents(roomCode, result.pointEvents);

          io.to(roomCode).emit('scoreboard_state' as any, {
            players: roomEngine.getScoreboard(roomCode),
            houses: roomEngine.getHouseScoreboard(roomCode)
          });
        }

        if (result.finished) {
          activeGames.delete(roomCode);
          const room = roomEngine.getRoom(roomCode);
          
          if (room?.status === 'playing' && room.storyState) {
            // Story mode: return to story engine
            roomEngine.setRoomStatus(roomCode, 'story');
            roomEngine.setCurrentGameId(roomCode, null);
            updateGameClients(roomCode);
          } else {
            roomEngine.resetRoomToLobby(roomCode);
            const r = roomEngine.getRoom(roomCode);
            if (r) io.to(roomCode).emit('room_state', r);
          }
        } else {
          updateGameClients(roomCode);
        }
      }
    });

    function updateGameClients(roomCode: string) {
      const room = roomEngine.getRoom(roomCode);
      if (!room) return;

      if (room.status === 'story' && room.storyState) {
        const step = storyEngine.getCurrentStep(room.storyState);
        if (step) {
          const tvData: any = { ...step };
          
          // Enrich data
          if (step.type === 'instructions' && step.instructionGameId) {
            tvData.instructions = INSTRUCTION_CATALOG[step.instructionGameId];
          }
          if (step.type === 'scoreboard') {
            tvData.scoreboard = {
              players: roomEngine.getScoreboard(roomCode),
              houses: roomEngine.getHouseScoreboard(roomCode),
              randomLine: SCOREBOARD_LINES[Math.floor(Math.random() * SCOREBOARD_LINES.length)]
            };
          }
          if (step.type === 'story_complete') {
             const houses = roomEngine.getHouseScoreboard(roomCode).sort((a,b) => b.points - a.points);
             tvData.winner = houses[0];
             tvData.ranking = houses;
             tvData.finalLine = FINAL_WINNER_LINES[Math.floor(Math.random() * FINAL_WINNER_LINES.length)];
          }

          io.to(roomCode).emit('game_state' as any, { phase: 'story_step', ...tvData });

          // Voice Cues
          if (step.voiceSlot) {
            io.to(roomCode).emit('voice_cue', {
              type: 'voiceSlot',
              slotId: step.voiceSlot,
              delayMs: 300,
              interrupt: true
            });
          } else if (step.type === 'instructions' && step.instructionGameId) {
            io.to(roomCode).emit('voice_cue', {
              type: 'instruction',
              gameId: step.instructionGameId,
              stepId: step.id,
              delayMs: 300,
              interrupt: true
            });
          } else if (step.type === 'fixed_minigame' || step.type === 'minigame_random') {
              // Usually no direct voice for the game transition if there was instructions
              // but we can play a round_start event
              io.to(roomCode).emit('voice_cue', {
                  type: 'event',
                  eventName: 'round_start',
                  delayMs: 500,
                  cooldownMs: 3000
              });
          } else if (step.type === 'scoreboard') {
              io.to(roomCode).emit('voice_cue', {
                  type: 'event',
                  eventName: 'leaderboard',
                  delayMs: 500,
                  cooldownMs: 5000
              });
          } else if (step.type === 'story_complete') {
              // The closure voice
              io.to(roomCode).emit('voice_cue', {
                  type: 'winner',
                  winnerHouse: tvData.winner.house,
                  delayMs: 800,
                  interrupt: true
              });
          }
          
          room.players.forEach(p => {
             let mobilePhase = 'story_wait';
             const mobileData: any = { phase: mobilePhase };
             if (step.type === 'instructions' && step.instructionGameId) {
                 mobileData.phase = 'story_instructions';
                 mobileData.instructions = INSTRUCTION_CATALOG[step.instructionGameId];
             }
             if (step.type === 'scoreboard') {
                 mobileData.phase = 'story_personal_score';
                 mobileData.points = p.points;
             }
             io.to(p.clientId).emit('game_player_state' as any, mobileData);
          });
        }
        return;
      }

      const game = activeGames.get(roomCode);
      if (!game) {
        // If not playing, send room state
        io.to(roomCode).emit('room_state', room);
        return;
      }

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
