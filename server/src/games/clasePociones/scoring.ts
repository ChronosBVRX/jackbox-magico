export const POCIONES_SCORING = {
  PERFECT: 150,
  ONE_ERROR: 80,
  TWO_ERRORS: 40,
  FASTEST_BONUS: 50,
  HOUSE_BONUS: 50
};

export function calculatePotionErrors(targetIds: string[], submittedIds: string[]): number {
  let errors = 0;
  const maxLen = Math.max(targetIds.length, submittedIds.length);

  for (let i = 0; i < maxLen; i++) {
    if (targetIds[i] !== submittedIds[i]) {
      errors++;
    }
  }
  return errors;
}

export function getPointsForErrors(errors: number): number {
  if (errors === 0) return POCIONES_SCORING.PERFECT;
  if (errors === 1) return POCIONES_SCORING.ONE_ERROR;
  if (errors === 2) return POCIONES_SCORING.TWO_ERRORS;
  return 0;
}
