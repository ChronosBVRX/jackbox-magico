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
        cierre_ganador: "sombrero"
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
        story_ready: "intro_general"
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
                    instructionMap = data;
                } else {
                    voiceCatalog = [...voiceCatalog, ...data];
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
        const h = (house || "").toLowerCase();
        const lines = voiceCatalog.filter(l => l.event === 'winner' && l.audio_file.toLowerCase().includes(h));
        
        if (lines.length > 0) {
            const sel = lines[Math.floor(Math.random() * lines.length)];
            addToQueue({ path: sel.asset_path || (VOICE_BASE + sel.audio_file), interrupt: true });
        } else {
            playEvent("winner", { interrupt: true });
        }
    }

    function playVoiceSlot(slotId, options = {}) {
        if (!isVoiceEnabled()) return;
        // For V2 slots, we might have specific paths or logic
        // This can be expanded to fetch from a V2 manifest if needed
        // For now, let's assume slotId can map to a known legacy path or event
        if (slotId.startsWith('/')) {
            addToQueue({ path: slotId, interrupt: options.interrupt });
        } else {
            playEvent(slotId, options);
        }
    }

    function playAudioFile(path, options = {}) {
        if (!isVoiceEnabled()) return;
        addToQueue({ path, interrupt: options.interrupt, force: options.force });
    }

    function addToQueue(item) {
        if (!audioUnlocked) {
            console.warn("VoiceManagerV2: Audio bloqueado. Esperando interacción.");
            return;
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
        playVoiceSlot,
        getQueueLength: () => audioQueue.length,
        isProcessing: () => isProcessingQueue || !!currentAudio
    };
})();
