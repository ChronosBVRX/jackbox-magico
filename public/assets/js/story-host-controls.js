(() => {
  let storiesLoaded = false;
  let stories = [];
  let storyPrepared = false;
  let pendingForceAdvanceKey = "";
  let lastStatusData = null;
  let originalHostTriviaNext = null;
  let originalHostTriviaNextCaptured = false;

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

  function getStoryStep(data) {
    const state = data?.game_state || {};
    return state.story_public?.current_story_step || state.story?.current_story_step || state.story_step || null;
  }

  function getStoryStepIndex(data) {
    const state = data?.game_state || {};
    return Number(state.story_public?.story_step_index ?? state.story?.story_step_index ?? 0);
  }

  function getStoryStepType(data) {
    const state = data?.game_state || {};
    const step = getStoryStep(data);
    return step?.type || state.story_step_type || "";
  }

  function getTriviaTargetQuestions(data) {
    const state = data?.game_state || {};
    const step = getStoryStep(data);
    return Number(state.story_trivia_target_questions || step?.questions || 0);
  }

  function getProgressStorageKey(data) {
    const room = getRoom();
    const state = data?.game_state || {};
    const storyId = state.story_public?.story_id || state.story?.story_id || "story";
    const stepIndex = getStoryStepIndex(data);
    return `jackbox_story_progress_${room}_${storyId}_${stepIndex}`;
  }

  function readProgressList(data) {
    try {
      const raw = localStorage.getItem(getProgressStorageKey(data));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeProgressList(data, list) {
    try {
      localStorage.setItem(getProgressStorageKey(data), JSON.stringify(Array.from(new Set(list)).slice(-30)));
    } catch (error) {}
  }

  function getTriviaResultIdentity(data) {
    const state = data?.game_state || {};
    const question = state.question || state.question_text || state.attack_msg || "";
    const round = state.round_id || state.question_id || state.current_question_id || "";
    const correct = state.correct_label || state.correct || "";

    return [round, question, correct]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join("|") || `result-${Date.now()}`;
  }

  function recordTriviaProgressIfNeeded(data) {
    const state = data?.game_state || {};
    const phase = state.phase || "lobby";

    if (phase !== "results_trivia" || getStoryStepType(data) !== "trivia_block") {
      return readProgressList(data).length;
    }

    const identity = getTriviaResultIdentity(data);
    const list = readProgressList(data);

    if (!list.includes(identity)) {
      list.push(identity);
      writeProgressList(data, list);
    }

    return list.length;
  }

  function getTriviaProgressInfo(data) {
    const target = getTriviaTargetQuestions(data);
    const count = recordTriviaProgressIfNeeded(data);

    return {
      count,
      target,
      complete: Boolean(target && count >= target),
      hasTarget: Boolean(target),
    };
  }

  function shouldWarnBeforeAdvance(data) {
    const state = data?.game_state || {};

    if (state.phase !== "results_trivia" || getStoryStepType(data) !== "trivia_block") {
      return { warn: false, key: "", progress: getTriviaProgressInfo(data) };
    }

    const progress = getTriviaProgressInfo(data);

    if (!progress.hasTarget || progress.complete) {
      return { warn: false, key: "", progress };
    }

    const key = `${getProgressStorageKey(data)}_${progress.count}_${progress.target}`;
    return { warn: true, key, progress };
  }

  function shouldStoryTakeOverTriviaNext(data) {
    const state = data?.game_state || {};
    if (state.phase !== "results_trivia") return false;
    if (!getStoryData(data)) return false;
    if (getStoryStepType(data) !== "trivia_block") return false;

    const progress = getTriviaProgressInfo(data);
    return Boolean(progress.hasTarget && progress.complete);
  }

  async function getRoomStatus() {
    const room = getRoom();
    if (!room) return null;

    const res = await fetch(`/api/room/${room}/status?storyHostTs=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    lastStatusData = data;
    return data;
  }

  async function loadStories() {
    if (storiesLoaded) return stories;
    const res = await fetch("/api/story/catalog", { cache: "no-store" });
    const data = await res.json();
    stories = data.stories || [];
    storiesLoaded = true;
    return stories;
  }

  function getModeLabel(data) {
    const state = data?.game_state || {};
    const phase = state.phase || "lobby";
    const stepType = getStoryStepType(data);
    const progress = getTriviaProgressInfo(data);

    if (!getStoryData(data)) return "Elige una historia para comenzar.";
    if (phase === "lobby") return "Historia preparada. Inicia cuando todos estén listos.";
    if (phase === "trivia") return progress.hasTarget ? `Trivia narrativa: bloque de ${progress.target} preguntas.` : "Trivia narrativa en curso.";
    if (phase === "results_trivia" && stepType === "trivia_block") {
      return progress.complete ? `Bloque completo ${progress.count}/${progress.target}. Sigue prueba mágica.` : `Progreso ${progress.count}/${progress.target}. Continúa trivia.`;
    }
    if (String(phase).startsWith("results_")) return "Resultados listos. Avanza a la siguiente etapa.";
    return "Prueba mágica activa. Mira la TV y espera resultados.";
  }

  function removeDuplicateStoryPanels() {
    const panels = Array.from(document.querySelectorAll(".story-host-panel"));
    panels.forEach((panel, index) => {
      if (index > 0) panel.remove();
    });
  }

  async function ensureStoryPanel() {
    if (!isHost()) return null;

    removeDuplicateStoryPanels();

    const hostPanel = document.getElementById("host-panel");
    if (!hostPanel) return null;

    let panel = document.querySelector(".story-host-panel");
    if (panel) {
      if (!hostPanel.contains(panel)) hostPanel.prepend(panel);
      return panel;
    }

    await loadStories();

    panel = document.createElement("div");
    panel.id = "story-host-panel";
    panel.className = "story-host-panel";
    panel.innerHTML = `
      <div class="story-host-card story-main-card">
        <div class="story-host-kicker">Modo principal</div>
        <div class="story-host-title">📖 Modo Historia</div>
        <p class="story-host-copy">
          Trivia, transiciones, minijuegos y Copa Final en una partida guiada de 20 a 30 minutos.
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

    hostPanel.prepend(panel);

    document.getElementById("story-prepare-btn")?.addEventListener("click", prepareStoryMode);
    document.getElementById("story-start-btn")?.addEventListener("click", startStoryMode);
    document.getElementById("story-next-btn")?.addEventListener("click", () => nextStoryStep());

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
    const stepType = getStoryStepType(data);
    const progress = getTriviaProgressInfo(data);

    if (nextBtn) nextBtn.disabled = !storyState || !safe;
    if (startBtn) startBtn.disabled = Boolean(storyState && data?.status === "playing" && phase !== "lobby");
    if (prepareBtn) prepareBtn.disabled = Boolean(data?.status !== "lobby");
    if (select) select.disabled = Boolean(data?.status !== "lobby");

    if (!storyState) {
      box.className = "story-host-advice";
      box.innerHTML = "El modo Historia todavía no está preparado para esta sala.";
      return;
    }

    let label = "Historia preparada";
    let detail = "Cuando todos estén listos, inicia la historia.";
    let className = "story-host-advice";

    if (phase === "trivia") {
      label = "Trivia narrativa en curso";
      detail = progress.hasTarget ? `Bloque objetivo: ${progress.target} preguntas. Revela resultados antes de avanzar.` : "Primero revela resultados.";
    } else if (phase === "results_trivia" && stepType === "trivia_block") {
      label = progress.complete ? "Bloque de trivia completado" : "Resultados de trivia";
      detail = progress.hasTarget
        ? progress.complete
          ? `Van ${progress.count}/${progress.target}. Ahora toca transición y prueba mágica.`
          : `Van ${progress.count}/${progress.target}. Sigue con otra pregunta de trivia.`
        : "Puedes continuar o avanzar de etapa.";
      className = progress.complete ? "story-host-advice ready" : "story-host-advice caution";
    } else if (String(phase).startsWith("results_")) {
      label = "Resultados listos";
      detail = "Avanza a la siguiente etapa narrativa.";
      className = "story-host-advice ready";
    } else if (phase === "lobby") {
      label = "Lobby de historia";
      detail = "Inicia la historia cuando estén todos los jugadores.";
    } else {
      label = "Prueba mágica activa";
      detail = "Los controles libres se ocultan para no romper la secuencia.";
    }

    box.className = className;
    box.innerHTML = `
      <strong>${escapeHTML(storyTitle)}</strong><br>
      <span>${escapeHTML(label)}</span><br>
      <small>${escapeHTML(detail)}</small>
    `;
  }

  function updateHostUiPriority(data) {
    const hostPanel = document.getElementById("host-panel");
    if (!hostPanel) return;

    const state = data?.game_state || {};
    const storyActive = Boolean(getStoryData(data));
    const phase = state.phase || "lobby";
    hostPanel.classList.toggle("story-mode-active", storyActive);

    const genericControls = [
      document.getElementById("host-game-select"),
      document.getElementById("host-start-btn"),
    ];

    genericControls.forEach((el) => {
      if (!el) return;
      const wrapper = el;
      wrapper.classList.toggle("story-secondary-control", storyActive);
      wrapper.disabled = storyActive && phase !== "lobby";
    });

    const revealButtons = Array.from(hostPanel.querySelectorAll("button"))
      .filter((btn) => btn.textContent.includes("Revelar resultados") || btn.textContent.includes("Volver al lobby"));
    revealButtons.forEach((btn) => {
      btn.classList.toggle("story-essential-control", storyActive);
    });

    const title = hostPanel.querySelector(".host-title");
    if (title && storyActive) title.textContent = "👑 Host de la historia";

    const help = hostPanel.querySelector(":scope > p");
    if (help) help.textContent = storyActive ? getModeLabel(data) : "Cuando todos estén listos, inicia un minijuego.";
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
        body: JSON.stringify({ player_name: playerName, host_token: hostToken, story_id: storyId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.detail || data));

      storyPrepared = true;
      pendingForceAdvanceKey = "";
      clearCurrentStoryProgressCache();
      setStoryStatus(`Historia lista: ${data.story_title || storyId}`, "good");
    } catch (error) {
      setStoryStatus(`No se pudo preparar: ${error.message || error}`, "bad");
    }
  }

  function clearCurrentStoryProgressCache() {
    const room = getRoom();
    if (!room) return;
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(`jackbox_story_progress_${room}_`)) localStorage.removeItem(key);
    });
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

    if (!storyPrepared) await prepareStoryMode();

    setStoryStatus("Iniciando modo Historia...", "neutral");

    try {
      const res = await fetch(`/api/story/host/${room}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_name: playerName, host_token: hostToken }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.detail || data));

      pendingForceAdvanceKey = "";
      setStoryStatus(`Historia iniciada: ${data.game_name || data.game_id}`, "good");
    } catch (error) {
      setStoryStatus(`No se pudo iniciar: ${error.message || error}`, "bad");
    }
  }

  async function nextStoryStep({ force = false } = {}) {
    const room = getRoom();
    const playerName = getPlayerName();
    const hostToken = getHostToken(room);

    if (!room || !playerName || !hostToken) {
      setStoryStatus("Faltan datos para avanzar historia.", "bad");
      return false;
    }

    const current = await getRoomStatus();

    if (!current || !getStoryData(current)) {
      setStoryStatus("Esta sala todavía no está en modo Historia.", "bad");
      return false;
    }

    if (!isSafeToAdvance(current)) {
      setStoryStatus("No avances todavía: primero termina la ronda y revela resultados.", "bad");
      return false;
    }

    const warning = shouldWarnBeforeAdvance(current);
    if (!force && warning.warn && pendingForceAdvanceKey !== warning.key) {
      pendingForceAdvanceKey = warning.key;
      setStoryStatus(`Aún faltan preguntas (${warning.progress.count}/${warning.progress.target}). Toca otra vez para forzar.`, "bad");
      return false;
    }

    setStoryStatus("Avanzando etapa narrativa...", "neutral");

    try {
      const res = await fetch(`/api/story/host/${room}/next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_name: playerName, host_token: hostToken }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.detail || data));

      pendingForceAdvanceKey = "";
      setStoryStatus(`Nueva etapa: ${data.game_name || data.game_id}`, "good");
      return true;
    } catch (error) {
      setStoryStatus(`No se pudo avanzar: ${error.message || error}`, "bad");
      return false;
    }
  }

  function captureOriginalTriviaNext() {
    if (originalHostTriviaNextCaptured) return;
    if (typeof window.hostTriviaNext === "function") {
      originalHostTriviaNext = window.hostTriviaNext;
      originalHostTriviaNextCaptured = true;
    }
  }

  function installTriviaNextInterceptor() {
    captureOriginalTriviaNext();
    if (window.hostTriviaNext?.__storyWrapped) return;

    const wrapped = async function storyAwareTriviaNext(...args) {
      try {
        const current = await getRoomStatus();
        if (shouldStoryTakeOverTriviaNext(current)) {
          await nextStoryStep({ force: true });
          return;
        }
      } catch (error) {}

      if (typeof originalHostTriviaNext === "function") return originalHostTriviaNext.apply(this, args);
    };

    wrapped.__storyWrapped = true;
    window.hostTriviaNext = wrapped;
  }

  function patchTriviaNextButtons(data) {
    const buttons = Array.from(document.querySelectorAll(".trivia-next-btn"));
    if (!buttons.length) return;
    const takeOver = shouldStoryTakeOverTriviaNext(data || lastStatusData);

    buttons.forEach((btn) => {
      if (takeOver) {
        btn.textContent = "Avanzar a prueba mágica";
        btn.setAttribute("data-story-takeover", "true");
      } else {
        btn.textContent = "Siguiente pregunta de trivia";
        btn.removeAttribute("data-story-takeover");
      }
    });
  }

  function injectStyles() {
    if (document.getElementById("story-host-controls-style")) return;

    const style = document.createElement("style");
    style.id = "story-host-controls-style";
    style.textContent = `
      .host-panel.story-mode-active {
        border-color: rgba(255,216,121,.34) !important;
        background: rgba(255,255,255,.055) !important;
      }
      .story-host-panel { margin: 0 0 16px; }
      .story-host-card {
        padding: 16px;
        border-radius: 24px;
        background:
          radial-gradient(circle at 18% 0%, rgba(255,216,121,.20), transparent 36%),
          rgba(255,255,255,.08);
        border: 1px solid rgba(255,216,121,.25);
        box-shadow: 0 16px 34px rgba(0,0,0,.20);
      }
      .story-host-kicker {
        display: inline-flex;
        margin-bottom: 7px;
        padding: 6px 10px;
        border-radius: 999px;
        color: #2a1700;
        background: linear-gradient(135deg, #fff8d6, #facc15);
        font-size: .72rem;
        font-weight: 1000;
        text-transform: uppercase;
        letter-spacing: .08em;
      }
      .story-host-title {
        color: #ffe7a3;
        font-weight: 1000;
        margin-bottom: 6px;
        font-size: 1.18rem;
      }
      .story-host-copy {
        margin: 0 0 12px;
        color: rgba(255,248,221,.76);
        font-size: .9rem;
        line-height: 1.28;
      }
      #story-select { width: 100%; margin-bottom: 10px; }
      #story-prepare-btn,
      #story-start-btn,
      #story-next-btn { width: 100%; margin-top: 8px; }
      #story-prepare-btn:disabled,
      #story-start-btn:disabled,
      #story-next-btn:disabled,
      #story-select:disabled { opacity: .45; cursor: not-allowed; filter: grayscale(.2); }
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
      .story-host-advice.ready { color: #bbf7d0; background: rgba(34,197,94,.12); border-color: rgba(74,222,128,.28); }
      .story-host-advice.caution { color: #fde68a; background: rgba(250,204,21,.10); border-color: rgba(250,204,21,.26); }
      .story-host-advice strong { color: #ffe7a3; }
      .story-host-advice small { display: block; margin-top: 3px; color: rgba(255,248,221,.66); }
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
      .host-panel.story-mode-active .story-secondary-control {
        opacity: .42;
        transform: scale(.98);
      }
      .host-panel.story-mode-active #host-game-select,
      .host-panel.story-mode-active #host-start-btn {
        font-size: .82rem !important;
        min-height: 42px !important;
        margin-top: 8px !important;
      }
      .host-panel.story-mode-active #host-game-select::before {
        content: "Modo libre";
      }
      .host-panel.story-mode-active .story-essential-control {
        opacity: 1;
      }
      .trivia-next-btn[data-story-takeover="true"] {
        background: linear-gradient(135deg, #bbf7d0, #facc15) !important;
      }
    `;
    document.head.appendChild(style);
  }

  const interval = setInterval(async () => {
    injectStyles();
    installTriviaNextInterceptor();

    if (isHost()) {
      await ensureStoryPanel();
      try {
        const data = await getRoomStatus();
        if (data) {
          setStoryAdvice(data);
          updateHostUiPriority(data);
          patchTriviaNextButtons(data);
        }
      } catch (error) {}
    }
  }, 700);

  window.StoryHostControls = {
    loadStories,
    prepareStoryMode,
    startStoryMode,
    nextStoryStep,
    getRoomStatus,
  };
})();
