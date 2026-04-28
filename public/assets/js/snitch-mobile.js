(() => {
  const roomCode =
    new URLSearchParams(window.location.search).get("room") ||
    localStorage.getItem("room_code") ||
    localStorage.getItem("jackbox_room_code") ||
    "";

  const playerName =
    new URLSearchParams(window.location.search).get("player") ||
    localStorage.getItem("player_name") ||
    localStorage.getItem("jackbox_player_name") ||
    "";

  if (!roomCode || !playerName) {
    console.warn("Snitch Mobile: faltan roomCode o playerName");
    return;
  }

  const POLL_MS = 500;
  let gameState = null;
  let currentStatus = null;
  let sending = false;
  let mounted = false;
  let rafId = null;
  let audioCtx = null;
  let localAttemptsUsed = 0;
  let lastFeedbackAt = 0;

  function injectStyles() {
    if (document.getElementById("snitch-mobile-styles")) return;

    const style = document.createElement("style");
    style.id = "snitch-mobile-styles";
    style.textContent = `
      #snitch-mobile-root {
        min-height: 100vh;
        background:
          radial-gradient(circle at 20% 20%, rgba(42, 78, 185, 0.22), transparent 30%),
          radial-gradient(circle at 80% 14%, rgba(255, 200, 90, 0.12), transparent 25%),
          linear-gradient(180deg, #081221 0%, #09182b 100%);
        color: #fff;
        font-family: Inter, Arial, sans-serif;
        padding: 18px 16px 22px;
        box-sizing: border-box;
      }

      #snitch-mobile-root .sm-card {
        background: rgba(12, 18, 34, 0.72);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px;
        padding: 16px;
        backdrop-filter: blur(12px);
        box-shadow: 0 14px 30px rgba(0,0,0,0.22);
      }

      #snitch-mobile-root .sm-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 14px;
      }

      #snitch-mobile-root .sm-title {
        font-size: 24px;
        font-weight: 1000;
        color: #ffe496;
        margin: 0;
      }

      #snitch-mobile-root .sm-subtitle {
        margin: 6px 0 0;
        font-size: 13px;
        color: rgba(255,255,255,0.78);
      }

      #snitch-mobile-root .sm-timer-wrap {
        display: flex;
        gap: 10px;
        margin-top: 14px;
      }

      #snitch-mobile-root .sm-pill {
        flex: 1;
        background: rgba(255,255,255,0.04);
        border-radius: 16px;
        padding: 12px;
        text-align: center;
      }

      #snitch-mobile-root .sm-pill-label {
        font-size: 11px;
        color: rgba(255,255,255,0.62);
        text-transform: uppercase;
        letter-spacing: 1.1px;
        margin-bottom: 6px;
      }

      #snitch-mobile-root .sm-pill-value {
        font-size: 26px;
        font-weight: 1000;
      }

      #snitch-mobile-root .sm-progress {
        height: 12px;
        background: rgba(255,255,255,0.08);
        border-radius: 999px;
        overflow: hidden;
        margin-top: 14px;
      }

      #snitch-mobile-root .sm-progress-bar {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #77dfff, #ffe38d);
        transition: width 140ms linear;
      }

      #snitch-mobile-root .sm-catch-zone {
        margin-top: 16px;
        position: relative;
        overflow: hidden;
        border-radius: 22px;
        padding: 18px;
        background:
          radial-gradient(circle at 50% 50%, rgba(255, 216, 109, 0.10), transparent 48%),
          linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02));
        border: 1px solid rgba(255,255,255,0.07);
      }

      #snitch-mobile-root .sm-pulse {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 180px;
        height: 180px;
        border-radius: 999px;
        transform: translate(-50%, -50%);
        background: radial-gradient(circle, rgba(255, 222, 129, 0.18), rgba(255, 222, 129, 0));
        filter: blur(4px);
        animation: snitchMobilePulse 1.8s ease-in-out infinite;
        pointer-events: none;
      }

      @keyframes snitchMobilePulse {
        0%,100% { transform: translate(-50%, -50%) scale(0.92); opacity: 0.55; }
        50% { transform: translate(-50%, -50%) scale(1.12); opacity: 1; }
      }

      #snitch-mobile-root .sm-button {
        position: relative;
        z-index: 2;
        width: 100%;
        min-height: 170px;
        border: none;
        border-radius: 24px;
        cursor: pointer;
        font-size: 38px;
        font-weight: 1000;
        letter-spacing: 1px;
        color: #081221;
        background:
          radial-gradient(circle at 50% 30%, rgba(255,255,255,0.72), rgba(255,255,255,0.18)),
          linear-gradient(180deg, #ffe89f 0%, #ffd563 52%, #f1bb30 100%);
        box-shadow:
          0 20px 32px rgba(0,0,0,0.20),
          inset 0 8px 16px rgba(255,255,255,0.35),
          inset 0 -10px 14px rgba(126, 79, 0, 0.10);
        transition: transform 120ms ease, filter 120ms ease, opacity 120ms ease;
      }

      #snitch-mobile-root .sm-button:active {
        transform: scale(0.98);
      }

      #snitch-mobile-root .sm-button[disabled] {
        opacity: 0.65;
        filter: grayscale(0.14);
        cursor: not-allowed;
      }

      #snitch-mobile-root .sm-button .big {
        display: block;
        font-size: 42px;
        line-height: 1;
      }

      #snitch-mobile-root .sm-button .small {
        display: block;
        margin-top: 8px;
        font-size: 13px;
        letter-spacing: 1.4px;
        text-transform: uppercase;
      }

      #snitch-mobile-root .sm-feedback {
        margin-top: 14px;
        min-height: 66px;
        border-radius: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 14px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.06);
        font-weight: 900;
        font-size: 18px;
        color: #fff;
        transition: transform 150ms ease, background 150ms ease, border-color 150ms ease;
      }

      #snitch-mobile-root .sm-feedback.perfect { background: rgba(74, 194, 129, 0.16); border-color: rgba(74, 194, 129, 0.35); color: #9dffd0; }
      #snitch-mobile-root .sm-feedback.great { background: rgba(79, 197, 234, 0.16); border-color: rgba(79, 197, 234, 0.35); color: #a9efff; }
      #snitch-mobile-root .sm-feedback.good { background: rgba(255, 212, 99, 0.16); border-color: rgba(255, 212, 99, 0.35); color: #ffe79a; }
      #snitch-mobile-root .sm-feedback.close { background: rgba(255, 154, 88, 0.15); border-color: rgba(255, 154, 88, 0.35); color: #ffc9a1; }
      #snitch-mobile-root .sm-feedback.miss { background: rgba(255, 90, 90, 0.15); border-color: rgba(255, 90, 90, 0.30); color: #ffb0b0; }

      #snitch-mobile-root .sm-history {
        margin-top: 16px;
        display: grid;
        gap: 10px;
      }

      #snitch-mobile-root .sm-history-item {
        padding: 12px 14px;
        border-radius: 16px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.06);
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: center;
      }

      #snitch-mobile-root .sm-history-left {
        font-size: 13px;
        color: rgba(255,255,255,0.82);
      }

      #snitch-mobile-root .sm-history-right {
        font-size: 18px;
        font-weight: 1000;
        color: #ffe496;
      }

      #snitch-mobile-root .sm-state-note {
        margin-top: 14px;
        font-size: 13px;
        color: rgba(255,255,255,0.72);
        text-align: center;
      }

      #snitch-mobile-root .sm-results {
        margin-top: 16px;
      }

      #snitch-mobile-root .sm-results-card {
        padding: 16px;
        border-radius: 18px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.07);
      }

      #snitch-mobile-root .sm-results-title {
        font-size: 18px;
        font-weight: 1000;
        color: #ffe496;
        margin-bottom: 10px;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureRoot() {
    let root = document.getElementById("snitch-mobile-root");
    if (root) return root;

    root = document.createElement("div");
    root.id = "snitch-mobile-root";
    root.innerHTML = `
      <div class="sm-card">
        <div class="sm-top">
          <div>
            <h1 class="sm-title">Atrapa la Snitch</h1>
            <p class="sm-subtitle">Espera a que la Snitch entre al aro encantado en la TV y presiona a tiempo.</p>
          </div>
        </div>

        <div class="sm-timer-wrap">
          <div class="sm-pill">
            <div class="sm-pill-label">Jugador</div>
            <div class="sm-pill-value" style="font-size:18px;" id="sm-player-name">${playerName}</div>
          </div>
          <div class="sm-pill">
            <div class="sm-pill-label">Tiempo</div>
            <div class="sm-pill-value" id="sm-timer">18.0</div>
          </div>
          <div class="sm-pill">
            <div class="sm-pill-label">Intentos</div>
            <div class="sm-pill-value" id="sm-attempts">0/5</div>
          </div>
        </div>

        <div class="sm-progress">
          <div class="sm-progress-bar" id="sm-progress-bar"></div>
        </div>

        <div class="sm-catch-zone">
          <div class="sm-pulse"></div>
          <button class="sm-button" id="sm-catch-button">
            <span class="big">¡ATRAPAR!</span>
            <span class="small">Toca en el momento exacto</span>
          </button>
        </div>

        <div class="sm-feedback" id="sm-feedback">Esperando la ronda…</div>
        <div class="sm-state-note" id="sm-state-note">Concentra la vista en la TV. La Snitch ahora cambia de dirección y velocidad.</div>

        <div class="sm-history" id="sm-history"></div>
        <div class="sm-results" id="sm-results"></div>
      </div>
    `;

    document.body.innerHTML = "";
    document.body.appendChild(root);
    return root;
  }

  function ensureAudio() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (err) {}
    }
    return audioCtx;
  }

  function playTapSound() {
    const ctx = ensureAudio();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(610, now + 0.08);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  function playSuccessSound(level) {
    const ctx = ensureAudio();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    const frequencies = level === "perfect"
      ? [660, 880, 1180]
      : level === "great"
      ? [620, 820]
      : level === "good"
      ? [520, 690]
      : [430, 560];

    frequencies.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + index * 0.03);
      osc.connect(gain);
      osc.start(now + index * 0.03);
      osc.stop(now + 0.18 + index * 0.03);
    });

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
  }

  function playMissSound() {
    const ctx = ensureAudio();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.18);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.04, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.20);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.20);
  }

  function setFeedback(text, type = "") {
    const el = document.getElementById("sm-feedback");
    if (!el) return;

    el.className = "sm-feedback";
    if (type) el.classList.add(type);
    el.textContent = text || "";
    el.style.transform = "scale(1.03)";
    setTimeout(() => {
      el.style.transform = "scale(1)";
    }, 120);
  }

  function appendHistory(item) {
    const history = document.getElementById("sm-history");
    if (!history) return;

    const div = document.createElement("div");
    div.className = "sm-history-item";
    div.innerHTML = `
      <div class="sm-history-left">${item.label || "Intento"}</div>
      <div class="sm-history-right">${item.points || 0}</div>
    `;
    history.prepend(div);

    while (history.children.length > 5) {
      history.removeChild(history.lastChild);
    }
  }

  function renderStatus() {
    if (!gameState) return;

    const attemptsTotal = gameState.attempts_total || 5;
    const attemptsEl = document.getElementById("sm-attempts");
    const timerEl = document.getElementById("sm-timer");
    const progressBar = document.getElementById("sm-progress-bar");
    const button = document.getElementById("sm-catch-button");
    const note = document.getElementById("sm-state-note");
    const results = document.getElementById("sm-results");

    const phase = gameState.phase;
    const startedAt = Date.parse(gameState.started_at || new Date().toISOString());
    const now = Date.now();
    const elapsed = now - startedAt;
    const durationMs = (gameState.duration_seconds || 18) * 1000;
    const remainingMs = Math.max(0, durationMs - Math.max(0, elapsed));

    const remoteAttempts = Array.isArray(gameState?.attempts_by_player?.[playerName])
      ? gameState.attempts_by_player[playerName].length
      : localAttemptsUsed;

    if (attemptsEl) attemptsEl.textContent = `${remoteAttempts}/${attemptsTotal}`;
    if (timerEl) timerEl.textContent = (remainingMs / 1000).toFixed(1);
    if (progressBar) {
      const progress = Math.max(0, Math.min(100, (Math.max(0, elapsed) / durationMs) * 100));
      progressBar.style.width = `${progress}%`;
    }

    if (phase === "atrapa_snitch") {
      results.innerHTML = "";

      if (elapsed < 0) {
        button.disabled = true;
        setFeedback(`Prepárate… ${Math.max(1, Math.ceil(Math.abs(elapsed) / 1000))}`, "");
        note.textContent = "La ronda está por comenzar. Mira la TV y espera el inicio.";
      } else if (remainingMs <= 0) {
        button.disabled = true;
        setFeedback("La ronda terminó. Espera resultados.", "");
        note.textContent = "Ya no se aceptan intentos. Espera a que el host revele resultados.";
      } else if (remoteAttempts >= attemptsTotal || sending) {
        button.disabled = true;
        note.textContent = remoteAttempts >= attemptsTotal
          ? "Ya agotaste tus intentos."
          : "Enviando intento…";
      } else {
        button.disabled = false;
        if (Date.now() - lastFeedbackAt > 1400) {
          setFeedback("¡Listo para atrapar!", "");
        }
        note.textContent = "Ahora la Snitch cambia de velocidad y dirección. Calcula con cuidado.";
      }
    }

    if (phase === "results_atrapa_snitch") {
      button.disabled = true;
      const result = gameState.snitch_result || {};
      const leaderboard = result.leaderboard || [];
      const row = leaderboard.find(item => item.player_name === playerName);
      const best = row?.best_attempt || null;

      results.innerHTML = `
        <div class="sm-results-card">
          <div class="sm-results-title">Resultados</div>
          ${
            row
              ? `
                <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-bottom:8px;">
                  Puntos obtenidos: <strong style="color:#ffe496;">${row.points_awarded || 0}</strong>
                </div>
                <div style="font-size:14px;color:rgba(255,255,255,0.78);">
                  Mejor intento: <strong>${best?.label || "Sin intento"}</strong>
                  ${best ? `• Precisión ${best.precision || 0}%` : ""}
                </div>
                ${result.winner_name ? `<div style="margin-top:8px;font-size:13px;color:#ffe496;">🏆 Mejor buscador: ${result.winner_name}</div>` : ""}
              `
              : `<div style="font-size:14px;color:rgba(255,255,255,0.78);">No encontré tu resultado todavía.</div>`
          }
        </div>
      `;

      if (Date.now() - lastFeedbackAt > 1800) {
        setFeedback("Resultados revelados", "");
      }
      note.textContent = "Espera la siguiente ronda o el regreso al lobby.";
    }
  }

  async function fetchStatus() {
    try {
      const response = await fetch(`/api/room/${encodeURIComponent(roomCode)}/status`, {
        cache: "no-store",
      });
      const data = await response.json();
      currentStatus = data;
      gameState = data.game_state || null;
      renderStatus();
    } catch (err) {
      console.error("Error al consultar estado:", err);
    }
  }

  async function submitCatch() {
    if (!gameState || gameState.phase !== "atrapa_snitch" || sending) return;

    const startedAt = Date.parse(gameState.started_at || new Date().toISOString());
    const elapsed = Date.now() - startedAt;

    if (elapsed < 0) {
      setFeedback("Todavía no inicia", "miss");
      return;
    }

    const attemptsTotal = gameState.attempts_total || 5;
    const attemptsUsed = Array.isArray(gameState?.attempts_by_player?.[playerName])
      ? gameState.attempts_by_player[playerName].length
      : localAttemptsUsed;

    if (attemptsUsed >= attemptsTotal) {
      setFeedback("Ya no tienes intentos", "miss");
      return;
    }

    sending = true;
    playTapSound();
    renderStatus();

    try {
      const response = await fetch("/api/player/snitch_catch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          room_code: roomCode,
          player_name: playerName,
          client_elapsed_ms: elapsed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFeedback(data?.detail?.error || data?.detail || "Error enviando intento", "miss");
        playMissSound();
        return;
      }

      localAttemptsUsed = data.attempts_used || attemptsUsed + 1;
      lastFeedbackAt = Date.now();

      const grade = data.grade || "miss";
      const message = `${data.label || data.message || "Intento"} • ${data.points || 0} pts`;

      setFeedback(message, grade);

      appendHistory({
        label: `${data.label || "Intento"} • ${(data.precision ?? 0)}%`,
        points: `${data.points || 0} pts`,
      });

      if (grade === "miss") {
        playMissSound();
      } else {
        playSuccessSound(grade);
      }

      await fetchStatus();
    } catch (err) {
      console.error(err);
      setFeedback("No se pudo enviar el intento", "miss");
      playMissSound();
    } finally {
      sending = false;
      renderStatus();
    }
  }

  function animate() {
    rafId = requestAnimationFrame(animate);
    if (!mounted || !gameState) return;
    renderStatus();
  }

  function startPolling() {
    fetchStatus();
    setInterval(fetchStatus, POLL_MS);
  }

  function init() {
    injectStyles();
    ensureRoot();
    mounted = true;

    const button = document.getElementById("sm-catch-button");
    if (button) {
      button.addEventListener("click", submitCatch);
    }

    startPolling();
    if (!rafId) rafId = requestAnimationFrame(animate);
  }

  init();
})();