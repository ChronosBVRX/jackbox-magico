import { GameModule, GameUpdateResult } from '../base';
import { Player } from '../../types/events';

type Spell = 'Expelliarmus' | 'Protego' | 'Stupefy' | 'Esquivar' | 'Rictusempra';

const RULES: Record<Spell, Spell> = {
  'Expelliarmus': 'Rictusempra',
  'Protego': 'Expelliarmus',
  'Stupefy': 'Protego',
  'Esquivar': 'Stupefy',
  'Rictusempra': 'Esquivar'
};

interface DueloState {
  phase: 'selection' | 'clash' | 'results';
  duelists: Player[];
  choices: Map<string, { spell: Spell, elapsedMs: number }>;
  clashTaps: Map<string, number>;
  startedAt: number;
  durationMs: number;
  results: any | null;
}

export class DueloHechizos implements GameModule {
  id = 'duelo_hechizos' as const;
  name = 'Duelo de Hechizos';

  init(players: Player[], options?: any): DueloState {
    // Pick 2 random players (prefer different houses if possible)
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const duelists = shuffled.slice(0, 2);

    return {
      phase: 'selection',
      duelists,
      choices: new Map(),
      clashTaps: new Map(),
      startedAt: Date.now(),
      durationMs: 7000,
      results: null
    };
  }

  getTvState(state: DueloState) {
    return {
      phase: state.phase,
      duelists: state.duelists.map(p => ({ name: p.name, house: p.house, clientId: p.clientId })),
      choiceCount: state.choices.size,
      clashTaps: Object.fromEntries(state.clashTaps),
      results: state.results,
      startedAt: state.startedAt,
      durationMs: state.durationMs
    };
  }

  getPlayerState(state: DueloState, player: Player) {
    const isDuelist = state.duelists.some(d => d.clientId === player.clientId);
    return {
      phase: state.phase,
      isDuelist,
      alreadyChosen: state.choices.has(player.clientId),
      options: ['Expelliarmus', 'Protego', 'Stupefy', 'Esquivar', 'Rictusempra']
    };
  }

  handlePlayerAction(state: DueloState, player: Player, action: any): GameUpdateResult {
    const isDuelist = state.duelists.some(d => d.clientId === player.clientId);
    if (!isDuelist) return { state };

    if (state.phase === 'selection' && action.spell) {
      if (state.choices.has(player.clientId)) return { state };
      state.choices.set(player.clientId, { 
        spell: action.spell as Spell, 
        elapsedMs: Date.now() - state.startedAt 
      });

      // If both duelists chosen, we could resolve early or wait for host
      return { 
        state, 
        events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }]
      };
    }

    if (state.phase === 'clash' && action.type === 'tap') {
      const current = state.clashTaps.get(player.clientId) || 0;
      state.clashTaps.set(player.clientId, current + 1);
      return { state };
    }

    return { state };
  }

  handleHostAction(state: DueloState, action: string): GameUpdateResult {
    if (action === 'next') {
      if (state.phase === 'selection') {
        return this.resolveSelection(state);
      } else if (state.phase === 'clash') {
        return this.resolveClash(state);
      } else {
        return { state, finished: true };
      }
    }
    return { state };
  }

  private resolveSelection(state: DueloState): GameUpdateResult {
    const p1 = state.duelists[0];
    const p2 = state.duelists[1];
    const c1 = state.choices.get(p1.clientId);
    const c2 = state.choices.get(p2.clientId);

    if (!c1 && !c2) {
      state.phase = 'results';
      state.results = { type: 'tie', message: 'Ambos se quedaron congelados.' };
      return { state };
    }

    if (!c1) {
      state.phase = 'results';
      state.results = { winner: p2.name, message: `${p1.name} no lanzó nada.` };
      return { state, pointEvents: [{ clientId: p2.clientId, points: 100, reason: '+100 Victoria por Abandono' }] };
    }

    if (!c2) {
      state.phase = 'results';
      state.results = { winner: p1.name, message: `${p2.name} no lanzó nada.` };
      return { state, pointEvents: [{ clientId: p1.clientId, points: 100, reason: '+100 Victoria por Abandono' }] };
    }

    if (c1.spell === c2.spell) {
      state.phase = 'clash';
      state.startedAt = Date.now();
      state.durationMs = 5000;
      return { state };
    }

    const winner = RULES[c1.spell] === c2.spell ? p1 : p2;
    state.phase = 'results';
    state.results = { 
      winner: winner.name, 
      message: `${winner.name} venció con ${winner === p1 ? c1.spell : c2.spell}.`,
      spells: { [p1.clientId]: c1.spell, [p2.clientId]: c2.spell }
    };

    return { state, pointEvents: [{ clientId: winner.clientId, points: 150, reason: '+150 Victoria en Duelo' }] };
  }

  private resolveClash(state: DueloState): GameUpdateResult {
    const p1 = state.duelists[0];
    const p2 = state.duelists[1];
    const t1 = state.clashTaps.get(p1.clientId) || 0;
    const t2 = state.clashTaps.get(p2.clientId) || 0;

    const winner = t1 > t2 ? p1 : (t2 > t1 ? p2 : null);
    
    state.phase = 'results';
    state.results = {
      winner: winner ? winner.name : 'Empate',
      message: winner 
        ? `${winner.name} ganó el choque con ${Math.max(t1, t2)} pulsaciones.` 
        : '¡Poderes iguales! El choque terminó en empate.',
      taps: { [p1.clientId]: t1, [p2.clientId]: t2 }
    };

    const pointEvents = winner ? [{ clientId: winner.clientId, points: 200, reason: '+200 Victoria en Choque de Poder' }] : [];

    return { state, pointEvents };
  }
}
