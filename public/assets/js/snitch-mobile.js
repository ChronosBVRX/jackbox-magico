(function () {
  const VERSION = "snitch-mobile-v4";

  let snitchLastKey = "";
  let snitchLastTick = null;
  let snitchCatchCooldown = false;
  let snitchAttemptsUsed = 0;
  let snitchRoundStartedMs = Date.now();
  let watcherStarted = false;
  let snitchWasActive = false;

  function playSound(name) {
    try {
      if (typeof MagicSound !== "undefined" && MagicSound.play) {
        MagicSound.play(name);
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

    if (Array.isArray(value)) return value.length;
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
    const panels = [
      document.getElementById("duel-mobile-panel"),
      document.getElementById("sombrero-mobile-panel"),
      document.getElementById("pociones-mobile-panel"),
    ];

    panels.forEach((panel) => {
      if (panel) {
        panel.classList.remove("visible");
        panel.innerHTML = "";
      }
    });

    const buttons = document.getElementById("m-botones");
    if (buttons) buttons.innerHTML = "";
  }

  function renderCatchButton(panel, state) {
    const total = Number(state.attempts_total || 5);

    if (snitchAttemptsUsed >= total) {
      panel.innerHTML = `
        <div class="snitch-attempt-box snitch-feedback-done">
          🏁 Usaste tus ${total} intentos.<br>
          Mira la TV para ver quién atrapó oro y quién atrapó vergüenza.
        </div>
      `;
      return;
    }

    panel.innerHTML = `
      <div class="snitch-mobile-orb">
        <span></span>
      </div>

      <button id="snitch-catch-button" class="snitch-catch-btn" onclick="sendSnitchCatch()">
        🏆 ¡ATRAPAR!
      </button>

      <div class="snitch-attempt-box" id="snitch-attempt-box">
        Intentos usados: ${snitchAttemptsUsed}/${total}
      </div>

      <div class="snitch-mobile-help">
        Toca cuando la Snitch cruce la zona dorada de la TV. Cuidado con los señuelos.
      </div>
    `;
  }

  window.updateMobileSnitchTimer = function updateMobileSnitchTimer(state) {
    const timer = document.getElementById("mobile-timer");
    const bar = document.getElementById("mobile-timer-bar");

    if (!bar) return;

    const info = getSnitchTimeInfo(state);

    if (timer) timer.style.display = "block";

    bar.style.transform = `scaleX(${info.pct})`;

    const rounded = Math.ceil(info.left);

    if (rounded <= 3 && rounded > 0 && rounded !== snitchLastTick) {
      snitchLastTick = rounded;
      playSound("timer-danger");
      vibrate(40);
    }

    const status = document.getElementById("mobile-status");
    if (status) {
      status.innerText = `Tiempo restante: ${info.left.toFixed(1)}s · Intentos: ${snitchAttemptsUsed}/${state.attempts_total || 5}`;
    }
  };

  window.renderSnitchMobile = function renderSnitchMobile(state) {
    snitchWasActive = true;

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

      try {
        if (typeof currentRoundStartedMs !== "undefined") {
          currentRoundStartedMs = snitchRoundStartedMs;
        }
      } catch (error) {}

      playSound("start");
      vibrate([40, 50, 40]);
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
      panel.dataset.version !== VERSION ||
      panel.dataset.roundKey !== key ||
      panel.dataset.attempts !== String(snitchAttemptsUsed) ||
      !document.getElementById("snitch-catch-button");

    if (shouldRerender) {
      panel.dataset.version = VERSION;
      panel.dataset.roundKey = key;
      panel.dataset.attempts = String(snitchAttemptsUsed);
      renderCatchButton(panel, state);
    }

    if (snitchAttemptsUsed >= total) {
      renderCatchButton(panel, state);
    }

    window.updateMobileSnitchTimer(state);
  };

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
      cache: "no-store",
      body: JSON.stringify(payloadDedicated),
    });

    if (dedicated.ok) return dedicated;

    return fetch("/api/player/submit_answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        room_code: room,
        player_name: name,
        answer: "¡ATRAPAR!",
        client_elapsed_ms: elapsed,
      }),
    });
  }

  async function refreshSnitchState() {
    const room = readRoom();
    if (!room) return;

    try {
      const res = await fetch(`/api/room/${room}/status?ts=${Date.now()}`, {
        cache: "no-store",
      });

      if (!res.ok) return;

      const data = await res.json();
      const state = data.game_state || {};

      if (data.status === "playing" && state.phase === "atrapa_snitch") {
        window.renderSnitchMobile(state);
      }
    } catch (error) {}
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

      playSound("wrong");
      vibrate([80, 50, 80]);
      return;
    }

    snitchCatchCooldown = true;

    if (button) {
      button.classList.add("cooldown");
      button.disabled = true;
    }

    const elapsed = Math.max(0, Date.now() - snitchRoundStartedMs);

    if (box) {
      box.className = "snitch-attempt-box snitch-feedback-loading";
      box.textContent = "Registrando intento...";
    }

    playSound("click");
    vibrate(25);

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

        playSound(data.points > 0 ? "correct" : "wrong");
        vibrate(data.points > 0 ? [35, 40, 35] : [90]);
      } else if (box) {
        box.className = "snitch-attempt-box snitch-feedback-miss";
        box.textContent = data.message || "Intento no aceptado.";
        playSound("wrong");
        vibrate([80, 50, 80]);
      }

      await refreshSnitchState();
    } catch (error) {
      if (box) {
        box.className = "snitch-attempt-box snitch-feedback-miss";
        box.textContent = "Error de conexión al intentar atrapar la Snitch.";
      }

      playSound("wrong");
      vibrate([80, 50, 80]);
    }

    setTimeout(() => {
      snitchCatchCooldown = false;

      if (button) {
        button.classList.remove("cooldown");
        button.disabled = false;
      }
    }, 220);
  };

  async function independentSnitchWatcher() {
    const room = readRoom();

    if (!room) return;

    try {
      const res = await fetch(`/api/room/${room}/status?ts=${Date.now()}`, {
        cache: "no-store",
      });

      if (!res.ok) return;

      const data = await res.json();
      const state = data.game_state || {};
      const phase = state.phase || "lobby";

      if (data.status === "playing" && phase === "atrapa_snitch") {
        window.renderSnitchMobile(state);
        return;
      }

      if (snitchWasActive && phase !== "atrapa_snitch") {
        snitchWasActive = false;

        const panel = document.getElementById("snitch-mobile-panel");
        if (panel) {
          panel.classList.remove("visible");
          panel.innerHTML = "";
        }
      }
    } catch (error) {}
  }

  if (!watcherStarted) {
    watcherStarted = true;
    setInterval(independentSnitchWatcher, 550);
  }
})();