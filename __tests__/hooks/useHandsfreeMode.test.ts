import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState, useCallback } from 'react';

// ---- Audio element mock ----
const mockAudioInstances: Array<{
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
  onerror: (() => void) | null;
}> = [];

vi.stubGlobal('Audio', class MockAudio {
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() { mockAudioInstances.push(this); }
});

// ---- Recorder mock using real React state ----
// We create a shared setter that the test can call to trigger blob changes
let triggerBlob: ((blob: Blob | null) => void) | null = null;
const mockRecorderStart = vi.fn();
const mockRecorderStop = vi.fn();
const mockRecorderReset = vi.fn();

vi.mock('@/hooks/useAudioRecorder', () => ({
  useAudioRecorder: () => {
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    // Expose the setter for tests
    triggerBlob = setAudioBlob;
    // When reset is called, clear the blob
    const reset = useCallback(() => { setAudioBlob(null); mockRecorderReset(); }, []);
    const start = useCallback(() => { setAudioBlob(null); mockRecorderStart(); }, []);
    return {
      isRecording: false,
      audioBlob,
      error: null,
      isSupported: true,
      level: 0,
      start,
      stop: mockRecorderStop,
      reset,
    };
  },
}));

// ---- Comparison mock ----
let mockCompareResult: { normalizedDistance: number; isMatch: boolean; rawDistance: number; refFrames: number; userFrames: number } | null = null;
const mockCompare = vi.fn(() => Promise.resolve(mockCompareResult));
const mockPreloadReference = vi.fn();

vi.mock('@/hooks/useAudioComparison', () => ({
  useAudioComparison: () => ({
    compare: mockCompare,
    isComparing: false,
    result: null,
    preloadReference: mockPreloadReference,
    clearCache: vi.fn(),
  }),
}));

vi.mock('@/utils/soundUtils', () => ({
  playSound: vi.fn(),
}));

import { useHandsfreeMode } from '@/hooks/useHandsfreeMode';
import type { Card } from '@/types';

// ---- Helpers ----
const fakeCard: Card = {
  card_id: 'test_card_0', idx: 0, name: 'test',
  side_a: 'Winter vacation', side_b: 'hánjià', side_c: '寒假', level: 1,
};

function makeProps(overrides = {}) {
  return {
    enabled: true,
    deckId: 'chinese_chpt10_1',
    card: fakeCard,
    cardIndex: 0,
    frontSides: ['side_a'],
    backSides: ['side_b'],
    playbackOnIncorrect: true,
    maxRetries: 1,
    onCorrect: vi.fn(),
    onIncorrect: vi.fn(),
    ...overrides,
  };
}

function fireAudioEnded() {
  const latest = mockAudioInstances[mockAudioInstances.length - 1];
  if (latest?.onended) latest.onended();
}

