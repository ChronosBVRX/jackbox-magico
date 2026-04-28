let myRoom = "";
let myName = "";
let radarInterval = null;
let currentRoundKey = "";
let currentRoundStartedMs = Date.now();
let hasAnsweredCurrentRound = false;
let lastTickSecond = null;

const urlParams = new URLSearchParams(window.location.search);

if (urlParams.has("room")) {
  document.getElementById("m-room").value = urlParams.get("room").toUpperCase();
  document.getElementById("m-room").disabled = true;
}

const savedName = localStorage.getItem("jackbox_magico_name");
const savedHouse = localStorage.getItem("jackbox_magico_house");

if (savedName) {
  document.getElementById("m-name").value = savedName;
}

if (savedHouse) {
  document.getElementById("m-house").value = savedHouse;
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("visible");
  });

  document.getElementById(id).classList.add("visible");
}

function getQuestion(state) {
  return state.question || state.attack_msg || "¡Responde!";
}

function getRoundKey(state) {
  return `${state.phase}-${state.round_id || getQuestion(state)}`;
}

document.getElementById("btn-unirse").addEventListener("click", async () => {
  MagicSound.unlock();
  MagicSound.play("click");

  const btn = document.getElementById("btn-unirse");

  myRoom = document.getElementById("m-room").value.trim().toUpperCase();
  myName = document.getElementById("m-name").value.trim();

  const house = document.getElementById("m-house").value;

  if (!myRoom || !myName) {
    alert("No seas muggle, llena todos los campos.");
    return;
  }

  localStorage.setItem("jackbox_magico_name", myName);
  localStorage.setItem("jackbox_magico_house", house);

  btn.innerText = "Conectando...";
  btn.disabled = true;

  try {
    const res = await fetch("/api/player/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        room_code: myRoom,
        player_name: myName,
        house: house,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      showScreen("view-wait");
      document.getElementById("wait-msg").innerText = "¡Estás dentro!";
      document.getElementById("wait-subtitle").innerText = "Mira la pantalla principal.";
      document.getElementById("points-feedback").className = "points-feedback";
      document.getElementById("points-feedback").innerText = "";

      iniciarRadarMovil();
      MagicSound.play("start");
    } else {
      alert("Error: " + data.detail);
      btn.innerText = "Entrar a la Sala";
      btn.disabled = false;
    }
  } catch (error) {
    alert("Error de conexión al castillo.");
    btn.innerText = "Entrar a la Sala";
    btn.disabled = false;
  }
});

