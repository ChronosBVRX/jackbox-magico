(function () {
  let snitchLastKey = "";
  let snitchLastTick = null;
  let snitchCatchCooldown = false;
  let snitchAttemptsUsed = 0;
  let snitchRoundStartedMs = Date.now();
  let snitchWatcher = null;
  let activeSnitchRound = false;

  function readRoom() {
    try {
      if (typeof myRoom !== "undefined" && myRoom) return myRoom;
    } catch (error) {}

    const fromStorage = localStorage.getItem("jackbox_magico_room");
    if (fromStorage) return fromStorage.toUpperCase();

    const input = document.getElementById("m-room");
    if (input && input.value) return input.value.trim().toUpperCase();

    const params = new URLSearchParams(window.location.search);
    if (params.has("room")) return params.get("room").toUpperCase();

    return "";
  }

  function readName() {
    try {
      if (typeof myName !== "undefined" && myName) return myName;
    } catch (error) {}

    const fromStorage = localStorage.getItem("jackbox_magico_name");
    if (fromStorage) return fromStorage;

    const input = document.getElementById("m-name");
    if (input && input.value) return input.value.trim();

    return "";
  }

  function readIsHost() {
    try {
      if (typeof myIsHost !== "undefined") return Boolean(myIsHost);
    } catch (error) {}

    return false;
  }

  function getSnitchKey(state) {
    return `${state.phase}-${state.round_id || state.question || "snitch"}`;
  }

  function getSnitchTimeInfo(state) {
    const duration = Number(state.duration_seconds || 26);
    const startedAt = Number(state.started_at || Date.now() / 1000);
    const elapsed = Math.max(0, Date.now() / 1000 - startedAt);
    const left = Math.max(0, duration - elapsed);

    return {
      duration,
      elapsed,
      left,
      pct: duration > 0 ? Math.max(0, Math.min(1, left / duration)) : 0,
    };
  }

  function getAttemptCountFromState(state) {
    const attempts = state.attempts_by_player || {};
    const name = readName();
    const value = attempts[name];

    if (Array.isArray(value)) {
      return value.length;
    }

    return Number(value || 0);
  }

  function ensureSnitchPanel() {
    let panel = document.getElementById("snitch-mobile-panel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "snitch-mobile-panel";
      panel.className = "snitch-mobile-panel";

      const hostPanel = document.getElementById("host-game-panel");
      const parent = hostPanel?.parentElement || document.querySelector("#view-game .card");

      if (hostPanel && parent) {
        parent.insertBefore(panel, hostPanel);
      } else if (parent) {
        parent.appendChild(panel);
      }
    }

    return panel;
  }

  function hideOtherPanels() {
    const duelPanel = document.getElementById("duel-mobile-panel");
    const sombreroPanel = document.getElementById("sombrero-mobile-panel");
    const pocionesPanel = document.getElementById("pociones-mobile-panel");

    [duelPanel, sombreroPanel, pocionesPanel].forEach((panel) => {
      if (panel) {
        panel.classList.remove("visible");
        panel.innerHTML = "";
      }
    });

    const buttons = document.getElementById("m-botones");
    if (buttons) {
      buttons.innerHTML = "";
    }
  }

  function updateSnitchMobileTimer(state) {
    const timer = document.getElementById("mobile-timer");
    const bar = document.getElementById("mobile-timer-bar");

    if (!bar) return;

    const info = getSnitchTimeInfo(state);

    if (timer) {
      timer.style.display = "block";
    }

    bar.style.transform = `scaleX(${info.pct})`;

    const rounded = Math.ceil(info.left);

    if (rounded <= 3 && rounded > 0 && rounded !== snitchLastTick) {
      snitchLastTick = rounded;

      if (typeof MagicSound !== "undefined") {
        MagicSound.play("timer-danger");
      }
    }

    const status = document.getElementById("mobile-status");
    if (status) {
      status.innerText = `Tiempo restante: ${info.left.toFixed(1)}s · Intentos: ${snitchAttemptsUsed}/${state.attempts_total || 5}`;
    }
  }

  function renderCatchButton(panel, state) {
    const total = Number(state.attempts_total || 5);

    if (snitchAttemptsUsed >= total) {
      panel.innerHTML = `
        <div class="snitch-attempt-box">
          Usaste tus ${total} intentos. Mira la TV para ver quién atrapó oro y quién atrapó vergüenza.
        </div>
      `;

      return;
    }

    panel.innerHTML = `
      <button id="snitch-catch-button" class="snitch-catch-btn" onclick="sendSnitchCatch()">
        🏆 ¡ATRAPAR!
      </button>

      <div class="snitch-attempt-box" id="snitch-attempt-box">
        Intentos usados: ${snitchAttemptsUsed}/${total}
      </div>
    `;
  }

  function renderSnitchMobile(state) {
    if (typeof showScreen === "function") {
      showScreen("view-game");
    }

    if (typeof showHostPanels === "function") {
      showHostPanels(readIsHost());
    }

    hideOtherPanels();

    const key = getSnitchKey(state);
    const stateAttempts = getAttemptCountFromState(state);

    if (snitchLastKey !== key) {
      snitchLastKey = key;
      snitchLastTick = null;
      snitchCatchCooldown = false;
      snitchAttemptsUsed = stateAttempts;
      snitchRoundStartedMs = state.started_at ? Number(state.started_at) * 1000 : Date.now();

      if (typeof currentRoundStartedMs !== "undefined") {
        currentRoundStartedMs = snitchRoundStartedMs;
      }

      if (typeof MagicSound !== "undefined") {
        MagicSound.play("start");
      }
    } else {
      snitchAttemptsUsed = Math.max(snitchAttemptsUsed, stateAttempts);
    }

    const pill = document.getElementById("game-pill");
    const title = document.getElementById("m-pregunta-aviso");
    const question = document.getElementById("m-question-small");

    if (pill) pill.innerText = "🏆 Snitch";
    if (title) title.innerText = "¡Atrapa la Snitch!";
    if (question) {
      question.innerText = "La zona se mueve. La Snitch acelera. No caigas en señuelos.";
    }

    const panel = ensureSnitchPanel();
    panel.classList.add("visible");

    const total = Number(state.attempts_total || 5);
    const shouldRerender =
      panel.dataset.roundKey !== key ||
      panel.dataset.attempts !== String(snitchAttemptsUsed) ||
      !document.getElementById("snitch-catch-button");

    if (shouldRerender) {
      panel.dataset.roundKey = key;
      panel.dataset.attempts = String(snitchAttemptsUsed);
      renderCatchButton(panel, state);
    }

    if (snitchAttemptsUsed >= total) {
      renderCatchButton(panel, state);
    }

    updateSnitchMobileTimer(state);
  }

  async function postSnitchAttempt(room, name, elapsed) {
    const payloadDedicated = {
      room_code: room,
      player_name: name,
      client_elapsed_ms: elapsed,
    };

    const dedicated = await fetch("/api/player/snitch_catch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payloadDedicated),
    });

    if (dedicated.ok) {
      return dedicated;
    }

    const payloadFallback = {
      room_code: room,
      player_name: name,
      answer: "¡ATRAPAR!",
      client_elapsed_ms: elapsed,
    };

    return fetch("/api/player/submit_answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payloadFallback),
    });
  }

  window.sendSnitchCatch = async function sendSnitchCatch() {
    if (snitchCatchCooldown) return;

    const room = readRoom();
    const name = readName();

    const box = document.getElementById("snitch-attempt-box");
    const button = document.getElementById("snitch-catch-button");

    if (!room || !name) {
      if (box) {
        box.className = "snitch-attempt-box snitch-feedback-miss";
        box.textContent = "No se detectó sala o jugador. Recarga el celular y vuelve a entrar.";
      }

      return;
    }

    snitchCatchCooldown = true;

    if (button) {
      button.classList.add("cooldown");
    }

    const elapsed = Math.max(0, Date.now() - snitchRoundStartedMs);

    if (box) {
      box.className = "snitch-attempt-box";
      box.textContent = "Registrando intento...";
    }

    if (typeof MagicSound !== "undefined") {
      MagicSound.play("click");
    }

    try {
      const res = await postSnitchAttempt(room, name, elapsed);
      const data = await res.json();

      if (data.accepted) {
        snitchAttemptsUsed = Number(data.attempts_used || snitchAttemptsUsed + 1);

        const total = Number(data.attempts_total || 5);
        const grade = data.grade || "miss";
        const delta = typeof data.delta_ms === "number" ? ` · ${data.delta_ms} ms` : "";
        const precision = data.precision ? ` · Precisión ${data.precision}%` : "";

        if (box) {
          box.className = `snitch-attempt-box snitch-feedback-${grade}`;
          box.textContent =
            `${data.points > 0 ? "+" : ""}${data.points || 0} pts · ${data.message || "Intento registrado."}${delta}${precision} · Intentos: ${snitchAttemptsUsed}/${total}`;
        }

        const panel = ensureSnitchPanel();
        panel.dataset.attempts = String(snitchAttemptsUsed);

        if (typeof MagicSound !== "undefined") {
          MagicSound.play(data.points > 0 ? "correct" : "wrong");
        }
      } else if (box) {
        box.className = "snitch-attempt-box snitch-feedback-miss";
        box.textContent = data.message || "Intento no aceptado.";
      }
    } catch (error) {
      if (box) {
        box.className = "snitch-attempt-box snitch-feedback-miss";
        box.textContent = "Error de conexión al intentar atrapar la Snitch.";
      }

      if (typeof MagicSound !== "undefined") {
        MagicSound.play("wrong");
      }
    }

    setTimeout(() => {
      snitchCatchCooldown = false;

      if (button) {
        button.classList.remove("cooldown");
      }
    }, 180);
  };

  async function snitchIndependentWatcher() {
    const room = readRoom();

    if (!room) return;

    try {
      const res = await fetch(`/api/room/${room}/status`);
      if (!res.ok) return;

      const data = await res.json();
      const state = data.game_state || {};
      const phase = state.phase || "";

      if (phase === "atrapa_snitch") {
        activeSnitchRound = true;
        renderSnitchMobile(state);
        return;
      }

      if (activeSnitchRound && phase !== "atrapa_snitch") {
        activeSnitchRound = false;

        const panel = document.getElementById("snitch-mobile-panel");
        if (panel) {
          panel.classList.remove("visible");
          panel.innerHTML = "";
        }
      }
    } catch (error) {}
  }

  if (!snitchWatcher) {
    snitchWatcher = setInterval(snitchIndependentWatcher, 420);
  }

  const originalRenderMobileGame = window.renderMobileGame;
  const originalRenderResultsWait = window.renderResultsWait;
  const originalRenderLobbyWait = window.renderLobbyWait;

  window.renderMobileGame = function patchedRenderMobileGame(state) {
    if (state.phase === "atrapa_snitch") {
      renderSnitchMobile(state);
      return;
    }

    if (typeof originalRenderMobileGame === "function") {
      originalRenderMobileGame(state);
    }
  };

  window.renderResultsWait = function patchedRenderResultsWait() {
    const panel = document.getElementById("snitch-mobile-panel");

    if (panel) {
      panel.classList.remove("visible");
      panel.innerHTML = "";
    }

    if (typeof originalRenderResultsWait === "function") {
      originalRenderResultsWait();
    }
  };

  window.renderLobbyWait = function patchedRenderLobbyWait(data) {
    const panel = document.getElementById("snitch-mobile-panel");

    if (panel) {
      panel.classList.remove("visible");
      panel.innerHTML = "";
    }

    if (typeof originalRenderLobbyWait === "function") {
      originalRenderLobbyWait(data);
    }
  };
})();