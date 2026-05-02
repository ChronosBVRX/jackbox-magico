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
  let cinematicUntil = 0;

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
        bottom: clamp(12px, 2vh, 22px);
        z-index: 9999;
        width: min(1040px, calc(100vw - 40px));
        transform: translateX(-50%);
        pointer-events: none;
        opacity: 0;
        translate: 0 14px;
        transition: opacity .28s ease, translate .28s ease, width .28s ease;
      }

      .story-tv-overlay.visible {
        opacity: 1;
        translate: 0 0;
      }

      .story-tv-card {
        position: relative;
        overflow: hidden;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(190px, 250px);
        gap: 12px;
        align-items: center;
        padding: clamp(10px, 1.5vh, 16px);
        border-radius: clamp(18px, 2vw, 28px);
        color: #fff7dc;
        background:
          radial-gradient(circle at 8% 0%, rgba(255,216,121,.18), transparent 34%),
          radial-gradient(circle at 86% 0%, rgba(96,165,250,.14), transparent 30%),
          rgba(5, 10, 24, .82);
        border: 1px solid rgba(255,216,121,.24);
        box-shadow:
          0 18px 56px rgba(0,0,0,.44),
          inset 0 0 0 1px rgba(255,255,255,.05);
        backdrop-filter: blur(16px);
      }

      .story-tv-card::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px);
        background-size: 44px 44px;
        opacity: .24;
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
        gap: 6px;
        margin-bottom: 6px;
      }

      .story-tv-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 9px;
        border-radius: 999px;
        color: #ffe7a3;
        background: rgba(255,216,121,.11);
        border: 1px solid rgba(255,216,121,.22);
        font-size: clamp(.58rem, 1vw, .72rem);
        font-weight: 1000;
        text-transform: uppercase;
        letter-spacing: .07em;
      }

      .story-tv-pill.blue {
        color: #d8ecff;
        background: rgba(96,165,250,.12);
        border-color: rgba(125,211,252,.22);
      }

      .story-tv-title {
        margin: 0 0 4px;
        color: #fff;
        font-size: clamp(1.05rem, 2vw, 1.8rem);
        line-height: .98;
        letter-spacing: -.05em;
        font-weight: 1000;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .story-tv-dialogue {
        margin: 0;
        color: rgba(255,248,221,.86);
        font-size: clamp(.72rem, 1.15vw, .98rem);
        line-height: 1.15;
        font-weight: 850;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .story-tv-reason {
        margin-top: 6px;
        padding: 7px 9px;
        border-radius: 13px;
        color: rgba(255,248,221,.78);
        background: rgba(255,255,255,.06);
        border: 1px solid rgba(255,255,255,.10);
        font-size: clamp(.64rem, 1vw, .82rem);
        line-height: 1.15;
        font-weight: 800;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .story-tv-scoreboard {
        display: grid;
        gap: 5px;
        align-content: center;
      }

      .story-tv-score-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        align-items: center;
        padding: 6px 8px;
        border-radius: 12px;
        color: #fff;
        background: rgba(255,255,255,.055);
        border: 1px solid rgba(255,255,255,.08);
      }

      .story-tv-score-name {
        display: flex;
        align-items: center;
        gap: 5px;
        font-weight: 950;
        font-size: clamp(.62rem, 1vw, .82rem);
        min-width: 0;
      }

      .story-tv-score-name span:last-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .story-tv-score-points {
        color: #ffe089;
        font-weight: 1000;
        font-size: clamp(.72rem, 1vw, .95rem);
      }

      .story-tv-overlay.compact {
        width: min(860px, calc(100vw - 36px));
      }

      .story-tv-overlay.compact .story-tv-card {
        grid-template-columns: minmax(0, 1fr) auto;
        padding: 10px 12px;
        border-radius: 20px;
      }

      .story-tv-overlay.compact .story-tv-title {
        font-size: clamp(.98rem, 1.6vw, 1.35rem);
      }

      .story-tv-overlay.compact .story-tv-dialogue {
        -webkit-line-clamp: 1;
      }

      .story-tv-overlay.compact .story-tv-reason {
        display: none;
      }

      .story-tv-overlay.compact .story-tv-scoreboard {
        grid-template-columns: repeat(2, minmax(82px, 1fr));
        min-width: 210px;
      }

      .story-tv-overlay.cinematic {
        width: min(1100px, calc(100vw - 46px));
      }

      .story-tv-overlay.cinematic .story-tv-card {
        padding: clamp(14px, 2vh, 22px);
        border-color: rgba(255,216,121,.34);
        box-shadow:
          0 28px 100px rgba(0,0,0,.58),
          0 0 36px rgba(255,216,121,.10),
          inset 0 0 0 1px rgba(255,255,255,.05);
      }

      .story-tv-overlay.cinematic .story-tv-title {
        font-size: clamp(1.45rem, 2.7vw, 2.8rem);
      }

      .story-tv-overlay.cinematic .story-tv-dialogue {
        font-size: clamp(.9rem, 1.5vw, 1.25rem);
        -webkit-line-clamp: 3;
      }

      @media (max-height: 760px) {
        .story-tv-overlay {
          bottom: 10px;
          width: min(860px, calc(100vw - 28px));
        }
        .story-tv-card {
          grid-template-columns: minmax(0, 1fr) auto;
          padding: 9px 11px;
          border-radius: 18px;
        }
        .story-tv-dialogue {
          -webkit-line-clamp: 1;
        }
        .story-tv-reason {
          display: none;
        }
        .story-tv-scoreboard {
          grid-template-columns: repeat(2, minmax(76px, 1fr));
          min-width: 190px;
        }
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

    if (state.phase && state.phase !== "lobby") {
      return "La historia abrió una prueba inesperada. La Copa de las Casas no está emocionalmente estable.";
    }

    return "El modo Historia está preparado. Cuando el host lo indique, la aventura comienza.";
  }

  function isCinematicState(state = {}) {
    const phase = state.phase || "";
    const lines = Array.isArray(state.story_dialogue) ? state.story_dialogue : [];
    const justChanged = Date.now() < cinematicUntil;
    return justChanged && !String(phase).startsWith("results_") && lines.length > 0;
  }

  function renderScores(players = []) {
    const scores = calculateHouseScores(players);

    return HOUSE_ORDER
      .sort((a, b) => Number(scores[b] || 0) - Number(scores[a] || 0))
      .map((house) => `
        <div class="story-tv-score-row">
          <div class="story-tv-score-name"><span>${HOUSE_ICONS[house] || "✨"}</span><span>${escapeHTML(house)}</span></div>
          <div class="story-tv-score-points">${Number(scores[house] || 0)}</div>
        </div>
      `)
      .join("");
  }

  const GAMEPLAY_PHASES = new Set([
    "trivia",
    "artes_ridiculas",
    "atrapa_snitch",
    "clase_pociones",
    "duelo",
    "duelo_clash",
    "sombrero",
    "sombrero_tiebreak",
    "mapa_travieso",
    "retratos_chismosos",
    "hechizo_incompleto",
    "caldero_mentiroso",
    "patronus_personalizado",
    "copa_final",
  ]);

  function renderOverlay(data) {
    const state = data.game_state || {};
    const overlay = ensureOverlay();

    if (state.mode !== "story") {
      overlay.classList.remove("visible", "compact", "cinematic");
      overlay.innerHTML = "";
      return;
    }

    // Ocultar overlay durante fases jugables activas — la pantalla debe verse limpia
    if (GAMEPLAY_PHASES.has(state.phase)) {
      overlay.classList.remove("visible", "compact", "cinematic");
      overlay.innerHTML = "";
      return;
    }

    const title = getStoryTitle(state);
    const stepLabel = getStepLabel(state);
    const dialogue = getDialogue(state);
    const reason = state.story_transition_reason || "";
    const storyStep = Number(state.story_public?.story_step_index ?? state.story?.story_step_index ?? 0) + 1;
    const phase = state.phase || "";
    const key = `${title}-${stepLabel}-${dialogue}-${reason}-${phase}-${storyStep}-${state.current_game_id || ""}`;

    if (key !== lastStoryKey) {
      lastStoryKey = key;
      cinematicUntil = Date.now() + 8500;
      try {
        if (window.MagicSound?.play) {
          window.MagicSound.play("sparkle");
        }
      } catch (error) {}
    }

    const cinematic = isCinematicState(state);
    const compact = !cinematic || String(phase).startsWith("results_") || window.innerHeight < 760;

    overlay.classList.toggle("cinematic", cinematic && !compact);
    overlay.classList.toggle("compact", compact);

    overlay.innerHTML = `
      <div class="story-tv-card">
        <div class="story-tv-main">
          <div class="story-tv-pill-row">
            <span class="story-tv-pill">📖 ${escapeHTML(stepLabel)}</span>
            <span class="story-tv-pill blue">Capítulo ${storyStep}</span>
            <span class="story-tv-pill blue">${escapeHTML(state.story_selected_minigame_name || state.current_game_id || phase || "lobby")}</span>
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
