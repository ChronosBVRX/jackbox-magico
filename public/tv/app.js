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
  fácil: "Fácil",
  media: "Media",
  dificil: "Difícil",
  difícil: "Difícil",
  experto: "Experto",
};

const difficultyClass = {
  facil: "easy",
  fácil: "easy",
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
});

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("visible");
  });

  const target = document.getElementById(id);

  if (target) {
    target.classList.add("visible");
  }

  playLottieTransition(id);
}

function playLottieTransition(screenId) {
  const overlay = document.getElementById("lottie-overlay");
  if (!overlay || !window.lottie) return;

  if (!lottieFx) {
    lottieFx = window.lottie.loadAnimation({
      container: overlay,
      renderer: "svg",
      loop: false,
      autoplay: false,
      path: "https://assets2.lottiefiles.com/packages/lf20_jvxwtdtp.json",
    });
  }

  if (screenId === "view-game" || screenId === "view-results") {
    overlay.classList.add("visible");
    lottieFx.goToAndPlay(0, true);
    setTimeout(() => overlay.classList.remove("visible"), 900);
  }
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
  return state.question || state.attack_msg || "¡Responde!";
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
        <div class="name">${houseIcons[house] || "✨"} ${escapeHTML(houseNames[house] || house)}</div>
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

async function startMatchFlow() {
  if (roomCreating || currentRoom) return;

  const btn = document.getElementById("start-match-btn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Iniciando magia...";
  }

  unlockMagicSound();
  playMagicSound("start");

  if (window.VoiceLinesTv && typeof window.VoiceLinesTv.unlock === "function") {
    window.VoiceLinesTv.unlock();
  }

  await startBackgroundMusic();
  await crearSala();

  if (!currentRoom && btn) {
    btn.disabled = false;
    btn.textContent = "Iniciar partida";
  }
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

    iniciarRadar();
  } catch (error) {
    roomCreating = false;
    console.error("No se pudo crear la sala:", error);
  }
}

function iniciarRadar() {
  if (roomSocket) roomSocket.close();
  if (roomSocketRetryTimer) clearTimeout(roomSocketRetryTimer);

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  roomSocket = new WebSocket(`${protocol}://${window.location.host}/api/ws/room/${currentRoom}`);

  roomSocket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data || "{}");
      if (msg.type !== "room_status" || !msg.payload) return;
      renderRoomPayload(msg.payload);
    } catch (error) {
      console.error("Error parseando mensaje WS", error);
    }
  };

  roomSocket.onopen = () => {
    if (radarInterval) clearInterval(radarInterval);
  };

  roomSocket.onclose = () => {
    roomSocket = null;
    startPollingFallback();
    roomSocketRetryTimer = setTimeout(() => {
      if (currentRoom) iniciarRadar();
    }, 1300);
  };

  roomSocket.onerror = () => {
    if (roomSocket) roomSocket.close();
  };
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
    const phase = data.game_state?.phase || "lobby";
    if (phase !== "lobby" && !phase.includes("results_")) {
      renderPlaying(data);
      return;
    }
    if (phase.includes("results_")) {
      renderResults(data);
    }
  }
}

