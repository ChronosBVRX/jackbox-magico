let myRoom = "";
let myName = "";
let myHouse = "";

let radarInterval = null;
let currentRoundKey = "";
let currentRoundStartedMs = Date.now();
let hasAnsweredCurrentRound = false;
let lastTickSecond = null;
let gamesLoaded = false;
let clashTapCount = 0;
let selectedPotionIngredients = [];

const spellDescriptions = {
  Expelliarmus: "Vence a Rictusempra",
  Protego: "Bloquea Expelliarmus",
  Stupefy: "Rompe Protego",
  Esquivar: "Evita Stupefy",
  Rictusempra: "Vence a Esquivar",
};

const spellEmoji = {
  Expelliarmus: "🪄",
  Protego: "🛡️",
  Stupefy: "💥",
  Esquivar: "💨",
  Rictusempra: "😂",
};

const answerLetters = ["A", "B", "C", "D"];

const houseIcons = {
  Gryffindor: "🦁",
  Slytherin: "🐍",
  Ravenclaw: "🦅",
  Hufflepuff: "🦡",
};

const urlParams = new URLSearchParams(window.location.search);

if (urlParams.has("room")) {
  const input = document.getElementById("m-room");
  if (input) {
    input.value = urlParams.get("room").toUpperCase();
    input.disabled = true;
  }
}

const savedRoom = localStorage.getItem("jackbox_magico_room");
const savedName = localStorage.getItem("jackbox_magico_name");
const savedHouse = localStorage.getItem("jackbox_magico_house");

if (!urlParams.has("room") && savedRoom) {
  const input = document.getElementById("m-room");
  if (input) input.value = savedRoom;
}

if (savedName) {
  const input = document.getElementById("m-name");
  if (input) input.value = savedName;
}

if (savedHouse) {
  const select = document.getElementById("m-house");
  if (select) select.value = savedHouse;
}

const savedGender = localStorage.getItem("jackbox_magico_gender");
if (savedGender) {
  const genderInput = document.querySelector(`input[name="m-gender"][value="${savedGender}"]`);
  if (genderInput) genderInput.checked = true;
}

function injectTriviaMobileStyles() {
  if (document.getElementById("trivia-mobile-premium-styles")) return;

  const style = document.createElement("style");
  style.id = "trivia-mobile-premium-styles";
  style.textContent = `
    .trivia-mobile-panel {
      display: none;
      width: 100%;
      margin-top: 16px;
    }

    .trivia-mobile-panel.visible {
      display: block;
    }

    .trivia-mobile-card {
      position: relative;
      overflow: hidden;
      padding: 16px;
      border-radius: 24px;
      background:
        radial-gradient(circle at 18% 0%, rgba(255,216,121,.18), transparent 36%),
        radial-gradient(circle at 88% 20%, rgba(96,165,250,.16), transparent 34%),
        rgba(255,255,255,.07);
      border: 1px solid rgba(255,255,255,.13);
      box-shadow:
        0 18px 42px rgba(0,0,0,.28),
        inset 0 0 0 1px rgba(255,255,255,.04);
    }

    .trivia-mobile-card::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px),
        linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px);
      background-size: 38px 38px;
      opacity: .35;
      pointer-events: none;
    }

    .trivia-mobile-content {
      position: relative;
      z-index: 2;
    }

    .trivia-mobile-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }

    .trivia-mobile-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 10px;
      border-radius: 999px;
      color: #ffe7a3;
      font-size: .74rem;
      font-weight: 1000;
      letter-spacing: .08em;
      text-transform: uppercase;
      background: rgba(255,216,121,.12);
      border: 1px solid rgba(255,216,121,.24);
    }

    .trivia-mobile-pill.blue {
      color: #d8ecff;
      background: rgba(96,165,250,.13);
      border-color: rgba(125,211,252,.26);
    }

    .trivia-mobile-question {
      margin: 0 0 14px;
      color: #fff;
      font-size: clamp(1.42rem, 7vw, 2rem);
      line-height: 1.04;
      letter-spacing: -.05em;
      font-weight: 1000;
      text-wrap: balance;
    }

    .trivia-mobile-options {
      display: grid;
      gap: 10px;
    }

    .trivia-answer-btn {
      position: relative;
      overflow: hidden;
      width: 100%;
      min-height: 76px;
      display: grid;
      grid-template-columns: 54px 1fr;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border: 1px solid rgba(255,255,255,.13);
      border-radius: 22px;
      color: white;
      text-align: left;
      background:
        radial-gradient(circle at 20% 0%, rgba(255,216,121,.10), transparent 38%),
        rgba(255,255,255,.08);
      box-shadow: 0 12px 28px rgba(0,0,0,.18);
      transition: transform .12s ease, filter .12s ease, opacity .12s ease;
    }

    .trivia-answer-btn::after {
      content: "";
      position: absolute;
      inset: -80%;
      background: linear-gradient(115deg, transparent 42%, rgba(255,255,255,.16), transparent 58%);
      transform: translateX(-72%);
      animation: triviaMobileShine 2.8s ease-in-out infinite;
      opacity: .78;
      pointer-events: none;
    }

    @keyframes triviaMobileShine {
      0%, 55% { transform: translateX(-72%); }
      100% { transform: translateX(72%); }
    }

    .trivia-answer-btn:active {
      transform: scale(.975);
      filter: brightness(1.12);
    }

    .trivia-answer-btn:disabled {
      opacity: .58;
      filter: grayscale(.15);
    }

    .trivia-answer-letter {
      position: relative;
      z-index: 2;
      width: 46px;
      height: 46px;
      display: grid;
      place-items: center;
      border-radius: 15px;
      color: #2a1700;
      background: linear-gradient(135deg, #fff8d6, #facc15);
      box-shadow:
        0 0 24px rgba(250,204,21,.22),
        inset 0 0 0 1px rgba(255,255,255,.42);
      font-size: 1.25rem;
      font-weight: 1000;
    }

    .trivia-answer-text {
      position: relative;
      z-index: 2;
      color: rgba(255,255,255,.94);
      font-size: 1rem;
      line-height: 1.1;
      font-weight: 900;
    }

    .trivia-mobile-feedback {
      margin-top: 13px;
      min-height: 58px;
      display: grid;
      place-items: center;
      padding: 13px 14px;
      border-radius: 18px;
      text-align: center;
      color: rgba(255,248,221,.90);
      background: rgba(255,255,255,.07);
      border: 1px solid rgba(255,255,255,.12);
      font-weight: 900;
      line-height: 1.18;
    }

    .trivia-mobile-feedback.good {
      color: #bbf7d0;
      background: rgba(34,197,94,.15);
      border-color: rgba(74,222,128,.34);
    }

    .trivia-mobile-feedback.bad {
      color: #fecaca;
      background: rgba(239,68,68,.14);
      border-color: rgba(248,113,113,.30);
    }

    .trivia-mobile-feedback.neutral {
      color: #dbeafe;
      background: rgba(59,130,246,.13);
      border-color: rgba(147,197,253,.28);
    }

    .trivia-mobile-note {
      margin-top: 10px;
      color: rgba(255,248,221,.62);
      font-size: .88rem;
      text-align: center;
      line-height: 1.3;
    }

    .trivia-mobile-host-extra {
      display: grid;
      gap: 10px;
      margin-top: 12px;
    }

    .trivia-next-btn {
      width: 100%;
      border: 0;
      border-radius: 18px;
      padding: 13px 15px;
      color: #271600;
      font-weight: 1000;
      background: linear-gradient(135deg, #fff8d6, #facc15);
      box-shadow: 0 12px 28px rgba(250,204,21,.20);
    }
  `;

  document.head.appendChild(style);
}

