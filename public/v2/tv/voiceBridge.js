/**
 * Jackbox Mágico V2 - Voice Bridge
 * 
 * Conecta los eventos del servidor (voice_cue) y los cambios de fase de la TV
 * con el VoiceManagerV2.
 */

window.VoiceBridge = (function() {
    let lastCueKey = null;
    let lastCueAt = 0;

    function init(socket) {
        if (!window.VoiceManagerV2) return;
        
        window.VoiceManagerV2.init();

        socket.on('voice_cue', (cue) => {
            handleVoiceCue(cue);
        });

        // Compatibility with manual calls from app.js
        window.handleVoiceCue = handleVoiceCue;
    }

    function handleVoiceCue(cue) {
        if (!cue || !window.VoiceManagerV2) return;

        // Duplicate prevention
        const cueKey = `${cue.type}:${cue.slotId || cue.gameId || cue.eventName || 'audio'}:${cue.winnerHouse || ''}`;
        const now = Date.now();
        if (cueKey === lastCueKey && (now - lastCueAt < 1000) && !cue.force) {
            return; 
        }
        lastCueKey = cueKey;
        lastCueAt = now;

        // Track for repeat button
        if (cue.type === 'instruction' || cue.type === 'voiceSlot') {
            window.lastVoiceCue = cue;
            const btnRepeat = document.getElementById('btn-voice-repeat');
            if (btnRepeat) btnRepeat.style.display = 'flex';
        } else if (cue.type === 'winner' || cue.eventName === 'final') {
            // Hide repeat for non-repeatable events
            const btnRepeat = document.getElementById('btn-voice-repeat');
            if (btnRepeat) btnRepeat.style.display = 'none';
        }

        const delay = Number(cue.delayMs || 0);

        setTimeout(() => {
            if (!window.VoiceManagerV2.isVoiceEnabled() && !cue.force) return;

            switch (cue.type) {
                case "event":
                    window.VoiceManagerV2.playEvent(cue.eventName, {
                        cooldownMs: cue.cooldownMs,
                        force: cue.force,
                        clearQueue: cue.interrupt,
                        interrupt: cue.interrupt
                    });
                    break;

                case "instruction":
                    window.VoiceManagerV2.interruptAndPlayInstruction(
                        cue.gameId,
                        cue.stepId || cue.gameId || "1",
                        Boolean(cue.force)
                    );
                    break;

                case "voiceSlot":
                    // If slotId corresponds to a path in our STORY_VOICE_SLOTS (simulated or real)
                    // we handle it. For now, if it starts with / assume path, else event.
                    if (typeof cue.slotId === 'string' && (cue.slotId.startsWith('/') || cue.slotId.includes('.mp3'))) {
                        window.VoiceManagerV2.playAudioFile(cue.slotId, {
                            interrupt: cue.interrupt,
                            force: cue.force
                        });
                    } else {
                        window.VoiceManagerV2.playVoiceSlot(cue.slotId, {
                            interrupt: cue.interrupt,
                            force: cue.force
                        });
                    }
                    break;

                case "winner":
                    window.VoiceManagerV2.playWinnerVoice(cue.winnerHouse);
                    break;

                case "audioFile":
                    window.VoiceManagerV2.playAudioFile(cue.audioPath, {
                        clearQueue: cue.interrupt,
                        interrupt: cue.interrupt,
                        force: cue.force
                    });
                    break;
            }
        }, delay);
    }

    return {
        init,
        handleVoiceCue
    };
})();
