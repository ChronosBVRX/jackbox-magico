let myRoom = "";
let myName = "";
let myHouse = "";
let myHostToken = "";
let myIsHost = false;

let radarInterval = null;
let currentRoundKey = "";
let currentRoundStartedMs = Date.now();
let hasAnsweredCurrentRound = false;
let lastTickSecond = null;
let gamesLoaded = false;
let clashTapCount = 0;

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

const urlParams = new URLSearchParams(window.location.search);

if (urlParams.has("room")) {
  document.getElementById("m-room").value = urlParams.get("room").toUpperCase();
  document.getElementById("m-room").disabled = true;
}

const savedRoom = localStorage.getItem("jackbox_magico_room");
const savedName = localStorage.getItem("jackbox_magico_name");
const savedHouse = localStorage.getItem("jackbox_magico_house");

if (!urlParams.has("room") && savedRoom) {
  document.getElementById("m-room").value = savedRoom;
}

if (savedName) {
  document.getElementById("m-name").value = savedName;
}

if (savedHouse) {
  document.getElementById("m-house").value = savedHouse;
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("visible");
  });

  document.getElementById(id).classList.add("visible");
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

function showHostPanels(show) {
  const hostPanel = document.getElementById("host-panel");
  const hostGamePanel = document.getElementById("host-game-panel");

  if (hostPanel) {
    hostPanel.classList.toggle("visible", show);
  }

  if (hostGamePanel) {
    hostGamePanel.classList.toggle("visible", show);
  }
}

async function loadGamesForHost() {
  if (gamesLoaded) return;

  try {
    const res = await fetch("/api/games");
    const data = await res.json();

    const select = document.getElementById("host-game-select");
    select.innerHTML = "";

    Object.entries(data.games).forEach(([gameId, game]) => {
      const option = document.createElement("option");
      option.value = gameId;
      option.textContent = game.name;
      select.appendChild(option);
    });

    gamesLoaded = true;
  } catch (error) {
    console.error("No se pudo cargar catálogo de juegos");
  }
}

async function joinRoom(auto = false) {
  MagicSound.unlock();
  MagicSound.play("click");

  const btn = document.getElementById("btn-unirse");

  myRoom = document.getElementById("m-room").value.trim().toUpperCase();
  myName = document.getElementById("m-name").value.trim();
  myHouse = document.getElementById("m-house").value;
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

  btn.innerText = auto ? "Reconectando..." : "Conectando...";
  btn.disabled = true;

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
        host_token: myHostToken || null,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      myIsHost = Boolean(data.is_host);

      if (data.host_token) {
        myHostToken = data.host_token;
        localStorage.setItem(`jackbox_magico_host_token_${myRoom}`, myHostToken);
      }

      if (myIsHost) {
        await loadGamesForHost();
      }

      showScreen("view-wait");

      document.getElementById("wait-msg").innerText = data.reconnected
        ? "¡Reconectado!"
        : myIsHost
          ? "¡Eres el host!"
          : "¡Estás dentro!";

      document.getElementById("wait-subtitle").innerText = myIsHost
        ? "Cuando todos entren, inicia la partida desde aquí."
        : "Espera a que el host inicie la partida.";

      document.getElementById("points-feedback").className = "points-feedback";
      document.getElementById("points-feedback").innerText = "";

      showHostPanels(myIsHost);

      iniciarRadarMovil();
      MagicSound.play("start");
    } else {
      if (!auto) {
        alert("Error: " + data.detail);
      }

      btn.innerText = "Entrar a la Sala";
      btn.disabled = false;
    }
  } catch (error) {
    if (!auto) {
      alert("Error de conexión al castillo.");
    }

    btn.innerText = "Entrar a la Sala";
    btn.disabled = false;
  }
}

document.getElementById("btn-unirse").addEventListener("click", () => {
  joinRoom(false);
});

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
      const res = await fetch(`/api/room/${myRoom}/status`);
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
        if (phase === "sombrero" || phase === "sombrero_tiebreak") {
          renderSombreroMobile(state);
          return;
        }

        if (phase === "duelo") {
          renderDuelMobile(state);
          return;
        }

        if (phase === "duelo_clash") {
          renderDuelClashMobile(state);
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
        renderResultsWait();
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
    } catch (error) {
      console.error("Buscando conexión...");
    }
  }, 700);
}

