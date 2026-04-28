(function () {
  let audioCtx = null;
  let unlocked = false;

  function getCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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
      source.connect(ctx.destination);
      source.start(0);
      unlocked = true;
    } catch (error) {
      unlocked = false;
    }
  }

  function createGain(ctx, volume, attack, decay) {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + decay);
    return gain;
  }

  function tone({
    type = "triangle",
    start = 440,
    end = 880,
    duration = 0.28,
    volume = 0.16,
    attack = 0.02,
  } = {}) {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = createGain(ctx, volume, attack, duration);

      osc.type = type;
      osc.frequency.setValueAtTime(start, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(end, ctx.currentTime + duration * 0.72);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (error) {}
  }

  function noise({ duration = 0.35, volume = 0.08, filter = 900 } = {}) {
    try {
      const ctx = getCtx();
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const biquad = ctx.createBiquadFilter();
      biquad.type = "lowpass";
      biquad.frequency.setValueAtTime(filter, ctx.currentTime);

      const gain = createGain(ctx, volume, 0.01, duration);

      source.connect(biquad);
      biquad.connect(gain);
      gain.connect(ctx.destination);

      source.start();
      source.stop(ctx.currentTime + duration);
    } catch (error) {}
  }

  function play(name = "click") {
    if (!unlocked) {
      unlock();
    }

    if (name === "start") {
      tone({ type: "triangle", start: 300, end: 760, duration: 0.24, volume: 0.14 });
      setTimeout(() => tone({ type: "sine", start: 520, end: 980, duration: 0.22, volume: 0.10 }), 90);
      return;
    }

    if (name === "reveal") {
      noise({ duration: 0.42, volume: 0.08, filter: 1200 });
      tone({ type: "triangle", start: 260, end: 940, duration: 0.52, volume: 0.16 });
      setTimeout(() => tone({ type: "sine", start: 600, end: 1200, duration: 0.38, volume: 0.12 }), 130);
      return;
    }

    if (name === "correct") {
      tone({ type: "triangle", start: 520, end: 1040, duration: 0.22, volume: 0.15 });
      setTimeout(() => tone({ type: "sine", start: 780, end: 1320, duration: 0.18, volume: 0.10 }), 90);
      return;
    }

    if (name === "wrong") {
      tone({ type: "sawtooth", start: 220, end: 80, duration: 0.32, volume: 0.12 });
      noise({ duration: 0.22, volume: 0.035, filter: 500 });
      return;
    }

    if (name === "tick") {
      tone({ type: "square", start: 880, end: 760, duration: 0.08, volume: 0.045 });
      return;
    }

    if (name === "timer-danger") {
      tone({ type: "square", start: 1040, end: 740, duration: 0.11, volume: 0.075 });
      return;
    }

    if (name === "send") {
      tone({ type: "triangle", start: 480, end: 760, duration: 0.16, volume: 0.10 });
      return;
    }

    tone({ type: "triangle", start: 420, end: 820, duration: 0.18, volume: 0.08 });
  }

  window.MagicSound = {
    unlock,
    play,
  };
})();
