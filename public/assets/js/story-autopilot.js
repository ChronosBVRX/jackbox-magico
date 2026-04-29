(() => {
  const AUTO_REVEAL_BUFFER_SECONDS = 1.8;
  const TRANSITION_POLL_MS = 700;

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

  async function fetchStatus() {
    const room = getRoom();
    if (!room) return null;

    try {
      const res = await fetch(`/api/room/${room}/status?storyAutoTs=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
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
      if (waitSubtitle && running) waitSubtitle.innerText = "La historia avanza cuando todos confirman que están listos.";
      if (waitMsg && prepared) waitMsg.innerText = "Historia preparada";
      if (waitSubtitle && prepared) waitSubtitle.innerText = "La TV iniciará la aventura cuando todos estén listos.";
    }
  }

  async function runAutopilot(data) {
    updateMobileUi(data);

    if (!autopilotEnabled || !isHost() || !isStoryState(data)) return;

    const state = data.game_state || {};
    const phase = getPhase(data);

    if (data.status !== "playing") return;

    // El avance posterior a resultados lo controla story-ready-tv.js.
    // Este script solo revela resultados cuando termina el tiempo de la ronda.
    if (phase && !String(phase).startsWith("results_") && phase !== "lobby") {
      const delay = secondsUntilAutoReveal(state) * 1000;
      const key = `reveal:${phase}:${state.round_id || state.question || state.current_game_id || "round"}`;
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
      body.story-tv-controlled .trivia-mobile-host-extra,
      body.story-tv-controlled .host-panel {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }

      body.story-tv-controlled #wait-pill {
        color: #271600 !important;
        background: linear-gradient(135deg, #fff8d6, #facc15) !important;
      }

      body.story-tv-controlled #wait-subtitle {
        color: rgba(255,248,221,.78) !important;
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
