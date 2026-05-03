(() => {
  const houseIcons = {
    Gryffindor: "🦁",
    Slytherin: "🐍",
    Ravenclaw: "🦅",
    Hufflepuff: "🦡",
  };

  const houseColors = {
    Gryffindor: "#ef4444",
    Slytherin: "#22c55e",
    Ravenclaw: "#3b82f6",
    Hufflepuff: "#facc15",
  };

  function esc(v) {
    return String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderDuelTv(state) {
    const container = document.getElementById("game-container");
    if (!container) return;

    const phase = state.phase;
    const duelists = state.duelists || [];
    if (duelists.length < 2) {
        container.innerHTML = `<div class="duel-board-premium"><h1 class="result-winner-announcement">Esperando magos...</h1></div>`;
        return;
    }

    if (phase === "duelo") {
      renderActiveDuel(state, container);
    } else if (phase === "duelo_clash") {
      renderClash(state, container);
    }
  }

  function renderActiveDuel(state, container) {
    const p1 = state.duelists[0];
    const p2 = state.duelists[1];
    const answers = state.answers || {};

    const duration = Number(state.duration_seconds || 7);
    const elapsed = (Date.now() - (state.started_at * 1000)) / 1000;
    const left = Math.max(0, duration - elapsed);
    const pct = Math.max(0, Math.min(1, left / duration));

    container.innerHTML = `
      <div class="duel-board-premium">
        <div class="badge">⚔️ DUELO DE CASAS</div>
        <h1 class="duel-name-premium" style="text-align: center; margin-bottom: 10px;">${esc(state.title || "Duelo de Hechizos")}</h1>
        <p class="duel-subtitle">${esc(state.question || "¡Varitas arriba!")}</p>

        <div class="duel-vs-premium">
          <div class="duel-player-premium left" style="--dir: -50px; border-left: 5px solid ${houseColors[p1.house]}">
            <div class="duel-house-label">${houseIcons[p1.house]} ${esc(p1.house)}</div>
            <div class="duel-name-premium">${esc(p1.name)}</div>
            <div class="duel-status-badge ${answers[p1.name] ? "ready" : ""}">${answers[p1.name] ? "✨ HECHIZO LISTO" : "⏳ ELIGIENDO..."}</div>
          </div>

          <div class="vs-sphere-wrap">
            <div class="vs-glow"></div>
            <div class="vs-sphere">VS</div>
          </div>

          <div class="duel-player-premium right" style="--dir: 50px; border-right: 5px solid ${houseColors[p2.house]}">
            <div class="duel-house-label">${esc(p2.house)} ${houseIcons[p2.house]}</div>
            <div class="duel-name-premium">${esc(p2.name)}</div>
            <div class="duel-status-badge ${answers[p2.name] ? "ready" : ""}">${answers[p2.name] ? "✨ HECHIZO LISTO" : "⏳ ELIGIENDO..."}</div>
          </div>
        </div>

        <div class="clash-meter-wrap" style="height: 12px; margin-top: 20px;">
           <div class="clash-bar-left" style="width: ${pct * 100}%; background: linear-gradient(90deg, #facc15, #ef4444);"></div>
        </div>
        <p style="text-align:center; margin-top: 10px; font-weight: 900; color: rgba(255,255,255,0.5)">TIEMPO: ${left.toFixed(1)}s</p>

        <div class="duel-status" style="margin-top: 30px;">
          ${esc(state.narrator || "El Gran Comedor guarda silencio...")}
        </div>
      </div>
    `;
  }

  function renderClash(state, container) {
    const p1 = state.duelists[0];
    const p2 = state.duelists[1];
    const clash = state.clash || {};
    const taps = clash.taps || {};
    const t1 = taps[p1.name] || 0;
    const t2 = taps[p2.name] || 0;
    const total = (t1 + t2) || 1;

    // Calculamos posición del marcador (0 a 100%)
    // Si t1 == t2, el marcador está al 50%.
    // Si t1 > t2, el marcador se mueve a la derecha (>50%).
    let pos = 50;
    if (t1 + t2 > 0) {
      const diff = t1 - t2;
      const range = Math.max(t1, t2, 10); // Escala dinámica
      pos = 50 + (diff / range) * 40; 
    }
    pos = Math.max(10, Math.min(90, pos));

    container.innerHTML = `
      <div class="duel-board-premium" style="background: radial-gradient(circle at center, rgba(239, 68, 68, 0.15), #020617);">
        <div class="badge gold">⚡ CHOQUE DE VARITAS</div>
        <h1 class="duel-name-premium result-glow-text" style="text-align: center; margin-bottom: 20px;">¡PRESIONEN AHORA!</h1>

        <div class="duel-vs-premium">
          <div class="duel-player-premium left" style="--dir: 0; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3);">
            <div class="duel-name-premium">${esc(p1.name)}</div>
            <div style="font-size: 5rem; font-weight: 1000; color: #ef4444;">${t1}</div>
            <div class="duel-house-label">PULSACIONES</div>
          </div>

          <div class="vs-sphere-wrap" style="transform: scale(1.4)">
            <div class="vs-glow" style="background: radial-gradient(circle, rgba(239, 68, 68, 0.5), transparent 70%);"></div>
            <div class="vs-sphere" style="background: linear-gradient(135deg, #ef4444, #7f1d1d); color: white;">⚡</div>
          </div>

          <div class="duel-player-premium right" style="--dir: 0; background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3);">
            <div class="duel-name-premium">${esc(p2.name)}</div>
            <div style="font-size: 5rem; font-weight: 1000; color: #3b82f6;">${t2}</div>
            <div class="duel-house-label">PULSACIONES</div>
          </div>
        </div>

        <div class="clash-meter-wrap">
          <div class="clash-bar-left" style="width: ${pos}%"></div>
          <div class="clash-bar-right" style="width: ${100 - pos}%"></div>
          <div class="clash-marker" style="left: ${pos}%"></div>
        </div>

        <div class="duel-status" style="margin-top: 30px; text-align: center; border-left: none; border-bottom: 4px solid var(--duel-gold);">
          ${esc(state.narrator || "¡La energía mágica está a punto de estallar!")}
        </div>
      </div>
    `;
  }

  function renderDuelResults(state, extraContainer) {
    const result = state.duel_result || {};
    const type = result.type; // spell_win, clash_win, clash_tie, timeout, double_timeout
    
    let content = "";

    if (type === "spell_win" || type === "clash_win") {
      const winner = result.winner;
      const winnerHouse = result.winner_house;
      const loser = result.loser;
      const spellWinner = result.spell_winner;
      const spellLoser = result.spell_loser;

      content = `
        <div class="duel-result-premium">
          <div class="badge gold">🏆 VICTORIA</div>
          <h1 class="result-winner-announcement result-glow-text">${esc(winner)} GANA EL DUELO</h1>
          
          <div style="display: flex; justify-content: center; gap: 60px; margin: 40px 0;">
            <div class="spell-reveal-card">
              <div class="duel-house-label">${esc(winnerHouse)} ${houseIcons[winnerHouse]}</div>
              <div class="spell-icon-premium">🪄</div>
              <div class="duel-name-premium">${esc(spellWinner || "Hechizo")}</div>
              <div class="duel-status-badge ready">GANADOR</div>
            </div>

            <div class="vs-sphere-wrap" style="align-self: center;">
              <div class="vs-sphere" style="background: #1e293b; color: white;">VS</div>
            </div>

            <div class="spell-reveal-card" style="opacity: 0.6">
              <div class="duel-house-label">${houseIcons[result.loser_house]} ${esc(result.loser_house)}</div>
              <div class="spell-icon-premium" style="filter: grayscale(1)">💨</div>
              <div class="duel-name-premium">${esc(spellLoser || "Hechizo")}</div>
              <div class="duel-status-badge">DERROTADO</div>
            </div>
          </div>

          <div class="duel-status" style="margin-top: 20px;">
            ${esc(result.summary || "")}
          </div>
        </div>
      `;
    } else {
       // Casos de empate o timeout
       content = `
        <div class="duel-result-premium">
          <div class="badge">⌛ RESULTADO</div>
          <h1 class="result-winner-announcement">${esc(state.correct || "Duelo Terminado")}</h1>
          <div class="duel-status" style="margin-top: 40px;">
            ${esc(result.summary || state.narrator || "")}
          </div>
        </div>
       `;
    }

    extraContainer.innerHTML = content;
  }

  // Integración con el sistema global
  window.DueloTv = {
    render: renderDuelTv,
    renderResults: renderDuelResults
  };

  // Hooking into the main app if it exists
  const interval = setInterval(() => {
    if (window.currentGameState) {
       // Si estamos en duelo, forzamos re-render si el contenedor existe
       const phase = window.currentGameState.phase;
       if (phase === "duelo" || phase === "duelo_clash") {
         renderDuelTv(window.currentGameState);
       }
    }
  }, 100);

})();
