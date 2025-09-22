/**
 * Sound utilities for game feedback and audio interactions
 *
 * Provides:
 * - Match success and failure sound feedback
 * - Volume control and audio settings integration
 * - Web Audio API optimizations for performance
 * - Cross-browser compatibility and fallbacks
 * - Audio pool management for simultaneous sounds
 */

// Sound effect types
export type SoundEffect =
  | 'match_success'
  | 'match_failure'
  | 'card_select'
  | 'card_flip'
  | 'game_complete'
  | 'timer_tick'
  | 'button_click'
  | 'notification';

// Audio settings interface
export interface AudioSettings {
  enabled: boolean;
  volume: number; // 0.0 to 1.0
  soundEffects: boolean;
  backgroundMusic: boolean;
}

// Sound configuration
interface SoundConfig {
  frequency?: number;
  duration: number;
  type: OscillatorType;
  volume: number;
  envelope?: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
}

// Pre-defined sound configurations
const SOUND_CONFIGS: Record<SoundEffect, SoundConfig> = {
  match_success: {
    frequency: 523.25, // C5
    duration: 0.3,
    type: 'sine',
    volume: 0.6,
    envelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.3,
      release: 0.2,
    },
  },
  match_failure: {
    frequency: 146.83, // D3
    duration: 0.2,
    type: 'sawtooth',
    volume: 0.4,
    envelope: {
      attack: 0.01,
      decay: 0.05,
      sustain: 0.1,
      release: 0.05,
    },
  },
  card_select: {
    frequency: 659.25, // E5
    duration: 0.1,
    type: 'triangle',
    volume: 0.3,
    envelope: {
      attack: 0.01,
      decay: 0.02,
      sustain: 0.1,
      release: 0.05,
    },
  },
  card_flip: {
    frequency: 440, // A4
    duration: 0.15,
    type: 'square',
    volume: 0.25,
    envelope: {
      attack: 0.01,
      decay: 0.05,
      sustain: 0.05,
      release: 0.05,
    },
  },
  game_complete: {
    frequency: 783.99, // G5
    duration: 0.8,
    type: 'sine',
    volume: 0.8,
    envelope: {
      attack: 0.1,
      decay: 0.2,
      sustain: 0.4,
      release: 0.3,
    },
  },
  timer_tick: {
    frequency: 1000, // High tick
    duration: 0.05,
    type: 'square',
    volume: 0.2,
    envelope: {
      attack: 0.001,
      decay: 0.01,
      sustain: 0.01,
      release: 0.02,
    },
  },
  button_click: {
    frequency: 400,
    duration: 0.1,
    type: 'triangle',
    volume: 0.3,
    envelope: {
      attack: 0.01,
      decay: 0.02,
      sustain: 0.02,
      release: 0.05,
    },
  },
  notification: {
    frequency: 800,
    duration: 0.2,
    type: 'sine',
    volume: 0.5,
    envelope: {
      attack: 0.05,
      decay: 0.1,
      sustain: 0.05,
      release: 0.1,
    },
  },
};

// Audio context and pool management
class SoundManager {
  private audioContext: AudioContext | null = null;
  private audioPool: Map<SoundEffect, AudioBuffer[]> = new Map();
  private settings: AudioSettings = {
    enabled: true,
    volume: 0.7,
    soundEffects: true,
    backgroundMusic: false,
  };

  constructor() {
    this.initializeAudioContext();
  }

  private async initializeAudioContext(): Promise<void> {
    try {
      // Create audio context with user gesture handling
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Handle browser autoplay policies
      if (this.audioContext.state === 'suspended') {
        document.addEventListener('click', this.resumeAudioContext.bind(this), { once: true });
        document.addEventListener('touchstart', this.resumeAudioContext.bind(this), { once: true });
      }
    } catch (error) {
      console.warn('Audio context initialization failed:', error);
      this.audioContext = null;
    }
  }

