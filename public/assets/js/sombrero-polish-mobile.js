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

  function renderSombreroMobile(state) {
    const panel = document.getElementById("sombrero-mobile-panel");
    if (!panel) return;

    if (typeof window.showScreen === "function") window.showScreen("view-game");

    const roundIdx = state.sombrero_round_index || 0;
    const totalRounds = state.sombrero_total_rounds || 3;
    const prompt = state.current_prompt || {};
    const votesByVoter = state.votes_by_voter || {};
    const myName = window.myName || "";
    const alreadyVoted = Boolean(votesByVoter[myName]);

    if (alreadyVoted) {
      panel.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 4rem; margin-bottom: 20px;">🎩</div>
          <h2 style="color: white; margin-bottom: 10px;">¡Voto registrado!</h2>
          <p style="color: rgba(255,255,255,0.6);">El Sombrero está analizando tu chisme. Mira la TV para los resultados.</p>
          <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 15px;">
            <div style="font-size: 0.8rem; opacity: 0.5;">RONDA ${roundIdx + 1} / ${totalRounds}</div>
          </div>
        </div>
      `;
      return;
    }

    panel.innerHTML = `
      <div class="sombrero-mobile-wrap">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
           <div class="sombrero-round-pill" style="margin-bottom: 0; font-size: 0.7rem;">RONDA ${roundIdx + 1} / ${totalRounds}</div>
           ${prompt.secret ? '<span style="color: #ef4444; font-weight: 900; font-size: 0.7rem;">🤫 SECRETO</span>' : ''}
        </div>

        <h2 style="color: white; font-size: 1.6rem; font-weight: 800; line-height: 1.2; margin-bottom: 20px;">
          ${esc(state.question)}
        </h2>

        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.6); margin-bottom: 20px;">Toca a quién quieres señalar:</p>

        <div class="sombrero-mobile-grid">
          ${(state.options || [])
            .filter(name => name !== myName)
            .map(name => {
              // Buscar casa del jugador en el estado de jugadores
              const pInfo = (state.players || []).find(p => p.name === name) || {};
              const house = pInfo.house || "Gryffindor";
              return `
                <div class="sombrero-vote-card" onclick="sombreroVote('${esc(name)}', this)">
                  <div style="font-size: 1.8rem; margin-bottom: 5px;">${houseIcons[house] || '✨'}</div>
                  <div style="font-weight: 800; color: white; font-size: 1rem;">${esc(name)}</div>
                  <div style="font-size: 0.7rem; opacity: 0.5; text-transform: uppercase;">${esc(house)}</div>
                </div>
              `;
            }).join('')}
        </div>
      </div>
    `;
  }

  window.sombreroVote = (targetName, card) => {
    if (card.classList.contains('disabled')) return;
    
    card.classList.add('selected');
    document.querySelectorAll('.sombrero-vote-card').forEach(c => {
      if (c !== card) c.classList.add('disabled');
    });

    if (typeof window.enviarRespuesta === "function") {
      window.enviarRespuesta(targetName, card);
    }

    if (window.navigator.vibrate) window.navigator.vibrate(25);
  };

  window.SombreroMobile = {
    render: renderSombreroMobile
  };

})();
