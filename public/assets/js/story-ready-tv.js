(() => {
  let lastRoom = "";
  let lastReadyKey = "";
  let advancingKey = "";
  let readyWindowStartedAt = 0;

  function isDebugMode() {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("debug") === "1" || localStorage.getItem("jackbox_story_debug") === "1";
    } catch (error) {
      return false;
    }
  }

  function getReadyTimeoutMs() {
    return isDebugMode() ? 5000 : 18000;
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
      token = crypto?.randomUUID ? crypto.randomUUID() : `tv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
    const step = state.story_public?.current_story_step || state.story?.current_story_step || state.story_step || null;
    return step?.type || state.story_step_type || "";
  }

  async function fetchRoomStatus(room) {
    try {
      const res = await fetch(`/api/room/${room}/status?readyTvRoomTs=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch (error) {
      return null;
    }
  }

  async function fetchReadyStatus(room) {
    try {
      const res = await fetch(`/api/story-ready/${room}/status?readyTvTs=${Date.now()}`, { cache: "no-store" });
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

  function ensurePanel() {
    let panel = document.getElementById("story-ready-tv-panel");
    if (panel) return panel;
    panel = document.createElement("div");
    panel.id = "story-ready-tv-panel";
    panel.innerHTML = `
      <div class="story-ready-tv-count">0/0</div>
      <div class="story-ready-tv-info">
        <div class="story-ready-tv-title">¿Todos listos?</div>
        <div class="story-ready-tv-pending"></div>
        <div class="story-ready-tv-timer"></div>
        <div class="story-ready-tv-bar"><span></span></div>
      </div>
    `;
    document.body.appendChild(panel);
    return panel;
  }

  function getRemainingSeconds() {
    if (!readyWindowStartedAt) return Math.ceil(getReadyTimeoutMs() / 1000);
    return Math.max(0, Math.ceil((getReadyTimeoutMs() - (Date.now() - readyWindowStartedAt)) / 1000));
  }

  function isReadyTimedOut() {
    return Boolean(readyWindowStartedAt && Date.now() - readyWindowStartedAt >= getReadyTimeoutMs());
  }

  function showPanel(ready) {
    const panel = ensurePanel();
    panel.classList.add("visible");
    const count = panel.querySelector(".story-ready-tv-count");
    const pending = panel.querySelector(".story-ready-tv-pending");
    const timer = panel.querySelector(".story-ready-tv-timer");
    const bar = panel.querySelector(".story-ready-tv-bar span");
    const remaining = getRemainingSeconds();
    const totalMs = getReadyTimeoutMs();
    const elapsed = readyWindowStartedAt ? Math.min(totalMs, Date.now() - readyWindowStartedAt) : 0;
    const progress = totalMs ? Math.max(0, Math.min(100, (elapsed / totalMs) * 100)) : 0;

    if (count) count.textContent = `${ready.ready_count || 0}/${ready.total_players || 0}`;

    if (pending) {
      const pendingPlayers = ready.pending_players || [];
      pending.textContent = pendingPlayers.length
        ? `Faltan: ${pendingPlayers.map(escapeHTML).join(", ")}`
        : "Todos confirmaron. Avanzando...";
    }

    if (timer) {
      timer.textContent = ready.all_ready
        ? "Avanzando ahora..."
        : `Avanza automáticamente en ${remaining}s`;
    }

    if (bar) bar.style.width = `${progress}%`;
  }

  function hidePanel() {
    const panel = document.getElementById("story-ready-tv-panel");
    if (panel) panel.classList.remove("visible");
  }

  function shouldWaitForReady(status) {
    const state = status?.game_state || {};
    const phase = getPhase(status);
    if (state.mode !== "story") return false;
    return String(phase).startsWith("results_") || phase === "rules";
  }

  function progressCompleteLocally(status) {
    const state = status?.game_state || {};
    const stepType = getStepType(status);
    const target = Number(state.story_trivia_target_questions || 0);
    if (getPhase(status) !== "results_trivia" || stepType !== "trivia_block") return true;
    if (!target) return true;

    const room = getRoomCode();
    const storyId = state.story_public?.story_id || state.story?.story_id || "story";
    const stepIndex = Number(state.story_public?.story_step_index ?? state.story?.story_step_index ?? 0);
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
    if (getPhase(status) !== "results_trivia" || getStepType(status) !== "trivia_block") return;
    const room = getRoomCode();
    const storyId = state.story_public?.story_id || state.story?.story_id || "story";
    const stepIndex = Number(state.story_public?.story_step_index ?? state.story?.story_step_index ?? 0);
    const key = `jackbox_story_progress_${room}_${storyId}_${stepIndex}`;
    const id = [state.round_id, state.question_id, state.current_question_id, state.question, state.correct_label, state.correct]
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

  async function advanceAfterReady(room, status, ready) {
    const timedOut = isReadyTimedOut();
    const voiceBusy = window.VoiceLinesTv?.isProcessing?.() || false;

    // Si terminó el tiempo pero la voz sigue hablando, esperamos a que termine.
    // Si todos están listos (ready.all_ready), avanzamos de inmediato (consenso).
    if ((!ready.all_ready && !timedOut) || advancingKey === ready.ready_key) return;
    if (voiceBusy && !ready.all_ready) return; 
    advancingKey = ready.ready_key;

    window.setTimeout(async () => {
      try {
        const fresh = await fetchRoomStatus(room);
        if (!fresh || !shouldWaitForReady(fresh)) return;

        recordTriviaResultLocally(fresh);

        if (getPhase(fresh) === "results_trivia" && getStepType(fresh) === "trivia_block") {
          if (progressCompleteLocally(fresh)) {
            await callNextStep(room);
          } else {
            await callNextTrivia(room);
          }
        } else if (getPhase(fresh) === "rules") {
          if (typeof window.acceptRules === "function") {
            window.acceptRules();
          } else {
            await fetch(`/api/story-tv/${room}/accept-rules`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tv_token: getTvToken() }),
            });
          }
        } else {
          await callNextStep(room);
        }

        await resetReady(room);
      } catch (error) {
        advancingKey = "";
      }
    }, ready.all_ready ? 800 : 1400);
  }

  function injectStyles() {
    if (document.getElementById("story-ready-tv-style")) return;
    const style = document.createElement("style");
    style.id = "story-ready-tv-style";
    style.textContent = `
      #story-ready-tv-panel {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%) translateY(30px) scale(0.95);
        z-index: 10020;
        width: min(600px, 90vw);
        opacity: 0;
        pointer-events: none;
        padding: 18px 28px;
        border-radius: 30px;
        color: #fff7dc;
        display: flex;
        align-items: center;
        gap: 24px;
        background:
          radial-gradient(circle at top right, rgba(255,216,121,.15), transparent 45%),
          rgba(10, 15, 30, .9);
        border: 1px solid rgba(255,216,121,.2);
        box-shadow: 0 15px 45px rgba(0,0,0,.6);
        backdrop-filter: blur(20px);
        transition: opacity .35s ease, transform .35s cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      #story-ready-tv-panel.visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0) scale(1);
      }
      .story-ready-tv-title {
        color: #ffe7a3;
        font-weight: 900;
        font-size: 1.1rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 4px;
      }
      .story-ready-tv-count {
        font-size: 3rem;
        font-weight: 1000;
        line-height: 1;
        flex-shrink: 0;
      }
      .story-ready-tv-info {
        flex-grow: 1;
        text-align: left;
      }
      .story-ready-tv-pending,
      .story-ready-tv-timer {
        color: rgba(255,248,221,.76);
        font-weight: 600;
        font-size: 0.95rem;
        line-height: 1.4;
      }
      .story-ready-tv-timer {
        color: #bbf7d0;
      }
      .story-ready-tv-bar {
        height: 6px;
        margin-top: 10px;
        border-radius: 999px;
        background: rgba(255,255,255,.08);
        overflow: hidden;
      }
      .story-ready-tv-bar span {
        display: block;
        width: 0%;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #bbf7d0, #facc15);
        transition: width .35s linear;
      }
      @media (max-width: 900px) {
        #story-ready-tv-panel {
          bottom: 20px;
          padding: 14px 20px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  async function tick() {
    injectStyles();
    const room = getRoomCode();
    if (!room) return;
    const status = await fetchRoomStatus(room);
    if (!status || !shouldWaitForReady(status)) {
      hidePanel();
      readyWindowStartedAt = 0;
      return;
    }
    recordTriviaResultLocally(status);
    const ready = await fetchReadyStatus(room);
    if (!ready) return;
    if (ready.ready_key !== lastReadyKey) {
      lastReadyKey = ready.ready_key;
      advancingKey = "";
      readyWindowStartedAt = Date.now();
    }
    showPanel(ready);
    await advanceAfterReady(room, status, ready);
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    setInterval(tick, 900);
    setTimeout(tick, 700);
  });
})();
