(function () {
  const answerLetters = ["A", "B", "C", "D"];

  const stateMemory = {
    roundKey: "",
    renderedKey: "",
    startedMs: Date.now(),
    answered: false,
    sending: false,
    lastTick: null,
  };

  function injectStyles() {
    if (document.getElementById("trivia-mobile-fix-styles")) return;

    const style = document.createElement("style");
    style.id = "trivia-mobile-fix-styles";
    style.textContent = `
      .trivia-mobile-panel {
        display: none;
        width: 100%;
        margin-top: 16px;
      }

      .trivia-mobile-panel.visible {
        display: block;
      }

      .trivia-mobile-card {
        position: relative;
        overflow: hidden;
        padding: 16px;
        border-radius: 24px;
        background:
          radial-gradient(circle at 18% 0%, rgba(255,216,121,.18), transparent 36%),
          radial-gradient(circle at 88% 20%, rgba(96,165,250,.16), transparent 34%),
          rgba(255,255,255,.07);
        border: 1px solid rgba(255,255,255,.13);
        box-shadow:
          0 18px 42px rgba(0,0,0,.28),
          inset 0 0 0 1px rgba(255,255,255,.04);
      }

      .trivia-mobile-card::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px),
          linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px);
        background-size: 38px 38px;
        opacity: .35;
        pointer-events: none;
      }

      .trivia-mobile-content {
        position: relative;
        z-index: 2;
      }

      .trivia-mobile-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 12px;
      }

      .trivia-mobile-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 10px;
        border-radius: 999px;
        color: #ffe7a3;
        font-size: .74rem;
        font-weight: 1000;
        letter-spacing: .08em;
        text-transform: uppercase;
        background: rgba(255,216,121,.12);
        border: 1px solid rgba(255,216,121,.24);
      }

      .trivia-mobile-pill.blue {
        color: #d8ecff;
        background: rgba(96,165,250,.13);
        border-color: rgba(125,211,252,.26);
      }

      .trivia-mobile-question {
        margin: 0 0 14px;
        color: #fff;
        font-size: clamp(1.42rem, 7vw, 2rem);
        line-height: 1.04;
        letter-spacing: -.05em;
        font-weight: 1000;
        text-wrap: balance;
      }

      .trivia-mobile-options {
        display: grid;
        gap: 10px;
      }

      .trivia-answer-btn {
        position: relative;
        overflow: hidden;
        width: 100%;
        min-height: 76px;
        display: grid;
        grid-template-columns: 54px 1fr;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border: 1px solid rgba(255,255,255,.13);
        border-radius: 22px;
        color: white;
        text-align: left;
        background:
          radial-gradient(circle at 20% 0%, rgba(255,216,121,.10), transparent 38%),
          rgba(255,255,255,.08);
        box-shadow: 0 12px 28px rgba(0,0,0,.18);
        transition: transform .12s ease, filter .12s ease, opacity .12s ease;
      }

      .trivia-answer-btn::after {
        content: "";
        position: absolute;
        inset: -80%;
        background: linear-gradient(115deg, transparent 42%, rgba(255,255,255,.16), transparent 58%);
        transform: translateX(-72%);
        animation: triviaMobileShine 2.8s ease-in-out infinite;
        opacity: .78;
        pointer-events: none;
      }

      @keyframes triviaMobileShine {
        0%, 55% { transform: translateX(-72%); }
        100% { transform: translateX(72%); }
      }

      .trivia-answer-btn:active {
        transform: scale(.975);
        filter: brightness(1.12);
      }

      .trivia-answer-btn:disabled {
        opacity: .58;
        filter: grayscale(.15);
      }

      .trivia-answer-letter {
        position: relative;
        z-index: 2;
        width: 46px;
        height: 46px;
        display: grid;
        place-items: center;
        border-radius: 15px;
        color: #2a1700;
        background: linear-gradient(135deg, #fff8d6, #facc15);
        box-shadow:
          0 0 24px rgba(250,204,21,.22),
          inset 0 0 0 1px rgba(255,255,255,.42);
        font-size: 1.25rem;
        font-weight: 1000;
      }

      .trivia-answer-text {
        position: relative;
        z-index: 2;
        color: rgba(255,255,255,.94);
        font-size: 1rem;
        line-height: 1.1;
        font-weight: 900;
      }

      .trivia-mobile-feedback {
        margin-top: 13px;
        min-height: 58px;
        display: grid;
        place-items: center;
        padding: 13px 14px;
        border-radius: 18px;
        text-align: center;
        color: rgba(255,248,221,.90);
        background: rgba(255,255,255,.07);
        border: 1px solid rgba(255,255,255,.12);
        font-weight: 900;
        line-height: 1.18;
      }

      .trivia-mobile-feedback.good {
        color: #bbf7d0;
        background: rgba(34,197,94,.15);
        border-color: rgba(74,222,128,.34);
      }

      .trivia-mobile-feedback.bad {
        color: #fecaca;
        background: rgba(239,68,68,.14);
        border-color: rgba(248,113,113,.30);
      }

      .trivia-mobile-feedback.neutral {
        color: #dbeafe;
        background: rgba(59,130,246,.13);
        border-color: rgba(147,197,253,.28);
      }

      .trivia-mobile-note {
        margin-top: 10px;
        color: rgba(255,248,221,.62);
        font-size: .88rem;
        text-align: center;
        line-height: 1.3;
      }
    `;

    document.head.appendChild(style);
  }

  function readRoom() {
    try {
      if (typeof myRoom !== "undefined" && myRoom) return myRoom;
    } catch (error) {}

    return (
      localStorage.getItem("jackbox_magico_room") ||
      new URLSearchParams(window.location.search).get("room") ||
      document.getElementById("m-room")?.value ||
      ""
    ).toUpperCase().trim();
  }

  function readName() {
    try {
      if (typeof myName !== "undefined" && myName) return myName;
    } catch (error) {}

    return (
      localStorage.getItem("jackbox_magico_name") ||
      document.getElementById("m-name")?.value ||
      ""
    ).trim();
  }

  function readIsHost() {
    try {
      if (typeof myIsHost !== "undefined") return Boolean(myIsHost);
    } catch (error) {}

    return false;
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getQuestion(state) {
    return state.question || state.attack_msg || "¡Responde!";
  }

  function getRoundKey(state) {
    return `${state.phase}-${state.round_id || state.round_number || getQuestion(state)}`;
  }

  function play(name) {
    try {
      if (window.MagicSound && typeof window.MagicSound.play === "function") {
        window.MagicSound.play(name);
      }
    } catch (error) {}
  }

  function vibrate(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (error) {}
  }

  function show(id) {
    if (typeof window.showScreen === "function") {
      window.showScreen(id);
      return;
    }

    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("visible");
    });

    document.getElementById(id)?.classList.add("visible");
  }

  function showHostPanelsLocal(showPanel) {
    if (typeof window.showHostPanels === "function") {
      window.showHostPanels(showPanel);
      return;
    }

    document.getElementById("host-panel")?.classList.toggle("visible", showPanel);
    document.getElementById("host-game-panel")?.classList.toggle("visible", showPanel);
  }

  function ensurePanel() {
    let panel = document.getElementById("trivia-mobile-panel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "trivia-mobile-panel";
      panel.className = "trivia-mobile-panel";

      const hostGamePanel = document.getElementById("host-game-panel");
      const card = document.querySelector("#view-game .card");

      if (hostGamePanel && hostGamePanel.parentElement) {
        hostGamePanel.parentElement.insertBefore(panel, hostGamePanel);
      } else if (card) {
        card.appendChild(panel);
      } else {
        document.body.appendChild(panel);
      }
    }

    return panel;
  }

  function hideNonTriviaPanels() {
    const ids = [
      "duel-mobile-panel",
      "sombrero-mobile-panel",
      "pociones-mobile-panel",
      "snitch-mobile-panel",
    ];

    ids.forEach((id) => {
      const panel = document.getElementById(id);
      if (panel) {
        panel.classList.remove("visible");
        panel.innerHTML = "";
      }
    });

    const genericButtons = document.getElementById("m-botones");
    if (genericButtons) genericButtons.innerHTML = "";
  }

  function setHeader(state) {
    const pill = document.getElementById("game-pill");
    const title = document.getElementById("m-pregunta-aviso");
    const subtitle = document.getElementById("m-question-small");
    const status = document.getElementById("mobile-status");

    if (pill) pill.innerText = "🏰 Trivia";
    if (title) title.innerText = "Trivia del Mundo Mágico";
    if (subtitle) subtitle.innerText = "Elige A, B, C o D. La velocidad también cuenta.";
    if (status && !stateMemory.answered) {
      status.innerText = "Correcta por dificultad · rápida +40 · racha de 3 +100";
    }

    const timer = document.getElementById("mobile-timer");
    if (timer) timer.style.display = "block";
  }

  function renderAnsweredScreen(data = null) {
    show("view-wait");

    const waitPill = document.getElementById("wait-pill");
    const waitMsg = document.getElementById("wait-msg");
    const waitSubtitle = document.getElementById("wait-subtitle");
    const feedback = document.getElementById("points-feedback");

    if (waitPill) waitPill.innerText = readIsHost() ? "👑 Host" : "📨 Enviada";
    if (waitMsg) waitMsg.innerText = data?.correct ? "✅ ¡Respuesta enviada!" : "📨 Respuesta enviada";
    if (waitSubtitle) {
      waitSubtitle.innerText = readIsHost()
        ? "Puedes revelar resultados desde aquí."
        : "Mira la TV para ver el resultado.";
    }

    if (feedback && data) {
      feedback.className = `points-feedback ${data.correct ? "good" : "bad"}`;
      feedback.innerText = `${data.points > 0 ? "+" : ""}${data.points || 0} pts · ${data.message || "Respuesta registrada."}`;
    }

    showHostPanelsLocal(readIsHost());
  }

  function renderTriviaPanel(state) {
    const panel = ensurePanel();

    panel.classList.add("visible");

    const options = state.options || [];
    const category = state.category || state.question_payload?.categoria || "Mundo mágico";
    const difficulty = state.difficulty || state.question_payload?.dificultad || "media";
    const basePoints = Number(state.points_correct || state.question_payload?.puntosBase || 100);

    panel.innerHTML = `
      <div class="trivia-mobile-card">
        <div class="trivia-mobile-content">
          <div class="trivia-mobile-pills">
            <span class="trivia-mobile-pill blue">📜 ${escapeHTML(category)}</span>
            <span class="trivia-mobile-pill">⚡ ${escapeHTML(difficulty)} · +${basePoints}</span>
          </div>

          <h2 class="trivia-mobile-question">${escapeHTML(getQuestion(state))}</h2>

          <div class="trivia-mobile-options" id="trivia-fix-options">
            ${options.map((option, index) => `
              <button class="trivia-answer-btn" data-index="${index}" data-label="${answerLetters[index] || "?"}">
                <span class="trivia-answer-letter">${answerLetters[index] || "?"}</span>
                <span class="trivia-answer-text">${escapeHTML(option)}</span>
              </button>
            `).join("")}
          </div>

          <div id="trivia-mobile-feedback" class="trivia-mobile-feedback neutral">
            Esperando tu respuesta...
          </div>

          <div class="trivia-mobile-note">
            Mira la TV para el temporizador. Contesta rápido, pero no a lo loco.
          </div>
        </div>
      </div>
    `;

    panel.querySelectorAll(".trivia-answer-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.index);
        const label = button.dataset.label;
        const answer = options[index];

        sendTriviaAnswer({
          answer,
          answerIndex: index,
          answerLabel: label,
          button,
        });
      });
    });
  }

  function updateTimer(state) {
    const timer = document.getElementById("mobile-timer");
    const bar = document.getElementById("mobile-timer-bar");
    const status = document.getElementById("mobile-status");

    if (!bar || state.phase !== "trivia") return;

    if (timer) timer.style.display = "block";

    const duration = Number(state.duration_seconds || 10);
    const started = state.started_at ? Number(state.started_at) * 1000 : stateMemory.startedMs;
    const elapsed = Math.max(0, Date.now() - started) / 1000;
    const left = Math.max(0, duration - elapsed);
    const pct = duration > 0 ? Math.max(0, Math.min(1, left / duration)) : 0;

    bar.style.transform = `scaleX(${pct})`;

    if (status && !stateMemory.answered && !stateMemory.sending) {
      status.innerText = `Tiempo restante: ${left.toFixed(1)}s`;
    }

    const rounded = Math.ceil(left);

    if (rounded <= 3 && rounded > 0 && rounded !== stateMemory.lastTick) {
      stateMemory.lastTick = rounded;
      play("timer-danger");
      vibrate(35);
    }
  }

  async function sendTriviaAnswer({ answer, answerIndex, answerLabel, button }) {
    if (stateMemory.sending || stateMemory.answered) return;

    const room = readRoom();
    const player = readName();

    if (!room || !player) {
      alert("No se detectó sala o jugador. Recarga y entra de nuevo.");
      return;
    }

    stateMemory.sending = true;

    const feedback = document.getElementById("trivia-mobile-feedback");
    const status = document.getElementById("mobile-status");

    document.querySelectorAll(".trivia-answer-btn").forEach((btn) => {
      btn.disabled = true;
      if (btn !== button) btn.style.opacity = ".52";
    });

    if (button) {
      button.style.filter = "brightness(1.25)";
      button.style.transform = "scale(.98)";
    }

    if (feedback) {
      feedback.className = "trivia-mobile-feedback neutral";
      feedback.textContent = "Enviando respuesta al Gran Comedor...";
    }

    if (status) status.innerText = "Enviando respuesta...";

    play("send");
    vibrate(25);

    const elapsedMs = Math.max(0, Date.now() - stateMemory.startedMs);

    try {
      const res = await fetch("/api/player/trivia_answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          room_code: room,
          player_name: player,
          answer,
          answer_index: answerIndex,
          answer_label: answerLabel,
          client_elapsed_ms: elapsedMs,
        }),
      });

      const data = await res.json();

      console.log("TRIVIA FIX RESPONSE:", data);

      if (!res.ok || data.accepted === false) {
        stateMemory.sending = false;
        stateMemory.answered = false;

        document.querySelectorAll(".trivia-answer-btn").forEach((btn) => {
          btn.disabled = false;
          btn.style.opacity = "1";
        });

        if (feedback) {
          feedback.className = "trivia-mobile-feedback bad";
          feedback.innerHTML = `
            No se aceptó la respuesta.<br>
            <small>${escapeHTML(data?.detail?.error || data?.detail?.mensaje || data?.detail || data?.message || "Revisa si la trivia sigue activa.")}</small>
          `;
        }

        if (status) {
          status.innerText = data?.detail?.phase_actual
            ? `No aceptada. Fase actual: ${data.detail.phase_actual}`
            : "No se aceptó la respuesta.";
        }

        play("wrong");
        vibrate([80, 50, 80]);
        return;
      }

      stateMemory.sending = false;
      stateMemory.answered = true;

      if (feedback) {
        feedback.className = `trivia-mobile-feedback ${data.correct ? "good" : "bad"}`;
        feedback.innerHTML = `
          ${data.correct ? "✅" : "❌"} ${escapeHTML(data.message || "Respuesta enviada.")}<br>
          <small>${data.points > 0 ? "+" : ""}${data.points || 0} pts${data.elapsed_seconds ? ` · ${Number(data.elapsed_seconds).toFixed(2)}s` : ""}</small>
        `;
      }

      play(data.correct ? "correct" : "wrong");
      vibrate(data.correct ? [35, 40, 35] : [80, 50, 80]);

      setTimeout(() => {
        renderAnsweredScreen(data);
      }, 450);
    } catch (error) {
      console.error("TRIVIA FIX ERROR:", error);

      stateMemory.sending = false;
      stateMemory.answered = false;

      document.querySelectorAll(".trivia-answer-btn").forEach((btn) => {
        btn.disabled = false;
        btn.style.opacity = "1";
      });

      if (feedback) {
        feedback.className = "trivia-mobile-feedback bad";
        feedback.textContent = "Error de conexión al enviar respuesta.";
      }

      if (status) status.innerText = "Error de conexión.";

      play("wrong");
      vibrate([80, 50, 80]);
    }
  }

  window.renderTriviaMobile = function renderTriviaMobileFixed(state) {
    show("view-game");
    showHostPanelsLocal(readIsHost());
    hideNonTriviaPanels();
    setHeader(state);

    const key = getRoundKey(state);
    const answered = state.answered || {};
    const alreadyAnswered = Boolean(answered[readName()]);

    if (key !== stateMemory.roundKey) {
      stateMemory.roundKey = key;
      stateMemory.renderedKey = "";
      stateMemory.startedMs = state.started_at ? Number(state.started_at) * 1000 : Date.now();
      stateMemory.answered = false;
      stateMemory.sending = false;
      stateMemory.lastTick = null;

      play("start");
      vibrate([25, 40, 25]);
    }

    if (alreadyAnswered || stateMemory.answered) {
      renderAnsweredScreen();
      return;
    }

    if (stateMemory.renderedKey !== key) {
      stateMemory.renderedKey = key;
      renderTriviaPanel(state);
    }

    updateTimer(state);
  };

  window.updateMobileTriviaTimer = function updateMobileTriviaTimerFixed(state) {
    updateTimer(state);
  };

  injectStyles();

  console.log("Trivia mobile fix cargado correctamente.");
})();