import { GameId, GameModule } from './base';
import { TriviaMagica } from './triviaMagica/index';
import { ArtesRidiculas } from './artesRidiculas/index';

export function createGameModule(gameId: GameId): GameModule | null {
  switch (gameId) {
    case 'trivia_magica':
      return new TriviaMagica();
    case 'artes_ridiculas':
      return new ArtesRidiculas();
    // Remaining games will be added here as they are implemented
    default:
      return null;
  }
}
