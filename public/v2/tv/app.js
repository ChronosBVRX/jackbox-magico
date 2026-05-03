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
const viewTrivia = document.getElementById('view-trivia');
const viewResults = document.getElementById('view-results');

let currentRoom = null;

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
  socket.emit('tv_start_game', 'trivia_magica');
});

btnNextRound.addEventListener('click', () => {
  socket.emit('tv_next_round');
});

socket.on('room_created', (code) => {
  currentRoom = code;
  displayCode.textContent = code;
  showView('view-lobby');

  // Generate QR Code
  const mobileUrl = `${window.location.origin}/v2/mobile/?room=${encodeURIComponent(code)}`;
  joinUrl.textContent = `${window.location.origin}/v2/mobile/`;

  const qrContainer = document.getElementById('qrcode');
  qrContainer.innerHTML = '';

  const qrImg = document.createElement('img');
  qrImg.alt = `Código QR para entrar a la sala ${code}`;
  qrImg.className = 'qr-image';
  qrImg.width = 220;
  qrImg.height = 220;
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(mobileUrl)}`;

  qrImg.onerror = () => {
    qrContainer.innerHTML = '';
    const fallback = document.createElement('div');
    fallback.className = 'qr-fallback';
    fallback.textContent = 'No se pudo generar el QR. Usa la URL y el código de sala.';
    qrContainer.appendChild(fallback);
  };

  qrContainer.appendChild(qrImg);
});

socket.on('room_state', (state) => {
  if (state.status === 'lobby') {
    showView('view-lobby');
    renderPlayers(state.players);
    playerCount.textContent = `${state.players.length} / 8 Jugadores`;
    
    if (state.players.length > 0) {
      statusText.textContent = `${state.players.length} mago(s) listo(s)`;
      btnStart.style.display = 'inline-block';
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
    const escapedName = escapeHTML(player.name);
    
    card.innerHTML = `
      <div class="player-avatar">${avatar}</div>
      <div class="player-name">${escapedName}</div>
      <div style="font-size: 0.7rem; opacity: 0.6; margin-top: 0.2rem;">${player.house}</div>
    `;
    playersList.appendChild(card);
  });
}

socket.on('game_started', (gameId) => {
  console.log('Game started:', gameId);
});

socket.on('trivia_question', (data) => {
  showView('view-trivia');
  document.getElementById('trivia-category').textContent = data.category;
  document.getElementById('trivia-round').textContent = `Ronda ${data.roundNumber}/${data.totalRounds}`;
  document.getElementById('trivia-question').textContent = data.question;
  document.getElementById('trivia-answer-count').textContent = `0 / ${data.totalPlayers || '?'}`;
  
  const optionsContainer = document.getElementById('trivia-options');
  optionsContainer.innerHTML = '';
  
  const labels = ['A', 'B', 'C', 'D'];
  data.options.forEach((opt, i) => {
    const card = document.createElement('div');
    card.className = 'option-card';
    card.innerHTML = `
      <div class="option-label">${labels[i]}</div>
      <div class="option-text">${opt}</div>
    `;
    optionsContainer.appendChild(card);
  });

  // Timer animation
  const bar = document.getElementById('timer-bar');
  bar.style.width = '100%';
  setTimeout(() => {
    bar.style.width = '0%';
    bar.style.transitionDuration = `${data.durationMs}ms`;
  }, 100);
});

socket.on('answer_count', (data) => {
  document.getElementById('trivia-answer-count').textContent = `${data.count} / ${data.total}`;
});

socket.on('round_results', (data) => {
  showView('view-results');
  document.getElementById('correct-answer').textContent = data.correctAnswer;
  document.getElementById('narrator-comment').textContent = data.narratorComment;
  
  const resultsContainer = document.getElementById('results-list');
  resultsContainer.innerHTML = '';
  
  data.results.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-player-card glass-panel';
    card.innerHTML = `
      <div class="player-name">${escapeHTML(res.name)}</div>
      <div class="result-status ${res.isCorrect ? 'status-correct' : 'status-wrong'}">
        ${res.isCorrect ? '¡CORRECTO!' : 'INCORRECTO'}
      </div>
      <div class="points-gain">+${res.points}</div>
      <div class="player-house" style="color: var(--house-${res.house.toLowerCase()})">${res.house}</div>
    `;
    resultsContainer.appendChild(card);
  });
});

socket.on('error_message', (msg) => {
  console.error('Error de servidor:', msg);
  alert(msg);
});
