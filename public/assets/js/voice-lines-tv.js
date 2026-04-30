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

    if (primary.endsWith(".mp3")) paths.push(`${primary}.mpeg`);
    if (primary.endsWith(".mp3.mpeg")) paths.push(primary.replace(/\.mpeg$/, ""));

    return [...new Set(paths.filter(Boolean))];
  }

  function byEvent(event) {
    const lines = catalog?.voice_lines || [];
    return lines.filter((line) => line.event === event);
  }

  function pickLine(event, preferredVoiceKey = "") {
    let candidates = byEvent(event);
    if (preferredVoiceKey) {
      const preferred = candidates.filter((line) => line.voice_key === preferredVoiceKey);
      if (preferred.length) candidates = preferred;
    }

    candidates = candidates.filter((line) => !candidatePaths(line).every((path) => failed.has(path)));
    if (!candidates.length) return null;

    const fresh = candidates.filter((line) => !recentlyPlayed.includes(line.id));
    const pool = fresh.length ? fresh : candidates;
    return pool[Math.floor(Math.random() * pool.length)];
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

  async function playNow(event, options = {}) {
    try {
      await loadCatalog();
      const line = pickLine(event, options.voice_key || "");
      if (!line) {
        log("no_line", { event });
        return false;
      }

      for (const path of candidatePaths(line)) {
        const ok = await playPath(path, options.volume ?? 1);
        if (ok) {
          recentlyPlayed.push(line.id);
          while (recentlyPlayed.length > 12) recentlyPlayed.shift();
          return true;
        }
      }

      return false;
    } catch (error) {
      log("play_error", { event, error: String(error?.message || error) });
      return false;
    }
  }

  function play(event, options = {}) {
    playbackChain = playbackChain
      .then(() => playNow(event, options))
      .catch(() => playNow(event, options));
    return playbackChain;
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
  }

  function bindLifecycleHooks() {
    const originalCrearSala = window.crearSala;
    if (typeof originalCrearSala === "function" && !originalCrearSala.__voiceWrapped) {
      const wrapped = async function voiceWrappedCrearSala(...args) {
        const result = await originalCrearSala.apply(this, args);
        setTimeout(() => play("lobby"), 600);
        return result;
      };
      wrapped.__voiceWrapped = true;
      window.crearSala = wrapped;
    }

    const originalStartStory = window.StoryTvControls?.startStory;
    if (typeof originalStartStory === "function" && !originalStartStory.__voiceWrapped) {
      const wrapped = async function voiceWrappedStartStory(...args) {
        await play("rules", { volume: 0.95 });
        const result = await originalStartStory.apply(this, args);
        setTimeout(() => play("round_start"), 1200);
        return result;
      };
      wrapped.__voiceWrapped = true;
      window.StoryTvControls.startStory = wrapped;
    }
  }

  function inferEventFromPhase(phase) {
    if (!phase) return "";
    if (phase === "lobby") return "lobby";
    if (String(phase).startsWith("results_")) return "leaderboard";
    if (["trivia", "duelo", "sombrero", "clase_pociones", "atrapa_snitch", "retratos_chismosos", "mapa_travieso", "hechizo_incompleto", "artes_ridiculas", "patronus_personalizado"].includes(phase)) {
      return "round_start";
    }
    return "";
  }

  let lastPhase = "";

  function observePhase() {
    const gameContainer = document.getElementById("game-container");
    const currentText = [
      document.body.className,
      gameContainer?.textContent?.slice(0, 80),
    ].join("|");

    let phase = "";
    if (document.body.classList.contains("tv-story-mode")) phase = "story";
    if (document.getElementById("view-lobby")?.classList.contains("visible")) phase = "lobby";
    if (document.getElementById("view-results")?.classList.contains("visible")) phase = "results";
    if (document.getElementById("view-game")?.classList.contains("visible")) phase = "game";

    const key = `${phase}|${currentText}`;
    if (key === lastPhase) return;
    lastPhase = key;

    if (phase === "lobby") play("lobby", { volume: 0.7 });
    if (phase === "results") play("leaderboard", { volume: 0.9 });
    if (phase === "game") play("round_start", { volume: 0.75 });
  }

  function init() {
    loadCatalog()
      .then(() => buildPreloadCache())
      .catch((error) => log("catalog_error", { error: String(error?.message || error) }));
    setInterval(bindLifecycleHooks, 1000);
    setInterval(observePhase, 1800);
  }

  document.addEventListener("DOMContentLoaded", init);
  setTimeout(init, 800);

  window.VoiceLinesTv = {
    play,
    loadCatalog,
    unlock,
    isUnlocked: () => unlocked,
  };
})();
