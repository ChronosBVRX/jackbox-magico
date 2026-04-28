(() => {
  const answerLetters = ["A", "B", "C", "D"];

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

  function getRoomCodeSafe() {
    if (window.MobileRoomGuard) {
      return window.MobileRoomGuard.getSafeRoomCode();
    }

    const inputRoom = document.getElementById("m-room")?.value?.trim().toUpperCase() || "";
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get("room")?.trim().toUpperCase() || "";
    const savedRoom = localStorage.getItem("jackbox_magico_room") || "";

    return inputRoom || urlRoom || savedRoom;
  }

  function getPlayerNameSafe() {
    if (window.MobileRoomGuard) {
      return window.MobileRoomGuard.getSafePlayerName();
    }

    const inputName = document.getElementById("m-name")?.value?.trim() || "";
    const savedName = localStorage.getItem("jackbox_magico_name") || "";

    return inputName || savedName;
  }

  function getClueInfo(state) {
    const clueSeconds = Number(state.clue_seconds || 8);
    const duration = Number(state.duration_seconds || clueSeconds * 3 || 24);
    const startedAt = Number(state.started_at || Date.now() / 1000);
    const elapsed = Math.max(0, Date.now() / 1000 - startedAt);
    const clueIndex = Math.min(2, Math.floor(elapsed / clueSeconds));
    const timeLeft = Math.max(0, duration - elapsed);

    return {
      clueIndex,
      clueNumber: clueIndex + 1,
      timeLeft,
      progress: Math.max(0, Math.min(1, timeLeft / duration)),
    };
  }

  function ensureRetratosPanel() {
    let panel = document.getElementById("retratos-mobile-panel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "retratos-mobile-panel";
      panel.className = "retratos-mobile-panel";

      const buttons = document.getElementById("m-botones");

      if (buttons && buttons.parentElement) {
        buttons.parentElement.insertBefore(panel, buttons.nextSibling);
      } else {
        const card = document.querySelector("#view-game .card");
        if (card) card.appendChild(panel);
      }
    }

    return panel;
  }

  function hideOtherPanels() {
    [
      "trivia-mobile-panel",
      "duel-mobile-panel",
      "sombrero-mobile-panel",
      "pociones-mobile-panel",
      "snitch-mobile-panel",
    ].forEach((id) => {
      const panel = document.getElementById(id);

      if (panel) {
        panel.classList.remove("visible");
        panel.innerHTML = "";
      }
    });
  }

  async function sendRetratosAnswer(answer, clickedButton) {
    const roomCode = getRoomCodeSafe();
    const playerName = getPlayerNameSafe();

    if (!roomCode) {
      alert("No hay código de sala. Vuelve a entrar escaneando el QR de la TV.");
      return;
    }

    if (!playerName) {
      alert("Falta tu nombre. Regresa y entra otra vez a la sala.");
      return;
    }

    const elapsed =
      typeof currentRoundStartedMs !== "undefined"
        ? Math.max(0, Date.now() - currentRoundStartedMs)
        : 0;

    document.querySelectorAll(".retratos-answer-btn").forEach((btn) => {
      btn.disabled = true;
      btn.classList.add("locked");
    });

    if (clickedButton) {
      clickedButton.innerText = "Respuesta enviada...";
    }

    try {
      const response = await fetch("/api/player/submit_answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          room_code: roomCode,
          player_name: playerName,
          answer: answer,
          client_elapsed_ms: elapsed,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("Error submit_answer:", response.status, data);
        alert("No se pudo enviar la respuesta. Revisa consola.");
        return;
      }

      try {
        hasAnsweredCurrentRound = true;
      } catch (error) {
        window.hasAnsweredCurrentRound = true;
      }

      const status = document.getElementById("mobile-status");
      if (status) {
        if (data.correct) {
          status.innerText = `¡Correcto! +${data.points || 0} puntos`;
        } else {
          status.innerText = "Respuesta enviada. Mira la TV.";
        }
      }

      if (typeof renderAnsweredWait === "function") {
        setTimeout(() => {
          renderAnsweredWait({});
        }, 450);
      }
    } catch (error) {
      console.error("Error enviando respuesta Retratos:", error);
      alert("Error de conexión al enviar respuesta.");
    }
  }

  function getHasAnsweredFlag() {
    try {
      return Boolean(hasAnsweredCurrentRound);
    } catch (error) {
      return Boolean(window.hasAnsweredCurrentRound);
    }
  }

  function setRoundRuntime(key, startedMs) {
    try {
      currentRoundKey = key;
    } catch (error) {
      window.currentRoundKey = key;
    }

    try {
      currentRoundStartedMs = startedMs;
    } catch (error) {
      window.currentRoundStartedMs = startedMs;
    }

    try {
      hasAnsweredCurrentRound = false;
    } catch (error) {
      window.hasAnsweredCurrentRound = false;
    }
  }

  function renderRetratosMobile(state) {
    if (typeof showScreen === "function") {
      showScreen("view-game");
    }

    if (typeof showHostPanels === "function") {
      const hostFlag =
        typeof myIsHost !== "undefined"
          ? myIsHost
          : Boolean(window.myIsHost);

      showHostPanels(hostFlag);
    }

    hideOtherPanels();

    const buttons = document.getElementById("m-botones");
    if (buttons) buttons.innerHTML = "";

    const answered = state.answered || {};
    const playerName = getPlayerNameSafe();

    if (answered[playerName] || getHasAnsweredFlag()) {
      if (typeof renderAnsweredWait === "function") {
        renderAnsweredWait(state);
      }

      return;
    }

    const key = `${state.phase}-${state.round_id || state.question || "retratos"}`;
    const currentKeyValue =
      typeof currentRoundKey !== "undefined"
        ? currentRoundKey
        : window.currentRoundKey;

    if (key !== currentKeyValue) {
      const startedMs = state.started_at
        ? Number(state.started_at) * 1000
        : Date.now();

      setRoundRuntime(key, startedMs);

      if (typeof safeSound === "function") {
        safeSound("start");
      }

      if (typeof vibrate === "function") {
        vibrate([25, 40, 25]);
      }
    }

    const info = getClueInfo(state);
    const pistas = state.pistas || [state.question || "El retrato está pensando..."];
    const activeClue =
      pistas[info.clueIndex] ||
      pistas[pistas.length - 1] ||
      state.question ||
      "";

    const pointsByClue = state.points_by_clue || {
      1: 150,
      2: 100,
      3: 60,
    };

    const options = state.options || [];

    const gamePill = document.getElementById("game-pill");
    const aviso = document.getElementById("m-pregunta-aviso");
    const small = document.getElementById("m-question-small");
    const timer = document.getElementById("mobile-timer");
    const status = document.getElementById("mobile-status");
    const bar = document.getElementById("mobile-timer-bar");

    if (gamePill) gamePill.innerText = "🖼️ Retratos";
    if (aviso) aviso.innerText = "¡El retrato está chismeando!";
    if (small) {
      small.innerText = `Pista ${info.clueNumber}/3 · ${state.categoria || "Misterio"}`;
    }

    if (timer) timer.style.display = "block";

    if (status) {
      status.innerText = `Pista ${info.clueNumber}: +${Number(pointsByClue[info.clueNumber] || 60)} · rápido correcto +30`;
    }

    if (bar) {
      bar.style.transform = `scaleX(${info.progress})`;
    }

    const panel = ensureRetratosPanel();
    panel.classList.add("visible");

    panel.innerHTML = `
      <div class="retratos-mobile-card">
        <div class="retratos-pill" style="width:max-content;margin-bottom:10px;">
          🖼️ ${escapeHTML(state.categoria || "Misterio")}
        </div>

        <h2 class="retratos-mobile-title">
          ${escapeHTML(state.title || "Retratos Chismosos")}
        </h2>

        <p class="retratos-mobile-clue">
          “${escapeHTML(activeClue)}”
        </p>

        <div class="retratos-mobile-options" id="retratos-mobile-options"></div>
      </div>
    `;

    const optionsBox = document.getElementById("retratos-mobile-options");

    options.forEach((option, index) => {
      const btn = document.createElement("button");
      btn.className = "retratos-answer-btn option-btn";
      btn.type = "button";

      btn.innerHTML = `
        <span class="retratos-answer-letter">${answerLetters[index] || "?"}</span>
        <span style="font-weight:950;line-height:1.12;">${escapeHTML(option)}</span>
      `;

      btn.addEventListener("click", () => {
        sendRetratosAnswer(option, btn);
      });

      optionsBox.appendChild(btn);
    });
  }

  function installRetratosMobilePatch() {
    const originalRenderMobileGame = window.renderMobileGame;

    if (typeof originalRenderMobileGame === "function") {
      window.renderMobileGame = function patchedRenderMobileGame(state) {
        if ((state?.phase || "") === "retratos_chismosos") {
          renderRetratosMobile(state);
          return;
        }

        return originalRenderMobileGame.apply(this, arguments);
      };
    }

    window.renderRetratosMobile = renderRetratosMobile;
    window.sendRetratosAnswer = sendRetratosAnswer;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installRetratosMobilePatch);
  } else {
    installRetratosMobilePatch();
  }
})();
