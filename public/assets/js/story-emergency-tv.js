(() => {
  let panelOpen = false;

  function getRoomCode() {
    const domCode = document.getElementById("tv-code")?.textContent?.trim();
    if (domCode && domCode !== "----") return domCode.toUpperCase();
    try {
      if (typeof currentRoom !== "undefined" && currentRoom) return String(currentRoom).toUpperCase();
    } catch (error) {}
    return "";
  }

  function getTvToken() {
    let token = localStorage.getItem("jackbox_magico_tv_token");
    if (!token) {
      token = crypto?.randomUUID ? crypto.randomUUID() : `tv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem("jackbox_magico_tv_token", token);
    }
    return token;
  }

  function isDebugMode() {
    const params = new URLSearchParams(window.location.search);
    return params.get("debug") === "1" || localStorage.getItem("jackbox_story_debug") === "1";
  }

  function setDebugMode(enabled) {
    if (enabled) localStorage.setItem("jackbox_story_debug", "1");
    else localStorage.removeItem("jackbox_story_debug");
  }

  async function postJson(url, body = {}) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json().catch(() => ({}));
  }

  async function revealResults() {
    if (typeof window.hostRevealResults === "function") {
      window.hostRevealResults();
    }
  }

  async function nextTrivia() {
    const room = getRoomCode();
    if (!room) return;
    await postJson(`/api/story-tv/${room}/next-trivia`, { tv_token: getTvToken() });
  }

  async function nextStep() {
    const room = getRoomCode();
    if (!room) return;
    await postJson(`/api/story-tv/${room}/next-step`, { tv_token: getTvToken() });
  }

  async function resetReady() {
    const room = getRoomCode();
    if (!room) return;
    await postJson(`/api/story-ready/${room}/reset`, { tv_token: getTvToken() });
  }

  async function closeRoom() {
    if (window.RoomLifecycleTv?.closeRoom) {
      await window.RoomLifecycleTv.closeRoom("emergency_panel_close");
    }
  }

  function ensurePanel() {
    let panel = document.getElementById("story-emergency-panel");
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "story-emergency-panel";
    panel.innerHTML = `
      <div class="story-emergency-card">
        <div class="story-emergency-head">
          <strong>Panel de emergencia</strong>
          <button type="button" data-action="toggle">×</button>
        </div>
        <p>Herramientas discretas para pruebas o si la partida se atora.</p>
        <div class="story-emergency-grid">
          <button type="button" data-action="reveal">Revelar resultados</button>
          <button type="button" data-action="next-trivia">Siguiente trivia</button>
          <button type="button" data-action="next-step">Forzar etapa</button>
          <button type="button" data-action="reset-ready">Reiniciar listos</button>
          <button type="button" data-action="debug">Modo debug</button>
          <button type="button" data-action="close">Cerrar sala</button>
        </div>
        <small>Atajo: tecla E en la TV.</small>
      </div>
    `;
    document.body.appendChild(panel);

    panel.addEventListener("click", async (event) => {
      const action = event.target?.dataset?.action;
      if (!action) return;
      try {
        if (action === "toggle") togglePanel(false);
        if (action === "reveal") await revealResults();
        if (action === "next-trivia") await nextTrivia();
        if (action === "next-step") await nextStep();
        if (action === "reset-ready") await resetReady();
        if (action === "debug") {
          setDebugMode(!isDebugMode());
          event.target.textContent = isDebugMode() ? "Debug activo" : "Modo debug";
        }
        if (action === "close") await closeRoom();
      } catch (error) {
        console.warn("Emergency action failed", error);
      }
    });

    return panel;
  }

  function ensureButton() {
    let button = document.getElementById("story-emergency-button");
    if (button) return button;
    button = document.createElement("button");
    button.id = "story-emergency-button";
    button.type = "button";
    button.textContent = "⚙️";
    button.title = "Panel de emergencia";
    button.addEventListener("click", () => togglePanel());
    document.body.appendChild(button);
    return button;
  }

  function togglePanel(force) {
    panelOpen = typeof force === "boolean" ? force : !panelOpen;
    const panel = ensurePanel();
    panel.classList.toggle("visible", panelOpen);
  }

  function injectStyles() {
    if (document.getElementById("story-emergency-style")) return;
    const style = document.createElement("style");
    style.id = "story-emergency-style";
    style.textContent = `
      #story-emergency-button {
        position: fixed;
        left: 16px;
        top: 16px;
        z-index: 10080;
        width: 42px;
        height: 42px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,.16);
        color: #fff7dc;
        background: rgba(5,10,24,.66);
        backdrop-filter: blur(12px);
        cursor: pointer;
        opacity: .55;
      }
      #story-emergency-button:hover { opacity: 1; }
      #story-emergency-panel {
        position: fixed;
        left: 16px;
        top: 68px;
        z-index: 10081;
        width: min(420px, calc(100vw - 32px));
        opacity: 0;
        transform: translateY(-10px);
        pointer-events: none;
        transition: opacity .18s ease, transform .18s ease;
      }
      #story-emergency-panel.visible {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      .story-emergency-card {
        padding: 16px;
        border-radius: 22px;
        color: #fff7dc;
        background: rgba(5,10,24,.90);
        border: 1px solid rgba(255,216,121,.26);
        box-shadow: 0 22px 70px rgba(0,0,0,.50);
        backdrop-filter: blur(16px);
      }
      .story-emergency-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .story-emergency-head strong {
        color: #ffe7a3;
        font-size: 1.05rem;
      }
      .story-emergency-head button {
        width: 30px;
        height: 30px;
        border-radius: 999px;
        border: 0;
        color: #fff;
        background: rgba(255,255,255,.10);
        cursor: pointer;
      }
      .story-emergency-card p,
      .story-emergency-card small {
        color: rgba(255,248,221,.70);
      }
      .story-emergency-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin: 12px 0;
      }
      .story-emergency-grid button {
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 14px;
        padding: 10px;
        color: #fff7dc;
        background: rgba(255,255,255,.08);
        font-weight: 900;
        cursor: pointer;
      }
      .story-emergency-grid button:hover {
        background: rgba(255,216,121,.16);
      }
    `;
    document.head.appendChild(style);
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    ensureButton();
    ensurePanel();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key?.toLowerCase() === "e") togglePanel();
  });
})();
