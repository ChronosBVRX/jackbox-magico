(function () {
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

  function escapeAttribute(value) {
    return escapeHTML(value).replaceAll("`", "&#096;");
  }

  function play(name) {
    try {
      if (window.MagicSound && typeof window.MagicSound.play === "function") {
        window.MagicSound.play(name);
      }
    } catch (error) {}
  }

  function getElapsedSeconds(state) {
    const started = Number(state.started_at || Date.now() / 1000);
    return Math.max(0, Date.now() / 1000 - started);
  }

  function getPhaseInfo(state) {
    const observation = Number(state.observation_seconds || 8);
    const answer = Number(state.answer_seconds || 10);
    const elapsed = getElapsedSeconds(state);

    if (elapsed < observation) {
      return {
        step: "observe",
        left: observation - elapsed,
        total: observation,
      };
    }

    return {
      step: "answer",
      left: Math.max(0, observation + answer - elapsed),
      total: answer,
    };
  }

  function renderFootprints() {
    return `
      <div class="mapa-footprints" aria-hidden="true">
        ${Array.from({ length: 16 }).map((_, index) => `
          <span class="mapa-footprint" style="left:${(index * 9) % 100}%; top:${18 + (index * 17) % 68}%; animation-delay:${index * .34}s;">⌾</span>
        `).join("")}
      </div>
    `;
  }

  function renderInkLines(zones) {
    return (zones || []).slice(0, -1).map((zone, index) => {
      const next = zones[index + 1];
      const dx = next.x - zone.x;
      const dy = next.y - zone.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;

      return `<span class="mapa-ink-line" style="left:${zone.x}%; top:${zone.y}%; width:${length}%; transform:rotate(${angle}deg); animation-delay:${index * .22}s;"></span>`;
    }).join("");
  }

  function renderMap(state, info) {
    const zones = state.zones || [];
    const objects = state.objects || [];
    const isAnswer = info.step === "answer";

    return `
      <div class="mapa-parchment">
        ${renderFootprints()}
        ${renderInkLines(zones)}

        ${zones.map((zone) => `
          <div class="mapa-zone" style="left:${Number(zone.x || 50)}%; top:${Number(zone.y || 50)}%;">
            ${escapeHTML(zone.name)}
          </div>
        `).join("")}

        ${!isAnswer ? objects.map((item, index) => `
          <div class="mapa-object" style="left:${Number(item.x || 50)}%; top:${Number(item.y || 50)}%; animation-delay:${index * .08}s;">
            <span>${escapeHTML(item.emoji)}</span>
            <span class="mapa-object-label">${escapeHTML(item.name)}</span>
          </div>
        `).join("") : ""}

        ${isAnswer ? `
          <div class="mapa-question-card">
            <div class="mapa-tv-kicker">🕯️ El mapa se cerró</div>
            <h2>${escapeHTML(state.question || "¿Dónde estaba el objeto?")}</h2>
            <div class="mapa-options-tv">
              ${(state.options || []).map((option, index) => `
                <div class="mapa-option-tv">${["A", "B", "C", "D"][index] || "?"}. ${escapeHTML(option)}</div>
              `).join("")}
            </div>
          </div>
        ` : ""}
      </div>
    `;
  }

  function renderPlayerStatus(players, state) {
    const answered = state.answers || state.answered || {};

    return (players || []).map((player) => `
      <div class="trivia-player-row ${answered[player.name] ? "answered" : ""}">
        <span>${escapeHTML(player.name)} · ${escapeHTML(player.house || "Casa")}</span>
        <span class="status">${answered[player.name] ? "Tinta enviada" : "Observando"}</span>
      </div>
    `).join("");
  }

  function renderTv(data) {
    const state = data.game_state || {};
    const players = data.players || [];
    const info = getPhaseInfo(state);
    const left = Math.ceil(info.left);
    const variant = state.variant || {};

    if (info.step === "observe" && left <= 3) {
      play("timer-danger");
    }

    return `
      <section class="mapa-tv-stage">
        <div class="mapa-tv-content">
          <header class="mapa-tv-header">
            <div>
              <div class="mapa-tv-kicker">🗺️ ${escapeHTML(variant.name || "Mapa Travieso")}</div>
              <h1 class="mapa-tv-title">El Mapa Travieso</h1>
              <p class="mapa-tv-subtitle">${escapeHTML(variant.flavor || state.narrator_line || "Juro solemnemente que mis intenciones no son buenas.")}</p>
            </div>
            <div class="mapa-tv-timer">
              <span>${info.step === "observe" ? "Memoriza" : "Responde"}</span>
              <strong>${left}</strong>
            </div>
          </header>

          <div class="mapa-main-grid">
            ${renderMap(state, info)}
            <aside class="mapa-side-card">
              <div class="mapa-info-card">
                <h3>Reglas rápidas</h3>
                <p>Correcta +100 · más rápida +30 · si los dos de una casa aciertan +80. En modo Filch, fallar resta -20.</p>
              </div>
              <div class="mapa-info-card">
                <h3>Objetivo</h3>
                <p>${info.step === "observe" ? "Memoriza dónde aparece cada objeto mágico." : escapeHTML(state.question || "Responde desde tu celular.")}</p>
              </div>
              <div class="trivia-side-card">
                <h3 class="trivia-side-title">Jugadores</h3>
                <div class="trivia-players">${renderPlayerStatus(players, state)}</div>
              </div>
              <div class="trivia-side-card">
                <h3 class="trivia-side-title">Casas</h3>
                <div class="trivia-house-score">${typeof renderHouseScoreboard === "function" ? renderHouseScoreboard(players) : ""}</div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    `;
  }

  function renderMobile(state) {
    const info = getPhaseInfo(state);
    const isAnswer = info.step === "answer";
    const options = state.options || [];

    if (!isAnswer) {
      return `
        <div class="mapa-mobile-card">
          <div class="mapa-mobile-content">
            <div class="mapa-mobile-wait">
              🗺️ Mira la TV. Memoriza el mapa mágico.<br>
              El mapa se ocultará en ${Math.ceil(info.left)}s.
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="mapa-mobile-card">
        <div class="mapa-mobile-content">
          <div class="mapa-tv-kicker">🗺️ El Mapa Travieso</div>
          <h2>${escapeHTML(state.question || "¿Dónde estaba el objeto?")}</h2>
          <p class="mapa-mobile-note">Elige la zona correcta. Rápido, que Filch ya viene con cara de reporte.</p>
          <div class="mapa-mobile-options">
            ${options.map((option, index) => `
              <button class="mapa-mobile-btn" onclick="window.enviarRespuesta('${escapeAttribute(option)}', this)">
                ${["A", "B", "C", "D"][index] || "?"}. ${escapeHTML(option)}
              </button>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }

  function renderResults(data) {
    const state = data.game_state || {};
    const result = state.mapa_result || {};
    const answers = result.answers || state.answers || {};
    const fastest = result.fastest;

    return `
      <section class="mapa-tv-stage">
        <div class="mapa-tv-content">
          <header class="mapa-tv-header">
            <div>
              <div class="mapa-tv-kicker">🏆 Resultado del mapa</div>
              <h1 class="mapa-tv-title">Travesura revelada</h1>
              <p class="mapa-tv-subtitle">La tinta habló. El que diga “yo sí sabía” deberá demostrarlo en la siguiente ronda.</p>
            </div>
          </header>
          <div class="mapa-main-grid">
            <div class="mapa-parchment">
              ${renderFootprints()}
              <div class="mapa-hidden-overlay">
                <div>
                  <h2>${escapeHTML(state.correct_label || state.correct || "Respuesta revelada")}</h2>
                  <p>Respuesta correcta: <strong>${escapeHTML(state.correct || "")}</strong></p>
                  ${fastest ? `<p>⚡ Más rápido: <strong>${escapeHTML(fastest)}</strong></p>` : ""}
                </div>
              </div>
            </div>
            <aside class="mapa-side-card">
              <div class="mapa-info-card">
                <h3>Respuestas</h3>
                <p>${Object.entries(answers).map(([name, data]) => `${escapeHTML(name)}: ${data.correct ? "✅" : "❌"} ${escapeHTML(data.answer || "")}`).join("<br>") || "Sin respuestas registradas."}</p>
              </div>
              <div class="trivia-side-card">
                <h3 class="trivia-side-title">Marcador</h3>
                <div class="trivia-house-score">${typeof renderHouseScoreboard === "function" ? renderHouseScoreboard(data.players || []) : ""}</div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    `;
  }

  window.MapaTravieso = {
    renderTv,
    renderMobile,
    renderResults,
    getPhaseInfo,
  };
})();
