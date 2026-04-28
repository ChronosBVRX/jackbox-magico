let bgMusicStarted = false;
let currentRoom = "";
let radarInterval = null;
let lastPlayKey = "";
let lastTickSecond = null;
let autoRevealLock = false;
let roomCreating = false;

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

const spellEmoji = {
  Expelliarmus: "🪄",
  Protego: "🛡️",
  Stupefy: "💥",
  Esquivar: "💨",
  Rictusempra: "😂",
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

  if (audio) {
    audio.addEventListener("canplaythrough", () => {
      if (!bgMusicStarted) {
        updateMusicButton(false, "▶️ Activar música");
      }
    });

    audio.addEventListener("error", () => {
      updateMusicButton(false, "⚠️ Audio no encontrado");
    });

    startBackgroundMusic();
  }

  setTimeout(() => {
    crearSala();
  }, 450);
});

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
  if (currentRoom || roomCreating) return;

  roomCreating = true;

  MagicSound.unlock();
  MagicSound.play("start");
  startBackgroundMusic();

  const res = await fetch("/api/host/create_room", {
    method: "POST",
  });

  const data = await res.json();

  currentRoom = data.room_code;
  roomCreating = false;

  showScreen("view-lobby");

  document.getElementById("tv-code").innerText = currentRoom;

  const urlUnirse = `${window.location.origin}/mobile/index.html?room=${currentRoom}`;
  document.getElementById("join-url").innerText = urlUnirse;

  document.getElementById("tv-qr").src =
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(urlUnirse)}`;

  iniciarRadar();
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

    if (state.phase === "sombrero" || state.phase === "sombrero_tiebreak") {
      renderSombrero(state);
    } else if (state.phase === "duelo") {
      renderDuel(state);
    } else if (state.phase === "duelo_clash") {
      renderDuelClash(state);
    } else if (state.phase === "artes_ridiculas") {
      renderArtesRidiculas(state, data.players);
    } else {
      renderGenericGame(state);
    }
  }

  if (state.phase === "sombrero" || state.phase === "sombrero_tiebreak") {
    updateSombreroVotes(state);
  }

  if (state.phase === "duelo") {
    updateDuelTimer(state);
    updateDuelPlayers(state);
  }

  if (state.phase === "duelo_clash") {
    updateDuelClashTimer(state);
    updateDuelClashTaps(state);
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
      <div class="host-help">El host puede revelar resultados desde su celular.</div>
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

function renderSombrero(state) {
  const container = document.getElementById("game-container");

  container.innerHTML = `
    <section class="sombrero-board">
      <header class="sombrero-header">
        <div class="badge">${state.phase === "sombrero_tiebreak" ? "⚡ Desempate" : "🎩 Sombrero Burlón"}</div>
        <h1 class="sombrero-title">${escapeHTML(state.title || "Sombrero Burlón")}</h1>
        <p class="sombrero-subtitle">${escapeHTML(state.subtitle || "Votación social con cero responsabilidad emocional.")}</p>
      </header>

      <div class="sombrero-stage">
        <div class="magic-hat">
          <div class="hat-tip"></div>
          <div class="hat-body"></div>
          <div class="hat-eye left"></div>
          <div class="hat-eye right"></div>
          <div class="hat-mouth"></div>
          <div class="hat-brim"></div>
        </div>

        <div class="sombrero-question-box">
          <div class="sombrero-question">${escapeHTML(state.question)}</div>
          <div class="sombrero-narrator">“${escapeHTML(state.narrator || "El sombrero está pensando cosas que no debería decir en voz alta.")}”</div>
        </div>
      </div>

      <div class="sombrero-progress">
        <div class="sombrero-progress-track">
          <div id="sombrero-progress-bar" class="sombrero-progress-bar"></div>
        </div>
        <div id="sombrero-progress-text" class="sombrero-progress-text">Votos: 0 / 0</div>
      </div>

      <div id="sombrero-voters" class="sombrero-voters"></div>

      <div class="host-help">El host puede revelar resultados desde su celular cuando todos voten.</div>
    </section>
  `;

  updateSombreroVotes(state);
}

function updateSombreroVotes(state) {
  const bar = document.getElementById("sombrero-progress-bar");
  const text = document.getElementById("sombrero-progress-text");
  const votersBox = document.getElementById("sombrero-voters");

  if (!bar || !text || !votersBox) return;

  const total = Number(state.total_voters || 0);
  const voted = Number(state.voted_count || 0);
  const pct = total > 0 ? Math.max(0, Math.min(1, voted / total)) : 0;

  bar.style.transform = `scaleX(${pct})`;
  text.textContent = `Votos: ${voted} / ${total}`;

  const votedPlayers = state.voted_players || [];
  const players = state.players || [];

  votersBox.innerHTML = "";

  players.forEach((player) => {
    const item = document.createElement("div");
    item.className = `sombrero-voter ${votedPlayers.includes(player.name) ? "ready" : ""}`;
    item.textContent = `${houseIcons[player.house] || "✨"} ${player.name} — ${votedPlayers.includes(player.name) ? "Votó" : "Esperando"}`;
    votersBox.appendChild(item);
  });
}

function renderDuel(state) {
  const duelists = state.duelists || [];
  const p1 = duelists[0] || { name: "Duelista A", house: "Casa" };
  const p2 = duelists[1] || { name: "Duelista B", house: "Casa" };

  const container = document.getElementById("game-container");

  container.innerHTML = `
    <section class="duel-board">
      <header class="duel-header">
        <div class="badge">⚔️ Duelo de Hechizos</div>
        <h1 class="duel-title">${escapeHTML(state.title || "Duelo de Hechizos")}</h1>
        <p class="duel-subtitle">${escapeHTML(state.subtitle || "Dos casas entran. Una sale con ego inflado.")}</p>
      </header>

      <div class="duel-versus">
        <div class="duel-player left">
          <div class="duel-house">${houseIcons[p1.house] || "✨"} ${escapeHTML(p1.house || "")}</div>
          <div class="duel-name">${escapeHTML(p1.name || "Duelista A")}</div>
          <div id="duel-status-${escapeHTML(p1.name)}" class="duel-answer-status">Esperando hechizo...</div>
        </div>

        <div class="duel-vs">VS</div>

        <div class="duel-player right">
          <div class="duel-house">${houseIcons[p2.house] || "✨"} ${escapeHTML(p2.house || "")}</div>
          <div class="duel-name">${escapeHTML(p2.name || "Duelista B")}</div>
          <div id="duel-status-${escapeHTML(p2.name)}" class="duel-answer-status">Esperando hechizo...</div>
        </div>
      </div>

      <div class="duel-timer">
        <div class="duel-timer-track">
          <div id="duel-timer-bar" class="duel-timer-bar"></div>
        </div>
        <div id="duel-time-text" class="duel-time-text">Tiempo: 5.0s</div>
      </div>

      <div class="duel-status">
        “${escapeHTML(state.narrator || "¡Varitas arriba!") }”
      </div>

      <div class="duel-score-preview">
        <div class="duel-score-pill">Victoria +150</div>
        <div class="duel-score-pill">Más rápido +30</div>
        <div class="duel-score-pill">Desempate +80</div>
        <div class="duel-score-pill">Sin responder -30</div>
      </div>
    </section>
  `;

  updateDuelTimer(state);
  updateDuelPlayers(state);
}

function renderDuelClash(state) {
  const duelists = state.duelists || [];
  const p1 = duelists[0] || { name: "Duelista A", house: "Casa" };
  const p2 = duelists[1] || { name: "Duelista B", house: "Casa" };

  const container = document.getElementById("game-container");

  container.innerHTML = `
    <section class="duel-board">
      <header class="duel-header">
        <div class="badge">⚡ Choque de Varitas</div>
        <h1 class="duel-title">¡Choque de Varitas!</h1>
        <p class="duel-subtitle">Ambos eligieron el mismo hechizo. Ahora gana quien presione más rápido.</p>
      </header>

      <div class="duel-clash-counter">
        <div class="duel-clash-box">
          <div class="duel-clash-name">${houseIcons[p1.house] || "✨"} ${escapeHTML(p1.name)}</div>
          <div id="clash-taps-${escapeHTML(p1.name)}" class="duel-clash-taps">0</div>
        </div>

        <div class="duel-clash-box">
          <div class="duel-clash-name">${houseIcons[p2.house] || "✨"} ${escapeHTML(p2.name)}</div>
          <div id="clash-taps-${escapeHTML(p2.name)}" class="duel-clash-taps">0</div>
        </div>
      </div>

      <div class="duel-timer">
        <div class="duel-timer-track">
          <div id="duel-clash-timer-bar" class="duel-timer-bar"></div>
        </div>
        <div id="duel-clash-time-text" class="duel-time-text">Tiempo: 5.0s</div>
      </div>

      <div class="duel-status">
        “${escapeHTML(state.narrator || "¡Choque de varitas!") }”
      </div>
    </section>
  `;

  updateDuelClashTimer(state);
  updateDuelClashTaps(state);
}

function updateDuelTimer(state) {
  const bar = document.getElementById("duel-timer-bar");
  const label = document.getElementById("duel-time-text");

  if (!bar || !label) return;

  const duration = Number(state.duration_seconds || 5);
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

function updateDuelPlayers(state) {
  const answers = state.answers || {};
  const duelists = state.duelists || [];

  duelists.forEach((player) => {
    const el = document.getElementById(`duel-status-${player.name}`);
    if (!el) return;

    if (answers[player.name]) {
      el.textContent = "Hechizo elegido";
      el.classList.add("ready");
    } else {
      el.textContent = "Esperando hechizo...";
      el.classList.remove("ready");
    }
  });
}

function updateDuelClashTimer(state) {
  const bar = document.getElementById("duel-clash-timer-bar");
  const label = document.getElementById("duel-clash-time-text");

  if (!bar || !label) return;

  const clash = state.clash || {};
  const duration = Number(clash.duration_seconds || 5);
  const startedAt = Number(clash.started_at || Date.now() / 1000);
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

function updateDuelClashTaps(state) {
  const clash = state.clash || {};
  const taps = clash.taps || {};
  const duelists = state.duelists || [];

  duelists.forEach((player) => {
    const el = document.getElementById(`clash-taps-${player.name}`);
    if (el) {
      el.textContent = taps[player.name] || 0;
    }
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

      <div class="host-help">El host puede revelar o continuar desde su celular.</div>

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

  if (phase === "results_sombrero") {
    title.innerText = "El Sombrero Burlón eligió:";
    explanation.textContent = state.sombrero_result?.summary || "";
    renderSombreroResults(state, extra);
  } else if (phase === "results_duelo") {
    title.innerText = "Resultado del duelo:";
    explanation.textContent = state.duel_result?.summary || "";
    renderDuelResults(state, extra);
  } else if (phase === "results_artes_ridiculas") {
    title.innerText = "La defensa correcta era:";
    explanation.textContent = state.explanation || "";
    renderArtesResults(state, extra);
  } else if (phase === "results_patronus_personalizado") {
    title.innerText = "¡El más votado es!";
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

function renderSombreroResults(state, container) {
  const result = state.sombrero_result || {};
  const events = state.point_events || [];

  const panel = document.createElement("div");
  panel.className = "sombrero-result";

  const winner = document.createElement("div");
  winner.className = "sombrero-winner";
  winner.textContent = result.winner
    ? `🎩 ${result.winner}`
    : "🎩 Nadie fue elegido";

  const line = document.createElement("div");
  line.className = "sombrero-hat-line";
  line.textContent = `“${result.hat_line || "El sombrero se reserva sus comentarios… por ahora."}”`;

  panel.appendChild(winner);
  panel.appendChild(line);
  container.appendChild(panel);

  events.forEach((event) => {
    const row = document.createElement("div");
    row.className = `result-row ${event.points >= 0 ? "good" : "bad"}`;

    const left = document.createElement("span");
    left.textContent = `${event.player_name} — ${event.label}`;

    const right = document.createElement("span");
    right.textContent = `${event.points > 0 ? "+" : ""}${event.points} pts`;

    row.appendChild(left);
    row.appendChild(right);
    container.appendChild(row);
  });
}

function renderDuelResults(state, container) {
  const result = state.duel_result || {};
  const events = state.point_events || [];

  const panel = document.createElement("div");
  panel.className = "duel-results-panel";

  const summary = document.createElement("div");
  summary.className = "duel-result-summary";
  summary.textContent = result.summary || "Duelo finalizado.";

  const narrator = document.createElement("div");
  narrator.className = "duel-result-narrator";
  narrator.textContent = `“${result.narrator || "¡Varitas abajo antes de que alguien pierda una ceja!"}”`;

  panel.appendChild(summary);
  panel.appendChild(narrator);
  container.appendChild(panel);

  events.forEach((event) => {
    const row = document.createElement("div");
    row.className = `result-row ${event.points >= 0 ? "good" : "bad"}`;

    const left = document.createElement("span");
    left.textContent = `${event.player_name} — ${event.label}`;

    const right = document.createElement("span");
    right.textContent = `${event.points > 0 ? "+" : ""}${event.points} pts`;

    row.appendChild(left);
    row.appendChild(right);
    container.appendChild(row);
  });
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

async function revelarResultados() {
  if (!currentRoom) return;

  MagicSound.play("click");

  await fetch(`/api/host/${currentRoom}/reveal`, {
    method: "POST",
  });
}
