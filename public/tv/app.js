let bgMusicStarted = false;
let currentRoom = "";
let radarInterval = null;
let lastPlayKey = "";
let lastTickSecond = null;
let autoRevealLock = false;

const houseIcons = {
  Gryffindor: "🦁",
  Slytherin: "🐍",
  Ravenclaw: "🦅",
  Hufflepuff: "🦡",
};

const houseColors = {
  Gryffindor: "#c0392b",
  Slytherin: "#27ae60",
  Ravenclaw: "#2980b9",
  Hufflepuff: "#f1c40f",
};

function getBgMusic() {
  const audio = document.getElementById("tv-bg-music");

  if (!audio) return null;

  audio.volume = 0.35;
  audio.loop = true;

  return audio;
}

function updateMusicButton(isPlaying, text = null) {
  const btn = document.getElementById("music-toggle");

  if (!btn) return;

  if (isPlaying) {
    btn.innerText = text || "🔊 Música";
    btn.classList.add("playing");
  } else {
    btn.innerText = text || "▶️ Activar música";
    btn.classList.remove("playing");
  }
}

async function startBackgroundMusic() {
  const audio = getBgMusic();

  if (!audio) {
    updateMusicButton(false, "⚠️ Sin audio");
    return;
  }

  try {
    audio.muted = false;
    audio.volume = 0.35;

    await audio.play();

    bgMusicStarted = true;
    updateMusicButton(true, "🔊 Música");
  } catch (error) {
    bgMusicStarted = false;
    updateMusicButton(false, "▶️ Activar música");
    console.warn("No se pudo reproducir la música:", error);
  }
}

function pauseBackgroundMusic() {
  const audio = getBgMusic();

  if (!audio) return;

  audio.pause();

  bgMusicStarted = false;
  updateMusicButton(false, "🔇 Música");
}

function toggleBackgroundMusic() {
  const audio = getBgMusic();

  if (!audio) {
    updateMusicButton(false, "⚠️ Sin audio");
    return;
  }

  if (audio.paused) {
    startBackgroundMusic();
  } else {
    pauseBackgroundMusic();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const audio = getBgMusic();

  if (!audio) {
    updateMusicButton(false, "⚠️ Sin audio");
    return;
  }

  audio.addEventListener("canplaythrough", () => {
    if (!bgMusicStarted) {
      updateMusicButton(false, "▶️ Activar música");
    }
  });

  audio.addEventListener("error", () => {
    updateMusicButton(false, "⚠️ Audio no encontrado");
    console.error("No se pudo cargar /assets/audio/fondo-tv.mp3");
  });
});

document.addEventListener("click", () => {
  if (!bgMusicStarted) {
    startBackgroundMusic();
  }
}, { once: true });

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("visible");
  });

  document.getElementById(id).classList.add("visible");
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

