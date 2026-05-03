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
  [joinForm, waitScreen, triviaInput, answerSent, document.getElementById('snitch-input'), document.getElementById('duelo-input'), document.getElementById('clash-input')].forEach(v => {
    if (v) v.style.display = 'none';
  });
  const target = document.getElementById(viewId);
  if (target) {
    target.style.display = (viewId === 'wait-screen' || viewId === 'answer-sent') ? 'flex' : 'block';
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

// Snitch Catch
document.getElementById('btn-catch').addEventListener('click', () => {
    socket.emit('player_action', { type: 'catch', timestamp: Date.now() });
    if (window.navigator?.vibrate) window.navigator.vibrate(50);
});

// Duelo Spell
document.querySelectorAll('.btn-duelo').forEach(btn => {
    btn.addEventListener('click', () => {
        socket.emit('player_action', { spell: btn.getAttribute('data-spell') });
        if (window.navigator?.vibrate) window.navigator.vibrate(50);
    });
});

// Clash Tap
document.getElementById('btn-clash').addEventListener('click', () => {
    socket.emit('player_action', { type: 'tap' });
    if (window.navigator?.vibrate) window.navigator.vibrate(30);
});

let currentPocionSequence = [];

// Pociones Submit
document.getElementById('btn-pociones-submit').addEventListener('click', () => {
    socket.emit('player_action', { sequence: currentPocionSequence });
    currentPocionSequence = [];
});

document.getElementById('btn-pociones-clear').addEventListener('click', () => {
    currentPocionSequence = [];
    document.getElementById('pociones-sequence-preview').textContent = '';
});

// GENERIC GAME PLAYER STATE
socket.on('game_player_state', (data) => {
  if (data.phase === 'question' || data.phase === 'threat') {
    if (data.alreadyAnswered) showMobileView('answer-sent');
    else showMobileView('trivia-input');
  } else if (data.phase === 'playing') {
    showMobileView('snitch-input');
    document.getElementById('snitch-feedback').textContent = `Intentos: ${data.attemptsRemaining}`;
  } else if (data.phase === 'selection') {
    if (data.isDuelist) {
        if (data.alreadyChosen) showMobileView('answer-sent');
        else showMobileView('duelo-input');
    } else {
        showMobileView('wait-screen');
    }
  } else if (data.phase === 'clash') {
    if (data.isDuelist) showMobileView('clash-input');
    else showMobileView('wait-screen');
  } else if (data.phase === 'prompt') {
    if (data.alreadyVoted) showMobileView('answer-sent');
    else renderSombreroVoting(data);
  } else if (data.phase === 'round_results' || data.phase === 'final_results') {
    showMobileView('wait-screen');
  } else if (data.phase === 'memorize') {
    showMobileView('wait-screen');
  } else if (data.phase === 'mix') {
    if (data.alreadySubmitted) showMobileView('answer-sent');
    else renderPocionesInput(data);
  } else if (data.phase === 'results') {
    showMobileView('wait-screen');
  }
});

function renderSombreroVoting(data) {
    showMobileView('sombrero-input');
    const grid = document.getElementById('sombrero-targets');
    grid.innerHTML = '';
    data.targets.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'btn-target';
        btn.innerHTML = `${t.name} <span style="font-size:0.7rem; opacity:0.6">${t.house}</span>`;
        btn.onclick = () => {
            socket.emit('player_action', { type: 'vote', targetClientId: t.clientId });
            showMobileView('answer-sent');
        };
        grid.appendChild(btn);
    });
}

function renderPocionesInput(data) {
    showMobileView('pociones-input');
    const label = document.getElementById('pociones-mode-label');
    if (data.mode === 'reverse') label.textContent = '¡PREPARA AL REVÉS!';
    else if (data.mode === 'unstable') label.textContent = '¡PREPARA RÁPIDO!';
    else label.textContent = 'Prepara la Poción';

    const grid = document.getElementById('pociones-ingredients');
    grid.innerHTML = '';
    data.ingredients.forEach(ing => {
        const btn = document.createElement('button');
        btn.className = 'btn-ing';
        btn.textContent = ing.emoji;
        btn.onclick = () => {
            currentPocionSequence.push(ing.id);
            document.getElementById('pociones-sequence-preview').textContent += ing.emoji;
            if (window.navigator?.vibrate) window.navigator.vibrate(30);
        };
        grid.appendChild(btn);
    });
}

// Update Pociones Submit Listener
document.getElementById('btn-pociones-submit').removeEventListener('click', null); // dummy cleanup
document.getElementById('btn-pociones-submit').onclick = () => {
    socket.emit('player_action', { type: 'potion_submit', selectedIngredientIds: currentPocionSequence });
    currentPocionSequence = [];
    document.getElementById('pociones-sequence-preview').textContent = '';
    showMobileView('answer-sent');
};

socket.on('catch_result', (data) => {
    const feedback = document.getElementById('snitch-feedback');
    feedback.textContent = `${data.label} (Intentos: ${data.attemptsRemaining})`;
    feedback.style.color = data.points > 0 ? '#10b981' : '#ef4444';
});

socket.on('answer_ack', (data) => {
  if (data.success) showMobileView('answer-sent');
});

socket.on('error_message', (msg) => alert(msg));
