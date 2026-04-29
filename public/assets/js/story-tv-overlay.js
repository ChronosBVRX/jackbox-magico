(() => {
  const HOUSE_ICONS = {
    Gryffindor: "🦁",
    Slytherin: "🐍",
    Ravenclaw: "🦅",
    Hufflepuff: "🦡",
  };

  const HOUSE_ORDER = ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"];

  let lastRoom = "";
  let lastStoryKey = "";

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

  function getRoomCode() {
    const codeFromTv = document.getElementById("tv-code")?.textContent?.trim();

    if (codeFromTv && codeFromTv !== "----") {
      lastRoom = codeFromTv.toUpperCase();
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

  function calculateHouseScores(players = []) {
    const scores = {
      Gryffindor: 0,
      Slytherin: 0,
      Ravenclaw: 0,
      Hufflepuff: 0,
    };

    players.forEach((player) => {
      const house = player.house || "";
      if (!scores[house]) scores[house] = 0;
      scores[house] += Number(player.score || 0);
    });

    return scores;
  }

  function ensureStyles() {
    if (document.getElementById("story-tv-overlay-style")) return;

    const style = document.createElement("style");
    style.id = "story-tv-overlay-style";
    style.textContent = `
      .story-tv-overlay {
        position: fixed;
        left: 50%;
        bottom: 22px;
        z-index: 9999;
        width: min(1180px, calc(100vw - 44px));
        transform: translateX(-50%);
        pointer-events: none;
        opacity: 0;
        translate: 0 18px;
        transition: opacity .28s ease, translate .28s ease;
      }

      .story-tv-overlay.visible {
        opacity: 1;
        translate: 0 0;
      }

      .story-tv-card {
        position: relative;
        overflow: hidden;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 16px;
        align-items: stretch;
        padding: 16px;
        border-radius: 28px;
        color: #fff7dc;
        background:
          radial-gradient(circle at 8% 0%, rgba(255,216,121,.22), transparent 34%),
          radial-gradient(circle at 86% 0%, rgba(96,165,250,.16), transparent 30%),
          rgba(5, 10, 24, .86);
        border: 1px solid rgba(255,216,121,.28);
        box-shadow:
          0 24px 80px rgba(0,0,0,.54),
          inset 0 0 0 1px rgba(255,255,255,.05);
        backdrop-filter: blur(18px);
      }

      .story-tv-card::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px);
        background-size: 48px 48px;
        opacity: .30;
        pointer-events: none;
      }

      .story-tv-main,
      .story-tv-scoreboard {
        position: relative;
        z-index: 2;
      }

      .story-tv-pill-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 8px;
      }

      .story-tv-pill {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 7px 11px;
        border-radius: 999px;
        color: #ffe7a3;
        background: rgba(255,216,121,.12);
        border: 1px solid rgba(255,216,121,.24);
        font-size: .76rem;
        font-weight: 1000;
        text-transform: uppercase;
        letter-spacing: .08em;
      }

      .story-tv-pill.blue {
        color: #d8ecff;
        background: rgba(96,165,250,.13);
        border-color: rgba(125,211,252,.26);
      }

      .story-tv-title {
        margin: 0 0 5px;
        color: #fff;
        font-size: clamp(1.5rem, 2.5vw, 2.5rem);
        line-height: .96;
        letter-spacing: -.055em;
        font-weight: 1000;
      }

      .story-tv-dialogue {
        margin: 0;
        color: rgba(255,248,221,.86);
        font-size: clamp(.96rem, 1.35vw, 1.22rem);
        line-height: 1.18;
        font-weight: 850;
      }

      .story-tv-reason {
        margin-top: 8px;
        padding: 9px 11px;
        border-radius: 16px;
        color: rgba(255,248,221,.78);
        background: rgba(255,255,255,.065);
        border: 1px solid rgba(255,255,255,.10);
        font-size: .92rem;
        line-height: 1.2;
        font-weight: 800;
      }

      .story-tv-scoreboard {
        min-width: 310px;
        display: grid;
        gap: 7px;
        align-content: center;
      }

      .story-tv-score-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 12px;
        align-items: center;
        padding: 8px 10px;
        border-radius: 15px;
        color: #fff;
        background: rgba(255,255,255,.06);
        border: 1px solid rgba(255,255,255,.09);
      }

      .story-tv-score-name {
        display: flex;
        align-items: center;
        gap: 7px;
        font-weight: 950;
        font-size: .92rem;
      }

      .story-tv-score-points {
        color: #ffe089;
        font-weight: 1000;
        font-size: 1.08rem;
      }

      @media (max-width: 860px) {
        .story-tv-card {
          grid-template-columns: 1fr;
        }

        .story-tv-scoreboard {
          min-width: 0;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `;

    document.head.appendChild(style);
  }

  function ensureOverlay() {
    ensureStyles();

    let overlay = document.getElementById("story-tv-overlay");

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "story-tv-overlay";
      overlay.className = "story-tv-overlay";
      document.body.appendChild(overlay);
    }

    return overlay;
  }

  function getStoryTitle(state = {}) {
    return (
      state.story_public?.story_title ||
      state.story?.story_title ||
      state.story_title ||
      "Modo Historia"
    );
  }

  function getStepLabel(state = {}) {
    const step = state.story_step || state.story_public?.current_story_step || state.story?.current_story_step;
    const type = step?.type || state.story_step_type || "story";

    if (type === "trivia_block") return "Trivia narrativa";
    if (type === "minigame_random") return "Prueba mágica";
    if (type === "copa_final") return "Copa Final";
    if (type === "dialogue") return "Historia";
    return "Modo Historia";
  }

  function getDialogue(state = {}) {
    const lines = Array.isArray(state.story_dialogue) ? state.story_dialogue : [];

    if (lines.length) return lines.join(" ");

    const step = state.story_step || state.story_public?.current_story_step || state.story?.current_story_step;
    const stepLines = Array.isArray(step?.lines) ? step.lines : [];

    if (stepLines.length) return stepLines.join(" ");

    if (state.phase === "trivia") {
      return "La trivia continúa. Responde con sabiduría, reflejos y un poquito de dignidad mágica.";
    }

    if (state.phase && state.phase !== "lobby") {
      return "La historia acaba de abrir una prueba inesperada. Nadie dijo que la Copa de las Casas fuera estable emocionalmente.";
    }

    return "El modo Historia está preparado. Cuando el host lo indique, la aventura comienza.";
  }

  function renderScores(players = []) {
    const scores = calculateHouseScores(players);

    return HOUSE_ORDER
      .sort((a, b) => Number(scores[b] || 0) - Number(scores[a] || 0))
      .map((house) => `
        <div class="story-tv-score-row">
          <div class="story-tv-score-name">${HOUSE_ICONS[house] || "✨"} ${escapeHTML(house)}</div>
          <div class="story-tv-score-points">${Number(scores[house] || 0)}</div>
        </div>
      `)
      .join("");
  }

  function renderOverlay(data) {
    const state = data.game_state || {};
    const overlay = ensureOverlay();

    if (state.mode !== "story") {
      overlay.classList.remove("visible");
      overlay.innerHTML = "";
      return;
    }

    const title = getStoryTitle(state);
    const stepLabel = getStepLabel(state);
    const dialogue = getDialogue(state);
    const reason = state.story_transition_reason || "";
    const storyStep = Number(state.story_public?.story_step_index ?? state.story?.story_step_index ?? 0) + 1;
    const key = `${title}-${stepLabel}-${dialogue}-${reason}-${state.phase}-${storyStep}`;

    if (key !== lastStoryKey) {
      lastStoryKey = key;
      try {
        if (window.MagicSound?.play) {
          window.MagicSound.play("sparkle");
        }
      } catch (error) {}
    }

    overlay.innerHTML = `
      <div class="story-tv-card">
        <div class="story-tv-main">
          <div class="story-tv-pill-row">
            <span class="story-tv-pill">📖 ${escapeHTML(stepLabel)}</span>
            <span class="story-tv-pill blue">Capítulo ${storyStep}</span>
            <span class="story-tv-pill blue">${escapeHTML(state.current_game_id || state.phase || "lobby")}</span>
          </div>
          <h2 class="story-tv-title">${escapeHTML(title)}</h2>
          <p class="story-tv-dialogue">${escapeHTML(dialogue)}</p>
          ${reason ? `<div class="story-tv-reason">${escapeHTML(reason)}</div>` : ""}
        </div>
        <div class="story-tv-scoreboard">
          ${renderScores(data.players || [])}
        </div>
      </div>
    `;

    overlay.classList.add("visible");
  }

  async function pollStoryState() {
    const room = getRoomCode();
    const overlay = ensureOverlay();

    if (!room) {
      overlay.classList.remove("visible");
      return;
    }

    try {
      const res = await fetch(`/api/room/${room}/status?storyTs=${Date.now()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        overlay.classList.remove("visible");
        return;
      }

      const data = await res.json();
      renderOverlay(data);
    } catch (error) {
      overlay.classList.remove("visible");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    ensureOverlay();
    setInterval(pollStoryState, 950);
  });

  window.StoryTvOverlay = {
    pollStoryState,
  };
})();
