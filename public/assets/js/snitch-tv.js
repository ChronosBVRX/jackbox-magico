(() => {
  const ROOM_CODE =
    new URLSearchParams(window.location.search).get("room") ||
    localStorage.getItem("room_code") ||
    localStorage.getItem("jackbox_room_code") ||
    "";

  if (!ROOM_CODE) {
    console.warn("Snitch TV: no se encontró room code");
    return;
  }

  const POLL_MS = 650;

  let roomState = null;
  let players = [];
  let activeRoundId = null;
  let rafId = null;
  let lastFrameTime = 0;
  let mounted = false;
  let currentPhase = null;
  let starField = [];
  let trail = [];
  let lastSnitchSegmentKey = null;
  let ambientStarted = false;
  let audioCtx = null;

  function injectStyles() {
    if (document.getElementById("snitch-tv-styles")) return;

    const style = document.createElement("style");
    style.id = "snitch-tv-styles";
    style.textContent = `
      #snitch-tv-root {
        position: relative;
        width: 100%;
        height: 100vh;
        min-height: 100vh;
        overflow: hidden;
        background:
          radial-gradient(circle at 20% 20%, rgba(54, 88, 178, 0.26), transparent 28%),
          radial-gradient(circle at 78% 24%, rgba(85, 150, 240, 0.16), transparent 24%),
          radial-gradient(circle at 50% 80%, rgba(255, 215, 110, 0.08), transparent 28%),
          linear-gradient(180deg, #06101f 0%, #07172b 52%, #06111d 100%);
        color: #fff;
        font-family: Inter, Arial, sans-serif;
      }

      #snitch-tv-root .snitch-bg-grid {
        position: absolute;
        inset: 0;
        background:
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
        background-size: 48px 48px;
        mask-image: linear-gradient(to bottom, rgba(255,255,255,0.8), rgba(255,255,255,0.2));
        opacity: 0.22;
        pointer-events: none;
      }

      #snitch-tv-root .snitch-header {
        position: absolute;
        top: 22px;
        left: 28px;
        right: 28px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        z-index: 4;
        pointer-events: none;
      }

      #snitch-tv-root .snitch-title-wrap {
        background: rgba(10, 18, 34, 0.62);
        border: 1px solid rgba(255,255,255,0.08);
        backdrop-filter: blur(14px);
        border-radius: 18px;
        padding: 16px 18px;
        box-shadow: 0 14px 40px rgba(0,0,0,0.25);
      }

      #snitch-tv-root .snitch-title {
        font-size: 34px;
        font-weight: 900;
        letter-spacing: 0.5px;
        color: #ffe7a0;
        margin: 0 0 6px;
      }

      #snitch-tv-root .snitch-subtitle {
        font-size: 15px;
        color: rgba(255,255,255,0.88);
        margin: 0;
      }

      #snitch-tv-root .snitch-hud-right {
        display: flex;
        gap: 14px;
        align-items: stretch;
      }

      #snitch-tv-root .hud-pill {
        min-width: 120px;
        background: rgba(10, 18, 34, 0.62);
        border: 1px solid rgba(255,255,255,0.08);
        backdrop-filter: blur(14px);
        border-radius: 18px;
        padding: 14px 18px;
        box-shadow: 0 14px 40px rgba(0,0,0,0.25);
      }

      #snitch-tv-root .hud-label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1.3px;
        color: rgba(255,255,255,0.65);
        margin-bottom: 6px;
      }

      #snitch-tv-root .hud-value {
        font-size: 34px;
        font-weight: 900;
        color: #ffffff;
        line-height: 1;
      }

      #snitch-tv-root .hud-value.gold {
        color: #ffe182;
      }

      #snitch-tv-root canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
      }

      #snitch-tv-root .snitch-bottom-banner {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        bottom: 28px;
        z-index: 4;
        background: rgba(10, 18, 34, 0.68);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 18px;
        padding: 14px 18px;
        min-width: 420px;
        text-align: center;
        box-shadow: 0 14px 40px rgba(0,0,0,0.25);
        backdrop-filter: blur(14px);
        pointer-events: none;
      }

      #snitch-tv-root .snitch-bottom-banner .main {
        font-size: 20px;
        font-weight: 900;
        color: #fff;
      }

      #snitch-tv-root .snitch-bottom-banner .sub {
        margin-top: 5px;
        font-size: 13px;
        color: rgba(255,255,255,0.72);
      }

      #snitch-tv-root .snitch-countdown-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 5;
        pointer-events: none;
      }

      #snitch-tv-root .countdown-card {
        width: 260px;
        height: 260px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        background:
          radial-gradient(circle at center, rgba(255, 220, 120, 0.14), rgba(255,255,255,0.02)),
          rgba(8, 18, 35, 0.64);
        border: 1px solid rgba(255,255,255,0.1);
        box-shadow:
          0 0 0 10px rgba(255, 215, 120, 0.06),
          0 0 0 26px rgba(255, 215, 120, 0.03),
          0 20px 60px rgba(0,0,0,0.35);
        backdrop-filter: blur(16px);
        flex-direction: column;
      }

      #snitch-tv-root .countdown-number {
        font-size: 92px;
        font-weight: 1000;
        line-height: 1;
        color: #ffe497;
      }

      #snitch-tv-root .countdown-text {
        margin-top: 12px;
        font-size: 14px;
        letter-spacing: 1.4px;
        text-transform: uppercase;
        color: rgba(255,255,255,0.82);
      }

      #snitch-tv-root .results-overlay {
        position: absolute;
        inset: 0;
        z-index: 6;
        display: none;
        background:
          linear-gradient(180deg, rgba(6,12,24,0.55), rgba(6,12,24,0.84)),
          radial-gradient(circle at 50% 10%, rgba(255, 220, 120, 0.12), transparent 28%);
        backdrop-filter: blur(10px);
        padding: 34px;
        box-sizing: border-box;
      }

      #snitch-tv-root .results-overlay.active {
        display: block;
      }

      #snitch-tv-root .results-title {
        font-size: 42px;
        font-weight: 1000;
        color: #ffe8a4;
        margin: 0 0 10px;
      }

      #snitch-tv-root .results-subtitle {
        margin: 0 0 22px;
        color: rgba(255,255,255,0.78);
        font-size: 15px;
      }

      #snitch-tv-root .results-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(260px, 1fr));
        gap: 16px;
      }

      #snitch-tv-root .result-card {
        background: rgba(10, 18, 34, 0.72);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px;
        padding: 18px 18px 16px;
        box-shadow: 0 14px 40px rgba(0,0,0,0.22);
      }

      #snitch-tv-root .result-top {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: center;
      }

      #snitch-tv-root .result-name {
        font-size: 21px;
        font-weight: 900;
        color: #fff;
      }

      #snitch-tv-root .result-house {
        font-size: 12px;
        color: rgba(255,255,255,0.68);
        margin-top: 3px;
        text-transform: uppercase;
        letter-spacing: 1.2px;
      }

      #snitch-tv-root .result-score {
        font-size: 32px;
        font-weight: 1000;
        color: #ffe497;
      }

      #snitch-tv-root .result-meta {
        margin-top: 12px;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      #snitch-tv-root .meta-chip {
        padding: 8px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.88);
      }

      #snitch-tv-root .winner-banner {
        margin-bottom: 18px;
        display: inline-flex;
        gap: 10px;
        align-items: center;
        padding: 12px 16px;
        border-radius: 999px;
        background: rgba(255, 221, 130, 0.12);
        border: 1px solid rgba(255, 221, 130, 0.28);
        color: #ffe7a4;
        font-weight: 900;
        font-size: 15px;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureRoot() {
    let root = document.getElementById("snitch-tv-root");
    if (root) return root;

    root = document.createElement("div");
    root.id = "snitch-tv-root";
    root.innerHTML = `
      <div class="snitch-bg-grid"></div>

      <div class="snitch-header">
        <div class="snitch-title-wrap">
          <h1 class="snitch-title">Atrapa la Snitch Dorada</h1>
          <p class="snitch-subtitle">Atrápala dentro del aro encantado antes que se te escape.</p>
        </div>

        <div class="snitch-hud-right">
          <div class="hud-pill">
            <div class="hud-label">Tiempo</div>
            <div class="hud-value" id="snitch-timer">18.0</div>
          </div>
          <div class="hud-pill">
            <div class="hud-label">Ronda</div>
            <div class="hud-value gold" id="snitch-round">1</div>
          </div>
        </div>
      </div>

      <canvas id="snitch-tv-canvas"></canvas>

      <div class="snitch-countdown-overlay" id="snitch-countdown-overlay" style="display:none;">
        <div class="countdown-card">
          <div class="countdown-number" id="snitch-countdown-number">3</div>
          <div class="countdown-text">La snitch aparecerá…</div>
        </div>
      </div>

      <div class="snitch-bottom-banner" id="snitch-bottom-banner">
        <div class="main" id="snitch-banner-main">Observa la Snitch y el aro encantado.</div>
        <div class="sub" id="snitch-banner-sub">Cuando coincidan, los jugadores deben presionar “ATRAPAR” en su celular.</div>
      </div>

      <div class="results-overlay" id="snitch-results"></div>
    `;
    document.body.innerHTML = "";
    document.body.appendChild(root);
    return root;
  }

  function easeValue(name, t) {
    t = Math.max(0, Math.min(1, t));

    if (name === "easeOutQuad") return 1 - (1 - t) * (1 - t);
    if (name === "easeInOutQuad") return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    if (name === "easeOutCubic") return 1 - Math.pow(1 - t, 3);
    if (name === "easeInOutCubic") return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  function getSegmentForTime(segments, elapsedMs) {
    if (!segments || !segments.length) return null;
    if (elapsedMs <= 0) return segments[0];

    const last = segments[segments.length - 1];
    if (elapsedMs >= last.t1) return last;

    for (const segment of segments) {
      if (elapsedMs >= segment.t0 && elapsedMs <= segment.t1) {
        return segment;
      }
    }

    return last;
  }

  function getPositionFromSegments(segments, elapsedMs, arena) {
    if (!segments || !segments.length) {
      return { x: arena.width / 2, y: arena.height / 2, segment: null, segmentProgress: 0 };
    }

    const seg = getSegmentForTime(segments, elapsedMs);
    const duration = Math.max(1, seg.t1 - seg.t0);
    const rawT = Math.max(0, Math.min(1, (elapsedMs - seg.t0) / duration));
    const eased = easeValue(seg.easing || "easeInOutSine", rawT);

    let x = seg.x0 + (seg.x1 - seg.x0) * eased;
    let y = seg.y0 + (seg.y1 - seg.y0) * eased;

    const dx = seg.x1 - seg.x0;
    const dy = seg.y1 - seg.y0;
    const len = Math.max(1, Math.hypot(dx, dy));

    const nx = -dy / len;
    const ny = dx / len;

    const flutterBase = Math.sin(rawT * Math.PI);
    const flutterWave = Math.sin((rawT * Math.PI * 2 * (seg.flutter_freq || 1)) + (seg.flutter_phase || 0));
    let flutter = flutterBase * flutterWave * (seg.flutter_amp || 0);

    if (seg.kind === "snitch") {
      flutter += Math.sin((rawT * Math.PI * 4) + (seg.flutter_phase || 0) * 0.65) * (seg.flutter_amp || 0) * 0.18 * flutterBase;
    }

    x += nx * flutter;
    y += ny * flutter;

    return { x, y, segment: seg, segmentProgress: rawT };
  }

  function buildStarField() {
    starField = [];
    for (let i = 0; i < 120; i++) {
      starField.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 2.2 + 0.5,
        speed: Math.random() * 0.12 + 0.03,
        alpha: Math.random() * 0.7 + 0.15,
      });
    }
  }

  function startAmbientAudio() {
    if (ambientStarted) return;
    ambientStarted = true;

    const start = () => {
      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
      } catch (err) {
        return;
      }
    };

    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
  }

  function playDashWhoosh() {
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.18);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.20);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  function resizeCanvas() {
    const canvas = document.getElementById("snitch-tv-canvas");
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawBackground(ctx, width, height, elapsedMs) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#071223");
    gradient.addColorStop(0.55, "#0a1730");
    gradient.addColorStop(1, "#07111f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (const star of starField) {
      const x = star.x * width;
      const y = ((star.y + (elapsedMs * 0.00003 * star.speed)) % 1) * height;
      const twinkle = (Math.sin(elapsedMs * 0.002 + x * 0.01) + 1) / 2;
      const alpha = star.alpha * (0.5 + twinkle * 0.8);

      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.arc(x, y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function fitArenaToCanvas(canvasWidth, canvasHeight, arenaWidth, arenaHeight) {
    const scale = Math.min(canvasWidth / arenaWidth, canvasHeight / arenaHeight);
    const drawWidth = arenaWidth * scale;
    const drawHeight = arenaHeight * scale;
    const offsetX = (canvasWidth - drawWidth) / 2;
    const offsetY = (canvasHeight - drawHeight) / 2;

    return { scale, offsetX, offsetY };
  }

  function mapPoint(point, fit) {
    return {
      x: fit.offsetX + point.x * fit.scale,
      y: fit.offsetY + point.y * fit.scale,
    };
  }

  function drawArenaFrame(ctx, canvasWidth, canvasHeight, state, elapsedMs) {
    const arena = state.arena || {
      width: 1280,
      height: 720,
      zone_radius: 92,
      snitch_radius: 24,
    };

    const fit = fitArenaToCanvas(canvasWidth, canvasHeight, arena.width, arena.height);

    const zone = getPositionFromSegments(state.zone_segments || [], elapsedMs, arena);
    const snitch = getPositionFromSegments(state.snitch_segments || [], elapsedMs, arena);

    const zoneScreen = mapPoint(zone, fit);
    const snitchScreen = mapPoint(snitch, fit);

    const zoneRadius = (arena.zone_radius || 92) * fit.scale;
    const snitchRadius = (arena.snitch_radius || 24) * fit.scale;

    trail.unshift({
      x: snitchScreen.x,
      y: snitchScreen.y,
      time: performance.now(),
    });

    if (trail.length > 18) trail.length = 18;

    ctx.save();

    const arenaGlow = ctx.createRadialGradient(
      zoneScreen.x,
      zoneScreen.y,
      zoneRadius * 0.4,
      zoneScreen.x,
      zoneScreen.y,
      zoneRadius * 5.5
    );
    arenaGlow.addColorStop(0, "rgba(255, 215, 120, 0.10)");
    arenaGlow.addColorStop(1, "rgba(255, 215, 120, 0)");
    ctx.fillStyle = arenaGlow;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = "rgba(130, 180, 255, 0.16)";
    ctx.lineWidth = 3;
    ctx.strokeRect(fit.offsetX, fit.offsetY, arena.width * fit.scale, arena.height * fit.scale);

    ctx.save();
    ctx.beginPath();
    ctx.rect(fit.offsetX, fit.offsetY, arena.width * fit.scale, arena.height * fit.scale);
    ctx.clip();

    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i];
      const alpha = (1 - i / trail.length) * 0.32;
      const radius = snitchRadius * (0.35 + (i / trail.length) * 0.8);
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 210, 90, ${alpha})`;
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const pulse = 1 + Math.sin(elapsedMs * 0.008) * 0.05;

    ctx.beginPath();
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(144, 219, 255, 0.22)";
    ctx.arc(zoneScreen.x, zoneScreen.y, zoneRadius * 1.18 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 10]);
    ctx.strokeStyle = "rgba(181, 241, 255, 0.9)";
    ctx.arc(zoneScreen.x, zoneScreen.y, zoneRadius * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const zoneGlow = ctx.createRadialGradient(
      zoneScreen.x,
      zoneScreen.y,
      zoneRadius * 0.3,
      zoneScreen.x,
      zoneScreen.y,
      zoneRadius * 2.4
    );
    zoneGlow.addColorStop(0, "rgba(156, 235, 255, 0.24)");
    zoneGlow.addColorStop(1, "rgba(156, 235, 255, 0)");
    ctx.beginPath();
    ctx.fillStyle = zoneGlow;
    ctx.arc(zoneScreen.x, zoneScreen.y, zoneRadius * 2.1, 0, Math.PI * 2);
    ctx.fill();

    const wingPhase = elapsedMs * 0.018;
    const wingSpread = snitchRadius * (1.65 + Math.sin(wingPhase) * 0.22);

    ctx.save();
    ctx.translate(snitchScreen.x, snitchScreen.y);

    const snitchGlow = ctx.createRadialGradient(0, 0, snitchRadius * 0.3, 0, 0, snitchRadius * 3.5);
    snitchGlow.addColorStop(0, "rgba(255, 245, 180, 0.98)");
    snitchGlow.addColorStop(0.25, "rgba(255, 212, 90, 0.92)");
    snitchGlow.addColorStop(1, "rgba(255, 212, 90, 0)");
    ctx.fillStyle = snitchGlow;
    ctx.beginPath();
    ctx.arc(0, 0, snitchRadius * 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(240,245,255,0.92)";
    ctx.beginPath();
    ctx.ellipse(-wingSpread, -snitchRadius * 0.18, snitchRadius * 1.1, snitchRadius * 0.45, -0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(wingSpread, -snitchRadius * 0.18, snitchRadius * 1.1, snitchRadius * 0.45, 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = "#ffe089";
    ctx.arc(0, 0, snitchRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = "rgba(255,255,255,0.38)";
    ctx.arc(-snitchRadius * 0.28, -snitchRadius * 0.28, snitchRadius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.restore();
    ctx.restore();

    const segment = snitch.segment;
    if (segment) {
      const segmentKey = `${segment.t0}-${segment.t1}-${segment.x1}-${segment.y1}`;
      if (segmentKey !== lastSnitchSegmentKey) {
        lastSnitchSegmentKey = segmentKey;
        playDashWhoosh();
      }
    }
  }

  function renderResults(state) {
    const resultsWrap = document.getElementById("snitch-results");
    if (!resultsWrap) return;

    const result = state.snitch_result || {};
    const leaderboard = result.leaderboard || [];
    const winnerName = result.winner_name;

    const cards = leaderboard.map((row, index) => {
      const best = row.best_attempt || {};
      const score = row.points_awarded || 0;
      const grade = best.label || "Sin intento";
      const precision = typeof best.precision === "number" ? `${best.precision}% precisión` : "Sin precisión";
      const distance = typeof best.distance_px === "number" ? `${best.distance_px.toFixed(1)} px` : "Sin registro";
      const tries = `${row.attempts_used || 0} intento(s)`;

      return `
        <div class="result-card">
          <div class="result-top">
            <div>
              <div class="result-name">${index + 1}. ${row.player_name || "Jugador"}</div>
              <div class="result-house">${row.house || "Sin casa"}</div>
            </div>
            <div class="result-score">${score}</div>
          </div>

          <div class="result-meta">
            <div class="meta-chip">${grade}</div>
            <div class="meta-chip">${precision}</div>
            <div class="meta-chip">${distance}</div>
            <div class="meta-chip">${tries}</div>
            ${row.winner_bonus ? `<div class="meta-chip">+${row.winner_bonus} bonus</div>` : ""}
          </div>
        </div>
      `;
    }).join("");

    resultsWrap.innerHTML = `
      <div class="results-title">Resultados de la Snitch</div>
      <p class="results-subtitle">${result.summary || "La snitch cambió de velocidad y dirección constantemente."}</p>
      ${winnerName ? `<div class="winner-banner">🏆 Mejor buscador de la ronda: ${winnerName}</div>` : ""}
      <div class="results-grid">${cards || "<div class='result-card'>Nadie hizo intentos.</div>"}</div>
    `;
    resultsWrap.classList.add("active");
  }

  function hideResults() {
    const resultsWrap = document.getElementById("snitch-results");
    if (!resultsWrap) return;
    resultsWrap.classList.remove("active");
    resultsWrap.innerHTML = "";
  }

  function renderCountdown(remainingMs) {
    const overlay = document.getElementById("snitch-countdown-overlay");
    const number = document.getElementById("snitch-countdown-number");
    if (!overlay || !number) return;

    if (remainingMs > 0) {
      overlay.style.display = "flex";
      number.textContent = Math.max(1, Math.ceil(remainingMs / 1000));
    } else {
      overlay.style.display = "none";
    }
  }

  function setBanner(main, sub) {
    const mainEl = document.getElementById("snitch-banner-main");
    const subEl = document.getElementById("snitch-banner-sub");
    if (mainEl) mainEl.textContent = main || "";
    if (subEl) subEl.textContent = sub || "";
  }

  function updateHud(state, elapsedMs) {
    const timerEl = document.getElementById("snitch-timer");
    const roundEl = document.getElementById("snitch-round");

    if (roundEl) {
      roundEl.textContent = String(state.round_id || 1);
    }

    if (timerEl) {
      const durationMs = (state.duration_seconds || 18) * 1000;
      const remaining = Math.max(0, durationMs - Math.max(0, elapsedMs));
      timerEl.textContent = (remaining / 1000).toFixed(1);
    }
  }

  function renderFrame(timestamp) {
    rafId = requestAnimationFrame(renderFrame);

    if (!roomState || !mounted) return;

    const phase = roomState.phase;
    if (phase !== "atrapa_snitch") return;

    const canvas = document.getElementById("snitch-tv-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;

    if (timestamp - lastFrameTime > 1000 || !lastFrameTime) {
      lastFrameTime = timestamp;
    }
    lastFrameTime = timestamp;

    const startedAt = Date.parse(roomState.started_at || new Date().toISOString());
    const elapsedMs = Date.now() - startedAt;

    drawBackground(ctx, width, height, Math.max(0, elapsedMs));
    updateHud(roomState, elapsedMs);

    if (elapsedMs < 0) {
      renderCountdown(-elapsedMs);
      setBanner(
        "Prepárense…",
        "La snitch aparecerá en cualquier instante."
      );
      return;
    }

    renderCountdown(0);

    drawArenaFrame(ctx, width, height, roomState, Math.max(0, elapsedMs));

    setBanner(
      "La Snitch cambia de velocidad y dirección.",
      "El objetivo es atraparla cuando quede dentro del aro azul encantado."
    );
  }

  async function fetchRoomStatus() {
    try {
      const response = await fetch(`/api/room/${encodeURIComponent(ROOM_CODE)}/status`, { cache: "no-store" });
      const data = await response.json();

      roomState = data.game_state || null;
      players = data.players || [];
      currentPhase = roomState?.phase || null;

      if (!roomState) return;

      if (roomState.round_id !== activeRoundId) {
        activeRoundId = roomState.round_id;
        trail = [];
        lastSnitchSegmentKey = null;
        hideResults();
      }

      if (roomState.phase === "results_atrapa_snitch") {
        renderResults(roomState);
      } else {
        hideResults();
      }
    } catch (error) {
      console.error("Error obteniendo estado de la sala:", error);
    }
  }

  function startPolling() {
    fetchRoomStatus();
    setInterval(fetchRoomStatus, POLL_MS);
  }

  function init() {
    injectStyles();
    ensureRoot();
    resizeCanvas();
    buildStarField();
    startAmbientAudio();

    mounted = true;

    if (!rafId) {
      rafId = requestAnimationFrame(renderFrame);
    }

    startPolling();

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("resize", buildStarField);
  }

  init();
})();