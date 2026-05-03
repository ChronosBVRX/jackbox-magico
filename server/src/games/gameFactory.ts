import { GameId, GameModule } from './base';
import { TriviaMagica } from './triviaMagica/index';
import { ArtesRidiculas } from './artesRidiculas/index';
import { AtrapaSnitch } from './atrapaSnitch/index';
import { DueloHechizos } from './dueloHechizos/index';
import { SombreroBurlon } from './sombreroBurlon/index';
import { ClasePociones } from './clasePociones/index';

export function createGameModule(gameId: GameId): GameModule | null {
  switch (gameId) {
    case 'trivia_magica':
      return new TriviaMagica();
    case 'artes_ridiculas':
      return new ArtesRidiculas();
    case 'atrapa_snitch':
      return new AtrapaSnitch();
    case 'duelo_hechizos':
      return new DueloHechizos();
    case 'sombrero_burlon':
      return new SombreroBurlon();
    case 'clase_pociones':
      return new ClasePociones();
    // Remaining games will be added here as they are implemented
    default:
      return null;
  }
}
