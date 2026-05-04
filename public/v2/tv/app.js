const socket = io();

// Initial App Load Logic
document.addEventListener('DOMContentLoaded', async () => {
    showLoadingScreen('Iniciando sistema de audio...', 10);
    
    if (window.VoiceManagerV2) {
        await window.VoiceManagerV2.init();
        showLoadingScreen('Cargando historias mágicas...', 60);
    }
    
    // Simulate some extra loading for that "Premium" feel
    setTimeout(() => {
        showLoadingScreen('Listo para la aventura', 100);
        setTimeout(() => {
            showView('view-init');
        }, 800);
    }, 1200);
});

const viewInit = document.getElementById('view-init');
const viewLobby = document.getElementById('view-lobby');
const btnCreate = document.getElementById('btn-create');
const displayCode = document.getElementById('display-code');
const playersList = document.getElementById('players-list');
const statusText = document.getElementById('status-text');
const playerCount = document.getElementById('player-count');
const btnNextRound = document.getElementById('btn-next-round');
const viewQuiz = document.getElementById('view-trivia'); 
const viewResults = document.getElementById('view-results');

let currentRoom = null;
let currentGameId = null;
let tvTimerInterval = null;
let autoNextTriggered = false;
let pendingGameSelection = null;
window.lastVoiceCue = null;

// Selection Manager (Premium Carousel)
const SelectionManager = {
    items: [],
    currentIndex: 0,
    active: false,

    init(stories, games) {
        this.items = [
            ...stories.map(s => ({ ...s, type: 'story' })),
            ...games.filter(g => g.enabled && g.id !== 'copa_final').map(g => ({ ...g, type: 'minigame' }))
        ];
        this.currentIndex = 0;
        this.render();
        this.updateDetails();
        this.active = true;
        showView('view-selection');
    },

    render() {
        const track = document.getElementById('selection-carousel');
        if (!track) return;
        track.innerHTML = '';
        
        const visualMap = {
            'trivia_magica': '❓', 'artes_ridiculas': '🤡', 'atrapa_snitch': '✨',
            'duelo_hechizos': '🪄', 'sombrero_burlon': '🎩', 'clase_pociones': '🧪',
            'mapa_travieso': '🏰', 'retratos_chismosos': '🖼️', 'hechizo_incompleto': '📜',
            'caldero_mentiroso': '🍯', 'patronus_personalizado': '🦌',
            'copa_casas_clasica': '🏆', 'noche_en_el_castillo': '🌙', 'torneo_magico_relampago': '⚡'
        };

        this.items.forEach((item, i) => {
            const card = document.createElement('div');
            card.className = `selection-card ${i === this.currentIndex ? 'active' : ''}`;
            card.innerHTML = `
                <div class="card-type">${item.type === 'story' ? 'Historia' : 'Minijuego'}</div>
                <div class="card-icon">${visualMap[item.id] || '✨'}</div>
                <h3>${item.shortName || item.shortTitle || item.name}</h3>
            `;
            track.appendChild(card);
        });
        this.updateScroll();
    },

    updateScroll() {
        const track = document.getElementById('selection-carousel');
        const offset = this.currentIndex * (280 + 40); // card width + gap
        track.style.transform = `translateX(-${offset}px)`;
        
        document.querySelectorAll('.selection-card').forEach((card, i) => {
            card.classList.toggle('active', i === this.currentIndex);
        });
        this.updateDetails();
    },

    updateDetails() {
        const item = this.items[this.currentIndex];
        if (!item) return;

        safeText('detail-title', item.name || item.title);
        safeText('detail-desc', item.description);
        safeText('detail-players', `👥 ${item.recommendedPlayers || `${item.maxPlayers} máx`}`);
        safeText('detail-time', `⏱️ ${item.estimatedMinutes || item.durationSeconds || 20} min`);
        safeText('detail-mode', `✨ ${item.mode || 'Historia'}`);
        safeText('selection-category-label', item.type === 'story' ? 'Historias Mágicas' : 'Minijuegos Individuales');

        const struct = document.getElementById('detail-structure');
        struct.innerHTML = '';
        
        // If it's a story, show steps (simplified)
        if (item.steps) {
            item.steps.forEach(step => {
                const icon = document.createElement('div');
                icon.className = 'struct-step';
                icon.setAttribute('data-label', step.title);
                icon.textContent = step.type === 'fixed_minigame' || step.type === 'minigame_random' ? '🎮' : '📖';
                struct.appendChild(icon);
            });
        }
    },

    navigate(dir) {
        if (!this.active) return;
        const oldIndex = this.currentIndex;
        if (dir === 'left' && this.currentIndex > 0) this.currentIndex--;
        if (dir === 'right' && this.currentIndex < this.items.length - 1) this.currentIndex++;
        
        if (oldIndex !== this.currentIndex) {
            this.updateScroll();
            if (window.VoiceManagerV2) {
                // Subtle click sound or short cue
            }
        }
    },

    select() {
        if (!this.active) return;
        const item = this.items[this.currentIndex];
        
        if (window.VoiceManagerV2) window.VoiceManagerV2.unlock();
        
        if (!currentRoom) {
            // New Flow: Create room after selection
            pendingGameSelection = item;
            socket.emit('tv_create_room');
            showLoadingScreen(`Preparando: ${item.name || item.title}...`, 40);
        } else {
            if (item.type === 'story') {
                socket.emit('tv_select_story', item.id);
            } else {
                socket.emit('tv_start_game', item.id);
            }
        }
    }
};

