export const MAPA_SCORING = {
  CORRECT: 100,
  FASTEST_BONUS: 30,
  HOUSE_COMBO: 80,
  FILCH_PENALTY: -20
};

export function getBasePoints(correct: boolean, mode: string) {
  if (correct) return MAPA_SCORING.CORRECT;
  if (mode === 'filch') return MAPA_SCORING.FILCH_PENALTY;
  return 0;
}
