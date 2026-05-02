(() => {
  let lastTriviaRenderKey = "";
  let finishingTriviaKey = "";

  function getTriviaRenderKey(state) {
    return `${state.phase}:${state.round_id || ""}:${state.question || ""}`;
  }

  function getAnsweredCount(state) {
    const answered = state.answered || state.answers || {};
    return Object.keys(answered).length;
  }

  function updateTimer(state) {
    const timeEl = document.getElementById("trivia-time");
    const pathEl = document.getElementById("timer-path");

    if (!timeEl || state.phase !== "trivia") return 0;

    const duration = Number(state.duration_seconds || 20);
    const startedAt = Number(state.started_at || 0) * 1000;
    const elapsed = startedAt > 0 ? Math.max(0, Date.now() - startedAt) / 1000 : 0;
    const left = startedAt > 0 ? Math.max(0, duration - elapsed) : duration;
    const pct = duration > 0 ? Math.max(0, Math.min(1, left / duration)) : 0;

    timeEl.textContent = String(Math.ceil(left));

    if (pathEl) {
      pathEl.setAttribute("stroke-dasharray", `${pct * 100}, 100`);
    }

    return left;
  }

  function getRoomCodeFromTv() {
    try {
      if (typeof currentRoom !== "undefined" && currentRoom) {
        return String(currentRoom).trim().toUpperCase();
      }
    } catch (_) {}

    const tvCode = document.getElementById("tv-code")?.textContent?.trim();
    if (tvCode && tvCode !== "----") {
      return tvCode.toUpperCase();
    }

    const bottomCode = document.querySelector(".room-code")?.textContent?.trim();
    if (bottomCode && bottomCode !== "----") {
      return bottomCode.toUpperCase();
    }

    return localStorage.getItem("jackbox_magico_room") || "";
  }

  function getTvTokenFromTv() {
    try {
      if (window.RoomLifecycleTv?.getTvToken) {
        return window.RoomLifecycleTv.getTvToken();
      }
    } catch (_) {}
    return localStorage.getItem("jackbox_magico_tv_token") || "";
  }

  async function finishTriviaFromTv(state) {
    const room = getRoomCodeFromTv();
    const token = getTvTokenFromTv();

    if (!room) {
      console.error("No se pudo cerrar trivia: room_code vacío");
      return;
    }

    const key = `${room}:${state.round_id || state.question || "trivia"}`;

    if (finishingTriviaKey === key) return;
    finishingTriviaKey = key;

    try {
      await fetch(`/api/trivia/${room}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tv_token: token, force: false })
      });
    } catch (e) {
      console.error("Error cerrando trivia", e);
      finishingTriviaKey = ""; // Reset on error so we can retry
    }
  }

  function maybeFinishTrivia(state) {
    if (!state || state.phase !== "trivia") return;

    const duration = Number(state.duration_seconds || 20);
    const startedAt = Number(state.started_at || 0) * 1000;

    if (!startedAt || !duration) return;

    const elapsed = Math.max(0, Date.now() - startedAt) / 1000;
    const left = Math.max(0, duration - elapsed);

    if (left <= 0) {
      finishTriviaFromTv(state);
    }
  }

  function updateAnsweredCount(state, players) {
    const answeredCountEl = document.getElementById("trivia-answered-count");
    if (answeredCountEl) {
      const answeredCount = getAnsweredCount(state);
      const totalPlayers = players.length;
      answeredCountEl.textContent = `${answeredCount}/${totalPlayers} respondieron`;
    }
  }

  function render(state, players) {
    const container = document.getElementById("game-container");
    if (!container) return;

    window.SceneTransition?.hide();
    window.showScreen("view-game");

    const key = getTriviaRenderKey(state);

    if (key === lastTriviaRenderKey) {
      updateTimer(state);
      updateAnsweredCount(state, players);
      maybeFinishTrivia(state);
      return;
    }

    lastTriviaRenderKey = key;

    const options = state.options || [];
    const roundNumber = Number(state.round_number || 1);
    const roundId = state.round_id || state.round_number || roundNumber;
    const totalQuestions = Number(state.trivia_session?.total_questions || 25);
    const category = state.category || state.question_payload?.categoria || "Mundo mágico";
    const totalPlayers = players.length;
    const answeredCount = getAnsweredCount(state);

    container.innerHTML = `
      <section id="trivia-board" class="trivia-board clean-trivia">
        <div class="trivia-content-full">
          <header class="trivia-header-clean">
            <div class="trivia-pill">🏰 ${category}</div>
            <div class="trivia-round-counter">Pregunta ${roundNumber} / ${totalQuestions}</div>
            <div class="trivia-timer-circle" id="trivia-timer-display">
              <svg viewBox="0 0 36 36">
                <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path id="timer-path" class="circle" stroke-dasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <strong id="trivia-time">20</strong>
            </div>
          </header>

          <div class="trivia-question-main">
            <h2 class="trivia-question-text-large">${window.escapeHTML(state.question || "¡Responde!")}</h2>
            
            <div class="trivia-options-grid-clean">
              ${options.map((option, index) => `
                <div class="trivia-option-clean" style="animation-delay:${index * 100}ms;">
                  <div class="letter">${["A", "B", "C", "D"][index]}</div>
                  <div class="text">${window.escapeHTML(option)}</div>
                </div>
              `).join("")}
            </div>
          </div>

          <div class="trivia-footer-clean">
            <div id="trivia-answered-count">${answeredCount}/${totalPlayers} respondieron</div>
            <div class="trivia-narrator-box">“${window.escapeHTML(state.narrator || "El Gran Comedor espera...")}”</div>
          </div>
        </div>
      </section>
    `;

    const roundVoiceKey = `trivia_start_${roundId}`;
    if (window.lastVoicePhase !== roundVoiceKey) {
      window.lastVoicePhase = roundVoiceKey;
      window.VoiceLinesTv?.playVoiceLine?.("round_start", { volume: 0.75, dedupeKey: roundVoiceKey });
    }

    const threatVoiceKey = `trivia_threat_${roundId}_${state.question || ""}`;
    if (window.lastThreatVoiceKey !== threatVoiceKey) {
      window.lastThreatVoiceKey = threatVoiceKey;
      setTimeout(() => {
        window.VoiceLinesTv?.playVoiceLine?.("threat", { volume: 0.75, dedupeKey: threatVoiceKey });
      }, 900);
    }
    
    updateTimer(state);
  }

  window.SceneTrivia = { render, updateTimer, updateAnsweredCount, maybeFinishTrivia };
})();