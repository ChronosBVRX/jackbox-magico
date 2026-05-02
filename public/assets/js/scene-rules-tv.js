(() => {
  // ─── Anti-flicker: solo re-renderizar cuando el estado cambia ────────────
  let lastRulesRenderKey = "";
  let readyPanelInterval = null;

  function getRulesRenderKey(state) {
    return [
      state.phase || "",
      state.current_game_id || "",
      state.game_id || "",
      state.round_id || "",
      state.instruction_title || "",
      state.story_selected_minigame_name || ""
    ].join("|");
  }

  function renderRules(data) {
    const state = data.game_state || {};
    const key = getRulesRenderKey(state);

    window.currentGameState = state;
    window.lastKnownPhase = state.phase;

    const rulesView = document.getElementById("view-rules");
    if (!rulesView?.classList.contains("visible")) {
      window.showScreen("view-rules");
      window.SceneTransition?.hide();
    }

    if (key === lastRulesRenderKey) {
      updateInlineReadyPanel();
      return;
    }

    lastRulesRenderKey = key;

    renderInstructionScreenOnce(state);
    
    updateInlineReadyPanel();
    
    clearInterval(readyPanelInterval);
    readyPanelInterval = setInterval(updateInlineReadyPanel, 900);

    playInstructionVoiceOnce(state);
    window.acceptRules = async () => {
      window.SceneTransition?.show("¡Que comience la magia!");
      const room =
        (typeof currentRoom !== "undefined" ? currentRoom : null) ||
        document.getElementById("tv-code")?.textContent?.trim() ||
        "";
      const token = typeof getTvToken === "function" ? getTvToken() : "";

      try {
        await fetch(`/api/story-tv/${room}/accept-rules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tv_token: token }),
        });
      } catch (e) {
        console.error("Error aceptando reglas", e);
        window.SceneTransition?.hide();
      }
    };

    if (typeof window.checkAutoAcceptRules === "function") {
      window.checkAutoAcceptRules(data);
    }
  }

  function renderInstructionScreenOnce(state) {
    const titleEl  = document.getElementById("rules-title");
    const reasonEl = document.getElementById("rules-reason");

    if (titleEl) {
      const gameId = state.current_game_id || state.game_id || state.mode || "intro_general";
      const gameRules = window.JACKBOX_GAME_RULES?.[gameId] || window.JACKBOX_GAME_RULES?.[state.phase];
      titleEl.textContent = gameRules?.title || state.story_selected_minigame_name || state.instruction_title || state.title || "Siguiente Prueba";
    }

    if (reasonEl) {
      const gameId = state.current_game_id || state.game_id || state.mode || "intro_general";
      const gameRules = window.JACKBOX_GAME_RULES?.[gameId] || window.JACKBOX_GAME_RULES?.[state.phase];

      reasonEl.textContent = gameRules?.rule || state.story_transition_reason || state.subtitle || "Prepárate para la siguiente dinámica...";

      const rulesList = document.getElementById("rules-list");
      if (rulesList) {
        rulesList.innerHTML = "";
        if (gameRules?.points) {
          const items = gameRules.points.split("·").map(s => s.trim()).filter(Boolean);
          items.forEach((item, index) => {
            rulesList.innerHTML += `<div>${index + 1}. ${escapeHTML(item)}</div>`;
          });
        }
      }
    }
    
    ensureVotePanel();
  }

  function playInstructionVoiceOnce(state) {
    const gameId = state.current_game_id || state.game_id || state.mode || "intro_general";
    const roundId = state.round_id || state.round_number || "1";
    const instructionKey = `${gameId}_${roundId}`;

    if (window.lastInstructionScreenVoiceKey !== instructionKey) {
      window.lastInstructionScreenVoiceKey = instructionKey;
      window.lastVoicePhase = "rules";
      window.currentGameInstructionId   = gameId;
      window.currentInstructionRoundId  = roundId;

      setTimeout(() => {
        if (window.VoiceLinesTv?.interruptAndPlayInstruction) {
          window.VoiceLinesTv.interruptAndPlayInstruction(gameId, roundId, true);
        } else {
          window.VoiceLinesTv?.stop?.();
          window.VoiceLinesTv?.playInstructionVoice?.(gameId, roundId, true);
        }
      }, 150);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Panel de votos: contador de jugadores listos visible en TV
  // Se monta UNA vez y se actualiza solo los datos, sin re-montar HTML
  // ────────────────────────────────────────────────────────────────────────

  function ensureVotePanel() {
    if (document.getElementById("rules-vote-panel")) return;

    const panel = document.createElement("div");
    panel.id = "rules-vote-panel";
    panel.className = "rules-inline-ready";

    const container = document.getElementById("rules-vote-panel-container");
    if (container) {
      container.appendChild(panel);
    } else {
      const card = document.querySelector(".rules-clean-card") || document.querySelector(".rules-card");
      if (card) card.appendChild(panel);
    }
  }

  // Cache del último estado del panel para evitar re-renders innecesarios
  let lastVotePanelHash = "";

  async function updateInlineReadyPanel() {
    const panel = document.getElementById("rules-vote-panel");
    if (!panel) return;

    if (!document.getElementById("view-rules")?.classList.contains("visible")) return;

    const room =
      (typeof currentRoom !== "undefined" ? currentRoom : null) ||
      document.getElementById("tv-code")?.textContent?.trim() ||
      "";

    if (!room || room === "----") return;

    try {
      const res = await fetch(
        `/api/story-ready/${room}/status?rulesVoteTs=${Date.now()}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const ready = await res.json();

      const readyCount   = Number(ready.ready_count   || 0);
      const totalPlayers = Number(ready.total_players || 0);
      const pct          = totalPlayers > 0 ? (readyCount / totalPlayers) * 100 : 0;

      const readyPlayers = ready.ready_players || [];
      const pendingNames = ready.pending_players || [];

      // Hash para evitar actualizaciones sin cambio de datos (anti-flicker)
      const hash = `${readyCount}/${totalPlayers}|${readyPlayers.join(",")}`;
      if (hash === lastVotePanelHash) return;
      lastVotePanelHash = hash;

      panel.innerHTML = `
        <div class="rules-ready-card">
          <div class="rules-ready-header">
            <span>⚡ Jugadores listos</span>
            <strong>${readyCount}/${totalPlayers}</strong>
          </div>

          <div class="rules-ready-names">
            ${readyPlayers.map(name => `<span class="ready">✓ ${escapeHTML(name)}</span>`).join("")}
            ${pendingNames.map(name => `<span class="pending">${escapeHTML(name)}</span>`).join("")}
          </div>

          <div class="rules-ready-bar">
            <span style="width:${pct}%"></span>
          </div>

          <p class="rules-ready-help">
            ${ready.can_advance || ready.all_ready
              ? "Todos listos. Comenzando..."
              : pendingNames.length
                ? `Faltan: ${escapeHTML(pendingNames.join(", "))}`
                : "Esperando confirmaciones..."}
          </p>
        </div>
      `;
    } catch (_) {}
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }



  // Limpiar intervalo cuando la pantalla de reglas ya no esté visible
  setInterval(() => {
    if (!document.getElementById("view-rules")?.classList.contains("visible")) {
      clearInterval(readyPanelInterval);
      readyPanelInterval = null;
      lastRulesRenderKey = ""; // Forzar re-montaje en próxima visita
      lastVotePanelHash = "";
      // Remover panel para que se monte fresco en la siguiente escena
      document.getElementById("rules-vote-panel")?.remove();
    }
  }, 1500);

  window.SceneRules = { render: renderRules };
})();