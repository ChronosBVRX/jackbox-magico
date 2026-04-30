(() => {
  if (window.__TvAuthorityFinalLoaded) return;
  window.__TvAuthorityFinalLoaded = true;

  const TV_COPY = "La TV controla la partida. Los celulares solo serán controles de jugador.";

  function forceText(el, text) {
    if (!el) return;
    if ((el.textContent || "") !== text) el.textContent = text;
  }

  function enforceCopy() {
    forceText(document.getElementById("host-status"), TV_COPY);

    document.querySelectorAll(".host-status, .host-help").forEach((el) => {
      const text = (el.textContent || "").toLowerCase();
      if (
        text.includes("host") ||
        text.includes("celular") ||
        text.includes("primer") ||
        text.includes("iniciar")
      ) {
        forceText(el, TV_COPY);
      }
    });
  }

  function hideLegacyHostControls() {
    const legacy = document.getElementById("controles-host");
    if (legacy) {
      legacy.hidden = true;
      legacy.setAttribute("aria-hidden", "true");
      legacy.style.display = "none";
    }
  }

  function showStoryControlsWhenLobby() {
    const lobbyVisible = document.getElementById("view-lobby")?.classList.contains("visible");
    const panel = document.getElementById("story-tv-controls");
    if (!panel) return;

    if (lobbyVisible && !document.body.classList.contains("tv-story-mode")) {
      panel.hidden = false;
      panel.removeAttribute("aria-hidden");
      panel.style.display = "block";
      panel.style.visibility = "visible";
      panel.style.opacity = "1";
    }
  }

  function sanitizeLobbyData(data) {
    const cloned = data && typeof data === "object" ? { ...data } : {};
    cloned.host = {
      name: "TV",
      claimed: true,
      managed_by: "tv",
    };
    if (cloned.game_state && typeof cloned.game_state === "object") {
      cloned.game_state = { ...cloned.game_state, host_authority: "tv", managed_by: "tv" };
    }
    return cloned;
  }

  function patchRenderLobby() {
    if (typeof window.renderLobby !== "function") return;
    if (window.renderLobby.__tvAuthorityFinal) return;

    const originalRenderLobby = window.renderLobby;

    window.renderLobby = function renderLobbyTvOnly(data) {
      const result = originalRenderLobby.call(this, sanitizeLobbyData(data));
      hardLockSoon();
      return result;
    };

    window.renderLobby.__tvAuthorityFinal = true;
  }

  function patchCreateRoom() {
    if (typeof window.crearSala !== "function") return;
    if (window.crearSala.__tvAuthorityFinal) return;

    const originalCrearSala = window.crearSala;

    window.crearSala = async function crearSalaTvOnly(...args) {
      const result = await originalCrearSala.apply(this, args);
      hardLockSoon();
      return result;
    };

    window.crearSala.__tvAuthorityFinal = true;
  }

  function injectFinalStyles() {
    if (document.getElementById("tv-authority-final-style")) return;
    const style = document.createElement("style");
    style.id = "tv-authority-final-style";
    style.textContent = `
      #controles-host { display: none !important; }
      #view-lobby.visible #story-tv-controls {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      body.tv-story-mode #story-tv-controls { display: none !important; }
    `;
    document.head.appendChild(style);
  }

  function hardLock() {
    injectFinalStyles();
    patchRenderLobby();
    patchCreateRoom();
    enforceCopy();
    hideLegacyHostControls();
    showStoryControlsWhenLobby();
  }

  function hardLockSoon() {
    hardLock();
    setTimeout(hardLock, 0);
    setTimeout(hardLock, 60);
    setTimeout(hardLock, 180);
    setTimeout(hardLock, 500);
  }

  function observeDom() {
    try {
      const observer = new MutationObserver(() => hardLock());
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["class", "style", "hidden", "aria-hidden"],
      });
    } catch (error) {}
  }

  document.addEventListener("DOMContentLoaded", () => {
    hardLockSoon();
    observeDom();
    setInterval(hardLock, 300);
  });

  hardLockSoon();
  setTimeout(hardLockSoon, 800);
  setTimeout(hardLockSoon, 1800);

  window.TvAuthorityFinal = { hardLock };
})();
