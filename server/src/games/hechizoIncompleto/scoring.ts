export const HECHIZO_SCORING = {
  CORRECT: 80,
  FAST_BONUS: 40,
  FAST_LIMIT_MS: 3000,
  STREAK_5_BONUS: 150,
  WRONG_EXPERT: -20
};

export function calculateSpellPoints(correct: boolean, elapsedMs: number, difficulty: string, streak: number) {
  if (!correct) {
    return difficulty === 'experto' ? HECHIZO_SCORING.WRONG_EXPERT : 0;
  }
  
  let points = HECHIZO_SCORING.CORRECT;
  if (elapsedMs < HECHIZO_SCORING.FAST_LIMIT_MS) {
    points += HECHIZO_SCORING.FAST_BONUS;
  }
  
  if (streak > 0 && streak % 5 === 0) {
    points += HECHIZO_SCORING.STREAK_5_BONUS;
  }
  
  return points;
}
