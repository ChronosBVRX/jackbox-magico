(() => {
  const PLAYER_WAIT = {
    pill: "🕯️ Aspirante",
    title: "¡Sala preparada!",
    subtitle: "Observa la Gran Pantalla. Tu destino y la historia se revelarán allí.",
  };
 
  const PLAYER_RESULTS = {
    pill: "🏆 Sabiduría",
    title: "¡Hechizos resueltos!",
    subtitle: "Los resultados están apareciendo en la TV. ¿Habrás ganado puntos para tu casa?",
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


  function patchHostFunctions() {
    if (window.__mobilePlayerOnlyPatched) return;
    window.__mobilePlayerOnlyPatched = true;

    const originalShowHostPanels = window.showHostPanels;
    window.showHostPanels = function playerOnlyShowHostPanels() {
      try {
        if (typeof originalShowHostPanels === "function") originalShowHostPanels(false);
      } catch (error) {}
      hideLegacyHostUi();
      purgeHostTokens();
    };

    ["hostStartSelectedGame", "hostRevealResults", "hostReturnLobby", "hostTriviaNext"].forEach((name) => {
      window[name] = function blockedMobileHostAction() {
        purgeHostTokens();
        hideLegacyHostUi();
        alert("La TV controla la partida. Tu celular es solo control de jugador.");
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
    hideLegacyHostUi();
  }

  document.addEventListener("DOMContentLoaded", () => {
    tick();
  });

  setTimeout(tick, 100);
})();
