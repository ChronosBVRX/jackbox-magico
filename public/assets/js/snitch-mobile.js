(function () {
  const VERSION = "snitch-party-mobile-v1";

  let snitchLastKey = "";
  let snitchLastTick = null;
  let snitchCatchCooldown = false;
  let snitchAttemptsUsed = 0;
  let snitchRoundStartedMs = Date.now();
  let watcherStarted = false;
  let snitchWasActive = false;
  let audioCtx = null;

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

  function playTone(type = "tap") {
    const ctx = ensureAudio();

    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(1080, now + 0.12);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.09, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    } else if (type === "miss") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.20);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.045, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    } else {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.08);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.065, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  function playSound(name) {
    try {
      if (typeof MagicSound !== "undefined" && MagicSound.play) {
        MagicSound.play(name);
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

  function readRoom() {
    try {
      if (typeof myRoom !== "undefined" && myRoom) return myRoom;
    } catch (error) {}

    const fromStorage = localStorage.getItem("jackbox_magico_room");
    if (fromStorage) return fromStorage.toUpperCase();

    const input = document.getElementById("m-room");
    if (input && input.value) return input.value.trim().toUpperCase();

    const params = new URLSearchParams(window.location.search);
    if (params.has("room")) return params.get("room").toUpperCase();

    return "";
  }

  function readName() {
    try {
      if (typeof myName !== "undefined" && myName) return myName;
    } catch (error) {}

    const fromStorage = localStorage.getItem("jackbox_magico_name");
    if (fromStorage) return fromStorage;

    const input = document.getElementById("m-name");
    if (input && input.value) return input.value.trim();

    return "";
  }

  function readIsHost() {
    try {
      if (typeof myIsHost !== "undefined") return Boolean(myIsHost);
    } catch (error) {}

    return false;
  }

  function getSnitchKey(state) {
    return `${state.phase}-${state.round_id || state.question || "snitch"}`;
  }

  function getSnitchTimeInfo(state) {
    const duration = Number(state.duration_seconds || 24);
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

  function getAttemptCountFromState(state) {
    const attempts = state.attempts_by_player || {};
    const name = readName();
    const value = attempts[name];

    if (Array.isArray(value)) return value.length;
    return Number(value || 0);
  }

  function ensureSnitchPanel() {
    let panel = document.getElementById("snitch-mobile-panel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "snitch-mobile-panel";
      panel.className = "snitch-mobile-panel";

      const hostPanel = document.getElementById("host-game-panel");
      const parent = hostPanel?.parentElement || document.querySelector("#view-game .card");

      if (hostPanel && parent) {
        parent.insertBefore(panel, hostPanel);
      } else if (parent) {
        parent.appendChild(panel);
      }
    }

    return panel;
  }

  function hideOtherPanels() {
    const panels = [
      document.getElementById("duel-mobile-panel"),
      document.getElementById("sombrero-mobile-panel"),
      document.getElementById("pociones-mobile-panel"),
    ];

    panels.forEach((panel) => {
      if (panel) {
        panel.classList.remove("visible");
        panel.innerHTML = "";
      }
    });

    const buttons = document.getElementById("m-botones");
    if (buttons) buttons.innerHTML = "";
  }

  function renderCatchButton(panel, state) {
    const total = Number(state.attempts_total || 5);

    if (snitchAttemptsUsed >= total) {
      panel.innerHTML = `
        <div class="snitch-party-mobile-done">
          🏁 Sin intentos<br>
          <small>Mira la TV para ver si atrapaste oro o puro aire.</small>
        </div>
      `;
      return;
    }

    panel.innerHTML = `
      <div class="snitch-party-mobile-orb">
        <div class="snitch-party-wing left"></div>
        <div class="snitch-party-core"></div>
        <div class="snitch-party-wing right"></div>
      </div>

      <button id="snitch-catch-button" class="snitch-party-catch-btn" onclick="sendSnitchCatch()">
        <span class="main">¡ATRAPAR!</span>
        <span class="sub">Toca cuando entre al aro</span>
      </button>

      <div class="snitch-party-attempt-box" id="snitch-attempt-box">
        Intentos: ${snitchAttemptsUsed}/${total}
      </div>

      <div class="snitch-party-mobile-tip">
        La Snitch ahora cambia de dirección y velocidad. No adivines: calcula.
      </div>
    `;
  }

  function setFeedback(data) {
    const box = document.getElementById("snitch-attempt-box");

    if (!box) return;

    const grade = data.grade || "miss";
    const points = Number(data.points || 0);
    const precision = Number(data.precision || 0);

    box.className = `snitch-party-attempt-box feedback-${grade}`;

    box.innerHTML = `
      <strong>${data.label || data.message || "Intento"}</strong><br>
      <span>${points > 0 ? "+" : ""}${points} pts · ${precision}% precisión · Intentos: ${data.attempts_used}/${data.attempts_total}</span>
    `;

    box.animate(
      [
        { transform: "scale(1)", filter: "brightness(1)" },
        { transform: "scale(1.04)", filter: "brightness(1.35)" },
        { transform: "scale(1)", filter: "brightness(1)" },
      ],
      {
        duration: 260,
        easing: "ease-out",
      }
    );
  }

  window.updateMobileSnitchTimer = function updateMobileSnitchTimer(state) {
    const timer = document.getElementById("mobile-timer");
    const bar = document.getElementById("mobile-timer-bar");

    if (!bar) return;

    const info = getSnitchTimeInfo(state);

    if (timer) timer.style.display = "block";

    bar.style.transform = `scaleX(${info.pct})`;

    const rounded = Math.ceil(info.left);

    if (rounded <= 3 && rounded > 0 && rounded !== snitchLastTick) {
      snitchLastTick = rounded;
      playSound("timer-danger");
      playTone("tap");
      vibrate(55);
    }

    const status = document.getElementById("mobile-status");
    if (status) {
      status.innerText = `Tiempo: ${info.left.toFixed(1)}s · Intentos: ${snitchAttemptsUsed}/${state.attempts_total || 5}`;
    }
  };

  window.renderSnitchMobile = function renderSnitchMobile(state) {
    snitchWasActive = true;

    if (typeof showScreen === "function") {
      showScreen("view-game");
    }

    if (typeof showHostPanels === "function") {
      showHostPanels(readIsHost());
    }

    hideOtherPanels();

    const key = getSnitchKey(state);
    const stateAttempts = getAttemptCountFromState(state);

    if (snitchLastKey !== key) {
      snitchLastKey = key;
      snitchLastTick = null;
      snitchCatchCooldown = false;
      snitchAttemptsUsed = stateAttempts;
      snitchRoundStartedMs = state.started_at ? Number(state.started_at) * 1000 : Date.now();

      try {
        if (typeof currentRoundStartedMs !== "undefined") {
          currentRoundStartedMs = snitchRoundStartedMs;
        }
      } catch (error) {}

      playSound("start");
      playTone("tap");
      vibrate([40, 50, 40]);
    } else {
      snitchAttemptsUsed = Math.max(snitchAttemptsUsed, stateAttempts);
    }

    const pill = document.getElementById("game-pill");
    const title = document.getElementById("m-pregunta-aviso");
    const question = document.getElementById("m-question-small");

    if (pill) pill.innerText = "🏆 Snitch Party";
    if (title) title.innerText = "¡Atrapa la Snitch!";
    if (question) {
      question.innerText = "Cambios de dirección, acelerones y señuelos visuales. Mira la TV.";
    }

    const panel = ensureSnitchPanel();
    panel.classList.add("visible", "snitch-party-mobile-panel");

    const total = Number(state.attempts_total || 5);
    const shouldRerender =
      panel.dataset.version !== VERSION ||
      panel.dataset.roundKey !== key ||
      panel.dataset.attempts !== String(snitchAttemptsUsed) ||
      !document.getElementById("snitch-catch-button");

    if (shouldRerender) {
      panel.dataset.version = VERSION;
      panel.dataset.roundKey = key;
      panel.dataset.attempts = String(snitchAttemptsUsed);
      renderCatchButton(panel, state);
    }

    if (snitchAttemptsUsed >= total) {
      renderCatchButton(panel, state);
    }

    window.updateMobileSnitchTimer(state);
  };

  async function postSnitchAttempt(room, name, elapsed) {
    return fetch("/api/player/snitch_catch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        room_code: room,
        player_name: name,
        client_elapsed_ms: elapsed,
      }),
    });
  }

  async function refreshSnitchState() {
    const room = readRoom();

    if (!room) return;

    try {
      const res = await fetch(`/api/room/${room}/status?ts=${Date.now()}`, {
        cache: "no-store",
      });

      if (!res.ok) return;

      const data = await res.json();
      const state = data.game_state || {};

      if (data.status === "playing" && state.phase === "atrapa_snitch") {
        window.renderSnitchMobile(state);
      }
    } catch (error) {}
  }

  window.sendSnitchCatch = async function sendSnitchCatch() {
    if (snitchCatchCooldown) return;

    ensureAudio();

    const room = readRoom();
    const name = readName();

    const box = document.getElementById("snitch-attempt-box");
    const button = document.getElementById("snitch-catch-button");

    if (!room || !name) {
      if (box) {
        box.className = "snitch-party-attempt-box feedback-miss";
        box.textContent = "No se detectó sala o jugador. Recarga el celular y vuelve a entrar.";
      }

      playTone("miss");
      vibrate([80, 50, 80]);
      return;
    }

    snitchCatchCooldown = true;

    if (button) {
      button.classList.add("cooldown");
      button.disabled = true;
      button.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(.94)" },
          { transform: "scale(1.02)" },
          { transform: "scale(1)" },
        ],
        {
          duration: 220,
          easing: "ease-out",
        }
      );
    }

    const elapsed = Math.max(0, Date.now() - snitchRoundStartedMs);

    if (box) {
      box.className = "snitch-party-attempt-box feedback-loading";
      box.textContent = "Registrando intento...";
    }

    playTone("tap");
    vibrate(28);

    try {
      const res = await postSnitchAttempt(room, name, elapsed);
      const data = await res.json();

      if (data.accepted) {
        snitchAttemptsUsed = Number(data.attempts_used || snitchAttemptsUsed + 1);

        setFeedback(data);

        const panel = ensureSnitchPanel();
        panel.dataset.attempts = String(snitchAttemptsUsed);

        if (data.grade === "miss") {
          playTone("miss");
          playSound("wrong");
          vibrate([100, 40, 100]);
        } else if (data.grade === "legendary" || data.grade === "perfect") {
          playTone("success");
          playSound("correct");
          vibrate([30, 35, 30, 35, 70]);
        } else {
          playTone("success");
          playSound("correct");
          vibrate([40, 40, 40]);
        }
      } else if (box) {
        box.className = "snitch-party-attempt-box feedback-miss";
        box.textContent = data.message || "Intento no aceptado.";
        playTone("miss");
        playSound("wrong");
        vibrate([80, 50, 80]);
      }

      await refreshSnitchState();
    } catch (error) {
      if (box) {
        box.className = "snitch-party-attempt-box feedback-miss";
        box.textContent = "Error de conexión al intentar atrapar la Snitch.";
      }

      playTone("miss");
      playSound("wrong");
      vibrate([80, 50, 80]);
    }

    setTimeout(() => {
      snitchCatchCooldown = false;

      if (button) {
        button.classList.remove("cooldown");
        button.disabled = false;
      }
    }, 190);
  };

  async function independentSnitchWatcher() {
    const room = readRoom();

    if (!room) return;

    try {
      const res = await fetch(`/api/room/${room}/status?ts=${Date.now()}`, {
        cache: "no-store",
      });

      if (!res.ok) return;

      const data = await res.json();
      const state = data.game_state || {};
      const phase = state.phase || "lobby";

      if (data.status === "playing" && phase === "atrapa_snitch") {
        window.renderSnitchMobile(state);
        return;
      }

      if (snitchWasActive && phase !== "atrapa_snitch") {
        snitchWasActive = false;

        const panel = document.getElementById("snitch-mobile-panel");
        if (panel) {
          panel.classList.remove("visible");
          panel.innerHTML = "";
        }
      }
    } catch (error) {}
  }

  if (!watcherStarted) {
    watcherStarted = true;
    setInterval(independentSnitchWatcher, 500);
  }
})();