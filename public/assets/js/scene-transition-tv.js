(() => {
  function showTransition(message = "Preparando hechizos...") {
    const container = document.getElementById("transition-overlay");
    if (!container) return;

    container.innerHTML = `
      <div class="magic-transition-content">
        <div class="magic-spinner"></div>
        <div class="magic-text">${message}</div>
      </div>
    `;
    container.classList.add("visible");
  }

  function hideTransition() {
    const container = document.getElementById("transition-overlay");
    if (container) container.classList.remove("visible");
  }

  window.SceneTransition = { show: showTransition, hide: hideTransition };
})();
