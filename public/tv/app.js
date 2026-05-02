let bgMusicStarted = false;
let currentRoom = "";
let radarInterval = null;
let lastPlayKey = "";
let lastTickSecond = null;
let autoRevealLock = false;
let roomCreating = false;
let lastResultsKey = "";
let triviaSparklesInterval = null;
let lottieFx = null;
let roomSocket = null;
let roomSocketRetryTimer = null;
let lastVoicePhase = "";
let threatVoiceTimer = null;
let lastPlayersHash = "";
let lastHouseScoresHash = "";
let lastTriviaPlayersHash = "";

const houseIcons = {
  Gryffindor: "🦁",
  Slytherin: "🐍",
  Ravenclaw: "🦅",
  Hufflepuff: "🦡",
};

const houseNames = {
  Gryffindor: "Gryffindor",
  Slytherin: "Slytherin",
  Ravenclaw: "Ravenclaw",
  Hufflepuff: "Hufflepuff",
};

const houseColors = {
  Gryffindor: "#c0392b",
  Slytherin: "#27ae60",
  Ravenclaw: "#2980b9",
  Hufflepuff: "#f1c40f",
};

const houseGradients = {
  Gryffindor: "linear-gradient(135deg, rgba(192,57,43,.95), rgba(255,196,87,.78))",
  Slytherin: "linear-gradient(135deg, rgba(39,174,96,.95), rgba(196,255,220,.58))",
  Ravenclaw: "linear-gradient(135deg, rgba(41,128,185,.95), rgba(170,220,255,.62))",
  Hufflepuff: "linear-gradient(135deg, rgba(241,196,15,.95), rgba(40,40,40,.72))",
};

const answerLetters = ["A", "B", "C", "D"];

const difficultyLabels = {
  facil: "Fácil",
  facil: "Fácil",
  media: "Media",
  dificil: "Difícil",
  difícil: "Difícil",
  experto: "Experto",
};

const difficultyClass = {
  facil: "easy",
  facil: "easy",
  media: "medium",
  dificil: "hard",
  difícil: "hard",
  experto: "expert",
};

