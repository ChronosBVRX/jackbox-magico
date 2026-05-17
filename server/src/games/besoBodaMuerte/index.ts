import { GameModule, GameUpdateResult } from '../base';
import { Player } from '../../types/events';
import { BesoBodaMuerteState, KMKCharacter, KMKPlayerPrediction } from './types';

export class BesoBodaMuerte implements GameModule {
  id = 'beso_boda_muerte' as const;
  name = 'Beso, Boda, Muerte';

  private readonly CHARACTERS_CATALOG: KMKCharacter[] = [
    { id: 'snape', name: 'Severus Snape', movieTitle: 'Profesor de Pociones', description: 'El príncipe mestizo del champú ausente y el dramatismo en capa negra.', emoji: '🧪', image: '/assets/images/characters/snape.png' },
    { id: 'umbridge', name: 'Dolores Umbridge', movieTitle: 'Suma Inquisidora', description: 'La fanática del rosa, los gatitos de cerámica y los castigos con pluma de sangre.', emoji: '🐱', image: '/assets/images/characters/umbridge.png' },
    { id: 'voldemort', name: 'Lord Voldemort', movieTitle: 'El Señor Tenebroso', description: 'El mago tenebroso sin nariz que no entiende el concepto del amor ni del bloqueador solar.', emoji: '🐍', image: '/assets/images/characters/voldemort.png' },
    { id: 'bellatrix', name: 'Bellatrix Lestrange', movieTitle: 'Mortífaga de Élite', description: 'La mortífaga más desquiciada, leal y con el peinado más alborotado del mundo mágico.', emoji: '🗡️', image: '/assets/images/characters/bellatrix.png' },
    { id: 'dobby', name: 'Dobby', movieTitle: 'Elfo Libre', description: 'El elfo libre amante de los calcetines disparejos y de salvar a Harry Potter causándole conmociones cerebrales.', emoji: '🧦', image: '/assets/images/characters/dobby.png' },
    { id: 'draco', name: 'Draco Malfoy', movieTitle: 'Príncipe de Slytherin', description: 'El hurón albino dramático que menciona a su padre cada cinco minutos.', emoji: '🍏', image: '/assets/images/characters/draco.png' },
    { id: 'hagrid', name: 'Rubeus Hagrid', movieTitle: 'Guardián de las Llaves', description: 'El gigante bonachón amante de los monstruos letales y los pasteles de cumpleaños aplastados.', emoji: '🎂', image: '/assets/images/characters/hagrid.png' },
    { id: 'lockhart', name: 'Gilderoy Lockhart', movieTitle: 'Celebridad Mágica', description: 'El cinco veces ganador de la sonrisa más encantadora y experto en borrar memorias ajenas.', emoji: '✨', image: '/assets/images/characters/lockhart.png' },
    { id: 'myrtle', name: 'Myrtle la Llorona', movieTitle: 'Fantasma de Hogwarts', description: 'La habitante más dramática y sensible del baño de chicas del segundo piso.', emoji: '👻', image: '/assets/images/characters/myrtle.png' },
    { id: 'filch', name: 'Argus Filch', movieTitle: 'Celador de Hogwarts', description: 'El celador amargado que sueña con colgar a los estudiantes de los pulgares en las mazmorras.', emoji: '🧹', image: '/assets/images/characters/filch.png' },
    { id: 'lucius', name: 'Lucius Malfoy', movieTitle: 'Aristócrata Sangre Pura', description: 'El fabuloso cabello platinado del mal y coleccionista de bastones con veneno.', emoji: '🦚', image: '/assets/images/characters/lucius.png' },
    { id: 'pettigrew', name: 'Peter Pettigrew', movieTitle: 'Colagusano', description: 'El animago rata traicionero con una mano de plata y cero lealtad.', emoji: '🐀', image: '/assets/images/characters/pettigrew.png' }
  ];

  init(players: Player[]): BesoBodaMuerteState {
    const validPlayers = players.filter(p => p.isConnected);
    const targetPlayer = validPlayers.length > 0 
      ? validPlayers[Math.floor(Math.random() * validPlayers.length)] 
      : players[0];

    // Seleccionar 3 personajes al azar
    const shuffled = [...this.CHARACTERS_CATALOG].sort(() => 0.5 - Math.random());
    const selectedCharacters = shuffled.slice(0, 3);

    return {
      phase: 'predicting',
      targetClientId: targetPlayer.clientId,
      targetPlayerName: targetPlayer.name,
      targetPlayerHouse: targetPlayer.house,
      characters: selectedCharacters,
      targetChoices: null,
      playerPredictions: {},
      startedAt: Date.now(),
      durationMs: 40000,
      results: null
    };
  }

