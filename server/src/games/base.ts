import { Player } from '../types/events';

export type GameId = 
  | 'trivia_magica'
  | 'artes_ridiculas'
  | 'atrapa_snitch'
  | 'duelo_hechizos'
  | 'sombrero_burlon'
  | 'clase_pociones'
  | 'mapa_travieso'
  | 'retratos_chismosos'
  | 'hechizo_incompleto'
  | 'caldero_mentiroso'
  | 'patronus_personalizado'
  | 'copa_final';

export interface GameUpdateResult {
  state: any;
  events?: {
    type: string;
    payload: any;
    target: 'tv' | 'players' | 'all';
  }[];
  finished?: boolean;
}

export interface GameModule {
  id: GameId;
  name: string;
  
  /**
   * Initializes the game state
   */
  init(players: Player[]): any;

  /**
   * Data sent to the TV (public)
   */
  getTvState(state: any): any;

  /**
   * Data sent to each player (can be specific per player)
   */
  getPlayerState(state: any, player: Player): any;

  /**
   * Handles an action from a player
   */
  handlePlayerAction(state: any, player: Player, action: any): GameUpdateResult;

  /**
   * Handles a control action from the host (TV)
   */
  handleHostAction(state: any, action: string): GameUpdateResult;

  /**
   * Called when a timer expires or transition is forced
   */
  onTick?(state: any): GameUpdateResult;
}
