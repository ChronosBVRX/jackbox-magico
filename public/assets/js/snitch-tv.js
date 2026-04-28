(function () {
  let snitchLastKey = "";
  let snitchLastTick = null;
  let snitchAutoRevealLock = false;
  let activeState = null;
  let activePlayers = [];
  let rafId = null;
  let revealCallback = null;
  let trail = [];
  let burstParticles = [];
  let lastSegmentId = "";
  let screenShakeUntil = 0;
  let flashUntil = 0;
  let lastFeedIds = new Set();
  let audioCtx = null;

  const houseIcons = {
    Gryffindor: "🦁",
    Slytherin: "🐍",
    Ravenclaw: "🦅",
    Hufflepuff: "🦡",
  };

  const feedGradeLabel = {
    legendary: "legendario",
    perfect: "perfecto",
    great: "genial",
    close: "casi",
    miss: "falló",
  };

  function playSound(name) {
    try {
      if (typeof MagicSound !== "undefined" && MagicSound.play) {
        MagicSound.play(name);
      }
    } catch (error) {}
  }

  function ensureAudio() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      return audioCtx;
    } catch (error) {
      return null;
    }
  }

  function beep(type = "whoosh") {
    const ctx = ensureAudio();

    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === "hit") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(1180, now + 0.12);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.045, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    } else if (type === "miss") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.18);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.028, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.20);
    } else {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.16);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.022, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  function h(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function ease(name, t) {
    t = clamp(t, 0, 1);

    if (name === "linear") return t;
    if (name === "ease_out_quad") return 1 - (1 - t) * (1 - t);
    if (name === "ease_in_quad") return t * t;
    if (name === "ease_in_out_quad") return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    if (name === "ease_out_cubic") return 1 - Math.pow(1 - t, 3);
    if (name === "ease_in_out_cubic") return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  function getSnitchKey(state) {
    return `${state.phase}-${state.round_id || state.question || "snitch"}`;
  }

  function getElapsed(state) {
    const startedAt = Number(state.started_at || Date.now() / 1000);
    return Math.max(0, Date.now() / 1000 - startedAt);
  }

  function getTimeInfo(state) {
    const duration = Number(state.duration_seconds || 24);
    const elapsed = getElapsed(state);
    const left = Math.max(0, duration - elapsed);

    return {
      duration,
      elapsed,
      left,
      pct: duration > 0 ? clamp(left / duration, 0, 1) : 0,
    };
  }

  function getSegment(segments, elapsed) {
    if (!Array.isArray(segments) || !segments.length) return null;

    if (elapsed <= segments[0].t0) return segments[0];

    const last = segments[segments.length - 1];

    if (elapsed >= last.t1) return last;

    return segments.find((segment) => elapsed >= segment.t0 && elapsed <= segment.t1) || last;
  }

  function positionAt(segments, elapsed) {
    const segment = getSegment(segments, elapsed);

    if (!segment) {
      return {
        x: 50,
        y: 50,
        segment_id: "",
        speed_label: "",
      };
    }

    const duration = Math.max(0.001, Number(segment.t1) - Number(segment.t0));
    const raw = clamp((elapsed - Number(segment.t0)) / duration, 0, 1);
    const t = ease(segment.easing || "ease_in_out_sine", raw);

    let x = Number(segment.x0) + (Number(segment.x1) - Number(segment.x0)) * t;
    let y = Number(segment.y0) + (Number(segment.y1) - Number(segment.y0)) * t;

    const dx = Number(segment.x1) - Number(segment.x0);
    const dy = Number(segment.y1) - Number(segment.y0);
    const len = Math.max(0.001, Math.hypot(dx, dy));

    const nx = -dy / len;
    const ny = dx / len;

    const wobble = Number(segment.wobble || 0);
    const wave = Number(segment.wave || 1);
    const phase = Number(segment.phase || 0);
    const flutterBase = Math.sin(raw * Math.PI);
    const flutter = Math.sin((raw * Math.PI * 2 * wave) + phase) * wobble * flutterBase;

    x += nx * flutter;
    y += ny * flutter;

    return {
      x,
      y,
      segment_id: segment.id || "",
      speed_label: segment.speed_label || "",
      raw,
    };
  }

  function percentToCanvas(point, canvas) {
    const width = canvas.clientWidth || canvas.width || 1000;
    const height = canvas.clientHeight || canvas.height || 600;

    return {
      x: (point.x / 100) * width,
      y: (point.y / 100) * height,
    };
  }

  function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || 520;

    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    return {
      ctx,
      width,
      height,
    };
  }

  function spawnBurst(x, y, grade = "miss") {
    const amount = grade === "legendary" ? 48 : grade === "perfect" ? 36 : grade === "great" ? 26 : 16;

    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 5.8;

      burstParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        size: 2 + Math.random() * 5,
        grade,
      });
    }

    flashUntil = performance.now() + 220;
    screenShakeUntil = performance.now() + 280;
  }

  function processFeedEvents(state, canvas) {
    const feed = Array.isArray(state.snitch_feed) ? state.snitch_feed : [];

    feed.forEach((event) => {
      if (lastFeedIds.has(event.id)) return;

      lastFeedIds.add(event.id);

      if (lastFeedIds.size > 20) {
        lastFeedIds = new Set(feed.map((item) => item.id));
      }

      const elapsed = Number(event.elapsed_seconds || 0);
      const pos = positionAt(state.snitch_motion || [], elapsed);
      const canvasPos = percentToCanvas(pos, canvas);

      spawnBurst(canvasPos.x, canvasPos.y, event.grade);

      if (event.grade === "miss") {
        beep("miss");
      } else {
        beep("hit");
      }
    });
  }

  function drawBackground(ctx, width, height, elapsed) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);

    gradient.addColorStop(0, "#07111f");
    gradient.addColorStop(0.5, "#0b1c34");
    gradient.addColorStop(1, "#040810");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.28;

    for (let i = 0; i < 80; i++) {
      const x = ((i * 157 + elapsed * 18) % (width + 80)) - 40;
      const y = ((i * 83) % height);
      const s = 1 + ((i * 17) % 4);

      ctx.fillStyle = i % 5 === 0 ? "rgba(255,216,121,.85)" : "rgba(255,255,255,.55)";
      ctx.beginPath();
      ctx.arc(x, y, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.045)";
    ctx.lineWidth = 1;

    const grid = 58;
    const offset = (elapsed * 20) % grid;

    for (let x = -grid + offset; x < width + grid; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = -grid + offset; y < height + grid; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawFakeObjects(ctx, canvas, state, elapsed) {
    const fakes = Array.isArray(state.fake_objects) ? state.fake_objects : [];

    fakes.forEach((fake) => {
      if (elapsed < fake.t0 || elapsed > fake.t1) return;

      const raw = clamp((elapsed - fake.t0) / Math.max(0.001, fake.t1 - fake.t0), 0, 1);
      const t = ease("ease_in_out_quad", raw);

      const p = {
        x: Number(fake.x0) + (Number(fake.x1) - Number(fake.x0)) * t,
        y: Number(fake.y0) + (Number(fake.y1) - Number(fake.y0)) * t,
      };

      const pos = percentToCanvas(p, canvas);
      const alpha = Math.sin(raw * Math.PI);
      const size = Number(fake.size || 4) * 7;

      ctx.save();
      ctx.globalAlpha = alpha * 0.76;
      ctx.translate(pos.x, pos.y);
      ctx.rotate((performance.now() * 0.003) * Number(fake.spin || 1));
      ctx.font = `${size}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(255,255,255,.55)";
      ctx.shadowBlur = 18;
      ctx.fillText(fake.emoji || "✨", 0, 0);
      ctx.restore();
    });
  }

  function drawParticles(ctx) {
    burstParticles = burstParticles.filter((p) => p.life > 0);

    burstParticles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= 0.025;

      let color = "255,255,255";

      if (p.grade === "legendary") color = "255,216,121";
      else if (p.grade === "perfect") color = "255,240,180";
      else if (p.grade === "great") color = "130,220,255";
      else if (p.grade === "close") color = "255,160,90";
      else color = "255,70,70";

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = `rgba(${color},${p.life})`;
      ctx.shadowColor = `rgba(${color},.8)`;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawZone(ctx, pos, elapsed) {
    const pulse = 1 + Math.sin(elapsed * 7.4) * 0.05;
    const radius = 78 * pulse;

    ctx.save();
    ctx.translate(pos.x, pos.y);

    const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, radius * 2.4);
    glow.addColorStop(0, "rgba(120,220,255,.24)");
    glow.addColorStop(0.45, "rgba(120,220,255,.10)");
    glow.addColorStop(1, "rgba(120,220,255,0)");

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(elapsed * 1.7);

    ctx.lineWidth = 9;
    ctx.strokeStyle = "rgba(140,230,255,.22)";
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.18, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 4;
    ctx.setLineDash([22, 14]);
    ctx.strokeStyle = "rgba(180,245,255,.95)";
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.rotate(-elapsed * 3.1);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.66, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  function drawSnitch(ctx, pos, elapsed, speedLabel) {
    const wing = Math.sin(elapsed * 40) * 10;
    const rotation = Math.sin(elapsed * 9) * 0.4;

    trail.unshift({
      x: pos.x,
      y: pos.y,
    });

    if (trail.length > 24) {
      trail.length = 24;
    }

    trail.forEach((p, index) => {
      const alpha = (1 - index / trail.length) * 0.42;
      const size = 26 * (1 - index / trail.length);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(255,216,121,.85)";
      ctx.shadowColor = "rgba(255,216,121,.9)";
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(rotation);

    const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, 90);
    glow.addColorStop(0, "rgba(255,255,255,1)");
    glow.addColorStop(0.22, "rgba(255,216,121,.92)");
    glow.addColorStop(1, "rgba(255,216,121,0)");

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 90, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(245,250,255,.95)";
    ctx.beginPath();
    ctx.ellipse(-38, -5, 48, 12 + wing * 0.18, -0.38, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(38, -5, 48, 12 - wing * 0.18, 0.38, 0, Math.PI * 2);
    ctx.fill();

    const core = ctx.createRadialGradient(-6, -6, 4, 0, 0, 25);
    core.addColorStop(0, "#fffbe8");
    core.addColorStop(0.35, "#ffe089");
    core.addColorStop(1, "#c87400");

    ctx.fillStyle = core;
    ctx.shadowColor = "rgba(255,216,121,.9)";
    ctx.shadowBlur = 28;
    ctx.beginPath();
    ctx.arc(0, 0, 23, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.beginPath();
    ctx.arc(-7, -8, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (speedLabel === "dash" || speedLabel === "quiebre") {
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = speedLabel === "dash" ? "rgba(255,216,121,.92)" : "rgba(130,220,255,.92)";
      ctx.font = "900 22px Arial";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,.65)";
      ctx.shadowBlur = 8;
      ctx.fillText(speedLabel === "dash" ? "¡FLASH!" : "¡CAMBIO!", pos.x, pos.y - 56);
      ctx.restore();
    }
  }

  function drawScene(state) {
    const canvas = document.getElementById("snitch-canvas");

    if (!canvas) return;

    const { ctx, width, height } = setupCanvas(canvas);
    const info = getTimeInfo(state);
    const elapsed = info.elapsed;

    processFeedEvents(state, canvas);

    const now = performance.now();
    const shake = now < screenShakeUntil ? (Math.random() - 0.5) * 12 : 0;

    ctx.save();
    ctx.translate(shake, -shake * 0.55);

    drawBackground(ctx, width, height, elapsed);
    drawFakeObjects(ctx, canvas, state, elapsed);

    const snitchPoint = positionAt(state.snitch_motion || [], elapsed);
    const zonePoint = positionAt(state.zone_motion || [], elapsed);

    const snitchPos = percentToCanvas(snitchPoint, canvas);
    const zonePos = percentToCanvas(zonePoint, canvas);

    if (snitchPoint.segment_id && snitchPoint.segment_id !== lastSegmentId) {
      lastSegmentId = snitchPoint.segment_id;
      beep("whoosh");

      if (snitchPoint.speed_label === "dash" || snitchPoint.speed_label === "quiebre") {
        screenShakeUntil = performance.now() + 120;
      }
    }

    drawZone(ctx, zonePos, elapsed);
    drawSnitch(ctx, snitchPos, elapsed, snitchPoint.speed_label);
    drawParticles(ctx);

    ctx.restore();

    if (now < flashUntil) {
      const alpha = clamp((flashUntil - now) / 220, 0, 1) * 0.32;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function updateHud(state, players) {
    const info = getTimeInfo(state);

    const timer = document.getElementById("snitch-time");
    const bar = document.getElementById("snitch-bar");
    const attempts = document.getElementById("snitch-attempts");
    const feed = document.getElementById("snitch-feed");

    if (timer) {
      timer.textContent = `${info.left.toFixed(1)}s`;
    }

    if (bar) {
      bar.style.transform = `scaleX(${info.pct})`;
    }

    if (attempts) {
      const total = Number(state.attempts_total || 5);
      const map = state.attempts_by_player || {};

      attempts.innerHTML = (players || []).map((player) => {
        const used = Number(map[player.name] || 0);

        return `
          <div class="snitch-tv-player ${used >= total ? "done" : ""}">
            <span>${houseIcons[player.house] || "✨"} ${h(player.name)}</span>
            <strong>${used}/${total}</strong>
          </div>
        `;
      }).join("");
    }

    if (feed) {
      const items = Array.isArray(state.snitch_feed) ? [...state.snitch_feed].reverse() : [];

      feed.innerHTML = items.slice(0, 5).map((item) => `
        <div class="snitch-feed-item ${h(item.grade)}">
          <span>${h(item.emoji || "✨")} ${h(item.player_name)} — ${h(item.label)}</span>
          <strong>${item.points_preview > 0 ? "+" : ""}${h(item.points_preview)} pts</strong>
        </div>
      `).join("");
    }

    const rounded = Math.ceil(info.left);

    if (rounded <= 3 && rounded > 0 && rounded !== snitchLastTick) {
      snitchLastTick = rounded;
      playSound("timer-danger");
      beep("whoosh");
    }

    if (info.left <= 0 && !snitchAutoRevealLock) {
      snitchAutoRevealLock = true;

      setTimeout(() => {
        if (typeof revealCallback === "function") {
          revealCallback();
        }
      }, 700);
    }
  }

  function renderBoard(state, players) {
    const container = document.getElementById("game-container");

    if (!container) return;

    container.innerHTML = `
      <section class="snitch-party-board">
        <div class="snitch-party-bg"></div>

        <header class="snitch-party-header">
          <div>
            <div class="snitch-party-badge">🏆 Minijuego party</div>
            <h1>${h(state.title || "Atrapa la Snitch")}</h1>
            <p>${h(state.subtitle || "No pestañees.")}</p>
          </div>

          <div class="snitch-party-timer">
            <span>Tiempo</span>
            <strong id="snitch-time">--</strong>
          </div>
        </header>

        <div class="snitch-canvas-wrap">
          <canvas id="snitch-canvas"></canvas>
          <div class="snitch-party-callout">
            <strong>¡Atrápala dentro del aro!</strong>
            <span>La Snitch cambia de dirección y velocidad sin avisar.</span>
          </div>
        </div>

        <div class="snitch-party-progress">
          <div id="snitch-bar"></div>
        </div>

        <div class="snitch-party-bottom">
          <div>
            <h3>Jugadores</h3>
            <div id="snitch-attempts" class="snitch-tv-players"></div>
          </div>

          <div>
            <h3>Momentos de la ronda</h3>
            <div id="snitch-feed" class="snitch-feed"></div>
          </div>
        </div>
      </section>
    `;

    window.addEventListener("pointerdown", ensureAudio, { once: true });
    updateHud(state, players);
  }

  function animate() {
    if (activeState && activeState.phase === "atrapa_snitch") {
      drawScene(activeState);
    }

    rafId = requestAnimationFrame(animate);
  }

  window.renderSnitchTv = function renderSnitchTv(state, players, options = {}) {
    const key = getSnitchKey(state);
    revealCallback = options.reveal || revealCallback;

    activeState = state;
    activePlayers = players || [];

    if (snitchLastKey !== key) {
      snitchLastKey = key;
      snitchLastTick = null;
      snitchAutoRevealLock = false;
      trail = [];
      burstParticles = [];
      lastSegmentId = "";
      lastFeedIds = new Set();

      playSound("start");
      renderBoard(state, activePlayers);

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(animate);
    }

    updateHud(state, activePlayers);
  };

  window.destroySnitchTv = function destroySnitchTv() {
    activeState = null;
    activePlayers = [];

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  window.renderSnitchTvResults = function renderSnitchTvResults(state, container) {
    const result = state.snitch_result || {};
    const playerResults = result.player_results || [];

    if (!container) return;

    const panel = document.createElement("div");
    panel.className = "snitch-result-panel party";

    const best = result.best_overall;
    const title = best
      ? `🏆 ${best.player_name} fue el buscador legendario`
      : "🏆 La Snitch sobrevivió al caos";

    panel.innerHTML = `
      <div class="snitch-result-title">${h(title)}</div>
      <div class="snitch-result-line">“${h(result.narrator || result.summary || "La Snitch se divirtió más que ustedes.")}”</div>
    `;

    container.appendChild(panel);

    playerResults.forEach((row, index) => {
      const bestAttempt = row.best_attempt || {};
      const line = document.createElement("div");

      line.className = `result-row ${Number(row.total_points || 0) > 0 ? "good" : "bad"}`;
      line.innerHTML = `
        <span>
          ${index + 1}. ${h(row.player_name)} — ${h(bestAttempt.label || "Sin intento")} · ${h(bestAttempt.precision || 0)}%
        </span>
        <span>${Number(row.total_points || 0) > 0 ? "+" : ""}${h(row.total_points || 0)} pts</span>
      `;

      container.appendChild(line);
    });
  };
})();