(() => {
  if (window.__VoiceLinesTvLoaded) return;
  window.__VoiceLinesTvLoaded = true;

  const CATALOG_URL = "/data/voice_lines.json";
  const VOICE_BASE = "/assets/audio/voice_lines/";

  let catalog = null;
  let unlocked = false;
  let currentAudio = null;
  let playbackChain = Promise.resolve();
  const failed = new Set();
  const recentlyPlayed = [];
  const preloadCache = new Map();

  function log(event, payload = {}) {
    try {
      console.log("VOICE_LINES_TV", event, payload);
    } catch (error) {}
  }

  async function loadCatalog() {
    if (catalog) return catalog;
    const res = await fetch(`${CATALOG_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`No se pudo cargar catálogo de voces: ${res.status}`);
    catalog = await res.json();
    log("catalog_loaded", { count: catalog?.voice_lines?.length || 0 });
    return catalog;
  }

  function normalizePath(line) {
    const file = line?.audio_file || "";
    const raw = line?.asset_path || file;

    if (raw.startsWith("http")) return raw;
    if (raw.startsWith("/assets/")) return raw;
    if (raw.startsWith("assets/")) return `/${raw}`;
    if (file) return `${VOICE_BASE}${file}`;
    return "";
  }

  function candidatePaths(line) {
    const primary = normalizePath(line);
    const paths = [primary];
    return [...new Set(paths.filter(Boolean))];
  }

  function byEvent(event) {
    const lines = catalog?.voice_lines || [];
    return lines.filter((line) => line.event === event);
  }

  let lastCharacter = "";

  function pickLine(event, preferredVoiceKey = "") {
    let candidates = byEvent(event);
    
    // Si queremos evitar que Dumbledore hable demasiado después del intro
    if (lastCharacter === "dumbledore") {
      const others = candidates.filter(c => c.voice_key !== "dumbledore");
      if (others.length) candidates = others;
    }

    if (preferredVoiceKey) {
      const preferred = candidates.filter((line) => line.voice_key === preferredVoiceKey);
      if (preferred.length) candidates = preferred;
    }

    // Evitar repetir el mismo personaje si hay alternativas
    if (candidates.length > 1) {
      const alternatives = candidates.filter(c => c.voice_key !== lastCharacter);
      if (alternatives.length) candidates = alternatives;
    }

    candidates = candidates.filter((line) => !candidatePaths(line).every((path) => failed.has(path)));
    if (!candidates.length) return null;

    const fresh = candidates.filter((line) => !recentlyPlayed.includes(line.id));
    const pool = fresh.length ? fresh : candidates;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    
    if (selected) {
      lastCharacter = selected.voice_key;
    }
    
    return selected;
  }

  function buildPreloadCache() {
    const lines = catalog?.voice_lines || [];
    for (const line of lines) {
      for (const path of candidatePaths(line)) {
        if (preloadCache.has(path) || failed.has(path)) continue;
        const audio = new Audio(path);
        audio.preload = "auto";
        preloadCache.set(path, audio);
      }
    }
    log("preload_cache_ready", { count: preloadCache.size });
  }

  async function playPath(path, volume = 1) {
    if (!path || failed.has(path)) return false;

    // Si ya hay algo sonando y no queremos interrumpir, el queue se encarga.
    // Pero por seguridad, si entramos aquí, reseteamos el anterior.
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }

    try {
      const cached = preloadCache.get(path);
      const audio = cached || new Audio(path);

      audio.preload = "auto";
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.currentTime = 0;
      currentAudio = audio;

      await audio.play();
      await new Promise((resolve) => {
        const done = () => {
          audio.removeEventListener("ended", done);
          audio.removeEventListener("error", done);
          if (currentAudio === audio) currentAudio = null;
          resolve();
        };
        audio.addEventListener("ended", done, { once: true });
        audio.addEventListener("error", done, { once: true });
      });
      log("playing", { path });
      return true;
    } catch (error) {
      failed.add(path);
      log("failed", { path, error: String(error?.message || error) });
      return false;
    }
  }

  const playbackQueue = [];
  let isProcessing = false;

  async function processQueue() {
    if (isProcessing) return;
    isProcessing = true;
    while (playbackQueue.length > 0) {
      const { path, volume, resolve } = playbackQueue.shift();
      const ok = await playPath(path, volume);
      resolve(ok);
    }
    isProcessing = false;
  }

  function enqueuePlayback(path, volume = 1) {
    return new Promise((resolve) => {
      playbackQueue.push({ path, volume, resolve });
      processQueue();
    });
  }

  async function playNow(event, options = {}) {
    try {
      await loadCatalog();
      const line = pickLine(event, options.voice_key || "");
      if (!line) {
        log("no_line", { event });
        return false;
      }

      const paths = candidatePaths(line);
      if (!paths.length) return false;

      // Usamos solo el primer path válido para la cola
      const ok = await enqueuePlayback(paths[0], options.volume ?? 1);
      if (ok) {
        recentlyPlayed.push(line.id);
        while (recentlyPlayed.length > 12) recentlyPlayed.shift();
      }
      return ok;
    } catch (error) {
      log("play_error", { event, error: String(error?.message || error) });
      return false;
    }
  }

  function play(event, options = {}) {
    return playNow(event, options);
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
  }

  function init() {
    loadCatalog()
      .then(() => buildPreloadCache())
      .catch((error) => log("catalog_error", { error: String(error?.message || error) }));
  }

  document.addEventListener("DOMContentLoaded", init);
  setTimeout(init, 800);

  const INSTRUCTION_VOICES = {
    "intro_general": "/assets/audio/voice_lines/00_intro_general_dumbledore.mp3",
    "trivia": "/assets/audio/voice_lines/01_trivia_magica_hermione.mp3",
    "atrapa_snitch": "/assets/audio/voice_lines/02_atrapa_snitch_harry.mp3",
    "duelo": "/assets/audio/voice_lines/03_duelo_hechizos_snape.mp3",
    "sombrero": "/assets/audio/voice_lines/04_sombrero_burlon_sombrero.mp3",
    "clase_pociones": "/assets/audio/voice_lines/05_clase_pociones_snape.mp3",
    "artes_ridiculas": "/assets/audio/voice_lines/06_artes_ridiculas_ron.mp3",
    "mapa_travieso": "/assets/audio/voice_lines/07_mapa_travieso_luna.mp3",
    "retratos_chismosos": "/assets/audio/voice_lines/08_retratos_chismosos_hagrid.mp3",
    "hechizo_incompleto": "/assets/audio/voice_lines/09_hechizo_incompleto_mcgonagall.mp3",
    "caldero_mentiroso": "/assets/audio/voice_lines/10_caldero_mentiroso_dobby.mp3",
    "patronus_personalizado": "/assets/audio/voice_lines/11_patronus_personalizado_luna.mp3",
    "copa_final": "/assets/audio/voice_lines/12_copa_final_dumbledore.mp3",
    "cierre_ganador": "/assets/audio/voice_lines/13_cierre_ganador_sombrero.mp3"
  };

  let lastInstructionPlayed = "";
  let instructionsMuted = localStorage.getItem("jackbox_magico_narrator_muted") === "true";

  function toggleMute() {
    instructionsMuted = !instructionsMuted;
    localStorage.setItem("jackbox_magico_narrator_muted", instructionsMuted.toString());
    
    // Si se silencia mientras habla una instrucción, detenerla
    if (instructionsMuted && currentAudio) {
      // Verificamos si el audio actual es una instrucción revisando si su source está en el diccionario
      const isInstruction = Object.values(INSTRUCTION_VOICES).some(p => currentAudio.src.includes(p));
      if (isInstruction) {
        currentAudio.pause();
        currentAudio = null;
      }
    }
    
    return instructionsMuted;
  }

  const INSTRUCTION_CHARACTER_MAP = {
    "intro_general": "dumbledore",
    "trivia": "hermione",
    "atrapa_snitch": "harry",
    "duelo": "snape",
    "sombrero": "sombrero",
    "clase_pociones": "snape",
    "artes_ridiculas": "ron",
    "mapa_travieso": "luna",
    "retratos_chismosos": "hagrid",
    "hechizo_incompleto": "mcgonagall",
    "caldero_mentiroso": "dobby",
    "patronus_personalizado": "luna",
    "copa_final": "dumbledore",
    "cierre_ganador": "sombrero"
  };

  function playInstruction(gameId, roundId = "1", force = false) {
    if (!gameId) return false;
    
    // Normalizar ID del juego (algunos lados lo llaman trivia_magica o trivia, duelo_hechizos o duelo)
    let normalizedId = gameId;
    if (gameId === "trivia_magica") normalizedId = "trivia";
    if (gameId === "duelo_hechizos") normalizedId = "duelo";

    const audioPath = INSTRUCTION_VOICES[normalizedId];
    if (!audioPath) return false;

    const playKey = `${normalizedId}-${roundId}`;
    
    if (!force) {
      if (instructionsMuted) return false;
      if (lastInstructionPlayed === playKey) return false;
    }

    lastInstructionPlayed = playKey;
    lastCharacter = INSTRUCTION_CHARACTER_MAP[normalizedId] || "";
    
    return enqueuePlayback(audioPath, 1.0);
  }

  window.VoiceLinesTv = {
    play,
    playInstruction,
    toggleMute,
    isMuted: () => instructionsMuted,
    loadCatalog,
    unlock,
    isUnlocked: () => unlocked,
    isProcessing: () => isProcessing || playbackQueue.length > 0,
    getQueueLength: () => playbackQueue.length,
  };
})();