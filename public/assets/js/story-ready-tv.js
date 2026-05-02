(() => {
  let lastRoom = "";
  let lastReadyKey = "";
  let advancingKey = "";
  let readyWindowStartedAt = 0;
  let sceneEnteredAt = 0; // Cuándo entró a la escena actual (para pacing)
  let lastPanelHash = ""; // Anti-flicker: evitar DOM updates sin cambios

  // ─── Duración mínima por tipo de escena (pacing Jackbox) ──────────────────
  // Aunque todos voten, la TV no avanza antes de este tiempo.
  const MIN_SCENE_MS = {
    scene_intro:         8_000,
    scene_rules:         10_000,
    scene_instructions:  12_000,
    rules:               10_000,
    results_trivia:      9_000,
    results_atrapa_snitch: 8_000,
    lobby:               0,      // En lobby no hay tiempo mínimo forzado
    default:             6_000,
  };

  // Tiempo máximo de espera antes de avanzar solo (si alguien va al baño 🚽)
  // En lobby NO hay auto-advance — debe ser una decisión consciente.
  const AUTO_ADVANCE_MS = 28_000;

  // ─── Utilidades ───────────────────────────────────────────────────────────

  function isDebugMode() {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("debug") === "1" || localStorage.getItem("jackbox_story_debug") === "1";
    } catch (error) {
      return false;
    }
  }

  function getAutoAdvanceMs() {
    return isDebugMode() ? 8_000 : AUTO_ADVANCE_MS;
  }

  function getMinSceneMs(phase) {
    if (isDebugMode()) return 2_000;
    return MIN_SCENE_MS[phase] ?? MIN_SCENE_MS.default;
  }

  function getRoomCode() {
    const domCode = document.getElementById("tv-code")?.textContent?.trim();
    if (domCode && domCode !== "----") {
      lastRoom = domCode.toUpperCase();
      return lastRoom;
    }
    try {
      if (typeof currentRoom !== "undefined" && currentRoom) {
        lastRoom = String(currentRoom).toUpperCase();
        return lastRoom;
      }
    } catch (error) {}
    return lastRoom;
  }

  function getTvToken() {
    if (window.RoomLifecycleTv?.getTvToken) return window.RoomLifecycleTv.getTvToken();
    let token = localStorage.getItem("jackbox_magico_tv_token");
    if (!token) {
      token = globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `tv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem("jackbox_magico_tv_token", token);
    }
    return token;
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getPhase(data) {
    return data?.game_state?.phase || data?.status || "lobby";
  }

  function getStepType(data) {
    const state = data?.game_state || {};
    const step =
      state.story_public?.current_story_step ||
      state.story?.current_story_step ||
      state.story_step ||
      null;
    return step?.type || state.story_step_type || "";
  }

  // ─── Fetch helpers ────────────────────────────────────────────────────────

  async function fetchRoomStatus(room) {
    try {
      const res = await fetch(`/api/room/${room}/status?readyTvRoomTs=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (error) {
      return null;
    }
  }

  async function fetchReadyStatus(room) {
    try {
      const res = await fetch(`/api/story-ready/${room}/status?readyTvTs=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (error) {
      return null;
    }
  }

  async function resetReady(room) {
    try {
      await fetch(`/api/story-ready/${room}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tv_token: getTvToken() }),
      });
    } catch (error) {}
  }

  async function callNextTrivia(room) {
    const res = await fetch(`/api/story-tv/${room}/next-trivia`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tv_token: getTvToken() }),
    });
    if (!res.ok) throw new Error("No se pudo avanzar trivia");
  }

  async function callNextStep(room) {
    const res = await fetch(`/api/story-tv/${room}/next-step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tv_token: getTvToken() }),
    });
    if (!res.ok) throw new Error("No se pudo avanzar etapa");
  }

  async function callContinue(room) {
    const res = await fetch(`/api/tv/${room}/continue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tv_token: getTvToken() }),
    });
    if (!res.ok) throw new Error("No se pudo continuar");
  }

  async function callAcceptRules(room) {
    if (typeof window.acceptRules === "function") {
      window.acceptRules();
      return;
    }
    const res = await fetch(`/api/story-tv/${room}/accept-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tv_token: getTvToken() }),
    });
    if (!res.ok) throw new Error("No se pudo aceptar reglas");
  }

  async function callStartStory(room) {
    const res = await fetch(`/api/story-tv/${room}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tv_token: getTvToken() }),
    });
    if (!res.ok) throw new Error("No se pudo iniciar historia desde lobby");
  }

  // ─── ¿Hay que esperar ready-check en esta fase? ───────────────────────────

  function shouldWaitForReady(status, ready) {
    const state = status?.game_state || {};
    const phase = getPhase(status);
    if (state.mode !== "story") return false;

    // En lobby: esperar solo si hay cobertura de casas (4 casas representadas)
    if (phase === "lobby") {
      return Boolean(ready?.has_house_coverage);
    }

    return (
      String(phase).startsWith("results_") ||
      phase === "rules" ||
      phase === "scene_instructions" ||
      phase === "scene_intro" ||
      phase === "scene_rules"
    );
  }

  // ─── Duración mínima de escena para pacing ────────────────────────────────

  function isMinSceneElapsed(phase) {
    if (!sceneEnteredAt) return true;
    const elapsed = Date.now() - sceneEnteredAt;
    return elapsed >= getMinSceneMs(phase);
  }

  // ─── Progreso local de trivia ─────────────────────────────────────────────

  function progressCompleteLocally(status) {
    const state = status?.game_state || {};
    const stepType = getStepType(status);
    const target = Number(state.story_trivia_target_questions || 0);
    if (getPhase(status) !== "results_trivia" || stepType !== "trivia_block") return true;
    if (!target) return true;

    const room = getRoomCode();
    const storyId =
      state.story_public?.story_id || state.story?.story_id || "story";
    const stepIndex = Number(
      state.story_public?.story_step_index ?? state.story?.story_step_index ?? 0
    );
    const key = `jackbox_story_progress_${room}_${storyId}_${stepIndex}`;
    try {
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(list) && list.length >= target;
    } catch (error) {
      return false;
    }
  }

  function recordTriviaResultLocally(status) {
    const state = status?.game_state || {};
    if (
      getPhase(status) !== "results_trivia" ||
      getStepType(status) !== "trivia_block"
    )
      return;

    const room = getRoomCode();
    const storyId =
      state.story_public?.story_id || state.story?.story_id || "story";
    const stepIndex = Number(
      state.story_public?.story_step_index ?? state.story?.story_step_index ?? 0
    );
    const key = `jackbox_story_progress_${room}_${storyId}_${stepIndex}`;
    const id =
      [
        state.round_id,
        state.question_id,
        state.current_question_id,
        state.question,
        state.correct_label,
        state.correct,
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join("|") || `${Date.now()}`;
    try {
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      const arr = Array.isArray(list) ? list : [];
      if (!arr.includes(id)) arr.push(id);
      localStorage.setItem(key, JSON.stringify(arr.slice(-30)));
    } catch (error) {}
  }

  // ─── Avanzar según la fase actual ─────────────────────────────────────────

  async function advanceAfterReady(room, status, ready) {
    if (window.DEBUG_READY_PAUSED) return;

    const phase = getPhase(status);

    // En lobby: NO avanzar por timeout — solo si minimum_ready_met
    const isLobby = phase === "lobby";
    const timedOut = !isLobby && Boolean(
      readyWindowStartedAt &&
        Date.now() - readyWindowStartedAt >= getAutoAdvanceMs()
    );
    const voiceBusy = window.VoiceLinesTv?.isProcessing?.() || false;
    const minElapsed = isMinSceneElapsed(phase);

    // Esperar a que el audio termine Y a que la escena haya "respirado"
    if (voiceBusy && !timedOut) return;
    if (!minElapsed && !timedOut) return;

    // Usar minimum_ready_met como regla principal; all_ready como fallback
    const readyEnough = ready.minimum_ready_met || ready.all_ready;

    if ((!readyEnough && !timedOut) || advancingKey === ready.ready_key) return;
    advancingKey = ready.ready_key;

    window.setTimeout(async () => {
      try {
        const fresh = await fetchRoomStatus(room);
        if (!fresh) return;

        const freshReady = await fetchReadyStatus(room);
        if (!freshReady) return;

        if (!shouldWaitForReady(fresh, freshReady)) return;

        const freshPhase = getPhase(fresh);
        const freshReadyEnough = freshReady.minimum_ready_met || freshReady.all_ready;

        recordTriviaResultLocally(fresh);

        // Lobby con cobertura de casas → iniciar historia
        if (freshPhase === "lobby") {
          if (!freshReady.minimum_ready_met) {
            advancingKey = ""; // Permitir reintentar
            return;
          }
          await callStartStory(room);
          await resetReady(room);
          return;
        }

        // Resultados de trivia → siguiente pregunta o siguiente step
        if (freshPhase === "results_trivia" && getStepType(fresh) === "trivia_block") {
          if (progressCompleteLocally(fresh)) {
            await callNextStep(room);
          } else {
            await callNextTrivia(room);
          }
          await resetReady(room);
          return;
        }

        // Resultados genéricos → siguiente step
        if (String(freshPhase).startsWith("results_")) {
          await callNextStep(room);
          await resetReady(room);
          return;
        }

        // Reglas (fase rules clásica con target_phase) → accept-rules
        if (freshPhase === "rules") {
          await callAcceptRules(room);
          await resetReady(room);
          return;
        }

        // Escenas de instrucciones/intro/reglas → endpoint central continue
        if (
          freshPhase === "scene_instructions" ||
          freshPhase === "scene_intro" ||
          freshPhase === "scene_rules"
        ) {
          await callContinue(room);
          await resetReady(room);
          return;
        }

        // Fallback seguro
        await callNextStep(room);
        await resetReady(room);
      } catch (error) {
        advancingKey = "";
      }
    }, readyEnough ? 900 : 1_600);
  }

  // ─── Panel de TV (UI) ─────────────────────────────────────────────────────

  function ensurePanel() {
    let panel = document.getElementById("story-ready-tv-panel");
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "story-ready-tv-panel";
    panel.innerHTML = `
      <div class="srtv-icon">⚡</div>
      <div class="srtv-count">0/0</div>
      <div class="srtv-info">
        <div class="srtv-title">¿Todos listos?</div>
        <div class="srtv-pending"></div>
        <div class="srtv-houses"></div>
        <div class="srtv-timer"></div>
        <div class="srtv-bar"><span></span></div>
      </div>
    `;
    document.body.appendChild(panel);
    return panel;
  }

  /** Etiqueta de acción según la fase actual */
  function getPhaseLabel(phase) {
    if (phase === "lobby")              return "🏰 ¿Todos listos para empezar?";
    if (phase === "scene_instructions") return "⚡ Entendidas las instrucciones";
    if (phase === "scene_intro")        return "🏰 Bienvenidos al castillo";
    if (phase === "scene_rules")        return "📖 Reglas leídas";
    if (phase === "rules")              return "🪄 Listos para empezar";
    if (String(phase).startsWith("results_")) return "✅ Listos para continuar";
    return "✅ Listos";
  }

  function getRemainingSeconds() {
    if (!readyWindowStartedAt) return Math.ceil(getAutoAdvanceMs() / 1000);
    return Math.max(
      0,
      Math.ceil((getAutoAdvanceMs() - (Date.now() - readyWindowStartedAt)) / 1000)
    );
  }

  function showPanel(ready, phase) {
    const panel = ensurePanel();
    panel.classList.add("visible");

    // ── Anti-flicker: skip DOM updates si los datos no cambiaron ──
    const remaining = getRemainingSeconds();
    const totalMs = phase === "lobby" ? 0 : getAutoAdvanceMs(); // sin barra en lobby
    const elapsed = readyWindowStartedAt
      ? Math.min(totalMs || 1, Date.now() - readyWindowStartedAt)
      : 0;
    const progress = totalMs
      ? Math.max(0, Math.min(100, (elapsed / totalMs) * 100))
      : 0;

    const readyEnough = ready.minimum_ready_met || ready.all_ready;
    const dataHash = `${phase}|${ready.ready_count || 0}/${ready.total_players || 0}|${(ready.missing_ready_houses || []).join(",")}|${(ready.missing_houses || []).join(",")}|${readyEnough}`;
    const barEl    = panel.querySelector(".srtv-bar span");
    const timerEl  = panel.querySelector(".srtv-timer");

    // La barra y el timer siempre se actualizan
    if (barEl) barEl.style.width = `${progress}%`;
    if (timerEl) {
      if (phase === "lobby") {
        timerEl.textContent = readyEnough
          ? "Iniciando historia..."
          : ready.has_house_coverage
            ? `Mínimo 4 listos (uno por casa) — ${ready.ready_count || 0}/4`
            : "";
      } else {
        timerEl.textContent = readyEnough
          ? "Avanzando en un momento..."
          : `Avanza automáticamente en ${remaining}s`;
      }
    }

    if (dataHash === lastPanelHash) return;
    lastPanelHash = dataHash;

    const iconEl    = panel.querySelector(".srtv-icon");
    const countEl   = panel.querySelector(".srtv-count");
    const titleEl   = panel.querySelector(".srtv-title");
    const pendingEl = panel.querySelector(".srtv-pending");
    const housesEl  = panel.querySelector(".srtv-houses");

    if (iconEl) {
      if (phase === "lobby")               iconEl.textContent = "🏰";
      else if (phase === "scene_instructions") iconEl.textContent = "⚡";
      else if (phase === "scene_intro")    iconEl.textContent = "🏰";
      else if (phase === "scene_rules")    iconEl.textContent = "📖";
      else if (String(phase).startsWith("results_")) iconEl.textContent = "🏆";
      else iconEl.textContent = "🪄";
    }

    if (countEl) {
      if (phase === "lobby" && !ready.has_house_coverage) {
        countEl.textContent = `${ready.total_players || 0}`;
      } else {
        countEl.textContent = `${ready.ready_count || 0}/${ready.total_players || 0}`;
      }
    }

    if (titleEl) titleEl.textContent = getPhaseLabel(phase);

    // Panel de casas faltantes (solo en lobby)
    if (housesEl) {
      if (phase === "lobby" && !ready.has_house_coverage) {
        const missing = (ready.missing_houses || []);
        housesEl.textContent = missing.length
          ? `Falta representante de: ${missing.join(", ")}`
          : "";
        housesEl.style.display = missing.length ? "block" : "none";
      } else if (phase === "lobby" && ready.missing_ready_houses?.length) {
        const missingReady = ready.missing_ready_houses;
        housesEl.textContent = `Faltan casas listas: ${missingReady.join(", ")}`;
        housesEl.style.display = "block";
      } else {
        housesEl.style.display = "none";
        housesEl.textContent = "";
      }
    }

    if (pendingEl) {
      if (phase === "lobby" && !ready.has_house_coverage) {
        pendingEl.textContent = "Esperando más jugadores...";
      } else {
        const pendingPlayers = ready.pending_players || [];
        pendingEl.textContent = pendingPlayers.length
          ? `Faltan: ${pendingPlayers.map(escapeHTML).join(", ")}`
          : "¡Todos listos! Avanzando...";
      }
    }
  }

  // ─── Ready Status en línea para Lobby ─────────────────────────────────────
  function shouldUseInlineReadyPanel(phase) {
    return (
      phase === "lobby" ||
      phase === "scene_instructions" ||
      phase === "scene_rules" ||
      phase === "rules"
    );
  }

  function renderInlineReadyStatus(status, ready, phase) {
    const target = document.getElementById("lobby-ready-status");
    if (!target) return;

    if (phase !== "lobby") {
      target.innerHTML = "";
      return;
    }

    const readyCount = Number(ready.ready_count || 0);
    const totalPlayers = Number(ready.total_players || 0);
    const minRequired = 4;
    const progress = Math.min(100, (readyCount / minRequired) * 100);

    const missingHouses = ready.missing_houses || [];
    const pendingPlayers = ready.pending_players || [];

    let title = "Esperando jugadores...";
    let message = "Se necesita al menos 1 jugador por casa.";
    let detail = "";

    if (!ready.has_minimum_players || !ready.has_house_coverage) {
      title = "Esperando jugadores...";
      detail = missingHouses.length
        ? `Faltan casas: ${missingHouses.join(", ")}`
        : "Esperando que entren más jugadores.";
    } else if (!ready.minimum_ready_met) {
      title = "¿Todos listos?";
      message = "Los celulares ya pueden confirmar.";
      detail = pendingPlayers.length
        ? `Faltan: ${pendingPlayers.join(", ")}`
        : "Esperando confirmaciones.";
    } else {
      title = "¡Todos listos!";
      message = "La partida comenzará automáticamente.";
      detail = "Preparando la siguiente escena...";
    }

    target.innerHTML = `
      <div class="lobby-ready-card">
        <div class="lobby-ready-top">
          <span class="lobby-ready-icon">⚡</span>
          <div>
            <h3>${escapeHTML(title)}</h3>
            <p>${escapeHTML(message)}</p>
          </div>
          <strong>${readyCount}/${minRequired}</strong>
        </div>

        <div class="lobby-ready-detail">${escapeHTML(detail)}</div>

        <div class="lobby-ready-bar">
          <span style="width:${progress}%"></span>
        </div>
      </div>
    `;
  }

  function hidePanel() {
    const panel = document.getElementById("story-ready-tv-panel");
    if (panel) panel.classList.remove("visible");
    lastPanelHash = ""; // Forzar re-render en próxima aparición
  }


  // ─── Estilos ──────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById("story-ready-tv-style")) return;
    const style = document.createElement("style");
    style.id = "story-ready-tv-style";
    style.textContent = `
      #story-ready-tv-panel {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%) translateY(40px) scale(0.93);
        z-index: 10020;
        width: min(680px, 92vw);
        opacity: 0;
        pointer-events: none;
        padding: 16px 24px 16px 20px;
        border-radius: 32px;
        color: #fff7dc;
        display: flex;
        align-items: center;
        gap: 18px;
        background:
          radial-gradient(circle at top right, rgba(255,216,121,.18), transparent 48%),
          rgba(8, 12, 28, .92);
        border: 1px solid rgba(255,216,121,.22);
        box-shadow: 0 20px 60px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.04) inset;
        backdrop-filter: blur(24px);
        transition: opacity .38s ease, transform .38s cubic-bezier(0.18, 0.89, 0.32, 1.28);
      }
      #story-ready-tv-panel.visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0) scale(1);
      }
      .srtv-icon {
        font-size: 2.2rem;
        flex-shrink: 0;
        filter: drop-shadow(0 0 8px rgba(255,216,121,.5));
        animation: srtv-pulse 2s ease-in-out infinite;
      }
      @keyframes srtv-pulse {
        0%, 100% { transform: scale(1); }
        50%       { transform: scale(1.12); }
      }
      .srtv-count {
        font-size: 2.8rem;
        font-weight: 1000;
        line-height: 1;
        flex-shrink: 0;
        min-width: 3.5ch;
        text-align: center;
        color: #facc15;
        text-shadow: 0 0 20px rgba(250,204,21,.4);
      }
      .srtv-info {
        flex-grow: 1;
        text-align: left;
      }
      .srtv-title {
        color: #ffe7a3;
        font-weight: 900;
        font-size: 1rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 3px;
      }
      .srtv-pending,
      .srtv-houses,
      .srtv-timer {
        color: rgba(255,248,221,.72);
        font-weight: 600;
        font-size: 0.88rem;
        line-height: 1.4;
      }
      .srtv-houses {
        color: #fca5a5;
        margin-top: 2px;
        font-weight: 800;
      }
      .srtv-timer { color: #86efac; margin-top: 2px; }
      .srtv-bar {
        height: 5px;
        margin-top: 9px;
        border-radius: 999px;
        background: rgba(255,255,255,.08);
        overflow: hidden;
      }
      .srtv-bar span {
        display: block;
        width: 0%;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #86efac, #facc15, #f97316);
        transition: width .4s linear;
      }
      @media (max-width: 900px) {
        #story-ready-tv-panel { bottom: 20px; padding: 13px 18px; }
        .srtv-count { font-size: 2.2rem; }
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Tick principal ───────────────────────────────────────────────────────

  async function tick() {
    injectStyles();
    const room = getRoomCode();
    if (!room) return;

    const status = await fetchRoomStatus(room);
    if (!status) {
      hidePanel();
      readyWindowStartedAt = 0;
      sceneEnteredAt = 0;
      return;
    }

    const state = status?.game_state || {};
    const phase = getPhase(status);

    // Solo actuar en modo historia
    if (state.mode !== "story") {
      hidePanel();
      readyWindowStartedAt = 0;
      sceneEnteredAt = 0;
      return;
    }

    const ready = await fetchReadyStatus(room);
    if (!ready) return;

    // En lobby sin cobertura de casas → mostrar inline ready status (ahora se encarga renderInlineReadyStatus)
    if (phase === "lobby" && !ready.has_house_coverage) {
      // Resetear timers si venimos de otra fase
      readyWindowStartedAt = 0;
      sceneEnteredAt = 0;
      advancingKey = "";
      lastReadyKey = "";
      hidePanel();
      renderInlineReadyStatus(status, ready, phase);
      return;
    }

    if (!shouldWaitForReady(status, ready)) {
      hidePanel();
      if (phase !== "lobby") {
        renderInlineReadyStatus(status, ready, "none"); // Limpiar si es necesario
      }
      readyWindowStartedAt = 0;
      sceneEnteredAt = 0;
      return;
    }

    recordTriviaResultLocally(status);

    // Detectar cambio de clave (nueva escena) → reiniciar temporizadores
    if (ready.ready_key !== lastReadyKey) {
      lastReadyKey = ready.ready_key;
      advancingKey = "";
      // En lobby no empezamos el countdown de auto-advance
      readyWindowStartedAt = phase === "lobby" ? 0 : Date.now();
      sceneEnteredAt = Date.now();
    }

    if (shouldUseInlineReadyPanel(phase)) {
      hidePanel();
      renderInlineReadyStatus(status, ready, phase);
    } else {
      showPanel(ready, phase);
      renderInlineReadyStatus(status, ready, "none"); // Clear it just in case
    }

    await advanceAfterReady(room, status, ready);
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    setInterval(tick, 900);
    setTimeout(tick, 700);
  });
})();
