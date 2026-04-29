(() => {
  let stories = [];
  let storiesLoaded = false;
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

  async function loadStories() {
    if (storiesLoaded) return stories;
    const res = await fetch("/api/story/catalog", { cache: "no-store" });
    const data = await res.json();
    stories = data.stories || [];
    storiesLoaded = true;
    return stories;
  }

  async function ensurePanel() {
    const lobbyCard = document.querySelector("#view-lobby .lobby-card");
    if (!lobbyCard) return;

    let panel = document.getElementById("story-tv-controls");
    if (panel) return;

    await loadStories();

    panel = document.createElement("div");
    panel.id = "story-tv-controls";
    panel.innerHTML = `
      <div class="story-tv-control-card">
        <div class="story-tv-kicker">Modo principal</div>
        <h2>Elige una historia</h2>
        <p>La TV tomará el control de la partida. Los celulares solo responderán como jugadores.</p>
        <select id="story-tv-select">
          ${stories.map((story) => `
            <option value="${escapeHTML(story.story_id)}">${escapeHTML(story.title)}</option>
          `).join("")}
        </select>
        <div class="story-tv-actions">
          <button type="button" id="story-tv-prepare-btn">Preparar historia</button>
          <button type="button" id="story-tv-start-btn">Iniciar modo Historia</button>
        </div>
        <div id="story-tv-status"></div>
      </div>
    `;

    const players = document.getElementById("lista-jugadores");
    if (players && players.parentElement) {
      players.parentElement.insertBefore(panel, players.nextSibling);
    } else {
      lobbyCard.appendChild(panel);
    }

    document.getElementById("story-tv-prepare-btn")?.addEventListener("click", prepareStory);
    document.getElementById("story-tv-start-btn")?.addEventListener("click", startStory);
  }

  function setStatus(message, kind = "neutral") {
    const box = document.getElementById("story-tv-status");
    if (!box) return;
    box.className = kind;
    box.textContent = message || "";
  }

  async function prepareStory() {
    const room = getRoomCode();
    const storyId = document.getElementById("story-tv-select")?.value;
    if (!room || !storyId) return;

    setStatus("Preparando historia desde la TV...");

    try {
      const res = await fetch(`/api/story-tv/${room}/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tv_token: getTvToken(), story_id: storyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.detail || data));
      setStatus(`Historia lista: ${data.story_title || storyId}`, "good");
    } catch (error) {
      setStatus(`No se pudo preparar: ${error.message || error}`, "bad");
    }
  }

  async function startStory() {
    const room = getRoomCode();
    if (!room) return;

    setStatus("Iniciando historia... los celulares quedan en modo jugador.");

    try {
      await prepareStory();
      const res = await fetch(`/api/story-tv/${room}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tv_token: getTvToken() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.detail || data));
      setStatus(`Historia iniciada: ${data.game_id}`, "good");
    } catch (error) {
      setStatus(`No se pudo iniciar: ${error.message || error}`, "bad");
    }
  }

  function injectStyles() {
    if (document.getElementById("story-tv-controls-style")) return;
    const style = document.createElement("style");
    style.id = "story-tv-controls-style";
    style.textContent = `
      #story-tv-controls {
        width: min(880px, 92vw);
        margin: 24px auto 0;
      }
      .story-tv-control-card {
        padding: 22px;
        border-radius: 28px;
        background:
          radial-gradient(circle at 18% 0%, rgba(255,216,121,.20), transparent 34%),
          rgba(255,255,255,.075);
        border: 1px solid rgba(255,216,121,.28);
        box-shadow: 0 24px 70px rgba(0,0,0,.32);
      }
      .story-tv-kicker {
        display: inline-flex;
        padding: 7px 12px;
        border-radius: 999px;
        color: #271600;
        background: linear-gradient(135deg, #fff8d6, #facc15);
        font-size: .75rem;
        font-weight: 1000;
        text-transform: uppercase;
        letter-spacing: .1em;
      }
      .story-tv-control-card h2 {
        margin: 10px 0 6px;
        font-size: clamp(2rem, 4vw, 3.8rem);
      }
      .story-tv-control-card p {
        max-width: 760px;
        margin: 0 auto 16px;
      }
      #story-tv-select {
        width: min(560px, 90%);
        padding: 16px;
        border-radius: 18px;
        color: #fff;
        background: rgba(255,255,255,.10);
        border: 1px solid rgba(255,255,255,.16);
        font-size: 1.05rem;
        font-weight: 900;
        outline: none;
      }
      #story-tv-select option { color: #111; }
      .story-tv-actions {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 16px;
      }
      .story-tv-actions button {
        border: 0;
        border-radius: 18px;
        padding: 15px 20px;
        color: #271600;
        background: linear-gradient(135deg, #fff8d6, #facc15);
        font-size: 1rem;
        font-weight: 1000;
        cursor: pointer;
      }
      .story-tv-actions button:first-child {
        color: #fff7dc;
        background: rgba(255,255,255,.10);
        border: 1px solid rgba(255,255,255,.14);
      }
      #story-tv-status {
        min-height: 24px;
        margin-top: 12px;
        color: rgba(255,248,221,.78);
        font-weight: 900;
      }
      #story-tv-status.good { color: #bbf7d0; }
      #story-tv-status.bad { color: #fecaca; }
      body.tv-story-mode #story-tv-controls {
        display: none;
      }
    `;
    document.head.appendChild(style);
  }

  async function tick() {
    injectStyles();
    const room = getRoomCode();
    if (room) await ensurePanel();
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    setInterval(tick, 900);
    setTimeout(tick, 700);
  });

  window.StoryTvControls = {
    prepareStory,
    startStory,
  };
})();