injectTriviaMobileStyles();

function safeSound(name) {
  try {
    if (typeof MagicSound !== "undefined" && MagicSound.play) {
      MagicSound.play(name);
    }
  } catch (error) {}
}

function safeUnlockSound() {
  try {
    if (typeof MagicSound !== "undefined" && MagicSound.unlock) {
      MagicSound.unlock();
    }
  } catch (error) {}
}

function vibrate(pattern) {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch (error) {}
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("visible");
  });

  const target = document.getElementById(id);
  if (target) target.classList.add("visible");
}

function getQuestion(state) {
  return state.question || state.attack_msg || "¡Responde!";
}

function getRoundKey(state) {
  return `${state.phase}-${state.round_id || getQuestion(state)}`;
}

function isMeDuelist(state) {
  const duelists = state.duelists || [];
  return duelists.some((player) => player.name === myName);
}

function hideGamePanels() {
  const panels = [
    document.getElementById("duel-mobile-panel"),
    document.getElementById("sombrero-mobile-panel"),
    document.getElementById("pociones-mobile-panel"),
    document.getElementById("snitch-mobile-panel"),
    document.getElementById("trivia-mobile-panel"),
  ];

  panels.forEach((panel) => {
    if (panel) {
      panel.classList.remove("visible");
      panel.innerHTML = "";
    }
  });
}


function ensureTriviaPanel() {
  let panel = document.getElementById("trivia-mobile-panel");

  if (!panel) {
    panel = document.createElement("div");
    panel.id = "trivia-mobile-panel";
    panel.className = "trivia-mobile-panel";

    const snitchPanel = document.getElementById("snitch-mobile-panel");
    const hostGamePanel = document.getElementById("host-game-panel");
    const card = document.querySelector("#view-game .card");

    if (snitchPanel && snitchPanel.parentElement) {
      snitchPanel.parentElement.insertBefore(panel, snitchPanel);
    } else if (hostGamePanel && hostGamePanel.parentElement) {
      hostGamePanel.parentElement.insertBefore(panel, hostGamePanel);
    } else if (card) {
      card.appendChild(panel);
    }
  }

  return panel;
}


