(() => {
  const CALDERO_PHASE = "caldero_mentiroso";
  const CALDERO_RESULTS = "results_caldero_mentiroso";
  let lastCalderoKey = "";
  let calderoRevealInFlight = false;
  let lastCalderoRevealRound = "";

  const originalRenderPlaying = window.renderPlaying;
  const originalRenderResults = window.renderResults;

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function remainingSeconds(state) {
    const duration = Number(state.submit_seconds || 70);
    const started = Number(state.started_at || Date.now() / 1000) * 1000;
    const elapsed = Math.max(0, Date.now() - started) / 1000;
    return Math.max(0, duration - elapsed);
  }

  function houseIcon(house) {
    const icons = {
      Gryffindor: "🦁",
      Slytherin: "🐍",
      Ravenclaw: "🦅",
      Hufflepuff: "🦡",
    };
    return icons[house] || "✨";
  }

  function actionLabel(action) {
    const labels = {
      meter: "Metió al caldero",
      descartar: "Descartó",
      acusar: "Acusó",
      sin_accion: "No decidió",
    };
    return labels[action] || "Movimiento misterioso";
  }

  function reasonLabel(reason) {
    const labels = {
      ingrediente_bueno_sobrevive: "Ingrediente bueno +120",
      ingrediente_dorado_sobrevive: "Dorado +180",
      casa_con_mas_buenos: "Casa con más buenos +100",
      explosivo_no_detectado: "Explosivo no detectado +100",
      ingrediente_malo_explota: "Ingrediente malo +50",
      casa_afectada_por_explosion: "Casa afectada -50",
      acusacion_correcta_explosivo: "Acusación correcta (Explosivo) +90",
      acusacion_correcta_malo: "Acusación correcta (Malo) +40",
      acusacion_incorrecta: "Acusación incorrecta -30",
      descarto_explosivo: "Descartó explosivo +60",
      no_decidio: "No decidió -20",
    };
    return labels[reason] || reason;
  }

  function renderPlayers(players = [], state = {}) {
    const answers = state.answers || {};
    if (!players.length) {
      return `<div class="caldero-empty">Esperando jugadores en la clase de pociones...</div>`;
    }

    return players.map((player) => {
      const ready = Boolean(answers[player.name]);
      return `
        <div class="caldero-player-row ${ready ? "ready" : ""}">
          <span>${houseIcon(player.house)} ${esc(player.name)}</span>
          <span class="caldero-ready-chip">${ready ? "Decidió" : "Pensando"}</span>
        </div>
      `;
    }).join("");
  }

  function renderLog(state = {}) {
    const log = state.caldero_public_log || [];
    if (!log.length) {
      return `<div class="caldero-empty">Todavía nadie se acerca al caldero. Eso también es sospechoso.</div>`;
    }

    return log.slice().reverse().map((item) => `
      <div class="caldero-log-item">${esc(item.text)}</div>
    `).join("");
  }

  function renderCalderoTv(data) {
    const state = data.game_state || {};
    const players = data.players || [];
    const left = remainingSeconds(state);
    const submitted = Object.keys(state.answers || {}).length;
    const total = players.length || 0;
    const key = `${state.round_id}-${submitted}`;

    if (key !== lastCalderoKey) {
      lastCalderoKey = key;
      if (typeof playMagicSound === "function") {
        playMagicSound(submitted ? "click" : "start");
      }
    }

    // Auto-reveal logic
    const allVoted = total > 0 && submitted >= total;
    const timeOut = left <= 0;

    if ((allVoted || timeOut) && !calderoRevealInFlight && lastCalderoRevealRound !== state.round_id) {
      revealCalderoResults(state.room_code || window.currentRoom, state.round_id);
    }

    if (typeof showScreen === "function") {
      showScreen("view-game");
    }

    const container = document.getElementById("game-container");
    if (!container) return;

    container.innerHTML = `
      <section class="caldero-stage">
        <div class="caldero-header">
          <div>
            <div class="caldero-kicker">🧪 Copa de las Casas · Juego social</div>
            <h1 class="caldero-title">El Caldero Mentiroso</h1>
            <p class="caldero-subtitle">
              Cada celular guarda un ingrediente secreto. La TV solo verá drama, humo y malas decisiones hasta el final.
            </p>
          </div>
          <div class="caldero-timer">
            <span>Tiempo</span>
            <strong>${Math.ceil(left)}</strong>
          </div>
        </div>

        <div class="caldero-content">
          <article class="caldero-main-card">
            <div class="caldero-cauldron-wrap">
              <div class="caldero-aura"></div>
              <div class="caldero-smoke"><span></span><span></span><span></span><span></span></div>
              <span class="caldero-bubble"></span>
              <span class="caldero-bubble"></span>
              <span class="caldero-bubble"></span>
              <span class="caldero-bubble"></span>
              <div class="caldero-cauldron"></div>
              <div class="caldero-stability">⚖️ Estabilidad inicial: ${Number(state.stability_start || 3)}</div>
            </div>
          </article>

          <aside class="caldero-side-card">
            <h3 class="caldero-side-title">Narrador dramático</h3>
            <div class="caldero-log-item">${esc(state.narrator_line || "Pueden mentir, claro. No sería la primera vez.")}</div>

            <h3 class="caldero-side-title" style="margin-top:16px;">Jugadores listos · ${submitted}/${total}</h3>
            <div class="caldero-players">${renderPlayers(players, state)}</div>

            <h3 class="caldero-side-title" style="margin-top:16px;">Actividad sospechosa</h3>
            <div class="caldero-log">${renderLog(state)}</div>
          </aside>
        </div>
      </section>
    `;
  }

  async function revealCalderoResults(roomCode, roundId) {
    if (!roomCode || calderoRevealInFlight) return;
    
    calderoRevealInFlight = true;
    lastCalderoRevealRound = roundId;

    console.log("Revelando resultados de Caldero automáticamente...");

    try {
      const res = await fetch(`/api/caldero/reveal_results_tv/${roomCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tv_token: typeof getTvToken === "function" ? getTvToken() : "tv_host"
        })
      });

      if (!res.ok) {
        console.error("Error al revelar Caldero:", await res.json());
      }
    } catch (error) {
      console.error("Error de red al revelar Caldero:", error);
    } finally {
      setTimeout(() => {
        calderoRevealInFlight = false;
      }, 3000);
    }
  }

  function renderCalderoResults(data) {
    const state = data.game_state || {};
    const result = state.caldero_result || {};
    const survived = Boolean(result.survived);

    if (typeof showScreen === "function") {
      showScreen("view-game");
    }

    const container = document.getElementById("game-container");
    if (!container) return;

    if (typeof playMagicSound === "function") {
      playMagicSound(survived ? "success" : "error");
    }

    const rows = (result.player_results || []).map((item) => {
      const ingredient = item.ingredient || {};
      const reasons = (item.reasons || []).slice(0, 3).map(reasonLabel).join(" · ");
      return `
        <div class="caldero-result-row">
          <div class="caldero-result-emoji">${esc(ingredient.emoji || "🧪")}</div>
          <div>
            <div class="caldero-result-name">${esc(item.player_name)} · ${houseIcon(item.house)} ${esc(item.house || "")}</div>
            <div class="caldero-result-meta">
              ${esc(ingredient.name || "Ingrediente desconocido")} · ${esc(ingredient.label || "?")} · ${esc(actionLabel(item.action))}${item.target ? ` contra ${esc(item.target)}` : ""}
            </div>
            ${item.claim ? `<div class="caldero-result-meta" style="font-style:italic; color: #a1a1ff;">Declaró: “${esc(item.claim)}”</div>` : ""}
            <div class="caldero-result-meta">${esc(reasons || "Sin bonus especial")}</div>
          </div>
          <div class="caldero-result-points">${Number(item.points || 0) > 0 ? "+" : ""}${Number(item.points || 0)}</div>
        </div>
      `;
    }).join("");

    container.innerHTML = `
      <section class="caldero-results ${survived ? "" : "exploded"}">
        <div class="caldero-kicker" style="margin:0 auto 14px;">${survived ? "✨ Poción estable" : "💥 Accidente académico"}</div>
        <h1 class="caldero-result-title">${esc(result.headline || "Resultado del Caldero")}</h1>
        <p class="caldero-result-narration">${esc(result.narration || "La clase terminó con dignidad cuestionable.")}</p>

        <div class="caldero-stats">
          <div class="caldero-stat"><strong>${Number(result.stability_start ?? 3)}</strong><span>Inicio</span></div>
          <div class="caldero-stat"><strong>${Number(result.stability_final ?? 0)}</strong><span>Final</span></div>
          <div class="caldero-stat"><strong>${Number(result.meter_count || 0)}</strong><span>Al caldero</span></div>
          <div class="caldero-stat"><strong>${Number(result.accuse_count || 0)}</strong><span>Acusaciones</span></div>
        </div>

        <div class="caldero-result-grid">${rows || `<div class="caldero-empty">No hubo suficientes decisiones para una catástrofe elegante.</div>`}</div>
      </section>
    `;
  }

  window.renderPlaying = function patchedRenderPlaying(data) {
    const phase = data?.game_state?.phase;
    if (phase === CALDERO_PHASE) {
      renderCalderoTv(data);
      return;
    }
    if (typeof originalRenderPlaying === "function") {
      originalRenderPlaying(data);
    }
  };

  window.renderResults = function patchedRenderResults(data) {
    const phase = data?.game_state?.phase;
    if (phase === CALDERO_RESULTS) {
      renderCalderoResults(data);
      return;
    }
    if (typeof originalRenderResults === "function") {
      originalRenderResults(data);
    }
  };
})();
