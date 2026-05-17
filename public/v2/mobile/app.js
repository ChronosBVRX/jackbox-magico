const socket = io();

// Global Override to prevent browser alerts
window.alert = (msg) => {
    if (window.mobileAlert) {
        window.mobileAlert(msg);
    } else {
        console.warn("mobileAlert not ready yet, using console:", msg);
    }
};

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

let currentGameId = null;

// Helper to switch views
function showMobileView(viewId) {
  // Ocultar todas las vistas usando la clase común
  document.querySelectorAll('.mobile-view').forEach(el => {
    el.style.display = 'none';
  });
  
  const target = document.getElementById(viewId);
  if (target) {
    target.style.display = (viewId === 'wait-screen' || viewId === 'answer-sent' || viewId === 'story-wait-screen') ? 'flex' : 'block';
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
  if (!roomCode || !name) return mobileAlert('Datos incompletos');

  socket.emit('player_join', {
    roomCode, clientId, name,
    house: inHouse.value,
    gender: inGender.value
  });
});

const btnReady = document.getElementById('btn-ready');
if (btnReady) {
    btnReady.onclick = () => {
        socket.emit('player_ready');
        btnReady.disabled = true;
        btnReady.classList.add('ready');
        btnReady.textContent = '¡ESTÁS LISTO!';
    };
}

// Generic Player Action
document.querySelectorAll('.btn-trivia').forEach(btn => {
  btn.addEventListener('click', () => {
    const answer = btn.getAttribute('data-answer');
    socket.emit('player_action', { answer });
    if (window.navigator?.vibrate) window.navigator.vibrate(50);
  });
});

socket.on('game_started', (gameId) => {
  currentGameId = gameId;
});

// Helper for wait screen modes
function showWaitScreen(inGameMsg) {
    showMobileView('wait-screen');
    const lobbyContainer = document.getElementById('lobby-ready-container');
    const statusEl = document.getElementById('wait-screen-status');
    const myName = localStorage.getItem('v2_playerName') || 'Mago';
    
    if (!inGameMsg) {
        // Lobby mode
        if (lobbyContainer) lobbyContainer.style.display = 'block';
        if (statusEl) statusEl.innerHTML = `<strong id="player-name-display">${myName}</strong><br>Tu varita ya está conectada.`;
    } else {
        // In-game waiting mode
        if (lobbyContainer) lobbyContainer.style.display = 'none';
        if (statusEl) statusEl.innerHTML = `<strong id="player-name-display">${myName}</strong><br><span style="color:var(--color-accent); font-size:1.1rem; display:block; margin-top:0.5rem;">${inGameMsg}</span>`;
    }
}

