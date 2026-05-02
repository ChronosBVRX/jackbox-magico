(() => {
  let lastReadyKey = "";
  let lastReadySentKey = "";

  // ─── Room / player helpers ────────────────────────────────────────────────

  function getRoom() {
    try {
      if (typeof myRoom !== "undefined" && myRoom) return String(myRoom).toUpperCase();
    } catch (error) {}
    return (localStorage.getItem("jackbox_magico_room") || "").toUpperCase();
  }

  function getPlayerName() {
    try {
      if (typeof myName !== "undefined" && myName) return String(myName);
    } catch (error) {}
    return localStorage.getItem("jackbox_magico_name") || "";
  }

  // ─── ¿Momento de mostrar "Listo"? ─────────────────────────────────────────

  function isReadyMoment(data, readyData) {
    const state = data?.game_state || {};
    const phase = state.phase || "";

    // Lobby en modo historia: mostrar si hay cobertura de casas
    if (phase === "lobby") {
      return state.mode === "story";
      // La validación de has_house_coverage se hace en tick()
    }

    if (phase === "") return false;

    // Fases de escena narrativa: siempre mostrar botón
    const narrativePhases = new Set([
      "scene_intro", "scene_rules", "scene_instructions", "rules",
    ]);
    if (narrativePhases.has(phase)) return true;

    // Para resultados y demás, requerir mode === "story"
    if (state.mode !== "story") return false;
    return String(phase).startsWith("results_");
  }

  // ─── Etiqueta e ícono del botón según la fase ─────────────────────────────

  function getReadyLabel(phase, sent) {
    if (sent) return "Listo enviado ✨";
    if (phase === "lobby")              return "⚡ ¡Estoy listo para empezar!";
    if (phase === "scene_instructions") return "⚡ ¡Entendido! Empieza ya";
    if (phase === "scene_intro")        return "🏰 ¡Adelante!";
    if (phase === "scene_rules")        return "📖 He leído las reglas";
    if (phase === "rules")              return "🪄 ¡Listos!";
    return "✅ Listo para continuar";
  }

  function getPhaseBadge(phase) {
    if (phase === "lobby")              return "🏰 Lobby";
    if (phase === "scene_instructions") return "⚡ Instrucciones";
    if (phase === "scene_intro")        return "🏰 Introducción";
    if (phase === "scene_rules")        return "📖 Reglas";
    if (phase === "rules")              return "🪄 ¿Listos?";
    if (String(phase).startsWith("results_")) return "🏆 Resultados";
    return "🪄 Siguiente ronda";
  }

  function getPhaseTitle(phase, sent) {
    if (sent) return "¡Listo! Esperando al resto...";
    if (phase === "lobby") return "¿Listos para empezar la aventura?";
    return "¿Listo para continuar?";
  }

  // ─── Fetch helpers ────────────────────────────────────────────────────────

  async function fetchStatus() {
    const room = getRoom();
    if (!room) return null;
    try {
      const res = await fetch(
        `/api/room/${room}/status?storyReadyMobileTs=${Date.now()}`,
        { cache: "no-store" }
      );
      if (!res.ok) return null;
      return await res.json();
    } catch (error) {
      return null;
    }
  }

  async function fetchReadyStatus() {
    const room = getRoom();
    if (!room) return null;
    try {
      const res = await fetch(
        `/api/story-ready/${room}/status?ts=${Date.now()}`,
        { cache: "no-store" }
      );
      if (!res.ok) return null;
      return await res.json();
    } catch (error) {
      return null;
    }
  }

  // ─── Enviar "Listo" ───────────────────────────────────────────────────────

  async function sendReady(options = {}) {
    const room = getRoom();
    const playerName = getPlayerName();
    if (!room || !playerName) return;

    const box = ensureReadyBox();
    const button = box?.querySelector("button");
    const isAuto = Boolean(options.auto);

    if (button && !isAuto) {
      button.disabled = true;
      button.textContent = "Listo enviado ✨";
    }

    try {
      const res = await fetch(`/api/story-ready/${room}/player`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_name: playerName, ready: true }),
      });
      const data = await res.json();
      if (data?.ready_key) lastReadySentKey = data.ready_key;

      if (button && isAuto) {
        button.disabled = true;
        button.textContent = "Listo enviado ✨";
      }

      renderReadyBox(data, true);
    } catch (error) {
      if (button && !isAuto) {
        button.disabled = false;
      }
    }
  }



  // ─── UI del box de "listo" ────────────────────────────────────────────────

  function ensureReadyBox() {
    let box = document.getElementById("story-ready-mobile-box");

    const waitCard = document.querySelector("#view-wait .card");
    const gameCard = document.querySelector("#view-game .card");
    const preferredParent = waitCard || gameCard || document.body;

    if (box) {
      if (box.parentElement !== preferredParent) {
        preferredParent.appendChild(box);
      }
      return box;
    }

    box = document.createElement("div");
    box.id = "story-ready-mobile-box";
    box.className = "story-ready-mobile-box";
    box.innerHTML = `
      <div class="srmb-badge">🪄 ¿Listos?</div>
      <div class="srmb-title">¿Listo para continuar?</div>
      <p class="srmb-desc">Esperando a que todos confirmen.</p>
      <div class="srmb-house-wait" id="srmb-house-wait" style="display:none"></div>
      <button type="button" id="srmb-btn">✅ Listo para continuar</button>
      <small class="srmb-count"></small>
    `;

    box.querySelector("#srmb-btn")?.addEventListener("click", () => {
      sendReady();
    });

    preferredParent.appendChild(box);
    return box;
  }

  // Mostrar mensaje de espera cuando faltan casas (solo en lobby)
  function showWaitingForHouses(readyData) {
    const box = ensureReadyBox();
    box.classList.add("visible");

    const badge    = box.querySelector(".srmb-badge");
    const title    = box.querySelector(".srmb-title");
    const desc     = box.querySelector(".srmb-desc");
    const houseWait = box.querySelector("#srmb-house-wait");
    const button   = box.querySelector("#srmb-btn");
    const small    = box.querySelector(".srmb-count");
    const autoHint = box.querySelector(".srmb-auto-hint");

    const missing = readyData?.missing_houses || [];

    if (badge)    badge.textContent = "🏰 Lobby";
    if (title)    title.textContent = "Esperando más jugadores...";
    if (desc)     desc.textContent  = "Se necesita al menos un jugador de cada casa para empezar.";
    if (houseWait) {
      houseWait.style.display = missing.length ? "block" : "none";
      houseWait.textContent = missing.length
        ? `Falta representante de: ${missing.join(", ")}`
        : "";
    }
    if (button) {
      button.disabled = true;
      button.textContent = "Esperando jugadores...";
    }
    if (small) {
      const total = readyData?.total_players || 0;
      small.textContent = `${total} jugador${total !== 1 ? "es" : ""} en sala`;
    }
  }

  function renderReadyBox(readyData, sent = false) {
    const box = ensureReadyBox();
    const button    = box.querySelector("#srmb-btn");
    const small     = box.querySelector(".srmb-count");
    const badge     = box.querySelector(".srmb-badge");
    const title     = box.querySelector(".srmb-title");
    const desc      = box.querySelector(".srmb-desc");
    const houseWait = box.querySelector("#srmb-house-wait");

    const phase = readyData?.phase || "";
    const readyKey = readyData?.ready_key || lastReadyKey;
    const sentForThisKey = sent || (readyKey && readyKey === lastReadySentKey);

    if (badge)  badge.textContent  = getPhaseBadge(phase);
    if (title)  title.textContent  = getPhaseTitle(phase, sentForThisKey);
    if (desc) {
      desc.textContent = "Esperando a que todos confirmen.";
    }
    if (houseWait) houseWait.style.display = "none"; // Solo visible en showWaitingForHouses

    if (button) {
      button.disabled    = Boolean(sentForThisKey);
      button.textContent = getReadyLabel(phase, sentForThisKey);
    }

    if (small) {
      const count = Number(readyData?.ready_count || 0);
      const total = Number(readyData?.total_players || 0);
      if (phase === "lobby") {
        // Mostrar info de casas listas
        const readyHouses = readyData?.ready_houses || [];
        const missingReady = readyData?.missing_ready_houses || [];
        small.textContent = missingReady.length
          ? `Casas listas: ${readyHouses.join(", ") || "ninguna"} · Falta: ${missingReady.join(", ")}`
          : `¡Las 4 casas confirmaron! (${count}/${total})`;
      } else {
        small.textContent = total
          ? `${count}/${total} jugadores listos`
          : "Esperando jugadores...";
      }
    }
  }



  // ─── Show / Hide ──────────────────────────────────────────────────────────

  function hideReadyBox() {
    const box = document.getElementById("story-ready-mobile-box");
    if (box) box.classList.remove("visible");
  }

  function showReadyBox() {
    const box = ensureReadyBox();
    box.classList.add("visible");
  }

  // ─── Estilos ──────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById("story-ready-mobile-style")) return;
    const style = document.createElement("style");
    style.id = "story-ready-mobile-style";
    style.textContent = `
      .story-ready-mobile-box {
        display: none;
        margin-top: 18px;
        padding: 20px 18px;
        border-radius: 28px;
        color: #fff7dc;
        background:
          radial-gradient(circle at 20% 0%, rgba(255,216,121,.24), transparent 38%),
          rgba(255,255,255,.08);
        border: 1px solid rgba(255,216,121,.28);
        box-shadow: 0 18px 48px rgba(0,0,0,.24);
        text-align: center;
        animation: srmb-in .38s cubic-bezier(0.18,0.89,0.32,1.28) both;
      }
      @keyframes srmb-in {
        from { opacity: 0; transform: translateY(12px) scale(.96); }
        to   { opacity: 1; transform: translateY(0)   scale(1); }
      }
      .story-ready-mobile-box.visible { display: block; }
      .srmb-badge {
        display: inline-block;
        margin-bottom: 10px;
        padding: 5px 14px;
        border-radius: 999px;
        color: #271600;
        background: linear-gradient(135deg, #fff8d6, #facc15);
        font-size: .78rem;
        font-weight: 1000;
        text-transform: uppercase;
        letter-spacing: .07em;
      }
      .srmb-title {
        color: #ffe7a3;
        font-size: 1.3rem;
        font-weight: 1000;
        margin-bottom: 6px;
      }
      .srmb-desc {
        margin: 0 0 10px;
        color: rgba(255,248,221,.72);
        font-size: .9rem;
        line-height: 1.35;
      }
      .srmb-house-wait {
        margin: 0 0 12px;
        padding: 8px 12px;
        border-radius: 14px;
        background: rgba(252,165,165,.12);
        border: 1px solid rgba(252,165,165,.22);
        color: #fca5a5;
        font-size: .82rem;
        font-weight: 800;
      }
      .story-ready-mobile-box button {
        width: 100%;
        border: 0;
        border-radius: 22px;
        padding: 18px 18px;
        color: #271600;
        background: linear-gradient(135deg, #fff8d6, #facc15);
        font-size: 1.1rem;
        font-weight: 1000;
        letter-spacing: -.01em;
        cursor: pointer;
        transition: transform .12s ease, box-shadow .12s ease;
        box-shadow: 0 8px 28px rgba(250,204,21,.28);
      }
      .story-ready-mobile-box button:active {
        transform: scale(.97);
        box-shadow: 0 4px 14px rgba(250,204,21,.20);
      }
      .story-ready-mobile-box button:disabled {
        opacity: .68;
        cursor: default;
        background: linear-gradient(135deg, #d4c87e, #a8850a);
        color: rgba(255,255,255,.9);
        box-shadow: none;
      }
      .srmb-count {
        display: block;
        margin-top: 11px;
        color: rgba(255,248,221,.66);
        font-weight: 850;
        font-size: .82rem;
        line-height: 1.3;
      }

    `;
    document.head.appendChild(style);
  }

  // ─── Tick principal ───────────────────────────────────────────────────────

  async function tick() {
    injectStyles();

    const status = await fetchStatus();
    if (!status) {
      hideReadyBox();
      return;
    }

    const state = status?.game_state || {};
    const phase = state.phase || "";

    // Solo actuar en modo historia
    if (state.mode !== "story" && phase !== "lobby") {
      if (!["scene_intro", "scene_rules", "scene_instructions", "rules"].includes(phase)) {
        hideReadyBox();
        return;
      }
    }

    const readyData = await fetchReadyStatus();
    if (!readyData) return;

    // Caso lobby: verificar cobertura de casas primero
    if (phase === "lobby") {
      if (state.mode !== "story") {
        hideReadyBox();
        return;
      }
      if (!readyData.has_house_coverage) {
        showWaitingForHouses(readyData);
        return;
      }
      // Hay cobertura de casas: mostrar botón de listo
      showReadyBox();
      if (readyData.ready_key !== lastReadyKey) {
        lastReadyKey = readyData.ready_key;
        if (lastReadySentKey !== lastReadyKey) lastReadySentKey = "";
      }
      renderReadyBox({ ...readyData, phase }, false);
      return;
    }

    if (!isReadyMoment(status, readyData)) {
      hideReadyBox();
      return;
    }

    // Detectar nueva clave
    if (readyData.ready_key !== lastReadyKey) {
      lastReadyKey = readyData.ready_key;
      if (lastReadySentKey !== lastReadyKey) lastReadySentKey = "";
    }

    showReadyBox();
    renderReadyBox({ ...readyData, phase }, false);
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    setInterval(tick, 900);
    setTimeout(tick, 700);
  });
})();