function renderLobbyWait(data) {
  currentRoundKey = "";
  hasAnsweredCurrentRound = false;
  lastTickSecond = null;
  clashTapCount = 0;

  document.getElementById("m-botones").innerHTML = "";

  const duelPanel = document.getElementById("duel-mobile-panel");
  if (duelPanel) {
    duelPanel.classList.remove("visible");
    duelPanel.innerHTML = "";
  }

  const sombreroPanel = document.getElementById("sombrero-mobile-panel");
  if (sombreroPanel) {
    sombreroPanel.classList.remove("visible");
    sombreroPanel.innerHTML = "";
  }

  showScreen("view-wait");

  if (myIsHost) {
    document.getElementById("wait-pill").innerText = "👑 Host";
    document.getElementById("wait-msg").innerText = "Tú controlas la partida";
    document.getElementById("wait-subtitle").innerText =
      "Cuando todos estén listos, inicia un minijuego.";
  } else {
    document.getElementById("wait-pill").innerText = "🕯️ Conectado";
    document.getElementById("wait-msg").innerText = "¡Estás dentro!";
    document.getElementById("wait-subtitle").innerText =
      data.host && data.host.name
        ? `Espera a que ${data.host.name} inicie la partida.`
        : "Esperando host...";
  }

  document.getElementById("points-feedback").className = "points-feedback";
  document.getElementById("points-feedback").innerText = "";

  showHostPanels(myIsHost);
}

function renderAnsweredWait(state) {
  showScreen("view-wait");

  document.getElementById("wait-pill").innerText = myIsHost ? "👑 Host" : "🕯️ Conectado";
  document.getElementById("wait-msg").innerText = "¡Respuesta enviada!";
  document.getElementById("wait-subtitle").innerText = myIsHost
    ? "Puedes revelar resultados desde aquí cuando quieras."
    : "Mira la TV para seguir la ronda.";

  showHostPanels(myIsHost);
}

function renderResultsWait() {
  currentRoundKey = "";
  hasAnsweredCurrentRound = false;
  lastTickSecond = null;
  clashTapCount = 0;

  showScreen("view-wait");

  document.getElementById("wait-pill").innerText = myIsHost ? "👑 Host" : "🏆 Resultados";
  document.getElementById("wait-msg").innerText = "¡Mira la TV!";
  document.getElementById("wait-subtitle").innerText = myIsHost
    ? "Puedes volver al lobby e iniciar otro minijuego."
    : "La ronda terminó. Revisa los resultados.";

  showHostPanels(myIsHost);
}

function renderSombreroMobile(state) {
  showScreen("view-game");
  showHostPanels(myIsHost);

  document.getElementById("m-botones").innerHTML = "";

  const duelPanel = document.getElementById("duel-mobile-panel");
  duelPanel.classList.remove("visible");
  duelPanel.innerHTML = "";

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
    MagicSound.play("start");
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
  showHostPanels(myIsHost);

  document.getElementById("m-botones").innerHTML = "";

  const sombreroPanel = document.getElementById("sombrero-mobile-panel");
  if (sombreroPanel) {
    sombreroPanel.classList.remove("visible");
    sombreroPanel.innerHTML = "";
  }

  document.getElementById("duel-mobile-panel").innerHTML = "";
  document.getElementById("duel-mobile-panel").classList.remove("visible");

  const answers = state.answers || {};
  const iAmDuelist = isMeDuelist(state);
  const iAlreadyAnswered = Boolean(answers[myName]);

  if (!iAmDuelist) {
    showScreen("view-wait");
    document.getElementById("wait-pill").innerText = myIsHost ? "👑 Host" : "⚔️ Duelo";
    document.getElementById("wait-msg").innerText = "Estás viendo el duelo";
    document.getElementById("wait-subtitle").innerText = "No fuiste seleccionado en esta ronda. Mira la TV.";
    showHostPanels(myIsHost);
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
    MagicSound.play("start");
  }

  document.getElementById("game-pill").innerText = "⚔️ Duelo";
  document.getElementById("m-pregunta-aviso").innerText = "¡Elige tu hechizo!";
  document.getElementById("m-question-small").innerText = "Tienes 5 segundos. Varitas arriba.";
  document.getElementById("mobile-timer").style.display = "block";
  document.getElementById("mobile-status").innerText = "Elige bien. Aquí sí hay consecuencias mágicas.";

  const panel = document.getElementById("duel-mobile-panel");
  panel.classList.add("visible");

  panel.innerHTML = `
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
  showHostPanels(myIsHost);

  document.getElementById("m-botones").innerHTML = "";

  const sombreroPanel = document.getElementById("sombrero-mobile-panel");
  if (sombreroPanel) {
    sombreroPanel.classList.remove("visible");
    sombreroPanel.innerHTML = "";
  }

  document.getElementById("duel-mobile-panel").innerHTML = "";

  const iAmDuelist = isMeDuelist(state);

  if (!iAmDuelist) {
    showScreen("view-wait");
    document.getElementById("wait-pill").innerText = myIsHost ? "👑 Host" : "⚡ Choque";
    document.getElementById("wait-msg").innerText = "¡Choque de Varitas!";
    document.getElementById("wait-subtitle").innerText = "Los duelistas están presionando como si debieran renta.";
    showHostPanels(myIsHost);
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

    MagicSound.play("start");
  }

  document.getElementById("game-pill").innerText = "⚡ Choque";
  document.getElementById("m-pregunta-aviso").innerText = "¡Choque de Varitas!";
  document.getElementById("m-question-small").innerText = "Presiona lo más rápido que puedas durante 5 segundos.";
  document.getElementById("mobile-timer").style.display = "block";
  document.getElementById("mobile-status").innerText = "¡Toca sin piedad mágica!";

  const panel = document.getElementById("duel-mobile-panel");
  panel.classList.add("visible");

  const clash = state.clash || {};
  const taps = clash.taps || {};

  clashTapCount = taps[myName] || clashTapCount || 0;

  panel.innerHTML = `
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
    MagicSound.play("timer-danger");
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
    MagicSound.play("timer-danger");
  }
}