async function joinRoom(auto = false) {
  safeUnlockSound();
  safeSound("click");

  const btn = document.getElementById("btn-unirse");

  myRoom = document.getElementById("m-room").value.trim().toUpperCase();
  myName = document.getElementById("m-name").value.trim();
  myHouse = document.getElementById("m-house").value;
  
  const genderInput = document.querySelector('input[name="m-gender"]:checked');
  const myGender = genderInput ? genderInput.value : "wizard";
  
  myHostToken = localStorage.getItem(`jackbox_magico_host_token_${myRoom}`) || "";

  if (!myRoom || !myName) {
    if (!auto) {
      alert("No seas muggle, llena todos los campos.");
    }
    return;
  }

  localStorage.setItem("jackbox_magico_room", myRoom);
  localStorage.setItem("jackbox_magico_name", myName);
  localStorage.setItem("jackbox_magico_house", myHouse);
  localStorage.setItem("jackbox_magico_gender", myGender);

  if (btn) {
    btn.innerText = auto ? "Reconectando..." : "Conectando...";
    btn.disabled = true;
  }

  try {
    const res = await fetch("/api/player/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        room_code: myRoom,
        player_name: myName,
        house: myHouse,
        gender: myGender,
        host_token: myHostToken || null,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      showScreen("view-wait");

      document.getElementById("wait-msg").innerText = data.reconnected
        ? "¡Reconectado!"
        : "¡Estás dentro!";

      document.getElementById("wait-subtitle").innerText = "Espera a que la TV inicie la partida.";
      iniciarRadarMovil();
      safeSound("start");
    } else {
      if (!auto) {
        alert("Error: " + JSON.stringify(data.detail || data));
      }

      if (btn) {
        btn.innerText = "Entrar a la Sala";
        btn.disabled = false;
      }
    }
  } catch (error) {
    if (!auto) {
      console.error("Connection Error:", error);
      alert("Error de conexión al castillo. Detalles: " + error.message);
    }

    if (btn) {
      btn.innerText = "Entrar a la Sala";
      btn.disabled = false;
    }
  }
}

const joinBtn = document.getElementById("btn-unirse");
if (joinBtn) {
  joinBtn.addEventListener("click", () => {
    joinRoom(false);
  });
}

async function maybeAutoReconnect() {
  const roomInput = document.getElementById("m-room").value.trim().toUpperCase();
  const nameInput = document.getElementById("m-name").value.trim();

  if (roomInput && nameInput && savedName) {
    setTimeout(() => {
      joinRoom(true);
    }, 450);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  maybeAutoReconnect();
});

