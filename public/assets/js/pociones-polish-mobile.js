(() => {
  let currentSelection = [];

  function esc(v) {
    return String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderPocionesMobile(state) {
    const panel = document.getElementById("pociones-mobile-panel");
    if (!panel) return;

    if (typeof window.showScreen === "function") window.showScreen("view-game");

    const duration = Number(state.memorize_seconds || 7);
    const elapsed = (Date.now() - (state.started_at * 1000)) / 1000;

    if (elapsed < duration) {
      renderMobileMemorize(state, elapsed, duration, panel);
      currentSelection = [];
    } else {
      renderMobileMix(state, panel);
    }
  }

  function renderMobileMemorize(state, elapsed, duration, panel) {
    panel.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 5rem; margin-bottom: 20px; animation: float 3s infinite ease-in-out;">🧪</div>
        <h2 style="color: white; font-weight: 900; font-size: 1.8rem; line-height: 1.1;">MEMORIZA LA RECETA</h2>
        <p style="color: rgba(255,255,255,0.6); margin-top: 15px;">Mira la TV atentamente. La receta desaparecerá pronto.</p>
        
        <div style="margin-top: 40px;">
          <div style="font-size: 4rem; font-weight: 1000; color: var(--potion-green);">${Math.ceil(duration - elapsed)}</div>
          <div style="font-size: 0.8rem; opacity: 0.5; letter-spacing: 0.2em;">PÁPALE...</div>
        </div>
      </div>
      <style>
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
      </style>
    `;
  }

  function renderMobileMix(state, panel) {
    const myName = window.myName || "";
    const answers = state.answers || {};
    
    if (answers[myName]) {
      const res = answers[myName];
      panel.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 5rem; margin-bottom: 20px;">${res.perfect ? '✨' : res.exploded ? '💥' : '🧪'}</div>
          <h2 style="color: white; font-weight: 900;">¡Poción entregada!</h2>
          <p style="color: rgba(255,255,255,0.7); margin-top: 15px;">${esc(res.message || "Mira la TV para los resultados.")}</p>
        </div>
      `;
      return;
    }

    const shuffled = state.shuffled_ingredients || [];
    const ingredientMap = state.ingredient_map || {};
    const mode = state.potion_mode || "normal";

    panel.innerHTML = `
      <div class="pociones-mobile-wrap">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
           <div style="font-size: 0.7rem; font-weight: 900; color: var(--potion-purple); letter-spacing: 0.1em; text-transform: uppercase;">FASE DE MEZCLA</div>
           ${mode === 'reverse' ? '<span style="color: #ef4444; font-weight: 900; font-size: 0.7rem;">⚠️ INVERTIDA</span>' : ''}
        </div>

        <h3 style="color: white; font-weight: 800; font-size: 1.2rem; margin-bottom: 5px;">${esc(state.potion_name)}</h3>
        <p style="font-size: 0.85rem; color: rgba(255,255,255,0.5); margin-bottom: 15px;">
           ${mode === 'reverse' ? '¡Agrégalos en ORDEN INVERSO!' : 'Toca los ingredientes en orden:'}
        </p>

        <div class="pociones-mix-area" id="mix-slots">
          <!-- Tokens dynamically added -->
        </div>

        <div class="pociones-mobile-ingredients">
          ${shuffled.map(name => {
            const ing = ingredientMap[name] || { emoji: "🧪" };
            return `
              <div class="pociones-mobile-card" onclick="addIngredient('${esc(name)}', '${ing.emoji}')">
                <div style="font-size: 2rem;">${ing.emoji}</div>
                <div style="font-size: 0.6rem; font-weight: 700; color: white; text-align: center; line-height: 1;">${esc(name)}</div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 10px; margin-top: 20px;">
          <button onclick="clearMix()" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 15px; border-radius: 15px; font-weight: 800;">BORRAR</button>
          <button onclick="submitPotion()" id="btn-potion-submit" style="background: var(--potion-green); border: none; color: black; padding: 15px; border-radius: 15px; font-weight: 900; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">ENTREGAR POCIÓN</button>
        </div>
      </div>
    `;
    
    updateMixSlots();
  }

  window.addIngredient = (name, emoji) => {
    if (currentSelection.length >= 8) return;
    currentSelection.push(name);
    updateMixSlots();
    if (window.navigator.vibrate) window.navigator.vibrate(20);
  };

  window.clearMix = () => {
    currentSelection = [];
    updateMixSlots();
  };

  function updateMixSlots() {
    const area = document.getElementById("mix-slots");
    const btn = document.getElementById("btn-potion-submit");
    if (!area) return;

    if (currentSelection.length === 0) {
      area.innerHTML = '<span style="opacity: 0.3; font-style: italic; font-size: 0.9rem;">Tu caldero está vacío...</span>';
      if (btn) btn.style.opacity = "0.5";
    } else {
      area.innerHTML = currentSelection.map(name => {
        // Encontrar emoji (simplificado para mobile js)
        const emoji = "🧪"; // Podríamos pasar el mapa completo pero simplificamos
        return `<div class="pociones-mix-token">${emoji}</div>`;
      }).join('');
      if (btn) btn.style.opacity = "1";
    }
  }

  window.submitPotion = () => {
    if (currentSelection.length === 0) return;
    
    const btn = document.getElementById("btn-potion-submit");
    if (btn) {
      btn.disabled = true;
      btn.innerText = "ENTREGANDO...";
      btn.style.opacity = "0.5";
    }

    if (typeof window.enviarRespuesta === "function") {
      window.enviarRespuesta(currentSelection);
    }
    
    if (window.navigator.vibrate) window.navigator.vibrate([30, 50, 30]);
  };

  window.PocionesMobile = {
    render: renderPocionesMobile
  };

})();
