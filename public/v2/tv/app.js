const socket = io();

const viewInit = document.getElementById('view-init');
const viewLobby = document.getElementById('view-lobby');
const btnCreate = document.getElementById('btn-create');
const displayCode = document.getElementById('display-code');
const playersList = document.getElementById('players-list');
const statusText = document.getElementById('status-text');
const playerCount = document.getElementById('player-count');
const btnStart = document.getElementById('btn-start');
const joinUrl = document.getElementById('join-url');

let currentRoom = null;

// Helper to escape HTML and prevent XSS
function escapeHTML(str) {
  const p = document.createElement('p');
  p.textContent = str;
  return p.innerHTML;
}

btnCreate.addEventListener('click', () => {
  socket.emit('tv_create_room');
});

socket.on('room_created', (code) => {
  currentRoom = code;
  displayCode.textContent = code;
  viewInit.style.display = 'none';
  viewLobby.style.display = 'grid';

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
  renderPlayers(state.players);
  
  playerCount.textContent = `${state.players.length} / 8 Jugadores`;
  
  if (state.players.length > 0) {
    statusText.textContent = `${state.players.length} mago(s) listo(s)`;
    btnStart.style.display = 'inline-block';
  } else {
    statusText.textContent = 'Esperando jugadores...';
    btnStart.style.display = 'none';
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
      ${!player.isConnected ? '<div style="font-size: 0.6rem; color: #f87171;">RECONECTANDO</div>' : ''}
    `;
    playersList.appendChild(card);
  });
}

socket.on('error_message', (msg) => {
  console.error('Error de servidor:', msg);
  alert(msg);
});
