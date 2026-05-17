import { GameId, GameModule } from './base';
import { TriviaMagica } from './triviaMagica/index';
import { ArtesRidiculas } from './artesRidiculas/index';
import { AtrapaSnitch } from './atrapaSnitch/index';
import { DueloHechizos } from './dueloHechizos/index';
import { SombreroBurlon } from './sombreroBurlon/index';
import { ClasePociones } from './clasePociones/index';
import { MapaTravieso } from './mapaTravieso/index';
import { CalderoMentiroso } from './calderoMentiroso/index';
import { RetratosChismosos } from './retratosChismosos/index';
import { HechizoIncompleto } from './hechizoIncompleto/index';
import { PatronusPersonalizado } from './patronusPersonalizado/index';
import { CopaFinal } from './copaFinal/index';
import { BesoBodaMuerte } from './besoBodaMuerte/index';
import { ElImpostor } from './elImpostor/index';
import { ElTiburon } from './tiburon/index';

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
    case 'mapa_travieso':
      return new MapaTravieso();
    case 'caldero_mentiroso':
      return new CalderoMentiroso();
    case 'retratos_chismosos':
      return new RetratosChismosos();
    case 'hechizo_incompleto':
      return new HechizoIncompleto();
    case 'patronus_personalizado':
      return new PatronusPersonalizado();
    case 'copa_final':
      return new CopaFinal();
    case 'beso_boda_muerte':
      return new BesoBodaMuerte();
    case 'el_impostor':
      return new ElImpostor();
    case 'el_tiburon':
      return new ElTiburon();
    default:
      return null;
  }
}