function injectTriviaStyles() {
  if (document.getElementById("trivia-premium-styles")) return;

  const style = document.createElement("style");
  style.id = "trivia-premium-styles";
  style.textContent = `
    .trivia-board {
      position: relative;
      overflow: hidden;
      width: min(1220px, 96vw);
      min-height: 90vh;
      padding: 26px;
      border-radius: 36px;
      color: #fff7dc;
      border: 1px solid rgba(255, 216, 121, .30);
      background:
        radial-gradient(circle at 16% 12%, rgba(255, 216, 121, .18), transparent 26%),
        radial-gradient(circle at 84% 20%, rgba(93, 150, 255, .20), transparent 28%),
        radial-gradient(circle at 50% 95%, rgba(255, 216, 121, .10), transparent 34%),
        linear-gradient(180deg, rgba(8, 17, 34, .98), rgba(3, 7, 14, .99));
      box-shadow:
        0 36px 120px rgba(0,0,0,.62),
        inset 0 0 0 1px rgba(255,255,255,.045);
    }

    .trivia-board::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px),
        linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px);
      background-size: 72px 72px;
      opacity: .45;
      pointer-events: none;
    }

    .trivia-board::after {
      content: "";
      position: absolute;
      inset: -20%;
      background:
        radial-gradient(circle, rgba(255, 216, 121, .18) 0 2px, transparent 3px),
        radial-gradient(circle, rgba(255,255,255,.12) 0 1px, transparent 2px);
      background-size: 120px 120px, 82px 82px;
      animation: triviaStars 28s linear infinite;
      opacity: .40;
      pointer-events: none;
    }

    @keyframes triviaStars {
      from { transform: translate3d(0, 0, 0); }
      to { transform: translate3d(-90px, 70px, 0); }
    }

    .trivia-candles {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 1;
    }

    .trivia-candle {
      position: absolute;
      width: 8px;
      height: 28px;
      border-radius: 999px;
      background: linear-gradient(180deg, #fff5c7, #d9a441);
      box-shadow:
        0 0 18px rgba(255, 216, 121, .65),
        0 0 44px rgba(255, 216, 121, .22);
      opacity: .62;
      animation: floatCandle 4.5s ease-in-out infinite alternate;
    }

    .trivia-candle::before {
      content: "";
      position: absolute;
      left: 50%;
      top: -13px;
      width: 13px;
      height: 18px;
      transform: translateX(-50%);
      border-radius: 50% 50% 45% 45%;
      background: radial-gradient(circle at center, #fff, #ffd978 48%, transparent 72%);
      animation: flameFlicker .42s ease-in-out infinite alternate;
    }

    @keyframes floatCandle {
      from { transform: translateY(-6px); }
      to { transform: translateY(8px); }
    }

    @keyframes flameFlicker {
      from { transform: translateX(-50%) scale(.9) rotate(-3deg); opacity: .75; }
      to { transform: translateX(-50%) scale(1.12) rotate(3deg); opacity: 1; }
    }

    .trivia-content {
      position: relative;
      z-index: 2;
    }

    .trivia-header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 18px;
      align-items: start;
      margin-bottom: 16px;
    }

    .trivia-badge-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }

    .trivia-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 13px;
      border-radius: 999px;
      color: #ffe7a3;
      background: rgba(255,216,121,.12);
      border: 1px solid rgba(255,216,121,.26);
      font-weight: 900;
      font-size: .86rem;
      letter-spacing: .03em;
      text-transform: uppercase;
    }

    .trivia-pill.category {
      color: #d8ecff;
      background: rgba(96,165,250,.13);
      border-color: rgba(125,211,252,.24);
    }

    .trivia-pill.easy {
      color: #bbf7d0;
      background: rgba(34,197,94,.13);
      border-color: rgba(74,222,128,.28);
    }

    .trivia-pill.medium {
      color: #dbeafe;
      background: rgba(59,130,246,.13);
      border-color: rgba(147,197,253,.28);
    }

    .trivia-pill.hard {
      color: #fed7aa;
      background: rgba(249,115,22,.13);
      border-color: rgba(253,186,116,.30);
    }

    .trivia-pill.expert {
      color: #fecaca;
      background: rgba(220,38,38,.15);
      border-color: rgba(248,113,113,.34);
    }

    .trivia-title {
      margin: 10px 0 4px;
      color: #fff;
      font-size: clamp(2.4rem, 5vw, 5.2rem);
      line-height: .88;
      letter-spacing: -.075em;
    }

    .trivia-subtitle {
      margin: 0;
      max-width: 790px;
      color: rgba(255, 247, 220, .70);
      font-size: 1rem;
    }

    .trivia-timer-card {
      min-width: 178px;
      padding: 16px 18px;
      border-radius: 26px;
      text-align: center;
      background:
        radial-gradient(circle at top, rgba(255,216,121,.14), transparent 58%),
        rgba(255,255,255,.07);
      border: 1px solid rgba(255,255,255,.11);
      backdrop-filter: blur(16px);
      box-shadow: 0 18px 50px rgba(0,0,0,.28);
    }

    .trivia-timer-card span {
      display: block;
      margin-bottom: 6px;
      color: rgba(255,247,220,.62);
      text-transform: uppercase;
      letter-spacing: .14em;
      font-weight: 900;
      font-size: .75rem;
    }

    .trivia-timer-card strong {
      display: block;
      color: #ffe089;
      font-size: 3.3rem;
      line-height: 1;
      font-weight: 1000;
    }

    .trivia-main-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 315px;
      gap: 16px;
    }

    .trivia-question-card {
      position: relative;
      overflow: hidden;
      min-height: 430px;
      padding: 24px;
      border-radius: 30px;
      background:
        radial-gradient(circle at 50% 0%, rgba(255,216,121,.12), transparent 42%),
        linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.038));
      border: 1px solid rgba(255,255,255,.10);
      box-shadow: inset 0 0 70px rgba(255,216,121,.035);
    }

    .trivia-question-card::before {
      content: "";
      position: absolute;
      inset: 16px;
      border-radius: 24px;
      border: 1px solid rgba(255,216,121,.11);
      pointer-events: none;
    }

    .trivia-round-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 14px;
      color: rgba(255,247,220,.72);
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: .08em;
      font-size: .78rem;
    }

    .trivia-question-text {
      min-height: 106px;
      display: flex;
      align-items: center;
      margin: 0 0 20px;
      color: #fff;
      font-size: clamp(2rem, 3.3vw, 3.35rem);
      line-height: 1.02;
      letter-spacing: -.055em;
      font-weight: 1000;
      text-wrap: balance;
    }

    .trivia-options {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .trivia-option {
      position: relative;
      overflow: hidden;
      min-height: 96px;
      display: grid;
      grid-template-columns: 56px 1fr;
      align-items: center;
      gap: 12px;
      padding: 13px 15px;
      border-radius: 22px;
      background: rgba(255,255,255,.065);
      border: 1px solid rgba(255,255,255,.10);
      box-shadow: 0 12px 32px rgba(0,0,0,.14);
      animation: optionIn .45s ease both;
    }

    .trivia-option::after {
      content: "";
      position: absolute;
      inset: -80%;
      background: linear-gradient(115deg, transparent 42%, rgba(255,255,255,.14), transparent 58%);
      transform: translateX(-70%);
      animation: optionShine 3.2s ease-in-out infinite;
      opacity: .75;
      pointer-events: none;
    }

    @keyframes optionIn {
      from { opacity: 0; transform: translateY(10px) scale(.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes optionShine {
      0%, 55% { transform: translateX(-72%); }
      100% { transform: translateX(72%); }
    }

    .trivia-option-letter {
      width: 52px;
      height: 52px;
      display: grid;
      place-items: center;
      border-radius: 16px;
      color: #271600;
      background: linear-gradient(135deg, #fff8d6, #facc15);
      box-shadow:
        0 0 26px rgba(250,204,21,.24),
        inset 0 0 0 1px rgba(255,255,255,.45);
      font-weight: 1000;
      font-size: 1.35rem;
    }

    .trivia-option-text {
      position: relative;
      z-index: 2;
      color: rgba(255,255,255,.94);
      font-size: clamp(1.05rem, 1.55vw, 1.45rem);
      line-height: 1.12;
      font-weight: 900;
    }

    .trivia-progress {
      margin-top: 16px;
      height: 13px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(255,255,255,.10);
    }

    .trivia-progress > div {
      height: 100%;
      width: 100%;
      transform-origin: left center;
      background: linear-gradient(90deg, #22c55e, #fde68a, #ef4444);
      transition: transform .12s linear;
    }

    .trivia-side {
      display: grid;
      gap: 12px;
      align-content: start;
    }

    .trivia-side-card {
      padding: 16px;
      border-radius: 24px;
      background: rgba(255,255,255,.065);
      border: 1px solid rgba(255,255,255,.10);
      backdrop-filter: blur(14px);
      box-shadow: 0 16px 42px rgba(0,0,0,.20);
    }

    .trivia-side-title {
      margin: 0 0 10px;
      color: rgba(255,247,220,.72);
      font-size: .78rem;
      text-transform: uppercase;
      letter-spacing: .13em;
      font-weight: 1000;
    }

    .trivia-house-score {
      display: grid;
      gap: 8px;
    }

    .trivia-house-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      align-items: center;
      padding: 10px 11px;
      border-radius: 16px;
      background: rgba(255,255,255,.055);
      border: 1px solid rgba(255,255,255,.08);
    }

    .trivia-house-row .name {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #fff;
      font-weight: 900;
    }

    .trivia-house-row .score {
      color: #ffe089;
      font-weight: 1000;
      font-size: 1.12rem;
    }

    .trivia-players {
      display: grid;
      gap: 8px;
    }

    .trivia-player-row {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 8px;
      padding: 9px 10px;
      border-radius: 14px;
      color: rgba(255,247,220,.80);
      background: rgba(255,255,255,.045);
      border: 1px solid rgba(255,255,255,.075);
    }

    .trivia-player-row.answered {
      color: #fff;
      background: rgba(34,197,94,.13);
      border-color: rgba(74,222,128,.28);
    }

    .trivia-player-row .status {
      font-size: .78rem;
      font-weight: 1000;
      color: rgba(255,247,220,.68);
    }

    .trivia-player-row.answered .status {
      color: #86efac;
    }

    .trivia-narrator {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 17px;
      color: rgba(255,247,220,.84);
      background: rgba(3,7,18,.40);
      border: 1px solid rgba(255,216,121,.16);
      font-weight: 700;
      line-height: 1.25;
    }

    .trivia-results-wrap {
      position: relative;
      overflow: hidden;
      width: min(1160px, 94vw);
      padding: 30px;
      border-radius: 34px;
      color: #fff7dc;
      border: 1px solid rgba(255,216,121,.28);
      background:
        radial-gradient(circle at 50% 0%, rgba(255,216,121,.16), transparent 32%),
        radial-gradient(circle at 20% 90%, rgba(34,197,94,.13), transparent 30%),
        radial-gradient(circle at 84% 86%, rgba(59,130,246,.13), transparent 30%),
        linear-gradient(180deg, rgba(8,17,34,.98), rgba(3,7,14,.99));
      box-shadow: 0 36px 120px rgba(0,0,0,.62);
    }

    .trivia-results-title {
      margin: 0;
      color: #fff;
      font-size: clamp(2.5rem, 5vw, 5rem);
      line-height: .9;
      letter-spacing: -.075em;
      text-align: center;
    }

    .trivia-correct-answer {
      margin: 18px auto 10px;
      width: fit-content;
      max-width: 92%;
      padding: 16px 22px;
      border-radius: 24px;
      color: #251600;
      background: linear-gradient(135deg, #fff8d6, #facc15);
      box-shadow: 0 18px 50px rgba(250,204,21,.22);
      font-size: clamp(1.4rem, 2.5vw, 2.4rem);
      font-weight: 1000;
      text-align: center;
    }

    .trivia-results-comment {
      max-width: 900px;
      margin: 0 auto 20px;
      color: rgba(255,247,220,.74);
      font-size: 1.1rem;
      text-align: center;
      font-weight: 800;
    }

    .trivia-fastest-banner {
      margin: 0 auto 18px;
      width: fit-content;
      max-width: 92%;
      padding: 11px 16px;
      border-radius: 999px;
      color: #ffe7a3;
      background: rgba(255,216,121,.12);
      border: 1px solid rgba(255,216,121,.28);
      font-weight: 1000;
    }

    .trivia-result-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .trivia-result-card {
      padding: 15px 16px;
      border-radius: 20px;
      background: rgba(255,255,255,.065);
      border: 1px solid rgba(255,255,255,.10);
    }

    .trivia-result-card.correct {
      background: rgba(34,197,94,.13);
      border-color: rgba(74,222,128,.28);
    }

    .trivia-result-card.wrong {
      background: rgba(239,68,68,.12);
      border-color: rgba(248,113,113,.24);
    }

    .trivia-result-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .trivia-result-name {
      color: #fff;
      font-size: 1.18rem;
      font-weight: 1000;
    }

    .trivia-result-house {
      margin-top: 2px;
      color: rgba(255,247,220,.62);
      font-size: .78rem;
      text-transform: uppercase;
      letter-spacing: .11em;
      font-weight: 800;
    }

    .trivia-result-points {
      color: #ffe089;
      font-size: 1.65rem;
      font-weight: 1000;
    }

    .trivia-result-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin-top: 10px;
    }

    .trivia-chip {
      padding: 7px 9px;
      border-radius: 999px;
      color: rgba(255,247,220,.82);
      background: rgba(255,255,255,.07);
      border: 1px solid rgba(255,255,255,.08);
      font-size: .78rem;
      font-weight: 900;
    }

    @media (max-width: 920px) {
      .trivia-main-grid {
        grid-template-columns: 1fr;
      }

      .trivia-result-grid {
        grid-template-columns: 1fr;
      }

      .trivia-options {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

function getBgMusic() {
  const audio = document.getElementById("tv-bg-music");

  if (!audio) return null;

  audio.volume = 0.35;
  audio.loop = true;

  return audio;
}

async function startBackgroundMusic() {
  const audio = getBgMusic();

  if (!audio) return false;

  try {
    audio.muted = false;
    audio.volume = 0.35;
    await audio.play();
    bgMusicStarted = true;
    return true;
  } catch (error) {
    bgMusicStarted = false;
    return false;
  }
}

function playMagicSound(name) {
  try {
    if (window.MagicSound && typeof window.MagicSound.play === "function") {
      window.MagicSound.play(name);
    }
  } catch (error) {}
}

function unlockMagicSound() {
  try {
    if (window.MagicSound && typeof window.MagicSound.unlock === "function") {
      window.MagicSound.unlock();
    }
    const bgMusic = document.getElementById("tv-bg-music");
    if (bgMusic && bgMusic.paused && !bgMusicStarted) {
      bgMusicStarted = true;
      bgMusic.volume = 0.3;
      bgMusic.play().catch(() => {});
    }

    if (lastVoicePhase !== "boot") {
      lastVoicePhase = "boot";
      // Solo reproducir audio de arranque genérico — NO intro_general aquí
      window.VoiceLinesTv?.playVoiceLine?.("boot", { volume: 0.95 });
    }
  } catch (error) {}
}

document.addEventListener("DOMContentLoaded", () => {
  injectTriviaStyles();

  const audio = getBgMusic();

  if (audio) {
    audio.addEventListener("error", () => {
      console.error("Audio de fondo no encontrado o inválido.");
    });
  }

  // Bind audio controls
  const btnMute = document.getElementById("btn-mute-instruction");
  const btnRepeat = document.getElementById("btn-repeat-instruction");

  if (btnMute && window.VoiceLinesTv) {
    const isMuted = window.VoiceLinesTv.isMuted();
    btnMute.textContent = isMuted ? "”‡" : "”Š";

    btnMute.addEventListener("click", () => {
      const muted = window.VoiceLinesTv.toggleMute();
      btnMute.textContent = muted ? "”‡" : "”Š";
    });
  }

  if (btnRepeat) {
    btnRepeat.addEventListener("click", () => {
      // Solo repetir instrucciones si view-rules está visible
      const rulesScreen = document.getElementById("view-rules");
      const isOnRules = Boolean(rulesScreen && rulesScreen.classList.contains("visible"));
      if (window.VoiceLinesTv && window.currentGameInstructionId && isOnRules) {
        window.VoiceLinesTv.playInstructionVoice(
          window.currentGameInstructionId,
          window.currentInstructionRoundId || "1",
          true
        );
      }
      // Si no está en view-rules, no hacer nada (no reproducir intro_general en lobby)
    });
  }
});

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("visible");
  });

  const target = document.getElementById(id);

  if (target) {
    target.classList.add("visible");
  }
  
  tvCarouselActive = (id === "view-inicio");
  tvLobbyActive = (id === "view-lobby");
  tvResultsActive = (id === "view-results");
  tvRulesActive = (id === "view-rules");
}



function safeText(value) {
  return String(value ?? "");
}

function escapeHTML(value) {
  return safeText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getQuestion(state) {
  return state.question || state.attack_msg || "Â¡Responde!";
}

function getRoundKey(state) {
  return `${state.phase}-${state.round_id || getQuestion(state)}`;
}

function normalizeDifficulty(value) {
  return safeText(value || "media")
    .toLowerCase()
    .replaceAll("í", "i")
    .replaceAll("á", "a");
}

function getDifficultyLabel(value) {
  return difficultyLabels[value] || difficultyLabels[normalizeDifficulty(value)] || safeText(value || "Media");
}

function getDifficultyClass(value) {
  return difficultyClass[value] || difficultyClass[normalizeDifficulty(value)] || "medium";
}

function calculateHouseScores(players = []) {
  const totals = {
    Gryffindor: 0,
    Slytherin: 0,
    Ravenclaw: 0,
    Hufflepuff: 0,
  };

  players.forEach((player) => {
    if (!totals[player.house]) {
      totals[player.house] = 0;
    }

    totals[player.house] += Number(player.score || 0);
  });

  return totals;
}

function renderHouseScoreboard(players = []) {
  const scores = calculateHouseScores(players);

  return Object.keys(scores)
    .sort((a, b) => Number(scores[b] || 0) - Number(scores[a] || 0))
    .map((house) => `
      <div class="trivia-house-row" style="box-shadow: inset 4px 0 0 ${houseColors[house] || "#facc15"};">
        <div class="name">${houseIcons[house] || "âœ¨"} ${escapeHTML(houseNames[house] || house)}</div>
        <div class="score">${Number(scores[house] || 0)}</div>
      </div>
    `)
    .join("");
}

function renderCandles() {
  const positions = [
    [7, 12, 0],
    [16, 28, .7],
    [27, 10, 1.4],
    [41, 19, .3],
    [55, 9, 1.1],
    [68, 22, .5],
    [82, 11, 1.7],
    [92, 30, .9],
    [13, 70, 1.2],
    [88, 74, .2],
  ];

  return `
    <div class="trivia-candles">
      ${positions.map(([left, top, delay]) => `
        <div class="trivia-candle" style="left:${left}%; top:${top}%; animation-delay:${delay}s;"></div>
      `).join("")}
    </div>
  `;
}

let stories = [];
let currentStoryIndex = 0;
let tvCarouselActive = true;
let tvLobbyActive = false;
let tvResultsActive = false;
let tvRulesActive = false;
let selectedStoryId = "";

async function loadTvStories() {
  try {
    const res = await fetch("/api/story/catalog", { cache: "no-store" });
    const data = await res.json();
    stories = data.stories || [];
    renderCarousel();
  } catch (error) {
    console.error("Failed to load stories", error);
  }
}

function renderCarousel() {
  const container = document.getElementById("tv-story-carousel");
  if (!container) return;
  container.innerHTML = "";
  if (!stories.length) {
    container.innerHTML = "<div class='spinner'>No hay historias disponibles.</div>";
    return;
  }
  stories.forEach((story, idx) => {
    const card = document.createElement("div");
    card.className = "story-card" + (idx === currentStoryIndex ? " selected" : "");
    card.id = `story-card-${idx}`;
    card.innerHTML = `
      <h3>${escapeHTML(story.title)}</h3>
      <p>${escapeHTML(story.description || "Una aventura mágica interactiva.")}</p>
    `;
    container.appendChild(card);
  });
  updateCarouselScroll();
}

function updateCarouselScroll() {
  const container = document.getElementById("tv-story-carousel");
  if (!container || !stories.length) return;
  
  for (let i = 0; i < stories.length; i++) {
    const card = document.getElementById(`story-card-${i}`);
    if (card) {
      if (i === currentStoryIndex) {
        card.classList.add("selected");
        card.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      } else {
        card.classList.remove("selected");
      }
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadTvStories();
});

function getTvToken() {
  if (window.RoomLifecycleTv?.getTvToken) return window.RoomLifecycleTv.getTvToken();
  let token = localStorage.getItem("jackbox_magico_tv_token");
  if (!token) {
    token = crypto?.randomUUID ? crypto.randomUUID() : `tv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem("jackbox_magico_tv_token", token);
  }
  return token;
}

