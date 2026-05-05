(() => {
  // ─── Solo activo en modo debug ─────────────────────────────────────────────
  const params = new URLSearchParams(window.location.search);
  const DEBUG_FLOW = params.get("debug") === "1";
  if (!DEBUG_FLOW) return;

  // ─── Estado ───────────────────────────────────────────────────────────────
  let busy = false;        // Evitar operaciones paralelas
  let paused = false;      // Pausar auto-avance de ready-check
  let panelVisible = true;
  let lastFeedback = "";

  // ─── Exponer flag de pausa para story-ready-tv.js ─────────────────────────
  window.DEBUG_READY_PAUSED = false;

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function getRoomCode() {
    try {
      if (typeof currentRoom !== "undefined" && currentRoom) return String(currentRoom).toUpperCase();
    } catch (_) {}
    const domCode = document.getElementById("tv-code")?.textContent?.trim();
    if (domCode && domCode !== "----") return domCode.toUpperCase();
    try {
      return (localStorage.getItem("jackbox_magico_room") || "").toUpperCase();
    } catch (_) { return ""; }
  }

  function getTvToken() {
    if (window.RoomLifecycleTv?.getTvToken) return window.RoomLifecycleTv.getTvToken();
    try {
      let token = localStorage.getItem("jackbox_magico_tv_token");
      if (!token) {
        token = globalThis.crypto?.randomUUID
          ? globalThis.crypto.randomUUID()
          : `tv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        localStorage.setItem("jackbox_magico_tv_token", token);
      }
      return token;
    } catch (_) { return "debug-token"; }
  }

  async function post(url, body = {}) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`${res.status}: ${text}`);
    }
    return res.json();
  }

  // ─── Acciones ─────────────────────────────────────────────────────────────

  async function actionForward() {
    if (busy) return feedback("⏳ Operación en curso...");
    const room = getRoomCode();
    if (!room) return feedback("❌ Sin sala activa");
    busy = true;
    feedback("⏩ Avanzando...");
    try {
      const data = await post(`/api/debug-flow/${room}/forward`, { tv_token: getTvToken() });
      feedback(`✅ Avanzado → ${data.phase || "?"}`);
    } catch (err) {
      feedback(`❌ Error: ${err.message}`);
    } finally {
      busy = false;
    }
  }

  async function actionBack() {
    if (busy) return feedback("⏳ Operación en curso...");
    const room = getRoomCode();
    if (!room) return feedback("❌ Sin sala activa");
    busy = true;
    feedback("⏪ Retrocediendo...");
    try {
      const data = await post(`/api/debug-flow/${room}/back`, { tv_token: getTvToken() });
      if (data.snapshots_remaining === undefined && data.message?.includes("No hay")) {
        feedback("⚠️ Sin historial previo");
      } else {
        feedback(`✅ Restaurado → ${data.phase || "?"} (${data.snapshots_remaining ?? "?"} restantes)`);
      }
    } catch (err) {
      feedback(`❌ Error: ${err.message}`);
    } finally {
      busy = false;
    }
  }

  async function actionLobby() {
    if (busy) return feedback("⏳ Operación en curso...");
    const room = getRoomCode();
    if (!room) return feedback("❌ Sin sala activa");
    busy = true;
    feedback("🏠 Regresando a lobby...");
    try {
      const data = await post(`/api/debug-flow/${room}/lobby`, { tv_token: getTvToken() });
      feedback(`✅ Lobby restaurado`);
    } catch (err) {
      feedback(`❌ Error: ${err.message}`);
    } finally {
      busy = false;
    }
  }

  async function actionResetReady() {
    if (busy) return feedback("⏳ Operación en curso...");
    const room = getRoomCode();
    if (!room) return feedback("❌ Sin sala activa");
    busy = true;
    feedback("🔄 Reseteando ready...");
    try {
      await post(`/api/story-ready/${room}/reset`, { tv_token: getTvToken() });
      feedback("✅ Ready reseteado");
    } catch (err) {
      feedback(`❌ Error: ${err.message}`);
    } finally {
      busy = false;
    }
  }

  function actionTogglePause() {
    paused = !paused;
    window.DEBUG_READY_PAUSED = paused;
    feedback(paused ? "⏸️ Auto-avance PAUSADO" : "▶️ Auto-avance ACTIVO");
    updatePanelPauseState();
  }

  function actionTogglePanel() {
    panelVisible = !panelVisible;
    const panel = document.getElementById("tv-debug-panel");
    const body = document.getElementById("tv-debug-panel-body");
    if (body) body.style.display = panelVisible ? "block" : "none";
    if (panel) panel.style.opacity = panelVisible ? "1" : "0.35";
  }

  function attachLobbyListeners() {
    const btnStart = document.getElementById("btn-iniciar-partida");
    const btnBack = document.getElementById("btn-regresar-inicio");

    if (btnStart) {
      btnStart.style.cursor = "pointer";
      btnStart.onclick = (e) => {
        e.stopPropagation();
        actionStartStory();
      };
    }

    if (btnBack) {
      btnBack.style.cursor = "pointer";
      btnBack.onclick = (e) => {
        e.stopPropagation();
        if (window.regresarAlInicio) window.regresarAlInicio();
      };
    }
  }

  async function actionStartStory() {
    if (busy) return feedback("⏳ Operación en curso...");
    const room = getRoomCode();
    if (!room) return feedback("❌ Sin sala activa");
    busy = true;
    feedback("🪄 Iniciando partida forzada...");
    try {
      if (window.startStoryFromLobby) {
        await window.startStoryFromLobby();
        feedback("✅ Partida iniciada");
      } else {
        const data = await post(`/api/story-tv/${room}/start`, { tv_token: getTvToken() });
        feedback("✅ Partida iniciada API");
      }
    } catch (err) {
      feedback(`❌ Error: ${err.message}`);
    } finally {
      busy = false;
    }
  }

  // ─── Feedback visual ──────────────────────────────────────────────────────

  function feedback(msg) {
    lastFeedback = msg;
    const el = document.getElementById("tv-debug-feedback");
    if (el) {
      el.textContent = msg;
      el.style.opacity = "1";
      clearTimeout(el._timeout);
      el._timeout = setTimeout(() => {
        el.style.opacity = "0.55";
      }, 3000);
    }
  }

  function updatePanelPauseState() {
    const el = document.getElementById("tv-debug-pause-status");
    if (el) {
      el.textContent = paused ? "⏸️ Auto-avance PAUSADO" : "▶️ Auto-avance activo";
      el.style.color = paused ? "#fca5a5" : "#86efac";
    }
  }

  // ─── Panel visual ──────────────────────────────────────────────────────────

  function createPanel() {
    if (document.getElementById("tv-debug-panel")) return;

    const panel = document.createElement("div");
    panel.id = "tv-debug-panel";
    panel.innerHTML = `
      <div id="tv-debug-panel-header">
        <span>🛠️ DEBUG FLOW</span>
        <button id="tv-debug-close" title="Ocultar (D)">▾</button>
      </div>
      <div id="tv-debug-panel-body">
        <div class="tv-debug-row"><kbd>N</kbd><kbd>Enter</kbd><kbd>→</kbd> Avanzar</div>
        <div class="tv-debug-row"><kbd>B</kbd><kbd>⌫</kbd><kbd>←</kbd> Retroceder</div>
        <div class="tv-debug-row"><kbd>L</kbd> Regresar a lobby</div>
        <div class="tv-debug-row"><kbd>R</kbd> Reset ready-check</div>
        <div class="tv-debug-row"><kbd>P</kbd> Pausar/reanudar auto-avance</div>
        <div class="tv-debug-row"><kbd>D</kbd> Mostrar/ocultar panel</div>
        <div id="tv-debug-pause-status" style="margin-top:8px;font-size:.78rem;color:#86efac">▶️ Auto-avance activo</div>
        <div id="tv-debug-feedback" style="margin-top:6px;font-size:.78rem;color:#ffe7a3;transition:opacity .5s;min-height:1.2em"></div>
      </div>
    `;
    document.body.appendChild(panel);

    // Botón de cerrar/abrir del panel
    document.getElementById("tv-debug-close")?.addEventListener("click", actionTogglePanel);

    injectStyles();
  }

  function injectStyles() {
    if (document.getElementById("tv-debug-panel-style")) return;
    const style = document.createElement("style");
    style.id = "tv-debug-panel-style";
    style.textContent = `
      #tv-debug-panel {
        position: fixed;
        top: 68px;
        left: 16px;
        z-index: 99999;
        width: 260px;
        border-radius: 18px;
        background: rgba(5, 10, 24, .92);
        border: 1px solid rgba(255, 216, 121, .3);
        box-shadow: 0 16px 48px rgba(0,0,0,.55);
        backdrop-filter: blur(14px);
        font-family: "Inter", system-ui, sans-serif;
        font-size: .82rem;
        color: #fff7dc;
        overflow: hidden;
        transition: opacity .2s ease;
        user-select: none;
      }
      #tv-debug-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: rgba(255,216,121,.10);
        border-bottom: 1px solid rgba(255,216,121,.16);
        font-weight: 1000;
        font-size: .88rem;
        color: #ffe7a3;
        letter-spacing: .04em;
        text-transform: uppercase;
      }
      #tv-debug-close {
        background: none;
        border: none;
        color: #ffe7a3;
        cursor: pointer;
        font-size: 1rem;
        padding: 0 4px;
        line-height: 1;
      }
      #tv-debug-panel-body {
        padding: 12px 14px;
      }
      .tv-debug-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 0;
        color: rgba(255,248,221,.78);
        font-weight: 700;
        border-bottom: 1px solid rgba(255,255,255,.04);
      }
      .tv-debug-row:last-child { border-bottom: none; }
      kbd {
        display: inline-block;
        padding: 2px 7px;
        border-radius: 6px;
        background: rgba(255,216,121,.15);
        border: 1px solid rgba(255,216,121,.28);
        color: #facc15;
        font-family: monospace;
        font-size: .72rem;
        font-weight: 900;
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Listener de teclado ──────────────────────────────────────────────────

  document.addEventListener("keydown", (event) => {
    // No disparar si el foco está en un input o textarea
    const tag = (document.activeElement?.tagName || "").toUpperCase();
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    const key = event.key;

    switch (key) {
      case "Enter":
      case "n":
      case "N":
      case "ArrowRight":
        event.preventDefault();
        actionForward();
        break;

      case "Backspace":
      case "b":
      case "B":
      case "ArrowLeft":
        event.preventDefault();
        actionBack();
        break;

      case "r":
      case "R":
        event.preventDefault();
        actionResetReady();
        break;

      case "l":
      case "L":
        event.preventDefault();
        actionLobby();
        break;

      case "p":
      case "P":
        event.preventDefault();
        actionTogglePause();
        break;

      case "d":
      case "D":
        event.preventDefault();
        actionTogglePanel();
        break;
    }
  });

  // ─── Init ─────────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", () => {
    createPanel();
    attachLobbyListeners();
    // Re-intentar por si el DOM cambia (vía renderLobby)
    setInterval(attachLobbyListeners, 2000);
    
    feedback("🛠️ Debug activado — usa N/B/L/R/P");
    console.info("[DEBUG FLOW] Controles de debug activos (?debug=1). Teclas: N=avanzar, B=retroceder, L=lobby, R=ready reset, P=pausa, D=panel");
  });

  // Exponer API pública por si otros scripts necesitan interactuar
  window.TvDebugFlow = {
    forward: actionForward,
    back: actionBack,
    lobby: actionLobby,
    resetReady: actionResetReady,
    togglePause: actionTogglePause,
    isPaused: () => paused,
  };
})();