function iniciarRadarMovil() {
  if (radarInterval) {
    clearInterval(radarInterval);
  }

  radarInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/room/${myRoom}/status?ts=${Date.now()}`, {
        cache: "no-store",
      });

      if (!res.ok) return;

      const data = await res.json();
      const state = data.game_state || {};
      const phase = state.phase || "lobby";

      if (myIsHost) {
        await loadGamesForHost();
      }

      if (data.status === "lobby") {
        renderLobbyWait(data);
        return;
      }

      if (data.status === "playing" && phase !== "lobby" && !phase.includes("results_")) {
        if (phase === "rules") {
          renderRulesMobile(state);
          return;
        }

        if (phase === "trivia") {
          renderTriviaMobile(state);
          updateMobileTriviaTimer(state);
          return;
        }

        if (phase === "atrapa_snitch") {
          if (typeof window.renderSnitchMobile === "function") {
            window.renderSnitchMobile(state);
          } else {
            renderMobileGame(state);
          }

          return;
        }

        if (phase === "clase_pociones") {
          renderPocionesMobile(state);
          updateMobilePocionesTimer(state);
          return;
        }

        if (phase === "sombrero" || phase === "sombrero_tiebreak") {
          renderSombreroMobile(state);
          return;
        }

        if (phase === "duelo") {
          renderDuelMobile(state);
          updateMobileDuelTimer(state);
          return;
        }

        if (phase === "duelo_clash") {
          renderDuelClashMobile(state);
          updateMobileDuelClashTimer(state);
          return;
        }

        const answered = state.answered || {};
        const iAlreadyAnswered = Boolean(answered[myName]);

        if (iAlreadyAnswered || hasAnsweredCurrentRound) {
          renderAnsweredWait(state);
        } else {
          renderMobileGame(state);
        }
      }

      if (data.status === "playing" && phase.includes("results_")) {
        renderResultsWait(state);
      }

      if (state.phase === "artes_ridiculas") {
        updateMobileTimer(state);
      }

      if (state.phase === "duelo") {
        updateMobileDuelTimer(state);
      }

      if (state.phase === "duelo_clash") {
        updateMobileDuelClashTimer(state);
      }

      if (state.phase === "clase_pociones") {
        updateMobilePocionesTimer(state);
      }

      if (state.phase === "trivia") {
        updateMobileTriviaTimer(state);
      }

      if (state.phase === "atrapa_snitch" && typeof window.updateMobileSnitchTimer === "function") {
        window.updateMobileSnitchTimer(state);
      }
    } catch (error) {
      console.error("Buscando conexión...");
    }
  }, 650);
}

function renderLobbyWait(data) {
  currentRoundKey = "";
  hasAnsweredCurrentRound = false;
  lastTickSecond = null;
  clashTapCount = 0;
  selectedPotionIngredients = [];

  const buttons = document.getElementById("m-botones");
  if (buttons) buttons.innerHTML = "";

  hideGamePanels();

  showScreen("view-wait");

  document.getElementById("wait-pill").innerText = "🕯️ Aspirante";
  document.getElementById("wait-msg").innerText = "¡Sala preparada!";
  document.getElementById("wait-subtitle").innerText = "Tu destino se revelará en la Gran Pantalla.";

  const feedback = document.getElementById("points-feedback");
  if (feedback) {
    feedback.className = "points-feedback";
    feedback.innerText = "";
  }
}

function renderAnsweredWait(state) {
  showScreen("view-wait");

  document.getElementById("wait-pill").innerText = "🕯️ Aspirante";
  document.getElementById("wait-msg").innerText = "¡Hechizo enviado!";
  document.getElementById("wait-subtitle").innerText = "Mira la TV para ver los resultados.";
}

function renderResultsWait(state = {}) {
  currentRoundKey = "";
  hasAnsweredCurrentRound = false;
  lastTickSecond = null;
  clashTapCount = 0;
  selectedPotionIngredients = [];

  hideGamePanels();

  showScreen("view-wait");

  document.getElementById("wait-pill").innerText = "🏆 Resultados";
  document.getElementById("wait-msg").innerText = "¡Mira la TV!";
  document.getElementById("wait-subtitle").innerText = "La ronda terminó. Revisa la TV.";
}

function renderTriviaMobile(state) {
  showScreen("view-game");

  hideGamePanels();

  const buttons = document.getElementById("m-botones");
  if (buttons) buttons.innerHTML = "";

  const answered = state.answered || {};
  const alreadyAnswered = Boolean(answered[myName]);

  if (alreadyAnswered || hasAnsweredCurrentRound) {
    renderAnsweredWait(state);
    return;
  }

  const key = getRoundKey(state);

  if (key !== currentRoundKey) {
    currentRoundKey = key;
    currentRoundStartedMs = state.started_at ? Number(state.started_at) * 1000 : Date.now();
    hasAnsweredCurrentRound = false;
    lastTickSecond = null;
    safeSound("start");
    vibrate([25, 40, 25]);
  }

  document.getElementById("game-pill").innerText = "🏰 Trivia";
  document.getElementById("m-pregunta-aviso").innerText = "Trivia del Mundo Mágico";
  document.getElementById("m-question-small").innerText =
    "Elige A, B, C o D. La velocidad también cuenta.";
  document.getElementById("mobile-timer").style.display = "block";
  document.getElementById("mobile-status").innerText =
    "Respuesta correcta por dificultad · rápida +40 · racha de 3 +100";

  const panel = ensureTriviaPanel();
  panel.classList.add("visible");

  const options = state.options || [];
  const category = state.category || state.question_payload?.categoria || "Mundo mágico";
  const difficulty = state.difficulty || state.question_payload?.dificultad || "media";
  const basePoints = Number(state.points_correct || state.question_payload?.puntosBase || 100);

  panel.innerHTML = `
    <div class="trivia-mobile-card">
      <div class="trivia-mobile-content">
        <div class="trivia-mobile-pills">
          <span class="trivia-mobile-pill blue">📜 ${escapeHTML(category)}</span>
          <span class="trivia-mobile-pill">⚡ ${escapeHTML(difficulty)} · +${basePoints}</span>
        </div>

        <h2 class="trivia-mobile-question">${escapeHTML(getQuestion(state))}</h2>

        <div class="trivia-mobile-options">
          ${options.map((option, index) => `
            <button class="trivia-answer-btn" onclick="enviarRespuesta('${escapeAttribute(option)}', this)">
              <span class="trivia-answer-letter">${answerLetters[index] || "?"}</span>
              <span class="trivia-answer-text">${escapeHTML(option)}</span>
            </button>
          `).join("")}
        </div>

        <div id="trivia-mobile-feedback" class="trivia-mobile-feedback neutral">
          Esperando tu respuesta...
        </div>

        <div class="trivia-mobile-note">
          Mira la TV para el temporizador. Contesta rápido, pero no a lo loco.
        </div>
      </div>
    </div>
  `;

  updateMobileTriviaTimer(state);
}

function updateMobileTriviaTimer(state) {
  const timer = document.getElementById("mobile-timer");
  const bar = document.getElementById("mobile-timer-bar");

  if (!bar || state.phase !== "trivia") return;

  timer.style.display = "block";

  const duration = Number(state.duration_seconds || 10);
  const started = state.started_at ? Number(state.started_at) * 1000 : currentRoundStartedMs;
  const elapsed = Math.max(0, Date.now() - started) / 1000;
  const left = Math.max(0, duration - elapsed);
  const pct = Math.max(0, Math.min(1, left / duration));

  bar.style.transform = `scaleX(${pct})`;

  const status = document.getElementById("mobile-status");
  if (status && !hasAnsweredCurrentRound) {
    status.innerText = `Tiempo restante: ${left.toFixed(1)}s`;
  }

  const rounded = Math.ceil(left);

  if (rounded <= 3 && rounded > 0 && rounded !== lastTickSecond) {
    lastTickSecond = rounded;
    safeSound("timer-danger");
    vibrate(35);
  }
}

function getMobilePocionesInfo(state) {
  const memorize = Number(state.memorize_seconds || 7);
  const mix = Number(state.mix_seconds || 15);
  const startedAt = Number(state.started_at || Date.now() / 1000);
  const elapsed = Math.max(0, Date.now() / 1000 - startedAt);

  if (elapsed < memorize) {
    return {
      mode: "memorize",
      left: Math.max(0, memorize - elapsed),
      total: memorize,
    };
  }

  return {
    mode: "mix",
    left: Math.max(0, memorize + mix - elapsed),
    total: mix,
  };
}

function getIngredientEmojiMobile(state, name) {
  const map = state.ingredient_map || {};
  return map[name]?.emoji || "🧪";
}

function renderPocionesMobile(state) {
  showScreen("view-game");

  const buttons = document.getElementById("m-botones");
  if (buttons) buttons.innerHTML = "";

  const duelPanel = document.getElementById("duel-mobile-panel");
  const sombreroPanel = document.getElementById("sombrero-mobile-panel");
  const panel = document.getElementById("pociones-mobile-panel");
  const snitchPanel = document.getElementById("snitch-mobile-panel");
  const triviaPanel = document.getElementById("trivia-mobile-panel");

  [duelPanel, sombreroPanel, snitchPanel, triviaPanel].forEach((p) => {
    if (p) {
      p.classList.remove("visible");
      p.innerHTML = "";
    }
  });

  const answers = state.answers || {};
  const alreadySubmitted = Boolean(answers[myName]);

  if (alreadySubmitted || hasAnsweredCurrentRound) {
    renderAnsweredWait(state);
    return;
  }

  const newKey = getRoundKey(state);

  if (newKey !== currentRoundKey) {
    currentRoundKey = newKey;
    currentRoundStartedMs = state.started_at ? Number(state.started_at) * 1000 : Date.now();
    selectedPotionIngredients = [];
    hasAnsweredCurrentRound = false;
    lastTickSecond = null;
    safeSound("start");
  }

  const info = getMobilePocionesInfo(state);

  document.getElementById("game-pill").innerText = "🧪 Pociones";
  document.getElementById("m-pregunta-aviso").innerText =
    info.mode === "memorize" ? "¡Memoriza la receta!" : "¡Mezcla en orden!";
  document.getElementById("m-question-small").innerText =
    info.mode === "memorize"
      ? "Mira la pantalla principal. La receta desaparecerá en unos segundos."
      : `Prepara: ${state.potion_name || "Poción misteriosa"}`;
  document.getElementById("mobile-timer").style.display = "block";
  document.getElementById("mobile-status").innerText =
    info.mode === "memorize"
      ? "Todavía no mezcles. Memoriza primero."
      : "Toca los ingredientes en el orden correcto.";

  panel.classList.add("visible");

  if (info.mode === "memorize") {
    panel.innerHTML = `
      <div class="pociones-selected">
        🧠 Memoriza la receta en la TV.<br>
        Cuando desaparezca, aquí aparecerán los ingredientes.
      </div>
    `;

    updateMobilePocionesTimer(state);
    return;
  }

  panel.innerHTML = `
    <div class="pociones-selected" id="pociones-selected">
      Seleccionados: ninguno
    </div>

    <div class="pociones-ingredient-grid" id="pociones-ingredient-grid"></div>

    <button class="pociones-submit-btn" onclick="submitPotionRecipe()">
      Entregar poción
    </button>

    <button class="pociones-clear-btn" onclick="clearPotionRecipe()">
      Reiniciar mezcla
    </button>
  `;

  const grid = document.getElementById("pociones-ingredient-grid");
  const ingredients = state.shuffled_ingredients || [];

  ingredients.forEach((ingredient) => {
    const button = document.createElement("button");
    button.className = "pociones-ingredient-btn";
    button.textContent = `${getIngredientEmojiMobile(state, ingredient)} ${ingredient}`;
    button.addEventListener("click", () => selectPotionIngredient(ingredient, button));
    grid.appendChild(button);
  });

  updateSelectedPotionText();
  updateMobilePocionesTimer(state);
}

function selectPotionIngredient(ingredient, button) {
  selectedPotionIngredients.push(ingredient);
  button.classList.add("used");
  safeSound("click");
  updateSelectedPotionText();
}

function updateSelectedPotionText() {
  const box = document.getElementById("pociones-selected");
  if (!box) return;

  if (!selectedPotionIngredients.length) {
    box.textContent = "Seleccionados: ninguno";
    return;
  }

  box.textContent = `Seleccionados: ${selectedPotionIngredients.join(" → ")}`;
}

function clearPotionRecipe() {
  selectedPotionIngredients = [];

  document.querySelectorAll(".pociones-ingredient-btn").forEach((btn) => {
    btn.classList.remove("used");
  });

  updateSelectedPotionText();
  safeSound("click");
}

async function submitPotionRecipe() {
  if (hasAnsweredCurrentRound) return;

  hasAnsweredCurrentRound = true;

  const elapsed = Math.max(0, Date.now() - currentRoundStartedMs);

  document.querySelectorAll(".pociones-ingredient-btn, .pociones-submit-btn, .pociones-clear-btn").forEach((btn) => {
    btn.disabled = true;
  });

  document.getElementById("mobile-status").innerText = "Entregando poción...";
  safeSound("send");

  try {
    const res = await fetch("/api/player/submit_answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        room_code: myRoom,
        player_name: myName,
        answer: JSON.stringify(selectedPotionIngredients),
        client_elapsed_ms: elapsed,
      }),
    });

    const data = await res.json();

    showScreen("view-wait");

    document.getElementById("wait-msg").innerText = data.exploded
      ? "💥 Tu caldero explotó"
      : data.perfect
        ? "🧪 ¡Poción perfecta!"
        : "🧪 Poción entregada";

    document.getElementById("wait-subtitle").innerText = "Mira la TV para seguir la ronda.";

    const feedback = document.getElementById("points-feedback");
    feedback.className = `points-feedback ${data.exploded ? "bad" : data.perfect ? "good" : "neutral"}`;
    feedback.innerText =
      `${data.points > 0 ? "+" : ""}${data.points || 0} pts · ${data.message || "Poción entregada."}`;

    safeSound(data.exploded ? "wrong" : "correct");
  } catch (error) {
    showScreen("view-wait");

    document.getElementById("wait-msg").innerText = "No se pudo entregar.";
    document.getElementById("wait-subtitle").innerText =
      "Revisa la conexión e intenta en la siguiente ronda.";

    const feedback = document.getElementById("points-feedback");
    feedback.className = "points-feedback bad";
    feedback.innerText = "Error de conexión.";

    safeSound("wrong");
  }
}

function updateMobilePocionesTimer(state) {
  const timer = document.getElementById("mobile-timer");
  const bar = document.getElementById("mobile-timer-bar");

  if (!bar || state.phase !== "clase_pociones") return;

  timer.style.display = "block";

  const info = getMobilePocionesInfo(state);
  const pct = info.total > 0 ? Math.max(0, Math.min(1, info.left / info.total)) : 0;

  bar.style.transform = `scaleX(${pct})`;

  const rounded = Math.ceil(info.left);

  if (rounded <= 3 && rounded > 0 && rounded !== lastTickSecond) {
    lastTickSecond = rounded;
    safeSound("timer-danger");
  }
}

function renderSombreroMobile(state) {
  showScreen("view-game");

  const buttons = document.getElementById("m-botones");
  if (buttons) buttons.innerHTML = "";

  const duelPanel = document.getElementById("duel-mobile-panel");
  const pocionesPanel = document.getElementById("pociones-mobile-panel");
  const snitchPanel = document.getElementById("snitch-mobile-panel");
  const triviaPanel = document.getElementById("trivia-mobile-panel");

  [duelPanel, pocionesPanel, snitchPanel, triviaPanel].forEach((panel) => {
    if (panel) {
      panel.classList.remove("visible");
      panel.innerHTML = "";
    }
  });

  const panel = document.getElementById("sombrero-mobile-panel");
  panel.innerHTML = "";
  panel.classList.add("visible");

  const votedPlayers = state.voted_players || [];
  const alreadyVoted = votedPlayers.includes(myName);

  if (alreadyVoted || hasAnsweredCurrentRound) {
    renderAnsweredWait(state);
    return;
  }

  const newKey = getRoundKey(state);

  if (newKey !== currentRoundKey) {
    currentRoundKey = newKey;
    hasAnsweredCurrentRound = false;
    safeSound("start");
  }

  document.getElementById("game-pill").innerText =
    state.phase === "sombrero_tiebreak" ? "⚡ Desempate" : "🎩 Sombrero";

  document.getElementById("m-pregunta-aviso").innerText =
    state.phase === "sombrero_tiebreak" ? "¡Vota el desempate!" : "¡Vota con honestidad dudosa!";

  document.getElementById("m-question-small").innerText = state.question || "Elige a alguien.";
  document.getElementById("mobile-timer").style.display = "none";
  document.getElementById("mobile-status").innerText = "No puedes votar por ti mismo.";

  panel.innerHTML = `
    <div class="sombrero-vote-grid" id="sombrero-vote-grid"></div>
  `;

  const grid = document.getElementById("sombrero-vote-grid");
  const options = state.options || [];

  options
    .filter((name) => name !== myName)
    .forEach((name) => {
      const button = document.createElement("button");
      button.className = "sombrero-vote-btn";
      button.textContent = `🎩 ${name}`;
      button.addEventListener("click", () => enviarRespuesta(name, button));
      grid.appendChild(button);
    });

  if (!grid.children.length) {
    document.getElementById("mobile-status").innerText =
      "No hay opciones disponibles para votar.";
  }
}

function renderDuelMobile(state) {
  showScreen("view-game");

  const buttons = document.getElementById("m-botones");
  if (buttons) buttons.innerHTML = "";

  const sombreroPanel = document.getElementById("sombrero-mobile-panel");
  const pocionesPanel = document.getElementById("pociones-mobile-panel");
  const snitchPanel = document.getElementById("snitch-mobile-panel");
  const triviaPanel = document.getElementById("trivia-mobile-panel");

  [sombreroPanel, pocionesPanel, snitchPanel, triviaPanel].forEach((panel) => {
    if (panel) {
      panel.classList.remove("visible");
      panel.innerHTML = "";
    }
  });

  const duelPanel = document.getElementById("duel-mobile-panel");
  duelPanel.innerHTML = "";
  duelPanel.classList.remove("visible");

  const answers = state.answers || {};
  const iAmDuelist = isMeDuelist(state);
  const iAlreadyAnswered = Boolean(answers[myName]);

  if (!iAmDuelist) {
    showScreen("view-wait");
    document.getElementById("wait-pill").innerText = "⚔️ Duelo";
    document.getElementById("wait-msg").innerText = "Estás viendo el duelo";
    document.getElementById("wait-subtitle").innerText = "No fuiste seleccionado en esta ronda. Mira la TV.";
    return;
  }

  if (iAlreadyAnswered || hasAnsweredCurrentRound) {
    renderAnsweredWait(state);
    return;
  }

  const newKey = getRoundKey(state);

  if (newKey !== currentRoundKey) {
    currentRoundKey = newKey;
    hasAnsweredCurrentRound = false;
    lastTickSecond = null;
    currentRoundStartedMs = state.started_at ? Number(state.started_at) * 1000 : Date.now();
    safeSound("start");
  }

  document.getElementById("game-pill").innerText = "⚔️ Duelo";
  document.getElementById("m-pregunta-aviso").innerText = "¡Elige tu hechizo!";
  document.getElementById("m-question-small").innerText = "Tienes 5 segundos. Varitas arriba.";
  document.getElementById("mobile-timer").style.display = "block";
  document.getElementById("mobile-status").innerText = "Elige bien. Aquí sí hay consecuencias mágicas.";

  duelPanel.classList.add("visible");

  duelPanel.innerHTML = `
    <div class="duel-spell-grid" id="duel-spell-grid"></div>
  `;

  const grid = document.getElementById("duel-spell-grid");

  (state.options || []).forEach((spell) => {
    const button = document.createElement("button");
    button.className = "duel-spell-btn";
    button.innerHTML = `${spellEmoji[spell] || "✨"} ${spell}<small>${spellDescriptions[spell] || ""}</small>`;
    button.addEventListener("click", () => enviarRespuesta(spell, button));
    grid.appendChild(button);
  });

  updateMobileDuelTimer(state);
}

function renderDuelClashMobile(state) {
  showScreen("view-game");

  const buttons = document.getElementById("m-botones");
  if (buttons) buttons.innerHTML = "";

  const sombreroPanel = document.getElementById("sombrero-mobile-panel");
  const pocionesPanel = document.getElementById("pociones-mobile-panel");
  const snitchPanel = document.getElementById("snitch-mobile-panel");
  const triviaPanel = document.getElementById("trivia-mobile-panel");

  [sombreroPanel, pocionesPanel, snitchPanel, triviaPanel].forEach((panel) => {
    if (panel) {
      panel.classList.remove("visible");
      panel.innerHTML = "";
    }
  });

  const duelPanel = document.getElementById("duel-mobile-panel");
  duelPanel.innerHTML = "";

  const iAmDuelist = isMeDuelist(state);

  if (!iAmDuelist) {
    showScreen("view-wait");
    document.getElementById("wait-pill").innerText = "⚡ Choque";
    document.getElementById("wait-msg").innerText = "¡Choque de Varitas!";
    document.getElementById("wait-subtitle").innerText = "Los duelistas están presionando como si debieran renta.";
    return;
  }

  const newKey = getRoundKey(state) + "-clash";

  if (newKey !== currentRoundKey) {
    currentRoundKey = newKey;
    hasAnsweredCurrentRound = false;
    lastTickSecond = null;
    clashTapCount = 0;

    const clash = state.clash || {};
    currentRoundStartedMs = clash.started_at ? Number(clash.started_at) * 1000 : Date.now();

    safeSound("start");
  }

  document.getElementById("game-pill").innerText = "⚡ Choque";
  document.getElementById("m-pregunta-aviso").innerText = "¡Choque de Varitas!";
  document.getElementById("m-question-small").innerText = "Presiona lo más rápido que puedas durante 5 segundos.";
  document.getElementById("mobile-timer").style.display = "block";
  document.getElementById("mobile-status").innerText = "¡Toca sin piedad mágica!";

  duelPanel.classList.add("visible");

  const clash = state.clash || {};
  const taps = clash.taps || {};

  clashTapCount = taps[myName] || clashTapCount || 0;

  duelPanel.innerHTML = `
    <button class="duel-clash-btn" onclick="sendDuelClashTap()">
      ⚡ PRESIONA
    </button>
    <div class="duel-tap-count" id="duel-tap-count">${clashTapCount}</div>
  `;

  updateMobileDuelClashTimer(state);
}

function updateMobileDuelTimer(state) {
  const timer = document.getElementById("mobile-timer");
  const bar = document.getElementById("mobile-timer-bar");

  if (!bar || state.phase !== "duelo") return;

  timer.style.display = "block";

  const duration = Number(state.duration_seconds || 5);
  const started = state.started_at ? Number(state.started_at) * 1000 : currentRoundStartedMs;
  const elapsed = Math.max(0, Date.now() - started) / 1000;
  const left = Math.max(0, duration - elapsed);
  const pct = Math.max(0, Math.min(1, left / duration));

  bar.style.transform = `scaleX(${pct})`;

  const rounded = Math.ceil(left);

  if (rounded <= 3 && rounded > 0 && rounded !== lastTickSecond) {
    lastTickSecond = rounded;
    safeSound("timer-danger");
  }
}

function updateMobileDuelClashTimer(state) {
  const timer = document.getElementById("mobile-timer");
  const bar = document.getElementById("mobile-timer-bar");

  if (!bar || state.phase !== "duelo_clash") return;

  timer.style.display = "block";

  const clash = state.clash || {};
  const duration = Number(clash.duration_seconds || 5);
  const started = clash.started_at ? Number(clash.started_at) * 1000 : currentRoundStartedMs;
  const elapsed = Math.max(0, Date.now() - started) / 1000;
  const left = Math.max(0, duration - elapsed);
  const pct = Math.max(0, Math.min(1, left / duration));

  bar.style.transform = `scaleX(${pct})`;

  const rounded = Math.ceil(left);

  if (rounded <= 3 && rounded > 0 && rounded !== lastTickSecond) {
    lastTickSecond = rounded;
    safeSound("timer-danger");
  }
}

async function sendDuelClashTap() {
  clashTapCount += 1;

  const count = document.getElementById("duel-tap-count");
  if (count) {
    count.innerText = clashTapCount;
  }

  safeSound("click");
  vibrate(15);

  try {
    const res = await fetch("/api/player/duel_clash_tap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        room_code: myRoom,
        player_name: myName,
      }),
    });

    const data = await res.json();

    if (data.taps !== undefined) {
      clashTapCount = data.taps;
      if (count) count.innerText = clashTapCount;
    }
  } catch (error) {
    console.error("No se pudo enviar tap");
  }
}

function renderMobileGame(state) {
  hideGamePanels();

  const key = getRoundKey(state);

  if (key !== currentRoundKey) {
    currentRoundKey = key;
    hasAnsweredCurrentRound = false;
    lastTickSecond = null;
    currentRoundStartedMs = state.started_at ? Number(state.started_at) * 1000 : Date.now();
    safeSound("start");
  }

  showScreen("view-game");
  showHostPanels(myIsHost);

  document.getElementById("game-pill").innerText = "✨ Minijuego";
  document.getElementById("m-pregunta-aviso").innerText = "¡Responde rápido!";
  document.getElementById("m-question-small").innerText = getQuestion(state);
  document.getElementById("mobile-timer").style.display = state.duration_seconds ? "block" : "none";
  document.getElementById("mobile-status").innerText = "Elige una opción.";

  const grid = document.getElementById("m-botones");
  grid.innerHTML = "";

  (state.options || []).forEach((option) => {
    const button = document.createElement("button");
    button.textContent = option;
    button.addEventListener("click", () => enviarRespuesta(option, button));
    grid.appendChild(button);
  });

  updateMobileTimer(state);
}

function updateMobileTimer(state) {
  const timer = document.getElementById("mobile-timer");
  const bar = document.getElementById("mobile-timer-bar");

  if (!bar) return;

  const duration = Number(state.duration_seconds || 0);
  const started = state.started_at ? Number(state.started_at) * 1000 : currentRoundStartedMs;

  if (!duration) {
    timer.style.display = "none";
    return;
  }

  timer.style.display = "block";

  const elapsed = Math.max(0, Date.now() - started) / 1000;
  const left = Math.max(0, duration - elapsed);
  const pct = Math.max(0, Math.min(1, left / duration));

  bar.style.transform = `scaleX(${pct})`;

  const rounded = Math.ceil(left);

  if (rounded <= 3 && rounded > 0 && rounded !== lastTickSecond) {
    lastTickSecond = rounded;
    safeSound("timer-danger");
  }
}

async function enviarRespuesta(answer, button = null) {
  if (hasAnsweredCurrentRound) return;

  hasAnsweredCurrentRound = true;

  const elapsed = Math.max(0, Date.now() - currentRoundStartedMs);

  if (button) {
    button.disabled = true;
    button.classList.add("selected");

    try {
      button.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(.96)" },
          { transform: "scale(1.03)" },
          { transform: "scale(1)" },
        ],
        {
          duration: 230,
          easing: "ease-out",
        }
      );
    } catch (error) {}
  }

  document.querySelectorAll("#m-botones button, .duel-spell-btn, .sombrero-vote-btn, .trivia-answer-btn").forEach((btn) => {
    if (btn !== button) {
      btn.disabled = true;
      btn.style.opacity = ".56";
    }
  });

  const status = document.getElementById("mobile-status");
  if (status) status.innerText = "Enviando respuesta...";

  const feedback = document.getElementById("trivia-mobile-feedback");
  if (feedback) {
    feedback.className = "trivia-mobile-feedback neutral";
    feedback.textContent = "Enviando respuesta al Gran Comedor...";
  }

  safeSound("send");
  vibrate(25);

  try {
    const res = await fetch("/api/player/submit_answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        room_code: myRoom,
        player_name: myName,
        answer,
        client_elapsed_ms: elapsed,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.accepted === false) {
      hasAnsweredCurrentRound = false;

      if (feedback) {
        feedback.className = "trivia-mobile-feedback bad";
        feedback.textContent = data.message || data.detail || "No se aceptó la respuesta.";
      }

      if (status) status.innerText = data.message || "No se aceptó la respuesta.";

      safeSound("wrong");
      vibrate([70, 50, 70]);
      return;
    }

    if (feedback) {
      feedback.className = `trivia-mobile-feedback ${data.correct ? "good" : "bad"}`;
      feedback.innerHTML = `
        ${data.correct ? "✅" : "❌"} ${data.message || "Respuesta enviada."}<br>
        <small>${data.points > 0 ? "+" : ""}${data.points || 0} pts${data.elapsed_seconds ? ` · ${Number(data.elapsed_seconds).toFixed(2)}s` : ""}</small>
      `;
    }

    showScreen("view-wait");

    document.getElementById("wait-pill").innerText = "📨 Enviada";
    document.getElementById("wait-msg").innerText = data.correct ? "✅ ¡Respuesta enviada!" : "📨 Respuesta enviada";
    document.getElementById("wait-subtitle").innerText = "Mira la TV para ver el resultado.";

    const points = document.getElementById("points-feedback");
    if (points) {
      points.className = `points-feedback ${data.correct ? "good" : "bad"}`;
      points.innerText =
        `${data.points > 0 ? "+" : ""}${data.points || 0} pts · ${data.message || "Respuesta registrada."}`;
    }

    safeSound(data.correct ? "correct" : "wrong");
    vibrate(data.correct ? [35, 40, 35] : [80, 50, 80]);
  } catch (error) {
    hasAnsweredCurrentRound = false;

    if (feedback) {
      feedback.className = "trivia-mobile-feedback bad";
      feedback.textContent = "Error de conexión al enviar respuesta.";
    }

    if (status) status.innerText = "Error de conexión.";

    safeSound("wrong");
    vibrate([80, 50, 80]);
  }
}


function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
    .replaceAll("\n", " ")
    .replaceAll("\r", " ");
}