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
  const p = document.createElement('p');
  p.textContent = str;
  return p.innerHTML;
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
  if (data.phase === 'question' || data.phase === 'threat') {
    renderQuizView(data);
  } else if (data.phase === 'results') {
    renderResultsView(data);
  }
});

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
  data.results.forEach(res => {
    // We need player name here... we should probably map it from clientId using current room state
    // For now, let's assume result includes name or we find it
    const card = document.createElement('div');
    card.className = 'result-player-card glass-panel';
    card.innerHTML = `
      <div class="player-name">Jugador</div>
      <div class="result-status ${res.isCorrect ? 'status-correct' : 'status-wrong'}">
        ${res.isCorrect ? '¡CORRECTO!' : (res.isFunny ? '¡GRACIOSO!' : 'INCORRECTO')}
      </div>
      <div class="points-gain">${res.points > 0 ? '+' : ''}${res.points}</div>
    `;
    resultsContainer.appendChild(card);
  });
}

socket.on('error_message', (msg) => {
  alert(msg);
});
