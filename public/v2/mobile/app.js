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

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showLobbyWait() {
  showMobileView('wait-screen');

  const lobbyContainer = document.getElementById('lobby-ready-container');
  const hostControls = document.getElementById('host-controls-container');
  const statusEl = document.getElementById('wait-screen-status');
  const myName = localStorage.getItem('v2_playerName') || 'Mago';

  if (lobbyContainer) lobbyContainer.style.display = 'block';
  if (hostControls) hostControls.style.display = 'none';

  if (statusEl) {
    statusEl.innerHTML = `
      <strong id="player-name-display">${escapeHTML(myName)}</strong><br>
      Tu varita ya está conectada.
    `;
  }
}

function showGameInfo(message, title = 'Mira la TV') {
  showMobileView('wait-screen');

  const lobbyContainer = document.getElementById('lobby-ready-container');
  const hostControls = document.getElementById('host-controls-container');
  const statusEl = document.getElementById('wait-screen-status');
  const myName = localStorage.getItem('v2_playerName') || 'Mago';

  if (lobbyContainer) lobbyContainer.style.display = 'none';
  if (hostControls) hostControls.style.display = 'none';

  if (statusEl) {
    statusEl.innerHTML = `
      <strong>${escapeHTML(title)}</strong><br>
      <span style="color:var(--color-accent); font-size:1.05rem; display:block; margin-top:0.5rem;">
        ${escapeHTML(message)}
      </span>
      <small style="display:block; margin-top:1rem; opacity:0.7;">
        Varita conectada como ${escapeHTML(myName)}
      </small>
    `;
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
      showLobbyWait();
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

      const hostControls = document.getElementById('host-controls-container');
      if (hostControls) {
        hostControls.style.display = myPlayer.isHost ? 'block' : 'none';
      }
    } else if (state.status === 'playing' || state.status === 'story') {
      showGameInfo('Sigue las instrucciones en la TV.', 'Partida en Curso');
    }
  }
});

const btnHostReset = document.getElementById('btn-host-reset');
const btnHostNext = document.getElementById('btn-host-next');

if (btnHostReset) {
  btnHostReset.addEventListener('click', () => {
    if (confirm('¿Estás seguro de reiniciar la sala al lobby? (Plan B de emergencia)')) {
      socket.emit('tv_back_to_lobby');
    }
  });
}

if (btnHostNext) {
  btnHostNext.addEventListener('click', () => {
    if (confirm('¿Forzar el avance al siguiente bloque de historia?')) {
      socket.emit('tv_story_next');
    }
  });
}

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

document.getElementById('btn-pociones-clear').addEventListener('click', () => {
    currentPocionSequence = [];
    document.getElementById('pociones-sequence-preview').textContent = '';
    const submitBtn = document.getElementById('btn-pociones-submit');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
    }
});

