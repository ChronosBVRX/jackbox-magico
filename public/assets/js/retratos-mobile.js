(() => {
  const answerLetters = ["A", "B", "C", "D"];

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

  function setRoundRuntime(key, startedMs) {
    try { currentRoundKey = key; } catch (error) { window.currentRoundKey = key; }
    try { currentRoundStartedMs = startedMs; } catch (error) { window.currentRoundStartedMs = startedMs; }
    try { hasAnsweredCurrentRound = false; } catch (error) { window.hasAnsweredCurrentRound = false; }
  }

  function getHasAnsweredFlag() {
    try {
      return Boolean(hasAnsweredCurrentRound);
    } catch (error) {
      return Boolean(window.hasAnsweredCurrentRound);
    }
  }

  function ensureRetratosPanel() {
    let panel = document.getElementById("retratos-mobile-panel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "retratos-mobile-panel";
      panel.className = "retratos-mobile-panel";

      const buttons = document.getElementById("m-botones");
      if (buttons && buttons.parentElement) {
        buttons.parentElement.insertBefore(panel, buttons.nextSibling);
      } else {
        const card = document.querySelector("#view-game .card");
        if (card) card.appendChild(panel);
      }
    }

    return panel;
  }

  function hideOtherPanels() {
    [
      "trivia-mobile-panel",
      "duel-mobile-panel",
      "sombrero-mobile-panel",
      "pociones-mobile-panel",
      "snitch-mobile-panel",
    ].forEach((id) => {
      const panel = document.getElementById(id);
      if (panel) {
        panel.classList.remove("visible");
        panel.innerHTML = "";
      }
    });
  }

  function renderRetratosMobile(state) {
    if (typeof showScreen === "function") showScreen("view-game");
    if (typeof showHostPanels === "function") {
      const hostFlag = typeof myIsHost !== "undefined" ? myIsHost : Boolean(window.myIsHost);
      showHostPanels(hostFlag);
    }

    hideOtherPanels();

    const buttons = document.getElementById("m-botones");
    if (buttons) buttons.innerHTML = "";

    const answered = state.answered || {};
    const myNameValue = typeof myName !== "undefined" ? myName : (window.myName || "");

    if (answered[myNameValue] || getHasAnsweredFlag()) {
      if (typeof renderAnsweredWait === "function") renderAnsweredWait(state);
      return;
    }

    const key = `${state.phase}-${state.round_id || state.question || "retratos"}`;
    const currentKeyValue = typeof currentRoundKey !== "undefined" ? currentRoundKey : window.currentRoundKey;
    if (key !== currentKeyValue) {
      const startedMs = state.started_at ? Number(state.started_at) * 1000 : Date.now();
      setRoundRuntime(key, startedMs);
      if (typeof safeSound === "function") safeSound("start");
      if (typeof vibrate === "function") vibrate([25, 40, 25]);
    }

    const info = getClueInfo(state);
    const pistas = state.pistas || [state.question || "El retrato está pensando..."];
    const activeClue = pistas[info.clueIndex] || pistas[pistas.length - 1] || state.question || "";
    const pointsByClue = state.points_by_clue || { 1: 150, 2: 100, 3: 60 };
    const options = state.options || [];

    const gamePill = document.getElementById("game-pill");
    const aviso = document.getElementById("m-pregunta-aviso");
    const small = document.getElementById("m-question-small");
    const timer = document.getElementById("mobile-timer");
    const status = document.getElementById("mobile-status");
    const bar = document.getElementById("mobile-timer-bar");

    if (gamePill) gamePill.innerText = "🖼️ Retratos";
    if (aviso) aviso.innerText = "¡El retrato está chismeando!";
    if (small) small.innerText = `Pista ${info.clueNumber}/3 · ${state.categoria || "Misterio"}`;
    if (timer) timer.style.display = "block";
    if (status) status.innerText = `Pista ${info.clueNumber}: +${Number(pointsByClue[info.clueNumber] || 60)} · rápido correcto +30`;
    if (bar) bar.style.transform = `scaleX(${info.progress})`;

    const panel = ensureRetratosPanel();
    panel.classList.add("visible");

    panel.innerHTML = `
      <div class="retratos-mobile-card">
        <div class="retratos-pill" style="width:max-content;margin-bottom:10px;">🖼️ ${escapeHTML(state.categoria || "Misterio")}</div>
        <h2 class="retratos-mobile-title">${escapeHTML(state.title || "Retratos Chismosos")}</h2>
        <p class="retratos-mobile-clue">“${escapeHTML(activeClue)}”</p>

        <div class="retratos-mobile-options">
          ${options.map((option, index) => `
            <button class="retratos-answer-btn option-btn" onclick="enviarRespuesta('${escapeAttribute(option)}', this)">
              <span class="retratos-answer-letter">${answerLetters[index] || "?"}</span>
              <span style="font-weight:950;line-height:1.12;">${escapeHTML(option)}</span>
            </button>
          `).join("")}
        </div>
      </div>
    `;
  }

  function installRetratosMobilePatch() {
    const originalRenderMobileGame = window.renderMobileGame;

    if (typeof originalRenderMobileGame === "function") {
      window.renderMobileGame = function patchedRenderMobileGame(state) {
        if ((state?.phase || "") === "retratos_chismosos") {
          renderRetratosMobile(state);
          return;
        }

        return originalRenderMobileGame.apply(this, arguments);
      };
    }

    window.renderRetratosMobile = renderRetratosMobile;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installRetratosMobilePatch);
  } else {
    installRetratosMobilePatch();
  }
})();
