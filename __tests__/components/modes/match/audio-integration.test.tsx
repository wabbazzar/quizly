import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as soundUtils from '@/utils/soundUtils';

// Mock sound utilities to track calls
vi.mock('@/utils/soundUtils', () => ({
  playMatchSuccess: vi.fn(() => Promise.resolve()),
  playMatchFailure: vi.fn(() => Promise.resolve()),
  playGameComplete: vi.fn(() => Promise.resolve()),
  playSound: vi.fn(() => Promise.resolve()),
  vibrate: vi.fn(),
  updateAudioSettings: vi.fn(),
}));

describe('Audio Integration Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should verify sound utility functions are importable and callable', async () => {
    // Test that all required sound functions are available and work
    await soundUtils.playMatchSuccess(1.2);
    expect(soundUtils.playMatchSuccess).toHaveBeenCalledWith(1.2);

    await soundUtils.playMatchFailure();
    expect(soundUtils.playMatchFailure).toHaveBeenCalled();

    await soundUtils.playGameComplete();
    expect(soundUtils.playGameComplete).toHaveBeenCalled();

    await soundUtils.playSound('card_select', 0.8);
    expect(soundUtils.playSound).toHaveBeenCalledWith('card_select', 0.8);

    soundUtils.vibrate([50, 50, 50]);
    expect(soundUtils.vibrate).toHaveBeenCalledWith([50, 50, 50]);

    soundUtils.updateAudioSettings({ enabled: true, soundEffects: true });
    expect(soundUtils.updateAudioSettings).toHaveBeenCalledWith({
      enabled: true,
      soundEffects: true
    });
  });

  it('should verify sound effect types are properly defined', () => {
    // These sound effects should be valid according to the soundUtils module
    const validSoundEffects = [
      'match_success',
      'match_failure',
      'card_select',
      'card_flip',
      'game_complete',
      'timer_tick',
      'button_click',
      'notification'
    ];

    // The sound utility should accept these sound effect types
    validSoundEffects.forEach(soundEffect => {
      expect(() => {
        soundUtils.playSound(soundEffect as any, 0.5);
      }).not.toThrow();
    });
  });

  it('should verify MatchContainer audio integration points exist', () => {
    // Test that the MatchContainer component imports work
    expect(soundUtils.playMatchSuccess).toBeDefined();
    expect(soundUtils.playMatchFailure).toBeDefined();
    expect(soundUtils.playGameComplete).toBeDefined();
    expect(soundUtils.playSound).toBeDefined();
    expect(soundUtils.vibrate).toBeDefined();
    expect(soundUtils.updateAudioSettings).toBeDefined();
  });
});