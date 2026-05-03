const socket = io();

const viewInit = document.getElementById('view-init');
const viewLobby = document.getElementById('view-lobby');
const btnCreate = document.getElementById('btn-create');
const displayCode = document.getElementById('display-code');
const playersList = document.getElementById('players-list');
const statusText = document.getElementById('status-text');
const playerCount = document.getElementById('player-count');
const btnStart = document.getElementById('btn-start');
const btnNextRound = document.getElementById('btn-next-round');
const viewQuiz = document.getElementById('view-trivia'); // We'll reuse this as a generic quiz view
const viewResults = document.getElementById('view-results');

let currentRoom = null;
let currentGameId = null;

// Helper to switch views
function showView(viewId) {
  document.querySelectorAll('.tv-layout, .init-screen').forEach(v => v.style.display = 'none');
  const target = document.getElementById(viewId);
  if (target) {
    target.style.display = viewId === 'view-init' ? 'block' : 'grid';
  }
}

// Helper to escape HTML and prevent XSS
function escapeHTML(str) {
  if (!str) return '';
  const p = document.createElement('p');
  p.textContent = str;
  return p.innerHTML;
}

function safeText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '';
}

function safeHTML(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = value ?? '';
}

btnCreate.addEventListener('click', () => {
  socket.emit('tv_create_room');
});

btnStart.addEventListener('click', () => {
  const gameId = document.getElementById('game-select').value;
  socket.emit('tv_start_game', gameId);
});

btnNextRound.addEventListener('click', () => {
  socket.emit('tv_next_round');
});

socket.on('game_started', (gameId) => {
  currentGameId = gameId;
});

