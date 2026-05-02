(() => {
  const GAME_RULES = {
    trivia_magica: {
      title: "Trivia del Mundo Mágico",
      rule: "Lee la pregunta en la TV y responde desde tu celular antes de que el tiempo se acabe.",
      points: "+150 correcta · bonus por rapidez · racha si sobrevives a tu propia confianza",
    },
    atrapa_snitch: {
      title: "Atrapa la Snitch",
      rule: "Toca la Snitch cuando aparezca. Si dudas, ya se fue y probablemente te juzgó.",
      points: "+100 por atraparla · bonus al más rápido",
    },
    duelo_hechizos: {
      title: "Duelo de Hechizos",
      rule: "Elige rápido el hechizo correcto para sobrevivir al duelo mágico.",
      points: "+100 victoria · bonus por rapidez · vergüenza pública opcional",
    },
    sombrero_burlon: {
      title: "Sombrero Burlón",
      rule: "El Sombrero dirá algo raro. Vota o responde según la instrucción de la TV.",
      points: "+100 por lectura social · bonus si tu respuesta duele pero da risa",
    },
    clase_pociones: {
      title: "Clase de Pociones",
      rule: "Sigue la receta y elige el ingrediente correcto antes de crear una demanda escolar.",
      points: "+100 poción estable · penalización si explota con estilo",
    },
    artes_ridiculas: {
      title: "Defensa Contra las Artes Ridículas",
      rule: "Elige la mejor defensa ante amenazas absurdas. La lógica ayuda, pero el drama también.",
      points: "+100 correcta · bonus si respondes con reflejos de auror endeudado",
    },
    mapa_travieso: {
      title: "Mapa Travieso",
      rule: "Observa pistas y encuentra lo que el mapa intenta ocultar con actitud sospechosa.",
      points: "+100 hallazgo · bonus si no te pierdes como primer año",
    },
    retratos_chismosos: {
      title: "Retratos Chismosos",
      rule: "Los retratos hablarán. Decide rápido antes de que el chisme se vuelva canon.",
      points: "+100 acierto · bonus por intuición de señora en ventana",
    },
    hechizo_incompleto: {
      title: "Hechizo Incompleto",
      rule: "Completa el hechizo correcto. No inventes latín, eso ya causó suficientes problemas.",
      points: "+100 hechizo completo · bonus por rapidez",
    },
    caldero_mentiroso: {
      title: "Caldero Mentiroso",
      rule: "El caldero miente, exagera o se hace la víctima. Detecta la respuesta correcta.",
      points: "+100 si no caes · bonus por desconfianza saludable",
    },
    patronus_personalizado: {
      title: "Patronus Personalizado",
      rule: "Sigue las instrucciones y crea tu defensa luminosa contra el ridículo.",
      points: "+100 si tu Patronus no parece trámite de lunes",
    },
    copa_final: {
      title: "Copa Final",
      rule: "Una pregunta puede cambiarlo todo. Respira, mira a tu casa y finge seguridad.",
      points: "+300 correcta · bonus final por velocidad o dramatismo",
    },
  };

  window.JACKBOX_GAME_RULES = GAME_RULES;

  if (window.JACKBOX_VISUAL_CLEAN_MODE) {
    return;
  }

  const HOUSE_COMMENTS = [
    "{house} toma ventaja. La Copa intenta no mostrar favoritismo, pero se le nota tantito.",
    "{house} va arriba. Alguien en otra mesa acaba de decir ‘era de esperarse’. Qué veneno.",
    "{house} lidera y ya empezó a caminar como prefecto con poder excesivo.",
    "{house} acaba de subir. No es suerte, es narrativa convenientemente escrita.",
  ];

  const LOW_COMMENTS = [
    "{house} necesita un milagro, una racha o que Peeves tumbe el marcador.",
    "{house} sigue en la pelea, emocionalmente al menos.",
    "{house} va abajo, pero todavía puede decir que está jugando por diversión.",
  ];

  let lastRoom = "";
  let lastGameKey = "";
  let lastCommentKey = "";

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

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getPhase(data) {
    return data?.game_state?.phase || data?.status || "lobby";
  }

  function getGameId(data) {
    const state = data?.game_state || {};
    return state.current_game_id || state.game_id || getPhase(data) || "story";
  }

  function calculateHouseScores(players = []) {
    const scores = {};
    players.forEach((player) => {
      const house = player.house || "Sin casa";
      scores[house] = (scores[house] || 0) + Number(player.score || 0);
    });
    return scores;
  }

  function pickComment(data) {
    const scores = calculateHouseScores(data.players || []);
    const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return "La Copa está esperando puntos para poder juzgar con fundamentos.";

    const leader = entries[0]?.[0] || "Una casa";
    const last = entries[entries.length - 1]?.[0] || leader;
    const pool = entries[0]?.[1] > 0 ? HOUSE_COMMENTS : LOW_COMMENTS;
    const template = pool[Math.abs((leader + getPhase(data)).length) % pool.length];
    return template.replace("{house}", leader).replace("{last}", last);
  }

  async function fetchStatus(room) {
    try {
      const res = await fetch(`/api/room/${room}/status?partyPolishTs=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch (error) {
      return null;
    }
  }

  function ensureRulesOverlay() {
    let overlay = document.getElementById("story-rules-overlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "story-rules-overlay";
    document.body.appendChild(overlay);
    return overlay;
  }

  function showRules(data) {
    const state = data.game_state || {};
    const gameId = getGameId(data);
    const phase = getPhase(data);
    const key = `${gameId}:${phase}:${state.round_id || state.started_at || ""}`;

    if (key === lastGameKey) return;
    lastGameKey = key;

    const noExtraOverlayPhases = new Set(["scene_instructions", "scene_rules", "rules", "lobby", "trivia"]);
    if (noExtraOverlayPhases.has(phase) || String(phase).startsWith("results_")) return;

    const rules = GAME_RULES[gameId] || GAME_RULES[phase];
    if (!rules) return;

    const overlay = ensureRulesOverlay();
    overlay.innerHTML = `
      <div class="story-rules-card">
        <div class="story-rules-kicker">Siguiente prueba</div>
        <h2>${escapeHTML(rules.title)}</h2>
        <p>${escapeHTML(rules.rule)}</p>
        <div>${escapeHTML(rules.points)}</div>
      </div>
    `;
    overlay.classList.add("visible");
    window.setTimeout(() => overlay.classList.remove("visible"), 5200);
  }

  function ensureDramaPanel() {
    let panel = document.getElementById("story-drama-panel");
    if (panel) return panel;
    panel = document.createElement("div");
    panel.id = "story-drama-panel";
    document.body.appendChild(panel);
    return panel;
  }

  function showDrama(data) {
    const phase = getPhase(data);
    if (!String(phase).startsWith("results_")) return;

    const key = `${phase}:${data.game_state?.round_id || data.game_state?.question || data.game_state?.correct_label || "result"}`;
    if (key === lastCommentKey) return;
    lastCommentKey = key;

    const panel = ensureDramaPanel();
    panel.innerHTML = `🏆 ${escapeHTML(pickComment(data))}`;
    panel.classList.add("visible");
    window.setTimeout(() => panel.classList.remove("visible"), 7000);
  }

  function ensureRoomBadge() {
    let badge = document.getElementById("story-room-badge");
    if (badge) return badge;
    badge = document.createElement("div");
    badge.id = "story-room-badge";
    document.body.appendChild(badge);
    return badge;
  }

  function updateRoomBadge(room) {
    const badge = ensureRoomBadge();
    if (!room) {
      badge.classList.remove("visible");
      return;
    }
    badge.innerHTML = `<strong>Código:</strong> ${escapeHTML(room)} <span>Únete desde tu celular</span>`;
    badge.classList.add("visible");
  }

  function injectStyles() {
    if (document.getElementById("story-party-polish-style")) return;
    const style = document.createElement("style");
    style.id = "story-party-polish-style";
    style.textContent = `
      #story-room-badge {
        position: fixed;
        left: 16px;
        bottom: 16px;
        z-index: 10030;
        display: none;
        padding: 10px 13px;
        border-radius: 999px;
        color: #fff7dc;
        background: rgba(5,10,24,.78);
        border: 1px solid rgba(255,216,121,.24);
        box-shadow: 0 10px 34px rgba(0,0,0,.34);
        backdrop-filter: blur(12px);
        font-weight: 950;
      }
      #story-room-badge.visible { display: flex; align-items: center; gap: 8px; }
      #story-room-badge strong { color: #ffe7a3; }
      #story-room-badge span { color: rgba(255,248,221,.68); font-size: .82rem; }

      #story-rules-overlay {
        position: fixed;
        inset: 0;
        z-index: 10040;
        display: grid;
        place-items: center;
        padding: 28px;
        opacity: 0;
        pointer-events: none;
        transition: opacity .22s ease;
        background: radial-gradient(circle at center, rgba(255,216,121,.12), rgba(3,7,18,.62));
      }
      #story-rules-overlay.visible { opacity: 1; }
      .story-rules-card {
        width: min(850px, 92vw);
        padding: clamp(22px, 4vw, 42px);
        border-radius: 34px;
        color: #fff7dc;
        text-align: center;
        background:
          radial-gradient(circle at 20% 0%, rgba(255,216,121,.24), transparent 36%),
          rgba(5, 10, 24, .86);
        border: 1px solid rgba(255,216,121,.32);
        box-shadow: 0 36px 120px rgba(0,0,0,.58);
        backdrop-filter: blur(18px);
      }
      .story-rules-kicker {
        display: inline-flex;
        padding: 7px 12px;
        border-radius: 999px;
        color: #271600;
        background: linear-gradient(135deg, #fff8d6, #facc15);
        font-weight: 1000;
        text-transform: uppercase;
        letter-spacing: .1em;
      }
      .story-rules-card h2 {
        margin: 14px 0 8px;
        font-size: clamp(2.2rem, 5vw, 5rem);
        letter-spacing: -.06em;
      }
      .story-rules-card p {
        margin: 0 auto 14px;
        max-width: 720px;
        color: rgba(255,248,221,.82);
        font-size: clamp(1rem, 1.8vw, 1.45rem);
        line-height: 1.18;
        font-weight: 850;
      }
      .story-rules-card div:last-child {
        display: inline-flex;
        padding: 10px 14px;
        border-radius: 16px;
        color: #bbf7d0;
        background: rgba(34,197,94,.12);
        border: 1px solid rgba(74,222,128,.22);
        font-weight: 1000;
      }

      #story-drama-panel {
        position: fixed;
        left: 50%;
        top: 18px;
        z-index: 10035;
        width: min(900px, calc(100vw - 42px));
        transform: translateX(-50%) translateY(-16px);
        opacity: 0;
        pointer-events: none;
        padding: 12px 18px;
        border-radius: 22px;
        color: #fff7dc;
        background: rgba(5,10,24,.82);
        border: 1px solid rgba(255,216,121,.26);
        box-shadow: 0 18px 60px rgba(0,0,0,.42);
        backdrop-filter: blur(14px);
        text-align: center;
        font-weight: 1000;
        font-size: clamp(.95rem, 1.5vw, 1.3rem);
        transition: opacity .25s ease, transform .25s ease;
      }
      #story-drama-panel.visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    `;
    document.head.appendChild(style);
  }

  async function tick() {
    injectStyles();
    const room = getRoomCode();
    updateRoomBadge(room);
    if (!room) return;
    const data = await fetchStatus(room);
    if (!data || data.game_state?.mode !== "story") return;
    showRules(data);
    showDrama(data);
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    setInterval(tick, 1000);
    setTimeout(tick, 700);
  });

  window.JACKBOX_GAME_RULES = GAME_RULES;

})();
