(() => {
  function render(state, players) {
    const container = document.getElementById("game-container");
    if (!container) return;

    window.SceneTransition?.hide();
    window.showScreen("view-game");

    const options = state.options || [];
    const roundNumber = Number(state.round_number || 1);
    const roundId = state.round_id || state.round_number || roundNumber;
    const totalQuestions = Number(state.trivia_session?.total_questions || 25);
    const category = state.category || state.question_payload?.categoria || "Mundo mágico";

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
            <div id="trivia-answered-count">0/${players.length} respondieron</div>
            <div class="trivia-narrator-box">“${window.escapeHTML(state.narrator || "El Gran Comedor espera...H")}”</div>
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
  }

  window.SceneTrivia = { render };
})();