async function startStoryFromLobby() {
  if (!currentRoom) return;
  try {
    const res = await fetch(`/api/story-tv/${currentRoom}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tv_token: getTvToken() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data.detail || data));
  } catch (error) {
    console.error("No se pudo iniciar historia desde lobby:", error);
  }
}

async function nextStoryStep() {
  if (!currentRoom) return;
  try {
    const res = await fetch(`/api/story-tv/${currentRoom}/next-step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tv_token: getTvToken() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data.detail || data));
  } catch (error) {
    console.error("No se pudo avanzar historia:", error);
  }
}

async function startMatchFlow(storyId, storyTitle) {
  if (roomCreating || currentRoom) return;

  const btn = document.getElementById("start-match-btn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Iniciando magia...";
  }

  selectedStoryId = storyId;

  unlockMagicSound();
  playMagicSound("start");

  if (window.VoiceLinesTv && typeof window.VoiceLinesTv.unlock === "function") {
    window.VoiceLinesTv.unlock();
    if (typeof window.VoiceLinesTv.play === "function") {
      window.VoiceLinesTv.play("boot", { volume: 0.95 });
    }
  }

  await startBackgroundMusic();
  unlockMagicSound(); // Asegurar desbloqueo de contexto de audio
  await crearSala();
}

async function crearSala() {
  if (currentRoom || roomCreating) return;

  roomCreating = true;

  try {
    const res = await fetch("/api/host/create_room", {
      method: "POST",
    });

    const data = await res.json();

    currentRoom = data.room_code;
    roomCreating = false;
    
    // Auto-prepare story for this room
    if (selectedStoryId) {
      try {
        await fetch(`/api/story-tv/${currentRoom}/prepare`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tv_token: getTvToken(), story_id: selectedStoryId }),
        });
      } catch (err) {
        console.error("Failed to prepare story", err);
      }
    }

    showScreen("view-lobby");

    const tvCode = document.getElementById("tv-code");
    const joinUrl = document.getElementById("join-url");
    const qr = document.getElementById("tv-qr");

    if (tvCode) tvCode.innerText = currentRoom;

    const urlUnirse = `${window.location.origin}/mobile/index.html?room=${currentRoom}`;

    if (joinUrl) joinUrl.innerText = urlUnirse;

    if (qr) {
      qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(urlUnirse)}`;
    }

    // VOZ: Al entrar al lobby solo se reproduce audio de sala de espera
    // intro_general (Dumbledore) NO debe sonar aquí, solo en view-rules
    const lobbyVoiceKey = `lobby_${currentRoom || "default"}`;
    if (window.lastLobbyVoiceKey !== lobbyVoiceKey) {
      window.lastLobbyVoiceKey = lobbyVoiceKey;
      window.VoiceLinesTv?.playVoiceLine?.("lobby", { volume: 0.85 });
    }

    iniciarRadar();
  } catch (error) {
    roomCreating = false;
    console.error("No se pudo crear la sala:", error);
  }
}

function iniciarRadar() {
  if (roomSocket) roomSocket.close();
  if (roomSocketRetryTimer) clearTimeout(roomSocketRetryTimer);

  // Vercel Serverless Functions do not support persistent WebSockets.
  // Fall back to polling immediately to prevent connection errors.
  startPollingFallback();
}

function startPollingFallback() {
  if (radarInterval) clearInterval(radarInterval);
  radarInterval = setInterval(async () => {
    if (!currentRoom) return;
    try {
      const res = await fetch(`/api/room/${currentRoom}/status?ts=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      renderRoomPayload(data);
    } catch (error) {
      console.error("Polling fallback error", error);
      if (lastVoicePhase !== "system_error") {
        lastVoicePhase = "system_error";
        window.VoiceLinesTv?.play("system", { volume: 0.8 });
      }
    }
  }, 900);
}