socket.on('room_state', (state) => {
  currentGameId = state.currentGameId || currentGameId;
  const myPlayer = state.players.find(p => p.clientId === clientId);
  if (myPlayer) {
    localStorage.setItem('v2_roomCode', state.roomCode);
    localStorage.setItem('v2_playerName', myPlayer.name);
    localStorage.setItem('v2_playerHouse', myPlayer.house);
    localStorage.setItem('v2_playerGender', myPlayer.gender);

    if (state.status === 'lobby') {
      showWaitScreen();
      const waitScreenEl = document.getElementById('wait-screen');
      if (waitScreenEl) waitScreenEl.className = `wait-screen glass-panel theme-${myPlayer.house.toLowerCase()}`;
      if (playerNameDisplay) playerNameDisplay.textContent = myPlayer.name;
      if (houseBanner) houseBanner.textContent = myPlayer.house;
      if (wandIcon) wandIcon.textContent = myPlayer.gender === 'wizard' ? '🧙‍♂️' : '🧙‍♀️';
      
      if (btnReady) {
          if (myPlayer.isReady) {
              btnReady.disabled = true;
              btnReady.classList.add('ready');
              btnReady.textContent = '¡ESTÁS LISTO!';
          } else {
              btnReady.disabled = false;
              btnReady.classList.remove('ready');
              btnReady.textContent = '¡ESTOY LISTO!';
          }
      }
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
  if (data.phase === 'story_wait') {
    showMobileView('story-wait-screen');
    return;
  }
  if (data.phase === 'story_instructions') {
    renderStoryInstructionsMobile(data);
    showMobileView('story-instructions-mobile');
    return;
  }
  if (data.phase === 'story_personal_score') {
    renderStoryScoreMobile(data);
    showMobileView('story-personal-score');
    return;
  }

  if (data.phase === 'question' || data.phase === 'threat') {
    if (data.alreadyAnswered) showMobileView('answer-sent');
    else renderTriviaInput(data);
  } else if (data.phase === 'playing') {
    showMobileView('snitch-input');
    const attemptsEl = document.getElementById('snitch-attempts');
    const btnCatch = document.getElementById('btn-catch');
    if (attemptsEl) attemptsEl.textContent = `Intentos restantes: ${data.attemptsRemaining}`;
    if (btnCatch) {
        if (!data.canCatch || data.attemptsRemaining <= 0) {
            btnCatch.disabled = true;
            btnCatch.style.opacity = '0.5';
            btnCatch.textContent = '¡AGOTADO!';
        } else {
            btnCatch.disabled = false;
            btnCatch.style.opacity = '1';
            btnCatch.textContent = '¡ATRAPAR!';
        }
    }
  } else if (data.phase === 'selection') {
    if (data.isDuelist) {
        if (data.alreadyChosen) showMobileView('answer-sent');
        else showMobileView('duelo-input');
    } else {
        showWaitScreen('¡Duelo Mágico! Mira el enfrentamiento en la TV.');
    }
  } else if (data.phase === 'clash') {
    if (data.isDuelist) showMobileView('clash-input');
    else showWaitScreen('¡Choque de Hechizos! Apoya a tu compañero en la TV.');
  } else if (data.phase === 'prompt') {
    if (data.alreadyVoted) showMobileView('answer-sent');
    else renderSombreroVoting(data);
  } else if (data.phase === 'round_results' || data.phase === 'final_results') {
    showWaitScreen('¡Revisando los resultados en la TV!');
  } else if (data.phase === 'memorize') {
    showWaitScreen('¡Memoriza la secuencia mágica en la TV!');
  } else if (data.phase === 'mix') {
    if (data.alreadySubmitted) showMobileView('answer-sent');
    else renderPocionesInput(data);
  } else if (data.phase === 'results') {
    showWaitScreen('¡Revisando los puntajes y ganadores en la TV!');
  } else if (currentGameId === 'retratos_chismosos') {
    renderRetratosInput(data);
  } else if (currentGameId === 'hechizo_incompleto') {
    renderHechizoInput(data);
  } else if (currentGameId === 'patronus_personalizado') {
    renderPatronusInput(data);
  } else if (currentGameId === 'copa_final') {
    renderCopaInput(data);
  } else if (currentGameId === 'mapa_travieso') {
    renderMapaInput(data);
  } else if (currentGameId === 'caldero_mentiroso') {
    renderCalderoInput(data);
  } else if (currentGameId === 'beso_boda_muerte') {
    renderKMKInput(data);
  } else if (currentGameId === 'atrapa_snitch') {
    showMobileView('snitch-input');
  } else if (currentGameId === 'duelo_hechizos') {
    if (data.phase === 'selection') {
        if (data.alreadyChosen) showMobileView('answer-sent');
        else showMobileView('duelo-input');
    } else if (data.phase === 'clash') {
        showMobileView('clash-input');
    }
  }
});

let mobileTimerInterval = null;

function renderTriviaInput(data) {
    showMobileView('trivia-input');
    safeText('trivia-question-mobile', data.question || '...');
    
    const container = document.getElementById('trivia-mobile-options');
    if (!container) return;
    container.innerHTML = '';

    const labels = ['A', 'B', 'C', 'D'];
    if (data.options) {
        data.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = `btn-trivia btn-${labels[idx].toLowerCase()}`;
            btn.textContent = opt;
            btn.onclick = () => {
                socket.emit('player_action', { answer: opt });
                if (window.navigator?.vibrate) window.navigator.vibrate(50);
                showMobileView('answer-sent');
            };
            container.appendChild(btn);
        });
    }

    // Timer Sync
    const bar = document.getElementById('trivia-timer-mobile');
    const countEl = document.getElementById('trivia-timer-mobile-count');
    
    if (mobileTimerInterval) clearInterval(mobileTimerInterval);

    if (bar && data.startedAt && data.durationMs) {
        const updateTimer = () => {
            const elapsed = Date.now() - data.startedAt;
            const remaining = Math.max(0, data.durationMs - elapsed);
            const percent = (remaining / data.durationMs) * 100;
            const seconds = Math.ceil(remaining / 1000);
            
            bar.style.transition = 'none';
            bar.style.width = `${percent}%`;
            if (countEl) countEl.textContent = seconds;

            if (remaining <= 0) {
                clearInterval(mobileTimerInterval);
            }
        };

        updateTimer();
        mobileTimerInterval = setInterval(updateTimer, 100);
    }
}

