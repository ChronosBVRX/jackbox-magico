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

  async function fetchBetStatus(room) {
    try {
      const res = await fetch(`/api/story-bet/${room}/status?tvBetTs=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch (error) {
      return null;
    }
  }

  function ensurePanel() {
    let panel = document.getElementById("story-bet-tv-panel");
    if (panel) return panel;
    panel = document.createElement("div");
    panel.id = "story-bet-tv-panel";
    panel.innerHTML = `
      <div class="story-bet-tv-title">Apuestas de Copa Final</div>
      <div class="story-bet-tv-count">0/0</div>
      <div class="story-bet-tv-pending"></div>
    `;
    document.body.appendChild(panel);
    return panel;
  }

  function showPanel(data) {
    const panel = ensurePanel();
    panel.classList.add("visible");
    panel.querySelector(".story-bet-tv-count").textContent = `${data.bet_count || 0}/${data.total_players || 0}`;
    panel.querySelector(".story-bet-tv-pending").textContent = data.pending_players?.length
      ? `Faltan: ${data.pending_players.join(", ")}`
      : "Todas las apuestas están listas. La Copa está sonriendo raro.";
  }

  function hidePanel() {
    const panel = document.getElementById("story-bet-tv-panel");
    if (panel) panel.classList.remove("visible");
  }

  function injectStyles() {
    if (document.getElementById("story-bet-tv-style")) return;
    const style = document.createElement("style");
    style.id = "story-bet-tv-style";
    style.textContent = `
      #story-bet-tv-panel {
        position: fixed;
        left: 50%;
        bottom: 82px;
        z-index: 10025;
        width: min(560px, calc(100vw - 42px));
        transform: translateX(-50%) translateY(18px);
        opacity: 0;
        pointer-events: none;
        padding: 16px;
        border-radius: 24px;
        color: #fff7dc;
        text-align: center;
        background:
          radial-gradient(circle at 15% 0%, rgba(255,216,121,.22), transparent 36%),
          rgba(5,10,24,.84);
        border: 1px solid rgba(255,216,121,.28);
        box-shadow: 0 18px 60px rgba(0,0,0,.42);
        backdrop-filter: blur(14px);
        transition: opacity .25s ease, transform .25s ease;
      }
      #story-bet-tv-panel.visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      .story-bet-tv-title {
        color: #ffe7a3;
        font-weight: 1000;
        font-size: 1.15rem;
      }
      .story-bet-tv-count {
        margin-top: 4px;
        font-size: clamp(2rem, 4vw, 4rem);
        font-weight: 1000;
        line-height: 1;
      }
      .story-bet-tv-pending {
        margin-top: 7px;
        color: rgba(255,248,221,.76);
        font-weight: 850;
      }
    `;
    document.head.appendChild(style);
  }

  async function tick() {
    injectStyles();
    const room = getRoomCode();
    if (!room) return;
    const data = await fetchBetStatus(room);
    if (!data || !data.is_final_phase) {
      hidePanel();
      return;
    }
    showPanel(data);
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    setInterval(tick, 1000);
    setTimeout(tick, 800);
  });
})();
