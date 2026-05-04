/**
 * Jackbox Mágico V2 - Music Manager
 * 
 * Handles background music playback independently from voice lines.
 */

window.MusicManager = (function() {
    let audio = null;
    let isPlaying = false;
    let isInitialized = false;
    let currentPath = null;

    function init(path) {
        if (isInitialized && currentPath === path) return;
        
        if (audio) {
            audio.pause();
            audio = null;
        }

        currentPath = path;
        audio = new Audio(path);
        audio.loop = true;
        audio.volume = 0.4; // Default volume for background music
        isInitialized = true;
        console.log(`MusicManager: Initialized with ${path}`);
    }

    async function play() {
        if (!audio || isPlaying) return;
        
        try {
            await audio.play();
            isPlaying = true;
            console.log("MusicManager: Background music started.");
        } catch (err) {
            console.warn("MusicManager: Autoplay blocked or error.", err);
        }
    }

    function pause() {
        if (!audio || !isPlaying) return;
        audio.pause();
        isPlaying = false;
    }

    function setVolume(volume) {
        if (audio) {
            audio.volume = Math.max(0, Math.min(1, volume));
        }
    }

    function fadeOut(duration = 2000) {
        if (!audio || !isPlaying) return;
        const startVolume = audio.volume;
        const steps = 20;
        const stepTime = duration / steps;
        const volumeStep = startVolume / steps;

        let currentStep = 0;
        const interval = setInterval(() => {
            currentStep++;
            audio.volume = Math.max(0, startVolume - (volumeStep * currentStep));
            if (currentStep >= steps) {
                clearInterval(interval);
                pause();
                audio.volume = startVolume; // Reset for next time
            }
        }, stepTime);
    }

    return {
        init,
        play,
        pause,
        setVolume,
        fadeOut,
        isPlaying: () => isPlaying
    };
})();