async function sendDuelClashTap() {
  try {
    clashTapCount += 1;

    const counter = document.getElementById("duel-tap-count");
    if (counter) {
      counter.innerText = clashTapCount;
    }

    MagicSound.play("click");

    await fetch("/api/player/duel_clash_tap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        room_code: myRoom,
        player_name: myName,
      }),
    });
  } catch (error) {
    console.error("No se pudo enviar tap de choque");
  }
}

function renderMobileGame(state) {
  const newKey = getRoundKey(state);

  showScreen("view-game");
  showHostPanels(myIsHost);

  const duelPanel = document.getElementById("duel-mobile-panel");
  duelPanel.classList.remove("visible");
  duelPanel.innerHTML = "";

  const sombreroPanel = document.getElementById("sombrero-mobile-panel");
  if (sombreroPanel) {
    sombreroPanel.classList.remove("visible");
    sombreroPanel.innerHTML = "";
  }

  if (newKey === currentRoundKey) {
    if (state.phase === "artes_ridiculas") {
      updateMobileTimer(state);
    }

    return;
  }

  currentRoundKey = newKey;
  hasAnsweredCurrentRound = false;
  lastTickSecond = null;
  currentRoundStartedMs = state.started_at ? Number(state.started_at) * 1000 : Date.now();

  const pill = document.getElementById("game-pill");
  const aviso = document.getElementById("m-pregunta-aviso");
  const question = document.getElementById("m-question-small");
  const timer = document.getElementById("mobile-timer");
  const status = document.getElementById("mobile-status");
  const buttons = document.getElementById("m-botones");

  buttons.innerHTML = "";
  status.innerText = "Elige una opción.";

  if (["patronus_personalizado"].includes(state.phase)) {
    pill.innerText = "🗳️ Votación";
    aviso.innerText = "¡Vota por un jugador!";
    question.innerText = getQuestion(state);
    timer.style.display = "none";
  } else if (state.phase === "artes_ridiculas") {
    pill.innerText = "🛡️ Artes Ridículas";
    aviso.innerText = "¡Defiéndete en 6 segundos!";
    question.innerText = getQuestion(state);
    timer.style.display = "block";
  } else {
    pill.innerText = "✨ Minijuego";
    aviso.innerText = "¡Juega rápido!";
    question.innerText = getQuestion(state);
    timer.style.display = "none";
  }

  (state.options || []).forEach((option) => {
    const button = document.createElement("button");
    button.className = "option-btn";
    button.textContent = option;
    button.addEventListener("click", () => enviarRespuesta(option, button));
    buttons.appendChild(button);
  });

  updateMobileTimer(state);
  MagicSound.play("start");
}

