(function () {
  let lastTvRenderKey = "";
  let lastMobileRenderKey = "";
  let lastResultsRenderKey = "";

  function phaseOf(dataOrState) {
    if (!dataOrState) return "";
    if (dataOrState.game_state) return dataOrState.game_state.phase || "";
    return dataOrState.phase || "";
  }

  function getMapaVisualStep(state) {
    if (!window.MapaTravieso || !state) return "unknown";

    const info = window.MapaTravieso.getPhaseInfo(state);
    return info.step || "unknown";
  }

  function getRoundKey(state) {
    return [
      state.phase || "",
      state.round_id || "",
      getMapaVisualStep(state),
    ].join("-");
  }

  function isMapaPlaying(phase) {
    return phase === "mapa_travieso";
  }

  function isMapaResults(phase) {
    return phase === "results_mapa_travieso";
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.innerText = value;
  }

  function show(id) {
    if (typeof window.showScreen === "function") {
      window.showScreen(id);
      return;
    }

    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("visible");
    });

    const target = document.getElementById(id);
    if (target) target.classList.add("visible");
  }

  function play(name) {
    try {
      if (window.MagicSound && typeof window.MagicSound.play === "function") {
        window.MagicSound.play(name);
      }
    } catch (error) {}
  }

  function updateTvTimerOnly(data) {
    const state = data.game_state || {};
    if (!window.MapaTravieso) return;

    const info = window.MapaTravieso.getPhaseInfo(state);
    const timer = document.querySelector(".mapa-tv-timer strong");
    const label = document.querySelector(".mapa-tv-timer span");

    if (timer) timer.innerText = Math.ceil(info.left);
    if (label) label.innerText = info.step === "observe" ? "Memoriza" : "Responde";
  }

  function renderMapaTv(data) {
    show("view-game");

    const container = document.getElementById("game-container");
    if (!container || !window.MapaTravieso) return false;

    const state = data.game_state || {};
    const renderKey = getRoundKey(state);

    if (lastTvRenderKey === renderKey && container.innerHTML.trim()) {
      updateTvTimerOnly(data);
      return true;
    }

    lastTvRenderKey = renderKey;
    container.innerHTML = window.MapaTravieso.renderTv(data);

    return true;
  }

  function renderMapaTvResults(data) {
    show("view-game");

    const container = document.getElementById("game-container");
    if (!container || !window.MapaTravieso) return false;

    const state = data.game_state || {};
    const renderKey = `results-${state.round_id || ""}-${state.phase || ""}`;

    if (lastResultsRenderKey === renderKey && container.innerHTML.trim()) {
      return true;
    }

    lastResultsRenderKey = renderKey;
    play("reveal");
    container.innerHTML = window.MapaTravieso.renderResults(data);

    return true;
  }

  function updateMobileTimerFromMapa(state) {
    const timer = document.getElementById("mobile-timer");
    const bar = document.getElementById("mobile-timer-bar");

    if (!window.MapaTravieso || !bar) return;

    const info = window.MapaTravieso.getPhaseInfo(state);
    const pct = Math.max(0, Math.min(1, info.left / Math.max(1, info.total)));

    if (timer) timer.style.display = "block";
    bar.style.transform = `scaleX(${pct})`;

    setText(
      "mobile-status",
      info.step === "observe"
        ? `Memoriza el mapa en la TV. Se ocultará en ${Math.ceil(info.left)}s.`
        : `Responde rápido. Tiempo restante: ${Math.ceil(info.left)}s.`
    );
  }

  function renderMapaMobile(state) {
    if (!window.MapaTravieso) return false;

    show("view-game");

    const buttons = document.getElementById("m-botones");
    if (buttons) buttons.innerHTML = "";

    const info = window.MapaTravieso.getPhaseInfo(state);

    setText("game-pill", "🗺️ Mapa Travieso");
    setText(
      "m-pregunta-aviso",
      info.step === "observe" ? "¡Memoriza el mapa!" : "¡El mapa se cerró!"
    );
    setText(
      "m-question-small",
      info.step === "observe"
        ? "Mira la pantalla principal. Los objetos desaparecerán en segundos."
        : state.question || "Elige la zona correcta."
    );

    updateMobileTimerFromMapa(state);

    let panel = document.getElementById("mapa-mobile-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "mapa-mobile-panel";
      panel.className = "trivia-mobile-panel";

      const hostPanel = document.getElementById("host-game-panel");
      const card = document.querySelector("#view-game .card");

      if (hostPanel && hostPanel.parentElement) {
        hostPanel.parentElement.insertBefore(panel, hostPanel);
      } else if (card) {
        card.appendChild(panel);
      }
    }

    panel.classList.add("visible");

    const renderKey = getRoundKey(state);

    if (lastMobileRenderKey !== renderKey || !panel.innerHTML.trim()) {
      lastMobileRenderKey = renderKey;
      panel.innerHTML = window.MapaTravieso.renderMobile(state);
    }

    return true;
  }

  function installBridge() {
    if (!window.MapaTravieso) return false;

    let installedSomething = false;

    if (typeof window.renderPlaying === "function" && !window.renderPlaying.__mapaTraviesoWrapped) {
      const originalRenderPlaying = window.renderPlaying;

      const wrappedRenderPlaying = function (data) {
        const phase = phaseOf(data);

        if (isMapaPlaying(phase)) {
          return renderMapaTv(data);
        }

        return originalRenderPlaying.apply(this, arguments);
      };

      wrappedRenderPlaying.__mapaTraviesoWrapped = true;
      window.renderPlaying = wrappedRenderPlaying;
      installedSomething = true;
    }

    if (typeof window.renderResults === "function" && !window.renderResults.__mapaTraviesoWrapped) {
      const originalRenderResults = window.renderResults;

      const wrappedRenderResults = function (data) {
        const phase = phaseOf(data);

        if (isMapaResults(phase)) {
          return renderMapaTvResults(data);
        }

        return originalRenderResults.apply(this, arguments);
      };

      wrappedRenderResults.__mapaTraviesoWrapped = true;
      window.renderResults = wrappedRenderResults;
      installedSomething = true;
    }

    if (typeof window.renderMobileGame === "function" && !window.renderMobileGame.__mapaTraviesoWrapped) {
      const originalRenderMobileGame = window.renderMobileGame;

      const wrappedRenderMobileGame = function (state) {
        const phase = phaseOf(state);

        if (isMapaPlaying(phase)) {
          return renderMapaMobile(state);
        }

        return originalRenderMobileGame.apply(this, arguments);
      };

      wrappedRenderMobileGame.__mapaTraviesoWrapped = true;
      window.renderMobileGame = wrappedRenderMobileGame;
      installedSomething = true;
    }

    return installedSomething;
  }

  let attempts = 0;

  const bridgeTimer = setInterval(() => {
    attempts += 1;

    if (installBridge() || attempts > 60) {
      clearInterval(bridgeTimer);
    }
  }, 100);

  document.addEventListener("DOMContentLoaded", installBridge);
  window.addEventListener("load", installBridge);
})();
