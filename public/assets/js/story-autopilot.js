(() => {
  const AUTO_REVEAL_BUFFER_SECONDS = 1.8;
  const RESULTS_PAUSE_MS = 5200;
  const MINIGAME_RESULTS_PAUSE_MS = 6500;
  const TRANSITION_POLL_MS = 700;

  let lastStatus = null;
  let pendingActionKey = "";
  let lastActionAt = 0;
  let autopilotEnabled = true;

  function getRoom() {
    try {
      if (typeof myRoom !== "undefined" && myRoom) return String(myRoom).toUpperCase();
    } catch (error) {}
    return (localStorage.getItem("jackbox_magico_room") || "").toUpperCase();
  }

  function isHost() {
    try {
      return Boolean(myIsHost);
    } catch (error) {
      return false;
    }
  }

  function isStoryState(data) {
    return data?.game_state?.mode === "story";
  }

  function isTvControlled(data) {
    const state = data?.game_state || {};
    return state.story_controlled_by === "tv" || state.managed_by === "tv";
  }

  function getPhase(data) {
    return data?.game_state?.phase || data?.status || "lobby";
  }

  function getStep(data) {
    const state = data?.game_state || {};
    return state.story_public?.current_story_step || state.story?.current_story_step || state.story_step || null;
  }

  function getStepType(data) {
    const state = data?.game_state || {};
    const step = getStep(data);
    return step?.type || state.story_step_type || "";
  }

  function getStepIndex(data) {
    const state = data?.game_state || {};
    return Number(state.story_public?.story_step_index ?? state.story?.story_step_index ?? 0);
  }

  function getTargetQuestions(data) {
    const state = data?.game_state || {};
    const step = getStep(data);
    return Number(state.story_trivia_target_questions || step?.questions || 0);
  }

  function progressKey(data) {
    const room = getRoom();
    const state = data?.game_state || {};
    const storyId = state.story_public?.story_id || state.story?.story_id || "story";
    return `jackbox_story_progress_${room}_${storyId}_${getStepIndex(data)}`;
  }

  function readProgress(data) {
    try {
      const raw = localStorage.getItem(progressKey(data));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeProgress(data, list) {
    try {
      localStorage.setItem(progressKey(data), JSON.stringify(Array.from(new Set(list)).slice(-30)));
    } catch (error) {}
  }

  function resultIdentity(data) {
    const state = data?.game_state || {};
    return [
      state.round_id,
      state.question_id,
      state.current_question_id,
      state.question,
      state.question_text,
      state.correct_label,
      state.correct,
    ].map((value) => String(value || "").trim()).filter(Boolean).join("|") || `${Date.now()}`;
  }

  function recordTriviaResult(data) {
    if (getPhase(data) !== "results_trivia" || getStepType(data) !== "trivia_block") {
      return readProgress(data).length;
    }

    const id = resultIdentity(data);
    const list = readProgress(data);
    if (!list.includes(id)) {
      list.push(id);
      writeProgress(data, list);
    }
    return list.length;
  }

  function triviaBlockComplete(data) {
    const target = getTargetQuestions(data);
    const count = recordTriviaResult(data);
    return Boolean(target && count >= target);
  }

  async function fetchStatus() {
    const room = getRoom();
    if (!room) return null;

    try {
      const res = await fetch(`/api/room/${room}/status?storyAutoTs=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      lastStatus = data;
      return data;
    } catch (error) {
      return null;
    }
  }

  function debounceAction(key, delayMs, action) {
    if (pendingActionKey === key) return;
    pendingActionKey = key;

    window.setTimeout(async () => {
      if (pendingActionKey !== key) return;
      pendingActionKey = "";

      if (Date.now() - lastActionAt < 1200) return;
      lastActionAt = Date.now();

      await action();
    }, delayMs);
  }

  function secondsUntilAutoReveal(state) {
    const duration = Number(state.duration_seconds || state.mix_seconds || state.round_seconds || 10);
    const startedAt = Number(state.started_at || 0) * 1000;

    if (!startedAt) return Math.min(Math.max(duration + AUTO_REVEAL_BUFFER_SECONDS, 7), 28);

    const elapsed = Math.max(0, Date.now() - startedAt) / 1000;
    const left = duration + AUTO_REVEAL_BUFFER_SECONDS - elapsed;
    return Math.min(Math.max(left, 1.2), 28);
  }

  async function callRevealResults() {
    if (typeof window.hostRevealResults === "function") {
      window.hostRevealResults();
    }
  }

  async function callTriviaNext() {
    if (typeof window.hostTriviaNext === "function") {
      window.hostTriviaNext();
    }
  }

  async function callStoryNext() {
    if (window.StoryHostControls?.nextStoryStep) {
      await window.StoryHostControls.nextStoryStep({ force: true });
    }
  }

  function updateMobileUi(data) {
    const story = isStoryState(data);
    const tvControlled = story && isTvControlled(data);
    const running = story && data?.status === "playing" && getPhase(data) !== "lobby";
    const prepared = story && !running;

    document.body.classList.toggle("story-mode-prepared", prepared);
    document.body.classList.toggle("story-mode-running", running);
    document.body.classList.toggle("story-mode-any", story);
    document.body.classList.toggle("story-tv-controlled", tvControlled);

    const hostPanel = document.getElementById("host-panel");
    const hostGamePanel = document.getElementById("host-game-panel");

    if (tvControlled) {
      if (hostPanel) hostPanel.classList.remove("visible");
      if (hostGamePanel) hostGamePanel.classList.remove("visible");

      const waitMsg = document.getElementById("wait-msg");
      const waitSubtitle = document.getElementById("wait-subtitle");
      const waitPill = document.getElementById("wait-pill");

      if (waitPill) waitPill.innerText = "📖 Historia";
      if (waitMsg && running) waitMsg.innerText = "¡Mira la TV!";
      if (waitSubtitle && running) waitSubtitle.innerText = "La historia avanza automáticamente. Tu celular solo será tu control para responder.";
      if (waitMsg && prepared) waitMsg.innerText = "Historia preparada";
      if (waitSubtitle && prepared) waitSubtitle.innerText = "La TV iniciará la aventura cuando todos estén listos.";
      return;
    }

    if (!hostPanel) return;

    const freeControls = [
      document.getElementById("host-game-select"),
      document.getElementById("host-start-btn"),
    ];

    freeControls.forEach((el) => {
      if (!el) return;
      el.disabled = running;
      el.setAttribute("aria-hidden", running ? "true" : "false");
    });

    if (running) {
      const help = hostPanel.querySelector(":scope > p");
      if (help) help.textContent = "Modo Historia en piloto automático. Mira la TV y deja que la secuencia avance sola.";
    }

    const status = document.getElementById("story-host-status");
    if (status && running) {
      const phase = getPhase(data);
      const label = phase === "trivia"
        ? "Piloto automático: la trivia se revelará al terminar el tiempo."
        : String(phase).startsWith("results_")
          ? "Piloto automático: avanzando después de mostrar resultados."
          : "Piloto automático: prueba mágica en curso.";
      status.textContent = label;
      status.className = "story-host-status good";
    }
  }

  async function runAutopilot(data) {
    if (!autopilotEnabled || !isHost() || !isStoryState(data)) {
      updateMobileUi(data);
      return;
    }

    updateMobileUi(data);

    const state = data.game_state || {};
    const phase = getPhase(data);

    if (data.status !== "playing") return;

    if (phase === "trivia") {
      const delay = secondsUntilAutoReveal(state) * 1000;
      const key = `reveal:${phase}:${state.round_id || state.question || getStepIndex(data)}`;
      debounceAction(key, delay, async () => {
        const fresh = await fetchStatus();
        if (fresh && getPhase(fresh) === "trivia") await callRevealResults();
      });
      return;
    }

    if (phase === "results_trivia") {
      recordTriviaResult(data);
      const complete = triviaBlockComplete(data);
      const key = complete
        ? `story-next:${getStepIndex(data)}:${recordTriviaResult(data)}`
        : `trivia-next:${getStepIndex(data)}:${recordTriviaResult(data)}`;

      debounceAction(key, RESULTS_PAUSE_MS, async () => {
        const fresh = await fetchStatus();
        if (!fresh || getPhase(fresh) !== "results_trivia") return;

        if (triviaBlockComplete(fresh)) {
          await callStoryNext();
        } else {
          await callTriviaNext();
        }
      });
      return;
    }

    if (String(phase).startsWith("results_")) {
      const key = `story-next-after-minigame:${phase}:${getStepIndex(data)}:${state.round_id || state.current_game_id || "game"}`;
      debounceAction(key, MINIGAME_RESULTS_PAUSE_MS, async () => {
        const fresh = await fetchStatus();
        if (fresh && String(getPhase(fresh)).startsWith("results_")) await callStoryNext();
      });
      return;
    }

    if (phase && phase !== "lobby") {
      const delay = secondsUntilAutoReveal(state) * 1000;
      const key = `reveal-minigame:${phase}:${state.round_id || state.current_game_id || getStepIndex(data)}`;
      debounceAction(key, delay, async () => {
        const fresh = await fetchStatus();
        const freshPhase = getPhase(fresh);
        if (fresh && freshPhase && !String(freshPhase).startsWith("results_") && freshPhase !== "lobby") {
          await callRevealResults();
        }
      });
    }
  }

  function injectStyles() {
    if (document.getElementById("story-autopilot-style")) return;

    const style = document.createElement("style");
    style.id = "story-autopilot-style";
    style.textContent = `
      body.story-mode-running #host-game-select,
      body.story-mode-running #host-start-btn,
      body.story-mode-running #story-select,
      body.story-mode-running #story-prepare-btn,
      body.story-mode-running #story-start-btn,
      body.story-mode-running #story-next-btn {
        display: none !important;
      }

      body.story-tv-controlled #host-panel,
      body.story-tv-controlled #host-game-panel,
      body.story-tv-controlled .story-host-panel,
      body.story-tv-controlled .trivia-mobile-host-extra {
        display: none !important;
      }

      body.story-tv-controlled #wait-pill {
        color: #271600 !important;
        background: linear-gradient(135deg, #fff8d6, #facc15) !important;
      }

      body.story-tv-controlled #wait-subtitle {
        color: rgba(255,248,221,.78) !important;
      }

      body.story-mode-running #host-panel > p {
        padding: 12px;
        border-radius: 16px;
        color: #bbf7d0 !important;
        background: rgba(34,197,94,.10);
        border: 1px solid rgba(74,222,128,.22);
        font-weight: 900;
      }
    `;

    document.head.appendChild(style);
  }

  async function tick() {
    injectStyles();
    const data = await fetchStatus();
    if (!data) return;
    await runAutopilot(data);
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    window.setInterval(tick, TRANSITION_POLL_MS);
    window.setTimeout(tick, 900);
  });

  window.StoryAutopilot = {
    tick,
    enable() { autopilotEnabled = true; },
    disable() { autopilotEnabled = false; pendingActionKey = ""; },
  };
})();
