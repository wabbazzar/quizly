import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the window.AudioContext which may not be available in test environment
const mockAudioContext = {
  createOscillator: vi.fn(() => ({
    type: 'sine',
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    addEventListener: vi.fn(),
    disconnect: vi.fn()
  })),
  createGain: vi.fn(() => ({
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn()
    },
    connect: vi.fn(),
    disconnect: vi.fn()
  })),
  destination: {},
  currentTime: 0,
  state: 'running',
  resume: vi.fn(() => Promise.resolve()),
  close: vi.fn(() => Promise.resolve())
};

// Mock window and navigator
Object.defineProperty(globalThis, 'window', {
  value: {
    AudioContext: vi.fn(() => mockAudioContext),
    webkitAudioContext: vi.fn(() => mockAudioContext),
    matchMedia: vi.fn(() => ({ matches: false })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  },
  writable: true
});

Object.defineProperty(globalThis, 'navigator', {
  value: {
    vibrate: vi.fn()
  },
  writable: true
});

Object.defineProperty(globalThis, 'document', {
  value: {
    addEventListener: vi.fn()
  },
  writable: true
});

describe('soundUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should import without errors', async () => {
    // This tests that the module can be imported successfully
    const soundUtils = await import('@/utils/soundUtils');

    expect(soundUtils.playSound).toBeDefined();
    expect(soundUtils.playMatchSuccess).toBeDefined();
    expect(soundUtils.playMatchFailure).toBeDefined();
    expect(soundUtils.playGameComplete).toBeDefined();
    expect(soundUtils.updateAudioSettings).toBeDefined();
    expect(soundUtils.getAudioSettings).toBeDefined();
    expect(soundUtils.vibrate).toBeDefined();
  });

  it('should have correct audio settings interface', async () => {
    const { getAudioSettings } = await import('@/utils/soundUtils');

    const settings = getAudioSettings();

    expect(settings).toHaveProperty('enabled');
    expect(settings).toHaveProperty('volume');
    expect(settings).toHaveProperty('soundEffects');
    expect(settings).toHaveProperty('backgroundMusic');
    expect(typeof settings.enabled).toBe('boolean');
    expect(typeof settings.volume).toBe('number');
    expect(typeof settings.soundEffects).toBe('boolean');
    expect(typeof settings.backgroundMusic).toBe('boolean');
  });

  it('should update audio settings correctly', async () => {
    const { updateAudioSettings, getAudioSettings } = await import('@/utils/soundUtils');

    updateAudioSettings({
      enabled: true,
      soundEffects: true,
      volume: 0.8
    });

    const updatedSettings = getAudioSettings();
    expect(updatedSettings.enabled).toBe(true);
    expect(updatedSettings.soundEffects).toBe(true);
    expect(updatedSettings.volume).toBe(0.8);
  });

  it('should handle vibration calls safely', async () => {
    const { vibrate } = await import('@/utils/soundUtils');

    // Should not throw even if navigator.vibrate fails
    expect(() => {
      vibrate(50);
      vibrate([50, 50, 50]);
    }).not.toThrow();
  });
});