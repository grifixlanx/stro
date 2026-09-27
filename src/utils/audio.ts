/**
 * Sonar Audio & Haptic Feedback Engine
 * Synthesizes deep-water acoustic submarine sonar ping using Web Audio API.
 * Supports cross-device mobile haptic vibrations.
 */

class SonarAudioEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  /**
   * Classic Red Sonar Acoustic Ping + Phone Haptics
   */
  public triggerSonarSignal() {
    // 1. Phone Vibration / Haptics
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([300, 120, 300, 120, 600]);
      } catch (e) {}
    }

    // 2. Synthesized Sonar Transducer Audio
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const baseFreq = 840; // Classic naval sonar frequency
      const duration = 2.5;

      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(0.75, now + 0.02);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      // Primary oscillator
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.94, now + 0.3);
      osc.frequency.linearRampToValueAtTime(baseFreq * 0.91, now + duration);

      // Harmonic metallic resonance
      const harmonicOsc = this.ctx.createOscillator();
      harmonicOsc.type = 'sine';
      harmonicOsc.frequency.setValueAtTime(baseFreq * 2.04, now);
      harmonicOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.96, now + 0.4);

      const harmonicGain = this.ctx.createGain();
      harmonicGain.gain.setValueAtTime(0.3, now);
      harmonicGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      // Resonant bandpass filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(baseFreq, now);
      filter.Q.setValueAtTime(12, now);

      // Oceanic delay echo
      const delay = this.ctx.createDelay();
      delay.delayTime.setValueAtTime(0.32, now);
      const feedback = this.ctx.createGain();
      feedback.gain.setValueAtTime(0.38, now);

      osc.connect(filter);
      filter.connect(masterGain);

      harmonicOsc.connect(harmonicGain);
      harmonicGain.connect(masterGain);

      masterGain.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(this.ctx.destination);

      masterGain.connect(this.ctx.destination);

      osc.start(now);
      harmonicOsc.start(now);
      osc.stop(now + duration);
      harmonicOsc.stop(now + 0.6);
    } catch (err) {
      console.warn('Audio playback inhibited:', err);
    }
  }

  /**
   * Confirmation Chirp when sending signal or connecting
   */
  public playChirp() {
    if (!this.soundEnabled) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }
}

export const sonarAudio = new SonarAudioEngine();
