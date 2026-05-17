import { GameModule, GameUpdateResult } from '../base';
import { Player } from '../../types/events';
import { ImpostorState, HogwartsLocation } from './types';

export class ElImpostor implements GameModule {
  id = 'el_impostor' as const;
  name = 'El Impostor de Hogwarts';

  private readonly LOCATIONS_CATALOG: HogwartsLocation[] = [
    { id: 'cabanahagrid', name: 'Cabaña de Hagrid', description: 'Acogedora, con olor a té de roca, pasteles de melaza aplastados y criaturas letales bajo la cama.', emoji: '🛖', image: '/assets/images/impostor/cabanahagrid.png' },
    { id: 'banomyrtle', name: 'Baño de Myrtle la Llorona', description: 'Húmedo, dramático, con tuberías ruidosas y un lavabo que susurra en pársel.', emoji: '👻', image: '/assets/images/impostor/banomyrtle.png' },
    { id: 'oficinasnape', name: 'Oficina de Snape', description: 'Fría, en penumbra, con frascos de cosas flotando y un ambiente lleno de desprecio académico.', emoji: '🧪', image: '/assets/images/impostor/oficinasnape.png' },
    { id: 'bosqueprohibido', name: 'Bosque Prohibido', description: 'Oscuro, neblinoso, lleno de telarañas gigantes y centauros que juzgan tus decisiones de vida.', emoji: '🌲', image: '/assets/images/impostor/bosqueprohibido.png' },
    { id: 'grancamara', name: 'Cámara de los Secretos', description: 'Subterránea, húmeda, con estatuas gigantes de serpientes y un ligero eco de basilisco.', emoji: '🐍', image: '/assets/images/impostor/grancamara.png' },
    { id: 'salaesteren', name: 'Sala de los Menesteres', description: 'Rebosante de torres de objetos perdidos, jaulas viejas, arpas rotas y secretos antiguos.', emoji: '🚪', image: '/assets/images/impostor/salaesteren.png' },
    { id: 'callejonknockturn', name: 'Callejón Knockturn', description: 'Sombrío, con vitrinas que exhiben manos de gloria, collares malditos y brujas sospechosas.', emoji: '💀', image: '/assets/images/impostor/callejonknockturn.png' },
    { id: 'azkaban', name: 'Prisión de Azkaban', description: 'Desesperanzadora, gélida, rodeada de dementores flotando y pidiendo el recibo de nómina.', emoji: '⛓️', image: '/assets/images/impostor/azkaban.png' }
  ];

  init(players: Player[]): ImpostorState {
    const validPlayers = players.filter(p => p.isConnected);
    const spyPlayer = validPlayers.length > 0 
      ? validPlayers[Math.floor(Math.random() * validPlayers.length)] 
      : players[0];

    const location = this.LOCATIONS_CATALOG[Math.floor(Math.random() * this.LOCATIONS_CATALOG.length)];

    return {
      phase: 'playing',
      players: validPlayers,
      location,
      spyClientId: spyPlayer.clientId,
      spyPlayerName: spyPlayer.name,
      spyPlayerHouse: spyPlayer.house,
      locationsCatalog: this.LOCATIONS_CATALOG,
      startedAt: Date.now(),
      durationMs: 180000,
      votes: {},
      spyGuessedLocation: null,
      results: null
    };
  }

  getTvState(state: ImpostorState) {
    if (state.phase === 'results') {
      return { phase: 'results', results: state.results };
    }
    return {
      phase: state.phase,
      startedAt: state.startedAt,
      durationMs: state.durationMs,
      votesCount: Object.keys(state.votes).length + (state.spyGuessedLocation ? 1 : 0)
    };
  }

  getPlayerState(state: ImpostorState, player: Player) {
    if (state.phase === 'results') {
      return { phase: 'results', isSpy: player.clientId === state.spyClientId, results: state.results };
    }

    const isSpy = player.clientId === state.spyClientId;

    if (state.phase === 'playing') {
      return {
        phase: 'playing',
        isSpy,
        location: isSpy ? null : state.location,
        locationsCatalog: state.locationsCatalog
      };
    }

    if (state.phase === 'voting') {
      const alreadyVoted = state.votes[player.clientId] !== undefined || (isSpy && state.spyGuessedLocation !== null);
      const otherPlayers = state.players.filter(p => p.clientId !== player.clientId).map(p => ({
        clientId: p.clientId,
        name: p.name,
        house: p.house
      }));

      return {
        phase: 'voting',
        isSpy,
        alreadyVoted,
        players: otherPlayers,
        locationsCatalog: state.locationsCatalog
      };
    }

    return { phase: state.phase };
  }