// GENERIC GAME PLAYER STATE
socket.on('game_player_state', (data) => {
  // 1. Estados de historia
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

  // 2. Resolver primero por minijuego activo
  switch (currentGameId) {
    case 'trivia_magica':
    case 'artes_ridiculas':
      if (data.phase === 'question' || data.phase === 'threat') {
        if (data.alreadyAnswered) showMobileView('answer-sent');
        else renderTriviaInput(data);
      } else if (data.phase === 'results') {
        showGameInfo('Revisa la respuesta correcta y los puntos en la TV.', 'Resultados');
      } else {
        showGameInfo('Prepárate para la siguiente pregunta.');
      }
      return;

    case 'atrapa_snitch':
      if (data.phase === 'playing') {
        showMobileView('snitch-input');
        const attemptsEl = document.getElementById('snitch-attempts');
        const btnCatch = document.getElementById('btn-catch');

        if (attemptsEl) attemptsEl.textContent = `Intentos restantes: ${data.attemptsRemaining}`;

        if (btnCatch) {
          const disabled = !data.canCatch || data.attemptsRemaining <= 0;
          btnCatch.disabled = disabled;
          btnCatch.style.opacity = disabled ? '0.5' : '1';
          btnCatch.textContent = disabled ? '¡AGOTADO!' : '¡ATRAPAR!';
        }
      } else {
        showGameInfo('Mira en la TV quién atrapó la Snitch.', 'Resultados de Quidditch');
      }
      return;

    case 'duelo_hechizos':
      if (data.phase === 'selection') {
        if (!data.isDuelist) {
          showGameInfo('Hay un duelo en curso. Observa a los duelistas en la TV.', 'Duelo Mágico');
        } else if (data.alreadyChosen) {
          showMobileView('answer-sent');
        } else {
          showMobileView('duelo-input');
        }
      } else if (data.phase === 'clash') {
        if (data.isDuelist) showMobileView('clash-input');
        else showGameInfo('Choque de varitas en curso. Sigue el enfrentamiento en la TV.', 'Choque de Hechizos');
      } else {
        showGameInfo('Revisa el resultado del duelo en la TV.', 'Resultado del Duelo');
      }
      return;

    case 'sombrero_burlon':
      if (data.phase === 'prompt') {
        if (data.alreadyVoted) showMobileView('answer-sent');
        else renderSombreroVoting(data);
      } else {
        showGameInfo('El Sombrero está revelando los resultados en la TV.', 'Sombrero Burlón');
      }
      return;

    case 'clase_pociones':
      if (data.phase === 'memorize') {
        showGameInfo('Memoriza la secuencia de ingredientes en la TV.', 'Clase de Pociones');
      } else if (data.phase === 'mix') {
        if (data.alreadySubmitted) showMobileView('answer-sent');
        else renderPocionesInput(data);
      } else {
        showGameInfo('Revisa si tu poción salió perfecta en la TV.', 'Resultados de Pociones');
      }
      return;

    case 'mapa_travieso':
      renderMapaInput(data);
      return;

    case 'retratos_chismosos':
      renderRetratosInput(data);
      return;

    case 'hechizo_incompleto':
      renderHechizoInput(data);
      return;

    case 'patronus_personalizado':
      renderPatronusInput(data);
      return;

    case 'copa_final':
      renderCopaInput(data);
      return;

    case 'caldero_mentiroso':
      renderCalderoInput(data);
      return;

    case 'beso_boda_muerte':
      renderKMKInput(data);
      return;

    case 'el_impostor':
      renderImpostorInput(data);
      return;

    case 'el_tiburon':
      renderTiburonInput(data);
      return;

    case 'dictado_magico':
      renderDictadoInput(data);
      return;
  }

  // 3. Fallback seguro: nunca mostrar lobby si ya hay juego
  if (currentGameId) {
    showGameInfo('Sigue las instrucciones en la TV.');
    return;
  }

  // 4. Sin juego activo: lobby
  showLobbyWait();
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
  
  let clueStatusEl = document.getElementById('retratos-clue-status');
  if (!clueStatusEl) {
    const parent = document.getElementById('retratos-input');
    clueStatusEl = document.createElement('div');
    clueStatusEl.id = 'retratos-clue-status';
    clueStatusEl.className = 'glass-panel';
    clueStatusEl.style.margin = '1rem 0';
    clueStatusEl.style.padding = '0.8rem';
    clueStatusEl.style.textAlign = 'center';
    clueStatusEl.style.fontWeight = 'bold';
    clueStatusEl.style.borderRadius = '10px';
    if (parent && parent.firstChild) parent.insertBefore(clueStatusEl, parent.firstChild);
  }

  const clueNum = (data.clueIndex || 0) + 1;
  const pts = clueNum === 1 ? '100 pts' : (clueNum === 2 ? '60 pts' : '30 pts');
  clueStatusEl.textContent = `Pista actual: #${clueNum} (${pts})`;
  clueStatusEl.style.background = clueNum === 1 ? 'rgba(16, 185, 129, 0.2)' : (clueNum === 2 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)');
  clueStatusEl.style.color = clueNum === 1 ? '#10b981' : (clueNum === 2 ? '#f59e0b' : '#ef4444');

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
    showGameInfo('Observa el Mapa Travieso en la TV. Memoriza la ubicación antes de responder.', 'Mapa Travieso');
    return;
  }

  if (data.phase === 'answer') {
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
    return;
  }

  showGameInfo('Sigue la acción en la TV.', 'Mapa Travieso');
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

let currentExpectedCount = 4;

function renderPocionesInput(data) {
    showMobileView('pociones-input');
    currentPocionSequence = [];
    document.getElementById('pociones-sequence-preview').textContent = '';
    
    currentExpectedCount = data.expectedCount || 4;
    const label = document.getElementById('pociones-mode-label');
    const modeText = data.mode === 'reverse' ? '¡PREPARA AL REVÉS!' : (data.mode === 'unstable' ? '¡PREPARA RÁPIDO!' : 'Prepara la Poción');
    label.textContent = `${modeText} (${currentExpectedCount} ing.)`;

    const submitBtn = document.getElementById('btn-pociones-submit');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
    }

    const grid = document.getElementById('pociones-ingredients');
    grid.innerHTML = '';
    data.ingredients.forEach(ing => {
        const btn = document.createElement('button');
        btn.className = 'btn-ing';
        btn.textContent = ing.emoji;
        btn.onclick = () => {
            if (currentPocionSequence.length < currentExpectedCount) {
                currentPocionSequence.push(ing.id);
                document.getElementById('pociones-sequence-preview').textContent += ing.emoji;
                if (window.navigator?.vibrate) window.navigator.vibrate(30);
            }
            if (currentPocionSequence.length >= currentExpectedCount && submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1.0';
            }
        };
        grid.appendChild(btn);
    });
}