function renderRoomPayload(data) {
  if (data.status === "lobby") {
    if (typeof window.destroySnitchTv === "function") {
      window.destroySnitchTv();
    }
    renderLobby(data);
    return;
  }

  if (data.status === "playing") {
    const state = data.game_state || {};
    const phase = state.phase || "lobby";
    
    window.currentGameState = state;
    window.lastKnownPhase = phase;

    const tvSceneAudioKey = `${phase}:${state.current_game_id || ""}:${state.round_id || ""}:${state.question || ""}`;
    if (typeof window.lastTvSceneAudioKey === "undefined" || window.lastTvSceneAudioKey !== tvSceneAudioKey) {
      window.lastTvSceneAudioKey = tvSceneAudioKey;
      window.VoiceLinesTv?.stop?.();
    }
    
    // Fases de Escenas Especiales (Jackbox Style)
    if (phase === "scene_intro") {
      renderIntroScene(state);
      return;
    }

    if (phase === "scene_rules") {
      renderRulesScene(state);
      return;
    }

    if (phase === "scene_instructions") {
      renderInstructionsScene(state);
      return;
    }

    if (phase === "scene_scoreboard") {
      renderScoreboardScene(state);
      return;
    }

    if (phase === "scene_transition") {
      renderTransitionScene(state);
      return;
    }

    if (phase === "rules") {
      renderRules(data);
      return;
    }

    if (phase !== "lobby" && !phase.includes("results_")) {
      renderPlaying(data);
      return;
    }
    if (phase.includes("results_")) {
      renderResults(data);
    }
  }
}

