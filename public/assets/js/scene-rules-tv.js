(() => {
  // ─── Anti-flicker: solo re-renderizar cuando el estado cambia ────────────
  let lastRulesKey = "";
  let voteUpdateInterval = null;

  function renderRules(data) {
    const state = data.game_state || {};

    // Clave única para la escena actual — si no cambió, no re-renderizar el card
    const rulesKey = `${state.phase}_${state.current_game_id || ""}_${state.round_id || ""}`;
    const isNewScene = rulesKey !== lastRulesKey;
    lastRulesKey = rulesKey;

    window.showScreen("view-rules");
    window.SceneTransition?.hide();

    if (isNewScene) {
      // Solo actualizar textos estáticos cuando la escena cambia
      const titleEl  = document.getElementById("rules-title");
      const reasonEl = document.getElementById("rules-reason");

      if (titleEl)
        titleEl.textContent =
          state.story_selected_minigame_name || state.instruction_title || state.title || "Siguiente Prueba";

      if (reasonEl) {
        reasonEl.textContent =
          state.story_transition_reason ||
          state.subtitle ||
          "Prepárate para la siguiente dinámica...";
      }

      // ── Audio: instrucciones por gameId+roundId ──────────────────────────
      const gameId =
        state.current_game_id ||
        state.game_id ||
        state.mode ||
        "intro_general";
      const roundId = state.round_id || state.round_number || "1";
      const instructionKey = `${gameId}_${roundId}`;

      if (window.lastInstructionScreenVoiceKey !== instructionKey) {
        window.lastInstructionScreenVoiceKey = instructionKey;
        window.lastVoicePhase = "rules";
        window.currentGameInstructionId   = gameId;
        window.currentInstructionRoundId  = roundId;

        const played = window.VoiceLinesTv?.playInstructionVoice?.(gameId, roundId);
        if (!played) {
          window.VoiceLinesTv?.playVoiceLine?.("rules", { volume: 0.95 });
        }
      }

      // ── Montar el panel de votos (solo una vez por escena) ───────────────
      ensureVotePanel();

      // ── Iniciar el intervalo de actualización de votos ───────────────────
      clearInterval(voteUpdateInterval);
      voteUpdateInterval = setInterval(updateVotePanel, 1200);
      updateVotePanel(); // Actualización inicial inmediata
    }

    // ── acceptRules global para story-ready-tv.js ──────────────────────────
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

  // ────────────────────────────────────────────────────────────────────────
  // Panel de votos: contador de jugadores listos visible en TV
  // Se monta UNA vez y se actualiza solo los datos, sin re-montar HTML
  // ────────────────────────────────────────────────────────────────────────

  function ensureVotePanel() {
    if (document.getElementById("rules-vote-panel")) return; // Ya existe

    const panel = document.createElement("div");
    panel.id = "rules-vote-panel";
    panel.className = "rules-vote-panel";
    panel.innerHTML = `
      <div class="rvp-status-row">
        <div class="rvp-count-badge">
          <span class="rvp-icon">⚡</span>
          <span id="rvp-count">0/0</span> listos
        </div>
        <div class="rvp-missing" id="rvp-names">Esperando a todos...</div>
      </div>
      <div class="rvp-bar-wrap">
        <div class="rvp-bar"><div class="rvp-bar-fill" id="rvp-bar-fill"></div></div>
      </div>
      <div class="rvp-hint">La partida comenzará automáticamente cuando estén listos</div>
    `;

    const card = document.querySelector(".rules-card");
    if (card) card.appendChild(panel);
    else document.querySelector(".rules-card-container")?.appendChild(panel);

    injectVotePanelStyles();
  }

  // Cache del último estado del panel para evitar re-renders innecesarios
  let lastVotePanelHash = "";

  async function updateVotePanel() {
    const panel = document.getElementById("rules-vote-panel");
    if (!panel) return;

    // Solo actualizar si la pantalla de reglas está visible
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

      // Hash para evitar actualizaciones sin cambio de datos (anti-flicker)
      const hash = `${readyCount}/${totalPlayers}|${(ready.ready_players || []).join(",")}`;
      if (hash === lastVotePanelHash) return;
      lastVotePanelHash = hash;

      const countEl   = document.getElementById("rvp-count");
      const namesEl   = document.getElementById("rvp-names");
      const barFillEl = document.getElementById("rvp-bar-fill");

      if (countEl) countEl.textContent = `${readyCount}/${totalPlayers}`;

      if (namesEl) {
        const pendingNames = ready.pending_players || [];
        if (pendingNames.length === 0) {
          namesEl.textContent = "¡Todos listos!";
          namesEl.className = "rvp-missing all-ready";
        } else {
          namesEl.textContent = `Faltan: ${pendingNames.map(escapeHTML).join(", ")}`;
          namesEl.className = "rvp-missing";
        }
      }

      if (barFillEl) barFillEl.style.width = `${pct}%`;
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

  function injectVotePanelStyles() {
    if (document.getElementById("rules-vote-panel-style")) return;
    const style = document.createElement("style");
    style.id = "rules-vote-panel-style";
    style.textContent = `
      .rules-vote-panel {
        margin-top: 32px;
        padding-top: 24px;
        border-top: 1px solid rgba(255,216,121,.15);
        color: #fff7dc;
        animation: rvp-in .5s ease both;
      }
      @keyframes rvp-in {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .rvp-status-row {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;
      }
      .rvp-count-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px;
        border-radius: 999px;
        background: rgba(250,204,21,.15);
        border: 1px solid rgba(250,204,21,.3);
        color: #fde047;
        font-weight: 900;
        font-size: .85rem;
        text-transform: uppercase;
        letter-spacing: .05em;
      }
      .rvp-icon { font-size: 1.1rem; }
      #rvp-count {
        font-size: 1.1rem;
        color: #fff;
      }
      .rvp-missing {
        font-size: .95rem;
        font-weight: 700;
        color: rgba(255,248,221,.65);
      }
      .rvp-missing.all-ready {
        color: #86efac;
      }
      .rvp-bar-wrap {
        margin-bottom: 10px;
      }
      .rvp-bar { 
        height: 6px; 
        border-radius: 999px; 
        background: rgba(255,255,255,.08); 
        overflow: hidden; 
      }
      .rvp-bar-fill {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #86efac, #facc15, #f97316);
        transition: width .5s cubic-bezier(0.4,0,0.2,1);
        width: 0%;
      }
      .rvp-hint {
        font-size: .8rem;
        color: rgba(255,248,221,.5);
        font-weight: 700;
        text-align: center;
      }
    `;
    document.head.appendChild(style);
  }

  // Limpiar intervalo cuando la pantalla de reglas ya no esté visible
  setInterval(() => {
    if (!document.getElementById("view-rules")?.classList.contains("visible")) {
      clearInterval(voteUpdateInterval);
      voteUpdateInterval = null;
      lastRulesKey = ""; // Forzar re-montaje en próxima visita
      lastVotePanelHash = "";
      // Remover panel para que se monte fresco en la siguiente escena
      document.getElementById("rules-vote-panel")?.remove();
    }
  }, 1500);

  window.SceneRules = { render: renderRules };
})();