function renderPatronusInput(data) {
  if (data.phase === 'submit') {
    if (data.alreadySubmitted) {
      showMobileView('answer-sent');
      return;
    }
    showMobileView('patronus-input');
    const submitArea = document.getElementById('patronus-submit-area');
    const voteArea = document.getElementById('patronus-vote-area');
    if (submitArea) submitArea.style.display = 'block';
    if (voteArea) voteArea.style.display = 'none';
    const promptEl = document.getElementById('patronus-prompt-mobile');
    if (promptEl) promptEl.textContent = data.prompt || '';
    
    const btn = document.getElementById('btn-patronus-submit');
    if (btn) {
      btn.onclick = () => {
        const textEl = document.getElementById('patronus-text');
        const text = textEl ? textEl.value : '';
        if (!text.trim()) return;
        socket.emit('player_action', { type: 'patronus_submit', text });
        showMobileView('answer-sent');
      };
    }
  } else if (data.phase === 'vote') {
    if (data.alreadyVoted) {
      showMobileView('answer-sent');
      return;
    }
    showMobileView('patronus-input');
    const submitArea = document.getElementById('patronus-submit-area');
    const voteArea = document.getElementById('patronus-vote-area');
    if (submitArea) submitArea.style.display = 'none';
    if (voteArea) voteArea.style.display = 'block';
    
    const container = document.getElementById('patronus-mobile-options');
    if (container && data.submissions) {
      container.innerHTML = '';
      data.submissions.forEach(sub => {
        const btn = document.createElement('button');
        btn.className = 'btn-target';
        btn.textContent = sub.text;
        btn.onclick = () => {
          socket.emit('player_action', { type: 'patronus_vote', submissionId: sub.id });
          showMobileView('answer-sent');
        };
        container.appendChild(btn);
      });
    }
  }
}