function renderRules(data) {
  if (window.SceneRules) {
    window.SceneRules.render(data);
  }
}

function renderLobby(data) {
  autoRevealLock = false;
  lastPlayKey = "";
  lastResultsKey = "";

  showScreen("view-lobby");

  if (lastVoicePhase !== "lobby") {
    lastVoicePhase = "lobby";
    window.VoiceLinesTv?.play("lobby", { volume: 0.7 });
  }

  const hostBox = document.getElementById("host-status");

  const state = data.game_state || {};
  const isStoryMode = state.mode === "story";

  const storyTitle = document.getElementById("lobby-story-title");
  if (storyTitle) {
    storyTitle.textContent = state.story_title || "Esperando jugadores...";
  }

  if (hostBox) {
    if (isStoryMode) {
      hostBox.style.display = "none";
    } else {
      hostBox.style.display = "block";
      if (data.host && data.host.claimed && data.host.name) {
        hostBox.textContent = `Capitán de la sala: ${data.host.name}. Mira la pantalla principal para seguir la aventura.`;
        hostBox.classList.add("claimed");
      } else {
        hostBox.textContent = "El primer celular que entre será el host de la partida.";
        hostBox.classList.remove("claimed");
      }
    }
  }

  const hostControlsBox = document.getElementById("controles-host");
  if (hostControlsBox) {
    hostControlsBox.style.display = isStoryMode ? "none" : "block";
  }

  const lista = document.getElementById("lista-jugadores");

  if (lista) {
    const currentPlayers = data.players || [];
    const currentHash = JSON.stringify(currentPlayers.map(p => ({ 
      n: p.name, 
      h: p.house, 
      g: p.gender || "wizard" 
    })));

    if (lastPlayersHash !== currentHash) {
      lastPlayersHash = currentHash;
      lista.innerHTML = "";

      currentPlayers.forEach((player, idx) => {
        const item = document.createElement("div");
        item.className = "player-magic-card";
        
        const isWitch = (player.gender === "witch");
        const label = isWitch ? "Una maga" : "Un mago";
        const avatar = isWitch ? "§™â€â™€ï¸" : "§™â€â™‚ï¸";
        
        item.style.setProperty("--house-color", houseColors[player.house] || "#facc15");
        item.innerHTML = `
          <div class="mago-avatar">${avatar}</div>
          <div class="mago-info">
            <span class="mago-label">${label} de ${player.house}</span>
            <span class="mago-name">${escapeHTML(player.name)}</span>
          </div>
        `;
        lista.appendChild(item);
      });
    }
  }

  const controls = document.getElementById("controles-host");

  if (controls) {
    controls.style.display = (data.players || []).length >= 1 ? "block" : "none";
  }
}

function renderPlaying(data) {
  const state = data.game_state || {};
  const players = data.players || [];
  const key = getRoundKey(state);

  showScreen("view-game");

  if (state.phase === "atrapa_snitch") {
    if (typeof window.renderSnitchTv === "function") {
      window.renderSnitchTv(state, players, {
        reveal: revelarResultados,
      });
    } else {
      renderGenericGame(state, players);
    }

    return;
  }

  if (typeof window.destroySnitchTv === "function") {
    window.destroySnitchTv();
  }

  if (state.phase === "trivia") {
    if (lastPlayKey !== key) {
      lastPlayKey = key;
      lastTickSecond = null;
      autoRevealLock = false;
      playMagicSound("start");
    }

    if (window.SceneTrivia && typeof window.SceneTrivia.render === "function") {
      window.SceneTrivia.render(state, players);
      window.SceneTrivia.updateTimer?.(state);
      window.SceneTrivia.maybeAutoClose?.(state);
      return;
    }
  }

  if (lastPlayKey !== key) {
    lastPlayKey = key;
    lastTickSecond = null;
    autoRevealLock = false;
    playMagicSound("start");
    renderGenericGame(state, players);
  }

  updateGenericTimer(state);
}

function renderTrivia(state, players) {
  if (window.SceneTrivia) {
    window.SceneTrivia.render(state, players);
  }
}

function updateTriviaHouseScores(players) {
  const box = document.getElementById("trivia-house-score");
  if (!box) return;

  const scores = calculateHouseScores(players || []);
  const currentHash = JSON.stringify(scores);

  if (lastHouseScoresHash !== currentHash) {
    lastHouseScoresHash = currentHash;
    box.innerHTML = renderHouseScoreboard(players || []);
  }
}

