(() => {
  let storiesLoaded = false;
  let stories = [];
  let storyPrepared = false;
  let lastStoryStatusKey = "";

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getRoom() {
    try {
      return typeof myRoom !== "undefined" ? myRoom : localStorage.getItem("jackbox_magico_room") || "";
    } catch (error) {
      return localStorage.getItem("jackbox_magico_room") || "";
    }
  }

  function getPlayerName() {
    try {
      return typeof myName !== "undefined" ? myName : localStorage.getItem("jackbox_magico_name") || "";
    } catch (error) {
      return localStorage.getItem("jackbox_magico_name") || "";
    }
  }

  function getHostToken(room) {
    try {
      if (typeof myHostToken !== "undefined" && myHostToken) return myHostToken;
    } catch (error) {}

    return localStorage.getItem(`jackbox_magico_host_token_${room}`) || "";
  }

  function isHost() {
    try {
      return Boolean(myIsHost);
    } catch (error) {
      return false;
    }
  }

  function isSafeToAdvance(data) {
    const phase = data?.game_state?.phase || "lobby";
    const status = data?.status || "lobby";

    return status === "lobby" || phase === "lobby" || String(phase).startsWith("results_");
  }

  function getStoryData(data) {
    const state = data?.game_state || {};
    return state.mode === "story" ? state : null;
  }

  async function getRoomStatus() {
    const room = getRoom();
    if (!room) return null;

    const res = await fetch(`/api/room/${room}/status?storyHostTs=${Date.now()}`, {
      cache: "no-store",
    });

    if (!res.ok) return null;
    return await res.json();
  }

  async function loadStories() {
    if (storiesLoaded) return stories;

    const res = await fetch("/api/story/catalog", { cache: "no-store" });
    const data = await res.json();

    stories = data.stories || [];
    storiesLoaded = true;

    return stories;
  }

  async function ensureStoryPanel() {
    if (!isHost()) return null;

    const hostPanel = document.getElementById("host-panel");
    if (!hostPanel) return null;

    let panel = document.getElementById("story-host-panel");
    if (panel) return panel;

    await loadStories();

    panel = document.createElement("div");
    panel.id = "story-host-panel";
    panel.className = "story-host-panel";
    panel.innerHTML = `
      <div class="story-host-card">
        <div class="story-host-title">📖 Modo Historia</div>
        <p class="story-host-copy">
          Convierte esta sala en una aventura con trivia, transiciones y minijuegos alternados.
        </p>
        <select id="story-select">
          ${stories.map((story) => `
            <option value="${escapeHTML(story.story_id)}">${escapeHTML(story.title)}</option>
          `).join("")}
        </select>
        <button id="story-prepare-btn" type="button">Preparar historia</button>
        <button id="story-start-btn" type="button" class="ghost-btn">Iniciar historia</button>
        <button id="story-next-btn" type="button" class="ghost-btn">Siguiente etapa</button>
        <div id="story-host-advice" class="story-host-advice"></div>
        <div id="story-host-status" class="story-host-status"></div>
      </div>
    `;

    hostPanel.appendChild(panel);

    const prepareBtn = document.getElementById("story-prepare-btn");
    const startBtn = document.getElementById("story-start-btn");
    const nextBtn = document.getElementById("story-next-btn");

    if (prepareBtn) prepareBtn.addEventListener("click", prepareStoryMode);
    if (startBtn) startBtn.addEventListener("click", startStoryMode);
    if (nextBtn) nextBtn.addEventListener("click", nextStoryStep);

    return panel;
  }

  function setStoryStatus(message, kind = "neutral") {
    const box = document.getElementById("story-host-status");
    if (!box) return;

    box.className = `story-host-status ${kind}`;
    box.textContent = message || "";
  }

  function setStoryAdvice(data) {
    const box = document.getElementById("story-host-advice");
    const nextBtn = document.getElementById("story-next-btn");
    const startBtn = document.getElementById("story-start-btn");
    const prepareBtn = document.getElementById("story-prepare-btn");
    const select = document.getElementById("story-select");

    if (!box) return;

    const state = data?.game_state || {};
    const storyState = getStoryData(data);
    const safe = isSafeToAdvance(data);
    const phase = state.phase || "lobby";
    const storyTitle = state.story_public?.story_title || state.story?.story_title || "Modo Historia";
    const step = state.story_public?.current_story_step || state.story?.current_story_step || state.story_step || null;
    const stepType = step?.type || state.story_step_type || "";
    const targetQuestions = Number(state.story_trivia_target_questions || step?.questions || 0);

    if (nextBtn) nextBtn.disabled = !storyState || !safe;
    if (startBtn) startBtn.disabled = Boolean(storyState && data?.status === "playing" && phase !== "lobby");
    if (prepareBtn) prepareBtn.disabled = Boolean(data?.status !== "lobby");
    if (select) select.disabled = Boolean(data?.status !== "lobby");

    if (!storyState) {
      box.innerHTML = "El modo Historia todavía no está preparado para esta sala.";
      return;
    }

    let label = "Historia preparada";
    let detail = "Cuando todos estén listos, inicia la historia.";

    if (phase === "trivia") {
      label = "Trivia narrativa en curso";
      detail = targetQuestions
        ? `Bloque objetivo: ${targetQuestions} preguntas. No avances hasta revelar resultados.`
        : "No avances mientras la pregunta esté activa. Primero revela resultados.";
    } else if (String(phase).startsWith("results_")) {
      label = "Resultados listos";
      detail = stepType === "trivia_block"
        ? "Puedes ir a la siguiente pregunta normal o avanzar a la siguiente etapa de la historia."
        : "Puedes avanzar a la siguiente etapa narrativa.";
    } else if (phase === "lobby") {
      label = "Lobby de historia";
      detail = "Puedes iniciar la historia cuando estén todos los jugadores.";
    } else {
      label = "Prueba mágica activa";
      detail = "Espera a revelar resultados antes de avanzar a la siguiente etapa.";
    }

    box.innerHTML = `
      <strong>${escapeHTML(storyTitle)}</strong><br>
      <span>${escapeHTML(label)}</span><br>
      <small>${escapeHTML(detail)}</small>
    `;
  }

  async function prepareStoryMode() {
    const room = getRoom();
    const playerName = getPlayerName();
    const hostToken = getHostToken(room);
    const storyId = document.getElementById("story-select")?.value;

    if (!room || !playerName || !hostToken || !storyId) {
      setStoryStatus("Faltan datos de host o historia.", "bad");
      return;
    }

    setStoryStatus("Preparando historia...", "neutral");

    try {
      const res = await fetch(`/api/story-prepare/host/${room}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_name: playerName,
          host_token: hostToken,
          story_id: storyId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(JSON.stringify(data.detail || data));
      }

      storyPrepared = true;
      setStoryStatus(`Historia lista: ${data.story_title || storyId}`, "good");
    } catch (error) {
      setStoryStatus(`No se pudo preparar: ${error.message || error}`, "bad");
    }
  }

  async function startStoryMode() {
    const room = getRoom();
    const playerName = getPlayerName();
    const hostToken = getHostToken(room);

    if (!room || !playerName || !hostToken) {
      setStoryStatus("Faltan datos para iniciar historia.", "bad");
      return;
    }

    const current = await getRoomStatus();
    if (current && current.status !== "lobby") {
      setStoryStatus("Solo puedes iniciar la historia desde el lobby.", "bad");
      return;
    }

    if (!storyPrepared) {
      await prepareStoryMode();
    }

    setStoryStatus("Iniciando modo Historia...", "neutral");

    try {
      const res = await fetch(`/api/story/host/${room}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_name: playerName,
          host_token: hostToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(JSON.stringify(data.detail || data));
      }

      setStoryStatus(`Historia iniciada: ${data.game_name || data.game_id}`, "good");
    } catch (error) {
      setStoryStatus(`No se pudo iniciar: ${error.message || error}`, "bad");
    }
  }

  async function nextStoryStep() {
    const room = getRoom();
    const playerName = getPlayerName();
    const hostToken = getHostToken(room);

    if (!room || !playerName || !hostToken) {
      setStoryStatus("Faltan datos para avanzar historia.", "bad");
      return;
    }

    const current = await getRoomStatus();

    if (!current || !getStoryData(current)) {
      setStoryStatus("Esta sala todavía no está en modo Historia.", "bad");
      return;
    }

    if (!isSafeToAdvance(current)) {
      setStoryStatus("No avances todavía: primero termina la ronda y revela resultados.", "bad");
      return;
    }

    setStoryStatus("Avanzando etapa...", "neutral");

    try {
      const res = await fetch(`/api/story/host/${room}/next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_name: playerName,
          host_token: hostToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(JSON.stringify(data.detail || data));
      }

      setStoryStatus(`Nueva etapa: ${data.game_name || data.game_id}`, "good");
    } catch (error) {
      setStoryStatus(`No se pudo avanzar: ${error.message || error}`, "bad");
    }
  }

  function injectStyles() {
    if (document.getElementById("story-host-controls-style")) return;

    const style = document.createElement("style");
    style.id = "story-host-controls-style";
    style.textContent = `
      .story-host-panel { margin-top: 16px; }
      .story-host-card {
        padding: 14px;
        border-radius: 20px;
        background: rgba(255,255,255,.07);
        border: 1px solid rgba(255,216,121,.18);
        box-shadow: 0 12px 28px rgba(0,0,0,.18);
      }
      .story-host-title {
        color: #ffe7a3;
        font-weight: 1000;
        margin-bottom: 6px;
      }
      .story-host-copy {
        margin: 0 0 10px;
        color: rgba(255,248,221,.70);
        font-size: .88rem;
        line-height: 1.25;
      }
      #story-select {
        width: 100%;
        margin-bottom: 10px;
      }
      #story-prepare-btn,
      #story-start-btn,
      #story-next-btn {
        width: 100%;
        margin-top: 8px;
      }
      #story-prepare-btn:disabled,
      #story-start-btn:disabled,
      #story-next-btn:disabled,
      #story-select:disabled {
        opacity: .45;
        cursor: not-allowed;
        filter: grayscale(.2);
      }
      .story-host-advice {
        margin-top: 10px;
        padding: 10px;
        border-radius: 14px;
        color: rgba(255,248,221,.84);
        background: rgba(255,255,255,.06);
        border: 1px solid rgba(255,255,255,.10);
        font-size: .82rem;
        line-height: 1.28;
      }
      .story-host-advice strong {
        color: #ffe7a3;
      }
      .story-host-advice small {
        display: block;
        margin-top: 3px;
        color: rgba(255,248,221,.62);
      }
      .story-host-status {
        margin-top: 10px;
        min-height: 22px;
        color: rgba(255,248,221,.75);
        font-size: .82rem;
        line-height: 1.25;
        font-weight: 800;
      }
      .story-host-status.good { color: #bbf7d0; }
      .story-host-status.bad { color: #fecaca; }
    `;

    document.head.appendChild(style);
  }

  const interval = setInterval(async () => {
    injectStyles();

    if (isHost()) {
      await ensureStoryPanel();

      try {
        const data = await getRoomStatus();
        if (data) setStoryAdvice(data);
      } catch (error) {}
    }
  }, 900);

  window.StoryHostControls = {
    loadStories,
    prepareStoryMode,
    startStoryMode,
    nextStoryStep,
  };
})();
