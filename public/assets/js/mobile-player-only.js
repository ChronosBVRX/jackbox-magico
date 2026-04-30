(() => {
  const PLAYER_WAIT = {
    pill: "🕯️ Jugador",
    title: "¡Estás dentro!",
    subtitle: "Mira la TV. La pantalla principal controla la historia y las rondas.",
  };

  const PLAYER_RESULTS = {
    pill: "🏆 Resultados",
    title: "¡Mira la TV!",
    subtitle: "La TV controla los resultados y el avance de la partida.",
  };

  function purgeHostTokens() {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith("jackbox_magico_host_token_"))
        .forEach((key) => localStorage.removeItem(key));
    } catch (error) {}

    try { window.myIsHost = false; } catch (error) {}
    try { window.myHostToken = ""; } catch (error) {}
  }

  function patchFetch() {
    if (window.__mobilePlayerOnlyFetchPatched) return;
    window.__mobilePlayerOnlyFetchPatched = true;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async function patchedFetch(input, init = {}) {
      const url = typeof input === "string" ? input : String(input?.url || "");

      if (url.includes("/api/mobile/host/")) {
        purgeHostTokens();
        return new Response(JSON.stringify({
          detail: "Los celulares no pueden ser host. La TV controla la partida.",
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      const response = await originalFetch(input, init);

      if (url.includes("/api/player/join")) {
        purgeHostTokens();

        try {
          const cloned = response.clone();
          const data = await cloned.json();
          data.is_host = false;
          data.host_token = null;
          data.host_name = "TV";

          return new Response(JSON.stringify(data), {
            status: response.status,
            statusText: response.statusText,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          return response;
        }
      }

      return response;
    };
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && el.innerText !== value) el.innerText = value;
  }

  function removeLegacyHostUi() {
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
        if (el && el.parentElement) {
          el.remove();
        }
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

    const isResults = text.includes("resultado") || text.includes("mira la tv") || text.includes("ronda terminó");

    if (isResults) {
      setText("wait-pill", PLAYER_RESULTS.pill);
      setText("wait-msg", PLAYER_RESULTS.title);
      setText("wait-subtitle", PLAYER_RESULTS.subtitle);
      return;
    }

    setText("wait-pill", PLAYER_WAIT.pill);
    setText("wait-msg", PLAYER_WAIT.title);
    setText("wait-subtitle", PLAYER_WAIT.subtitle);
  }

  function patchHostFunctions() {
    if (window.__mobilePlayerOnlyPatched) return;
    window.__mobilePlayerOnlyPatched = true;

    window.showHostPanels = function playerOnlyShowHostPanels() {
      removeLegacyHostUi();
      purgeHostTokens();
    };

    ["hostStartSelectedGame", "hostRevealResults", "hostReturnLobby", "hostTriviaNext"].forEach((name) => {
      window[name] = function mobilePlayerOnlyAction() {
        purgeHostTokens();
        removeLegacyHostUi();
      };
    });
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
    patchFetch();
    patchHostFunctions();
    purgeHostTokens();
    removeLegacyHostUi();
    normalizeWaitingCopy();
  }

  document.addEventListener("DOMContentLoaded", () => {
    tick();
    setInterval(tick, 250);
  });

  setTimeout(tick, 100);
  setTimeout(tick, 700);
})();
