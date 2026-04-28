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

function hideGamePanels() {
  const duelPanel = document.getElementById("duel-mobile-panel");
  const sombreroPanel = document.getElementById("sombrero-mobile-panel");
  const pocionesPanel = document.getElementById("pociones-mobile-panel");
  const snitchPanel = document.getElementById("snitch-mobile-panel");

  [duelPanel, sombreroPanel, pocionesPanel, snitchPanel].forEach((panel) => {
    if (panel) {
      panel.classList.remove("visible");
      panel.innerHTML = "";
    }
  });
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
          return;
        }

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

      if (state.phase === "clase_pociones") {
        updateMobilePocionesTimer(state);
      }

      if (state.phase === "atrapa_snitch" && typeof window.updateMobileSnitchTimer === "function") {
        window.updateMobileSnitchTimer(state);
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
  selectedPotionIngredients = [];

  document.getElementById("m-botones").innerHTML = "";
  hideGamePanels();

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
  selectedPotionIngredients = [];

  hideGamePanels();

  showScreen("view-wait");

  document.getElementById("wait-pill").innerText = myIsHost ? "👑 Host" : "🏆 Resultados";
  document.getElementById("wait-msg").innerText = "¡Mira la TV!";
  document.getElementById("wait-subtitle").innerText = myIsHost
    ? "Puedes volver al lobby e iniciar otro minijuego."
    : "La ronda terminó. Revisa los resultados.";

  showHostPanels(myIsHost);
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
  showHostPanels(myIsHost);

  document.getElementById("m-botones").innerHTML = "";

  const duelPanel = document.getElementById("duel-mobile-panel");
  const sombreroPanel = document.getElementById("sombrero-mobile-panel");
  const panel = document.getElementById("pociones-mobile-panel");
  const snitchPanel = document.getElementById("snitch-mobile-panel");

  if (duelPanel) {
    duelPanel.classList.remove("visible");
    duelPanel.innerHTML = "";
  }

  if (sombreroPanel) {
    sombreroPanel.classList.remove("visible");
    sombreroPanel.innerHTML = "";
  }

  if (snitchPanel) {
    snitchPanel.classList.remove("visible");
    snitchPanel.innerHTML = "";
  }

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
    MagicSound.play("start");
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
  MagicSound.play("click");

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
  MagicSound.play("click");
}

async function submitPotionRecipe() {
  if (hasAnsweredCurrentRound) return;

  hasAnsweredCurrentRound = true;

  const elapsed = Math.max(0, Date.now() - currentRoundStartedMs);

  document.querySelectorAll(".pociones-ingredient-btn, .pociones-submit-btn, .pociones-clear-btn").forEach((btn) => {
    btn.disabled = true;
  });

  document.getElementById("mobile-status").innerText = "Entregando poción...";
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

    document.getElementById("wait-subtitle").innerText = myIsHost
      ? "Puedes revelar resultados desde aquí."
      : "Mira la TV para seguir la ronda.";

    const feedback = document.getElementById("points-feedback");
    feedback.className = `points-feedback ${data.exploded ? "bad" : data.perfect ? "good" : "neutral"}`;
    feedback.innerText =
      `${data.points > 0 ? "+" : ""}${data.points || 0} pts · ${data.message || "Poción entregada."}`;

    MagicSound.play(data.exploded ? "wrong" : "correct");
    showHostPanels(myIsHost);
  } catch (error) {
    showScreen("view-wait");

    document.getElementById("wait-msg").innerText = "No se pudo entregar.";
    document.getElementById("wait-subtitle").innerText =
      "Revisa la conexión e intenta en la siguiente ronda.";

    const feedback = document.getElementById("points-feedback");
    feedback.className = "points-feedback bad";
    feedback.innerText = "Error de conexión.";

    MagicSound.play("wrong");
    showHostPanels(myIsHost);
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
    MagicSound.play("timer-danger");
  }
}

function renderSombreroMobile(state) {
  showScreen("view-game");
  showHostPanels(myIsHost);

  document.getElementById("m-botones").innerHTML = "";

  const duelPanel = document.getElementById("duel-mobile-panel");
  const pocionesPanel = document.getElementById("pociones-mobile-panel");
  const snitchPanel = document.getElementById("snitch-mobile-panel");

  if (duelPanel) {
    duelPanel.classList.remove("visible");
    duelPanel.innerHTML = "";
  }

  if (pocionesPanel) {
    pocionesPanel.classList.remove("visible");
    pocionesPanel.innerHTML = "";
  }

  if (snitchPanel) {
    snitchPanel.classList.remove("visible");
    snitchPanel.innerHTML = "";
  }

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
  const pocionesPanel = document.getElementById("pociones-mobile-panel");
  const snitchPanel = document.getElementById("snitch-mobile-panel");

  if (sombreroPanel) {
    sombreroPanel.classList.remove("visible");
    sombreroPanel.innerHTML = "";
  }

  if (pocionesPanel) {
    pocionesPanel.classList.remove("visible");
    pocionesPanel.innerHTML = "";
  }

  if (snitchPanel) {
    snitchPanel.classList.remove("visible");
    snitchPanel.innerHTML = "";
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
  const pocionesPanel = document.getElementById("pociones-mobile-panel");
  const snitchPanel = document.getElementById("snitch-mobile-panel");

  if (sombreroPanel) {
    sombreroPanel.classList.remove("visible");
    sombreroPanel.innerHTML = "";
  }

  if (pocionesPanel) {
    pocionesPanel.classList.remove("visible");
    pocionesPanel.innerHTML = "";
  }

  if (snitchPanel) {
    snitchPanel.classList.remove("visible");
    snitchPanel.innerHTML = "";
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
  if (state.phase === "atrapa_snitch" && typeof window.renderSnitchMobile === "function") {
    window.renderSnitchMobile(state);
    return;
  }

  const newKey = getRoundKey(state);

  showScreen("view-game");
  showHostPanels(myIsHost);

  hideGamePanels();

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