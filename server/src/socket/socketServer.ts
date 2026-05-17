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
import { GameModule, GameId } from '../games/base';
import { storyEngine } from '../story/storyEngine';
import { STORY_CATALOG } from '../story/storyCatalog';
import { INSTRUCTION_CATALOG } from '../story/instructionCatalog';
import { SCOREBOARD_LINES, TRIVIA_TRANSITION_LINES, MINIGAME_TRANSITION_LINES, FINAL_WINNER_LINES } from '../story/storyScreenCopy';

export function setupSocketServer(httpServer: HttpServer) {
  const allowedOrigins = process.env.ALLOWED_ORIGIN 
    ? process.env.ALLOWED_ORIGIN.split(',') 
    : "*";

  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true }
  });

  const activeGames: Map<string, { module: GameModule, state: any }> = new Map();
  const pendingRoomClosures: Map<string, NodeJS.Timeout> = new Map();

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

    socket.on('tv_toggle_debug', (enabled) => {
      const { roomCode, isTv } = socket.data;
      if (!isTv || !roomCode) return;
      roomEngine.toggleDebugMode(roomCode, enabled);
      const state = roomEngine.getRoom(roomCode);
      if (state) io.to(roomCode).emit('room_state', state);
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

        // Si había un temporizador de cierre pendiente para esta sala, cancelarlo porque alguien se reconectó
        if (pendingRoomClosures.has(roomCode)) {
          clearTimeout(pendingRoomClosures.get(roomCode));
          pendingRoomClosures.delete(roomCode);
          io.to(roomCode).emit('error_message', '✅ Jugador reconectado. Cierre de sala cancelado.');
        }

        const state = roomEngine.getRoom(roomCode);
        
        // AUTO-BOTS if debug mode and first real player
        if (state && state.debugMode && state.players.length === 1) {
          const bots = [
            { clientId: 'debug_bot_1', name: 'Dobby Debug', house: 'Gryffindor', gender: 'wizard' as const },
            { clientId: 'debug_bot_2', name: 'Luna Debug', house: 'Ravenclaw', gender: 'witch' as const },
            { clientId: 'debug_bot_3', name: 'Snape Debug', house: 'Slytherin', gender: 'wizard' as const },
          ];
          bots.forEach(bot => {
            roomEngine.addPlayer(roomCode, bot);
            roomEngine.setPlayerReady(roomCode, bot.clientId, true);
          });
        }

        const updatedState = roomEngine.getRoom(roomCode);
        if (updatedState) {
          io.to(roomCode).emit('room_state', updatedState);
          if (updatedState.status !== 'lobby') {
            updateGameClients(roomCode);
          }
        }
      } else {
        socket.emit('error_message', result.error || 'Error al unirse');
      }
    });

    socket.on('player_ready', () => {
      const { roomCode, clientId } = socket.data;
      if (!roomCode || !clientId) return;
      roomEngine.setPlayerReady(roomCode, clientId, true);
      const state = roomEngine.getRoom(roomCode);
      if (state) io.to(roomCode).emit('room_state', state);
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
      if (room.storyState?.config?.timerSpeed && state.durationMs) {
        state.durationMs = Math.round(state.durationMs * room.storyState.config.timerSpeed);
      }
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

      const room = roomEngine.getRoom(roomCode);
      if (!room) return;

      const connectedPlayers = roomEngine.getConnectedPlayers(roomCode);
      if (connectedPlayers.length < 4) {
        socket.emit('error_message', 'Este minijuego requiere al menos 4 jugadores.');
        return;
      }

      roomEngine.setRoomStatus(roomCode, 'pre_instruction');
      roomEngine.setPreInstructionGameId(roomCode, gameId, false);
      updateGameClients(roomCode);
    });

    socket.on('tv_debug_start_game', (gameId) => {
      const { roomCode, isTv } = socket.data;
      if (!isTv || !roomCode) return;

      const room = roomEngine.getRoom(roomCode);
      if (!room) return;

      const connectedPlayers = roomEngine.getConnectedPlayers(roomCode);
      if (connectedPlayers.length < 1) {
        socket.emit('error_message', 'Entra con al menos un celular para iniciar el debug.');
        return;
      }

      roomEngine.setRoomStatus(roomCode, 'pre_instruction');
      roomEngine.setPreInstructionGameId(roomCode, gameId, true);
      updateGameClients(roomCode);
    });

    socket.on('tv_pregame_start', () => {
      const { roomCode, isTv } = socket.data;
      if (!isTv || !roomCode) return;

      const room = roomEngine.getRoom(roomCode);
      if (!room || !room.preInstruction) return;

      const result = startGameForRoom(roomCode, room.preInstruction.gameId, room.preInstruction.debug);
      if (!result.success) {
        socket.emit('error_message', result.error || 'No se pudo iniciar el juego.');
      }
    });

    socket.on('tv_back_to_lobby', () => {
      const { roomCode, isTv, clientId } = socket.data;
      if (!roomCode) return;
      if (!isTv) {
        const player = roomEngine.getPlayer(roomCode, clientId);
        if (!player || !player.isHost) return;
      }
      
      roomEngine.resetRoomToLobby(roomCode);
      const room = roomEngine.getRoom(roomCode);
      if (room) {
        io.to(roomCode).emit('room_state', room);
        io.to(roomCode).emit('game_started', null as any); // Clear game on clients
      }
    });

    socket.on('tv_select_story', (payload) => {
      const { roomCode, isTv } = socket.data;
      if (!isTv || !roomCode) return;

      const storyId = typeof payload === 'string' ? payload : payload?.storyId;
      const config = typeof payload === 'object' ? payload?.config : undefined;

      if (!storyId) return;

      const connectedPlayers = roomEngine.getConnectedPlayers(roomCode);
      if (connectedPlayers.length < 4) {
        socket.emit('error_message', 'Se requieren al menos 4 jugadores para iniciar una historia.');
        return;
      }

      const storyState = storyEngine.initStory(storyId, config);
      if (!storyState) return;

      roomEngine.setRoomStatus(roomCode, 'story');
      roomEngine.setStoryState(roomCode, storyState);
      
      updateGameClients(roomCode);
    });

    socket.on('tv_story_next', () => {
      const { roomCode, isTv, clientId } = socket.data;
      if (!roomCode) return;
      if (!isTv) {
        const player = roomEngine.getPlayer(roomCode, clientId);
        if (!player || !player.isHost) return;
      }

      const room = roomEngine.getRoom(roomCode);
      if (!room || !room.storyState) return;

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

      const nextStep = storyEngine.getCurrentStep(nextState);
      if (nextStep && (nextStep.type === 'trivia_block' || nextStep.type === 'fixed_minigame' || nextStep.type === 'minigame_random' || nextStep.type === 'copa_final')) {
        const gameId = nextState.selectedMinigame;
        if (gameId) {
          const module = createGameModule(gameId as any);
          if (module) {
            const state = module.init(room.players, nextStep);
            if (room.storyState?.config?.timerSpeed && state.durationMs) {
              state.durationMs = Math.round(state.durationMs * room.storyState.config.timerSpeed);
            }
            activeGames.set(roomCode, { module, state });
            roomEngine.setRoomStatus(roomCode, 'playing');
            roomEngine.setCurrentGameId(roomCode, gameId);
            io.to(roomCode).emit('game_started', gameId);
            updateGameClients(roomCode);
            return;
          }
        }
      }

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
        }

        if (result.finished) {
          activeGames.delete(roomCode);
          const room = roomEngine.getRoom(roomCode);
          
          if (room?.status === 'playing' && room.storyState) {
            // Story mode: return to story engine
            roomEngine.setRoomStatus(roomCode, 'story');
            roomEngine.setCurrentGameId(roomCode, null);
            
            const nextStoryState = storyEngine.nextStep(room.storyState);
            roomEngine.setStoryState(roomCode, nextStoryState);

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

    socket.on('host_action', (data) => {
      const { roomCode, clientId } = socket.data;
      if (!roomCode || !clientId) return;

      const game = activeGames.get(roomCode);
      if (game) {
        const player = roomEngine.getPlayer(roomCode, clientId);
        if (!player || !player.isHost) return;

        const result = game.module.handleHostAction(game.state, data?.action || 'next');
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
        }

        if (result.finished) {
          activeGames.delete(roomCode);
          const room = roomEngine.getRoom(roomCode);
          
          if (room?.status === 'playing' && room.storyState) {
            roomEngine.setRoomStatus(roomCode, 'story');
            roomEngine.setCurrentGameId(roomCode, null);
            
            const nextStoryState = storyEngine.nextStep(room.storyState);
            roomEngine.setStoryState(roomCode, nextStoryState);

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

      if (room.status === 'pre_instruction' && room.preInstruction) {
        const instr = INSTRUCTION_CATALOG[room.preInstruction.gameId as GameId];
        if (instr) {
          const tvData = {
            phase: 'pre_instruction',
            instructions: instr,
            coverImage: `/assets/images/covers/${room.preInstruction.gameId}.png`
          };

          io.to(roomCode).emit('game_state' as any, tvData);

          io.to(roomCode).emit('voice_cue', {
            type: 'instruction',
            gameId: room.preInstruction.gameId,
            stepId: 'pre',
            delayMs: 300,
            interrupt: true
          });

          room.players.forEach(p => {
            io.to(p.clientId).emit('game_player_state' as any, {
              phase: 'story_instructions',
              instructions: instr,
              currentGameId: room.preInstruction!.gameId
            });
          });
        }
        return;
      }

      if (room.status === 'story' && room.storyState) {
        const step = storyEngine.getCurrentStep(room.storyState);
        if (step) {
          const tvData: any = { ...step };
          
          // Enrich data
          if (step.type === 'instructions' && step.instructionGameId) {
            tvData.instructions = INSTRUCTION_CATALOG[step.instructionGameId as GameId];
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
          let leaderHouse: string | undefined = undefined;
          if (step.type === 'scoreboard') {
            const sortedHouses = roomEngine.getHouseScoreboard(roomCode).sort((a, b) => b.points - a.points);
            if (sortedHouses.length >= 2 && sortedHouses[0].points === sortedHouses[1].points && sortedHouses[0].points > 0) {
              leaderHouse = 'empate';
            } else if (sortedHouses.length > 0) {
              leaderHouse = sortedHouses[0].house;
            }
          }

          if (step.voiceSlot) {
            io.to(roomCode).emit('voice_cue', {
              type: 'voiceSlot',
              slotId: step.voiceSlot,
              leaderHouse,
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
                  leaderHouse,
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
                 mobileData.instructions = INSTRUCTION_CATALOG[step.instructionGameId as GameId];
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
        if (state) {
          io.to(roomCode).emit('room_state', state);

          // Verificar si quedan jugadores conectados
          const connected = roomEngine.getConnectedPlayers(roomCode);
          if (connected.length === 0) {
            // Iniciar temporizador de cierre de sala (ej. 45 segundos de gracia para reconectar)
            if (!pendingRoomClosures.has(roomCode)) {
              io.to(roomCode).emit('error_message', '⚠️ Todos los jugadores se han desconectado. La sala se cerrará en 45 segundos si nadie se reconecta.');
              const timer = setTimeout(() => {
                pendingRoomClosures.delete(roomCode);
                const currentRoom = roomEngine.getRoom(roomCode);
                if (currentRoom && roomEngine.getConnectedPlayers(roomCode).length === 0) {
                  io.to(roomCode).emit('error_message', '🚨 La sala se ha cerrado por inactividad (sin jugadores).');
                  roomEngine.resetRoomToLobby(roomCode);
                  activeGames.delete(roomCode);
                  io.in(roomCode).socketsLeave(roomCode);
                }
              }, 45000);
              pendingRoomClosures.set(roomCode, timer);
            }
          }
        }
      }
    });
  });

  return io;
}