function updateMobileTimer(state) {
  const timer = document.getElementById("mobile-timer");
  const bar = document.getElementById("mobile-timer-bar");

  if (!bar || state.phase !== "artes_ridiculas") return;

  timer.style.display = "block";

  const duration = Number(state.duration_seconds || 6);
  const started = state.started_at ? Number(state.started_at) * 1000 : currentRoundStartedMs;
  const elapsed = Math.max(0, Date.now() - started) / 1000;
  const left = Math.max(0, duration - elapsed);
  const pct = Math.max(0, Math.min(1, left / duration));

  bar.style.transform = `scaleX(${pct})`;

  const rounded = Math.ceil(left);

  if (rounded <= 3 && rounded > 0 && rounded !== lastTickSecond) {
    lastTickSecond = rounded;
    MagicSound.play("timer-danger");
  }
}

async function enviarRespuesta(option, clickedButton) {
  if (hasAnsweredCurrentRound) return;

  hasAnsweredCurrentRound = true;

  const elapsed = Math.max(0, Date.now() - currentRoundStartedMs);

  document.querySelectorAll(".option-btn, .duel-spell-btn, .sombrero-vote-btn").forEach((btn) => {
    btn.disabled = true;
    btn.classList.add("locked");
  });

  clickedButton.classList.remove("locked");
  clickedButton.classList.add("sent");

  document.getElementById("mobile-status").innerText = "Enviando respuesta...";
  MagicSound.play("send");

  try {
    const res = await fetch("/api/player/submit_answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        room_code: myRoom,
        player_name: myName,
        answer: option,
        client_elapsed_ms: elapsed,
      }),
    });

    const data = await res.json();

    showScreen("view-wait");

    document.getElementById("wait-msg").innerText = "¡Respuesta enviada!";
    document.getElementById("wait-subtitle").innerText = myIsHost
      ? "Puedes revelar resultados desde aquí."
      : "Mira la TV para seguir la ronda.";

    const feedback = document.getElementById("points-feedback");

    if (typeof data.points === "number") {
      const labels = Array.isArray(data.labels) ? data.labels.join(" · ") : "";

      feedback.className = `points-feedback ${data.correct ? "good" : "bad"}`;
      feedback.innerText =
        `${data.points > 0 ? "+" : ""}${data.points} pts${labels ? " · " + labels : ""}`;

      MagicSound.play(data.correct ? "correct" : "wrong");
    } else {
      feedback.className = "points-feedback neutral";
      feedback.innerText = data.message || "Respuesta guardada.";
      MagicSound.play("correct");
    }

    showHostPanels(myIsHost);
  } catch (error) {
    showScreen("view-wait");

    document.getElementById("wait-msg").innerText = "No se pudo enviar.";
    document.getElementById("wait-subtitle").innerText =
      "Revisa la conexión e intenta en la siguiente ronda.";

    const feedback = document.getElementById("points-feedback");
    feedback.className = "points-feedback bad";
    feedback.innerText = "Error de conexión.";

    MagicSound.play("wrong");
    showHostPanels(myIsHost);
  }
}

async function hostStartSelectedGame() {
  if (!myIsHost || !myHostToken) return;

  const gameId = document.getElementById("host-game-select").value;

  MagicSound.play("click");

  if (gameId === "sombrero_burlon") {
    const question =
      typeof window.getSombreroPrompt === "function"
        ? window.getSombreroPrompt()
        : "¿Quién merece ser señalado por el Sombrero Burlón?";

    await fetch(`/api/mobile/host/${myRoom}/start_sombrero_custom`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        player_name: myName,
        host_token: myHostToken,
        question: question,
      }),
    });

    return;
  }

  await fetch(`/api/mobile/host/${myRoom}/start_game/${gameId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      player_name: myName,
      host_token: myHostToken,
    }),
  });
}

async function hostRevealResults() {
  if (!myIsHost || !myHostToken) return;

  MagicSound.play("click");

  await fetch(`/api/mobile/host/${myRoom}/reveal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      player_name: myName,
      host_token: myHostToken,
    }),
  });
}

async function hostReturnLobby() {
  if (!myIsHost || !myHostToken) return;

  MagicSound.play("click");

  await fetch(`/api/mobile/host/${myRoom}/return_lobby`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      player_name: myName,
      host_token: myHostToken,
    }),
  });
}
