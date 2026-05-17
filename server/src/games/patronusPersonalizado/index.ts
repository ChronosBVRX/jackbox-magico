import { GameModule, GameUpdateResult } from '../base';
import { Player } from '../../types/events';
import { PatronusState, PatronusSubmission, PatronusPrompt } from './types';
import { PATRONUS_PROMPTS, NARRATOR_LINES } from './data';
import { PATRONUS_SCORING } from './scoring';

export class PatronusPersonalizado implements GameModule {
  id = 'patronus_personalizado' as const;
  name = 'Patronus Personalizado';

  init(players: Player[]): PatronusState {
    const prompt = PATRONUS_PROMPTS[Math.floor(Math.random() * PATRONUS_PROMPTS.length)];
    return {
      phase: 'submit',
      prompt,
      submissions: {},
      votes: {},
      startedAt: Date.now(),
      submitDurationMs: 75000,
      voteDurationMs: 45000,
      results: null,
      players
    };
  }

  getTvState(state: PatronusState) {
    return {
      phase: state.phase,
      prompt: state.prompt,
      submitCount: Object.keys(state.submissions).length,
      voteCount: Object.keys(state.votes).length,
      totalPlayers: state.players.length,
      submissions: state.phase === 'vote' ? Object.values(state.submissions).map(s => ({ id: s.id, text: s.text })) : [],
      results: state.results
    };
  }

  getPlayerState(state: PatronusState, player: Player) {
    const mySubmission = state.submissions[player.clientId];
    return {
      phase: state.phase,
      prompt: state.prompt?.text,
      alreadySubmitted: !!mySubmission,
      alreadyVoted: !!state.votes[player.clientId],
      mySubmissionId: mySubmission?.id,
      submissions: state.phase === 'vote' 
        ? Object.values(state.submissions)
            .filter(s => s.clientId !== player.clientId)
            .map(s => ({ id: s.id, text: s.text }))
        : []
    };
  }

  handlePlayerAction(state: PatronusState, player: Player, action: any): GameUpdateResult {
    if (state.phase === 'submit' && action.type === 'patronus_submit') {
      if (state.submissions[player.clientId]) return { state };
      let text = (action.text || '').trim().substring(0, 80);
      if (!text) return { state };

      const OFENSIVAS = ['mierda', 'puta', 'puto', 'pene', 'vagina', 'culo', 'joder', 'cabron', 'chinga', 'verga', 'pendejo', 'coño', 'bitch', 'fuck', 'shit'];
      OFENSIVAS.forEach(word => {
        const regex = new RegExp(word, 'gi');
        text = text.replace(regex, '🎇[magia pura]🎇');
      });

      state.submissions[player.clientId] = {
        id: Math.random().toString(36).substring(7),
        clientId: player.clientId,
        playerName: player.name,
        house: player.house,
        text,
        createdAt: Date.now()
      };
      return { state, events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }] };
    }

    if (state.phase === 'vote' && action.type === 'patronus_vote') {
      if (state.votes[player.clientId]) return { state };
      const submission = Object.values(state.submissions).find(s => s.id === action.submissionId);
      if (!submission || submission.clientId === player.clientId) return { state };

      state.votes[player.clientId] = action.submissionId;
      return { state, events: [{ type: 'answer_ack', payload: { success: true }, target: 'players' }] };
    }

    return { state };
  }

  handleHostAction(state: PatronusState, action: string): GameUpdateResult {
    if (action === 'next') {
      if (state.phase === 'submit') {
        state.phase = 'vote';
        state.startedAt = Date.now();
        return { state };
      } else if (state.phase === 'vote') {
        return this.resolveResults(state);
      } else if (state.phase === 'results') {
        return { state, finished: true };
      }
    }
    return { state };
  }

  private resolveResults(state: PatronusState): GameUpdateResult {
    const voteCounts: Record<string, number> = {};
    Object.values(state.votes).forEach(subId => {
      voteCounts[subId] = (voteCounts[subId] || 0) + 1;
    });

    const ranking = Object.values(state.submissions).map(s => ({
      ...s,
      voteCount: voteCounts[s.id] || 0
    })).sort((a, b) => b.voteCount - a.voteCount);

    const pointEvents: any[] = [];
    const houseVotes: Record<string, number> = {};

    ranking.forEach((entry, index) => {
      let points = PATRONUS_SCORING.PARTICIPATION;
      points += entry.voteCount * PATRONUS_SCORING.PER_VOTE;

      if (index === 0 && entry.voteCount > 0) points += PATRONUS_SCORING.FIRST_PLACE;
      else if (index === 1 && entry.voteCount > 0) points += PATRONUS_SCORING.SECOND_PLACE;
      else if (entry.voteCount === 0) points += PATRONUS_SCORING.NO_VOTES_PITY;

      pointEvents.push({
        clientId: entry.clientId,
        points,
        reason: index === 0 ? "Patronus más brillante (+150)" : `Votos recibidos (+${points})`,
        house: entry.house
      });

      houseVotes[entry.house] = (houseVotes[entry.house] || 0) + entry.voteCount;
    });

    // House bonus
    const sortedHouses = Object.entries(houseVotes).sort((a, b) => b[1] - a[1]);
    if (sortedHouses.length > 0 && sortedHouses[0][1] > 0) {
      const winnerHouse = sortedHouses[0][0];
      state.players.filter(p => p.house === winnerHouse).forEach(p => {
        pointEvents.push({
          clientId: p.clientId,
          points: PATRONUS_SCORING.WINNER_HOUSE_BONUS / 2, // Distributed
          reason: "Casa con más luz (+50)"
        });
      });
    }

    state.phase = 'results';
    state.results = {
      ranking: ranking.map(r => ({
        playerName: r.playerName,
        house: r.house,
        text: r.text,
        votes: r.voteCount
      })),
      narrator: NARRATOR_LINES[Math.floor(Math.random() * NARRATOR_LINES.length)]
    };

    return { state, pointEvents };
  }
}