// Update showView
function showView(viewId) {
  // Ocultar todas las vistas principales
  document.querySelectorAll('.tv-layout, .init-screen, .selection-section').forEach(v => v.style.display = 'none');
  
  const target = document.getElementById(viewId);
  if (target) {
    if (viewId === 'view-init') target.style.display = 'block';
    else if (viewId === 'view-selection') target.style.display = 'flex';
    else target.style.display = 'grid';
  }
}

// Global Key Listeners for TV Remote
window.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowLeft':
            SelectionManager.navigate('left');
            break;
        case 'ArrowRight':
            SelectionManager.navigate('right');
            break;
        case 'Enter':
            SelectionManager.select();
            break;
        case 'Escape':
            if (SelectionManager.active) {
                showView('view-lobby');
                SelectionManager.active = false;
            }
            break;
    }
});

// Initialize Voice Bridge
if (window.VoiceBridge) {
    window.VoiceBridge.init(socket);
}


// Helper to escape HTML and prevent XSS
function escapeHTML(str) {
  if (!str) return '';
  const p = document.createElement('p');
  p.textContent = str;
  return p.innerHTML;
}

function safeText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '';
}

function safeHTML(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = value ?? '';
}

function showLoadingScreen(message, progress = 0) {
    const view = document.getElementById('view-loading');
    if (!view) return;
    
    safeText('loading-status', message);
    const bar = document.getElementById('loading-progress');
    if (bar) bar.style.width = `${progress}%`;
    
    showView('view-loading');
    
    if (progress < 100) {
        let current = progress;
        const interval = setInterval(() => {
            current += Math.random() * 5;
            if (current >= 95) {
                clearInterval(interval);
            } else {
                if (bar) bar.style.width = `${current}%`;
            }
        }, 200);
    }
}

const btnShowSelection = document.getElementById('btn-show-selection');
if (btnShowSelection) {
    btnShowSelection.onclick = () => {
        if (window.VoiceManagerV2) window.VoiceManagerV2.unlock();
        SelectionManager.init(STORY_CATALOG_FRONT, GAME_CATALOG_FRONT);
    };
}

if (btnCreate) {
  btnCreate.addEventListener('click', () => {
    if (window.VoiceManagerV2) window.VoiceManagerV2.unlock();
    socket.emit('tv_create_room');
  });
}

if (btnNextRound) {
  btnNextRound.addEventListener('click', () => {
    socket.emit('tv_next_round');
  });
}

const btnSelectAdventure = document.getElementById('btn-select-adventure');
if (btnSelectAdventure) {
  btnSelectAdventure.addEventListener('click', () => {
    if (window.VoiceManagerV2) window.VoiceManagerV2.unlock();
    SelectionManager.init(STORY_CATALOG_FRONT, GAME_CATALOG_FRONT);
  });
}

const safeSetClick = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.onclick = fn;
};

safeSetClick('btn-cancel-story', () => {
    showView('view-lobby');
});

safeSetClick('btn-story-next-dialogue', () => {
    socket.emit('tv_story_next');
});

safeSetClick('btn-story-start-game', () => {
    socket.emit('tv_story_next');
});

safeSetClick('btn-story-next-score', () => {
    socket.emit('tv_story_next');
});

safeSetClick('btn-story-end', () => {
    socket.emit('tv_story_next');
});

// Voice Control UI Listeners
const btnVoiceToggle = document.getElementById('btn-voice-toggle');
const btnVoiceRepeat = document.getElementById('btn-voice-repeat');
const voiceStatus = document.getElementById('voice-status');

if (btnVoiceToggle) {
    btnVoiceToggle.addEventListener('click', () => {
        if (window.VoiceManagerV2) {
            window.VoiceManagerV2.unlock();
            const muted = window.VoiceManagerV2.toggleMute();
            updateVoiceStatus();
        }
    });
}

if (btnVoiceRepeat) {
    btnVoiceRepeat.addEventListener('click', () => {
        if (window.VoiceBridge && window.lastVoiceCue) {
            const repeatCue = { ...window.lastVoiceCue, force: true, interrupt: true };
            window.VoiceBridge.handleVoiceCue(repeatCue);
        }
    });
}

function updateVoiceStatus() {
    if (!window.VoiceManagerV2 || !voiceStatus) return;
    const enabled = window.VoiceManagerV2.isVoiceEnabled();
    const unlocked = window.VoiceManagerV2.isUnlocked();
    
    btnVoiceToggle.textContent = enabled ? '🔊 Voz' : '🔇 Mudo';
    btnVoiceToggle.style.opacity = enabled ? '1' : '0.5';
    
    if (!unlocked) {
        voiceStatus.textContent = 'Audio pendiente de activación';
        voiceStatus.style.color = '#fbbf24';
    } else {
        voiceStatus.textContent = enabled ? 'Voces listas' : 'Voces silenciadas';
        voiceStatus.style.color = enabled ? '#10b981' : 'var(--color-text-dim)';
    }
}

// Initial status
updateVoiceStatus();

socket.on('game_started', (gameId) => {
  currentGameId = gameId;
});

