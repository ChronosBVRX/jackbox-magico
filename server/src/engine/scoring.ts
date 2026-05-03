export const SCORING_RULES = {
  DIFFICULTY: {
    facil: 50,
    media: 100,
    dificil: 150,
    experto: 200,
  },
  BONUS: {
    FASTEST_CORRECT: 40,
    STREAK_3: 100,
  },
  WRONG: 0,
};

export type HouseScore = {
  house: string;
  points: number;
};

export type PlayerScore = {
  name: string;
  points: number;
  streak: number;
  correctCount: number;
};

export function calculateTriviaPoints(
  difficulty: keyof typeof SCORING_RULES.DIFFICULTY,
  isCorrect: boolean,
  isFastest: boolean,
  currentStreak: number
): { points: number; labels: string[] } {
  if (!isCorrect) {
    return { points: SCORING_RULES.WRONG, labels: ["Incorrecta"] };
  }

  let points = SCORING_RULES.DIFFICULTY[difficulty] || 100;
  const labels = [`Correcta +${points}`];

  if (isFastest) {
    points += SCORING_RULES.BONUS.FASTEST_CORRECT;
    labels.push(`¡Más rápido! +${SCORING_RULES.BONUS.FASTEST_CORRECT}`);
  }

  // Streak bonus every 3 correct answers
  if (currentStreak > 0 && currentStreak % 3 === 0) {
    points += SCORING_RULES.BONUS.STREAK_3;
    labels.push(`¡Racha de 3! +${SCORING_RULES.BONUS.STREAK_3}`);
  }

  return { points, labels };
}
