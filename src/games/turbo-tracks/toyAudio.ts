class TurboAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private boostNoiseNode: AudioBufferSourceNode | null = null;
  private boostGain: GainNode | null = null;
  private driftNoiseNode: AudioBufferSourceNode | null = null;
  private driftGain: GainNode | null = null;
  private isInitialized: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.35, this.ctx.currentTime);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public startEngine() {
    if (this.isInitialized) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    try {
      // 1. Dual oscillator engine synthesis for rich mechanical hum
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);
      this.engineOsc.start();

      // 2. White noise buffer for drift skid and boost hiss
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      // Drift Noise Loop
      this.driftNoiseNode = this.ctx.createBufferSource();
      this.driftNoiseNode.buffer = noiseBuffer;
      this.driftNoiseNode.loop = true;
      const driftFilter = this.ctx.createBiquadFilter();
      driftFilter.type = 'bandpass';
      driftFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
      driftFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

      this.driftGain = this.ctx.createGain();
      this.driftGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.driftNoiseNode.connect(driftFilter);
      driftFilter.connect(this.driftGain);
      this.driftGain.connect(this.masterGain);
      this.driftNoiseNode.start();

      // Boost Rocket Loop
      this.boostNoiseNode = this.ctx.createBufferSource();
      this.boostNoiseNode.buffer = noiseBuffer;
      this.boostNoiseNode.loop = true;
      const boostFilter = this.ctx.createBiquadFilter();
      boostFilter.type = 'lowpass';
      boostFilter.frequency.setValueAtTime(2200, this.ctx.currentTime);

      this.boostGain = this.ctx.createGain();
      this.boostGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.boostNoiseNode.connect(boostFilter);
      boostFilter.connect(this.boostGain);
      this.boostGain.connect(this.masterGain);
      this.boostNoiseNode.start();

      this.isInitialized = true;
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  public updateEngineSound(speedKmh: number, isDrifting: boolean, isBoosting: boolean) {
    if (!this.ctx || !this.isInitialized) return;
    const now = this.ctx.currentTime;

    // Pitch engine based on speed (45Hz idle to ~260Hz redline)
    if (this.engineOsc && this.engineFilter) {
      const targetFreq = 48 + Math.min(220, (speedKmh / 180) * 190);
      this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
      const filterFreq = 300 + Math.min(1200, (speedKmh / 180) * 900);
      this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.08);
    }

    // Drift screech volume
    if (this.driftGain) {
      const targetDrift = isDrifting && speedKmh > 30 ? 0.22 : 0.0001;
      this.driftGain.gain.setTargetAtTime(targetDrift, now, 0.04);
    }

    // Boost whoosh volume
    if (this.boostGain) {
      const targetBoost = isBoosting ? 0.35 : 0.0001;
      this.boostGain.gain.setTargetAtTime(targetBoost, now, 0.05);
    }
  }

  public playBoostPad() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.42);
    } catch {}
  }

  public playJump() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(380, now + 0.28);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.32);
    } catch {}
  }

  public playLanding() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.15);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  public playStunt() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.18, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.22);
      });
    } catch {}
  }

  public playCountdown(isGo: boolean) {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(isGo ? 880 : 440, now);

      gain.gain.setValueAtTime(isGo ? 0.3 : 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.45 : 0.2));

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + (isGo ? 0.48 : 0.22));
    } catch {}
  }

  public playLapPass() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.2, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.28);
      });
    } catch {}
  }

  public playCrash() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(30, now + 0.25);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  public stopAll() {
    try {
      if (this.engineOsc) {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
        this.engineOsc = null;
      }
      if (this.driftNoiseNode) {
        this.driftNoiseNode.stop();
        this.driftNoiseNode.disconnect();
        this.driftNoiseNode = null;
      }
      if (this.boostNoiseNode) {
        this.boostNoiseNode.stop();
        this.boostNoiseNode.disconnect();
        this.boostNoiseNode = null;
      }
      this.isInitialized = false;
    } catch {}
  }
}

export const turboAudio = new TurboAudioEngine();
