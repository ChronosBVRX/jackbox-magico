import { Ingredient, IngredientType } from './types';

export const INGREDIENT_CONFIGS: Record<IngredientType, { label: string, emoji: string, effect: number, tone: string }> = {
  good: { label: 'Bueno', emoji: '🌿', effect: 1, tone: 'Parece noble. Eso casi siempre significa problemas menores.' },
  bad: { label: 'Malo', emoji: '🦴', effect: -1, tone: 'Huele a pasillo prohibido y a decisión cuestionable.' },
  explosive: { label: 'Explosivo', emoji: '💥', effect: -3, tone: 'No late, pero definitivamente quiere hacer escándalo.' },
  gold: { label: 'Dorado', emoji: '✨', effect: 2, tone: 'Brilla como si hubiera pagado palco en el Mundial de Quidditch.' }
};

export const INGREDIENT_NAMES: Record<IngredientType, string[]> = {
  good: ["Mandrágora calmada", "Hoja de Díctamo", "Lágrima de Fénix", "Polvo de Luna"],
  bad: ["Baba de Troll", "Uña de Sapo", "Moho de Mazmorra", "Pelo de Kneazle"],
  explosive: ["Escama de Colacuerno", "Chispa de Varita", "Semilla Gritona", "Cristal de Erumpent"],
  gold: ["Suerte líquida", "Felix Felicis pirata", "Azafrán de Gringotts", "Esencia de Puntos Extra"]
};

export const NARRATOR_LINES = [
  "Pueden mentir, claro. No sería la primera vez que un mago finge inocencia.",
  "El caldero no juzga. Solo burbujea con decepción.",
  "Aquí todos son inocentes hasta que la mesa tiembla.",
  "Si alguien sonríe demasiado, probablemente trae algo explosivo."
];
