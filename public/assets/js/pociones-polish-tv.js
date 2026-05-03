(() => {
  const houseIcons = {
    Gryffindor: "🦁",
    Slytherin: "🐍",
    Ravenclaw: "🦅",
    Hufflepuff: "🦡",
  };

  function esc(v) {
    return String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderPocionesTv(state, players) {
    const container = document.getElementById("game-container");
    if (!container) return;

    const duration = Number(state.memorize_seconds || 7);
    const mixDuration = Number(state.mix_seconds || 15);
    const totalDuration = duration + mixDuration;
    const elapsed = (Date.now() - (state.started_at * 1000)) / 1000;

    if (elapsed < duration) {
      renderMemorizePhase(state, elapsed, duration, container);
    } else {
      renderMixPhase(state, elapsed - duration, mixDuration, players, container);
    }
  }

  function renderMemorizePhase(state, elapsed, duration, container) {
    const pct = Math.max(0, Math.min(1, (duration - elapsed) / duration));
    const recipe = state.recipe || [];
    const ingredientMap = state.ingredient_map || {};
    const mode = state.potion_mode || "normal";

    container.innerHTML = `
      <div class="pociones-board-premium">
        ${mode === 'smoke' ? '<div class="pociones-smoke-overlay"></div>' : ''}
        
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
          <div>
            <div style="font-size: 0.8rem; color: var(--potion-green); font-weight: 900; letter-spacing: 0.2em; text-transform: uppercase;">Fase de Memorización</div>
            <h1 style="font-size: 3rem; font-weight: 1000; color: white; line-height: 1;">${esc(state.potion_name)}</h1>
            <div style="margin-top: 10px; font-size: 1rem; color: var(--potion-teal); font-weight: 700;">
              Modo: <span style="color: white;">${mode.toUpperCase()}</span> | 
              Dificultad: <span style="color: white;">${esc(state.difficulty).toUpperCase()}</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 3.5rem; font-weight: 900; color: white; line-height: 1;">${Math.ceil(duration - elapsed)}</div>
            <div style="font-size: 0.7rem; opacity: 0.5;">SEGUNDOS</div>
          </div>
        </div>

        <div class="pociones-recipe-grid">
          ${recipe.map((name, i) => {
            const ing = ingredientMap[name] || { emoji: "🧪" };
            return `
              <div class="pociones-recipe-item" style="animation-delay: ${i * 0.1}s">
                <div class="emoji">${ing.emoji}</div>
                <div class="name">${esc(name)}</div>
                <div style="font-size: 0.7rem; opacity: 0.3; margin-top: 5px;">PASO ${i + 1}</div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="text-align: center; margin-top: 40px; font-size: 1.5rem; font-weight: 700; color: rgba(255,255,255,0.7);">
          "${esc(state.narrator)}"
        </div>

        <div class="pociones-timer-container">
          <div class="pociones-timer-bar" style="width: ${pct * 100}%"></div>
        </div>
      </div>
    `;
  }

  function renderMixPhase(state, elapsed, duration, players, container) {
    const pct = Math.max(0, Math.min(1, (duration - elapsed) / duration));
    const submitted = state.potion_submitted_players || [];
    const mode = state.potion_mode || "normal";

    container.innerHTML = `
      <div class="pociones-board-premium" style="border-color: var(--potion-purple);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
          <div>
            <div style="font-size: 0.8rem; color: var(--potion-purple); font-weight: 900; letter-spacing: 0.2em; text-transform: uppercase;">Fase de Mezcla</div>
            <h1 style="font-size: 3rem; font-weight: 1000; color: white; line-height: 1;">¡A mezclar!</h1>
            <p style="margin-top: 10px; color: rgba(255,255,255,0.6);">La receta ha desaparecido. Confía en tu memoria.</p>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 3.5rem; font-weight: 900; color: white; line-height: 1;">${Math.ceil(duration - elapsed)}</div>
            <div style="font-size: 0.7rem; opacity: 0.5;">SEGUNDOS</div>
          </div>
        </div>

        <div style="display: flex; gap: 20px; justify-content: center; margin: 40px 0;">
          ${(players || []).map(p => {
            const done = submitted.includes(p.name);
            return `
              <div style="width: 80px; display: flex; flex-direction: column; align-items: center; opacity: ${done ? 1 : 0.3}; transition: all 0.3s;">
                <div style="font-size: 2.5rem; filter: ${done ? 'none' : 'grayscale(1)'}">${houseIcons[p.house] || '✨'}</div>
                <div style="font-size: 0.7rem; font-weight: 800; color: white; text-align: center; margin-top: 5px;">${esc(p.name)}</div>
                ${done ? '<div style="color: var(--potion-green); font-size: 0.6rem; font-weight: 900;">LISTO</div>' : ''}
              </div>
            `;
          }).join('')}
        </div>

        <div style="text-align: center; padding: 20px; background: rgba(0,0,0,0.2); border-radius: 20px; border: 1px dashed rgba(255,255,255,0.1);">
           ${mode === 'reverse' ? '⚠️ <strong>¡CUIDADO!</strong> El caldero pidió la receta invertida.' : '🧪 Mezclando ingredientes mágicos...'}
        </div>

        <div class="pociones-timer-container">
          <div class="pociones-timer-bar" style="width: ${pct * 100}%; background: linear-gradient(90deg, var(--potion-purple), #ec4899); box-shadow: 0 0 20px var(--potion-purple);"></div>
        </div>
      </div>
    `;
  }

  function renderPocionesResults(state, extraContainer) {
    const res = state.pociones_result || {};
    const recipe = res.recipe || [];
    const ingredientMap = state.ingredient_map || {};
    const playerResults = res.player_results || [];

    extraContainer.innerHTML = `
      <div class="pociones-board-premium" style="background: linear-gradient(180deg, #061217, #020617);">
        <div style="text-align: center; margin-bottom: 40px;">
          <div style="font-size: 0.8rem; color: var(--potion-green); font-weight: 900; letter-spacing: 0.2em; text-transform: uppercase;">Resultados de Clase</div>
          <h1 style="font-size: 4rem; font-weight: 1000; color: white;">${esc(res.potion_name)}</h1>
        </div>

        <div style="margin-bottom: 40px;">
          <h3 style="font-size: 0.9rem; color: rgba(255,255,255,0.4); text-transform: uppercase; margin-bottom: 15px; text-align: center;">Receta Correcta</h3>
          <div style="display: flex; justify-content: center; gap: 15px;">
            ${recipe.map(name => {
              const ing = ingredientMap[name] || { emoji: "🧪" };
              return `<div style="font-size: 2rem; background: var(--potion-glass); padding: 10px; border-radius: 15px;" title="${esc(name)}">${ing.emoji}</div>`;
            }).join(' <span style="align-self: center; opacity: 0.3;">→</span> ')}
          </div>
        </div>

        <div class="pociones-results-grid">
          ${playerResults.map(p => `
            <div class="pociones-result-card ${p.perfect ? 'perfect' : ''} ${p.exploded ? 'exploded' : ''}">
              <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 2.2rem;">${houseIcons[p.house] || '✨'}</div>
                <div>
                  <div style="font-weight: 900; color: white;">${esc(p.player_name)}</div>
                  <div style="font-size: 0.7rem; opacity: 0.6;">${esc(p.label)}</div>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 1.5rem; font-weight: 1000; color: var(--potion-green);">${p.points > 0 ? '+' : ''}${p.points}</div>
                <div style="font-size: 0.6rem; opacity: 0.4;">PUNTOS</div>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 40px; padding: 20px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center; color: var(--potion-teal); font-style: italic;">
          "${esc(res.narrator)}"
        </div>
      </div>
    `;
  }

  window.PocionesTv = {
    render: renderPocionesTv,
    renderResults: renderPocionesResults
  };

})();