function renderCopaInput(data) {
  if (data.phase === 'wager') {
    if (data.alreadyWagered) {
      showMobileView('answer-sent');
      return;
    }
    showMobileView('copafinal-input');
    const wagerArea = document.getElementById('copa-wager-area');
    const questionArea = document.getElementById('copa-question-area');
    if (wagerArea) wagerArea.style.display = 'block';
    if (questionArea) questionArea.style.display = 'none';
    const scoreEl = document.getElementById('copa-my-score');
    if (scoreEl) scoreEl.textContent = data.myScore || 0;
    
    const container = document.getElementById('copa-wager-options');
    if (container && data.wagerOptions) {
      container.innerHTML = '';
      data.wagerOptions.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'btn-target';
        btn.textContent = `${opt} Pts`;
        btn.onclick = () => {
          socket.emit('player_action', { type: 'final_wager', amount: opt });
          showMobileView('answer-sent');
        };
        container.appendChild(btn);
      });
      // Add All-In if score > 0
      if (data.myScore > 0 && !data.wagerOptions.includes(data.myScore)) {
          const btnAll = document.createElement('button');
          btnAll.className = 'btn-target';
          btnAll.style.borderLeft = '5px solid #d4af37';
          btnAll.textContent = `¡TODO O NADA! (${data.myScore})`;
          btnAll.onclick = () => {
              socket.emit('player_action', { type: 'final_wager', amount: data.myScore });
              showMobileView('answer-sent');
          };
          container.appendChild(btnAll);
      }
    }
  } else if (data.phase === 'question') {
    if (data.alreadyAnswered) {
      showMobileView('answer-sent');
      return;
    }
    showMobileView('copafinal-input');
    const wagerArea = document.getElementById('copa-wager-area');
    const questionArea = document.getElementById('copa-question-area');
    if (wagerArea) wagerArea.style.display = 'none';
    if (questionArea) questionArea.style.display = 'block';
    
    const container = document.getElementById('copa-mobile-options');
    if (container && data.options) {
      container.innerHTML = '';
      data.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = `btn-trivia btn-${['a','b','c','d'][idx]}`;
        btn.textContent = opt;
        btn.onclick = () => {
          socket.emit('player_action', { type: 'final_answer', answer: opt });
          showMobileView('answer-sent');
        };
        container.appendChild(btn);
      });
    }
  }
}

function renderRetratosInput(data) {
  if (data.alreadyAnswered) {
    showMobileView('answer-sent');
    return;
  }
  showMobileView('retratos-input');
  const container = document.getElementById('portrait-mobile-options');
  if (container && data.options) {
    container.innerHTML = '';
    data.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'btn-target';
      btn.textContent = opt;
      btn.onclick = () => {
        socket.emit('player_action', { type: 'portrait_answer', answer: opt });
        showMobileView('answer-sent');
      };
      container.appendChild(btn);
    });
  }
}

function renderHechizoInput(data) {
  if (data.alreadyAnswered) {
    showMobileView('answer-sent');
    return;
  }
  showMobileView('hechizo-input');
  const container = document.getElementById('hechizo-mobile-options');
  if (container && data.options) {
    container.innerHTML = '';
    data.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'btn-target';
      btn.textContent = opt;
      btn.onclick = () => {
        socket.emit('player_action', { type: 'spell_answer', answer: opt });
        showMobileView('answer-sent');
      };
      container.appendChild(btn);
    });
  }
}

function renderMapaInput(data) {
  if (data.alreadyAnswered) {
    showMobileView('answer-sent');
    return;
  }
  if (data.phase === 'observe') {
    showMobileView('wait-screen');
    const statusTextEl = document.querySelector('#wait-screen .status-text');
    if (statusTextEl) statusTextEl.innerHTML = 'Observa el Mapa en la TV...';
  } else if (data.phase === 'answer') {
    showMobileView('mapa-input');
    const container = document.getElementById('mapa-zones');
    if (container && data.options) {
      container.innerHTML = '';
      data.options.forEach(zone => {
        const btn = document.createElement('button');
        btn.className = 'btn-target';
        btn.textContent = zone.name;
        btn.onclick = () => {
          socket.emit('player_action', { type: 'map_answer', zoneId: zone.id });
          showMobileView('answer-sent');
        };
        container.appendChild(btn);
      });
    }
  } else {
    showMobileView('wait-screen');
  }
}