// ---- Tests ----
describe('useHandsfreeMode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockAudioInstances.length = 0;
    mockCompareResult = null;
    mockRecorderStart.mockClear();
    mockRecorderStop.mockClear();
    mockRecorderReset.mockClear();
    mockCompare.mockClear();
    mockCompare.mockImplementation(() => Promise.resolve(mockCompareResult));
    triggerBlob = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts idle, then plays prompt after delay', async () => {
    const props = makeProps();
    const { result } = renderHook(() => useHandsfreeMode(props));
    expect(result.current.state).toBe('idle');

    await act(async () => { vi.advanceTimersByTime(500); });
    expect(result.current.state).toBe('playing_prompt');
  });

  it('transitions playing_prompt -> listening on audio end', async () => {
    const props = makeProps();
    const { result } = renderHook(() => useHandsfreeMode(props));

    await act(async () => { vi.advanceTimersByTime(500); });
    await act(async () => { fireAudioEnded(); });
    expect(result.current.state).toBe('listening');
    expect(mockRecorderStart).toHaveBeenCalledTimes(1);
  });

  it('evaluates a correct recording', async () => {
    mockCompareResult = { normalizedDistance: 10, isMatch: true, rawDistance: 100, refFrames: 20, userFrames: 18 };
    const props = makeProps();
    const { result } = renderHook(() => useHandsfreeMode(props));

    // idle -> playing_prompt -> listening
    await act(async () => { vi.advanceTimersByTime(500); });
    await act(async () => { fireAudioEnded(); });
    expect(result.current.state).toBe('listening');

    // Simulate recording completing (triggers blob state change via React state)
    await act(async () => { triggerBlob!(new Blob(['audio1'])); });
    // Let the comparison promise resolve
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(result.current.state).toBe('showing_result');
    expect(result.current.isCorrect).toBe(true);
    expect(result.current.distance).toBe(10);
    expect(mockCompare).toHaveBeenCalledTimes(1);

    // After display, calls onCorrect
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(props.onCorrect).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe('idle');
  });

  describe('retry flow', () => {
    it('incorrect -> correction -> retry -> listens again', async () => {
      mockCompareResult = { normalizedDistance: 50, isMatch: false, rawDistance: 500, refFrames: 20, userFrames: 18 };
      const props = makeProps({ maxRetries: 1 });
      const { result } = renderHook(() => useHandsfreeMode(props));

      // idle -> playing_prompt -> listening
      await act(async () => { vi.advanceTimersByTime(500); });
      await act(async () => { fireAudioEnded(); });
      expect(result.current.state).toBe('listening');
      expect(result.current.attempt).toBe(1);

      // Recording completes -> evaluating -> showing_result (incorrect)
      await act(async () => { triggerBlob!(new Blob(['attempt1'])); });
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });

      expect(result.current.state).toBe('showing_result');
      expect(result.current.isCorrect).toBe(false);

      // 1000ms delay -> playing_correction
      await act(async () => { vi.advanceTimersByTime(1000); });
      expect(result.current.state).toBe('playing_correction');

      // Correction audio ends -> 500ms delay -> retrying -> listening
      await act(async () => { fireAudioEnded(); });
      await act(async () => { vi.advanceTimersByTime(500); });

      expect(result.current.state).toBe('listening');
      expect(result.current.attempt).toBe(2);
      expect(result.current.isCorrect).toBeNull();
      expect(result.current.distance).toBeNull();
      expect(mockRecorderStart).toHaveBeenCalledTimes(2);
    });

    it('second attempt evaluates NEW blob correctly', async () => {
      const props = makeProps({ maxRetries: 1 });
      const { result } = renderHook(() => useHandsfreeMode(props));

      // === ATTEMPT 1: incorrect ===
      mockCompareResult = { normalizedDistance: 50, isMatch: false, rawDistance: 500, refFrames: 20, userFrames: 18 };

      await act(async () => { vi.advanceTimersByTime(500); });
      await act(async () => { fireAudioEnded(); });

      const blob1 = new Blob(['attempt1']);
      await act(async () => { triggerBlob!(blob1); });
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });

      expect(result.current.state).toBe('showing_result');
      expect(result.current.isCorrect).toBe(false);
      expect(mockCompare).toHaveBeenCalledTimes(1);
      expect(mockCompare).toHaveBeenLastCalledWith(blob1, expect.any(String));

      // Correction -> retry
      await act(async () => { vi.advanceTimersByTime(1000); }); // -> playing_correction
      await act(async () => { fireAudioEnded(); });             // correction ends
      await act(async () => { vi.advanceTimersByTime(500); });  // -> retrying -> listening

      expect(result.current.state).toBe('listening');
      expect(result.current.attempt).toBe(2);

      // === ATTEMPT 2: correct ===
      mockCompareResult = { normalizedDistance: 12, isMatch: true, rawDistance: 120, refFrames: 20, userFrames: 19 };

      const blob2 = new Blob(['attempt2']);
      await act(async () => { triggerBlob!(blob2); });
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });

      // Must have called compare with blob2 (not blob1 again)
      expect(mockCompare).toHaveBeenCalledTimes(2);
      expect(mockCompare).toHaveBeenLastCalledWith(blob2, expect.any(String));

      expect(result.current.state).toBe('showing_result');
      expect(result.current.isCorrect).toBe(true);
      expect(result.current.distance).toBe(12);

      // After display: onCorrect called, NOT onIncorrect
      await act(async () => { vi.advanceTimersByTime(2000); });
      expect(props.onCorrect).toHaveBeenCalledTimes(1);
      expect(props.onIncorrect).not.toHaveBeenCalled();
    });

    it('exhausts retries then calls onIncorrect', async () => {
      mockCompareResult = { normalizedDistance: 50, isMatch: false, rawDistance: 500, refFrames: 20, userFrames: 18 };
      const props = makeProps({ maxRetries: 1 });
      const { result } = renderHook(() => useHandsfreeMode(props));

      // Attempt 1: incorrect
      await act(async () => { vi.advanceTimersByTime(500); });
      await act(async () => { fireAudioEnded(); });
      await act(async () => { triggerBlob!(new Blob(['a1'])); });
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(result.current.isCorrect).toBe(false);

      // Correction -> retry
      await act(async () => { vi.advanceTimersByTime(1000); });
      await act(async () => { fireAudioEnded(); });
      await act(async () => { vi.advanceTimersByTime(500); });
      expect(result.current.attempt).toBe(2);

      // Attempt 2: still incorrect
      await act(async () => { triggerBlob!(new Blob(['a2'])); });
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(result.current.isCorrect).toBe(false);

      // Correction plays, but attempt 2 > maxRetries 1, no more retries
      await act(async () => { vi.advanceTimersByTime(1000); });
      await act(async () => { fireAudioEnded(); });

      // After 800ms: onIncorrect, idle
      await act(async () => { vi.advanceTimersByTime(800); });
      expect(props.onIncorrect).toHaveBeenCalledTimes(1);
      expect(props.onCorrect).not.toHaveBeenCalled();
      expect(result.current.state).toBe('idle');
    });

    it('maxRetries=0 skips retry entirely', async () => {
      mockCompareResult = { normalizedDistance: 50, isMatch: false, rawDistance: 500, refFrames: 20, userFrames: 18 };
      const props = makeProps({ maxRetries: 0 });
      const { result } = renderHook(() => useHandsfreeMode(props));

      await act(async () => { vi.advanceTimersByTime(500); });
      await act(async () => { fireAudioEnded(); });
      await act(async () => { triggerBlob!(new Blob(['a1'])); });
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(result.current.isCorrect).toBe(false);

      // Correction plays
      await act(async () => { vi.advanceTimersByTime(1000); });
      await act(async () => { fireAudioEnded(); });

      // No retry, straight to onIncorrect after 800ms
      await act(async () => { vi.advanceTimersByTime(800); });
      expect(props.onIncorrect).toHaveBeenCalledTimes(1);
      expect(result.current.state).toBe('idle');
      // Only 1 recording started (no retry)
      expect(mockRecorderStart).toHaveBeenCalledTimes(1);
    });
  });
});