function iniciarRadarMovil() {
  if (radarInterval) {
    clearInterval(radarInterval);
  }

  radarInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/room/${myRoom}/status`);
      if (!res.ok) return;

      const data = await res.json();
      const state = data.game_state || {};
      const phase = state.phase || "lobby";

      if (data.status === "playing" && phase !== "lobby" && !phase.includes("results_")) {
        renderMobileGame(state);
      }

      if (data.status === "lobby" || (data.status === "playing" && phase.includes("results_"))) {
        currentRoundKey = "";
        hasAnsweredCurrentRound = false;
        lastTickSecond = null;

        document.getElementById("m-botones").innerHTML = "";

        showScreen("view-wait");

        if (data.status === "lobby") {
          document.getElementById("wait-msg").innerText = "¡Estás dentro!";
          document.getElementById("wait-subtitle").innerText = "Mira la pantalla principal.";
          document.getElementById("points-feedback").className = "points-feedback";
          document.getElementById("points-feedback").innerText = "";
        } else {
          document.getElementById("wait-msg").innerText = "¡Mira la TV!";
          document.getElementById("wait-subtitle").innerText = "La ronda terminó. Revisa los resultados.";
        }
      }

      if (state.phase === "artes_ridiculas") {
        updateMobileTimer(state);
      }
    } catch (error) {
      console.error("Buscando conexión...");
    }
  }, 700);
}

function renderMobileGame(state) {
  const newKey = getRoundKey(state);

  showScreen("view-game");

  if (newKey === currentRoundKey) {
    if (state.phase === "artes_ridiculas") {
      updateMobileTimer(state);
    }

    return;
  }

  currentRoundKey = newKey;
  hasAnsweredCurrentRound = false;
  lastTickSecond = null;
  currentRoundStartedMs = state.started_at ? Number(state.started_at) * 1000 : Date.now();

  const pill = document.getElementById("game-pill");
  const aviso = document.getElementById("m-pregunta-aviso");
  const question = document.getElementById("m-question-small");
  const timer = document.getElementById("mobile-timer");
  const status = document.getElementById("mobile-status");
  const buttons = document.getElementById("m-botones");

  buttons.innerHTML = "";
  status.innerText = "Elige una opción.";

  if (["sombrero", "patronus_personalizado"].includes(state.phase)) {
    pill.innerText = "🗳️ Votación";
    aviso.innerText = "¡Vota por un jugador!";
    question.innerText = getQuestion(state);
    timer.style.display = "none";
  } else if (state.phase === "artes_ridiculas") {
    pill.innerText = "🛡️ Artes Ridículas";
    aviso.innerText = "¡Defiéndete en 6 segundos!";
    question.innerText = getQuestion(state);
    timer.style.display = "block";
  } else {
    pill.innerText = "✨ Minijuego";
    aviso.innerText = "¡Juega rápido!";
    question.innerText = getQuestion(state);
    timer.style.display = "none";
  }

  (state.options || []).forEach((option) => {
    const button = document.createElement("button");
    button.className = "option-btn";
    button.textContent = option;
    button.addEventListener("click", () => enviarRespuesta(option, button));
    buttons.appendChild(button);
  });

  updateMobileTimer(state);
  MagicSound.play("start");
}

function updateMobileTimer(state) {
  const timer = document.getElementById("mobile-timer");
  const bar = document.getElementById("mobile-timer-bar");

  if (!bar || state.phase !== "artes_ridiculas") return;

  timer.style.display = "block";

  const duration = Number(state.duration_seconds || 6);
  const started = state.started_at ? Number(state.started_at) * 1000 : currentRoundStartedMs;
  const elapsed = Math.max(0, Date.now() - started) / 1000;
  const left = Math.max(0, duration - elapsed);
  const pct = Math.max(0, Math.min(1, left / duration));

  bar.style.transform = `scaleX(${pct})`;

  const rounded = Math.ceil(left);

  if (rounded <= 3 && rounded > 0 && rounded !== lastTickSecond) {
    lastTickSecond = rounded;
    MagicSound.play("timer-danger");
  }
}

async function enviarRespuesta(option, clickedButton) {
  if (hasAnsweredCurrentRound) return;

  hasAnsweredCurrentRound = true;

  const elapsed = Math.max(0, Date.now() - currentRoundStartedMs);

  document.querySelectorAll(".option-btn").forEach((btn) => {
    btn.disabled = true;
    btn.classList.add("locked");
  });

  clickedButton.classList.remove("locked");
  clickedButton.classList.add("sent");

  document.getElementById("mobile-status").innerText = "Enviando respuesta...";
  MagicSound.play("send");

  try {
    const res = await fetch("/api/player/submit_answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        room_code: myRoom,
        player_name: myName,
        answer: option,
        client_elapsed_ms: elapsed,
      }),
    });

    const data = await res.json();

    showScreen("view-wait");

    document.getElementById("wait-msg").innerText = "¡Respuesta enviada!";
    document.getElementById("wait-subtitle").innerText = "Mira la TV para seguir la ronda.";

    const feedback = document.getElementById("points-feedback");

    if (typeof data.points === "number") {
      const labels = Array.isArray(data.labels) ? data.labels.join(" · ") : "";

      feedback.className = `points-feedback ${data.correct ? "good" : "bad"}`;
      feedback.innerText =
        `${data.points > 0 ? "+" : ""}${data.points} pts${labels ? " · " + labels : ""}`;

      MagicSound.play(data.correct ? "correct" : "wrong");
    } else {
      feedback.className = "points-feedback neutral";
      feedback.innerText = "Respuesta guardada.";
      MagicSound.play("correct");
    }
  } catch (error) {
    showScreen("view-wait");

    document.getElementById("wait-msg").innerText = "No se pudo enviar.";
    document.getElementById("wait-subtitle").innerText =
      "Revisa la conexión e intenta en la siguiente ronda.";

    const feedback = document.getElementById("points-feedback");
    feedback.className = "points-feedback bad";
    feedback.innerText = "Error de conexión.";

    MagicSound.play("wrong");
  }
}