function renderCalderoInput(data) {
  if (data.alreadyActed) {
    showMobileView('answer-sent');
    return;
  }
  showMobileView('caldero-input');
  const ing = data.myIngredient;
  if (!ing) return;
  safeText('ing-emoji', ing.emoji);
  safeText('ing-name', ing.name);
  safeText('ing-desc', ing.description);
  
  // Color the card
  const card = document.getElementById('ingredient-card');
  if (card) {
    const colors = { good: '#10b981', bad: '#ef4444', explosive: '#dc2626', gold: '#f59e0b' };
    card.style.borderTopColor = colors[ing.type] || 'var(--color-accent)';
  }

  const actions = document.getElementById('caldero-actions');
  const targets = document.getElementById('accuse-targets');
  if (actions) actions.style.display = 'grid';
  if (targets) targets.style.display = 'none';

  const btnAdd = document.getElementById('btn-caldero-add');
  if (btnAdd) btnAdd.onclick = () => {
    socket.emit('player_action', { type: 'caldero_action', actionData: { type: 'add' } });
  };
  const btnDiscard = document.getElementById('btn-caldero-discard');
  if (btnDiscard) btnDiscard.onclick = () => {
    socket.emit('player_action', { type: 'caldero_action', actionData: { type: 'discard' } });
  };
  const btnAccuse = document.getElementById('btn-caldero-accuse');
  if (btnAccuse) btnAccuse.onclick = () => {
    if (actions) actions.style.display = 'none';
    if (targets) targets.style.display = 'block';
    const grid = document.getElementById('accuse-grid');
    if (grid && data.players) {
      grid.innerHTML = '';
      data.players.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'btn-target';
        btn.innerHTML = `<span>${escapeHTML(p.name)}</span><small>${escapeHTML(p.house)}</small>`;
        btn.onclick = () => {
          socket.emit('player_action', { type: 'caldero_action', actionData: { type: 'accuse', targetClientId: p.clientId } });
        };
        grid.appendChild(btn);
      });
    }
  };
  const btnBack = document.getElementById('btn-accuse-back');
  if (btnBack) btnBack.onclick = () => {
    if (actions) actions.style.display = 'grid';
    if (targets) targets.style.display = 'none';
  };
}

function safeText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? '';
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
    const attemptsEl = document.getElementById('snitch-attempts');
    const btnCatch = document.getElementById('btn-catch');
    if (feedback) {
        feedback.textContent = data.label;
        feedback.style.color = data.points > 0 ? '#10b981' : '#ef4444';
    }
    if (attemptsEl) {
        attemptsEl.textContent = `Intentos restantes: ${data.attemptsRemaining}`;
    }
    if (btnCatch && data.attemptsRemaining <= 0) {
        btnCatch.disabled = true;
        btnCatch.style.opacity = '0.5';
        btnCatch.textContent = '¡AGOTADO!';
    }
});

socket.on('answer_ack', (data) => {
  if (data.success) showMobileView('answer-sent');
});

window.mobileAlert = function(msg) {
    const el = document.getElementById('mobile-alert-msg');
    const view = document.getElementById('mobile-alert');
    if (el) el.textContent = msg;
    if (view) view.style.display = 'flex';
}

window.closeMobileAlert = function() {
    const view = document.getElementById('mobile-alert');
    if (view) view.style.display = 'none';
};

socket.on('error_message', (msg) => mobileAlert(msg));

// Global Override to prevent browser alerts
window.alert = (msg) => mobileAlert(msg);

function renderStoryInstructionsMobile(data) {
    const instr = data.instructions;
    if (!instr) return;
    safeText('story-instr-title-mobile', instr.title);
    safeText('story-instr-subtitle-mobile', instr.subtitle);
    const list = document.getElementById('story-instr-rules-mobile');
    list.innerHTML = '';
    instr.rules.forEach(r => {
        const li = document.createElement('li');
        li.style.marginBottom = '0.5rem';
        li.textContent = '✦ ' + r;
        list.appendChild(li);
    });
}

function renderStoryScoreMobile(data) {
    safeText('story-personal-points', data.points || 0);
}

let currentKMKChoices = {};

