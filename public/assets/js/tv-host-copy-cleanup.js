(() => {
  const CLEAN_HOST_COPY = "La TV controla la partida. Los celulares solo serán controles de jugador.";

  function cleanCopy() {
    const hostStatus = document.getElementById("host-status");
    if (hostStatus && hostStatus.innerText !== CLEAN_HOST_COPY) {
      hostStatus.innerText = CLEAN_HOST_COPY;
    }

    document.querySelectorAll(".host-status, .host-help").forEach((el) => {
      const text = (el.innerText || "").toLowerCase();
      if (text.includes("primer celular") || text.includes("será el host") || text.includes("host inicie")) {
        el.innerText = CLEAN_HOST_COPY;
      }
    });
  }

  function injectStyles() {
    if (document.getElementById("tv-host-copy-cleanup-style")) return;
    const style = document.createElement("style");
    style.id = "tv-host-copy-cleanup-style";
    style.textContent = `
      #controles-host {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    cleanCopy();
    setInterval(cleanCopy, 500);
  });

  setTimeout(() => {
    injectStyles();
    cleanCopy();
  }, 300);
})();