function updateTriviaPlayers(state, players) {
  const box = document.getElementById("trivia-players");
  const countLabel = document.getElementById("trivia-answered-count");

  if (!box) return;

  const answered = state.answered || {};
  const answeredCount = Object.keys(answered).length;
  const total = (players || []).length;

  if (countLabel) {
    countLabel.textContent = `${answeredCount}/${total} respondieron`;
  }

  // Hash para evitar parpadeo: incluye el nombre de los jugadores y si han respondido
  const currentHash = JSON.stringify((players || []).map(p => ({
    n: p.name,
    a: Boolean(answered[p.name])
  })));

  if (lastTriviaPlayersHash === currentHash) return;
  lastTriviaPlayersHash = currentHash;

  box.innerHTML = "";

  (players || []).forEach((player) => {
    const hasAnswered = Boolean(answered[player.name]);
    const item = document.createElement("div");

    item.className = `trivia-player-row ${hasAnswered ? "answered" : ""}`;
    item.innerHTML = `
      <span>${houseIcons[player.house] || "âœ¨"} ${escapeHTML(player.name)}</span>
      <span class="status">${hasAnswered ? "Respondió" : "Pensando..."}</span>
    `;

    box.appendChild(item);
  });
}

function updateTriviaTimer(state) {
  const bar = document.getElementById("trivia-progress-bar");
  const label = document.getElementById("trivia-time");

  if (!bar || !label) return;

  const duration = Number(state.duration_seconds || 10);
  const startedAt = Number(state.started_at || Date.now() / 1000);
  const elapsed = Math.max(0, Date.now() / 1000 - startedAt);
  const left = Math.max(0, duration - elapsed);
  const pct = duration > 0 ? Math.max(0, Math.min(1, left / duration)) : 0;

  bar.style.transform = `scaleX(${pct})`;
  label.textContent = `${left.toFixed(1)}`;

  const rounded = Math.ceil(left);

  if (rounded <= 3 && rounded > 0 && rounded !== lastTickSecond) {
    lastTickSecond = rounded;
    playMagicSound("timer-danger");

    const board = document.getElementById("trivia-board");
    if (board) {
      board.animate(
        [
          { filter: "brightness(1)" },
          { filter: "brightness(1.25)" },
          { filter: "brightness(1)" },
        ],
        { duration: 180, easing: "ease-out" }
      );
    }
  }

  if (left <= 0 && !autoRevealLock) {
    autoRevealLock = true;

    setTimeout(() => {
      revelarResultados();
    }, 3500);
  }
}

function updateGenericTimer(state) {
  const duration = Number(state.duration_seconds || 0);
  const startedAt = Number(state.started_at || 0);

  if (!duration || !startedAt) return;

  const elapsed = Math.max(0, Date.now() / 1000 - startedAt);
  const left = Math.max(0, duration - elapsed);

  if (left <= 0 && !autoRevealLock) {
    autoRevealLock = true;

    setTimeout(() => {
      revelarResultados();
    }, 3500);
  }
}

function playResultVoiceLine(state, players) {
  if (!window.VoiceLinesTv) return;
  const result = state.trivia_result || state.result || {};
  const playerResults = result.player_results || result.players || [];
  
  const totalAnswers = playerResults.length;
  if (totalAnswers === 0) {
    window.VoiceLinesTv.play("timeout");
  } else {
    const anyStreak = playerResults.some((p) => p.streak >= 3);
    const anyHumor = playerResults.some((p) => p.humor_bonus || p.points_humor);
    const hasFastest = !!result.fastest_correct;
    const anyCorrect = playerResults.some((p) => p.correct);

    if (anyStreak) window.VoiceLinesTv.play("streak_bonus");
    else if (anyHumor) window.VoiceLinesTv.play("humor_bonus");
    else if (hasFastest) window.VoiceLinesTv.play("fast_bonus");
    else if (anyCorrect) window.VoiceLinesTv.play("correct");
    else window.VoiceLinesTv.play("wrong");
  }

  // Chaining explanation and leaderboard
  setTimeout(() => {
    if (state.explanation || state.narrator || result.commentary) {
      window.VoiceLinesTv?.play("explanation", { volume: 0.85 });
    }
  }, 4000);

  setTimeout(() => {
    window.VoiceLinesTv?.play("leaderboard", { volume: 0.9 });
  }, 8500);
}

function renderGenericGame(state, players = []) {
  const container = document.getElementById("game-container");

  if (!container) return;

  const currentPhaseKey = "round_start_" + (state.round_id || "1");
  if (lastVoicePhase !== currentPhaseKey) {
    lastVoicePhase = currentPhaseKey;
    window.VoiceLinesTv?.play("round_start", { volume: 0.75 });
    
    if (threatVoiceTimer) clearTimeout(threatVoiceTimer);
    threatVoiceTimer = setTimeout(() => {
      window.VoiceLinesTv?.play("threat", { volume: 0.85 });
    }, 3500); // offset para threat
  }

  container.innerHTML = `
    <section class="generic-card">
      <div class="badge">âœ¨ Minijuego activo</div>
      <h2 class="question-title">${escapeHTML(getQuestion(state))}</h2>
      <div class="options-grid" id="tv-opciones"></div>
      <div class="host-help">La TV revelará los resultados pronto. Prepárense.</div>
    </section>
  `;

  const grid = document.getElementById("tv-opciones");

  if (!grid) return;

  (state.options || []).forEach((option) => {
    const box = document.createElement("div");
    box.className = "option-box";
    box.textContent = option;
    grid.appendChild(box);
  });
}

function renderResults(data) {
  const state = data.game_state || {};
  const players = data.players || [];
  const phase = state.phase || "";
  const resultKey = `results-${phase}-${state.round_id || state.correct || state.question}`;

  if (lastResultsKey !== resultKey) {
    lastResultsKey = resultKey;
    playMagicSound("reveal");
    window.resultsPhaseStartAt = Date.now();
    setTimeout(() => playResultVoiceLine(state, players), 500);
  }

  if (typeof window.destroySnitchTv === "function") {
    window.destroySnitchTv();
  }

  // Lógica de alternancia: Resultados -> Marcador Global
  const elapsed = Date.now() - (window.resultsPhaseStartAt || 0);
  if (elapsed > 9000 && window.SceneLeaderboard) {
    window.SceneLeaderboard.render(data);
    return;
  }

  showScreen("view-results");

  if (phase === "results_trivia") {
    renderTriviaResults(state, players);
    return;
  }

  if (phase === "results_atrapa_snitch") {
    renderSnitchResults(state, players);
    return;
  }

  renderGenericResults(state, players);
}

