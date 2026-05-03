const socket = io();

const joinForm = document.getElementById('join-form');
const waitScreen = document.getElementById('wait-screen');
const btnJoin = document.getElementById('btn-join');

const inCode = document.getElementById('in-code');
const inName = document.getElementById('in-name');
const inHouse = document.getElementById('in-house');
const inGender = document.getElementById('in-gender');
const playerSummary = document.getElementById('player-summary');

let clientId = localStorage.getItem('v2_clientId');
if (!clientId) {
  clientId = 'c_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('v2_clientId', clientId);
}

// Intentar reconexión automática si hay datos en localStorage
const savedRoom = localStorage.getItem('v2_roomCode');
const savedName = localStorage.getItem('v2_playerName');
const savedHouse = localStorage.getItem('v2_playerHouse');
const savedGender = localStorage.getItem('v2_playerGender');

if (savedRoom && savedName) {
  socket.emit('player_join', {
    roomCode: savedRoom,
    clientId,
    name: savedName,
    house: savedHouse || 'Gryffindor',
    gender: savedGender || 'wizard'
  });
}

btnJoin.addEventListener('click', () => {
  const roomCode = inCode.value.trim().toUpperCase();
  const name = inName.value.trim();
  const house = inHouse.value;
  const gender = inGender.value;

  if (!roomCode || !name) {
    alert('Faltan datos por llenar');
    return;
  }

  socket.emit('player_join', {
    roomCode,
    clientId,
    name,
    house,
    gender
  });
});

socket.on('room_state', (state) => {
  const myPlayer = state.players.find(p => p.clientId === clientId);
  if (myPlayer) {
    // Guardar para reconexión
    localStorage.setItem('v2_roomCode', state.roomCode);
    localStorage.setItem('v2_playerName', myPlayer.name);
    localStorage.setItem('v2_playerHouse', myPlayer.house);
    localStorage.setItem('v2_playerGender', myPlayer.gender);

    joinForm.style.display = 'none';
    waitScreen.style.display = 'block';
    playerSummary.textContent = `${myPlayer.name} de ${myPlayer.house}`;
  }
});

socket.on('error_message', (msg) => {
  alert(msg);
});

socket.on('disconnect', () => {
  console.log('Desconectado del servidor');
});
