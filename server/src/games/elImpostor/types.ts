import { Player } from '../../types/events';

export type ImpostorPhase = 'playing' | 'voting' | 'results';

export interface HogwartsLocation {
  id: string;
  name: string;
  description: string;
  image: string;
  emoji: string;
}

export interface ImpostorState {
  phase: ImpostorPhase;
  players: Player[];
  location: HogwartsLocation;
  spyClientId: string;
  spyPlayerName: string;
  spyPlayerHouse: string;
  locationsCatalog: HogwartsLocation[];
  startedAt: number;
  durationMs: number;
  votes: Record<string, string>; // voterClientId -> votedClientId
  spyGuessedLocation: string | null;
  results: {
    spyClientId: string;
    spyPlayerName: string;
    spyPlayerHouse: string;
    actualLocation: HogwartsLocation;
    spyGuessedLocation: string | null;
    votesCount: Record<string, number>;
    mostVotedClientId: string | null;
    spyDiscovered: boolean;
    spyGuessedCorrectly: boolean;
    winner: 'loyal' | 'spy' | 'tie';
    narratorComment: string;
    ranking: { clientId: string; name: string; house: string; points: number; label: string }[];
  } | null;
}
