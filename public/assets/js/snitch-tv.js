(function () {
  let snitchLastKey = "";
  let snitchLastTick = null;
  let snitchAutoRevealLock = false;

  const localHouseIcons = {
    Gryffindor: "🦁",
    Slytherin: "🐍",
    Ravenclaw: "🦅",
    Hufflepuff: "🦡",
  };

  function h(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getSnitchKey(state) {
    return `${state.phase}-${state.round_id || state.question || "snitch"}`;
  }

  function getSnitchTimeInfo(state) {
    const duration = Number(state.duration_seconds || 23);
    const startedAt = Number(state.started_at || Date.now() / 1000);
    const elapsed = Math.max(0, Date.now() / 1000 - startedAt);
    const left = Math.max(0, duration - elapsed);

    return {
      duration,
      elapsed,
      left,
      pct: duration > 0 ? Math.max(0, Math.min(1, left / duration)) : 0,
    };
  }

  function renderSnitch(state, players) {
    const container = document.getElementById("game-container");
    const falseObjects = state.false_objects || [];

    container.innerHTML = `
      <section id="snitch-board" class="snitch-board">
        <header class="snitch-header">
          <div class="badge">🏆 Atrapa la Snitch</div>
          <h1 class="snitch-title">${h(state.title || "Atrapa la Snitch")}</h1>
          <p class="snitch-subtitle">${h(state.subtitle || "Presiona justo cuando cruce la zona iluminada.")}</p>
        </header>

        <div class="snitch-field">
          <div class="snitch-stands"></div>
          <div class="snitch-hoop left"></div>
          <div class="snitch-hoop right"></div>

          <div class="capture-zone"></div>

          <div class="snitch-object">
            <div class="snitch-wing left"></div>
            <div class="snitch-wing right"></div>
            <div class="snitch-core"></div>
          </div>

          ${falseObjects.map((item) => `
            <div class="false-object ${h(item.lane || "middle")}">${h(item.emoji || "🌫️")}</div>
          `).join("")}

          <div class="snitch-narrator">“${h(state.narrator || "¡La Snitch está en juego!") }”</div>
        </div>

        <div class="snitch-progress">
          <div class="snitch-progress-track">
            <div id="snitch-progress-bar" class="snitch-progress-bar"></div>
          </div>
          <div id="snitch-progress-text" class="snitch-progress-text">Tiempo restante</div>
        </div>

        <div id="snitch-players" class="snitch-players"></div>

        <div class="host-help">
          Cada jugador tiene 5 intentos. Perfecto +120 · Cerca +70 · Fuera -30 · Mejor reflejo +50 · Mejor casa +100
        </div>
      </section>
    `;

    updateSnitchTimer(state);
    updateSnitchPlayers(state, players);
  }

  function updateSnitchTimer(state) {
    const bar = document.getElementById("snitch-progress-bar");
    const text = document.getElementById("snitch-progress-text");

    if (!bar || !text) return;

    const info = getSnitchTimeInfo(state);

    bar.style.transform = `scaleX(${info.pct})`;
    text.textContent = `Tiempo restante: ${info.left.toFixed(1)}s · Intentos por jugador: ${state.attempts_total || 5}`;

    const rounded = Math.ceil(info.left);

    if (rounded <= 3 && rounded > 0 && rounded !== snitchLastTick) {
      snitchLastTick = rounded;

      if (typeof MagicSound !== "undefined") {
        MagicSound.play("timer-danger");
      }
    }

    if (info.left <= 0 && !snitchAutoRevealLock) {
      snitchAutoRevealLock = true;

      setTimeout(() => {
        if (typeof revelarResultados === "function") {
          revelarResultados();
        }
      }, 700);
    }
  }

  function getAttemptCount(state, playerName) {
    const attempts = state.attempts_by_player || {};
    const value = attempts[playerName];

    if (Array.isArray(value)) {
      return value.length;
    }

    return Number(value || 0);
  }

  function updateSnitchPlayers(state, players) {
    const box = document.getElementById("snitch-players");
    if (!box) return;

    const total = Number(state.attempts_total || 5);

    box.innerHTML = "";

    players.forEach((player) => {
      const count = getAttemptCount(state, player.name);
      const item = document.createElement("div");

      item.className = `snitch-player ${count >= total ? "ready" : ""}`;
      item.textContent = `${localHouseIcons[player.house] || "✨"} ${player.name} — ${count}/${total} intentos`;

      box.appendChild(item);
    });
  }

  function renderSnitchResults(state, container) {
    const result = state.snitch_result || {};
    const events = state.point_events || [];

    const panel = document.createElement("div");
    panel.className = "snitch-result-panel";

    const title = document.createElement("div");
    title.className = "snitch-result-title";

    if (result.best_reflex && result.best_reflex.player_name) {
      title.textContent = `🏆 ${result.best_reflex.player_name} tuvo el mejor reflejo`;
    } else {
      title.textContent = "🏆 La Snitch escapó con dignidad";
    }

    const line = document.createElement("div");
    line.className = "snitch-result-line";
    line.textContent = `“${result.narrator || "La Snitch está impresionada. No por todos, pero algo es algo."}”`;

    const house = document.createElement("div");
    house.className = "snitch-result-line";
    house.textContent = result.best_house_average
      ? `Mejor promedio por casa: ${result.best_house_average.house} (${result.best_house_average.average_delta_ms} ms)`
      : "Ninguna casa logró promedio positivo. Eso también es talento, pero triste.";

    panel.appendChild(title);
    panel.appendChild(line);
    panel.appendChild(house);
    container.appendChild(panel);

    events.forEach((event) => {
      const row = document.createElement("div");
      row.className = `result-row ${event.points > 0 ? "good" : "bad"}`;

      const left = document.createElement("span");
      left.textContent = `${event.player_name} — ${event.label}`;

      const right = document.createElement("span");
      right.textContent = `${event.points > 0 ? "+" : ""}${event.points} pts`;

      row.appendChild(left);
      row.appendChild(right);
      container.appendChild(row);
    });
  }

  const originalRenderPlaying = window.renderPlaying;
  const originalRenderResults = window.renderResults;

  window.renderPlaying = function patchedRenderPlaying(data) {
    const state = data.game_state || {};

    if (state.phase === "atrapa_snitch") {
      if (typeof showScreen === "function") {
        showScreen("view-game");
      }

      const key = getSnitchKey(state);

      if (snitchLastKey !== key) {
        snitchLastKey = key;
        snitchLastTick = null;
        snitchAutoRevealLock = false;

        if (typeof MagicSound !== "undefined") {
          MagicSound.play("start");
        }

        renderSnitch(state, data.players || []);
      }

      updateSnitchTimer(state);
      updateSnitchPlayers(state, data.players || []);

      return;
    }

    originalRenderPlaying(data);
  };

  window.renderResults = function patchedRenderResults(data) {
    const state = data.game_state || {};
    const phase = state.phase || "";

    if (phase === "results_atrapa_snitch") {
      if (typeof showScreen === "function") {
        showScreen("view-results");
      }

      const title = document.getElementById("titulo-resultados");
      const correct = document.getElementById("tv-correcta");
      const explanation = document.getElementById("tv-explicacion");
      const extra = document.getElementById("tv-extra-results");

      if (title) title.innerText = "Resultado de la Snitch:";
      if (correct) correct.innerText = state.correct || "La Snitch fue capturada";
      if (explanation) explanation.textContent = state.snitch_result?.summary || "";
      if (extra) {
        extra.innerHTML = "";
        renderSnitchResults(state, extra);
      }

      if (typeof renderHouseScores === "function") {
        renderHouseScores(data.players || []);
      }

      if (typeof MagicSound !== "undefined") {
        MagicSound.play("reveal");
      }

      return;
    }

    originalRenderResults(data);
  };
})();