/**
 * Jackbox Mágico V2 - Voice Manager
 * 
 * Reconstrucción limpia del sistema de voces de la V1.
 * Maneja colas de reproducción, cooldowns, mute y desbloqueo de audio.
 */

window.VoiceManagerV2 = (function() {
    let voiceEnabled = localStorage.getItem('jackbox_magico_voice_enabled_v2') !== 'false';
    let isMuted = localStorage.getItem('jackbox_magico_narrator_muted') === 'true';
    let audioUnlocked = false;
    let audioQueue = [];
    let isProcessingQueue = false;
    let currentAudio = null;
    let lastPlayedClip = null;
    let lastPlayedAt = 0;
    let eventCooldowns = {};
    
    // Catalogs (Loaded Lazy)
    let voiceCatalog = [];
    let instructionMap = {};
    let isLoaded = false;

    const VOICE_BASE = "/assets/audio/voice_lines/";

    const INSTRUCTION_CHARACTER_MAP = {
        intro_general: "dumbledore",
        trivia_magica: "hermione",
        atrapa_snitch: "harry",
        duelo_hechizos: "snape",
        sombrero_burlon: "sombrero",
        clase_pociones: "snape",
        artes_ridiculas: "ron",
        mapa_travieso: "luna",
        retratos_chismosos: "hagrid",
        hechizo_incompleto: "mcgonagall",
        caldero_mentiroso: "dobby",
        patronus_personalizado: "luna",
        copa_final: "dumbledore",
        cierre_ganador: "sombrero",
        beso_boda_muerte: "luna",
        el_impostor: "sombrero",
        el_tiburon: "hagrid",
        dictado_magico: "hermione"
    };

    const GAME_ID_ALIASES = {
        trivia: "trivia_magica",
        snitch: "atrapa_snitch",
        duelo: "duelo_hechizos",
        sombrero: "sombrero_burlon",
        pociones: "clase_pociones",
        artes: "artes_ridiculas",
        mapa: "mapa_travieso",
        retratos: "retratos_chismosos",
        hechizo: "hechizo_incompleto",
        caldero: "caldero_mentiroso",
        patronus: "patronus_personalizado",
        copa: "copa_final",
        story_ready: "intro_general",
        kmk: "beso_boda_muerte",
        impostor: "el_impostor",
        tiburon: "el_tiburon",
        dictado: "dictado_magico"
    };

    const EVENT_OVERRIDES_BY_AUDIO_FILE = {
        "boot_hermione_instruccion.mp3": "rules",
        "lobby_dumbledore_comenzar.mp3": "rules",
    };

    const WINNER_AUDIO_BY_HOUSE = {
        gryffindor: "winner_dumbledore_gryffindor.mp3",
        slytherin: "winner_dumbledore_slytherin.mp3",
        ravenclaw: "winner_dumbledore_ravenclaw.mp3",
        hufflepuff: "winner_dumbledore_hufflepuff.mp3",
        empate: "winner_sombrero_empate.mp3",
        tie: "winner_sombrero_empate.mp3"
    };

    async function init() {
        if (isLoaded) return;
        
        const catalogs = [
            { key: 'main', url: '/data/voice_lines.json' },
            { key: 'extra', url: '/data/voice_lines_extra.json' },
            { key: 'instr', url: '/data/game_instruction_audio_map.json' }
        ];

        for (const cat of catalogs) {
            try {
                const res = await fetch(cat.url);
                if (!res.ok) throw new Error(`Status ${res.status}`);
                const data = await res.json();
                
                if (cat.key === 'instr') {
                    instructionMap = data.instructions || data;
                } else {
                    const lines = data.voice_lines || data;
                    if (Array.isArray(lines)) {
                        // Reclassification based on audio file name (contextual fix)
                        const cleanLines = lines.map(line => {
                            const override = EVENT_OVERRIDES_BY_AUDIO_FILE[line.audio_file];
                            if (override) return { ...line, event: override };
                            return line;
                        });
                        voiceCatalog = [...voiceCatalog, ...cleanLines];
                    }
                }
                console.log(`VoiceManagerV2: Cargado ${cat.url}`);
            } catch (err) {
                console.warn(`VoiceManagerV2: No se pudo cargar ${cat.url}`, err);
            }
        }

        isLoaded = true;
        console.log(`VoiceManagerV2: Inicialización completa. Líneas cargadas: ${voiceCatalog.length}`);
    }

    function unlock() {
        if (audioUnlocked) return;
        audioUnlocked = true;
        // Play a silent sound to unlock audio context on some browsers
        const silent = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==");
        silent.play().catch(() => {});
        console.log("VoiceManagerV2: Audio desbloqueado por usuario.");
    }

    function isVoiceEnabled() { return voiceEnabled && !isMuted; }

    function isInstructionScreenVisible() {
        // Check V2 IDs
        const v2Instr = document.getElementById("view-story-instructions");
        if (v2Instr && v2Instr.style.display !== 'none') return true;

        // Check V1 IDs (legacy compatibility)
        const v1Rules = document.getElementById("view-rules");
        if (v1Rules && (v1Rules.classList.contains("visible") || v1Rules.style.display !== 'none')) return true;

        // Check narrative phases if available
        const phase = window.currentGameState?.phase || "";
        if (phase === 'story_instructions' || phase === 'rules') return true;

        return false;
    }

    function toggleMute() {
        isMuted = !isMuted;
        localStorage.setItem('jackbox_magico_narrator_muted', isMuted);
        if (isMuted) stop();
        return isMuted;
    }

    function setVoiceEnabled(val) {
        voiceEnabled = val;
        localStorage.setItem('jackbox_magico_voice_enabled_v2', val);
        if (!val) stop();
    }

    function stop() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        audioQueue = [];
        isProcessingQueue = false;
    }

    function clearQueue() {
        audioQueue = [];
    }

    function normalizeGameId(id) {
        if (!id) return "intro_general";
        return GAME_ID_ALIASES[id] || id;
    }

    function playEvent(eventName, options = {}) {
        if (!isVoiceEnabled() || !isLoaded) return;

        const cooldown = options.cooldownMs || 0;
        const now = Date.now();
        if (eventCooldowns[eventName] && now - eventCooldowns[eventName] < cooldown) {
            return;
        }

        const lines = voiceCatalog.filter(l => l.event === eventName);
        if (lines.length === 0) return;

        // Select random line, try not to repeat the exact same one if possible
        let selected = lines[Math.floor(Math.random() * lines.length)];
        
        eventCooldowns[eventName] = now;
        
        if (options.clearQueue) clearQueue();
        
        addToQueue({
            path: selected.asset_path || (VOICE_BASE + selected.audio_file),
            interrupt: options.interrupt,
            force: options.force
        });
    }

    function playInstruction(gameId, stepId = "1", force = false) {
        if (!isVoiceEnabled() || !isLoaded) return;
        
        const normId = normalizeGameId(gameId);
        
        // Protection: intro_general ONLY in instructions screen
        if (normId === 'intro_general' && !isInstructionScreenVisible()) {
            console.log("VoiceManagerV2: intro_general bloqueado fuera de pantalla de instrucciones");
            return;
        }

        let path = null;

        // Try instruction map first
        if (instructionMap[normId]) {
            path = instructionMap[normId];
        } else {
            // Fallback to searching catalog for explanation/rules of that game
            const line = voiceCatalog.find(l => (l.event === 'explanation' || l.event === 'rules') && l.usage && l.usage.includes(normId));
            if (line) path = line.asset_path || (VOICE_BASE + line.audio_file);
        }

        if (path) {
            if (!path.startsWith('/') && !path.startsWith('http')) path = '/' + path;
            addToQueue({ path, interrupt: true, force, key: `instr:${normId}:${stepId}` });
        }
    }

    function interruptAndPlayInstruction(gameId, stepId, force) {
        playInstruction(gameId, stepId, force);
    }

    function playWinnerVoice(house) {
        if (!isVoiceEnabled() || !isLoaded) return;
        const h = (house || "").toLowerCase().trim();
        const audioFile = WINNER_AUDIO_BY_HOUSE[h];
        
        if (!audioFile) {
            console.warn("VoiceManagerV2: No hay audio exacto para la casa", house);
            playEvent("winner", { interrupt: true });
            return;
        }

        const selected = voiceCatalog.find(l => l.event === 'winner' && l.audio_file === audioFile);
        const path = selected ? (selected.asset_path || (VOICE_BASE + selected.audio_file)) : (VOICE_BASE + audioFile);
        
        addToQueue({ path, interrupt: true });
    }

    const VOICE_SLOT_MAP = {
        copa_clasica_bienvenida: "boot",
        story_scoreboard: "leaderboard",
        story_transition_trivia: "round_start",
        story_transition_minigame: "round_start",
        copa_clasica_sombrero_intro: "rules",
        copa_clasica_pociones_intro: "round_start",
        copa_clasica_mapa_intro: "round_start",
        copa_clasica_retratos_intro: "round_start",
        copa_clasica_duelo_intro: "round_start",
        copa_clasica_final_intro: "rules",
        copa_clasica_cierre: "final",
        torneo_relampago_inicio: "boot",
        torneo_relampago_trivia: "round_start",
        torneo_relampago_snitch: "round_start",
        torneo_relampago_artes: "round_start",
        torneo_relampago_duelo: "round_start",
        torneo_relampago_final: "round_start",
        torneo_relampago_cierre: "final",
        noche_castillo_inicio: "boot",
        noche_castillo_retratos: "round_start",
        noche_castillo_artes: "round_start",
        noche_castillo_caldero: "round_start",
        noche_castillo_hechizo: "round_start",
        noche_castillo_patronus: "round_start",
        noche_castillo_cierre: "final"
    };

    const LEADER_AUDIO_BY_HOUSE = {
        gryffindor: "leader_dumbledore_gryffindor.mp3",
        slytherin: "leader_dumbledore_slytherin.mp3",
        ravenclaw: "leader_dumbledore_ravenclaw.mp3",
        hufflepuff: "leader_dumbledore_hufflepuff.mp3",
        empate: "leader_dumbledore_empate.mp3",
        tie: "leader_dumbledore_empate.mp3"
    };

    function playVoiceSlot(slotId, options = {}) {
        if (!isVoiceEnabled()) return;

        if (slotId.startsWith('/')) {
            addToQueue({ path: slotId, interrupt: options.interrupt });
            return;
        }

        if (slotId.startsWith('instructions_')) {
            const gameId = slotId.replace('instructions_', '');
            playInstruction(gameId, "1", options.force);
            return;
        }

        const mappedEvent = VOICE_SLOT_MAP[slotId] || slotId;

        // If it's a scoreboard and we have a leaderHouse, queue leader announcement after leaderboard intro
        if (mappedEvent === 'leaderboard' && options.leaderHouse) {
            playEvent('leaderboard', { ...options, clearQueue: options.interrupt });
            
            const h = (options.leaderHouse || "").toLowerCase().trim();
            const audioFile = LEADER_AUDIO_BY_HOUSE[h];
            if (audioFile) {
                const path = VOICE_BASE + audioFile;
                addToQueue({ path, interrupt: false });
            }
            return;
        }

        playEvent(mappedEvent, options);
    }

    function playAudioFile(path, options = {}) {
        if (!isVoiceEnabled()) return;
        addToQueue({ path, interrupt: options.interrupt, force: options.force });
    }

    function playUISound(path) {
        if (!audioUnlocked || !isVoiceEnabled()) return;
        try {
            const audio = new Audio(path);
            audio.volume = 0.8;
            audio.play().catch(err => console.warn("VoiceManagerV2: UI sound play error", err));
        } catch (e) {
            console.warn("VoiceManagerV2: UI sound init error", e);
        }
    }

    function addToQueue(item) {
        if (!audioUnlocked) {
            console.warn("VoiceManagerV2: Audio bloqueado. Esperando interacción.");
            return;
        }

        // Ensure absolute path from root
        if (item.path && !item.path.startsWith('/') && !item.path.startsWith('http')) {
            item.path = '/' + item.path;
        }

        // Avoid repeating the exact same key immediately (e.g. instruction renders)
        if (item.key && lastPlayedClip === item.key && !item.force) return;

        if (item.interrupt) {
            stop();
        }

        audioQueue.push(item);
        if (!isProcessingQueue) processQueue();
    }

    async function processQueue() {
        if (audioQueue.length === 0) {
            isProcessingQueue = false;
            return;
        }

        isProcessingQueue = true;
        const item = audioQueue.shift();
        
        try {
            const audio = new Audio(item.path);
            currentAudio = audio;
            lastPlayedClip = item.key || item.path;
            
            await audio.play();
            
            audio.onended = () => {
                currentAudio = null;
                setTimeout(processQueue, 500); // Small gap between clips
            };

            audio.onerror = () => {
                console.error("VoiceManagerV2: Error al reproducir", item.path);
                currentAudio = null;
                processQueue();
            };
        } catch (err) {
            console.error("VoiceManagerV2: Fallo al iniciar audio", err);
            isProcessingQueue = false;
            processQueue();
        }
    }

    return {
        init,
        unlock,
        isUnlocked: () => audioUnlocked,
        isVoiceEnabled,
        setVoiceEnabled,
        toggleMute,
        stop,
        clearQueue,
        playEvent,
        playInstruction,
        interruptAndPlay: (eventName, opts) => playEvent(eventName, { ...opts, interrupt: true }),
        interruptAndPlayInstruction,
        playWinnerVoice,
        playAudioFile,
        playUISound,
        playVoiceSlot,
        getQueueLength: () => audioQueue.length,
        isProcessing: () => isProcessingQueue || !!currentAudio
    };
})();
