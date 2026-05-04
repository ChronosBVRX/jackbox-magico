(() => {
  if (window.__VoiceLinesTvLoaded) return;
  window.__VoiceLinesTvLoaded = true;

  const VOICE_ENABLED_KEY = "jackbox_magico_voice_enabled";
  const LEGACY_MUTE_KEY = "jackbox_magico_narrator_muted";

  // Se carga primero el catálogo extra para que pueda corregir/clasificar líneas
  // del catálogo generado sin tocar ni mover archivos mp3.
  const CATALOG_URLS = ["/data/voice_lines_extra.json", "/data/voice_lines.json"];
  const INSTRUCTION_MAP_URL = "/data/game_instruction_audio_map.json";
  const VOICE_BASE = "/assets/audio/voice_lines/";

  const GENERAL_EVENTS = new Set([
    "boot",
    "lobby",
    "rules",
    "round_start",
    "threat",
    "correct",
    "wrong",
    "timeout",
    "fast_bonus",
    "streak_bonus",
    "humor_bonus",
    "leaderboard",
    "winner",
    "final",
    "system",
    "explanation",
  ]);

  // Clasificación contextual por significado real de la frase.
  // Importante: no renombra archivos ni cambia rutas; solo corrige el evento lógico.
  const EVENT_OVERRIDES_BY_AUDIO_FILE = {
    "boot_hermione_instruccion.mp3": "rules",
    "lobby_dumbledore_comenzar.mp3": "rules",
  };

  const DEFAULT_INSTRUCTION_VOICES = {
    intro_general: "assets/audio/voice_lines/00_intro_general_dumbledore.mp3",
    trivia_magica: "assets/audio/voice_lines/01_trivia_magica_hermione.mp3",
    atrapa_snitch: "assets/audio/voice_lines/02_atrapa_snitch_harry.mp3",
    duelo_hechizos: "assets/audio/voice_lines/03_duelo_hechizos_snape.mp3",
    sombrero_burlon: "assets/audio/voice_lines/04_sombrero_burlon_sombrero.mp3",
    clase_pociones: "assets/audio/voice_lines/05_clase_pociones_snape.mp3",
    artes_ridiculas: "assets/audio/voice_lines/06_artes_ridiculas_ron.mp3",
    mapa_travieso: "assets/audio/voice_lines/07_mapa_travieso_luna.mp3",
    retratos_chismosos: "assets/audio/voice_lines/08_retratos_chismosos_hagrid.mp3",
    hechizo_incompleto: "assets/audio/voice_lines/09_hechizo_incompleto_mcgonagall.mp3",
    caldero_mentiroso: "assets/audio/voice_lines/10_caldero_mentiroso_dobby.mp3",
    patronus_personalizado: "assets/audio/voice_lines/11_patronus_personalizado_luna.mp3",
    copa_final: "assets/audio/voice_lines/12_copa_final_dumbledore.mp3",
    cierre_ganador: "assets/audio/voice_lines/13_cierre_ganador_sombrero.mp3",
  };

  const GAME_ID_ALIASES = {
    trivia: "trivia_magica",
    trivia_magica: "trivia_magica",
    atrapa_snitch: "atrapa_snitch",
    snitch: "atrapa_snitch",
    duelo: "duelo_hechizos",
    duelo_hechizos: "duelo_hechizos",
    sombrero: "sombrero_burlon",
    sombrero_burlon: "sombrero_burlon",
    pociones: "clase_pociones",
    clase_pociones: "clase_pociones",
    artes_ridiculas: "artes_ridiculas",
    mapa_travieso: "mapa_travieso",
    retratos: "retratos_chismosos",
    retratos_chismosos: "retratos_chismosos",
    hechizo_incompleto: "hechizo_incompleto",
    caldero: "caldero_mentiroso",
    caldero_mentiroso: "caldero_mentiroso",
    patronus: "patronus_personalizado",
    patronus_personalizado: "patronus_personalizado",
    copa_final: "copa_final",
    cierre_ganador: "cierre_ganador",
    story_ready: "intro_general",
    intro_general: "intro_general",
  };

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
  };

  const WINNER_AUDIO_BY_HOUSE = {
    gryffindor: "winner_dumbledore_gryffindor.mp3",
    slytherin: "winner_dumbledore_slytherin.mp3",
    ravenclaw: "winner_dumbledore_ravenclaw.mp3",
    hufflepuff: "winner_dumbledore_hufflepuff.mp3",
    empate: "winner_sombrero_empate.mp3",
    tie: "winner_sombrero_empate.mp3",
    draw: "winner_sombrero_empate.mp3",
  };

  let catalog = null;
  let instructionVoiceMap = null;
  let unlocked = false;
  let currentAudio = null;
  let isProcessing = false;
  let lastCharacter = "";
  let lastInstructionPlayed = "";
  const failed = new Set();
  const recentlyPlayed = [];
  const preloadCache = new Map();
  const playbackQueue = [];
  const lastPlayedByEvent = new Map();
  const lastEventPlayAt = new Map();

  function log(event, payload = {}) {
    try {
      console.log("VOICE_LINES_TV", event, payload);
    } catch (error) {}
  }

  function migrateLegacyPreference() {
    try {
      if (localStorage.getItem(VOICE_ENABLED_KEY) !== null) return;
      const legacyMuted = localStorage.getItem(LEGACY_MUTE_KEY);
      if (legacyMuted !== null) {
        localStorage.setItem(VOICE_ENABLED_KEY, legacyMuted === "true" ? "false" : "true");
      }
    } catch (error) {}
  }

  function isVoiceEnabled() {
    migrateLegacyPreference();
    try {
      const stored = localStorage.getItem(VOICE_ENABLED_KEY);
      return stored === null ? true : stored !== "false";
    } catch (error) {
      return true;
    }
  }

  function setVoiceEnabled(enabled) {
    try {
      localStorage.setItem(VOICE_ENABLED_KEY, enabled ? "true" : "false");
      localStorage.setItem(LEGACY_MUTE_KEY, enabled ? "false" : "true");
    } catch (error) {}

    if (!enabled) {
      clearQueue();
      stopCurrentAudio();
    }

    updateVoiceControls();
    return enabled;
  }

  function updateVoiceControls() {
    const enabled = isVoiceEnabled();
    const btnMute = document.getElementById("btn-mute-instruction");
    const btnRepeat = document.getElementById("btn-repeat-instruction");

    if (btnMute) {
      btnMute.textContent = enabled ? "🔊" : "🔇";
      btnMute.title = enabled ? "Silenciar narrador" : "Activar narrador";
      btnMute.setAttribute("aria-label", btnMute.title);
    }

    if (btnRepeat) {
      btnRepeat.title = enabled ? "Repetir instrucciones" : "Activa la voz para repetir instrucciones";
      btnRepeat.setAttribute("aria-label", btnRepeat.title);
      btnRepeat.style.opacity = enabled ? "1" : "0.55";
    }
  }

  function clearQueue() {
    playbackQueue.splice(0, playbackQueue.length);
  }

  function stopCurrentAudio() {
    if (!currentAudio) return;
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (error) {}
    currentAudio = null;
  }

  async function fetchJson(url, { optional = false } = {}) {
    const res = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) {
      if (optional) return null;
      throw new Error(`No se pudo cargar ${url}: ${res.status}`);
    }
    return res.json();
  }

  function normalizeLineEvent(line) {
    const audioFile = String(line?.audio_file || "").trim();
    const override = EVENT_OVERRIDES_BY_AUDIO_FILE[audioFile];
    if (!override) return line;
    return {
      ...line,
      event: override,
      usage: line?.usage && line.usage !== "Automated" ? line.usage : "Reclasificada por contexto de frase",
    };
  }

  function mergeCatalogs(catalogs) {
    const combined = {
      version: "combined",
      characters: {},
      voice_lines: [],
    };

    const seenIds = new Set();
    const seenAudioFiles = new Set();

    for (const item of catalogs) {
      if (!item) continue;
      Object.assign(combined.characters, item.characters || {});

      for (const rawLine of item.voice_lines || []) {
        if (!rawLine?.id && !rawLine?.audio_file) continue;

        const line = normalizeLineEvent(rawLine);
        const idKey = String(line.id || "");
        const audioKey = String(line.audio_file || "");

        // Evita que una misma frase quede duplicada cuando aparece tanto en
        // voice_lines_extra.json como en voice_lines.json con ids diferentes.
        if (idKey && seenIds.has(idKey)) continue;
        if (audioKey && seenAudioFiles.has(audioKey)) continue;

        combined.voice_lines.push(line);
        if (idKey) seenIds.add(idKey);
        if (audioKey) seenAudioFiles.add(audioKey);
      }
    }

    return combined;
  }

  async function loadCatalog() {
    if (catalog) return catalog;

    const catalogs = [];
    for (let index = 0; index < CATALOG_URLS.length; index += 1) {
      const url = CATALOG_URLS[index];
      try {
        catalogs.push(await fetchJson(url, { optional: index > 0 }));
      } catch (error) {
        if (index === 0) throw error;
        log("catalog_optional_error", { url, error: String(error?.message || error) });
      }
    }

    catalog = mergeCatalogs(catalogs);
    log("catalog_loaded", { count: catalog.voice_lines.length });
    return catalog;
  }

  function normalizeInstructionMapPayload(payload) {
    const raw = payload?.instructions || payload || {};
    const clean = {};

    for (const [gameId, value] of Object.entries(raw)) {
      if (typeof value === "string") {
        clean[gameId] = value;
        continue;
      }

      const path = value?.asset_path || value?.path || value?.audio_file || "";
      if (path) clean[gameId] = path;
    }

    return clean;
  }

  async function loadInstructionMap() {
    if (instructionVoiceMap) return instructionVoiceMap;

    let remote = {};
    try {
      remote = normalizeInstructionMapPayload(
        await fetchJson(INSTRUCTION_MAP_URL, { optional: true })
      );
    } catch (error) {
      log("instruction_map_error", { error: String(error?.message || error) });
    }

    instructionVoiceMap = {
      ...DEFAULT_INSTRUCTION_VOICES,
      ...remote,
    };

    log("instruction_map_loaded", { count: Object.keys(instructionVoiceMap).length });
    return instructionVoiceMap;
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

  function normalizeInstructionPath(value) {
    if (!value) return "";
    const raw = String(value);
    if (raw.startsWith("http")) return raw;
    if (raw.startsWith("/assets/")) return raw;
    if (raw.startsWith("assets/")) return `/${raw}`;
    if (raw.includes("/")) return raw.startsWith("/") ? raw : `/${raw}`;
    return `${VOICE_BASE}${raw}`;
  }

  function candidatePaths(line) {
    const primary = normalizePath(line);
    return [...new Set([primary].filter(Boolean))];
  }

  function byEvent(eventName) {
    if (!GENERAL_EVENTS.has(eventName)) return [];
    const lines = catalog?.voice_lines || [];
    return lines.filter((line) => line.event === eventName);
  }

  function pickLine(eventName, preferredVoiceKey = "") {
    let candidates = byEvent(eventName);

    if (preferredVoiceKey) {
      const preferred = candidates.filter((line) => line.voice_key === preferredVoiceKey);
      if (preferred.length) candidates = preferred;
    } else if (lastCharacter && candidates.length > 1) {
      const alternatives = candidates.filter((line) => line.voice_key !== lastCharacter);
      if (alternatives.length) candidates = alternatives;
    }

    candidates = candidates.filter((line) => !candidatePaths(line).every((path) => failed.has(path)));
    if (!candidates.length) return null;

    const lastForEvent = lastPlayedByEvent.get(eventName);
    if (candidates.length > 1 && lastForEvent) {
      const notSameAudio = candidates.filter((line) => line.id !== lastForEvent);
      if (notSameAudio.length) candidates = notSameAudio;
    }

    const fresh = candidates.filter((line) => !recentlyPlayed.includes(line.id));
    const pool = fresh.length ? fresh : candidates;
    const selected = pool[Math.floor(Math.random() * pool.length)];

    if (selected) lastCharacter = selected.voice_key || "";

    return selected;
  }

  function shouldThrottleEvent(eventName, options = {}) {
    if (options.force) return false;

    const now = Date.now();
    const cooldown = Number(options.cooldownMs ?? 650);
    const last = Number(lastEventPlayAt.get(eventName) || 0);

    if (cooldown > 0 && now - last < cooldown) return true;
    lastEventPlayAt.set(eventName, now);
    return false;
  }

  function buildPreloadCache() {
    const lines = catalog?.voice_lines || [];

    for (const line of lines) {
      for (const path of candidatePaths(line)) {
        if (preloadCache.has(path) || failed.has(path)) continue;
        const audio = new Audio(path);
        audio.preload = "auto";
        audio.loop = false;
        preloadCache.set(path, audio);
      }
    }

    for (const path of Object.values(instructionVoiceMap || {})) {
      const publicPath = normalizeInstructionPath(path);
      if (!publicPath || preloadCache.has(publicPath) || failed.has(publicPath)) continue;
      const audio = new Audio(publicPath);
      audio.preload = "auto";
      audio.loop = false;
      preloadCache.set(publicPath, audio);
    }

    log("preload_cache_ready", { count: preloadCache.size });
  }

  async function playPath(path, volume = 1) {
    if (!isVoiceEnabled()) return false;
    if (!path || failed.has(path)) return false;

    stopCurrentAudio();

    try {
      const cached = preloadCache.get(path);
      const audio = cached || new Audio(path);

      audio.preload = "auto";
      audio.loop = false;
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

      log("played", { path });
      return true;
    } catch (error) {
      if (error?.name !== "NotAllowedError") failed.add(path);
      if (currentAudio?.src?.includes(path)) currentAudio = null;
      log("failed", { path, error: String(error?.message || error) });
      return false;
    }
  }

  async function playWinnerVoice(houseName) {
    if (!isVoiceEnabled()) return false;

    const house = String(houseName || "")
      .trim()
      .toLowerCase();

    const audioFile = WINNER_AUDIO_BY_HOUSE[house];
    if (!audioFile) {
      log("winner_house_not_supported", { houseName });
      return false;
    }

    await loadCatalog();
    const lines = catalog?.voice_lines || [];
    const selected = lines.find((line) => line.event === "winner" && line.audio_file === audioFile);
    const path = selected ? candidatePaths(selected)[0] : `${VOICE_BASE}${audioFile}`;

    if (!path) return false;

    log("playing_winner_exact_audio", { house, audioFile, path });
    return enqueuePlayback(path, 1.0, { clearQueue: true });
  }

  async function playAudioFile(path, options = {}) {
    if (!isVoiceEnabled()) return false;
    const fullPath = normalizeInstructionPath(path);
    if (!fullPath) return false;

    return enqueuePlayback(fullPath, options.volume ?? 1.0, {
      clearQueue: Boolean(options.clearQueue || options.interrupt),
    });
  }

  async function processQueue() {
    if (isProcessing) return;
    isProcessing = true;

    while (playbackQueue.length > 0) {
      const { path, volume, resolve } = playbackQueue.shift();

      if (!isVoiceEnabled()) {
        resolve(false);
        continue;
      }

      const ok = await playPath(path, volume);
      resolve(ok);

      if (playbackQueue.length > 0) {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 900));
      }
    }

    isProcessing = false;
  }

  function enqueuePlayback(path, volume = 1, options = {}) {
    if (!isVoiceEnabled()) return Promise.resolve(false);

    if (options.clearQueue) {
      clearQueue();
    }

    return new Promise((resolve) => {
      playbackQueue.push({ path, volume, resolve });
      processQueue();
    });
  }

  async function playVoiceLine(eventName, options = {}) {
    try {
      const event = String(eventName || "").trim();
      if (!GENERAL_EVENTS.has(event)) {
        log("invalid_event", { event });
        return false;
      }

      if (!isVoiceEnabled()) return false;
      if (shouldThrottleEvent(event, options)) return false;

      await loadCatalog();
      const line = pickLine(event, options.voice_key || options.voiceKey || "");
      if (!line) {
        log("no_line", { event });
        return false;
      }

      const paths = candidatePaths(line);
      if (!paths.length) return false;

      const ok = await enqueuePlayback(paths[0], options.volume ?? 1, {
        clearQueue: Boolean(options.clearQueue),
      });

      if (ok) {
        recentlyPlayed.push(line.id);
        while (recentlyPlayed.length > 12) recentlyPlayed.shift();
        lastPlayedByEvent.set(event, line.id);
      }

      return ok;
    } catch (error) {
      log("play_error", { eventName, error: String(error?.message || error) });
      return false;
    }
  }

  function normalizeGameId(gameId) {
    const raw = String(gameId || "").trim();
    return GAME_ID_ALIASES[raw] || raw;
  }

  function isInstructionScreenVisible() {
    const rulesView = document.getElementById("view-rules");
    if (rulesView && rulesView.classList.contains("visible")) return true;

    const narrativePhases = new Set([
      "rules",
      "scene_intro",
      "scene_rules",
      "scene_instructions",
    ]);

    try {
      const phase = window.currentGameState?.phase || window.lastKnownPhase || "";
      if (narrativePhases.has(phase)) return true;
    } catch (_) {}

    return false;
  }

  const isRulesScreenVisible = isInstructionScreenVisible;

  async function playInstructionVoice(gameId, roundId = "1", forceRepeat = false) {
    try {
      if (!isVoiceEnabled()) return false;

      const normalizedId = normalizeGameId(gameId);
      if (!normalizedId) return false;

      if (normalizedId === "intro_general" && !isInstructionScreenVisible()) {
        log("intro_general_blocked_outside_instruction_screen", { gameId, roundId });
        return false;
      }

      const map = await loadInstructionMap();
      const audioPath = normalizeInstructionPath(map[normalizedId]);

      if (!audioPath) {
        log("no_instruction_audio", { gameId, normalizedId });
        return false;
      }

      const playKey = `${normalizedId}_${roundId ?? "1"}`;

      if (!forceRepeat && lastInstructionPlayed === playKey) {
        log("instruction_skipped_duplicate", { playKey });
        return false;
      }

      lastInstructionPlayed = playKey;
      lastCharacter = INSTRUCTION_CHARACTER_MAP[normalizedId] || "";

      return enqueuePlayback(audioPath, 1.0, { clearQueue: false });
    } catch (error) {
      log("instruction_error", { gameId, roundId, error: String(error?.message || error) });
      return false;
    }
  }

  function toggleMute() {
    const enabled = !isVoiceEnabled();
    setVoiceEnabled(enabled);
    setTimeout(updateVoiceControls, 0);
    return !enabled;
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
  }

  async function init() {
    updateVoiceControls();

    try {
      await Promise.all([loadCatalog(), loadInstructionMap()]);
      buildPreloadCache();
    } catch (error) {
      log("init_error", { error: String(error?.message || error) });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    init();

    const btnRepeat = document.getElementById("btn-repeat-instruction");
    if (btnRepeat && !btnRepeat.__voiceRepeatBound) {
      btnRepeat.__voiceRepeatBound = true;
      btnRepeat.addEventListener("click", () => {
        if (!isVoiceEnabled()) {
          log("repeat_blocked_voice_disabled");
          return;
        }
        if (!isInstructionScreenVisible()) {
          log("repeat_blocked_not_in_instruction_screen");
          return;
        }
        const gameId = window.currentGameInstructionId;
        if (!gameId) return;
        const roundId = window.currentInstructionRoundId || window.currentRoundId || "1";
        playInstructionVoice(gameId, roundId, true);
      });
    }

    const btnMute = document.getElementById("btn-mute-instruction");
    if (btnMute && !btnMute.__voiceMuteBound) {
      btnMute.__voiceMuteBound = true;
      btnMute.addEventListener("click", () => {
        toggleMute();
      });
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === VOICE_ENABLED_KEY || event.key === LEGACY_MUTE_KEY) updateVoiceControls();
  });

  setTimeout(init, 800);

  window.playVoiceLine = playVoiceLine;
  window.playInstructionVoice = playInstructionVoice;

  function interruptAndPlayInstruction(gameId, roundId = "1", forceRepeat = false) {
    clearQueue();
    stopCurrentAudio();
    lastInstructionPlayed = "";
    return playInstructionVoice(gameId, roundId, forceRepeat);
  }

  function interruptAndPlay(eventName, options = {}) {
    clearQueue();
    stopCurrentAudio();
    return playVoiceLine(eventName, {
      ...options,
      force: true,
      clearQueue: true,
    });
  }

  window.VoiceLinesTv = {
    play: playVoiceLine,
    playVoiceLine,
    playInstruction: playInstructionVoice,
    playInstructionVoice,
    interruptAndPlayInstruction,
    interruptAndPlay,
    playWinnerVoice,
    playAudioFile,
    toggleMute,
    isMuted: () => !isVoiceEnabled(),
    isVoiceEnabled,
    setVoiceEnabled,
    updateVoiceControls,
    loadCatalog,
    loadInstructionMap,
    unlock,
    isUnlocked: () => unlocked,
    isProcessing: () => isProcessing || playbackQueue.length > 0,
    getQueueLength: () => playbackQueue.length,
    stop: () => {
      clearQueue();
      stopCurrentAudio();
    },
    getLastInstructionKey: () => lastInstructionPlayed,
    isRulesScreenVisible,
    isInstructionScreenVisible,
  };
})();
