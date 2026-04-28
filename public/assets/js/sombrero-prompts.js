window.SOMBRERO_BURLON_PROMPTS = [
  "¿Quién usaría una capa invisible para no pagar la cuenta?",
  "¿Quién vendería pociones falsas afuera de la escuela?",
  "¿Quién terminaría castigado por contestarle al profesor más serio?",
  "¿Quién sería el primero en intentar un hechizo prohibido y decir que fue accidente?",
  "¿Quién se perdería en una escalera mágica aunque tuviera mapa?",
  "¿Quién usaría magia imperdonable para no lavar los platos?",
  "¿Quién sería el peor mesero en Hogwarts Snacks & Foods por estar en el chisme?",
  "¿Quién fingiría ser prefecto para saltarse la fila?",
  "¿Quién convertiría una clase seria en karaoke mágico?",
  "¿Quién vendería boletos para ver una pelea de fantasmas?",
  "¿Quién se tomaría una poción sin preguntar para qué sirve?",
  "¿Quién haría trampa en Quidditch y todavía pediría aplausos?",
  "¿Quién terminaría adoptando una criatura peligrosa porque ‘se veía tierna’?",
  "¿Quién usaría un giratiempo para dormir cinco minutos más?",
  "¿Quién le pondría salsa a una poción ancestral?"
];

window.getSombreroPrompt = function getSombreroPrompt() {
  const bank = window.SOMBRERO_BURLON_PROMPTS || [];

  if (!bank.length) {
    return "¿Quién merece ser señalado por el Sombrero Burlón?";
  }

  return bank[Math.floor(Math.random() * bank.length)];
};
