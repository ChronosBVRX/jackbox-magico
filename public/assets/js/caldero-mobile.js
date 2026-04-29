(() => {
  const CALDERO_PHASE = "caldero_mentiroso";
  const CALDERO_RESULTS = "results_caldero_mentiroso";
  let lastLoadedRound = "";
  let playerViewCache = null;
  let loadingView = false;
  let submitting = false;

  const originalHideGamePanels = window.hideGamePanels;
  const originalRenderResultsWait = window.renderResultsWait;
  const originalHostRevealResults = window.hostRevealResults;

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function attr(value) {
    return esc(value).replaceAll("`", "&#096;");
  }

  function getGlobals() {
    return {
      room: typeof myRoom !== "undefined" ? myRoom : "",
      name: typeof myName !== "undefined" ? myName : "",
      isHost: typeof myIsHost !== "undefined" ? myIsHost : false,
      hostToken: typeof myHostToken !== "undefined" ? myHostToken : "",
    };
  }

  function ensurePanel() {
    let panel = document.getElementById("caldero-mobile-panel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "caldero-mobile-panel";
      panel.className = "trivia-mobile-panel caldero-mobile-panel-wrap";

      const hostGamePanel = document.getElementById("host-game-panel");
      const card = document.querySelector("#view-game .card");

      if (hostGamePanel && hostGamePanel.parentElement) {
        hostGamePanel.parentElement.insertBefore(panel, hostGamePanel);
      } else if (card) {
        card.appendChild(panel);
      }
    }

    return panel;
  }

  function setStatus(message, type = "") {
    const status = document.getElementById("caldero-mobile-status");
    if (!status) return;

    status.className = `caldero-mobile-status ${type}`.trim();
    status.textContent = message;
  }

  function safePlay(name) {
    try {
      if (typeof safeSound === "function") safeSound(name);
      else if (window.MagicSound?.play) window.MagicSound.play(name);
    } catch (error) {}
  }

  function safeBuzz(pattern) {
    try {
      if (typeof vibrate === "function") vibrate(pattern);
      else if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (error) {}
  }

  async function fetchPlayerView(state) {
    const { room, name } = getGlobals();
    if (!room || !name || loadingView) return playerViewCache;

    loadingView = true;

    try {
      const res = await fetch("/api/caldero/player_view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_code: room, player_name: name }),
      });

      const data = await res.json();

      if (res.ok) {
        playerViewCache = data;
        return data;
      }

      console.warn("No se pudo cargar ingrediente:", data);
    } catch (error) {
      console.warn("No se pudo conectar con el caldero", error);
    } finally {
      loadingView = false;
    }

    return playerViewCache || {
      ingredient: null,
      players: [],
      already_submitted: false,
      submitted_count: Object.keys(state.answers || {}).length,
      total_players: 0,
    };
  }

  function remainingSeconds(state) {
    const duration = Number(state.submit_seconds || 70);
    const started = Number(state.started_at || Date.now() / 1000) * 1000;
    const elapsed = Math.max(0, Date.now() - started) / 1000;
    return Math.max(0, duration - elapsed);
  }

  function updateTimer(state) {
    const timer = document.getElementById("mobile-timer");
    const bar = document.getElementById("mobile-timer-bar");
    if (!timer || !bar) return;

    timer.style.display = "block";
    const duration = Number(state.submit_seconds || 70);
    const left = remainingSeconds(state);
    const pct = Math.max(0, Math.min(1, left / duration));
    bar.style.transform = `scaleX(${pct})`;

    const baseStatus = document.getElementById("mobile-status");
    if (baseStatus && !playerViewCache?.already_submitted) {
      baseStatus.textContent = `Tiempo restante: ${left.toFixed(1)}s`;
    }
  }

  function targetOptions(view) {
    const { name } = getGlobals();
    const players = (view.players || []).filter((player) => player.name && player.name !== name);

    if (!players.length) {
      return `<option value="">No hay a quién acusar todavía</option>`;
    }

    return [
      `<option value="">Elige sospechoso...</option>`,
      ...players.map((player) => `<option value="${attr(player.name)}">${esc(player.name)} · ${esc(player.house || "Sin casa")}</option>`),
    ].join("");
  }

  function renderAnswered(view) {
    const ingredient = view.ingredient || {};
    const action = view.my_action?.action || "decisión registrada";
    const labels = {
      meter: "Metiste tu ingrediente al caldero",
      descartar: "Descartaste tu ingrediente",
      acusar: `Acusaste a ${view.my_action?.target || "alguien"}`,
    };

    return `
      <div class="caldero-mobile-card">
        <div class="caldero-mobile-secret">
          <div class="caldero-mobile-emoji">${esc(ingredient.emoji || "🧪")}</div>
          <div class="caldero-mobile-type">${esc(ingredient.label || "Ingrediente")}</div>
          <h2 class="caldero-mobile-name">${esc(ingredient.name || "Ingrediente misterioso")}</h2>
          <p class="caldero-mobile-tone">${esc(labels[action] || "Tu decisión fue registrada.")}</p>
        </div>
        <div class="caldero-mobile-status good" style="margin-top:12px;">
          Mira la TV. Nadie sabrá la verdad hasta que el caldero hable.
        </div>
      </div>
    `;
  }

  function renderControls(view) {
    const ingredient = view.ingredient || {};

    return `
      <div class="caldero-mobile-card">
        <div class="caldero-mobile-secret">
          <div class="caldero-mobile-emoji">${esc(ingredient.emoji || "🧪")}</div>
          <div class="caldero-mobile-type">${esc(ingredient.label || "Ingrediente")} · ${Number(ingredient.effect || 0) > 0 ? "+" : ""}${Number(ingredient.effect || 0)} estabilidad</div>
          <h2 class="caldero-mobile-name">${esc(ingredient.name || "Ingrediente misterioso")}</h2>
          <p class="caldero-mobile-tone">${esc(ingredient.tone || "El caldero te mira raro. Tú sabrás.")}</p>
        </div>

        <div class="caldero-mobile-actions">
          <button class="caldero-action-btn meter" onclick="calderoSubmitAction('meter')">
            <strong>🧪 Meter al caldero</strong>
            <span>Arriesga la poción. Ideal si quieres gloria... o caos.</span>
          </button>

          <button class="caldero-action-btn discard" onclick="calderoSubmitAction('descartar')">
            <strong>🗑️ Descartar</strong>
            <span>Jugada defensiva. Nadie sabrá si salvaste la clase o tiraste oro.</span>
          </button>

          <div>
            <select id="caldero-target" class="caldero-target-select">
              ${targetOptions(view)}
            </select>
            <button class="caldero-action-btn accuse" style="margin-top:10px;" onclick="calderoSubmitAction('acusar')">
              <strong>☝️ Acusar a otro jugador</strong>
              <span>Si detectas un explosivo metido al caldero, ganas puntos.</span>
            </button>
          </div>
        </div>

        <div id="caldero-mobile-status" class="caldero-mobile-status">
          Pueden mentir, claro. No sería la primera vez que un mago finge inocencia.
        </div>
      </div>
    `;
  }

  async function renderCalderoMobile(state) {
    if (typeof showScreen === "function") showScreen("view-game");
    if (typeof showHostPanels === "function") showHostPanels(getGlobals().isHost);

    if (typeof hideGamePanels === "function") {
      // Evita borrar nuestro panel después de crearlo.
      const panel = document.getElementById("caldero-mobile-panel");
      if (panel) panel.dataset.keep = "1";
    }

    const buttons = document.getElementById("m-botones");
    if (buttons) buttons.innerHTML = "";

    const roundKey = state.round_id || "caldero";
    if (roundKey !== lastLoadedRound) {
      lastLoadedRound = roundKey;
      playerViewCache = null;
      safePlay("start");
      safeBuzz([25, 40, 25]);
    }

    const title = document.getElementById("m-pregunta-aviso");
    const small = document.getElementById("m-question-small");
    const pill = document.getElementById("game-pill");

    if (pill) pill.textContent = "🧪 Caldero Mentiroso";
    if (title) title.textContent = "Tu ingrediente es secreto";
    if (small) small.textContent = "Miente, acusa o salva la poción. La TV no revela tu ingrediente.";

    updateTimer(state);

    const panel = ensurePanel();
    panel.classList.add("visible");

    if (!playerViewCache) {
      panel.innerHTML = `
        <div class="caldero-mobile-card">
          <div class="caldero-mobile-status">Consultando tu ingrediente secreto...</div>
        </div>
      `;
    }

    const view = await fetchPlayerView(state);

    if (view.already_submitted) {
      panel.innerHTML = renderAnswered(view);
    } else {
      panel.innerHTML = renderControls(view);
    }

    const status = document.getElementById("mobile-status");
    if (status) {
      status.textContent = `${Number(view.submitted_count || 0)}/${Number(view.total_players || 0)} jugadores ya decidieron.`;
    }
  }

  window.calderoSubmitAction = async function calderoSubmitAction(action) {
    if (submitting) return;

    const { room, name } = getGlobals();
    const target = document.getElementById("caldero-target")?.value || "";

    if (action === "acusar" && !target) {
      setStatus("Elige a quién acusar. La paranoia sin destinatario no puntúa.", "bad");
      safeBuzz(45);
      return;
    }

    submitting = true;
    setStatus("Enviando tu decisión al caldero...", "");

    try {
      const res = await fetch("/api/caldero/submit_action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_code: room,
          player_name: name,
          action,
          target_name: action === "acusar" ? target : null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.accepted) {
        setStatus(data.detail || data.message || "No se pudo registrar la acción.", "bad");
        safeBuzz(55);
        return;
      }

      playerViewCache = {
        ...(playerViewCache || {}),
        already_submitted: true,
        my_action: { action, target },
      };

      safePlay("success");
      safeBuzz([20, 30, 20]);
      setStatus(data.message || "Decisión registrada.", "good");

      const panel = ensurePanel();
      panel.innerHTML = renderAnswered(playerViewCache);
    } catch (error) {
      setStatus("Error de conexión con el caldero.", "bad");
      safeBuzz(55);
    } finally {
      submitting = false;
    }
  };

  async function revealCalderoResults() {
    const { room, name, hostToken } = getGlobals();
    if (!room || !name || !hostToken) return false;

    try {
      const res = await fetch(`/api/caldero/reveal_results/${encodeURIComponent(room)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_name: name,
          host_token: hostToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.accepted) {
        alert("No se pudo revelar el caldero: " + JSON.stringify(data.detail || data));
        return true;
      }

      safePlay("success");
      return true;
    } catch (error) {
      alert("Error de conexión al revelar el Caldero Mentiroso.");
      return true;
    }
  }

  window.hostRevealResults = async function patchedHostRevealResults() {
    try {
      const { room } = getGlobals();
      if (room) {
        const res = await fetch(`/api/room/${encodeURIComponent(room)}/status?ts=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const phase = data.game_state?.phase;
          if (phase === CALDERO_PHASE || phase === CALDERO_RESULTS) {
            await revealCalderoResults();
            return;
          }
        }
      }
    } catch (error) {}

    if (typeof originalHostRevealResults === "function") {
      originalHostRevealResults();
    }
  };

  window.hideGamePanels = function patchedHideGamePanels() {
    if (typeof originalHideGamePanels === "function") {
      originalHideGamePanels();
    }

    const panel = document.getElementById("caldero-mobile-panel");
    if (panel && panel.dataset.keep !== "1") {
      panel.classList.remove("visible");
      panel.innerHTML = "";
    }
    if (panel) delete panel.dataset.keep;
  };

  window.renderResultsWait = function patchedResultsWait(state = {}) {
    if (state.phase === CALDERO_RESULTS) {
      if (typeof showScreen === "function") showScreen("view-wait");
      if (typeof hideGamePanels === "function") hideGamePanels();
      if (typeof showHostPanels === "function") showHostPanels(getGlobals().isHost);

      const pill = document.getElementById("wait-pill");
      const msg = document.getElementById("wait-msg");
      const subtitle = document.getElementById("wait-subtitle");

      if (pill) pill.textContent = getGlobals().isHost ? "👑 Host" : "🏆 Resultados";
      if (msg) msg.textContent = "¡El caldero habló!";
      if (subtitle) subtitle.textContent = "Mira la TV para ver quién mintió con elegancia.";
      return;
    }

    if (typeof originalRenderResultsWait === "function") {
      originalRenderResultsWait(state);
    }
  };

  const waitForBase = setInterval(() => {
    if (typeof renderMobileGame === "function") {
      clearInterval(waitForBase);
      const originalRenderMobileGame = window.renderMobileGame;
      window.renderMobileGame = function patchedRenderMobileGame(state = {}) {
        if (state.phase === CALDERO_PHASE) {
          renderCalderoMobile(state);
          return;
        }
        originalRenderMobileGame(state);
      };
    }
  }, 80);
})();