function renderLobby(data) {
  autoRevealLock = false;
  lastPlayKey = "";
  lastResultsKey = "";

  showScreen("view-lobby");

  const hostBox = document.getElementById("host-status");

  if (hostBox) {
    if (data.host && data.host.claimed && data.host.name) {
      hostBox.textContent = `Host de la partida: ${data.host.name}. Él/ella puede iniciar desde su celular.`;
      hostBox.classList.add("claimed");
    } else {
      hostBox.textContent = "El primer celular que entre será el host de la partida.";
      hostBox.classList.remove("claimed");
    }
  }

  const lista = document.getElementById("lista-jugadores");

  if (lista) {
    lista.innerHTML = "";

    (data.players || []).forEach((player) => {
      const item = document.createElement("div");
      item.className = "player-tag";
      item.textContent = `${houseIcons[player.house] || "✨"} ${player.name}`;
      lista.appendChild(item);
    });
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
      renderTrivia(state, players);
    }

    updateTriviaTimer(state);
    updateTriviaPlayers(state, players);
    updateTriviaHouseScores(players);
    return;
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
  const container = document.getElementById("game-container");
  if (!container) return;

  const options = state.options || [];
  const roundNumber = Number(state.round_number || 1);
  const totalQuestions = Number(state.trivia_session?.total_questions || 25);
  const category = state.category || state.question_payload?.categoria || "Mundo mágico";
  const difficulty = state.difficulty || state.question_payload?.dificultad || "media";
  const difficultyLabel = getDifficultyLabel(difficulty);
  const diffClass = getDifficultyClass(difficulty);
  const basePoints = Number(state.points_correct || state.question_payload?.puntosBase || 100);

  container.innerHTML = `
    <section id="trivia-board" class="trivia-board">
      ${renderCandles()}

      <div class="trivia-content">
        <header class="trivia-header">
          <div>
            <div class="trivia-badge-row">
              <div class="trivia-pill">🏰 Trivia del Mundo Mágico</div>
              <div class="trivia-pill category">📜 ${escapeHTML(category)}</div>
              <div class="trivia-pill ${diffClass}">⚡ ${escapeHTML(difficultyLabel)} · +${basePoints}</div>
            </div>

            <h1 class="trivia-title">Pregunta ${roundNumber}</h1>
            <p class="trivia-subtitle">
              Modo principal de Copa de las Casas · Responde desde tu celular · Rápida +40 · Racha de 3 +100
            </p>
          </div>

          <div class="trivia-timer-card">
            <span>Tiempo</span>
            <strong id="trivia-time">10.0</strong>
          </div>
        </header>

        <div class="trivia-main-grid">
          <div class="trivia-question-card">
            <div class="trivia-round-line">
              <span>Ronda ${roundNumber} de ${totalQuestions}</span>
              <span id="trivia-answered-count">0/${players.length || 0} respondieron</span>
            </div>

            <h2 class="trivia-question-text">${escapeHTML(getQuestion(state))}</h2>

            <div class="trivia-options">
              ${options.map((option, index) => `
                <div class="trivia-option" style="animation-delay:${index * 70}ms;">
                  <div class="trivia-option-letter">${answerLetters[index] || "?"}</div>
                  <div class="trivia-option-text">${escapeHTML(option)}</div>
                </div>
              `).join("")}
            </div>

            <div class="trivia-progress">
              <div id="trivia-progress-bar"></div>
            </div>

            <div class="trivia-narrator">
              “${escapeHTML(state.narrator || "El Gran Comedor está esperando sus respuestas.")}”
            </div>
          </div>

          <aside class="trivia-side">
            <div class="trivia-side-card">
              <h3 class="trivia-side-title">Marcador de casas</h3>
              <div id="trivia-house-score" class="trivia-house-score">
                ${renderHouseScoreboard(players)}
              </div>
            </div>

            <div class="trivia-side-card">
              <h3 class="trivia-side-title">Jugadores</h3>
              <div id="trivia-players" class="trivia-players"></div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  `;

  updateTriviaTimer(state);
  updateTriviaPlayers(state, players);
  updateTriviaHouseScores(players);
}

function updateTriviaHouseScores(players) {
  const box = document.getElementById("trivia-house-score");
  if (!box) return;

  box.innerHTML = renderHouseScoreboard(players || []);
}

function updateTriviaPlayers(state, players) {
  const box = document.getElementById("trivia-players");
  const count = document.getElementById("trivia-answered-count");

  if (!box) return;

  const answered = state.answered || {};
  const answeredCount = Object.keys(answered).length;
  const total = (players || []).length;

  if (count) {
    count.textContent = `${answeredCount}/${total} respondieron`;
  }

  box.innerHTML = "";

  (players || []).forEach((player) => {
    const hasAnswered = Boolean(answered[player.name]);
    const item = document.createElement("div");

    item.className = `trivia-player-row ${hasAnswered ? "answered" : ""}`;
    item.innerHTML = `
      <span>${houseIcons[player.house] || "✨"} ${escapeHTML(player.name)}</span>
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
    }, 650);
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
    }, 650);
  }
}

function renderGenericGame(state, players = []) {
  const container = document.getElementById("game-container");

  if (!container) return;

  container.innerHTML = `
    <section class="generic-card">
      <div class="badge">✨ Minijuego activo</div>
      <h2 class="question-title">${escapeHTML(getQuestion(state))}</h2>
      <div class="options-grid" id="tv-opciones"></div>
      <div class="host-help">El host puede revelar resultados desde su celular.</div>
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
  }

  showScreen("view-results");

  if (typeof window.destroySnitchTv === "function") {
    window.destroySnitchTv();
  }

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
          “${escapeHTML(commentary)}”
        </p>

        ${
          fastest
            ? `
              <div class="trivia-fastest-banner">
                ⚡ Respuesta correcta más rápida: ${escapeHTML(fastest.player_name)} · ${Number(fastest.elapsed_seconds || 0).toFixed(2)}s · +40
              </div>
            `
            : `
              <div class="trivia-fastest-banner">
                💨 Nadie acertó lo suficientemente rápido. El pergamino está decepcionado.
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
            ${isCorrect ? "✅" : row.answered ? "❌" : "⏳"} ${escapeHTML(row.player_name || "Jugador")}
          </div>
          <div class="trivia-result-house">
            ${houseIcons[row.house] || "✨"} ${escapeHTML(row.house || "Sin casa")}
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
      <div class="score-name">${houseIcons[player.house] || "✨"} ${escapeHTML(player.name)}</div>
      <div class="score-points">${Number(player.score || 0)} pts</div>
    </div>
  `).join("");
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