function renderKMKInput(data) {
    if (data.phase === 'results') {
        showWaitScreen('¡Mira las escandalosas revelaciones en la TV!');
        return;
    }
    if (data.alreadySubmitted) {
        showMobileView('answer-sent');
        return;
    }

    showMobileView('kmk-input');
    const headerEl = document.getElementById('kmk-mobile-role');
    if (headerEl) {
        headerEl.textContent = data.isTarget 
            ? '¡ERES EL PROTAGONISTA! Elige tu destino para cada personaje:' 
            : `¡PREDICE LAS ELECCIONES DE ${data.targetPlayerName.toUpperCase()}!`;
        headerEl.className = data.isTarget ? 'text-gradient-gold' : 'text-gradient';
    }

    const container = document.getElementById('kmk-mobile-characters');
    if (container) {
        container.innerHTML = '';
        currentKMKChoices = {};

        data.characters.forEach(char => {
            const card = document.createElement('div');
            card.className = 'kmk-mobile-char-card glass-panel';
            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1.2rem; margin-bottom: 1.2rem;">
                    <div style="position: relative; width: 80px; height: 80px; flex-shrink: 0; border-radius: 50%; overflow: hidden; border: 2px solid var(--color-accent);">
                        <img src="${char.image || '/assets/images/snitch/snitch.png'}" alt="${char.name}" style="width: 100%; height: 100%; object-fit: cover;">
                        <div style="position: absolute; bottom: 2px; right: 2px; background: rgba(0,0,0,0.8); border-radius: 50%; padding: 0.2rem; font-size: 1rem;">${char.emoji}</div>
                    </div>
                    <div>
                        <h3 style="margin:0 0 0.3rem 0; font-size: 1.3rem; color: white;">${char.name}</h3>
                        <div style="font-size: 0.9rem; color: var(--color-accent); margin-bottom: 0.3rem;">${char.movieTitle}</div>
                        <div style="font-size: 0.85rem; color: var(--color-text-dim); line-height: 1.3;">${char.description}</div>
                    </div>
                </div>
                <div class="kmk-btn-group" id="group-${char.id}" style="display: flex; gap: 0.5rem;">
                    <button class="btn-kmk-choice" data-char="${char.id}" data-choice="kiss" style="flex:1; padding: 0.8rem; border-radius: 10px; border: 1px solid #ec4899; background: rgba(236,72,153,0.1); color: #ec4899; font-weight: bold;">💋 Beso</button>
                    <button class="btn-kmk-choice" data-char="${char.id}" data-choice="marry" style="flex:1; padding: 0.8rem; border-radius: 10px; border: 1px solid #3b82f6; background: rgba(59,130,246,0.1); color: #3b82f6; font-weight: bold;">💍 Boda</button>
                    <button class="btn-kmk-choice" data-char="${char.id}" data-choice="kill" style="flex:1; padding: 0.8rem; border-radius: 10px; border: 1px solid #10b981; background: rgba(16,185,129,0.1); color: #10b981; font-weight: bold;">💀 Muerte</button>
                </div>
            `;
            container.appendChild(card);
        });

        document.querySelectorAll('.btn-kmk-choice').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const charId = btn.getAttribute('data-char');
                const choice = btn.getAttribute('data-choice');
                
                // Verificar si esta elección ya fue asignada a otro personaje
                Object.entries(currentKMKChoices).forEach(([otherChar, otherChoice]) => {
                    if (otherChar !== charId && otherChoice === choice) {
                        delete currentKMKChoices[otherChar];
                        // Limpiar botones de ese otro personaje
                        const otherGroup = document.getElementById(`group-${otherChar}`);
                        if (otherGroup) {
                            otherGroup.querySelectorAll('.btn-kmk-choice').forEach(b => b.classList.remove('selected'));
                        }
                    }
                });

                currentKMKChoices[charId] = choice;

                // Actualizar UI del grupo actual
                const group = document.getElementById(`group-${charId}`);
                group.querySelectorAll('.btn-kmk-choice').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');

                // Habilitar botón de enviar si ya eligió los 3
                const btnSubmit = document.getElementById('btn-kmk-submit');
                if (btnSubmit) {
                    const keys = Object.keys(currentKMKChoices);
                    btnSubmit.disabled = keys.length < 3;
                }
            });
        });
    }

    const btnSubmit = document.getElementById('btn-kmk-submit');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.onclick = () => {
            if (Object.keys(currentKMKChoices).length === 3) {
                socket.emit('player_action', { type: 'kmk_submit', choices: currentKMKChoices });
                showMobileView('answer-sent');
            }
        };
    }
}
