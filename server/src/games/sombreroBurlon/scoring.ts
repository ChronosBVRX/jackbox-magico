export const SOMBRERO_SCORING = {
  PER_VOTE: 10,
  MOST_VOTED_ROUND: 60,
  ZERO_VOTES_ROUND: 15,
  OVERALL_WINNER: 100,
  HOUSE_BONUS: 60
};

export function calculateRoundScores(votes: Record<string, string>, players: string[]) {
  const counts: Record<string, number> = {};
  players.forEach(p => counts[p] = 0);
  
  Object.values(votes).forEach(targetId => {
    counts[targetId] = (counts[targetId] || 0) + 1;
  });

  const maxVotes = Math.max(...Object.values(counts));
  
  return players.map(playerId => {
    const vCount = counts[playerId] || 0;
    let points = vCount * SOMBRERO_SCORING.PER_VOTE;
    let reason = `${vCount} votos recibidos`;
    
    if (vCount === maxVotes && maxVotes > 0) {
      points += SOMBRERO_SCORING.MOST_VOTED_ROUND;
      reason = "Elegido por el Sombrero (+60)";
    } else if (vCount === 0) {
      points += SOMBRERO_SCORING.ZERO_VOTES_ROUND;
      reason = "Mago discreto (+15)";
    }

    return {
      clientId: playerId,
      points,
      reason,
      votes: vCount
    };
  });
}
