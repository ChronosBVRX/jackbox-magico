const socket = io();

const viewInit = document.getElementById('view-init');
const viewLobby = document.getElementById('view-lobby');
const btnCreate = document.getElementById('btn-create');
const displayCode = document.getElementById('display-code');
const playersList = document.getElementById('players-list');
const statusText = document.getElementById('status-text');
const btnStart = document.getElementById('btn-start');
const joinUrl = document.getElementById('join-url');

if (joinUrl) {
  joinUrl.textContent = `${window.location.origin}/v2/mobile/`;
}

let currentRoom = null;

btnCreate.addEventListener('click', () => {
  socket.emit('tv_create_room');
});

socket.on('room_created', (code) => {
  currentRoom = code;
  displayCode.textContent = code;
  viewInit.style.display = 'none';
  viewLobby.style.display = 'block';
});

socket.on('room_state', (state) => {
  renderPlayers(state.players);
  
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
    if (!player.isConnected) card.style.opacity = '0.5';
    
    card.innerHTML = `
      <div class="player-name">${player.name} ${player.isConnected ? '' : ' (Offline)'}</div>
      <div class="player-house">${player.house}</div>
    `;
    playersList.appendChild(card);
  });
}

socket.on('error_message', (msg) => {
  alert(msg);
});