// Update Pociones Submit Listener
const submitBtnEl = document.getElementById('btn-pociones-submit');
if (submitBtnEl) {
    submitBtnEl.onclick = () => {
        if (currentPocionSequence.length < currentExpectedCount) return;
        socket.emit('player_action', { type: 'potion_submit', selectedIngredientIds: currentPocionSequence });
        currentPocionSequence = [];
        document.getElementById('pociones-sequence-preview').textContent = '';
        showMobileView('answer-sent');
    };
}

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
let currentKMKTarget = null;

function renderKMKInput(data) {
    if (data.phase === 'results') {
        showGameInfo('¡Mira las escandalosas revelaciones en la TV!', 'Beso, Boda, Muerte');
        currentKMKTarget = null;
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
    if (container && data.targetPlayerName !== currentKMKTarget) {
        currentKMKTarget = data.targetPlayerName;
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

function renderImpostorInput(data) {
    if (data.phase === 'results') {
        showGameInfo('¡Mira el resultado de la misión en la TV!', 'El Impostor');
        return;
    }
    if (data.alreadyVoted) {
        showMobileView('answer-sent');
        return;
    }

    showMobileView('impostor-input');

    const roleHeader = document.getElementById('impostor-mobile-role');
    const locCard = document.getElementById('impostor-mobile-loc-card');
    const spyCard = document.getElementById('impostor-mobile-spy-card');
    const catalogContainer = document.getElementById('impostor-mobile-catalog');
    const votingContainer = document.getElementById('impostor-mobile-voting');
    const guessingContainer = document.getElementById('impostor-mobile-guessing');

    if (roleHeader) {
        roleHeader.textContent = data.isSpy ? '⚠️ ESPÍA MORTÍFAGO ⚠️' : '🧙 MAGO LEAL 🧙';
        roleHeader.style.color = data.isSpy ? '#ef4444' : '#10b981';
    }

    if (data.phase === 'playing') {
        if (votingContainer) votingContainer.style.display = 'none';
        if (guessingContainer) guessingContainer.style.display = 'none';

        if (data.isSpy) {
            if (locCard) locCard.style.display = 'none';
            if (spyCard) spyCard.style.display = 'block';
            if (catalogContainer) catalogContainer.style.display = 'block';

            const catalogList = document.getElementById('impostor-catalog-list');
            if (catalogList) {
                catalogList.innerHTML = '';
                data.locationsCatalog.forEach(loc => {
                    const item = document.createElement('div');
                    item.className = 'glass-panel';
                    item.style.padding = '0.8rem 1.2rem';
                    item.style.display = 'flex';
                    item.style.alignItems = 'center';
                    item.style.gap = '1rem';
                    item.style.borderRadius = '10px';
                    item.innerHTML = `
                        <span style="font-size: 1.8rem;">${loc.emoji}</span>
                        <div style="text-align: left;">
                            <div style="font-weight: bold; color: white; font-size: 1.1rem;">${loc.name}</div>
                            <div style="font-size: 0.85rem; color: var(--color-text-dim);">${loc.description}</div>
                        </div>
                    `;
                    catalogList.appendChild(item);
                });
            }
        } else {
            if (locCard) locCard.style.display = 'block';
            if (spyCard) spyCard.style.display = 'none';
            if (catalogContainer) catalogContainer.style.display = 'none';

            safeText('impostor-mobile-loc-name', data.location.name);
            safeText('impostor-mobile-loc-desc', data.location.description);
            safeText('impostor-mobile-loc-emoji', data.location.emoji);
        }
    } else if (data.phase === 'voting') {
        if (locCard) locCard.style.display = 'none';
        if (spyCard) spyCard.style.display = 'none';
        if (catalogContainer) catalogContainer.style.display = 'none';

        if (data.isSpy) {
            if (votingContainer) votingContainer.style.display = 'none';
            if (guessingContainer) guessingContainer.style.display = 'block';

            const guessList = document.getElementById('impostor-guess-list');
            if (guessList) {
                guessList.innerHTML = '';
                data.locationsCatalog.forEach(loc => {
                    const btn = document.createElement('button');
                    btn.className = 'btn-join-premium';
                    btn.style.width = '100%';
                    btn.style.padding = '1rem';
                    btn.style.display = 'flex';
                    btn.style.alignItems = 'center';
                    btn.style.gap = '1rem';
                    btn.style.justifyContent = 'flex-start';
                    btn.style.background = 'rgba(16,185,129,0.1)';
                    btn.style.border = '1px solid #10b981';
                    btn.style.color = 'white';
                    btn.innerHTML = `
                        <span style="font-size: 2rem;">${loc.emoji}</span>
                        <div style="text-align: left;">
                            <div style="font-weight: bold; font-size: 1.2rem;">${loc.name}</div>
                            <div style="font-size: 0.85rem; color: var(--color-text-dim);">${loc.description}</div>
                        </div>
                    `;
                    btn.onclick = () => {
                        socket.emit('player_action', { type: 'impostor_guess', guessedLocationId: loc.id });
                        showMobileView('answer-sent');
                    };
                    guessList.appendChild(btn);
                });
            }
        } else {
            if (votingContainer) votingContainer.style.display = 'block';
            if (guessingContainer) guessingContainer.style.display = 'none';

            const playersList = document.getElementById('impostor-players-list');
            if (playersList && data.players) {
                playersList.innerHTML = '';
                data.players.forEach(p => {
                    const btn = document.createElement('button');
                    btn.className = 'btn-join-premium';
                    btn.style.width = '100%';
                    btn.style.padding = '1.2rem';
                    btn.style.fontSize = '1.3rem';
                    btn.style.background = 'rgba(239,68,68,0.1)';
                    btn.style.border = '1px solid #ef4444';
                    btn.style.color = 'white';
                    btn.innerHTML = `Votar por <strong style="color:white">${escapeHTML(p.name)}</strong> <span style="font-size:0.8rem; opacity:0.7">(${p.house})</span>`;
                    btn.onclick = () => {
                        socket.emit('player_action', { type: 'impostor_vote', votedClientId: p.clientId });
                        showMobileView('answer-sent');
                    };
                    playersList.appendChild(btn);
                });
            }
        }
    }
}

let tiburonCanvasCtx = null;
let isDrawingTiburon = false;
let lastDrawX = 0;
let lastDrawY = 0;

function initTiburonCanvas() {
    const canvas = document.getElementById('tiburon-canvas');
    if (!canvas) return;
    
    if (!tiburonCanvasCtx) {
        tiburonCanvasCtx = canvas.getContext('2d');
        tiburonCanvasCtx.fillStyle = '#ffffff';
        tiburonCanvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        const startDraw = (e) => {
            isDrawingTiburon = true;
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            lastDrawX = ((clientX - rect.left) / rect.width) * canvas.width;
            lastDrawY = ((clientY - rect.top) / rect.height) * canvas.height;
        };

        const draw = (e) => {
            if (!isDrawingTiburon) return;
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const currentX = ((clientX - rect.left) / rect.width) * canvas.width;
            const currentY = ((clientY - rect.top) / rect.height) * canvas.height;

            tiburonCanvasCtx.beginPath();
            tiburonCanvasCtx.moveTo(lastDrawX, lastDrawY);
            tiburonCanvasCtx.lineTo(currentX, currentY);
            tiburonCanvasCtx.strokeStyle = '#000000';
            tiburonCanvasCtx.lineWidth = 6;
            tiburonCanvasCtx.lineCap = 'round';
            tiburonCanvasCtx.lineJoin = 'round';
            tiburonCanvasCtx.stroke();

            lastDrawX = currentX;
            lastDrawY = currentY;
        };

        const stopDraw = () => {
            isDrawingTiburon = false;
        };

        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDraw);
        canvas.addEventListener('mouseleave', stopDraw);

        canvas.addEventListener('touchstart', startDraw, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDraw);
    } else {
        tiburonCanvasCtx.fillStyle = '#ffffff';
        tiburonCanvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function renderTiburonInput(data) {
    if (data.phase === 'results') {
        showGameInfo('¡Mira qué invento se llevó la mayor inversión en la TV!', 'Tanque de Tiburones');
        return;
    }
    if (data.phase === 'pitching') {
        if (data.alreadyInvested) {
            showMobileView('answer-sent');
            return;
        }
        showMobileView('tiburon-input');
        document.getElementById('tiburon-mobile-drawing').style.display = 'none';
        document.getElementById('tiburon-mobile-investing').style.display = 'flex';
        safeText('tiburon-mobile-title', 'Tanque de Tiburones');
        safeText('tiburon-mobile-subtitle', 'Analiza la creación en la TV y decide tu inversión');
        safeText('tiburon-my-galeones', data.myGaleones || 0);

        document.querySelectorAll('.btn-tiburon-invest').forEach(btn => {
            const amount = parseInt(btn.getAttribute('data-amount'), 10);
            btn.disabled = amount > (data.myGaleones || 0);
            btn.style.opacity = btn.disabled ? '0.4' : '1';
            btn.onclick = () => {
                socket.emit('player_action', { type: 'tiburon_invest', amount });
                showMobileView('answer-sent');
            };
        });
        return;
    }

    if (data.alreadySubmitted) {
        showMobileView('answer-sent');
        return;
    }

    showMobileView('tiburon-input');
    document.getElementById('tiburon-mobile-drawing').style.display = 'flex';
    document.getElementById('tiburon-mobile-investing').style.display = 'none';

    const prevContainer = document.getElementById('tiburon-prev-container');
    const prevImg = document.getElementById('tiburon-prev-img');

    if (data.phase === 'drawing_top') {
        safeText('tiburon-mobile-title', 'Fase 1: Parte Superior');
        safeText('tiburon-mobile-subtitle', `Dibuja: "${data.prompt}"`);
        if (prevContainer) prevContainer.style.display = 'none';
    } else {
        safeText('tiburon-mobile-title', 'Fase 2: Modo Complemento');
        safeText('tiburon-mobile-subtitle', '¡Completa la parte inferior sin saber qué era!');
        if (prevContainer) {
            prevContainer.style.display = 'block';
            if (prevImg) prevImg.src = data.topLines || '';
        }
    }

    initTiburonCanvas();

    const btnClear = document.getElementById('btn-tiburon-clear');
    const btnSubmit = document.getElementById('btn-tiburon-submit-draw');

    if (btnClear) {
        btnClear.onclick = () => {
            const canvas = document.getElementById('tiburon-canvas');
            if (canvas && tiburonCanvasCtx) {
                tiburonCanvasCtx.fillStyle = '#ffffff';
                tiburonCanvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            }
        };
    }

    if (btnSubmit) {
        btnSubmit.onclick = () => {
            const canvas = document.getElementById('tiburon-canvas');
            if (canvas) {
                const lines = canvas.toDataURL('image/png');
                socket.emit('player_action', { type: 'tiburon_submit_draw', lines });
                showMobileView('answer-sent');
            }
        };
    }
}

function renderDictadoInput(data) {
    if (data.phase === 'results') {
        showGameInfo('¡Mira las transcripciones ganadoras en la TV!', 'Dictado Mágico');
        return;
    }

    if (data.phase === 'voting_host') {
        showMobileView('dictado-input');
        document.getElementById('dictado-mobile-playing').style.display = 'none';

        if (data.isHost) {
            document.getElementById('dictado-mobile-voting-host').style.display = 'flex';
            const container = document.getElementById('dictado-submissions-list');
            container.innerHTML = '';

            const subs = data.submissions || [];
            if (subs.length === 0) {
                container.innerHTML = '<p style="color:white; text-align:center;">No hay transcripciones para evaluar.</p>';
            }

            subs.forEach(sub => {
                const card = document.createElement('div');
                card.className = 'glass-panel';
                card.style.padding = '1rem';
                card.style.border = '1px solid var(--color-accent)';
                card.style.borderRadius = '12px';
                card.style.display = 'flex';
                card.style.flexDirection = 'column';
                card.style.gap = '0.5rem';

                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:var(--color-accent); font-weight:bold;">${escapeHTML(sub.playerName || 'Mago')}</span>
                        <span style="color:#10b981; font-size:0.9rem;">Precisión: ${sub.similarity}%</span>
                    </div>
                    <div style="color:white; font-style:italic; font-size:1.1rem; background:rgba(0,0,0,0.4); padding:0.8rem; border-radius:8px;">
                        "${escapeHTML(sub.transcription || '(Sin respuesta)')}"
                    </div>
                `;

                const btnFunny = document.createElement('button');
                btnFunny.className = 'btn-join-premium';
                btnFunny.style.padding = '0.8rem';
                btnFunny.style.fontSize = '1rem';
                btnFunny.style.marginTop = '0.5rem';
                
                if (sub.isFunny) {
                    btnFunny.textContent = '✅ Bono Hilarante Otorgado (+300)';
                    btnFunny.style.background = '#d4af37';
                    btnFunny.style.borderColor = '#b4932b';
                    btnFunny.disabled = true;
                } else {
                    btnFunny.textContent = '😂 ¡Respuesta Hilarante! (+300)';
                    btnFunny.onclick = () => {
                        socket.emit('player_action', { type: 'award_funny', targetClientId: sub.clientId });
                        btnFunny.textContent = '✅ Bono Hilarante Otorgado (+300)';
                        btnFunny.style.background = '#d4af37';
                        btnFunny.style.borderColor = '#b4932b';
                        btnFunny.disabled = true;
                    };
                }

                card.appendChild(btnFunny);
                container.appendChild(card);
            });

            const btnFinish = document.getElementById('btn-dictado-finish-voting');
            if (btnFinish) {
                btnFinish.onclick = () => {
                    socket.emit('host_action', { action: 'next' });
                };
            }

        } else {
            document.getElementById('dictado-mobile-voting-host').style.display = 'none';
            showMobileView('answer-sent');
            const waitText = document.querySelector('#answer-sent .status-text');
            if (waitText) {
                waitText.innerHTML = '<strong>El Host está evaluando</strong><br>Decidiendo qué respuestas fueron las más hilarantes...';
            }
        }
        return;
    }

    if (data.phase === 'playing') {
        if (data.alreadySubmitted) {
            showMobileView('answer-sent');
            const waitText = document.querySelector('#answer-sent .status-text');
            if (waitText) {
                waitText.innerHTML = '<strong>Transcripción Enviada</strong><br>Espera a que termine el tiempo del dictado.';
            }
            return;
        }

        showMobileView('dictado-input');
        document.getElementById('dictado-mobile-playing').style.display = 'flex';
        document.getElementById('dictado-mobile-voting-host').style.display = 'none';

        const textarea = document.getElementById('dictado-textarea');
        if (textarea) {
            textarea.value = '';
            textarea.focus();
        }

        const btnSubmit = document.getElementById('btn-dictado-submit');
        if (btnSubmit) {
            btnSubmit.onclick = () => {
                const textVal = textarea ? textarea.value.trim() : '';
                socket.emit('player_action', { type: 'submit_dictado', transcription: textVal });
                showMobileView('answer-sent');
                const waitText = document.querySelector('#answer-sent .status-text');
                if (waitText) {
                    waitText.innerHTML = '<strong>Transcripción Enviada</strong><br>Espera a que termine el tiempo del dictado.';
                }
            };
        }
    }
}