  handlePlayerAction(state: ImpostorState, player: Player, action: any): GameUpdateResult {
    if (state.phase !== 'voting') return { state };

    if (action.type === 'impostor_vote' && action.votedClientId) {
      state.votes[player.clientId] = action.votedClientId;
      return { state, events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }] };
    }

    if (action.type === 'impostor_guess' && action.guessedLocationId) {
      if (player.clientId === state.spyClientId) {
        state.spyGuessedLocation = action.guessedLocationId;
        return { state, events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }] };
      }
    }

  onTick(state: ImpostorState): GameUpdateResult {
    if (state.phase === 'playing') {
      const elapsed = Date.now() - state.startedAt;
      if (elapsed >= state.durationMs) {
        return this.handleHostAction(state, 'next');
      }
    } else if (state.phase === 'voting') {
      const elapsed = Date.now() - state.startedAt;
      if (elapsed >= state.durationMs) {
        return this.handleHostAction(state, 'next');
      }
    }
    return { state };
  }

  handleHostAction(state: ImpostorState, action: string): GameUpdateResult {
    if (action === 'next') {
      if (state.phase === 'playing') {
        state.phase = 'voting';
        state.startedAt = Date.now();
        state.durationMs = 45000;
        return { 
          state, 
          events: [
            { 
              type: 'voice_cue', 
              payload: { type: 'audioFile', audioPath: 'assets/audio/voice_lines/impostor_voting.mp3', interrupt: true, force: true }, 
              target: 'all' 
            }
          ] 
        };
      }

      if (state.phase === 'voting') {
        state.phase = 'results';

        // Contar votos
        const votesCount: Record<string, number> = {};
        Object.values(state.votes).forEach(votedId => {
          votesCount[votedId] = (votesCount[votedId] || 0) + 1;
        });

        let mostVotedClientId: string | null = null;
        let maxVotes = 0;
        let isTie = false;

        Object.entries(votesCount).forEach(([clientId, count]) => {
          if (count > maxVotes) {
            maxVotes = count;
            mostVotedClientId = clientId;
            isTie = false;
          } else if (count === maxVotes && count > 0) {
            isTie = true;
          }
        });

        if (isTie) mostVotedClientId = null;

        const spyDiscovered = !isTie && mostVotedClientId === state.spyClientId;
        const spyGuessedCorrectly = state.spyGuessedLocation === state.location.id;

        let winner: 'loyal' | 'spy' | 'tie' = 'spy';
        let narratorComment = '';
        let audioFile = 'impostor_res_spy.mp3';

        if (spyGuessedCorrectly) {
          winner = 'spy';
          narratorComment = '¡Impresionante! El Espía Mortífago adivinó el lugar secreto y logró salirse con la suya.';
          audioFile = 'impostor_res_spy_guess.mp3';
        } else if (spyDiscovered) {
          winner = 'loyal';
          narratorComment = '¡Atrapado! Los magos leales detectaron al impostor con sus astutas preguntas.';
          audioFile = 'impostor_res_loyal.mp3';
        } else if (isTie) {
          winner = 'spy';
          narratorComment = '¡Empate en la votación! Ante la duda y la confusión, el Espía Mortífago escapa ileso.';
          audioFile = 'impostor_res_spy_tie.mp3';
        } else {
          winner = 'spy';
          narratorComment = '¡Engaño maestro! El Espía Mortífago logró confundir a todos e incriminó a un inocente.';
          audioFile = 'impostor_res_spy_survived.mp3';
        }

        const pointEvents: any[] = [];
        const rankingList: any[] = [];

        // Asignar puntos
        if (winner === 'loyal') {
          // Puntos a los que votaron por el espía
          Object.entries(state.votes).forEach(([voterId, votedId]) => {
            if (votedId === state.spyClientId) {
              pointEvents.push({ clientId: voterId, points: 150, reason: '¡Descubriste al Espía Mortífago!' });
              rankingList.push({ clientId: voterId, points: 150, label: '¡Detective Mágico (+150)!' });
            }
          });
          rankingList.push({ clientId: state.spyClientId, points: 0, label: '¡Atrapado (0 pts)!' });
        } else {
          // Puntos al espía
          pointEvents.push({ clientId: state.spyClientId, points: 300, reason: narratorComment });
          rankingList.push({ clientId: state.spyClientId, points: 300, label: `¡Espía Victorioso (+300)!` });
        }

        state.results = {
          spyClientId: state.spyClientId,
          spyPlayerName: state.spyPlayerName,
          spyPlayerHouse: state.spyPlayerHouse,
          actualLocation: state.location,
          spyGuessedLocation: state.spyGuessedLocation,
          votesCount,
          mostVotedClientId,
          spyDiscovered,
          spyGuessedCorrectly,
          winner,
          narratorComment,
          ranking: rankingList
        };

        return {
          state,
          pointEvents,
          events: [
            {
              type: 'voice_cue',
              payload: { type: 'audioFile', audioPath: `assets/audio/voice_lines/${audioFile}`, interrupt: true, force: true },
              target: 'all'
            }
          ]
        };
      }

      if (state.phase === 'results') {
        return { state, finished: true };
      }
    }

    return { state };
  }
}
