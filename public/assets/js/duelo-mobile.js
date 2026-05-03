(() => {
  const spellEmoji = {
    Expelliarmus: "🪄",
    Protego: "🛡️",
    Stupefy: "💥",
    Esquivar: "💨",
    Rictusempra: "😂",
  };

  const spellDescriptions = {
    Expelliarmus: "Desarma con estilo.",
    Protego: "Bloquea ataques.",
    Stupefy: "Aturde al rival.",
    Esquivar: "Evita el golpe.",
    Rictusempra: "Causa risas locas.",
  };

  function isMeDuelist(state) {
    const duelists = state.duelists || [];
    return duelists.some(d => d.name === (window.myName || ""));
  }

  function renderDuelMobile(state) {
    if (typeof window.showScreen === "function") window.showScreen("view-game");
    
    const panel = document.getElementById("duel-mobile-panel");
    if (!panel) return;

    // Ocultar otros paneles
    const others = ["sombrero-mobile-panel", "pociones-mobile-panel", "snitch-mobile-panel", "trivia-mobile-panel", "caldero-mobile-panel"];
    others.forEach(id => {
      const p = document.getElementById(id);
      if (p) { p.classList.remove("visible"); p.innerHTML = ""; }
    });

    panel.classList.add("visible");

    if (!isMeDuelist(state)) {
      renderSpectator(panel);
      return;
    }

    if (state.phase === "duelo") {
      renderDuelActions(state, panel);
    } else if (state.phase === "duelo_clash") {
      renderClashAction(state, panel);
    }
  }

  function renderSpectator(panel) {
    panel.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 4rem; margin-bottom: 20px;">🏟️</div>
        <h2 style="color: white; margin-bottom: 10px;">Eres espectador</h2>
        <p style="color: rgba(255,255,255,0.6);">No fuiste elegido para este duelo. ¡Mira la TV para ver quién sobrevive!</p>
      </div>
    `;
  }

  function renderDuelActions(state, panel) {
    const answers = state.answers || {};
    const alreadyAnswered = Boolean(answers[window.myName]);

    if (alreadyAnswered) {
      panel.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 4rem; margin-bottom: 20px;">✨</div>
          <h2 style="color: white; margin-bottom: 10px;">¡Hechizo Lanzado!</h2>
          <p style="color: rgba(255,255,255,0.6);">Espera a que tu rival elija o a que termine el tiempo.</p>
        </div>
      `;
      return;
    }

    panel.innerHTML = `
      <div class="duel-mobile-grid-premium">
        ${(state.options || []).map(spell => `
          <button class="duel-spell-btn-premium" onclick="dueloSubmit('${spell}', this)">
            <span class="emoji">${spellEmoji[spell] || "🪄"}</span>
            <div style="text-align: left;">
              <div style="font-size: 1.1rem;">${spell}</div>
              <div style="font-size: 0.75rem; opacity: 0.6; font-weight: 500;">${spellDescriptions[spell] || ""}</div>
            </div>
          </button>
        `).join("")}
      </div>
    `;
  }

  function renderClashAction(state, panel) {
    panel.innerHTML = `
      <div style="text-align: center;">
        <p style="color: var(--duel-gold); font-weight: 900; letter-spacing: 0.1em; margin-bottom: 10px;">¡RÁPIDO!</p>
        <button class="clash-btn-premium" onclick="dueloTap(this)">
          ⚡ TAP
        </button>
        <div id="duel-tap-count-premium" style="font-size: 3rem; font-weight: 1000; color: white; margin-top: 10px;">0</div>
      </div>
    `;
  }

  window.dueloSubmit = (spell, btn) => {
    if (btn.disabled) return;
    btn.classList.add("selected");
    if (typeof window.enviarRespuesta === "function") {
      window.enviarRespuesta(spell, btn);
    }
    if (window.navigator.vibrate) window.navigator.vibrate(20);
  };

  window.dueloTap = (btn) => {
    const counter = document.getElementById("duel-tap-count-premium");
    if (counter) {
      let val = parseInt(counter.innerText) + 1;
      counter.innerText = val;
    }
    if (typeof window.sendDuelClashTap === "function") {
      window.sendDuelClashTap();
    }
    // Efecto visual de escala al botón
    btn.style.transform = "scale(1.1)";
    setTimeout(() => btn.style.transform = "scale(1)", 50);
  };

  window.DueloMobile = {
    render: renderDuelMobile
  };

})();
