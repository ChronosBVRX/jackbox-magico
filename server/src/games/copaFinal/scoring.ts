export const COPA_SCORING = {
  WAGER_CHOICES: [0, 100, 200, 300],
  ALL_IN_BONUS: 200
};

export function calculateCopaPoints(correct: boolean, wager: number, isAllIn: boolean) {
  if (correct) {
    return wager + (isAllIn ? COPA_SCORING.ALL_IN_BONUS : 0);
  } else {
    return -wager;
  }
}
