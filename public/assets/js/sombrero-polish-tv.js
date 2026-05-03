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

  function renderSombreroTv(state, players) {
    const container = document.getElementById("game-container");
    if (!container) return;

    if (state.round_reveal) {
      renderPartialReveal(state, players, container);
      return;
    }

    renderVotingPhase(state, players, container);
  }

  function renderVotingPhase(state, players, container) {
    const roundIdx = state.sombrero_round_index || 0;
    const totalRounds = state.sombrero_total_rounds || 3;
    const prompt = state.current_prompt || {};
    const isSecret = prompt.secret || false;
    const votesByVoter = state.votes_by_voter || {};

    const duration = Number(state.duration_seconds || 25);
    const elapsed = (Date.now() - (state.started_at * 1000)) / 1000;
    const left = Math.max(0, duration - elapsed);
    const pctTime = Math.max(0, Math.min(1, left / duration));

    const roundPct = ((roundIdx + 1) / totalRounds) * 100;

    container.innerHTML = `
      <div class="sombrero-board-premium">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div class="sombrero-round-pill">🎩 PREGUNTA ${roundIdx + 1} DE ${totalRounds}</div>
            <div class="sombrero-progress-track">
              <div class="sombrero-progress-bar" style="width: ${roundPct}%"></div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 2.5rem; font-weight: 900; color: ${left < 5 ? '#ef4444' : 'white'}">${Math.ceil(left)}s</div>
            <div style="font-size: 0.8rem; opacity: 0.5;">TIEMPO RESTANTE</div>
          </div>
        </div>

        <div class="sombrero-question-wrap">
          ${isSecret ? `
            <div class="sombrero-secret-badge">🤫 PREGUNTA SECRETA</div>
            <div class="sombrero-question-text" style="filter: blur(8px); opacity: 0.3; user-select: none;">
              Esta pregunta solo es visible en los celulares
            </div>
            <p style="font-size: 1.5rem; color: var(--hat-gold); font-weight: 700; margin-top: 20px;">
              ¡Revisen sus varitas! El chisme está oculto para la TV.
            </p>
          ` : `
            <div class="sombrero-question-text">${esc(state.question)}</div>
          `}
        </div>

        <div class="sombrero-tv-grid">
          ${(players || []).map(p => {
            const hasVoted = Boolean(votesByVoter[p.name]);
            return `
              <div class="sombrero-player-card ${hasVoted ? 'voted' : ''}">
                <div style="font-size: 2rem;">${houseIcons[p.house] || '✨'}</div>
                <div style="font-weight: 800; color: white;">${esc(p.name)}</div>
                <div class="status-dot"></div>
                <div style="font-size: 0.7rem; opacity: 0.5;">${hasVoted ? 'LISTO' : 'PENSANDO'}</div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="margin-top: 40px; padding: 20px; background: rgba(0,0,0,0.2); border-radius: 20px; font-style: italic; color: rgba(255,255,255,0.7); text-align: center;">
          ${esc(state.narrator || "El Sombrero espera vuestras puñaladas por la espalda...")}
        </div>
      </div>
    `;
  }

  function renderPartialReveal(state, players, container) {
    const reveal = state.round_reveal || {};
    const winner = reveal.winner;
    const prompt = reveal.prompt || {};
    const votes = reveal.votes_by_target || {};
    const topVotes = reveal.top_votes || 0;

    container.innerHTML = `
      <div class="sombrero-board-premium" style="border-color: var(--hat-purple);">
        <div class="sombrero-reveal-panel">
          <div class="sombrero-round-pill" style="color: #a855f7; border-color: rgba(168, 85, 247, 0.3);">Revelación Parcial</div>
          
          <div style="margin-bottom: 30px;">
            <p style="font-size: 1.2rem; opacity: 0.7; margin-bottom: 10px;">A la pregunta:</p>
            <h2 style="font-size: 2.2rem; font-weight: 800; color: white; line-height: 1.2;">"${esc(prompt.text)}"</h2>
          </div>

          <div style="margin: 40px 0;">
            <div style="font-size: 1.2rem; opacity: 0.7; margin-bottom: 10px;">La mayoría eligió a:</div>
            ${winner ? `
              <div class="sombrero-winner-name">${esc(winner)}</div>
              <div style="font-size: 2rem; font-weight: 900; color: white; margin-top: 10px;">${topVotes} VOTOS</div>
            ` : `
              <div class="sombrero-winner-name" style="color: #64748b;">NADIE</div>
              <p style="opacity: 0.5;">Parece que todos fueron muy discretos...</p>
            `}
          </div>

          <div style="padding: 20px; background: var(--hat-glass); border-radius: 20px; display: inline-block;">
             ${reveal.tie_broken_by_hat ? '⚖️ El Sombrero rompió el empate aleatoriamente.' : '✨ ¡Votación clara!'}
          </div>
        </div>
      </div>
    `;
  }

  function renderSombreroResults(state, extraContainer) {
    const res = state.sombrero_result || {};
    const rounds = res.rounds || [];
    const winner = res.winner;
    const ranking = res.ranking || [];

    extraContainer.innerHTML = `
      <div class="sombrero-board-premium" style="background: linear-gradient(180deg, #1e1b4b, #020617);">
        <div style="text-align: center; margin-bottom: 40px;">
          <div class="sombrero-round-pill">🏆 RESULTADO FINAL</div>
          <h1 class="sombrero-winner-name" style="font-size: 6rem; margin: 20px 0;">${esc(winner)}</h1>
          <p style="font-size: 1.5rem; color: white; opacity: 0.8;">Es el más señalado por el Sombrero Burlón</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
          <div style="background: var(--hat-glass); padding: 30px; border-radius: 30px;">
            <h3 style="color: var(--hat-gold); margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.1em;">Podio de Chismes</h3>
            ${ranking.slice(0, 5).map((r, i) => `
              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <span style="font-weight: 700; color: white;">${i + 1}. ${esc(r[0])}</span>
                <span style="font-weight: 900; color: var(--hat-gold);">${r[1]} votos</span>
              </div>
            `).join('')}
          </div>

          <div style="background: var(--hat-glass); padding: 30px; border-radius: 30px;">
            <h3 style="color: #a855f7; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.1em;">Resumen de Rondas</h3>
            ${rounds.map(r => `
              <div style="margin-bottom: 15px; font-size: 0.9rem;">
                <div style="opacity: 0.5;">R${r.round_number}: ${esc(r.prompt.text)}</div>
                <div style="font-weight: 700; color: white;">👉 ${esc(r.winner || 'Nadie')}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="margin-top: 40px; text-align: center; font-style: italic; color: var(--hat-gold);">
          "${esc(res.hat_line || "")}"
        </div>
      </div>
    `;
  }

  window.SombreroTv = {
    render: renderSombreroTv,
    renderResults: renderSombreroResults
  };

})();
