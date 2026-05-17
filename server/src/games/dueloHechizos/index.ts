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
  roundNumber: number;
  totalRounds: number;
  phase: 'selection' | 'clash' | 'results';
  duelists: Player[];
  usedDuelistIds: string[];
  usedHouses: string[];
  choices: Map<string, { spell: Spell, elapsedMs: number }>;
  clashTaps: Map<string, number>;
  startedAt: number;
  durationMs: number;
  results: any | null;
  allPlayers: Player[];
}

export class DueloHechizos implements GameModule {
  id = 'duelo_hechizos' as const;
  name = 'Duelo de Hechizos';

  init(players: Player[], options?: any): DueloState {
    const totalRounds = 2;
    const usedDuelistIds: string[] = [];
    const usedHouses: string[] = [];

    const duelists = this.pickDuelists(players, usedDuelistIds, usedHouses);
    duelists.forEach(d => {
      usedDuelistIds.push(d.clientId);
      if (d.house && !usedHouses.includes(d.house)) usedHouses.push(d.house);
    });

    return {
      roundNumber: 1,
      totalRounds,
      phase: 'selection',
      duelists,
      usedDuelistIds,
      usedHouses,
      choices: new Map(),
      clashTaps: new Map(),
      startedAt: Date.now(),
      durationMs: 12000,
      results: null,
      allPlayers: players
    };
  }

  private pickDuelists(players: Player[], usedIds: string[], usedHouses: string[]): Player[] {
    const available = players.filter(p => !usedIds.includes(p.clientId));
    if (available.length < 2) {
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 2);
    }

    const byHouse: { [house: string]: Player[] } = {};
    available.forEach(p => {
      const h = p.house || 'Gryffindor';
      if (!byHouse[h]) byHouse[h] = [];
      byHouse[h].push(p);
    });

    const unusedHouseNames = Object.keys(byHouse).filter(h => !usedHouses.includes(h));
    
    let houseA: string;
    let houseB: string;

    if (unusedHouseNames.length >= 2) {
      const shuffledHouses = [...unusedHouseNames].sort(() => Math.random() - 0.5);
      houseA = shuffledHouses[0];
      houseB = shuffledHouses[1];
    } else if (Object.keys(byHouse).length >= 2) {
      const shuffledHouses = Object.keys(byHouse).sort(() => Math.random() - 0.5);
      houseA = shuffledHouses[0];
      houseB = shuffledHouses[1];
    } else {
      const h = Object.keys(byHouse)[0];
      houseA = h; houseB = h;
    }

    const p1List = byHouse[houseA];
    const p1 = p1List[Math.floor(Math.random() * p1List.length)];
    
    const p2List = houseA === houseB ? p1List.filter(p => p.clientId !== p1.clientId) : byHouse[houseB];
    const p2 = p2List.length > 0 ? p2List[Math.floor(Math.random() * p2List.length)] : available.find(p => p.clientId !== p1.clientId)!;

    return [p1, p2];
  }

  getTvState(state: DueloState) {
    return {
      roundNumber: state.roundNumber,
      totalRounds: state.totalRounds,
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
      roundNumber: state.roundNumber,
      totalRounds: state.totalRounds,
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
      } else if (state.phase === 'results') {
        if (state.roundNumber < state.totalRounds) {
          return this.startNextRound(state);
        } else {
          return { state, finished: true };
        }
      }
    }
    return { state };
  }

  private startNextRound(state: DueloState): GameUpdateResult {
    state.roundNumber++;
    state.phase = 'selection';
    state.choices.clear();
    state.clashTaps.clear();
    state.results = null;

    const newDuelists = this.pickDuelists(state.allPlayers, state.usedDuelistIds, state.usedHouses);
    state.duelists = newDuelists;
    newDuelists.forEach(d => {
      state.usedDuelistIds.push(d.clientId);
      if (d.house && !state.usedHouses.includes(d.house)) {
        state.usedHouses.push(d.house);
      }
    });
    state.startedAt = Date.now();
    state.durationMs = 12000;

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
