(function () {
  let snitchLastKey = "";
  let snitchLastTick = null;
  let snitchCatchCooldown = false;
  let snitchAttemptsUsed = 0;
  let snitchWatcher = null;
  let activeSnitchRound = false;

  function getSafeGlobal(name, fallback = null) {
    try {
      if (typeof window[name] !== "undefined") return window[name];
    } catch (error) {}

    try {
      return eval(`typeof ${name} !== "undefined" ? ${name} : fallback`);
    } catch (error) {
      return fallback;
    }
  }

  function readMyRoom() {
    try {
      return typeof myRoom !== "undefined" ? myRoom : "";
    } catch (error) {
      return "";
    }
  }

  function readMyName() {
    try {
      return typeof myName !== "undefined" ? myName : "";
    } catch (error) {
      return "";
    }
  }

  function readMyIsHost() {
    try {
      return typeof myIsHost !== "undefined" ? myIsHost : false;
    } catch (error) {
      return false;
    }
  }

  function setCurrentRoundStarted(ms) {
    try {
      currentRoundStartedMs = ms;
    } catch (error) {}
  }

  function getCurrentRoundStarted() {
    try {
      return typeof currentRoundStartedMs !== "undefined" ? currentRoundStartedMs : Date.now();
    } catch (error) {
      return Date.now();
    }
  }

  function getSnitchKey(state) {
    return `${state.phase}-${state.round_id || state.question || "snitch"}`;
  }

  function getSnitchTimeInfo(state) {
    const duration = Number(state.duration_seconds || 24);
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
    const name = readMyName();
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

    const botones = document.getElementById("m-botones");
    if (botones) botones.innerHTML = "";
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

  function renderSnitchMobile(state) {
    if (typeof showScreen === "function") {
      showScreen("view-game");
    }

    if (typeof showHostPanels === "function") {
      showHostPanels(readMyIsHost());
    }

    hideOtherPanels();

    const key = getSnitchKey(state);

    if (snitchLastKey !== key) {
      snitchLastKey = key;
      snitchLastTick = null;
      snitchCatchCooldown = false;
      snitchAttemptsUsed = getAttemptCountFromState(state);
      setCurrentRoundStarted(state.started_at ? Number(state.started_at) * 1000 : Date.now());

      if (typeof MagicSound !== "undefined") {
        MagicSound.play("start");
      }
    } else {
      snitchAttemptsUsed = Math.max(snitchAttemptsUsed, getAttemptCountFromState(state));
    }

    const total = Number(state.attempts_total || 5);

    const pill = document.getElementById("game-pill");
    const title = document.getElementById("m-pregunta-aviso");
    const question = document.getElementById("m-question-small");

    if (pill) pill.innerText = "🏆 Snitch";
    if (title) title.innerText = "¡Atrapa la Snitch!";
    if (question) {
      question.innerText = "Presiona justo cuando cruce la zona iluminada. Cuidado con las sombras falsas.";
    }

    const panel = ensureSnitchPanel();
    panel.classList.add("visible");

    if (snitchAttemptsUsed >= total) {
      panel.innerHTML = `
        <div class="snitch-attempt-box">
          Usaste tus ${total} intentos. Mira la TV para ver quién atrapó oro y quién atrapó vergüenza.
        </div>
      `;

      updateSnitchMobileTimer(state);
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

    updateSnitchMobileTimer(state);
  }

  window.sendSnitchCatch = async function sendSnitchCatch() {
    if (snitchCatchCooldown) return;

    const room = readMyRoom();
    const name = readMyName();

    if (!room || !name) {
      const box = document.getElementById("snitch-attempt-box");
      if (box) {
        box.className = "snitch-attempt-box snitch-feedback-miss";
        box.textContent = "No se detectó sala o jugador. Recarga el celular y vuelve a entrar.";
      }
      return;
    }

    snitchCatchCooldown = true;

    const button = document.getElementById("snitch-catch-button");
    const box = document.getElementById("snitch-attempt-box");

    if (button) {
      button.classList.add("cooldown");
    }

    const elapsed = Math.max(0, Date.now() - getCurrentRoundStarted());

    if (box) {
      box.className = "snitch-attempt-box";
      box.textContent = "Registrando intento...";
    }

    if (typeof MagicSound !== "undefined") {
      MagicSound.play("click");
    }

    try {
      const res = await fetch("/api/player/snitch_catch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room_code: room,
          player_name: name,
          client_elapsed_ms: elapsed,
        }),
      });

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
    }, 220);
  };

  async function snitchIndependentWatcher() {
    const room = readMyRoom();

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