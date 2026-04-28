(function () {
  let snitchLastKey = "";
  let snitchLastTick = null;
  let snitchCatchCooldown = false;
  let snitchAttemptsUsed = 0;

  function getSnitchKey(state) {
    return `${state.phase}-${state.round_id || state.question || "snitch"}`;
  }

  function getSnitchTimeInfo(state) {
    const duration = Number(state.duration_seconds || 23);
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
    const value = attempts[myName];

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

    document.getElementById("m-botones").innerHTML = "";
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
      showHostPanels(myIsHost);
    }

    hideOtherPanels();

    const key = getSnitchKey(state);

    if (snitchLastKey !== key) {
      snitchLastKey = key;
      snitchLastTick = null;
      snitchCatchCooldown = false;
      snitchAttemptsUsed = getAttemptCountFromState(state);
      currentRoundStartedMs = state.started_at ? Number(state.started_at) * 1000 : Date.now();

      if (typeof MagicSound !== "undefined") {
        MagicSound.play("start");
      }
    } else {
      snitchAttemptsUsed = Math.max(snitchAttemptsUsed, getAttemptCountFromState(state));
    }

    const total = Number(state.attempts_total || 5);

    document.getElementById("game-pill").innerText = "🏆 Snitch";
    document.getElementById("m-pregunta-aviso").innerText = "¡Atrapa la Snitch!";
    document.getElementById("m-question-small").innerText =
      "Presiona justo cuando cruce la zona iluminada en la TV.";

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
      <button class="snitch-catch-btn" onclick="sendSnitchCatch()">
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

    snitchCatchCooldown = true;

    const elapsed = Math.max(0, Date.now() - currentRoundStartedMs);
    const box = document.getElementById("snitch-attempt-box");

    if (box) {
      box.textContent = "Registrando intento...";
    }

    if (typeof MagicSound !== "undefined") {
      MagicSound.play("click");
    }

    try {
      const res = await fetch("/api/player/submit_answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room_code: myRoom,
          player_name: myName,
          answer: "¡ATRAPAR!",
          client_elapsed_ms: elapsed,
        }),
      });

      const data = await res.json();

      if (data.accepted) {
        snitchAttemptsUsed = Number(data.attempts_used || snitchAttemptsUsed + 1);

        const feedbackText =
          `${data.points > 0 ? "+" : ""}${data.points || 0} pts · ${data.message || "Intento registrado."}`;

        if (box) {
          box.textContent = `${feedbackText} · Intentos: ${snitchAttemptsUsed}/${data.attempts_total || 5}`;
        }

        if (typeof MagicSound !== "undefined") {
          MagicSound.play(data.points > 0 ? "correct" : "wrong");
        }
      } else if (box) {
        box.textContent = data.message || "Intento no aceptado.";
      }
    } catch (error) {
      if (box) {
        box.textContent = "Error de conexión al intentar atrapar la Snitch.";
      }

      if (typeof MagicSound !== "undefined") {
        MagicSound.play("wrong");
      }
    }

    setTimeout(() => {
      snitchCatchCooldown = false;
    }, 280);
  };

  const originalRenderMobileGame = window.renderMobileGame;
  const originalRenderResultsWait = window.renderResultsWait;
  const originalRenderLobbyWait = window.renderLobbyWait;

  window.renderMobileGame = function patchedRenderMobileGame(state) {
    if (state.phase === "atrapa_snitch") {
      renderSnitchMobile(state);
      return;
    }

    originalRenderMobileGame(state);
  };

  window.renderResultsWait = function patchedRenderResultsWait() {
    const panel = document.getElementById("snitch-mobile-panel");

    if (panel) {
      panel.classList.remove("visible");
      panel.innerHTML = "";
    }

    originalRenderResultsWait();
  };

  window.renderLobbyWait = function patchedRenderLobbyWait(data) {
    const panel = document.getElementById("snitch-mobile-panel");

    if (panel) {
      panel.classList.remove("visible");
      panel.innerHTML = "";
    }

    originalRenderLobbyWait(data);
  };
})();