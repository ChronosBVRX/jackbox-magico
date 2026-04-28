(function () {
  let audioCtx = null;
  let unlocked = false;
  let masterGain = null;

  function getCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.85;
      masterGain.connect(audioCtx.destination);
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    return audioCtx;
  }

  function unlock() {
    try {
      const ctx = getCtx();
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(masterGain || ctx.destination);
      source.start(0);
      unlocked = true;
    } catch (error) {
      unlocked = false;
    }
  }

  function createGain(ctx, volume = 0.12, attack = 0.015, decay = 0.22) {
    const gain = ctx.createGain();

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + decay);

    return gain;
  }

  function tone({
    type = "triangle",
    start = 440,
    end = 880,
    duration = 0.28,
    volume = 0.12,
    attack = 0.018,
    delay = 0,
    pan = 0,
  } = {}) {
    try {
      const ctx = getCtx();
      const startAt = ctx.currentTime + delay;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), startAt + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(1, start), startAt);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, end), startAt + duration * 0.78);

      if (panner) {
        panner.pan.value = pan;
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(masterGain || ctx.destination);
      } else {
        osc.connect(gain);
        gain.connect(masterGain || ctx.destination);
      }

      osc.start(startAt);
      osc.stop(startAt + duration + 0.05);
    } catch (error) {}
  }

  function chord(notes = [], {
    type = "sine",
    duration = 0.34,
    volume = 0.07,
    delay = 0,
  } = {}) {
    notes.forEach((note, index) => {
      tone({
        type,
        start: note,
        end: note * 1.015,
        duration,
        volume,
        delay: delay + index * 0.012,
      });
    });
  }

  function arpeggio(notes = [], {
    type = "triangle",
    duration = 0.18,
    volume = 0.08,
    gap = 0.055,
    startDelay = 0,
  } = {}) {
    notes.forEach((note, index) => {
      tone({
        type,
        start: note,
        end: note * 1.5,
        duration,
        volume,
        delay: startDelay + index * gap,
        pan: index % 2 === 0 ? -0.12 : 0.12,
      });
    });
  }

  function noise({
    duration = 0.35,
    volume = 0.06,
    filter = 900,
    type = "lowpass",
    delay = 0,
  } = {}) {
    try {
      const ctx = getCtx();
      const startAt = ctx.currentTime + delay;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const fade = Math.pow(1 - i / bufferSize, 2.3);
        output[i] = (Math.random() * 2 - 1) * fade;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const biquad = ctx.createBiquadFilter();
      biquad.type = type;
      biquad.frequency.setValueAtTime(filter, startAt);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

      source.connect(biquad);
      biquad.connect(gain);
      gain.connect(masterGain || ctx.destination);

      source.start(startAt);
      source.stop(startAt + duration + 0.05);
    } catch (error) {}
  }

  function bell({
    base = 660,
    volume = 0.10,
    delay = 0,
  } = {}) {
    tone({
      type: "sine",
      start: base,
      end: base * 1.005,
      duration: 0.72,
      volume,
      attack: 0.012,
      delay,
    });

    tone({
      type: "sine",
      start: base * 2.01,
      end: base * 2.0,
      duration: 0.46,
      volume: volume * 0.45,
      attack: 0.01,
      delay: delay + 0.005,
    });

    tone({
      type: "triangle",
      start: base * 3.02,
      end: base * 3.0,
      duration: 0.28,
      volume: volume * 0.22,
      attack: 0.006,
      delay: delay + 0.01,
    });
  }

  function whoosh({
    duration = 0.32,
    volume = 0.045,
    delay = 0,
  } = {}) {
    noise({
      duration,
      volume,
      filter: 1600,
      type: "bandpass",
      delay,
    });

    tone({
      type: "triangle",
      start: 680,
      end: 180,
      duration,
      volume: volume * 0.65,
      delay,
    });
  }

  function magicalSparkle() {
    arpeggio([523.25, 659.25, 783.99, 1046.5], {
      type: "sine",
      duration: 0.20,
      volume: 0.055,
      gap: 0.055,
    });

    noise({
      duration: 0.26,
      volume: 0.018,
      filter: 2600,
      type: "highpass",
    });
  }

  function playStart() {
    bell({ base: 523.25, volume: 0.08 });
    arpeggio([392, 523.25, 659.25, 783.99], {
      type: "triangle",
      duration: 0.20,
      volume: 0.07,
      gap: 0.065,
      startDelay: 0.08,
    });
  }

  function playReveal() {
    noise({
      duration: 0.55,
      volume: 0.055,
      filter: 1300,
      type: "bandpass",
    });

    chord([261.63, 329.63, 392.0, 523.25], {
      type: "triangle",
      duration: 0.58,
      volume: 0.07,
      delay: 0.04,
    });

    arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.51], {
      type: "sine",
      duration: 0.20,
      volume: 0.045,
      gap: 0.05,
      startDelay: 0.16,
    });
  }

  function playCorrect() {
    arpeggio([523.25, 659.25, 783.99], {
      type: "triangle",
      duration: 0.18,
      volume: 0.075,
      gap: 0.05,
    });

    bell({
      base: 1046.5,
      volume: 0.045,
      delay: 0.12,
    });
  }

  function playWrong() {
    tone({
      type: "sawtooth",
      start: 220,
      end: 82,
      duration: 0.34,
      volume: 0.10,
    });

    noise({
      duration: 0.24,
      volume: 0.035,
      filter: 520,
      type: "lowpass",
      delay: 0.03,
    });
  }

  function playTimerDanger() {
    tone({
      type: "square",
      start: 1040,
      end: 720,
      duration: 0.10,
      volume: 0.065,
    });

    tone({
      type: "sine",
      start: 520,
      end: 480,
      duration: 0.08,
      volume: 0.032,
      delay: 0.015,
    });
  }

  function playFastest() {
    whoosh({
      duration: 0.24,
      volume: 0.052,
    });

    arpeggio([783.99, 1046.5, 1318.51], {
      type: "sine",
      duration: 0.14,
      volume: 0.065,
      gap: 0.035,
      startDelay: 0.06,
    });
  }

  function playStreak() {
    chord([392, 493.88, 587.33, 783.99], {
      type: "triangle",
      duration: 0.48,
      volume: 0.06,
    });

    arpeggio([783.99, 880, 987.77, 1174.66], {
      type: "sine",
      duration: 0.16,
      volume: 0.045,
      gap: 0.035,
      startDelay: 0.14,
    });
  }

  function playClick() {
    tone({
      type: "triangle",
      start: 420,
      end: 820,
      duration: 0.14,
      volume: 0.055,
    });
  }

  function playSend() {
    tone({
      type: "triangle",
      start: 480,
      end: 760,
      duration: 0.15,
      volume: 0.075,
    });

    whoosh({
      duration: 0.16,
      volume: 0.025,
      delay: 0.01,
    });
  }

  function playBell() {
    bell({
      base: 659.25,
      volume: 0.09,
    });
  }

  function playApplauseMagic() {
    noise({
      duration: 0.55,
      volume: 0.045,
      filter: 2400,
      type: "bandpass",
    });

    for (let i = 0; i < 8; i++) {
      tone({
        type: "triangle",
        start: 600 + Math.random() * 520,
        end: 760 + Math.random() * 720,
        duration: 0.10 + Math.random() * 0.08,
        volume: 0.025,
        delay: i * 0.045,
        pan: Math.random() * 0.6 - 0.3,
      });
    }
  }

  function play(name = "click") {
    if (!unlocked) {
      unlock();
    }

    const cue = String(name || "click");

    if (cue === "start") {
      playStart();
      return;
    }

    if (cue === "reveal") {
      playReveal();
      return;
    }

    if (cue === "correct") {
      playCorrect();
      return;
    }

    if (cue === "wrong") {
      playWrong();
      return;
    }

    if (cue === "tick") {
      tone({
        type: "square",
        start: 880,
        end: 760,
        duration: 0.075,
        volume: 0.04,
      });
      return;
    }

    if (cue === "timer-danger") {
      playTimerDanger();
      return;
    }

    if (cue === "send") {
      playSend();
      return;
    }

    if (cue === "fastest") {
      playFastest();
      return;
    }

    if (cue === "streak") {
      playStreak();
      return;
    }

    if (cue === "bell" || cue === "campana_magica") {
      playBell();
      return;
    }

    if (cue === "sparkle" || cue === "destello_correcto") {
      magicalSparkle();
      return;
    }

    if (cue === "applause" || cue === "aplausos_gran_comedor") {
      playApplauseMagic();
      return;
    }

    if (cue === "whoosh" || cue === "whoosh_snitch") {
      whoosh();
      return;
    }

    playClick();
  }

  function setVolume(value) {
    try {
      const ctx = getCtx();
      const volume = Math.max(0, Math.min(1, Number(value)));

      if (masterGain) {
        masterGain.gain.setValueAtTime(volume, ctx.currentTime);
      }
    } catch (error) {}
  }

  window.MagicSound = {
    unlock,
    play,
    setVolume,
  };
})();