socket.on('room_created', (code) => {
  currentRoom = code;
  displayCode.textContent = code;
  
  const bar = document.getElementById('loading-progress');
  if (bar) bar.style.width = '100%';

  setTimeout(() => {
    showView('view-lobby');
    
    // If we had a pending selection, trigger it now
    if (pendingGameSelection) {
        const item = pendingGameSelection;
        if (item.type === 'story') {
            socket.emit('tv_select_story', item.id);
        } else {
            socket.emit('tv_start_game', item.id);
        }
        pendingGameSelection = null;
        SelectionManager.active = false;
    }
  }, 800);

  const mobileUrl = `${window.location.origin}/v2/mobile/?room=${encodeURIComponent(code)}`;
  const joinUrl = document.getElementById('join-url');
  if (joinUrl) joinUrl.textContent = `${window.location.origin}/v2/mobile/`;

  const qrContainer = document.getElementById('qrcode');
  if (qrContainer) {
    qrContainer.innerHTML = '';
    const qrImg = document.createElement('img');
    qrImg.className = 'qr-image';
    qrImg.width = 220;
    qrImg.height = 220;
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(mobileUrl)}`;
    qrContainer.appendChild(qrImg);
  }
});

socket.on('room_state', (state) => {
  currentGameId = state.currentGameId;
  if (state.status === 'lobby') {
    showView('view-lobby');
    renderPlayers(state.players);
    playerCount.textContent = `${state.players.length} / 8 Jugadores`;
    
    const actions = document.getElementById('lobby-actions');
    if (state.players.length >= 1) {
      statusText.textContent = `${state.players.length} mago(s) listo(s)`;
      if (actions) actions.style.display = 'flex';
    } else {
      statusText.textContent = 'Esperando jugadores...';
      if (actions) actions.style.display = 'none';
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
  if (data.phase === 'story_step') {
    renderStoryStep(data);
    return;
  }
  
  if (currentGameId === 'trivia_magica' || currentGameId === 'artes_ridiculas') {
    if (data.phase === 'question' || data.phase === 'threat') renderQuizView(data);
    else if (data.phase === 'results') renderResultsView(data);
  } else if (currentGameId === 'atrapa_snitch') {
    if (data.phase === 'playing') renderSnitchView(data);
    else if (data.phase === 'results') renderSnitchResults(data);
  } else if (currentGameId === 'duelo_hechizos') {
    renderDueloView(data);
  } else if (currentGameId === 'sombrero_burlon') {
    renderSombreroView(data);
  } else if (currentGameId === 'clase_pociones') {
    renderPocionesView(data);
  } else if (currentGameId === 'retratos_chismosos') {
    renderRetratosView(data);
  } else if (currentGameId === 'hechizo_incompleto') {
    renderHechizoView(data);
  } else if (currentGameId === 'patronus_personalizado') {
    renderPatronusView(data);
  } else if (currentGameId === 'copa_final') {
    renderCopaFinalView(data);
  } else if (currentGameId === 'mapa_travieso') {
    renderMapaView(data);
  } else if (currentGameId === 'caldero_mentiroso') {
    renderCalderoView(data);
  }
});

// Catalogs for selection
const STORY_CATALOG_FRONT = [
    { id: 'copa_casas_clasica', title: 'Copa de las Casas Clásica', desc: 'La experiencia definitiva de Jackbox Mágico. Un viaje por el Gran Comedor, clases y la gran final.', min: 35, players: '2-8', diff: 'Normal', steps: [
        { title: 'Bienvenida', type: 'story' }, { title: 'Trivia Mágica', type: 'minigame' }, { title: 'Pociones', type: 'minigame' }, { title: 'Duelo', type: 'minigame' }, { title: 'Copa Final', type: 'minigame' }
    ]},
    { id: 'noche_en_el_castillo', title: 'Noche en el Castillo', desc: 'Explora los pasillos prohibidos. Una historia de misterio y sigilo con pruebas de memoria visual.', min: 40, players: '3-8', diff: 'Difícil', steps: [
        { title: 'Intro Nocturna', type: 'story' }, { title: 'Mapa Travieso', type: 'minigame' }, { title: 'Retratos', type: 'minigame' }, { title: 'Hechizo', type: 'minigame' }, { title: 'Final', type: 'minigame' }
    ]},
    { id: 'torneo_magico_relampago', title: 'Torneo Mágico Relámpago', desc: 'Sin diálogos largos, solo acción pura. Perfecto para partidas rápidas y competitivas.', min: 15, players: '2-8', diff: 'Fácil', steps: [
        { title: 'Inicio', type: 'story' }, { title: 'Snitch', type: 'minigame' }, { title: 'Artes Ridículas', type: 'minigame' }, { title: 'Final', type: 'minigame' }
    ]}
];

const GAME_CATALOG_FRONT = [
    { id: 'trivia_magica', name: 'Trivia del Mundo Mágico', shortName: 'Trivia', description: 'Demuestra quién realmente puso atención a los libros.', durationSeconds: 5, mode: 'Quiz', maxPlayers: 8, enabled: true },
    { id: 'artes_ridiculas', name: 'Artes Ridículas', shortName: 'Artes Ridículas', description: 'Enfrenta boggarts y amenazas absurdas con risas.', durationSeconds: 5, mode: 'Quiz', maxPlayers: 8, enabled: true },
    { id: 'atrapa_snitch', name: 'Atrapa la Snitch', shortName: 'Snitch', description: 'Reflejos puros para capturar la bola dorada.', durationSeconds: 3, mode: 'Acción', maxPlayers: 8, enabled: true },
    { id: 'duelo_hechizos', name: 'Duelo de Hechizos', shortName: 'Duelo', description: 'Estrategia de piedra, papel o tijera con varitas.', durationSeconds: 4, mode: 'Estrategia', maxPlayers: 8, enabled: true },
    { id: 'clase_pociones', name: 'Clase de Pociones', shortName: 'Pociones', description: 'Memoriza y repite ingredientes en tu caldero.', durationSeconds: 6, mode: 'Memoria', maxPlayers: 8, enabled: true },
    { id: 'sombrero_burlon', name: 'El Sombrero Burlón', shortName: 'Sombrero', description: 'Votación social sobre quién es quién en el grupo.', durationSeconds: 4, mode: 'Social', maxPlayers: 8, enabled: true },
    { id: 'mapa_travieso', name: 'El Mapa Travieso', shortName: 'Mapa', description: 'Memoria espacial. Encuentra a los intrusos.', durationSeconds: 5, mode: 'Memoria', maxPlayers: 8, enabled: true },
    { id: 'retratos_chismosos', name: 'Retratos Chismosos', shortName: 'Retratos', description: 'Adivina el personaje basándote en los chismes.', durationSeconds: 4, mode: 'Quiz', maxPlayers: 8, enabled: true },
    { id: 'hechizo_incompleto', name: 'Hechizo Incompleto', shortName: 'Hechizo', description: 'Completa los encantamientos que han perdido palabras.', durationSeconds: 4, mode: 'Quiz', maxPlayers: 8, enabled: true },
    { id: 'caldero_mentiroso', name: 'El Caldero Mentiroso', shortName: 'Caldero', description: 'Estrategia y engaño con ingredientes secretos.', durationSeconds: 7, mode: 'Estrategia', maxPlayers: 8, enabled: true },
    { id: 'patronus_personalizado', name: 'Patronus', shortName: 'Patronus', description: 'Creatividad y votación por el mejor protector.', durationSeconds: 10, mode: 'Social', maxPlayers: 8, enabled: true }
];

function renderStorySelect() {
    const list = document.getElementById('story-select-list');
    list.innerHTML = '';
    STORY_CATALOG_FRONT.forEach(story => {
        const card = document.createElement('div');
        card.className = 'story-card glass-panel';
        card.innerHTML = `
            <h2>${story.title}</h2>
            <p>${story.desc}</p>
            <div class="story-meta">
                <span>⏱️ ${story.min} min</span>
                <span>👥 ${story.players}</span>
                <span>⭐ ${story.diff}</span>
            </div>
            <button class="btn-start-premium" style="margin-top: 1rem; font-size: 1rem; padding: 1rem;">Elegir Historia</button>
        `;
        card.onclick = () => {
            socket.emit('tv_select_story', story.id);
        };
        list.appendChild(card);
    });
}

function renderStoryStep(data) {
    if (data.type === 'dialogue') {
        renderStoryDialogue(data);
        showView('view-story-dialogue');
    } else if (data.type === 'instructions') {
        renderStoryInstructions(data);
        showView('view-story-instructions');
    } else if (data.type === 'scoreboard') {
        renderStoryScoreboard(data);
        showView('view-story-scoreboard');
    } else if (data.type === 'story_complete') {
        renderStoryWinner(data);
        showView('view-story-finished');
    }
}

function renderStoryDialogue(data) {
    safeText('story-dialogue-title', data.title);
    safeText('story-dialogue-subtitle', data.subtitle || '');
    const linesContainer = document.getElementById('story-dialogue-lines');
    linesContainer.innerHTML = '';
    if (data.lines) {
        data.lines.forEach((line, i) => {
            const p = document.createElement('p');
            p.textContent = line;
            p.style.animationDelay = `${i * 1.5}s`;
            linesContainer.appendChild(p);
        });
    }
    const visual = document.getElementById('story-visual');
    const visualMap = {
        'great_hall_intro': '🕯️',
        'sorting_hat': '🎩',
        'potions_class': '🧪',
        'moving_castle': '🏰',
        'portrait_gallery': '🖼️',
        'duel_arena': '🪄',
        'final_before': '🏆',
        'final_cup': '✨',
        'castle_night': '🌙',
        'haunted_gallery': '👻',
        'ridiculous_threat': '🤡',
        'hidden_cauldron': '🍯',
        'glowing_runes': '📜',
        'patronus_light': '🦌',
        'final_clue': '🔍',
        'lightning_tournament': '⚡'
    };
    visual.textContent = visualMap[data.visual] || '✨';
}

function renderStoryInstructions(data) {
    const instr = data.instructions;
    if (!instr) return;
    safeText('instr-title', instr.title);
    safeText('instr-subtitle', instr.subtitle);
    
    const rulesList = document.getElementById('instr-rules');
    rulesList.innerHTML = '';
    instr.rules.forEach(r => {
        const li = document.createElement('li');
        li.textContent = r;
        rulesList.appendChild(li);
    });

    const tvList = document.getElementById('instr-tv');
    tvList.innerHTML = '';
    instr.tvInstructions.forEach(r => {
        const li = document.createElement('li');
        li.textContent = r;
        tvList.appendChild(li);
    });

    const mobileList = document.getElementById('instr-mobile');
    mobileList.innerHTML = '';
    instr.mobileInstructions.forEach(r => {
        const li = document.createElement('li');
        li.textContent = r;
        mobileList.appendChild(li);
    });

    safeText('instr-scoring', instr.scoring);
    document.getElementById('btn-story-start-game').textContent = instr.startButton || 'Comenzar Prueba';
}

function renderStoryScoreboard(data) {
    const sb = data.scoreboard;
    if (!sb) return;
    safeText('story-score-title', data.title || 'Puntuación de la Copa');
    safeText('story-score-subtitle', data.subtitle || 'La Copa está observando');
    safeText('story-score-comment', sb.randomLine || '');

    const houseList = document.getElementById('story-house-list');
    houseList.innerHTML = '';
    
    const maxPoints = Math.max(...sb.houses.map(h => h.points), 1);
    
    sb.houses.sort((a,b) => b.points - a.points).forEach(house => {
        const row = document.createElement('div');
        row.className = 'house-bar-row';
        const percent = (house.points / maxPoints) * 100;
        const colorMap = {
            'Gryffindor': 'var(--house-gryffindor)',
            'Slytherin': 'var(--house-slytherin)',
            'Ravenclaw': 'var(--house-ravenclaw)',
            'Hufflepuff': 'var(--house-hufflepuff)'
        };
        row.innerHTML = `
            <div class="house-label">${house.house}</div>
            <div class="house-bar-bg">
                <div class="house-bar-fill" style="width: ${percent}%; background: ${colorMap[house.house]}"></div>
            </div>
            <div class="house-points">${house.points}</div>
        `;
        houseList.appendChild(row);
    });

    const playerList = document.getElementById('story-player-list');
    playerList.innerHTML = '<h3 style="margin-bottom:1rem; text-align:center; color: var(--color-accent)">Top Magos</h3>';
    sb.players.slice(0, 5).forEach(p => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.padding = '0.5rem';
        div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        div.innerHTML = `<span>${p.name}</span> <span>${p.points}</span>`;
        playerList.appendChild(div);
    });
}

function renderStoryWinner(data) {
    if (!data.winner) return;
    safeText('story-winner-name', data.winner.house);
    safeText('story-winner-points', `${data.winner.points} puntos`);
    safeText('story-final-comment', data.finalLine || '');

    const colorMap = {
        'Gryffindor': 'var(--house-gryffindor)',
        'Slytherin': 'var(--house-slytherin)',
        'Ravenclaw': 'var(--house-ravenclaw)',
        'Hufflepuff': 'var(--house-hufflepuff)'
    };
    document.getElementById('story-winner-card').style.borderColor = colorMap[data.winner.house];

    const ranking = document.getElementById('story-final-list');
    ranking.innerHTML = '';
    data.ranking.slice(1).forEach(house => {
        const item = document.createElement('div');
        item.className = 'final-rank-item';
        item.innerHTML = `<strong>${house.house}</strong>: ${house.points}`;
        ranking.appendChild(item);
    });
}

function renderPatronusView(data) {
  if (data.phase === 'results') {
    renderPatronusResults(data);
    return;
  }
  showView('view-patronus');
  safeText('patronus-prompt', data.prompt?.text);
  safeText('patronus-count', data.phase === 'submit' ? data.submitCount : data.voteCount);
  safeText('patronus-total', data.totalPlayers);
  
  const list = document.getElementById('patronus-submissions-list');
  if (!list) return;
  list.innerHTML = '';
  if (data.phase === 'vote' && data.submissions) {
    data.submissions.forEach(sub => {
      const card = document.createElement('div');
      card.className = 'submission-card glass-panel';
      card.textContent = sub.text;
      list.appendChild(card);
    });
  } else {
    list.innerHTML = `<p style="text-align:center; width:100%; opacity:0.6;">Esperando conjuros...</p>`;
  }
}

function renderCopaFinalView(data) {
  if (data.phase === 'results') {
    renderCopaResults(data);
    return;
  }
  showView('view-copafinal');
  safeText('copa-phase-label', data.phase === 'wager' ? 'Hagan sus apuestas' : '¡PREGUNTA FINAL!');
  safeText('copa-count', data.phase === 'wager' ? data.wagerCount : data.answerCount);
  safeText('copa-total', data.totalPlayers);

  const qContainer = document.getElementById('copa-question-container');
  const wagerGrid = document.getElementById('copa-wager-status');
  
  if (data.phase === 'question') {
    if (qContainer) qContainer.style.display = 'block';
    if (wagerGrid) wagerGrid.style.display = 'none';
    safeText('copa-question-text', data.question?.question);
    const opts = document.getElementById('copa-options');
    if (opts && data.question?.options) {
      opts.innerHTML = data.question.options.map(opt => `
        <div class="option-card glass-panel">
          <div class="option-label">${escapeHTML(opt)}</div>
        </div>
      `).join('');
    }
  } else {
    if (qContainer) qContainer.style.display = 'none';
    if (wagerGrid) wagerGrid.style.display = 'flex';
  }
}

function renderPatronusResults(data) {
  showView('view-results');
  safeText('correct-answer', "Ranking de Patronus");
  safeText('narrator-comment', data.results?.narrator ? `"${data.results.narrator}"` : '');
  
  const list = document.getElementById('results-list');
  if (!list || !data.results?.ranking) return;
  list.innerHTML = '';
  data.results.ranking.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-player-card glass-panel';
    card.innerHTML = `<div class="player-name">${escapeHTML(res.playerName)} (${escapeHTML(res.house)})</div><div class="result-status status-correct">${res.votes || 0} votos</div><div class="points-gain">${escapeHTML(res.text)}</div>`;
    list.appendChild(card);
  });
}

function renderCopaResults(data) {
  showView('view-results');
  safeText('correct-answer', data.results?.correctAnswer);
  safeText('narrator-comment', data.results ? `"${data.results.explanation}" - ${data.results.narrator}` : '');
  
  const list = document.getElementById('results-list');
  if (!list || !data.results?.ranking) return;
  list.innerHTML = '';
  data.results.ranking.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-player-card glass-panel';
    card.innerHTML = `<div class="player-name">${escapeHTML(res.name)}</div><div class="result-status ${res.correct?'status-correct':'status-wrong'}">${res.correct?'¡ACERTÓ!':'FALLÓ'}</div><div class="points-gain">${res.correct?'+':''}${res.points} (Apostó ${res.wager})</div>`;
    list.appendChild(card);
  });
}

function renderRetratosView(data) {
  if (data.phase === 'results') {
    renderRetratosResults(data);
    return;
  }
  showView('view-retratos');
  document.getElementById('portrait-category').textContent = data.currentClue?.category || 'Retratos Chismosos';
  document.getElementById('portrait-name').textContent = data.currentClue?.portraitName || 'Escuchando...';
  document.getElementById('portrait-clue').textContent = `"${data.currentClue?.clue}"`;
  
  const options = document.getElementById('portrait-options');
  options.innerHTML = data.currentClue?.options.map(opt => `
    <div class="option-card glass-panel">
      <div class="option-label">${opt}</div>
    </div>
  `).join('') || '';
}

function renderHechizoView(data) {
  if (data.phase === 'results') {
    renderHechizoResults(data);
    return;
  }
  showView('view-hechizo');
  document.getElementById('spell-category').textContent = data.currentSpell?.category.toUpperCase() || 'HECHIZO';
  document.getElementById('spell-text').textContent = data.currentSpell?.incompleteText || '...';
  document.getElementById('spell-context').textContent = data.currentSpell?.context || '';
  
  const options = document.getElementById('spell-options');
  options.innerHTML = data.currentSpell?.options.map(opt => `
    <div class="option-card glass-panel">
      <div class="option-label">${opt}</div>
    </div>
  `).join('') || '';
}

function renderRetratosResults(data) {
  showView('view-results');
  document.getElementById('correct-answer').textContent = data.results.correctAnswer;
  document.getElementById('narrator-comment').textContent = `"${data.results.explanation}" - ${data.results.narrator}`;
  
  const list = document.getElementById('results-list');
  list.innerHTML = '';
  data.results.ranking.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-player-card glass-panel';
    card.innerHTML = `<div class="player-name">${res.name}</div><div class="result-status ${res.correct?'status-correct':'status-wrong'}">${res.correct?'¡ACERTÓ!':'FALLÓ'}</div><div class="points-gain">+${res.points}</div>`;
    list.appendChild(card);
  });
}

function renderHechizoResults(data) {
  showView('view-results');
  document.getElementById('correct-answer').textContent = data.results.completedText;
  document.getElementById('narrator-comment').textContent = `"${data.results.explanation}" - ${data.results.narrator}`;
  
  const list = document.getElementById('results-list');
  list.innerHTML = '';
  data.results.ranking.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-player-card glass-panel';
    card.innerHTML = `<div class="player-name">${res.name}</div><div class="result-status ${res.correct?'status-correct':'status-wrong'}">${res.correct?'ÉXITO':'FALLO'}</div><div class="points-gain">+${res.points}</div>`;
    list.appendChild(card);
  });
}

function renderMapaView(data) {
  if (data.phase === 'results') {
    renderMapaResults(data);
    return;
  }
  showView('view-mapa');
  const canvas = document.getElementById('map-canvas');
  const status = document.getElementById('mapa-status');
  
  if (data.phase === 'observe') {
    status.textContent = 'Observa el Mapa...';
    canvas.innerHTML = '';
    data.mapLayout.forEach(loc => {
      const dot = document.createElement('div');
      dot.className = 'map-point';
      dot.style.left = loc.zone.x + '%';
      dot.style.top = loc.zone.y + '%';
      dot.innerHTML = `<span class="map-item-visual">${loc.item.emoji}</span><span class="map-label">${loc.zone.name}</span>`;
      canvas.appendChild(dot);
    });
  } else {
    status.textContent = data.target?.question || '¿Dónde estaba?';
    canvas.innerHTML = '<div style="width:100%; height:100%; background:rgba(0,0,0,0.2); filter:blur(10px)"></div>';
  }
}

function renderCalderoView(data) {
  if (data.phase === 'results') {
    renderCalderoResults(data);
    return;
  }
  showView('view-caldero');
  document.getElementById('action-count').textContent = data.actionCount;
  document.getElementById('total-actions').textContent = data.totalPlayers;
  
  const log = document.getElementById('caldero-log');
  log.innerHTML = data.publicLog.map(entry => `<div class="log-entry">${entry.text}</div>`).join('');
  log.scrollTop = log.scrollHeight;
}

function renderMapaResults(data) {
  showView('view-results');
  const correct = data.results.correctZone;
  document.getElementById('correct-answer').textContent = correct ? correct.name : '---';
  document.getElementById('narrator-comment').textContent = data.results.narrator;
  
  const list = document.getElementById('results-list');
  list.innerHTML = '';
  data.results.ranking.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-player-card glass-panel';
    card.innerHTML = `<div class="player-name">${res.name}</div><div class="result-status ${res.correct?'status-correct':'status-wrong'}">${res.correct?'ACIERTO':'FALLO'}</div><div class="points-gain">+${res.points}</div>`;
    list.appendChild(card);
  });
}

function renderCalderoResults(data) {
  showView('view-results');
  document.getElementById('correct-answer').textContent = data.results.exploded ? '¡EXPLOSIÓN!' : 'Poción Estable';
  document.getElementById('narrator-comment').textContent = data.results.narrator;
  
  const list = document.getElementById('results-list');
  list.innerHTML = '';
  data.results.ranking.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-player-card glass-panel';
    card.innerHTML = `<div class="player-name">${res.name}</div><div style="font-size:0.7rem; opacity:0.6">${res.reasons.join(', ')}</div><div class="points-gain">+${res.points}</div>`;
    list.appendChild(card);
  });
}
function renderSombreroView(data) {
  if (data.phase === 'round_results' || data.phase === 'final_results') {
    renderSombreroResults(data);
    return;
  }
  showView('view-sombrero');
  safeText('hat-phrase', data.prompt ? data.prompt.text : "Preparando sentencia...");
  safeText('vote-count', data.answerCount || 0);
  safeText('total-voters', data.totalPlayers || 0);
}

function renderPocionesView(data) {
  if (data.phase === 'results') {
    renderPocionesResults(data);
    return;
  }
  showView('view-pociones');
  const display = document.getElementById('sequence-display');
  const status = document.getElementById('pociones-status');

  if (data.phase === 'memorize') {
    status.innerHTML = `Memoriza la receta: <strong style="color:white">${data.potion?.name}</strong><br><small>Modo: ${data.mode.toUpperCase()}</small>`;
    display.innerHTML = '';
    data.potion?.ingredients.forEach((ing, i) => {
      setTimeout(() => {
        const card = document.createElement('div');
        card.className = 'ing-card';
        card.textContent = ing.emoji;
        display.appendChild(card);
      }, i * 800);
    });
  } else {
    status.textContent = '¡Mezcla en tu móvil ahora!';
    display.innerHTML = '<div style="font-size:3rem; opacity:0.5; animation: sway 2s infinite">🧪 Burbujeando...</div>';
  }
}

function renderSombreroResults(data) {
  showView('view-results');
  const results = data.roundResults || data.finalResults;
  document.getElementById('correct-answer').textContent = results.ranking[0].votes > 0 ? results.ranking[0].name : 'Nadie';
  document.getElementById('narrator-comment').textContent = results.hatLine || "El sombrero ha hablado.";
  
  const resultsContainer = document.getElementById('results-list');
  resultsContainer.innerHTML = '';
  results.ranking.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-player-card glass-panel';
    card.innerHTML = `
      <div class="player-name">${res.name}</div>
      <div class="result-status status-correct">${res.votes} Votos</div>
      <div class="points-gain">+${res.points}</div>
    `;
    resultsContainer.appendChild(card);
  });
}

function renderPocionesResults(data) {
  showView('view-results');
  document.getElementById('correct-answer').textContent = data.results.potionName;
  document.getElementById('narrator-comment').textContent = "¡Clase terminada!";
  
  const resultsContainer = document.getElementById('results-list');
  resultsContainer.innerHTML = '';
  data.results.ranking.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-player-card glass-panel';
    card.innerHTML = `
      <div class="player-name">${res.name}</div>
      <div class="result-status ${res.perfect ? 'status-correct' : 'status-wrong'}">
        ${res.perfect ? '¡PERFECTA!' : `${res.errors} ERRORES`}
      </div>
      <div class="points-gain">+${res.points}</div>
    `;
    resultsContainer.appendChild(card);
  });
}

let snitchAnimFrame = null;
function renderSnitchView(data) {
  showView('view-snitch');
  const ball = document.getElementById('snitch-ball');
  const zone = document.getElementById('snitch-zone');
  const feed = document.getElementById('catches-feed');

  // Update feed
  feed.innerHTML = '';
  data.catches.forEach(c => {
    const toast = document.createElement('div');
    toast.className = 'catch-toast';
    toast.innerHTML = `<span style="color:var(--house-${c.house.toLowerCase()})">${c.playerName}</span>: ${c.label}`;
    feed.appendChild(toast);
  });

  if (snitchAnimFrame) cancelAnimationFrame(snitchAnimFrame);

  function animate() {
    const now = Date.now();
    const snitchPos = getInterpolatedPos(data.snitchSegments, now);
    const zonePos = getInterpolatedPos(data.zoneSegments, now);

    if (snitchPos) {
      ball.style.left = snitchPos.x + '%';
      ball.style.top = snitchPos.y + '%';
    }
    if (zonePos) {
      zone.style.left = zonePos.x + '%';
      zone.style.top = zonePos.y + '%';
    }

    snitchAnimFrame = requestAnimationFrame(animate);
  }
  animate();
}

function getInterpolatedPos(segments, time) {
  const seg = segments.find(s => time >= s.startTime && time <= s.endTime);
  if (!seg) return null;
  let t = (time - seg.startTime) / (seg.endTime - seg.startTime);
  if (seg.easing === 'ease-in-out') t = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  return {
    x: seg.startX + (seg.endX - seg.startX) * t,
    y: seg.startY + (seg.endY - seg.startY) * t
  };
}

function renderSnitchResults(data) {
    if (snitchAnimFrame) cancelAnimationFrame(snitchAnimFrame);
    showView('view-results'); // Reuse quiz results for now or make specific
    // ... logic to show ranking
}

function renderDueloView(data) {
    showView('view-duelo');
    const status = document.getElementById('duelo-status');
    const d1 = document.getElementById('duelist-1');
    const d2 = document.getElementById('duelist-2');
    const meter = document.getElementById('clash-meter');

    d1.innerHTML = `<h3>${data.duelists[0].name}</h3><p>${data.duelists[0].house}</p>`;
    d2.innerHTML = `<h3>${data.duelists[1].name}</h3><p>${data.duelists[1].house}</p>`;

    if (data.phase === 'selection') {
        status.textContent = `Esperando hechizos... (${data.choiceCount}/2)`;
        meter.style.display = 'none';
    } else if (data.phase === 'clash') {
        status.textContent = '¡CHOQUE DE VARITAS! ¡PRESIONA RÁPIDO!';
        meter.style.display = 'flex';
        const total = (data.clashTaps[data.duelists[0].clientId] || 0) + (data.clashTaps[data.duelists[1].clientId] || 0) || 1;
        document.getElementById('clash-bar-1').style.width = ((data.clashTaps[data.duelists[0].clientId] || 0) / total * 100) + '%';
        document.getElementById('clash-bar-2').style.width = ((data.clashTaps[data.duelists[1].clientId] || 0) / total * 100) + '%';
    } else if (data.phase === 'results') {
        status.innerHTML = `<span style="color:var(--color-accent)">${data.results.winner} GANA</span><br><small>${data.results.message}</small>`;
        meter.style.display = 'none';
    }
}

function renderQuizView(data) {
  showView('view-trivia');
  const options = Array.isArray(data.options) ? data.options : [];
  
  safeText('trivia-category', data.category || 'Preparando pregunta');
  safeText('trivia-round', `Ronda ${data.roundNumber || 1}/${data.totalRounds || 5}`);
  
  if (!data.question || options.length === 0) {
    safeText('trivia-question', 'Preparando pregunta mágica...');
    safeHTML('trivia-options', '');
    safeText('trivia-answer-count', `${data.answerCount || 0} / ${data.totalPlayers || '?'}`);
    return;
  }

  safeText('trivia-question', data.question);
  safeText('trivia-answer-count', `${data.answerCount || 0} / ${data.totalPlayers || '?'}`);
  
  const optionsContainer = document.getElementById('trivia-options');
  if (optionsContainer) {
    optionsContainer.innerHTML = '';
    const labels = ['A', 'B', 'C', 'D'];
    options.forEach((opt, i) => {
      const card = document.createElement('div');
      card.className = 'option-card';
      card.innerHTML = `<div class="option-label">${labels[i]}</div><div class="option-text">${escapeHTML(opt)}</div>`;
      optionsContainer.appendChild(card);
    });
  }

  const bar = document.getElementById('timer-bar');
  const countEl = document.getElementById('tv-timer-count');
  
  if (tvTimerInterval) clearInterval(tvTimerInterval);
  autoNextTriggered = false;

  if (bar && data.startedAt && data.durationMs) {
    const updateTimer = () => {
      const elapsed = Date.now() - data.startedAt;
      const remaining = Math.max(0, data.durationMs - elapsed);
      const percent = (remaining / data.durationMs) * 100;
      const seconds = Math.ceil(remaining / 1000);
      
      bar.style.transition = 'none';
      bar.style.width = `${percent}%`;
      if (countEl) countEl.textContent = seconds;

      if (remaining <= 0 && !autoNextTriggered) {
        autoNextTriggered = true;
        clearInterval(tvTimerInterval);
        console.log('Timer finished, auto-resolving...');
        socket.emit('tv_next_round');
      }
    };

    updateTimer();
    tvTimerInterval = setInterval(updateTimer, 100);
  }
}

function renderResultsView(data) {
  showView('view-results');
  document.getElementById('correct-answer').textContent = data.correctAnswer;
  document.getElementById('narrator-comment').textContent = data.narratorComment || "...";
  
  const resultsContainer = document.getElementById('results-list');
  resultsContainer.innerHTML = '';
  data.results.results.forEach(res => {
    const card = document.createElement('div');
    card.className = 'result-player-card glass-panel';
    card.innerHTML = `
      <div class="player-name">Mago</div>
      <div class="result-status ${res.isCorrect ? 'status-correct' : 'status-wrong'}">
        ${res.isCorrect ? '¡CORRECTO!' : (res.isFunny ? '¡GRACIOSO!' : 'INCORRECTO')}
      </div>
      <div class="points-gain">${res.points > 0 ? '+' : ''}${res.points}</div>
    `;
    resultsContainer.appendChild(card);
  });
}

socket.on('scoreboard_state', (data) => {
  console.log('Scoreboard update:', data);
  // Optional: update a permanent scoreboard sidebar if it exists
});

socket.on('error_message', (msg) => {
  alert(msg);
});