socket.on('room_created', (code) => {
  currentRoom = code;
  displayCode.textContent = code;
  showView('view-lobby');

  const mobileUrl = `${window.location.origin}/v2/mobile/?room=${encodeURIComponent(code)}`;
  const joinUrl = document.getElementById('join-url');
  if (joinUrl) joinUrl.textContent = `${window.location.origin}/v2/mobile/`;

  const qrContainer = document.getElementById('qrcode');
  qrContainer.innerHTML = '';
  const qrImg = document.createElement('img');
  qrImg.className = 'qr-image';
  qrImg.width = 220;
  qrImg.height = 220;
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(mobileUrl)}`;
  qrContainer.appendChild(qrImg);
});

socket.on('room_state', (state) => {
  currentGameId = state.currentGameId;
  if (state.status === 'lobby') {
    showView('view-lobby');
    renderPlayers(state.players);
    playerCount.textContent = `${state.players.length} / 8 Jugadores`;
    
    if (state.players.length > 0) {
      statusText.textContent = `${state.players.length} mago(s) listo(s)`;
      btnStart.style.display = 'inline-block';
      // If we want to test Artes Ridículas, we could add another button or toggle here
    } else {
      statusText.textContent = 'Esperando jugadores...';
      btnStart.style.display = 'none';
    }
  }
});

function renderPlayers(players) {
  playersList.innerHTML = '';
  players.forEach(player => {
    const card = document.createElement('div');
    card.className = `player-card ${player.house.toLowerCase()}`;
    if (!player.isConnected) card.classList.add('offline');
    const avatar = player.gender === 'wizard' ? '🧙‍♂️' : '🧙‍♀️';
    card.innerHTML = `
      <div class="player-avatar">${avatar}</div>
      <div class="player-name">${escapeHTML(player.name)}</div>
      <div style="font-size: 0.7rem; opacity: 0.6; margin-top: 0.2rem;">${player.house}</div>
    `;
    playersList.appendChild(card);
  });
}

// GENERIC GAME STATE HANDLING
socket.on('game_state', (data) => {
  if (currentGameId === 'trivia_magica' || currentGameId === 'artes_ridiculas') {
    if (data.phase === 'question' || data.phase === 'threat') renderQuizView(data);
    else if (data.phase === 'results') renderResultsView(data);
  } else if (currentGameId === 'atrapa_snitch') {
    if (data.phase === 'playing') renderSnitchView(data);
    else if (data.phase === 'results') renderSnitchResults(data);
  } else if (currentGameId === 'duelo_hechizos') {
    renderDueloView(data);
  } else if (currentGameId === 'sombrero_burlon') {
    renderSombreroView(data);
  } else if (currentGameId === 'clase_pociones') {
    renderPocionesView(data);
  } else if (currentGameId === 'retratos_chismosos') {
    renderRetratosView(data);
  } else if (currentGameId === 'hechizo_incompleto') {
    renderHechizoView(data);
  } else if (currentGameId === 'patronus_personalizado') {
    renderPatronusView(data);
  } else if (currentGameId === 'copa_final') {
    renderCopaFinalView(data);
  } else if (currentGameId === 'mapa_travieso') {
    renderMapaView(data);
  } else if (currentGameId === 'caldero_mentiroso') {
    renderCalderoView(data);
  }
});

function renderPatronusView(data) {
  if (data.phase === 'results') {
    renderPatronusResults(data);
    return;
  }
  showView('view-patronus');
  safeText('patronus-prompt', data.prompt?.text);
  safeText('patronus-count', data.phase === 'submit' ? data.submitCount : data.voteCount);
  safeText('patronus-total', data.totalPlayers);
  
  const list = document.getElementById('patronus-submissions-list');
  if (!list) return;
  list.innerHTML = '';
  if (data.phase === 'vote' && data.submissions) {
    data.submissions.forEach(sub => {
      const card = document.createElement('div');
      card.className = 'submission-card glass-panel';
      card.textContent = sub.text;
      list.appendChild(card);
    });
  } else {
    list.innerHTML = `<p style="text-align:center; width:100%; opacity:0.6;">Esperando conjuros...</p>`;
  }
}

function renderCopaFinalView(data) {
  if (data.phase === 'results') {
    renderCopaResults(data);
    return;
  }
  showView('view-copafinal');
  safeText('copa-phase-label', data.phase === 'wager' ? 'Hagan sus apuestas' : '¡PREGUNTA FINAL!');
  safeText('copa-count', data.phase === 'wager' ? data.wagerCount : data.answerCount);
  safeText('copa-total', data.totalPlayers);

  const qContainer = document.getElementById('copa-question-container');
  const wagerGrid = document.getElementById('copa-wager-status');
  
  if (data.phase === 'question') {
    if (qContainer) qContainer.style.display = 'block';
    if (wagerGrid) wagerGrid.style.display = 'none';
    safeText('copa-question-text', data.question?.question);
    const opts = document.getElementById('copa-options');
    if (opts && data.question?.options) {
      opts.innerHTML = data.question.options.map(opt => `
        <div class="option-card glass-panel">
          <div class="option-label">${escapeHTML(opt)}</div>
        </div>
      `).join('');
    }
  } else {
    if (qContainer) qContainer.style.display = 'none';
    if (wagerGrid) wagerGrid.style.display = 'flex';
  }
}

function renderPatronusResults(data) {
  showView('view-results');
  safeText('correct-answer', "Ranking de Patronus");
  safeText('narrator-comment', data.results?.narrator ? `"${data.results.narrator}"` : '');
  
  const list = document.getElementById('results-list');
  if (!list || !data.results?.ranking) return;
  list.innerHTML = '';
  data.results.ranking.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-player-card glass-panel';
    card.innerHTML = `<div class="player-name">${escapeHTML(res.playerName)} (${escapeHTML(res.house)})</div><div class="result-status status-correct">${res.votes || 0} votos</div><div class="points-gain">${escapeHTML(res.text)}</div>`;
    list.appendChild(card);
  });
}

function renderCopaResults(data) {
  showView('view-results');
  safeText('correct-answer', data.results?.correctAnswer);
  safeText('narrator-comment', data.results ? `"${data.results.explanation}" - ${data.results.narrator}` : '');
  
  const list = document.getElementById('results-list');
  if (!list || !data.results?.ranking) return;
  list.innerHTML = '';
  data.results.ranking.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-player-card glass-panel';
    card.innerHTML = `<div class="player-name">${escapeHTML(res.name)}</div><div class="result-status ${res.correct?'status-correct':'status-wrong'}">${res.correct?'¡ACERTÓ!':'FALLÓ'}</div><div class="points-gain">${res.correct?'+':''}${res.points} (Apostó ${res.wager})</div>`;
    list.appendChild(card);
  });
}

function renderRetratosView(data) {
  if (data.phase === 'results') {
    renderRetratosResults(data);
    return;
  }
  showView('view-retratos');
  document.getElementById('portrait-category').textContent = data.currentClue?.category || 'Retratos Chismosos';
  document.getElementById('portrait-name').textContent = data.currentClue?.portraitName || 'Escuchando...';
  document.getElementById('portrait-clue').textContent = `"${data.currentClue?.clue}"`;
  
  const options = document.getElementById('portrait-options');
  options.innerHTML = data.currentClue?.options.map(opt => `
    <div class="option-card glass-panel">
      <div class="option-label">${opt}</div>
    </div>
  `).join('') || '';
}

function renderHechizoView(data) {
  if (data.phase === 'results') {
    renderHechizoResults(data);
    return;
  }
  showView('view-hechizo');
  document.getElementById('spell-category').textContent = data.currentSpell?.category.toUpperCase() || 'HECHIZO';
  document.getElementById('spell-text').textContent = data.currentSpell?.incompleteText || '...';
  document.getElementById('spell-context').textContent = data.currentSpell?.context || '';
  
  const options = document.getElementById('spell-options');
  options.innerHTML = data.currentSpell?.options.map(opt => `
    <div class="option-card glass-panel">
      <div class="option-label">${opt}</div>
    </div>
  `).join('') || '';
}

function renderRetratosResults(data) {
  showView('view-results');
  document.getElementById('correct-answer').textContent = data.results.correctAnswer;
  document.getElementById('narrator-comment').textContent = `"${data.results.explanation}" - ${data.results.narrator}`;
  
  const list = document.getElementById('results-list');
  list.innerHTML = '';
  data.results.ranking.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-player-card glass-panel';
    card.innerHTML = `<div class="player-name">${res.name}</div><div class="result-status ${res.correct?'status-correct':'status-wrong'}">${res.correct?'¡ACERTÓ!':'FALLÓ'}</div><div class="points-gain">+${res.points}</div>`;
    list.appendChild(card);
  });
}

function renderHechizoResults(data) {
  showView('view-results');
  document.getElementById('correct-answer').textContent = data.results.completedText;
  document.getElementById('narrator-comment').textContent = `"${data.results.explanation}" - ${data.results.narrator}`;
  
  const list = document.getElementById('results-list');
  list.innerHTML = '';
  data.results.ranking.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-player-card glass-panel';
    card.innerHTML = `<div class="player-name">${res.name}</div><div class="result-status ${res.correct?'status-correct':'status-wrong'}">${res.correct?'ÉXITO':'FALLO'}</div><div class="points-gain">+${res.points}</div>`;
    list.appendChild(card);
  });
}

function renderMapaView(data) {
  if (data.phase === 'results') {
    renderMapaResults(data);
    return;
  }
  showView('view-mapa');
  const canvas = document.getElementById('map-canvas');
  const status = document.getElementById('mapa-status');
  
  if (data.phase === 'observe') {
    status.textContent = 'Observa el Mapa...';
    canvas.innerHTML = '';
    data.mapLayout.forEach(loc => {
      const dot = document.createElement('div');
      dot.className = 'map-point';
      dot.style.left = loc.zone.x + '%';
      dot.style.top = loc.zone.y + '%';
      dot.innerHTML = `<span class="map-item-visual">${loc.item.emoji}</span><span class="map-label">${loc.zone.name}</span>`;
      canvas.appendChild(dot);
    });
  } else {
    status.textContent = data.target?.question || '¿Dónde estaba?';
    canvas.innerHTML = '<div style="width:100%; height:100%; background:rgba(0,0,0,0.2); filter:blur(10px)"></div>';
  }
}

function renderCalderoView(data) {
  if (data.phase === 'results') {
    renderCalderoResults(data);
    return;
  }
  showView('view-caldero');
  document.getElementById('action-count').textContent = data.actionCount;
  document.getElementById('total-actions').textContent = data.totalPlayers;
  
  const log = document.getElementById('caldero-log');
  log.innerHTML = data.publicLog.map(entry => `<div class="log-entry">${entry.text}</div>`).join('');
  log.scrollTop = log.scrollHeight;
}

function renderMapaResults(data) {
  showView('view-results');
  const correct = data.results.correctZone;
  document.getElementById('correct-answer').textContent = correct ? correct.name : '---';
  document.getElementById('narrator-comment').textContent = data.results.narrator;
  
  const list = document.getElementById('results-list');
  list.innerHTML = '';
  data.results.ranking.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-player-card glass-panel';
    card.innerHTML = `<div class="player-name">${res.name}</div><div class="result-status ${res.correct?'status-correct':'status-wrong'}">${res.correct?'ACIERTO':'FALLO'}</div><div class="points-gain">+${res.points}</div>`;
    list.appendChild(card);
  });
}

function renderCalderoResults(data) {
  showView('view-results');
  document.getElementById('correct-answer').textContent = data.results.exploded ? '¡EXPLOSIÓN!' : 'Poción Estable';
  document.getElementById('narrator-comment').textContent = data.results.narrator;
  
  const list = document.getElementById('results-list');
  list.innerHTML = '';
  data.results.ranking.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-player-card glass-panel';
    card.innerHTML = `<div class="player-name">${res.name}</div><div style="font-size:0.7rem; opacity:0.6">${res.reasons.join(', ')}</div><div class="points-gain">+${res.points}</div>`;
    list.appendChild(card);
  });
}
function renderSombreroView(data) {
  if (data.phase === 'round_results' || data.phase === 'final_results') {
    renderSombreroResults(data);
    return;
  }
  showView('view-sombrero');
  safeText('hat-phrase', data.prompt ? data.prompt.text : "Preparando sentencia...");
  safeText('vote-count', data.answerCount || 0);
  safeText('total-voters', data.totalPlayers || 0);
}

function renderPocionesView(data) {
  if (data.phase === 'results') {
    renderPocionesResults(data);
    return;
  }
  showView('view-pociones');
  const display = document.getElementById('sequence-display');
  const status = document.getElementById('pociones-status');

  if (data.phase === 'memorize') {
    status.innerHTML = `Memoriza la receta: <strong style="color:white">${data.potion?.name}</strong><br><small>Modo: ${data.mode.toUpperCase()}</small>`;
    display.innerHTML = '';
    data.potion?.ingredients.forEach((ing, i) => {
      setTimeout(() => {
        const card = document.createElement('div');
        card.className = 'ing-card';
        card.textContent = ing.emoji;
        display.appendChild(card);
      }, i * 800);
    });
  } else {
    status.textContent = '¡Mezcla en tu móvil ahora!';
    display.innerHTML = '<div style="font-size:3rem; opacity:0.5; animation: sway 2s infinite">🧪 Burbujeando...</div>';
  }
}

function renderSombreroResults(data) {
  showView('view-results');
  const results = data.roundResults || data.finalResults;
  document.getElementById('correct-answer').textContent = results.ranking[0].votes > 0 ? results.ranking[0].name : 'Nadie';
  document.getElementById('narrator-comment').textContent = results.hatLine || "El sombrero ha hablado.";
  
  const resultsContainer = document.getElementById('results-list');
  resultsContainer.innerHTML = '';
  results.ranking.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-player-card glass-panel';
    card.innerHTML = `
      <div class="player-name">${res.name}</div>
      <div class="result-status status-correct">${res.votes} Votos</div>
      <div class="points-gain">+${res.points}</div>
    `;
    resultsContainer.appendChild(card);
  });
}

function renderPocionesResults(data) {
  showView('view-results');
  document.getElementById('correct-answer').textContent = data.results.potionName;
  document.getElementById('narrator-comment').textContent = "¡Clase terminada!";
  
  const resultsContainer = document.getElementById('results-list');
  resultsContainer.innerHTML = '';
  data.results.ranking.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-player-card glass-panel';
    card.innerHTML = `
      <div class="player-name">${res.name}</div>
      <div class="result-status ${res.perfect ? 'status-correct' : 'status-wrong'}">
        ${res.perfect ? '¡PERFECTA!' : `${res.errors} ERRORES`}
      </div>
      <div class="points-gain">+${res.points}</div>
    `;
    resultsContainer.appendChild(card);
  });
}

let snitchAnimFrame = null;
function renderSnitchView(data) {
  showView('view-snitch');
  const ball = document.getElementById('snitch-ball');
  const zone = document.getElementById('snitch-zone');
  const feed = document.getElementById('catches-feed');

  // Update feed
  feed.innerHTML = '';
  data.catches.forEach(c => {
    const toast = document.createElement('div');
    toast.className = 'catch-toast';
    toast.innerHTML = `<span style="color:var(--house-${c.house.toLowerCase()})">${c.playerName}</span>: ${c.label}`;
    feed.appendChild(toast);
  });

  if (snitchAnimFrame) cancelAnimationFrame(snitchAnimFrame);

  function animate() {
    const now = Date.now();
    const snitchPos = getInterpolatedPos(data.snitchSegments, now);
    const zonePos = getInterpolatedPos(data.zoneSegments, now);

    if (snitchPos) {
      ball.style.left = snitchPos.x + '%';
      ball.style.top = snitchPos.y + '%';
    }
    if (zonePos) {
      zone.style.left = zonePos.x + '%';
      zone.style.top = zonePos.y + '%';
    }

    snitchAnimFrame = requestAnimationFrame(animate);
  }
  animate();
}

function getInterpolatedPos(segments, time) {
  const seg = segments.find(s => time >= s.startTime && time <= s.endTime);
  if (!seg) return null;
  let t = (time - seg.startTime) / (seg.endTime - seg.startTime);
  if (seg.easing === 'ease-in-out') t = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  return {
    x: seg.startX + (seg.endX - seg.startX) * t,
    y: seg.startY + (seg.endY - seg.startY) * t
  };
}

function renderSnitchResults(data) {
    if (snitchAnimFrame) cancelAnimationFrame(snitchAnimFrame);
    showView('view-results'); // Reuse quiz results for now or make specific
    // ... logic to show ranking
}

function renderDueloView(data) {
    showView('view-duelo');
    const status = document.getElementById('duelo-status');
    const d1 = document.getElementById('duelist-1');
    const d2 = document.getElementById('duelist-2');
    const meter = document.getElementById('clash-meter');

    d1.innerHTML = `<h3>${data.duelists[0].name}</h3><p>${data.duelists[0].house}</p>`;
    d2.innerHTML = `<h3>${data.duelists[1].name}</h3><p>${data.duelists[1].house}</p>`;

    if (data.phase === 'selection') {
        status.textContent = `Esperando hechizos... (${data.choiceCount}/2)`;
        meter.style.display = 'none';
    } else if (data.phase === 'clash') {
        status.textContent = '¡CHOQUE DE VARITAS! ¡PRESIONA RÁPIDO!';
        meter.style.display = 'flex';
        const total = (data.clashTaps[data.duelists[0].clientId] || 0) + (data.clashTaps[data.duelists[1].clientId] || 0) || 1;
        document.getElementById('clash-bar-1').style.width = ((data.clashTaps[data.duelists[0].clientId] || 0) / total * 100) + '%';
        document.getElementById('clash-bar-2').style.width = ((data.clashTaps[data.duelists[1].clientId] || 0) / total * 100) + '%';
    } else if (data.phase === 'results') {
        status.innerHTML = `<span style="color:var(--color-accent)">${data.results.winner} GANA</span><br><small>${data.results.message}</small>`;
        meter.style.display = 'none';
    }
}

function renderQuizView(data) {
  showView('view-trivia');
  document.getElementById('trivia-category').textContent = data.category || 'Misterio';
  document.getElementById('trivia-round').textContent = `Ronda ${data.roundNumber}/${data.totalRounds}`;
  document.getElementById('trivia-question').textContent = data.question;
  document.getElementById('trivia-answer-count').textContent = `${data.answerCount || 0} / ?`;
  
  const optionsContainer = document.getElementById('trivia-options');
  optionsContainer.innerHTML = '';
  const labels = ['A', 'B', 'C', 'D'];
  data.options.forEach((opt, i) => {
    const card = document.createElement('div');
    card.className = 'option-card';
    card.innerHTML = `<div class="option-label">${labels[i]}</div><div class="option-text">${opt}</div>`;
    optionsContainer.appendChild(card);
  });

  const bar = document.getElementById('timer-bar');
  bar.style.transition = 'none';
  bar.style.width = '100%';
  setTimeout(() => {
    bar.style.transition = `width ${data.durationMs}ms linear`;
    bar.style.width = '0%';
  }, 100);
}

function renderResultsView(data) {
  showView('view-results');
  document.getElementById('correct-answer').textContent = data.correctAnswer;
  document.getElementById('narrator-comment').textContent = data.narratorComment || "...";
  
  const resultsContainer = document.getElementById('results-list');
  resultsContainer.innerHTML = '';
  data.results.results.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-player-card glass-panel';
    card.innerHTML = `
      <div class="player-name">Mago</div>
      <div class="result-status ${res.isCorrect ? 'status-correct' : 'status-wrong'}">
        ${res.isCorrect ? '¡CORRECTO!' : (res.isFunny ? '¡GRACIOSO!' : 'INCORRECTO')}
      </div>
      <div class="points-gain">${res.points > 0 ? '+' : ''}${res.points}</div>
    `;
    resultsContainer.appendChild(card);
  });
}

socket.on('scoreboard_state', (data) => {
  console.log('Scoreboard update:', data);
  // Optional: update a permanent scoreboard sidebar if it exists
});

socket.on('error_message', (msg) => {
  alert(msg);
});
