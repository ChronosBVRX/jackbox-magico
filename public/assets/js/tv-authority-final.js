(() => {
  if (window.__TvAuthorityFinalLoaded) return;
  window.__TvAuthorityFinalLoaded = true;

  const TV_COPY = "La TV controla la partida. Los celulares solo serán controles de jugador.";
  let lastLockAt = 0;

  function setTextIfNeeded(el, text) {
    if (!el) return;
    if ((el.textContent || "") !== text) el.textContent = text;
  }

  function enforceCopy() {
    setTextIfNeeded(document.getElementById("host-status"), TV_COPY);
  }

  function hideLegacyHostControls() {
    const legacy = document.getElementById("controles-host");
    if (!legacy) return;
    legacy.hidden = true;
    legacy.setAttribute("aria-hidden", "true");
    if (legacy.style.display !== "none") legacy.style.display = "none";
  }

  function showStoryControlsWhenLobby() {
    const lobbyVisible = document.getElementById("view-lobby")?.classList.contains("visible");
    const panel = document.getElementById("story-tv-controls");
    if (!panel || !lobbyVisible || document.body.classList.contains("tv-story-mode")) return;

    if (panel.hidden) panel.hidden = false;
    if (panel.getAttribute("aria-hidden") === "true") panel.removeAttribute("aria-hidden");
    if (panel.style.display === "none") panel.style.display = "block";
  }

  function sanitizeLobbyData(data) {
    const cloned = data && typeof data === "object" ? { ...data } : {};
    cloned.host = { name: "TV", claimed: true, managed_by: "tv" };
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
      window.requestAnimationFrame(() => hardLock());
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
      window.requestAnimationFrame(() => hardLock());
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
      #view-lobby.visible #story-tv-controls { display: block !important; }
      body.tv-story-mode #story-tv-controls { display: none !important; }
    `;
    document.head.appendChild(style);
  }

  function hardLock() {
    const now = Date.now();
    if (now - lastLockAt < 250) return;
    lastLockAt = now;

    injectFinalStyles();
    patchRenderLobby();
    patchCreateRoom();
    enforceCopy();
    hideLegacyHostControls();
    showStoryControlsWhenLobby();
  }

  document.addEventListener("DOMContentLoaded", () => {
    hardLock();
    setTimeout(hardLock, 500);
    setTimeout(hardLock, 1500);
    setInterval(hardLock, 2500);
  });

  setTimeout(hardLock, 0);
  setTimeout(hardLock, 800);

  window.TvAuthorityFinal = { hardLock };
})();