function renderTriviaResults(state, players = []) {
  const title = document.getElementById("titulo-resultados");
  const correct = document.getElementById("tv-correcta");
  const explanation = document.getElementById("tv-explicacion");
  const extra = document.getElementById("tv-extra-results");
  const scores = document.getElementById("tv-marcadores");

  const result = state.trivia_result || {};
  const fastest = result.fastest_correct || null;
  const playerResults = result.player_results || [];
  const correctLabel = result.correct_label || state.correct_label || "";
  const correctAnswer = result.correct || state.correct || "Respuesta revelada";
  const commentary = result.commentary || state.narrator || "Pregunta resuelta.";

  if (title) title.innerText = "Resultado de la Trivia";
  if (correct) correct.innerText = `${correctLabel ? `${correctLabel}: ` : ""}${correctAnswer}`;
  if (explanation) explanation.innerText = commentary;

  if (extra) {
    extra.innerHTML = `
      <section class="trivia-results-wrap">
        <h1 class="trivia-results-title">El Gran Comedor ha decidido</h1>

        <div class="trivia-correct-answer">
          ${escapeHTML(correctLabel ? `${correctLabel}: ${correctAnswer}` : correctAnswer)}
        </div>

        <p class="trivia-results-comment">
          â€œ${escapeHTML(commentary)}â€
        </p>

        ${
          fastest
            ? `
              <div class="trivia-fastest-banner">
                âš¡ Respuesta correcta más rápida: ${escapeHTML(fastest.player_name)} Â· ${Number(fastest.elapsed_seconds || 0).toFixed(2)}s Â· +40
              </div>
            `
            : `
              <div class="trivia-fastest-banner">
                ’¨ Nadie acertó lo suficientemente rápido. El pergamino está decepcionado.
              </div>
            `
        }

        <div class="trivia-result-grid">
          ${
            playerResults.length
              ? playerResults.map((row) => renderTriviaResultCard(row)).join("")
              : `<div class="trivia-result-card wrong">Nadie respondió esta pregunta.</div>`
          }
        </div>
      </section>
    `;
  }

  if (scores) {
    scores.innerHTML = renderScoreGrid(players);
  }
}

function renderTriviaResultCard(row) {
  const isCorrect = Boolean(row.correct);
  const points = Number(row.points || 0);
  const labels = row.labels || [];
  const elapsed = row.elapsed_seconds;

  return `
    <div class="trivia-result-card ${isCorrect ? "correct" : "wrong"}">
      <div class="trivia-result-top">
        <div>
          <div class="trivia-result-name">
            ${isCorrect ? "âœ…" : row.answered ? "âŒ" : "â³"} ${escapeHTML(row.player_name || "Jugador")}
          </div>
          <div class="trivia-result-house">
            ${houseIcons[row.house] || "âœ¨"} ${escapeHTML(row.house || "Sin casa")}
          </div>
        </div>

        <div class="trivia-result-points">
          ${points > 0 ? "+" : ""}${points}
        </div>
      </div>

      <div class="trivia-result-meta">
        <span class="trivia-chip">${isCorrect ? "Correcta" : row.answered ? "Incorrecta" : "Sin respuesta"}</span>
        ${elapsed !== null && elapsed !== undefined ? `<span class="trivia-chip">${Number(elapsed).toFixed(2)}s</span>` : ""}
        ${row.streak ? `<span class="trivia-chip">Racha ${row.streak}</span>` : ""}
        ${labels.map((label) => `<span class="trivia-chip">${escapeHTML(label)}</span>`).join("")}
      </div>
    </div>
  `;
}

function renderSnitchResults(state, players) {
  const title = document.getElementById("titulo-resultados");
  const correct = document.getElementById("tv-correcta");
  const explanation = document.getElementById("tv-explicacion");
  const extra = document.getElementById("tv-extra-results");
  const scores = document.getElementById("tv-marcadores");

  if (title) title.innerText = "Resultado de la Snitch:";
  if (correct) correct.innerText = state.correct || "La Snitch fue perseguida";
  if (explanation) explanation.textContent = state.snitch_result?.summary || "";

  if (extra) {
    extra.innerHTML = "";

    if (typeof window.renderSnitchTvResults === "function") {
      window.renderSnitchTvResults(state, extra);
    }
  }

  if (scores) {
    scores.innerHTML = renderScoreGrid(players);
  }
}

function renderGenericResults(state, players) {
  const title = document.getElementById("titulo-resultados");
  const correct = document.getElementById("tv-correcta");
  const explanation = document.getElementById("tv-explicacion");
  const extra = document.getElementById("tv-extra-results");
  const scores = document.getElementById("tv-marcadores");

  if (title) title.innerText = "Resultado de la ronda:";
  if (correct) correct.innerText = state.correct || "Resultados revelados";
  if (explanation) explanation.textContent = state.explanation || state.narrator || "";
  if (extra) extra.innerHTML = "";
  if (scores) scores.innerHTML = renderScoreGrid(players || []);
}

function renderScoreGrid(players = []) {
  if (!players.length) {
    return `<div class="score-card">Sin jugadores todavía</div>`;
  }

  const sorted = [...players].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));

  return sorted.map((player, index) => `
    <div class="score-card" style="border-color:${houseColors[player.house] || "#facc15"};">
      <div class="score-rank">#${index + 1}</div>
      <div class="score-name">${houseIcons[player.house] || "âœ¨"} ${escapeHTML(player.name)}</div>
      <div class="score-points">${Number(player.score || 0)} pts</div>
    </div>
  `).join("");
}

async function acceptRules() {
  if (!currentRoom) return;
  try {
    const res = await fetch(`/api/story-tv/${currentRoom}/accept-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tv_token: getTvToken() }),
    });
    if (!res.ok) console.error("Error aceptando reglas", await res.text());
  } catch (error) {
    console.error("Network error acceptRules", error);
  }
}

async function revelarResultados() {
  if (!currentRoom) return;

  try {
    await fetch(`/api/host/${currentRoom}/reveal`, {
      method: "POST",
    });
  } catch (error) {
    console.error("No se pudieron revelar resultados:", error);
  }
}

async function volverLobby() {
  if (!currentRoom) return;

  try {
    await fetch(`/api/host/${currentRoom}/return_lobby`, {
      method: "POST",
    });
  } catch (error) {
    console.error("No se pudo volver al lobby:", error);
  }
}

async function continueTvFlow() {
  if (!currentRoom) return;

  try {
    const res = await fetch(`/api/tv/${currentRoom}/continue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tv_token: getTvToken()
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("No se pudo continuar:", data);
      return;
    }

    // El polling ya refrescará, pero forzamos un tick rápido
    setTimeout(() => {
      refreshRoomStatus();
    }, 100);

  } catch (error) {
    console.error("Error continuando flujo:", error);
  }
}

