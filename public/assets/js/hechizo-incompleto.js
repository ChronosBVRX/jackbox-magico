(function () {
  "use strict";

  const LETTERS = ["A", "B", "C", "D"];

  const HOUSES = [
    ["🦁", "Gryffindor"],
    ["🐍", "Slytherin"],
    ["🦅", "Ravenclaw"],
    ["🦡", "Hufflepuff"],
  ];

  let lastTvRoundKey = "";
  let lastMobileRoundKey = "";
  let lastResultsRoundKey = "";
  let localRoundKey = "";
  let localRoundStartedMs = Date.now();
  let localAnswered = false;
  let lastDangerSecond = null;

  function txt(value) {
    return String(value ?? "");
  }

  function escapeHTML(value) {
    return txt(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHTML(value).replaceAll("`", "&#096;");
  }

  function playSound(name) {
    try {
      if (window.MagicSound && typeof window.MagicSound.play === "function") {
        window.MagicSound.play(name);
      }
    } catch (error) {}
  }

  function vibrate(pattern) {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (error) {}
  }

  function phaseOf(dataOrState) {
    if (!dataOrState) return "";

    if (dataOrState.game_state) {
      return dataOrState.game_state.phase || "";
    }

    return dataOrState.phase || "";
  }

  function getStateFromData(dataOrState) {
    if (!dataOrState) return {};

    if (dataOrState.game_state) {
      return dataOrState.game_state || {};
    }

    return dataOrState || {};
  }

  function roundKey(state) {
    return [
      state.phase || "",
      state.round_id || "",
      state.item_id || "",
      state.question || "",
    ].join("::");
  }

  function resultsKey(state) {
    return [
      state.phase || "",
      state.round_id || "",
      state.hechizo_result ? "revealed" : "plain",
    ].join("::");
  }

  function getPhaseInfo(state) {
    const total = Number(state.duration_seconds || 7);
    const startedAt = Number(state.started_at || Date.now() / 1000);
    const elapsed = Math.max(0, Date.now() / 1000 - startedAt);
    const left = Math.max(0, total - elapsed);
    const pct = Math.max(0, Math.min(1, left / Math.max(1, total)));

    return {
      total,
      elapsed,
      left,
      pct,
      isOver: left <= 0,
    };
  }

  function getDifficultyLabel(value) {
    const normalized = txt(value || "media").toLowerCase();

    if (normalized === "facil" || normalized === "fácil") return "Fácil";
    if (normalized === "dificil" || normalized === "difícil") return "Difícil";
    if (normalized === "experto") return "Experto";

    return "Media";
  }

  function formatQuestion(question) {
    return escapeHTML(question || "Hechizo incompleto").replaceAll(
      "___",
      '<span class="hechizo-blank">___</span>'
    );
  }

  function showScreenSafe(id) {
    if (typeof window.showScreen === "function") {
      window.showScreen(id);
      return;
    }

    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("visible");
    });

    const target = document.getElementById(id);
    if (target) {
      target.classList.add("visible");
    }
  }

  function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.innerText = value;
    }
  }

  function getRoomCode() {
    try {
      if (typeof myRoom !== "undefined" && myRoom) {
        return myRoom;
      }
    } catch (error) {}

    return (
      localStorage.getItem("jackbox_magico_room") ||
      document.getElementById("m-room")?.value ||
      ""
    )
      .toUpperCase()
      .trim();
  }

  function getPlayerName() {
    try {
      if (typeof myName !== "undefined" && myName) {
        return myName;
      }
    } catch (error) {}

    return (
      localStorage.getItem("jackbox_magico_name") ||
      document.getElementById("m-name")?.value ||
      ""
    ).trim();
  }

  function isHost() {
    try {
      if (typeof myIsHost !== "undefined") {
        return Boolean(myIsHost);
      }
    } catch (error) {}

    return Boolean(window.myIsHost);
  }

  function setAnswered(value) {
    localAnswered = Boolean(value);

    try {
      hasAnsweredCurrentRound = Boolean(value);
    } catch (error) {}
  }

  function getAnswered() {
    if (localAnswered) return true;

    try {
      if (typeof hasAnsweredCurrentRound !== "undefined" && hasAnsweredCurrentRound) {
        return true;
      }
    } catch (error) {}

    return false;
  }

  function forceResetAnsweredForNewRound(state) {
    const key = roundKey(state);

    localRoundKey = key;
    localRoundStartedMs = Date.now();
    localAnswered = false;
    lastDangerSecond = null;

    try {
      hasAnsweredCurrentRound = false;
    } catch (error) {}

    try {
      currentRoundKey = key;
    } catch (error) {}

    return key;
  }

  function showHostPanelsSafe(show) {
    if (typeof window.showHostPanels === "function") {
      window.showHostPanels(Boolean(show));
      return;
    }

    const hostPanel = document.getElementById("host-panel");
    const hostGamePanel = document.getElementById("host-game-panel");

    if (hostPanel) {
      hostPanel.classList.toggle("visible", Boolean(show));
    }

    if (hostGamePanel) {
      hostGamePanel.classList.toggle("visible", Boolean(show));
    }
  }

  function hideOtherMobilePanels() {
    if (typeof window.hideGamePanels === "function") {
      window.hideGamePanels();
    }

    [
      "trivia-mobile-panel",
      "duel-mobile-panel",
      "sombrero-mobile-panel",
      "pociones-mobile-panel",
      "snitch-mobile-panel",
      "retratos-mobile-panel",
      "mapa-mobile-panel",
    ].forEach((id) => {
      const panel = document.getElementById(id);

      if (panel) {
        panel.classList.remove("visible");
        panel.innerHTML = "";
      }
    });
  }

  function ensureMobilePanel() {
    let panel = document.getElementById("hechizo-mobile-panel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "hechizo-mobile-panel";
      panel.className = "trivia-mobile-panel";

      const hostPanel = document.getElementById("host-game-panel");
      const card = document.querySelector("#view-game .card");

      if (hostPanel && hostPanel.parentElement) {
        hostPanel.parentElement.insertBefore(panel, hostPanel);
      } else if (card) {
        card.appendChild(panel);
      }
    }

    return panel;
  }

  function clearMobilePanel() {
    const panel = document.getElementById("hechizo-mobile-panel");

    if (panel) {
      panel.classList.remove("visible");
      panel.innerHTML = "";
      panel.dataset.roundKey = "";
    }
  }

  function floatingLetters() {
    const letters = [
      "A",
      "L",
      "O",
      "H",
      "O",
      "M",
      "O",
      "R",
      "A",
      "✦",
      "L",
      "U",
      "M",
      "O",
      "S",
      "✧",
    ];

    return `
      <div class="hechizo-floating-letters" aria-hidden="true">
        ${letters
          .map(
            (char, index) => `
              <span
                class="hechizo-letter"
                style="left:${(index * 13 + 7) % 92}%;top:${(index * 19 + 8) % 78}%"
              >
                ${escapeHTML(char)}
              </span>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderHouseShields() {
    return `
      <div class="hechizo-shields">
        ${HOUSES.map(
          ([icon, name]) => `
            <div class="hechizo-shield" title="${escapeAttr(name)}">
              ${icon}
            </div>
          `
        ).join("")}
      </div>
    `;
  }

  function renderPlayers(players, state) {
    const answered = state.answers || state.answered || {};

    return (players || [])
      .map(
        (player) => `
          <div class="trivia-player-row ${answered[player.name] ? "answered" : ""}">
            <span>${escapeHTML(player.name)} · ${escapeHTML(player.house || "Casa")}</span>
            <span class="status">
              ${answered[player.name] ? "Hechizo enviado" : "Concentrándose"}
            </span>
          </div>
        `
      )
      .join("");
  }

  function renderTvHTML(data) {
    const state = data.game_state || {};
    const players = data.players || [];
    const info = getPhaseInfo(state);
    const options = state.options || [];

    return `
      <section class="hechizo-stage" data-round="${escapeAttr(roundKey(state))}">
        <div class="hechizo-content">
          <header class="hechizo-header">
            <div>
              <div class="hechizo-kicker">
                ✨ Copa de las Casas · Hechizo Incompleto
              </div>

              <h1 class="hechizo-title">Hechizo Incompleto</h1>

              <p class="hechizo-subtitle">
                ${escapeHTML(
                  state.subtitle ||
                    "Completa el encantamiento antes de que la magia se te vaya chueca."
                )}
              </p>
            </div>

            <div class="hechizo-timer">
              <span>Tiempo mágico</span>
              <strong id="hechizo-tv-seconds">${Math.ceil(info.left)}</strong>
            </div>
          </header>

          <div class="hechizo-main-grid">
            <div class="hechizo-scroll">
              ${floatingLetters()}

              <div class="hechizo-question-wrap">
                <div class="hechizo-round-line">
                  <span class="hechizo-chip">${escapeHTML(
                    getDifficultyLabel(state.difficulty)
                  )}</span>

                  <span class="hechizo-chip">${escapeHTML(
                    state.question_type || "hechizo"
                  )}</span>

                  ${
                    state.expert_mode
                      ? '<span class="hechizo-chip">Modo experto: error -20</span>'
                      : '<span class="hechizo-chip">Error 0</span>'
                  }
                </div>

                <h2 class="hechizo-question">
                  ${formatQuestion(state.question)}
                </h2>

                <div class="hechizo-options-tv">
                  ${options
                    .map(
                      (option, index) => `
                        <div class="hechizo-option-tv">
                          <span class="hechizo-option-letter">
                            ${LETTERS[index] || "?"}
                          </span>

                          <span class="hechizo-option-text">
                            ${escapeHTML(option)}
                          </span>
                        </div>
                      `
                    )
                    .join("")}
                </div>

                <div class="hechizo-narrator">
                  🧙 ${escapeHTML(state.narrator || "Pronuncien bien, por favor.")}
                </div>

                <div class="hechizo-progress">
                  <div
                    id="hechizo-tv-progress"
                    style="transform:scaleX(${info.pct})"
                  ></div>
                </div>
              </div>
            </div>

            <aside class="hechizo-side">
              <div class="hechizo-side-card">
                <h3 class="hechizo-side-title">Reglas rápidas</h3>
                <p>
                  Correcta +80 · menos de 3 segundos +40 · racha de 5 +150 ·
                  modo experto: error -20.
                </p>
              </div>

              <div class="hechizo-side-card">
                <h3 class="hechizo-side-title">Casas</h3>
                ${renderHouseShields()}
              </div>

              <div class="trivia-side-card">
                <h3 class="trivia-side-title">Jugadores</h3>
                <div class="trivia-players" id="hechizo-tv-players">
                  ${renderPlayers(players, state)}
                </div>
              </div>

              <div class="trivia-side-card">
                <h3 class="trivia-side-title">Marcador</h3>
                <div class="trivia-house-score">
                  ${
                    typeof renderHouseScoreboard === "function"
                      ? renderHouseScoreboard(players)
                      : ""
                  }
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    `;
  }

  function updateTvOnly(data) {
    const state = data.game_state || {};
    console.log("[hechizo-tv] answers", state.answers, state.answered);
    const info = getPhaseInfo(state);

    const seconds = document.getElementById("hechizo-tv-seconds");
    const progress = document.getElementById("hechizo-tv-progress");
    const players = document.getElementById("hechizo-tv-players");

    if (seconds) {
      seconds.innerText = String(Math.ceil(info.left));
    }

    if (progress) {
      progress.style.transform = `scaleX(${info.pct})`;
    }

    if (players) {
      players.innerHTML = renderPlayers(data.players || [], state);
    }

    const dangerSecond = Math.ceil(info.left);

    if (dangerSecond <= 3 && dangerSecond > 0 && dangerSecond !== lastDangerSecond) {
      lastDangerSecond = dangerSecond;
      playSound("timer-danger");
    }
  }

  function renderTvStable(data) {
    showScreenSafe("view-game");

    const container = document.getElementById("game-container");
    if (!container) return false;

    const state = data.game_state || {};
    const key = roundKey(state);
    const currentStage = container.querySelector(".hechizo-stage");

    if (currentStage && lastTvRoundKey === key) {
      updateTvOnly(data);
      return true;
    }

    lastTvRoundKey = key;
    lastDangerSecond = null;
    container.innerHTML = renderTvHTML(data);
    playSound(state.sound_cue || "mystery_bell");

    return true;
  }

  function renderMobileHTML(state) {
    const info = getPhaseInfo(state);
    const options = state.options || [];
    const alreadyAnswered = getAnswered();

    return `
      <div class="hechizo-mobile-card" data-round="${escapeAttr(roundKey(state))}">
        <div class="hechizo-mobile-content">
          <div class="hechizo-kicker">✨ Hechizo Incompleto</div>

          <h2>${formatQuestion(state.question)}</h2>

          <p class="hechizo-mobile-note">
            Completa la frase. Menos de 3 segundos da bonus.
            ${
              state.expert_mode
                ? "Cuidado: en experto fallar resta -20."
                : "Aquí fallar no resta, pero sí da pena mágica."
            }
          </p>

          <div class="hechizo-progress">
            <div
              id="hechizo-mobile-progress"
              style="transform:scaleX(${info.pct})"
            ></div>
          </div>

          <div class="hechizo-mobile-options">
            ${options
              .map(
                (option, index) => `
                  <button
                    class="hechizo-mobile-btn"
                    type="button"
                    onclick="window.enviarHechizoRespuesta('${escapeAttr(option)}', this)"
                    ${info.isOver || alreadyAnswered ? "disabled" : ""}
                  >
                    ${LETTERS[index] || "?"}. ${escapeHTML(option)}
                  </button>
                `
              )
              .join("")}
          </div>

          <div id="hechizo-mobile-feedback" class="hechizo-mobile-feedback">
            ${
              alreadyAnswered
                ? "Respuesta enviada. Mira la TV."
                : "Toca una opción para lanzar tu hechizo."
            }
          </div>
        </div>
      </div>
    `;
  }

  function updateMobileOnly(state) {
    const info = getPhaseInfo(state);

    const progress = document.getElementById("hechizo-mobile-progress");
    if (progress) {
      progress.style.transform = `scaleX(${info.pct})`;
    }

    const timer = document.getElementById("mobile-timer");
    const bar = document.getElementById("mobile-timer-bar");
    const status = document.getElementById("mobile-status");

    if (timer) {
      timer.style.display = "block";
    }

    if (bar) {
      bar.style.transform = `scaleX(${info.pct})`;
    }

    if (status && !getAnswered()) {
      status.innerText = info.isOver
        ? "Tiempo agotado. Mira la TV."
        : `Completa el hechizo. Tiempo restante: ${Math.ceil(info.left)}s.`;
    }

    const dangerSecond = Math.ceil(info.left);

    if (dangerSecond <= 3 && dangerSecond > 0 && dangerSecond !== lastDangerSecond) {
      lastDangerSecond = dangerSecond;
      playSound("timer-danger");
      vibrate(35);
    }

    if (info.isOver) {
      document.querySelectorAll(".hechizo-mobile-btn").forEach((button) => {
        button.disabled = true;
      });
    }
  }

  function renderMobileStable(state) {
    showScreenSafe("view-game");
    showHostPanelsSafe(isHost());
    hideOtherMobilePanels();

    const buttons = document.getElementById("m-botones");
    if (buttons) {
      buttons.innerHTML = "";
    }

    const key = roundKey(state);
    window.currentHechizoRoundId = state.round_id || "";
    window.currentHechizoPhase = state.phase || "";

    if (key !== localRoundKey) {
      forceResetAnsweredForNewRound(state);
      playSound("start");
      vibrate([25, 40, 25]);
    }

    const answered = state.answered || state.answers || {};
    const playerName = getPlayerName();
    const answeredByServer = Boolean(answered[playerName]);

    if (answeredByServer) {
      setAnswered(true);
      renderAnsweredWaitHechizo("Respuesta registrada. Mira la TV para el resultado.");
      return true;
    }

    const info = getPhaseInfo(state);

    setText("game-pill", "✨ Hechizo Incompleto");
    setText("m-pregunta-aviso", info.isOver ? "¡Tiempo agotado!" : "¡Completa el hechizo!");
    setText(
      "m-question-small",
      info.isOver
        ? "El pergamino ya cerró esta ronda."
        : "Elige la opción correcta antes de que se consuma la chispa."
    );
    setText(
      "mobile-status",
      info.isOver
        ? "Tiempo agotado. Mira la TV."
        : `Completa el hechizo. Tiempo restante: ${Math.ceil(info.left)}s.`
    );

    const panel = ensureMobilePanel();
    panel.classList.add("visible");

    if (lastMobileRoundKey !== key || !panel.querySelector(".hechizo-mobile-card")) {
      lastMobileRoundKey = key;
      panel.innerHTML = renderMobileHTML(state);
    }

    updateMobileOnly(state);

    return true;
  }

  async function enviarHechizoRespuesta(answer, button) {
    if (button && button.disabled) return;

    const roomCode = getRoomCode();
    const playerName = getPlayerName();

    if (!roomCode || !playerName) {
      alert("Falta sala o nombre del jugador.");
      return;
    }

    setAnswered(true);

    const elapsedMs = Math.max(0, Date.now() - localRoundStartedMs);

    document.querySelectorAll(".hechizo-mobile-btn").forEach((btn) => {
      btn.disabled = true;
      btn.classList.remove("selected");
    });

    if (button) {
      button.classList.add("selected");
      button.disabled = true;
    }

    const feedback = document.getElementById("hechizo-mobile-feedback");

    if (feedback) {
      feedback.className = "hechizo-mobile-feedback sending";
      feedback.innerText = "Enviando hechizo...";
    }

    setText("mobile-status", "Enviando respuesta al pergamino...");
    playSound("click");
    vibrate(30);

    try {
      const response = await fetch("/api/player/submit_answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          room_code: roomCode,
          player_name: playerName,
          answer,
          client_elapsed_ms: elapsedMs,
          round_id: window.currentHechizoRoundId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.accepted === false) {
        setAnswered(false);

        document.querySelectorAll(".hechizo-mobile-btn").forEach((btn) => {
          btn.disabled = false;
        });

        if (feedback) {
          feedback.className = "hechizo-mobile-feedback error";
          feedback.innerText = data.message || "No se pudo guardar la respuesta.";
        }

        setText("mobile-status", data.message || "No se pudo guardar la respuesta.");
        playSound("wrong");
        vibrate([60, 40, 60]);
        return;
      }

      const points = Number(data.points || 0);
      const labels = Array.isArray(data.labels) ? data.labels.join(" · ") : "";
      const message = `${points} pts · ${data.message || "Respuesta guardada."}${
        labels ? " · " + labels : ""
      }`;

      if (feedback) {
        feedback.className = data.correct
          ? "hechizo-mobile-feedback good"
          : "hechizo-mobile-feedback bad";
        feedback.innerText = message;
      }

      setText("mobile-status", message);
      playSound(data.correct ? "correct" : "wrong");
      vibrate(data.correct ? [25, 35, 25] : [60, 35, 60]);

      setTimeout(() => {
        renderAnsweredWaitHechizo(message);
      }, 550);
    } catch (error) {
      setAnswered(false);

      document.querySelectorAll(".hechizo-mobile-btn").forEach((btn) => {
        btn.disabled = false;
      });

      if (feedback) {
        feedback.className = "hechizo-mobile-feedback error";
        feedback.innerText = "Error de conexión. Intenta de nuevo.";
      }

      setText("mobile-status", "Error de conexión. Intenta de nuevo.");
      playSound("wrong");
      vibrate([60, 40, 60]);
    }
  }

  function renderAnsweredWaitHechizo(message) {
    clearMobilePanel();
    showScreenSafe("view-wait");

    setText("wait-pill", isHost() ? "👑 Host · Hechizo Incompleto" : "🏆 Hechizo Incompleto");
    setText("wait-msg", "¡Respuesta enviada!");
    setText(
      "wait-subtitle",
      isHost()
        ? "Puedes revelar resultados desde aquí cuando quieras."
        : "Mira la TV para seguir la ronda."
    );

    const feedback = document.getElementById("points-feedback");

    if (feedback) {
      feedback.className = "points-feedback visible";
      feedback.innerText = message || "Respuesta enviada. Mira la TV.";
    }

    showHostPanelsSafe(isHost());
  }

  function renderResultsHTML(data) {
    const state = data.game_state || {};
    const players = data.players || [];
    const result = state.hechizo_result || {};
    const answers = result.answers || state.answers || state.last_results || {};
    const fastest = result.fastest;

    return `
      <section class="hechizo-results-wrap" data-results="${escapeAttr(resultsKey(state))}">
        <div class="hechizo-kicker">🏆 Resultado · Hechizo Incompleto</div>

        <h1 class="hechizo-results-title">La varita ya decidió</h1>

        <div class="hechizo-correct-answer">
          ${escapeHTML(state.correct || result.correct || "Respuesta correcta")}
        </div>

        <p class="hechizo-results-comment">
          ${escapeHTML(
            state.comment ||
              result.comment ||
              "Correcto, por un momento sonaste como alguien que sí estudió."
          )}
          ${fastest ? `<br>⚡ Más rápido: <strong>${escapeHTML(fastest)}</strong>` : ""}
        </p>

        <div class="hechizo-result-grid">
          ${
            Object.entries(answers).length
              ? Object.entries(answers)
                  .map(([name, item]) => {
                    const labels = Array.isArray(item.labels) ? item.labels : [];

                    return `
                      <div class="hechizo-result-card ${item.correct ? "correct" : "wrong"}">
                        <div class="hechizo-result-name">
                          ${item.correct ? "✅" : "❌"} ${escapeHTML(name)}
                        </div>

                        <div class="hechizo-result-meta">
                          <span class="hechizo-chip">
                            ${escapeHTML(item.answer || "Sin respuesta")}
                          </span>

                          <span class="hechizo-chip">
                            ${Number(item.points || 0)} pts
                          </span>

                          ${
                            item.elapsed_seconds !== undefined
                              ? `<span class="hechizo-chip">${escapeHTML(
                                  item.elapsed_seconds
                                )}s</span>`
                              : ""
                          }

                          ${labels
                            .map(
                              (label) => `
                                <span class="hechizo-chip">
                                  ${escapeHTML(label)}
                                </span>
                              `
                            )
                            .join("")}
                        </div>
                      </div>
                    `;
                  })
                  .join("")
              : '<div class="hechizo-result-card">Sin respuestas registradas.</div>'
          }
        </div>

        <div class="trivia-side-card" style="margin-top:16px">
          <h3 class="trivia-side-title">Marcador de casas</h3>

          <div class="trivia-house-score">
            ${
              typeof renderHouseScoreboard === "function"
                ? renderHouseScoreboard(players)
                : ""
            }
          </div>
        </div>
      </section>
    `;
  }

  function renderResultsStable(data) {
    showScreenSafe("view-game");

    const container = document.getElementById("game-container");
    if (!container) return false;

    const state = data.game_state || {};
    const key = resultsKey(state);
    const current = container.querySelector(".hechizo-results-wrap");

    if (current && lastResultsRoundKey === key) {
      return true;
    }

    lastResultsRoundKey = key;
    container.innerHTML = renderResultsHTML(data);
    playSound("reveal");

    return true;
  }

  function renderMobileResultsWait(state) {
    clearMobilePanel();
    showScreenSafe("view-wait");

    setText("wait-pill", isHost() ? "👑 Host · Hechizo Incompleto" : "🏆 Hechizo Incompleto");
    setText("wait-msg", "¡Mira la TV!");
    setText("wait-subtitle", "La respuesta correcta acaba de revelarse en el pergamino.");

    const feedback = document.getElementById("points-feedback");

    if (feedback && !feedback.innerText) {
      feedback.className = "points-feedback";
      feedback.innerText = "";
    }

    showHostPanelsSafe(isHost());

    try {
      hasAnsweredCurrentRound = false;
    } catch (error) {}

    localAnswered = false;

    return true;
  }

  function installBridge() {
    let installed = false;

    if (typeof window.renderPlaying === "function" && !window.renderPlaying.__hechizoStableWrapped) {
      const original = window.renderPlaying;

      window.renderPlaying = function (data) {
        if (phaseOf(data) === "hechizo_incompleto") {
          return renderTvStable(data);
        }

        return original.apply(this, arguments);
      };

      window.renderPlaying.__hechizoStableWrapped = true;
      installed = true;
    }

    if (typeof window.renderResults === "function" && !window.renderResults.__hechizoStableWrapped) {
      const original = window.renderResults;

      window.renderResults = function (data) {
        if (phaseOf(data) === "results_hechizo_incompleto") {
          return renderResultsStable(data);
        }

        return original.apply(this, arguments);
      };

      window.renderResults.__hechizoStableWrapped = true;
      installed = true;
    }

    if (
      typeof window.renderMobileGame === "function" &&
      !window.renderMobileGame.__hechizoStableWrapped
    ) {
      const original = window.renderMobileGame;

      window.renderMobileGame = function (state) {
        if (phaseOf(state) === "hechizo_incompleto") {
          return renderMobileStable(state);
        }

        return original.apply(this, arguments);
      };

      window.renderMobileGame.__hechizoStableWrapped = true;
      installed = true;
    }

    if (
      typeof window.renderResultsWait === "function" &&
      !window.renderResultsWait.__hechizoStableWrapped
    ) {
      const original = window.renderResultsWait;

      window.renderResultsWait = function (state) {
        if (phaseOf(state) === "results_hechizo_incompleto") {
          return renderMobileResultsWait(state);
        }

        return original.apply(this, arguments);
      };

      window.renderResultsWait.__hechizoStableWrapped = true;
      installed = true;
    }

    if (
      typeof window.renderAnsweredWait === "function" &&
      !window.renderAnsweredWait.__hechizoNewRoundFix
    ) {
      const original = window.renderAnsweredWait;

      window.renderAnsweredWait = function (state) {
        const cleanState = getStateFromData(state);

        if (phaseOf(cleanState) === "hechizo_incompleto") {
          const key = roundKey(cleanState);

          if (key && key !== localRoundKey) {
            forceResetAnsweredForNewRound(cleanState);

            if (typeof window.renderMobileGame === "function") {
              return window.renderMobileGame(cleanState);
            }

            return renderMobileStable(cleanState);
          }
        }

        return original.apply(this, arguments);
      };

      window.renderAnsweredWait.__hechizoNewRoundFix = true;
      installed = true;
    }

    return installed;
  }

  window.HechizoIncompleto = {
    renderTv: renderTvStable,
    renderMobile: renderMobileStable,
    renderResults: renderResultsStable,
    getPhaseInfo,
  };

  window.enviarHechizoRespuesta = enviarHechizoRespuesta;

  document.addEventListener("DOMContentLoaded", () => {
    const bridgeTimer = setInterval(() => {
      const installed = installBridge();
      if (installed) {
        clearInterval(bridgeTimer);
      }
    }, 250);

    setTimeout(() => clearInterval(bridgeTimer), 10000);
  });
})();
