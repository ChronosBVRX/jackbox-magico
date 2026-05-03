export const RETRATOS_SCORING = {
  POINTS_BY_CLUE: [150, 100, 60],
  FASTEST_BONUS: 30,
  HOUSE_BONUS: 80
};

export function calculatePoints(correct: boolean, clueIndex: number) {
  if (!correct) return 0;
  return RETRATOS_SCORING.POINTS_BY_CLUE[clueIndex] || 60;
}
