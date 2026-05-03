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
  } else if (currentGameId === 'retratos_chismosos') {
    renderRetratosInput(data);
  } else if (currentGameId === 'hechizo_incompleto') {
    renderHechizoInput(data);
  } else if (currentGameId === 'mapa_travieso') {
    renderMapaInput(data);
  } else if (currentGameId === 'caldero_mentiroso') {
    renderCalderoInput(data);
  }
});

function renderRetratosInput(data) {
  if (data.alreadyAnswered) {
    showView('answer-sent');
    return;
  }
  showView('retratos-input');
  const container = document.getElementById('portrait-mobile-options');
  container.innerHTML = '';
  data.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'btn-target';
    btn.textContent = opt;
    btn.onclick = () => {
      socket.emit('player_action', { type: 'portrait_answer', answer: opt });
      showView('answer-sent');
    };
    container.appendChild(btn);
  });
}

function renderHechizoInput(data) {
  if (data.alreadyAnswered) {
    showView('answer-sent');
    return;
  }
  showView('hechizo-input');
  const container = document.getElementById('hechizo-mobile-options');
  container.innerHTML = '';
  data.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'btn-target';
    btn.textContent = opt;
    btn.onclick = () => {
      socket.emit('player_action', { type: 'spell_answer', answer: opt });
      showView('answer-sent');
    };
    container.appendChild(btn);
  });
}

function renderMapaInput(data) {
  if (data.alreadyAnswered) {
    showView('answer-sent');
    return;
  }
  if (data.phase === 'observe') {
    showView('wait-lobby');
    document.getElementById('wait-text').textContent = 'Observa el Mapa en la TV...';
  } else if (data.phase === 'answer') {
    showView('mapa-input');
    const container = document.getElementById('mapa-zones');
    container.innerHTML = '';
    data.options.forEach(zone => {
      const btn = document.createElement('button');
      btn.className = 'btn-target';
      btn.textContent = zone.name;
      btn.onclick = () => {
        socket.emit('player_action', { type: 'map_answer', zoneId: zone.id });
        showView('answer-sent');
      };
      container.appendChild(btn);
    });
  } else {
    showView('wait-lobby');
  }
}

function renderCalderoInput(data) {
  if (data.alreadyActed) {
    showView('answer-sent');
    return;
  }
  showView('caldero-input');
  const ing = data.myIngredient;
  document.getElementById('ing-emoji').textContent = ing.emoji;
  document.getElementById('ing-name').textContent = ing.name;
  document.getElementById('ing-desc').textContent = ing.description;
  
  // Color the card
  const card = document.getElementById('ingredient-card');
  const colors = { good: '#10b981', bad: '#ef4444', explosive: '#dc2626', gold: '#f59e0b' };
  card.style.borderTopColor = colors[ing.type] || 'var(--color-accent)';

  document.getElementById('caldero-actions').style.display = 'grid';
  document.getElementById('accuse-targets').style.display = 'none';

  document.getElementById('btn-caldero-add').onclick = () => {
    socket.emit('player_action', { type: 'caldero_action', actionData: { type: 'add' } });
  };
  document.getElementById('btn-caldero-discard').onclick = () => {
    socket.emit('player_action', { type: 'caldero_action', actionData: { type: 'discard' } });
  };
  document.getElementById('btn-caldero-accuse').onclick = () => {
    document.getElementById('caldero-actions').style.display = 'none';
    document.getElementById('accuse-targets').style.display = 'block';
    const grid = document.getElementById('accuse-grid');
    grid.innerHTML = '';
    data.players.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'btn-target';
      btn.innerHTML = `<span>${p.name}</span><small>${p.house}</small>`;
      btn.onclick = () => {
        socket.emit('player_action', { type: 'caldero_action', actionData: { type: 'accuse', targetClientId: p.clientId } });
      };
      grid.appendChild(btn);
    });
  };
  document.getElementById('btn-accuse-back').onclick = () => {
    document.getElementById('caldero-actions').style.display = 'grid';
    document.getElementById('accuse-targets').style.display = 'none';
  };
}

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