  getTvState(state: BesoBodaMuerteState) {
    if (state.phase === 'results') {
      return { phase: 'results', results: state.results };
    }
    return {
      phase: state.phase,
      targetPlayerName: state.targetPlayerName,
      targetPlayerHouse: state.targetPlayerHouse,
      characters: state.characters,
      predictionsCount: Object.keys(state.playerPredictions).length,
      targetAnswered: state.targetChoices !== null,
      startedAt: state.startedAt,
      durationMs: state.durationMs
    };
  }

  getPlayerState(state: BesoBodaMuerteState, player: Player) {
    if (state.phase === 'results') return { phase: 'results' };
    const isTarget = player.clientId === state.targetClientId;
    const alreadySubmitted = isTarget 
      ? state.targetChoices !== null 
      : state.playerPredictions[player.clientId] !== undefined;

    return {
      phase: state.phase,
      isTarget,
      targetPlayerName: state.targetPlayerName,
      characters: state.characters,
      alreadySubmitted
    };
  }

  handlePlayerAction(state: BesoBodaMuerteState, player: Player, action: any): GameUpdateResult {
    if (state.phase !== 'predicting') return { state };

    if (action.type === 'kmk_submit' && action.choices) {
      if (player.clientId === state.targetClientId) {
        state.targetChoices = action.choices;
      } else {
        state.playerPredictions[player.clientId] = {
          clientId: player.clientId,
          playerName: player.name,
          house: player.house,
          prediction: action.choices,
          pointsAwarded: 0,
          matches: 0
        };
      }
      return { state, events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }] };
    }

    return { state };
  }

  handleHostAction(state: BesoBodaMuerteState, action: string): GameUpdateResult {
    if (action === 'next') {
      if (state.phase === 'predicting') {
        state.phase = 'results';

        // Si el objetivo no respondió, generar respuestas automáticas al azar
        if (!state.targetChoices) {
          const actions: ('kiss' | 'marry' | 'kill')[] = ['kiss', 'marry', 'kill'];
          const shuffledActions = actions.sort(() => 0.5 - Math.random());
          state.targetChoices = {
            [state.characters[0].id]: shuffledActions[0],
            [state.characters[1].id]: shuffledActions[1],
            [state.characters[2].id]: shuffledActions[2]
          };
        }

        const pointEvents: any[] = [];
        const rankingList: any[] = [];

        Object.values(state.playerPredictions).forEach(pred => {
          let matches = 0;
          state.characters.forEach(char => {
            if (pred.prediction[char.id] === state.targetChoices![char.id]) {
              matches++;
            }
          });

          let points = matches * 100;
          if (matches === 3) points += 200; // Bono de predicción perfecta

          pred.matches = matches;
          pred.pointsAwarded = points;

          if (points > 0) {
            pointEvents.push({
              clientId: pred.clientId,
              points,
              gameId: 'beso_boda_muerte',
              label: matches === 3 ? '¡Predicción Perfecta de KMK!' : `Aciertos KMK: ${matches}`
            });
          }

          rankingList.push({
            name: pred.playerName,
            house: pred.house,
            points,
            matches,
            perfect: matches === 3
          });
        });

        rankingList.sort((a, b) => b.points - a.points);

        const narratorComments = [
          `¡Escandaloso! Las elecciones de ${state.targetPlayerName} saldrán en la portada de El Profeta mañana mismo.`,
          `Rita Skeeter ya está afilando su pluma a vuela pluma. ¡Vaya triángulo amoroso más bizarro!`,
          `Dumbledore decía que el amor es la fuerza más poderosa... pero elegir casarse con ese personaje es de un valor temerario.`,
          `Una terna digna de un interrogatorio con Veritaserum. ¡Nadie se esperaba este desenlace!`
        ];
        const randomComment = narratorComments[Math.floor(Math.random() * narratorComments.length)];

        state.results = {
          targetPlayerName: state.targetPlayerName,
          targetChoices: state.targetChoices,
          characters: state.characters,
          narratorComment: `"${randomComment}" - Corazón de Bruja`,
          ranking: rankingList
        };

        return {
          state,
          pointEvents,
          events: [
            {
              type: 'voice_cue',
              payload: {
                cueKey: 'kmk_results',
                text: `¡Las elecciones de ${state.targetPlayerName} han sido reveladas! ${randomComment}`
              },
              target: 'all'
            }
          ]
        };
      } else {
        return { state, finished: true };
      }
    }
    return { state };
  }
}
