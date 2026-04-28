(function () {
  let snitchLastKey = "";
  let snitchLastTick = null;
  let snitchAutoRevealLock = false;
  let activeState = null;
  let activePlayers = [];
  let rafId = null;

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

  function getElapsed(state) {
    const startedAt = Number(state.started_at || Date.now() / 1000);
    return Math.max(0, Date.now() / 1000 - startedAt);
  }

  function getSnitchTimeInfo(state) {
    const duration = Number(state.duration_seconds || 24);
    const elapsed = getElapsed(state);
    const left = Math.max(0, duration - elapsed);

    return {
      duration,
      elapsed,
      left,
      pct: duration > 0 ? Math.max(0, Math.min(1, left / duration)) : 0,
    };
  }

  function laneY(lane) {
    if (lane === "top") return 122;
    if (lane === "bottom") return 278;
    return 196;
  }

  function currentWindow(state, elapsed) {
    const windows = state.capture_windows || [];

    if (!windows.length) return null;

    let chosen = windows[0];

    for (const item of windows) {
      const center = Number(item.center_time || 0);
      if (Math.abs(elapsed - center) < Math.abs(elapsed - Number(chosen.center_time || 0))) {
        chosen = item;
      }
    }

    return chosen;
  }

  function animateSnitch() {
    if (!activeState) return;

    const field = document.getElementById("snitch-field");
    const snitch = document.getElementById("snitch-object");
    const trail = document.getElementById("snitch-trail");
    const zone = document.getElementById("snitch-capture-zone");

    if (!field || !snitch || !trail || !zone) {
      rafId = requestAnimationFrame(animateSnitch);
      return;
    }

    const elapsed = getElapsed(activeState);
    const windowItem = currentWindow(activeState, elapsed);

    if (windowItem) {
      const center = Number(windowItem.center_time || 0);
      const travel = 1.72;
      const progress = Math.max(0, Math.min(1, (elapsed - (center - travel)) / (travel * 2)));

      const fieldWidth = field.clientWidth || 1000;
      const fromX = windowItem.direction === "right_to_left" ? fieldWidth + 70 : -70;
      const toX = windowItem.direction === "right_to_left" ? -70 : fieldWidth + 70;
      const midX = fieldWidth / 2 + Number(windowItem.zone_shift || 0);

      let x;

      if (progress < .5) {
        const p = progress / .5;
        x = fromX + (midX - fromX) * easeInOut(p);
      } else {
        const p = (progress - .5) / .5;
        x = midX + (toX - midX) * easeInOut(p);
      }

      const baseY = laneY(windowItem.lane);
      const wobble = Math.sin(elapsed * 8.8) * 18 + Math.sin(elapsed * 3.2) * 9;
      const rotate = Math.sin(elapsed * 12) * 16;

      snitch.style.transform = `translate(${x - 27}px, ${baseY + wobble - 27}px) rotate(${rotate}deg)`;
      snitch.classList.remove("hidden");

      trail.style.transform = `translate(${x - 144}px, ${baseY + wobble - 3}px) rotate(${windowItem.direction === "right_to_left" ? "180deg" : "0deg"})`;
      trail.style.opacity = ".75";

      zone.style.left = `calc(50% + ${Number(windowItem.zone_shift || 0)}px)`;
    }

    updateFalseObjects(activeState, elapsed);

    rafId = requestAnimationFrame(animateSnitch);
  }

  function easeInOut(t) {
    return t < .5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function updateFalseObjects(state, elapsed) {
    const fakes = state.false_objects || [];

    fakes.forEach((item) => {
      const el = document.getElementById(`fake-${item.id}`);
      if (!el) return;

      const time = Number(item.time || 0);
      const distance = Math.abs(elapsed - time);

      if (distance <= 1.1) {
        el.classList.add("visible");

        const direction = item.direction === "right_to_left" ? -1 : 1;
        const progress = Math.max(0, Math.min(1, (elapsed - (time - 1.1)) / 2.2));
        const x = direction === 1
          ? 12 + progress * 74
          : 86 - progress * 74;

        el.style.left = `${x}%`;
      } else {
        el.classList.remove("visible");
      }
    });
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

        <div id="snitch-field" class="snitch-field">
          <div class="snitch-stands"></div>
          <div class="snitch-crowd"></div>
          <div class="snitch-storm"></div>

          <div class="snitch-hoop left"></div>
          <div class="snitch-hoop right"></div>

          <div id="snitch-capture-zone" class="capture-zone"></div>

          <div id="snitch-trail" class="snitch-trail"></div>

          <div id="snitch-object" class="snitch-object">
            <div class="snitch-wing left"></div>
            <div class="snitch-wing right"></div>
            <div class="snitch-core"></div>
          </div>

          ${falseObjects.map((item) => `
            <div id="fake-${h(item.id)}" class="false-object ${h(item.lane || "middle")}">${h(item.emoji || "🌫️")}</div>
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

    if (rafId) {
      cancelAnimationFrame(rafId);
    }

    activeState = state;
    activePlayers = players;
    rafId = requestAnimationFrame(animateSnitch);
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

      activeState = state;
      activePlayers = data.players || [];

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

    if (typeof originalRenderPlaying === "function") {
      originalRenderPlaying(data);
    }
  };

  window.renderResults = function patchedRenderResults(data) {
    const state = data.game_state || {};
    const phase = state.phase || "";

    if (phase === "results_atrapa_snitch") {
      activeState = null;

      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

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

    if (typeof originalRenderResults === "function") {
      originalRenderResults(data);
    }
  };
})();