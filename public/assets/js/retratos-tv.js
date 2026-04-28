(() => {
  const answerLetters = ["A", "B", "C", "D"];
  const houseIcons = {
    Gryffindor: "🦁",
    Slytherin: "🐍",
    Ravenclaw: "🦅",
    Hufflepuff: "🦡",
  };

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

  function getClueInfo(state) {
    const clueSeconds = Number(state.clue_seconds || 8);
    const duration = Number(state.duration_seconds || clueSeconds * 3 || 24);
    const startedAt = Number(state.started_at || Date.now() / 1000);
    const elapsed = Math.max(0, Date.now() / 1000 - startedAt);
    const clueIndex = Math.min(2, Math.floor(elapsed / clueSeconds));
    const timeLeft = Math.max(0, duration - elapsed);

    return {
      clueIndex,
      clueNumber: clueIndex + 1,
      timeLeft,
      progress: Math.max(0, Math.min(1, timeLeft / duration)),
    };
  }

  function calculateHouseScores(players = []) {
    const totals = {
      Gryffindor: 0,
      Slytherin: 0,
      Ravenclaw: 0,
      Hufflepuff: 0,
    };

    players.forEach((player) => {
      if (!totals[player.house]) totals[player.house] = 0;
      totals[player.house] += Number(player.score || 0);
    });

    return totals;
  }

  function renderRetratosHouseScoreboard(players = []) {
    const scores = calculateHouseScores(players);

    return Object.keys(scores)
      .sort((a, b) => Number(scores[b] || 0) - Number(scores[a] || 0))
      .map((house) => `
        <div class="retratos-house-row">
          <div>${houseIcons[house] || "✨"} ${escapeHTML(house)}</div>
          <strong>${Number(scores[house] || 0)}</strong>
        </div>
      `)
      .join("");
  }

  function renderRetratosPlayers(players = [], answered = {}) {
    return players
      .map((player) => {
        const didAnswer = Boolean(answered[player.name]);
        return `
          <div class="retratos-player-row ${didAnswer ? "answered" : ""}">
            <div>${houseIcons[player.house] || "✨"} ${escapeHTML(player.name)}</div>
            <strong>${didAnswer ? "Respondió" : "..."}</strong>
          </div>
        `;
      })
      .join("");
  }

  function renderRetratosPlaying(data) {
    const state = data.game_state || {};
    const players = data.players || [];
    const info = getClueInfo(state);
    const pistas = state.pistas || [state.question || "El retrato está pensando..."];
    const activeClue = pistas[info.clueIndex] || pistas[pistas.length - 1] || state.question || "";
    const pointsByClue = state.points_by_clue || { 1: 150, 2: 100, 3: 60 };
    const options = state.options || [];
    const answered = state.answered || {};

    const container = document.getElementById("game-container");
    if (!container) return;

    if (typeof showScreen === "function") {
      showScreen("view-game");
    }

    container.innerHTML = `
      <section class="retratos-gallery-board">
        <div class="retratos-content">
          <header class="retratos-header">
            <div>
              <div class="retratos-kicker-row">
                <span class="retratos-pill">🖼️ ${escapeHTML(state.categoria || "Misterio")}</span>
                <span class="retratos-pill">Pista ${info.clueNumber}/3 · +${Number(pointsByClue[info.clueNumber] || 60)}</span>
                <span class="retratos-pill">⚡ Rápido correcto +30</span>
              </div>
              <h1 class="retratos-title">${escapeHTML(state.title || "Retratos Chismosos")}</h1>
              <p class="retratos-subtitle">${escapeHTML(state.subtitle || "La galería habla, exagera y revela lo que no debía.")}</p>
            </div>

            <div class="retratos-timer-card">
              <span>Tiempo</span>
              <strong>${Math.ceil(info.timeLeft)}</strong>
            </div>
          </header>

          <div class="retratos-main-grid">
            <div class="retratos-stage">
              <div class="retratos-frame">
                <div class="retratos-portrait-face">
                  <div class="retratos-face-icon">🧙‍♂️</div>
                  <div class="retratos-mouth"></div>
                </div>
              </div>

              <div class="retratos-speech">
                <article class="retratos-clue-card">
                  <div class="retratos-clue-label">El retrato murmura</div>
                  <p class="retratos-clue-text">“${escapeHTML(activeClue)}”</p>
                  <div class="retratos-progress"><div style="transform: scaleX(${info.progress});"></div></div>
                </article>

                <div class="retratos-options">
                  ${options.map((option, index) => `
                    <div class="retratos-option">
                      <span class="retratos-option-letter">${answerLetters[index] || "?"}</span>
                      <span class="retratos-option-text">${escapeHTML(option)}</span>
                    </div>
                  `).join("")}
                </div>
              </div>
            </div>

            <aside class="retratos-side">
              <div class="retratos-side-card">
                <h3 class="retratos-side-title">Marcador de casas</h3>
                ${renderRetratosHouseScoreboard(players)}
              </div>

              <div class="retratos-side-card">
                <h3 class="retratos-side-title">Quién ya respondió</h3>
                ${renderRetratosPlayers(players, answered)}
              </div>

              <div class="retratos-side-card">
                <h3 class="retratos-side-title">Frase del marco</h3>
                <p style="margin:0;line-height:1.3;font-weight:850;color:rgba(255,247,220,.82);">
                  “${escapeHTML(state.narrator || "Yo no debería decir esto, pero lo vi todo desde mi marco.")}”
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    `;
  }

  function renderRetratosResults(data) {
    const state = data.game_state || {};
    const result = state.retratos_result || {};
    const rows = result.rows || [];
    const container = document.getElementById("game-container");
    if (!container) return;

    if (typeof showScreen === "function") {
      showScreen("view-game");
    }

    container.innerHTML = `
      <section class="retratos-results-wrap">
        <h1 class="retratos-result-title">El retrato ya soltó el chisme</h1>
        <div class="retratos-correct-answer">${escapeHTML(state.correct_label || state.correct || "Respuesta revelada")}</div>
        <p style="max-width:900px;margin:0 auto 18px;text-align:center;color:rgba(255,247,220,.76);font-size:1.12rem;font-weight:850;">
          ${escapeHTML(state.comentarioFinal || "El marco no miente… solo dramatiza los hechos.")}
        </p>

        ${result.fastest_correct ? `
          <div class="retratos-pill" style="width:max-content;margin:0 auto 12px;">⚡ Más rápido correcto: ${escapeHTML(result.fastest_correct)} +30</div>
        ` : ""}

        ${(result.house_bonus_events || []).map((event) => `
          <div class="retratos-pill" style="width:max-content;margin:0 auto 8px;">
            🏰 ${escapeHTML(event.house)} ganó ${Number(event.points || 80)} extra por doble acierto
          </div>
        `).join("")}

        <div class="retratos-result-grid">
          ${rows.map((row) => `
            <article class="retratos-result-card ${row.correct ? "correct" : "wrong"}">
              <div style="display:flex;justify-content:space-between;gap:12px;align-items:start;">
                <div>
                  <strong style="display:block;color:#fff;font-size:1.15rem;">${escapeHTML(row.player_name)}</strong>
                  <span style="color:rgba(255,247,220,.64);font-weight:800;">${escapeHTML(row.house || "Sin casa")}</span>
                </div>
                <strong style="color:#ffe089;font-size:1.55rem;">${Number(row.points || 0)}</strong>
              </div>
              <p style="margin:10px 0 0;color:rgba(255,247,220,.78);font-weight:800;">
                ${row.correct ? "✅ Acertó" : "❌ Falló"} · Pista ${row.clue_number || "-"}<br>
                Respondió: ${escapeHTML(row.answer || "Sin respuesta")}
              </p>
            </article>
          `).join("") || `
            <article class="retratos-result-card wrong">
              <strong>Nadie respondió</strong>
              <p style="margin:8px 0 0;color:rgba(255,247,220,.72);">El retrato se quedó hablando solo. Dramático, pero entendible.</p>
            </article>
          `}
        </div>
      </section>
    `;
  }

  function installRetratosTvPatch() {
    const originalRenderPlaying = window.renderPlaying;
    const originalRenderResults = window.renderResults;

    if (typeof originalRenderPlaying === "function") {
      window.renderPlaying = function patchedRenderPlaying(data) {
        if ((data?.game_state?.phase || "") === "retratos_chismosos") {
          renderRetratosPlaying(data);
          return;
        }

        return originalRenderPlaying.apply(this, arguments);
      };
    }

    if (typeof originalRenderResults === "function") {
      window.renderResults = function patchedRenderResults(data) {
        if ((data?.game_state?.phase || "") === "results_retratos_chismosos") {
          renderRetratosResults(data);
          return;
        }

        return originalRenderResults.apply(this, arguments);
      };
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installRetratosTvPatch);
  } else {
    installRetratosTvPatch();
  }
})();
