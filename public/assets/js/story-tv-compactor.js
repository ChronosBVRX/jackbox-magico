(() => {
  let lastRoom = "";

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

  async function poll() {
    const room = getRoomCode();
    if (!room) return;

    try {
      const res = await fetch(`/api/room/${room}/status?storyCompactTs=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const state = data.game_state || {};
      const story = state.mode === "story";
      const phase = state.phase || "";

      document.body.classList.toggle("tv-story-mode", story);
      document.body.classList.toggle("tv-story-results", story && String(phase).startsWith("results_"));
      document.body.classList.toggle("tv-story-playing", story && phase && !String(phase).startsWith("results_") && phase !== "lobby");
    } catch (error) {}
  }

  function injectStyles() {
    if (document.getElementById("story-tv-compactor-style")) return;

    const style = document.createElement("style");
    style.id = "story-tv-compactor-style";
    style.textContent = `
      body.tv-story-results .trivia-results-wrap {
        width: min(900px, 88vw) !important;
        padding: 18px !important;
        border-radius: 26px !important;
      }

      body.tv-story-results .trivia-results-title {
        font-size: clamp(1.8rem, 3.4vw, 3.6rem) !important;
        margin-bottom: 8px !important;
      }

      body.tv-story-results .trivia-correct-answer {
        margin: 10px auto 8px !important;
        padding: 10px 16px !important;
        font-size: clamp(1.05rem, 2vw, 1.8rem) !important;
        border-radius: 18px !important;
      }

      body.tv-story-results .trivia-results-comment {
        max-width: 740px !important;
        margin-bottom: 10px !important;
        font-size: clamp(.75rem, 1.1vw, .95rem) !important;
      }

      body.tv-story-results .trivia-fastest-banner {
        margin-bottom: 10px !important;
        padding: 8px 12px !important;
        font-size: .78rem !important;
      }

      body.tv-story-results .trivia-result-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 8px !important;
      }

      body.tv-story-results .trivia-result-card {
        padding: 10px 12px !important;
        border-radius: 16px !important;
      }

      body.tv-story-results .trivia-result-name {
        font-size: .9rem !important;
      }

      body.tv-story-results .trivia-result-points {
        font-size: 1.15rem !important;
      }

      body.tv-story-results .trivia-result-meta {
        gap: 5px !important;
        margin-top: 7px !important;
      }

      body.tv-story-results .trivia-chip {
        padding: 5px 7px !important;
        font-size: .62rem !important;
      }

      body.tv-story-results #view-game.visible {
        padding-top: 12px !important;
        padding-bottom: 86px !important;
      }

      body.tv-story-results .results-card {
        width: min(900px, 88vw) !important;
        padding: 20px !important;
      }

      @media (max-height: 760px) {
        body.tv-story-results .trivia-results-wrap {
          transform: scale(.88);
          transform-origin: center top;
          margin-bottom: -54px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    setInterval(poll, 900);
    setTimeout(poll, 500);
  });
})();
