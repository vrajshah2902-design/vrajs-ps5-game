/**
 * Web Audio API Procedural Sound Synthesizer
 * Generates realistic engine roar, turbo blow-off, tire screeching, nitro whoosh, and collision SFX.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.initialized = false;

    // Engine Audio Nodes
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineOscSub = null;
    this.engineFilter = null;

    // Tire Screech Nodes
    this.screechGain = null;
    this.screechFilter = null;
    this.screechSource = null;

    // Nitro Nodes
    this.nitroGain = null;
    this.nitroFilter = null;
    this.nitroSource = null;

    // Noise Buffers
    this.whiteNoiseBuffer = null;
  }

  init() {
    if (this.initialized) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Create shared white noise buffer (2 seconds loop)
      const bufferSize = this.ctx.sampleRate * 2;
      this.whiteNoiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.whiteNoiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this.setupEngineNodes();
      this.setupTireNodes();
      this.setupNitroNodes();

      this.initialized = true;
      console.log("[Audio] Procedural Sound Engine Initialized");
    } catch (e) {
      console.warn("[Audio] Web Audio initialization deferred until user interaction", e);
    }
  }

  resume() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setupEngineNodes() {
    const t = this.ctx.currentTime;

    // Master Engine Gain
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.001, t);

    // Filter
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.setValueAtTime(350, t);
    this.engineFilter.Q.setValueAtTime(3.5, t);

    // Distortion shaper for throaty grit
    const distortion = this.ctx.createWaveShaper();
    distortion.curve = this.makeDistortionCurve(18);
    distortion.oversample = "2x";

    // Oscillators: Sawtooth (combustion pulses) + Square (sub/harmonics)
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = "sawtooth";
    this.engineOsc1.frequency.setValueAtTime(55, t);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = "triangle";
    this.engineOsc2.frequency.setValueAtTime(110, t);

    this.engineOscSub = this.ctx.createOscillator();
    this.engineOscSub.type = "sine";
    this.engineOscSub.frequency.setValueAtTime(27.5, t);

    // Connect
    this.engineOsc1.connect(distortion);
    this.engineOsc2.connect(distortion);
    this.engineOscSub.connect(this.engineFilter);

    distortion.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.engineOscSub.start();
  }

  setupTireNodes() {
    // Noise loop for tire friction
    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.screechFilter = this.ctx.createBiquadFilter();
    this.screechFilter.type = "bandpass";
    this.screechFilter.frequency.setValueAtTime(950, this.ctx.currentTime);
    this.screechFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.screechSource = this.ctx.createBufferSource();
    this.screechSource.buffer = this.whiteNoiseBuffer;
    this.screechSource.loop = true;

    this.screechSource.connect(this.screechFilter);
    this.screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.ctx.destination);
    this.screechSource.start();
  }

  setupNitroNodes() {
    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.nitroFilter = this.ctx.createBiquadFilter();
    this.nitroFilter.type = "lowpass";
    this.nitroFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    this.nitroFilter.Q.setValueAtTime(6.0, this.ctx.currentTime);

    this.nitroSource = this.ctx.createBufferSource();
    this.nitroSource.buffer = this.whiteNoiseBuffer;
    this.nitroSource.loop = true;

    this.nitroSource.connect(this.nitroFilter);
    this.nitroFilter.connect(this.nitroGain);
    this.nitroGain.connect(this.ctx.destination);
    this.nitroSource.start();
  }

  makeDistortionCurve(amount) {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  // Update engine audio frame by frame
  updateEngine(rpmRatio, throttle, isBoosting) {
    if (!this.initialized || this.isMuted || !this.ctx) return;

    const t = this.ctx.currentTime;
    // Base idle 50Hz, redline ~320Hz
    const baseFreq = 50 + rpmRatio * 240;
    
    // Smooth transition
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, t, 0.05);
    this.engineOscSub.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.05);

    // Filter opens up as throttle and RPM increase
    const filterFreq = 300 + throttle * 1200 + rpmRatio * 2200 + (isBoosting ? 1000 : 0);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.05);

    // Master volume adjusts dynamically
    const targetVol = 0.12 + throttle * 0.18 + (isBoosting ? 0.08 : 0);
    this.engineGain.gain.setTargetAtTime(targetVol, t, 0.05);
  }

  // Update tire squeal sound
  updateTires(slipIntensity) {
    if (!this.initialized || this.isMuted || !this.screechGain) return;

    const t = this.ctx.currentTime;
    // Slip intensity ranges from 0.0 to 1.0+
    const clampedSlip = Math.min(1.0, Math.max(0.0, slipIntensity));
    
    if (clampedSlip > 0.1) {
      const targetGain = (clampedSlip - 0.1) * 0.28;
      const targetFreq = 800 + clampedSlip * 650;
      this.screechGain.gain.setTargetAtTime(targetGain, t, 0.04);
      this.screechFilter.frequency.setTargetAtTime(targetFreq, t, 0.04);
    } else {
      this.screechGain.gain.setTargetAtTime(0, t, 0.08);
    }
  }

  // Update Nitro whoosh
  updateNitro(isBoosting) {
    if (!this.initialized || this.isMuted || !this.nitroGain) return;

    const t = this.ctx.currentTime;
    if (isBoosting) {
      this.nitroGain.gain.setTargetAtTime(0.25, t, 0.05);
      this.nitroFilter.frequency.setTargetAtTime(2400, t, 0.08);
    } else {
      this.nitroGain.gain.setTargetAtTime(0, t, 0.1);
    }
  }

  // Crisp turbo blow-off valve sound: "pshhhh-tututu"
  playBlowOff() {
    if (!this.initialized || this.isMuted) return;

    const t = this.ctx.currentTime;
    const blowSource = this.ctx.createBufferSource();
    blowSource.buffer = this.whiteNoiseBuffer;

    const blowFilter = this.ctx.createBiquadFilter();
    blowFilter.type = "bandpass";
    blowFilter.frequency.setValueAtTime(2800, t);
    blowFilter.Q.setValueAtTime(3.0, t);

    const blowGain = this.ctx.createGain();
    blowGain.gain.setValueAtTime(0.22, t);
    blowGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    blowSource.connect(blowFilter);
    blowFilter.connect(blowGain);
    blowGain.connect(this.ctx.destination);

    blowSource.start(t);
    blowSource.stop(t + 0.4);
  }

  // Barrier impact crash
  playCrash(intensity = 0.5) {
    if (!this.initialized || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.25);

    const crashGain = this.ctx.createGain();
    const gainVal = Math.min(0.4, 0.15 + intensity * 0.25);
    crashGain.gain.setValueAtTime(gainVal, t);
    crashGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(crashGain);
    crashGain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  // Checkpoint chime
  playCheckpoint() {
    if (!this.initialized || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, t); // D5
    osc.frequency.setValueAtTime(880, t + 0.08); // A5

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.45);
  }

  // Countdown Beep (low or high)
  playCountdown(isHigh = false) {
    if (!this.initialized || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(isHigh ? 880 : 440, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isHigh ? 0.6 : 0.25));

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + (isHigh ? 0.65 : 0.3));
  }
}

// Global instance
window.soundEngine = new SoundEngine();
