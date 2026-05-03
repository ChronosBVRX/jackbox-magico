const socket = io();

const joinForm = document.getElementById('join-form');
const waitScreen = document.getElementById('wait-screen');
const triviaInput = document.getElementById('trivia-input');
const answerSent = document.getElementById('answer-sent');

const btnJoin = document.getElementById('btn-join');
const inCode = document.getElementById('in-code');
const inName = document.getElementById('in-name');
const inHouse = document.getElementById('in-house');
const inGender = document.getElementById('in-gender');

const playerNameDisplay = document.getElementById('player-name-display');
const houseBanner = document.getElementById('house-banner');
const wandIcon = document.getElementById('wand-icon');

// Helper to switch views
function showMobileView(viewId) {
  [joinForm, waitScreen, triviaInput, answerSent].forEach(v => {
    if (v) v.style.display = 'none';
  });
  const target = document.getElementById(viewId);
  if (target) {
    target.style.display = (viewId === 'trivia-input' || viewId === 'join-form') ? 'block' : 'flex';
  }
}

// Session management
let clientId = localStorage.getItem('v2_clientId');
if (!clientId) {
  clientId = 'c_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('v2_clientId', clientId);
}

const urlParams = new URLSearchParams(window.location.search);
const roomParam = urlParams.get('room');
if (roomParam) inCode.value = roomParam.toUpperCase();

const savedRoom = localStorage.getItem('v2_roomCode');
const savedName = localStorage.getItem('v2_playerName');
if (savedRoom && savedName) {
  socket.emit('player_join', {
    roomCode: savedRoom,
    clientId,
    name: savedName,
    house: localStorage.getItem('v2_playerHouse') || 'Gryffindor',
    gender: localStorage.getItem('v2_playerGender') || 'wizard'
  });
}

btnJoin.addEventListener('click', () => {
  const roomCode = inCode.value.trim().toUpperCase();
  const name = inName.value.trim();
  if (!roomCode || !name) return alert('Datos incompletos');

  socket.emit('player_join', {
    roomCode, clientId, name,
    house: inHouse.value,
    gender: inGender.value
  });
});

// Generic Player Action
document.querySelectorAll('.btn-trivia').forEach(btn => {
  btn.addEventListener('click', () => {
    const answer = btn.getAttribute('data-answer');
    socket.emit('player_action', { answer });
    if (window.navigator?.vibrate) window.navigator.vibrate(50);
  });
});

socket.on('room_state', (state) => {
  const myPlayer = state.players.find(p => p.clientId === clientId);
  if (myPlayer) {
    localStorage.setItem('v2_roomCode', state.roomCode);
    localStorage.setItem('v2_playerName', myPlayer.name);
    localStorage.setItem('v2_playerHouse', myPlayer.house);
    localStorage.setItem('v2_playerGender', myPlayer.gender);

    if (state.status === 'lobby') {
      showMobileView('wait-screen');
      waitScreen.className = `wait-screen glass-panel theme-${myPlayer.house.toLowerCase()}`;
      playerNameDisplay.textContent = myPlayer.name;
      houseBanner.textContent = myPlayer.house;
      wandIcon.textContent = myPlayer.gender === 'wizard' ? '🧙‍♂️' : '🧙‍♀️';
    }
  }
});

// GENERIC GAME PLAYER STATE
socket.on('game_player_state', (data) => {
  if (data.phase === 'question' || data.phase === 'threat') {
    if (data.alreadyAnswered) {
      showMobileView('answer-sent');
    } else {
      showMobileView('trivia-input');
    }
  } else if (data.phase === 'results') {
    showMobileView('wait-screen');
  }
});

socket.on('answer_ack', (data) => {
  if (data.success) showMobileView('answer-sent');
});

socket.on('error_message', (msg) => alert(msg));