  private async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('Audio context resumed');
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
      }
    }
  }

  /**
   * Update audio settings
   */
  updateSettings(newSettings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Get current audio settings
   */
  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  /**
   * Play a sound effect using Web Audio API
   */
  async playSound(soundEffect: SoundEffect, volumeMultiplier = 1): Promise<void> {
    if (!this.settings.enabled || !this.settings.soundEffects || !this.audioContext) {
      return;
    }

    try {
      const config = SOUND_CONFIGS[soundEffect];
      const volume = Math.min(1, this.settings.volume * volumeMultiplier * config.volume);

      await this.synthesizeAndPlay(config, volume);
    } catch (error) {
      console.warn(`Failed to play sound ${soundEffect}:`, error);
    }
  }

  /**
   * Synthesize and play sound using Web Audio API
   */
  private async synthesizeAndPlay(config: SoundConfig, volume: number): Promise<void> {
    if (!this.audioContext) return;

    const { frequency = 440, duration, type, envelope } = config;
    const ctx = this.audioContext;
    const currentTime = ctx.currentTime;

    // Create oscillator and gain nodes
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Configure oscillator
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, currentTime);

    // Configure envelope (ADSR)
    if (envelope) {
      const { attack, decay, sustain, release } = envelope;
      const sustainLevel = volume * sustain;
      const attackTime = currentTime + attack;
      const decayTime = attackTime + decay;
      const releaseTime = currentTime + duration - release;

      gainNode.gain.setValueAtTime(0, currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, attackTime);
      gainNode.gain.linearRampToValueAtTime(sustainLevel, decayTime);
      gainNode.gain.setValueAtTime(sustainLevel, releaseTime);
      gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);
    } else {
      // Simple volume envelope
      gainNode.gain.setValueAtTime(volume, currentTime);
      gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);
    }

    // Connect audio graph
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Start and stop oscillator
    oscillator.start(currentTime);
    oscillator.stop(currentTime + duration);

    // Clean up
    oscillator.addEventListener('ended', () => {
      oscillator.disconnect();
      gainNode.disconnect();
    });
  }

  /**
   * Play match success sound with celebration effect
   */
  async playMatchSuccess(intensity = 1): Promise<void> {
    if (!this.settings.enabled || !this.settings.soundEffects) return;

    try {
      // Play ascending chord for celebration
      const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
      const delays = [0, 0.1, 0.2];

      for (let i = 0; i < frequencies.length; i++) {
        setTimeout(() => {
          this.synthesizeAndPlay({
            frequency: frequencies[i],
            duration: 0.4,
            type: 'sine',
            volume: 0.6 * intensity,
            envelope: {
              attack: 0.02,
              decay: 0.1,
              sustain: 0.4,
              release: 0.3,
            },
          }, this.settings.volume);
        }, delays[i] * 1000);
      }
    } catch (error) {
      console.warn('Failed to play match success sound:', error);
    }
  }

  /**
   * Play match failure sound with disappointment effect
   */
  async playMatchFailure(): Promise<void> {
    if (!this.settings.enabled || !this.settings.soundEffects) return;

    try {
      // Play descending tone for failure
      await this.synthesizeAndPlay({
        frequency: 220, // A3
        duration: 0.3,
        type: 'sawtooth',
        volume: 0.4,
        envelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.1,
          release: 0.2,
        },
      }, this.settings.volume);
    } catch (error) {
      console.warn('Failed to play match failure sound:', error);
    }
  }

  /**
   * Play game completion sound with fanfare
   */
  async playGameComplete(): Promise<void> {
    if (!this.settings.enabled || !this.settings.soundEffects) return;

    try {
      // Play victory fanfare
      const melody = [
        { freq: 523.25, delay: 0 },    // C5
        { freq: 659.25, delay: 0.2 },  // E5
        { freq: 783.99, delay: 0.4 },  // G5
        { freq: 1046.5, delay: 0.6 },  // C6
      ];

      melody.forEach(({ freq, delay }) => {
        setTimeout(() => {
          this.synthesizeAndPlay({
            frequency: freq,
            duration: 0.5,
            type: 'sine',
            volume: 0.8,
            envelope: {
              attack: 0.05,
              decay: 0.2,
              sustain: 0.5,
              release: 0.3,
            },
          }, this.settings.volume);
        }, delay * 1000);
      });
    } catch (error) {
      console.warn('Failed to play game complete sound:', error);
    }
  }

  /**
   * Enable haptic feedback for supported devices
   */
  vibrate(pattern: number | number[] = 50): void {
    if ('vibrate' in navigator && this.settings.enabled) {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        console.warn('Haptic feedback failed:', error);
      }
    }
  }

  /**
   * Preload audio resources (if using audio files in the future)
   */
  async preload(): Promise<void> {
    // Reserved for future audio file loading
    console.log('Audio system initialized');
  }

  /**
   * Cleanup audio resources
   */
  cleanup(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioPool.clear();
  }
}

// Singleton instance
const soundManager = new SoundManager();

// Export convenience functions
export const playSound = (effect: SoundEffect, volume = 1) =>
  soundManager.playSound(effect, volume);

export const playMatchSuccess = (intensity = 1) =>
  soundManager.playMatchSuccess(intensity);

export const playMatchFailure = () =>
  soundManager.playMatchFailure();

export const playGameComplete = () =>
  soundManager.playGameComplete();

export const updateAudioSettings = (settings: Partial<AudioSettings>) =>
  soundManager.updateSettings(settings);

export const getAudioSettings = () =>
  soundManager.getSettings();

export const vibrate = (pattern: number | number[] = 50) =>
  soundManager.vibrate(pattern);

export const preloadAudio = () =>
  soundManager.preload();

export const cleanupAudio = () =>
  soundManager.cleanup();

// Initialize audio system
if (typeof window !== 'undefined') {
  // Auto-initialize when imported in browser environment
  soundManager.preload();
}

export default soundManager;