function renderInstructionsScene(state) {
  showScreen("view-game");
  const container = document.getElementById("game-container");
  if (!container) return;

  const lines = state.instruction_lines || [];

  container.innerHTML = `
    <section class="scene-card instructions-scene ${state.instruction_visual_theme || "default"}">
      <div class="badge">“– Instrucciones</div>
      <h1>${escapeHTML(state.instruction_title || "Siguiente Prueba")}</h1>
      <p class="scene-subtitle">${escapeHTML(state.instruction_subtitle || "Prepárate para continuar.")}</p>
      <div class="instruction-list">
        ${lines.map((line, index) => `
          <div class="instruction-item">
            <span>${index + 1}</span>
            <p>${escapeHTML(line)}</p>
          </div>
        `).join("")}
      </div>
      <div class="tv-controls-hint large">
        <span class="key-hint">OK</span> ${escapeHTML(state.cta || "Iniciar")}
      </div>
    </section>
  `;
}

function renderScoreboardScene(state) {
  showScreen("view-game");
  const container = document.getElementById("game-container");
  if (!container) return;

  const scores = state.house_scores || [];
  const leader = state.leader;
  const topPlayer = state.top_player;

  container.innerHTML = `
    <section class="scene-card scoreboard-scene">
      <div class="badge">† Copa de las Casas</div>
      <h1>${escapeHTML(state.scoreboard_title || "Marcador general")}</h1>
      <p class="scene-subtitle">${escapeHTML(state.scoreboard_subtitle || "Así va la competencia.")}</p>
      <div class="scoreboard-list">
        ${scores.map((item, index) => `
          <div class="scoreboard-row ${index === 0 ? "leader" : ""}">
            <div class="scoreboard-position">${index + 1}</div>
            <div class="scoreboard-house">
              <span>${escapeHTML(item.icon || "âœ¨")}</span>
              <strong>${escapeHTML(item.label || item.house)}</strong>
            </div>
            <div class="scoreboard-points">${Number(item.score || 0)} pts</div>
          </div>
        `).join("")}
      </div>
      ${leader ? `<div class="leader-banner">Casa líder: ${escapeHTML(leader.icon || "âœ¨")} ${escapeHTML(leader.label || leader.house)}</div>` : ""}
      ${topPlayer ? `<div class="top-player-banner">Jugador destacado: ${escapeHTML(topPlayer.icon || "âœ¨")} ${escapeHTML(topPlayer.name || "")} Â· ${Number(topPlayer.score || 0)} pts</div>` : ""}
      <div class="tv-controls-hint large">
        <span class="key-hint">OK</span> ${escapeHTML(state.cta || "Continuar")}
      </div>
    </section>
  `;
}

function renderTransitionScene(state) {
  showScreen("view-game");
  const container = document.getElementById("game-container");
  if (!container) return;

  container.innerHTML = `
    <section class="scene-card transition-scene">
      <div class="badge">âœ¨ Transición</div>
      <h1>${escapeHTML(state.transition_title || "La historia continúa...")}</h1>
      <p class="scene-subtitle">${escapeHTML(state.transition_subtitle || "")}</p>
      <div class="magic-loader">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="tv-controls-hint large">
        <span class="key-hint">OK</span> ${escapeHTML(state.cta || "Continuar")}
      </div>
    </section>
  `;
}

function renderIntroScene(state) {
  showScreen("view-game");
  const container = document.getElementById("game-container");
  if (!container) return;

  const lines = state.intro_lines || [];

  container.innerHTML = `
    <section class="scene-card intro-scene">
      <div class="badge gold">âœ¨ BIENVENIDA</div>
      <h1>${escapeHTML(state.intro_title || "Â¡Bienvenidos!")}</h1>
      <p class="scene-subtitle">${escapeHTML(state.intro_subtitle || "")}</p>
      <div class="scene-content-list">
        ${lines.map(line => `
          <div class="scene-line-item">
            <p>${escapeHTML(line)}</p>
          </div>
        `).join("")}
      </div>
      <div class="tv-controls-hint large">
        <span class="key-hint">OK</span> ${escapeHTML(state.cta || "Continuar")}
      </div>
    </section>
  `;

  if (lastVoicePhase !== "scene_intro") {
    lastVoicePhase = "scene_intro";
    // Esta escena usa view-game, no view-rules → solo audio genérico de reglas
    // intro_general solo se permite en view-rules (protegido también en voice-lines-tv.js)
    window.VoiceLinesTv?.playVoiceLine?.("rules", { volume: 0.95 });
  }
}

function renderRulesScene(state) {
  showScreen("view-game");
  const container = document.getElementById("game-container");
  if (!container) return;

  const lines = state.rules_lines || [];

  container.innerHTML = `
    <section class="scene-card rules-scene">
      <div class="badge">“– REGLAS DEL CASTILLO</div>
      <h1>${escapeHTML(state.rules_title || "Reglas")}</h1>
      <p class="scene-subtitle">${escapeHTML(state.rules_subtitle || "")}</p>
      <div class="scene-content-list">
        ${lines.map(line => `
          <div class="scene-line-item rule">
            <p>${escapeHTML(line)}</p>
          </div>
        `).join("")}
      </div>
      <div class="tv-controls-hint large">
        <span class="key-hint">OK</span> ${escapeHTML(state.cta || "Entendido")}
      </div>
    </section>
  `;

  if (lastVoicePhase !== "scene_rules") {
    lastVoicePhase = "scene_rules";
    // Esta escena usa view-game, no view-rules → solo audio genérico de reglas
    // intro_general solo se permite en view-rules (protegido también en voice-lines-tv.js)
    window.VoiceLinesTv?.playVoiceLine?.("rules", { volume: 0.95 });
  }
}

document.addEventListener("keydown", (event) => {
  // Caso 1: Carrusel de historias (antes de crear sala)
  if (tvCarouselActive) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (currentStoryIndex > 0) {
        currentStoryIndex--;
        updateCarouselScroll();
      }
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      if (currentStoryIndex < stories.length - 1) {
        currentStoryIndex++;
        updateCarouselScroll();
      }
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const selectedStory = stories[currentStoryIndex];
      if (selectedStory && !roomCreating && !currentRoom) {
        tvCarouselActive = false;
        startMatchFlow(selectedStory.story_id, selectedStory.title);
      }
    }
    return;
  }

  // Caso 2: Flujo de partida (Lobby y Escenas)
  if (event.key === "Enter" || event.key === " ") {
    const phase = window.currentGameState?.phase || (tvLobbyActive ? "lobby" : "");
    
    if (phase === "lobby") {
      event.preventDefault();
      startStoryFromLobby();
      return;
    }

    if (
      phase === "scene_intro" ||
      phase === "scene_rules" ||
      phase === "scene_instructions" ||
      phase === "scene_scoreboard" ||
      phase === "scene_transition" ||
      String(phase || "").startsWith("results_")
    ) {
      event.preventDefault();
      continueTvFlow();
    }
  }
});