async function crearSala() {
  MagicSound.unlock();
  MagicSound.play("start");
  startBackgroundMusic();

  const res = await fetch("/api/host/create_room", {
    method: "POST",
  });

  const data = await res.json();

  currentRoom = data.room_code;

  showScreen("view-lobby");

  document.getElementById("tv-code").innerText = currentRoom;

  const urlUnirse = `${window.location.origin}/mobile/index.html?room=${currentRoom}`;
  document.getElementById("join-url").innerText = urlUnirse;

  document.getElementById("tv-qr").src =
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(urlUnirse)}`;

  await cargarCatalogoJuegos();
  iniciarRadar();
}

async function cargarCatalogoJuegos() {
  const res = await fetch("/api/games");
  const data = await res.json();

  const select = document.getElementById("game-select");
  select.innerHTML = "";

  Object.entries(data.games).forEach(([gameId, game]) => {
    const option = document.createElement("option");
    option.value = gameId;
    option.textContent = game.name;
    select.appendChild(option);
  });
}

function iniciarRadar() {
  if (radarInterval) {
    clearInterval(radarInterval);
  }

  radarInterval = setInterval(async () => {
    if (!currentRoom) return;

    try {
      const res = await fetch(`/api/room/${currentRoom}/status`);
      if (!res.ok) return;

      const data = await res.json();

      if (data.status === "lobby") {
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
    } catch (error) {
      console.error("Buscando radar...");
    }
  }, 850);
}

function renderLobby(data) {
  autoRevealLock = false;
  showScreen("view-lobby");

  const lista = document.getElementById("lista-jugadores");
  lista.innerHTML = "";

  data.players.forEach((player) => {
    const item = document.createElement("div");
    item.className = "player-tag";
    item.textContent = `${houseIcons[player.house] || "✨"} ${player.name}`;
    lista.appendChild(item);
  });

  document.getElementById("controles-host").style.display =
    data.players.length >= 1 ? "block" : "none";
}

function renderPlaying(data) {
  const state = data.game_state;
  const key = getRoundKey(state);

  showScreen("view-game");

  if (lastPlayKey !== key) {
    lastPlayKey = key;
    lastTickSecond = null;
    autoRevealLock = false;
    MagicSound.play("start");

    if (state.phase === "artes_ridiculas") {
      renderArtesRidiculas(state, data.players);
    } else {
      renderGenericGame(state);
    }
  }

  if (state.phase === "artes_ridiculas") {
    updateArtesTimer(state);
    updateArtesPlayers(state, data.players);
  }
}

function renderGenericGame(state) {
  const container = document.getElementById("game-container");

  container.innerHTML = `
    <section class="generic-card">
      <div class="badge">✨ Minijuego activo</div>
      <h2 class="question-title">${escapeHTML(getQuestion(state))}</h2>
      <div class="options-grid" id="tv-opciones"></div>
      <button class="primary-btn reveal-btn" onclick="revelarResultados()">
        Revelar Resultados
      </button>
    </section>
  `;

  const grid = document.getElementById("tv-opciones");

  (state.options || []).forEach((option) => {
    const box = document.createElement("div");
    box.className = "option-box";
    box.textContent = option;
    grid.appendChild(box);
  });
}

function renderArtesRidiculas(state, players) {
  const container = document.getElementById("game-container");

  container.innerHTML = `
    <section class="artes-board">
      <div class="creature-shadow"></div>

      <header class="artes-header">
        <div class="badge">🛡️ Defensa Contra las Artes Ridículas</div>
        <h1 class="artes-title">${escapeHTML(state.title || "Defensa Contra las Artes Ridículas")}</h1>
        <p class="artes-subtitle">${escapeHTML(state.subtitle || "Clase práctica de supervivencia mágica.")}</p>
      </header>

      <div class="artes-question">
        ${escapeHTML(state.question)}
      </div>

      <div class="artes-narrator">
        “${escapeHTML(state.narrator || "Hoy aprenderemos a defendernos de peligros oscuros, como la cuenta dividida entre ocho.")}”
      </div>

      <div class="timer-shell">
        <div id="artes-timer-bar" class="timer-bar"></div>
      </div>

      <div class="artes-meta">
        <span id="artes-time-text">Tiempo: 6.0s</span>
        <span>Correcta +100 · Rápida +30 · Racha +80 · Error -20 · Humor +20</span>
      </div>

      <div class="artes-actions">
        <button class="primary-btn reveal-btn" onclick="revelarResultados()">
          Revelar Resultados
        </button>
        <button class="secondary-btn" onclick="volverAlLobby()">
          Volver al Lobby
        </button>
      </div>

      <div id="artes-player-grid" class="artes-player-grid"></div>
    </section>
  `;

  updateArtesTimer(state);
  updateArtesPlayers(state, players);
}

function updateArtesTimer(state) {
  const bar = document.getElementById("artes-timer-bar");
  const label = document.getElementById("artes-time-text");

  if (!bar || !label) return;

  const duration = Number(state.duration_seconds || 6);
  const startedAt = Number(state.started_at || Date.now() / 1000);
  const elapsed = Math.max(0, Date.now() / 1000 - startedAt);
  const left = Math.max(0, duration - elapsed);
  const pct = Math.max(0, Math.min(1, left / duration));

  bar.style.transform = `scaleX(${pct})`;
  label.textContent = `Tiempo: ${left.toFixed(1)}s`;

  const rounded = Math.ceil(left);

  if (rounded <= 3 && rounded > 0 && rounded !== lastTickSecond) {
    lastTickSecond = rounded;
    MagicSound.play("timer-danger");
  }

  if (left <= 0 && !autoRevealLock) {
    autoRevealLock = true;

    setTimeout(() => {
      revelarResultados();
    }, 650);
  }
}

function updateArtesPlayers(state, players) {
  const grid = document.getElementById("artes-player-grid");
  if (!grid) return;

  const answered = state.answered || {};
  grid.innerHTML = "";

  players.forEach((player) => {
    const card = document.createElement("div");
    card.className = `artes-player-card ${answered[player.name] ? "answered" : ""}`;

    const top = document.createElement("div");
    top.textContent = `${houseIcons[player.house] || "✨"} ${player.name}`;

    const bottom = document.createElement("small");
    bottom.textContent = answered[player.name] ? "Respuesta recibida" : "Esperando...";

    card.appendChild(top);
    card.appendChild(bottom);
    grid.appendChild(card);
  });
}

function renderResults(data) {
  const state = data.game_state;
  const phase = state.phase || "";
  const resultSoundKey = `results-${state.round_id || state.correct || phase}`;

  showScreen("view-results");

  const title = document.getElementById("titulo-resultados");
  const correct = document.getElementById("tv-correcta");
  const explanation = document.getElementById("tv-explicacion");
  const extra = document.getElementById("tv-extra-results");

  extra.innerHTML = "";
  explanation.textContent = "";

  if (phase === "results_duelo") {
    title.innerText = "El enemigo usó:";
  } else if (phase === "results_sombrero" || phase === "results_patronus_personalizado") {
    title.innerText = "¡El más votado es!";
  } else if (phase === "results_artes_ridiculas") {
    title.innerText = "La defensa correcta era:";
    explanation.textContent = state.explanation || "";
    renderArtesResults(state, extra);
  } else {
    title.innerText = "Resultado de la ronda:";
  }

  correct.innerText = state.correct || "Nadie votó";

  renderHouseScores(data.players);

  if (lastPlayKey !== resultSoundKey) {
    lastPlayKey = resultSoundKey;
    MagicSound.play("reveal");
  }
}

function renderArtesResults(state, container) {
  const results = state.last_results || {};
  const names = Object.keys(results);

  if (!names.length) {
    const row = document.createElement("div");
    row.className = "result-row neutral";
    row.textContent = "Nadie respondió. La clase reprueba con honores.";
    container.appendChild(row);
    return;
  }

  names.forEach((name) => {
    const result = results[name];

    const row = document.createElement("div");
    row.className = `result-row ${result.correct ? "good" : "bad"}`;

    const left = document.createElement("span");
    left.textContent = `${name} — ${result.answer}`;

    const labels = Array.isArray(result.labels) ? result.labels.join(" · ") : "";
    const right = document.createElement("span");
    right.textContent =
      `${result.points > 0 ? "+" : ""}${result.points} pts${labels ? " · " + labels : ""}`;

    row.appendChild(left);
    row.appendChild(right);
    container.appendChild(row);
  });
}

function renderHouseScores(players) {
  const scores = {
    Gryffindor: 0,
    Slytherin: 0,
    Ravenclaw: 0,
    Hufflepuff: 0,
  };

  players.forEach((player) => {
    scores[player.house] = (scores[player.house] || 0) + (player.score || 0);
  });

  const container = document.getElementById("tv-marcadores");
  container.innerHTML = "";

  Object.entries(scores).forEach(([house, score]) => {
    const card = document.createElement("div");
    card.className = "house-score";
    card.style.borderColor = houseColors[house] || "#ffffff";
    card.textContent = `${houseIcons[house] || "✨"} ${score} pts`;
    container.appendChild(card);
  });
}

async function lanzarJuegoSeleccionado() {
  const gameId = document.getElementById("game-select").value;

  lastPlayKey = "";
  lastTickSecond = null;
  autoRevealLock = false;

  MagicSound.play("click");
  startBackgroundMusic();

  await fetch(`/api/host/${currentRoom}/start_game/${gameId}`, {
    method: "POST",
  });
}

async function revelarResultados() {
  if (!currentRoom) return;

  MagicSound.play("click");

  await fetch(`/api/host/${currentRoom}/reveal`, {
    method: "POST",
  });
}

async function volverAlLobby() {
  if (!currentRoom) return;

  lastPlayKey = "";
  lastTickSecond = null;
  autoRevealLock = false;

  MagicSound.play("click");

  await fetch(`/api/host/${currentRoom}/return_lobby`, {
    method: "POST",
  });
}
