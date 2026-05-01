(() => {
  const houseColors = {
    Gryffindor: "#ae0001",
    Slytherin: "#2a623d",
    Ravenclaw: "#222f5b",
    Hufflepuff: "#f0c75e",
  };

  const houseIcons = {
    Gryffindor: "🦁",
    Slytherin: "🐍",
    Ravenclaw: "🦅",
    Hufflepuff: "🦡",
  };

  function calculateHouseScores(players = []) {
    const totals = { Gryffindor: 0, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0 };
    players.forEach((p) => {
      if (totals[p.house] !== undefined) totals[p.house] += Number(p.score || 0);
    });
    return totals;
  }

  function render(data) {
    window.SceneTransition?.hide();
    window.showScreen("view-leaderboard");
    const container = document.getElementById("leaderboard-container");
    if (!container) return;

    const players = data.players || [];
    const houseScores = calculateHouseScores(players);
    const sortedHouses = Object.keys(houseScores).sort((a, b) => houseScores[b] - houseScores[a]);

    container.innerHTML = `
      <div class="leaderboard-scene fade-in">
        <div class="badge">🏆 Copa de las Casas</div>
        <h1>Marcador Global</h1>
        
        <div class="house-standings">
          ${sortedHouses.map((house, idx) => `
            <div class="house-rank-card" style="--house-color: ${houseColors[house]}; animation-delay: ${idx * 150}ms">
              <div class="rank">#${idx + 1}</div>
              <div class="icon">${houseIcons[house]}</div>
              <div class="name">${house}</div>
              <div class="score">${houseScores[house]} pts</div>
              <div class="progress-wrap">
                <div class="progress-bar" style="width: ${Math.min(100, (houseScores[house] / (Math.max(...Object.values(houseScores)) || 1)) * 100)}%"></div>
              </div>
            </div>
          `).join("")}
        </div>

        <div class="player-mini-grid">
           ${players.sort((a,b) => b.score - a.score).slice(0, 8).map(p => `
             <div class="player-mini-card">
               <span>${houseIcons[p.house]} ${p.name}</span>
               <strong>${p.score}</strong>
             </div>
           `).join("")}
        </div>
      </div>
    `;

    if (window.lastVoicePhase !== "leaderboard_scene") {
      window.lastVoicePhase = "leaderboard_scene";
      window.VoiceLinesTv?.play("leaderboard", { volume: 0.9 });
    }
  }

  window.SceneLeaderboard = { render };
})();
