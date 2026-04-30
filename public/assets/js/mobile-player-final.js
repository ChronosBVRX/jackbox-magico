(() => {
  if (window.__MobilePlayerFinalLoaded) return;
  window.__MobilePlayerFinalLoaded = true;

  const PLAYER_COPY = "Mira la TV. Esta pantalla solo funciona como control de jugador.";

  function hideHostPanels() {
    ["host-panel", "host-game-panel"].forEach((id) => {
      const panel = document.getElementById(id);
      if (!panel) return;
      panel.hidden = true;
      panel.setAttribute("aria-hidden", "true");
      panel.classList.remove("visible");
      panel.style.display = "none";
    });
  }

  function patchHostFlags() {
    try { window.myIsHost = false; } catch (error) {}
    try { window.myHostToken = ""; } catch (error) {}

    if (typeof window.showHostPanels === "function" && !window.showHostPanels.__mobilePlayerFinal) {
      window.showHostPanels = function showHostPanelsPlayerOnly() {
        hideHostPanels();
      };
      window.showHostPanels.__mobilePlayerFinal = true;
    }
  }

  function patchJoinRoom() {
    if (typeof window.joinRoom !== "function") return;
    if (window.joinRoom.__mobilePlayerFinal) return;

    const originalJoinRoom = window.joinRoom;
    window.joinRoom = async function joinRoomPlayerOnly(...args) {
      const result = await originalJoinRoom.apply(this, args);
      try { window.myIsHost = false; } catch (error) {}
      try { window.myHostToken = ""; } catch (error) {}
      hardLockSoon();
      return result;
    };
    window.joinRoom.__mobilePlayerFinal = true;
  }

  function cleanCopy() {
    const waitPill = document.getElementById("wait-pill");
    if (waitPill && /host/i.test(waitPill.textContent || "")) waitPill.textContent = "🕯️ Jugador";

    const waitMsg = document.getElementById("wait-msg");
    if (waitMsg && /host|controlas/i.test(waitMsg.textContent || "")) waitMsg.textContent = "¡Estás dentro!";

    const waitSubtitle = document.getElementById("wait-subtitle");
    if (waitSubtitle && /host|inicia|controlas/i.test(waitSubtitle.textContent || "")) waitSubtitle.textContent = PLAYER_COPY;
  }

  function injectStyles() {
    if (document.getElementById("mobile-player-final-style")) return;
    const style = document.createElement("style");
    style.id = "mobile-player-final-style";
    style.textContent = `
      #host-panel,
      #host-game-panel {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function hardLock() {
    injectStyles();
    patchHostFlags();
    patchJoinRoom();
    hideHostPanels();
    cleanCopy();
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

  window.MobilePlayerFinal = { hardLock };
})();
