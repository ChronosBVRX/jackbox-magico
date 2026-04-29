(() => {
  const PLAYER_WAIT = {
    pill: "🕯️ Jugador",
    title: "¡Estás dentro!",
    subtitle: "Mira la TV. La pantalla principal controla la historia y las rondas.",
  };

  const PLAYER_RESULTS = {
    pill: "🏆 Resultados",
    title: "¡Mira la TV!",
    subtitle: "Cuando aparezca el botón, confirma que estás listo para continuar.",
  };

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && el.innerText !== value) el.innerText = value;
  }

  function hideLegacyHostUi() {
    const selectors = [
      "#host-panel",
      "#host-game-panel",
      ".host-panel",
      ".trivia-mobile-host-extra",
      "#host-game-select",
      "#host-start-btn",
    ];

    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        el.classList.remove("visible");
        el.setAttribute("aria-hidden", "true");
        el.style.setProperty("display", "none", "important");
        el.style.setProperty("visibility", "hidden", "important");
        el.style.setProperty("pointer-events", "none", "important");
      });
    });
  }

  function normalizeWaitingCopy() {
    const waitPill = document.getElementById("wait-pill");
    const waitMsg = document.getElementById("wait-msg");
    const waitSubtitle = document.getElementById("wait-subtitle");

    const text = [waitPill?.innerText, waitMsg?.innerText, waitSubtitle?.innerText]
      .join(" ")
      .toLowerCase();

    const isHostText = text.includes("host") || text.includes("controlas") || text.includes("inicia un minijuego");
    const isResults = text.includes("resultado") || text.includes("mira la tv") || text.includes("ronda terminó");

    if (isResults) {
      setText("wait-pill", PLAYER_RESULTS.pill);
      setText("wait-msg", PLAYER_RESULTS.title);
      setText("wait-subtitle", PLAYER_RESULTS.subtitle);
      return;
    }

    if (isHostText) {
      setText("wait-pill", PLAYER_WAIT.pill);
      setText("wait-msg", PLAYER_WAIT.title);
      setText("wait-subtitle", PLAYER_WAIT.subtitle);
    }
  }

  function patchHostFunctions() {
    if (window.__mobilePlayerOnlyPatched) return;
    window.__mobilePlayerOnlyPatched = true;

    const originalShowHostPanels = window.showHostPanels;
    window.showHostPanels = function playerOnlyShowHostPanels() {
      try {
        if (typeof originalShowHostPanels === "function") originalShowHostPanels(false);
      } catch (error) {}
      hideLegacyHostUi();
    };

    const originalRenderLobbyWait = window.renderLobbyWait;
    if (typeof originalRenderLobbyWait === "function") {
      window.renderLobbyWait = function patchedRenderLobbyWait(...args) {
        const result = originalRenderLobbyWait.apply(this, args);
        hideLegacyHostUi();
        normalizeWaitingCopy();
        return result;
      };
    }

    const originalRenderAnsweredWait = window.renderAnsweredWait;
    if (typeof originalRenderAnsweredWait === "function") {
      window.renderAnsweredWait = function patchedRenderAnsweredWait(...args) {
        const result = originalRenderAnsweredWait.apply(this, args);
        hideLegacyHostUi();
        normalizeWaitingCopy();
        return result;
      };
    }

    const originalRenderResultsWait = window.renderResultsWait;
    if (typeof originalRenderResultsWait === "function") {
      window.renderResultsWait = function patchedRenderResultsWait(...args) {
        const result = originalRenderResultsWait.apply(this, args);
        hideLegacyHostUi();
        normalizeWaitingCopy();
        return result;
      };
    }
  }

  function injectStyles() {
    if (document.getElementById("mobile-player-only-style")) return;
    const style = document.createElement("style");
    style.id = "mobile-player-only-style";
    style.textContent = `
      #host-panel,
      #host-game-panel,
      .host-panel,
      .trivia-mobile-host-extra,
      #host-game-select,
      #host-start-btn {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }

      body.player-only-mode #wait-pill {
        color: #271600 !important;
        background: linear-gradient(135deg, #fff8d6, #facc15) !important;
      }
    `;
    document.head.appendChild(style);
  }

  function tick() {
    document.body.classList.add("player-only-mode");
    injectStyles();
    patchHostFunctions();
    hideLegacyHostUi();
    normalizeWaitingCopy();
  }

  document.addEventListener("DOMContentLoaded", () => {
    tick();
    setInterval(tick, 300);
  });

  setTimeout(tick, 200);
})();
