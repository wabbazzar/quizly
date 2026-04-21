import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState, useCallback } from 'react';

// ---- Web Audio API mock ----
// Track AudioBufferSourceNode instances to fire onended
const mockSourceNodes: Array<{ onended: (() => void) | null; stop: ReturnType<typeof vi.fn> }> = [];

const mockDecodeAudioData = vi.fn(() => Promise.resolve({ duration: 0.5, sampleRate: 16000 }));

vi.stubGlobal('AudioContext', class MockAudioContext {
  createBuffer = () => ({});
  createBufferSource = () => {
    const node = {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(() => {
        // Auto-fire onended after a microtask to simulate short audio
        setTimeout(() => { if (node.onended) node.onended(); }, 0);
      }),
      stop: vi.fn(),
      onended: null as (() => void) | null,
      addEventListener: vi.fn(),
    };
    mockSourceNodes.push(node);
    return node;
  };
  destination = {};
  state = 'running';
  resume = vi.fn(() => Promise.resolve());
  close = vi.fn(() => Promise.resolve());
  decodeAudioData = mockDecodeAudioData;
});

// Mock fetch for audio file loading
const mockFetch = vi.fn(() => Promise.resolve({
  ok: true,
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
}));
vi.stubGlobal('fetch', mockFetch);

// Mock Audio for unlock only
vi.stubGlobal('Audio', class MockAudio {
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  src = '';
});

// ---- Recorder mock using real React state ----
let triggerBlob: ((blob: Blob | null) => void) | null = null;
const mockRecorderStart = vi.fn();
const mockRecorderStop = vi.fn();
const mockRecorderReset = vi.fn();
const mockRecorderWarmup = vi.fn(() => Promise.resolve(true));
const mockRecorderRelease = vi.fn();

vi.mock('@/hooks/useAudioRecorder', () => ({
  useAudioRecorder: () => {
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    triggerBlob = setAudioBlob;
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
      warmup: mockRecorderWarmup,
      release: mockRecorderRelease,
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

const fakeCard: Card = {
  card_id: 'test_card_0', idx: 0, name: 'test',
  side_a: 'Winter vacation', side_b: 'hánjià', side_c: '寒假', level: 1,
};

function makeProps(overrides = {}) {
  return {
    enabled: true, deckId: 'chinese_chpt10_1', card: fakeCard, cardIndex: 0,
    frontSides: ['side_a'], backSides: ['side_b'],
    playbackOnIncorrect: true, maxRetries: 1,
    onCorrect: vi.fn(), onIncorrect: vi.fn(),
    ...overrides,
  };
}

/** Advance timers to let the mock AudioBufferSourceNode fire onended */
async function waitForAudioEnd() {
  await vi.advanceTimersByTimeAsync(10);
}

describe('useHandsfreeMode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSourceNodes.length = 0;
    mockCompareResult = null;
    mockFetch.mockClear();
    mockFetch.mockImplementation(() => Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    }));
    mockDecodeAudioData.mockClear();
    mockDecodeAudioData.mockImplementation(() => Promise.resolve({ duration: 0.5, sampleRate: 16000 }));
    mockRecorderStart.mockClear();
    mockRecorderStop.mockClear();
    mockRecorderReset.mockClear();
    mockCompare.mockClear();
    mockCompare.mockImplementation(() => Promise.resolve(mockCompareResult));
    triggerBlob = null;
  });

  afterEach(() => { vi.useRealTimers(); });

  it('starts idle, then plays prompt after delay', async () => {
    const { result } = renderHook(() => useHandsfreeMode(makeProps()));
    expect(result.current.state).toBe('idle');
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(result.current.state).toBe('playing_prompt');
  });

  it('transitions playing_prompt -> listening on audio end', async () => {
    const { result } = renderHook(() => useHandsfreeMode(makeProps()));
    await act(async () => { vi.advanceTimersByTime(500); });
    // Let fetch+decode+play resolve, then onended fires
    await act(async () => { await waitForAudioEnd(); });
    expect(result.current.state).toBe('listening');
    expect(mockRecorderStart).toHaveBeenCalledTimes(1);
  });

  it('evaluates a correct recording', async () => {
    mockCompareResult = { normalizedDistance: 10, isMatch: true, rawDistance: 100, refFrames: 20, userFrames: 18 };
    const props = makeProps();
    const { result } = renderHook(() => useHandsfreeMode(props));

    await act(async () => { vi.advanceTimersByTime(500); });
    await act(async () => { await waitForAudioEnd(); });
    await act(async () => { triggerBlob!(new Blob(['audio1'])); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(result.current.state).toBe('showing_result');
    expect(result.current.isCorrect).toBe(true);

    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(props.onCorrect).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe('idle');
  });

  describe('retry flow', () => {
    it('incorrect -> correction -> retry -> listens again', async () => {
      mockCompareResult = { normalizedDistance: 50, isMatch: false, rawDistance: 500, refFrames: 20, userFrames: 18 };
      const props = makeProps({ maxRetries: 1 });
      const { result } = renderHook(() => useHandsfreeMode(props));

      // Start -> prompt -> listen
      await act(async () => { vi.advanceTimersByTime(500); });
      await act(async () => { await waitForAudioEnd(); });
      expect(result.current.attempt).toBe(1);

      // Record -> evaluate -> showing_result (incorrect)
      await act(async () => { triggerBlob!(new Blob(['attempt1'])); });
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(result.current.state).toBe('showing_result');
      expect(result.current.isCorrect).toBe(false);

      // 1000ms -> playing_correction
      await act(async () => { vi.advanceTimersByTime(1000); });
      expect(result.current.state).toBe('playing_correction');

      // Correction audio ends -> 500ms -> listening again
      await act(async () => { await waitForAudioEnd(); });
      await act(async () => { vi.advanceTimersByTime(500); });

      expect(result.current.state).toBe('listening');
      expect(result.current.attempt).toBe(2);
      expect(mockRecorderStart).toHaveBeenCalledTimes(2);
    });

    it('second attempt processes new blob correctly', async () => {
      const props = makeProps({ maxRetries: 1 });
      const { result } = renderHook(() => useHandsfreeMode(props));

      // === ATTEMPT 1: incorrect ===
      mockCompareResult = { normalizedDistance: 50, isMatch: false, rawDistance: 500, refFrames: 20, userFrames: 18 };
      await act(async () => { vi.advanceTimersByTime(500); });
      await act(async () => { await waitForAudioEnd(); });

      const blob1 = new Blob(['attempt1']);
      await act(async () => { triggerBlob!(blob1); });
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(mockCompare).toHaveBeenCalledTimes(1);

      // Correction -> retry
      await act(async () => { vi.advanceTimersByTime(1000); });
      await act(async () => { await waitForAudioEnd(); });
      await act(async () => { vi.advanceTimersByTime(500); });
      expect(result.current.attempt).toBe(2);

      // === ATTEMPT 2: correct ===
      mockCompareResult = { normalizedDistance: 12, isMatch: true, rawDistance: 120, refFrames: 20, userFrames: 19 };
      const blob2 = new Blob(['attempt2']);
      await act(async () => { triggerBlob!(blob2); });
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });

      expect(mockCompare).toHaveBeenCalledTimes(2);
      expect(mockCompare).toHaveBeenLastCalledWith(blob2, expect.any(String));
      expect(result.current.isCorrect).toBe(true);

      await act(async () => { vi.advanceTimersByTime(1500); });
      expect(props.onCorrect).toHaveBeenCalledTimes(1);
      expect(props.onIncorrect).not.toHaveBeenCalled();
    });

    it('exhausts retries then calls onIncorrect', async () => {
      mockCompareResult = { normalizedDistance: 50, isMatch: false, rawDistance: 500, refFrames: 20, userFrames: 18 };
      const props = makeProps({ maxRetries: 1 });
      const { result } = renderHook(() => useHandsfreeMode(props));

      // Attempt 1
      await act(async () => { vi.advanceTimersByTime(500); });
      await act(async () => { await waitForAudioEnd(); });
      await act(async () => { triggerBlob!(new Blob(['a1'])); });
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });

      // Correction -> retry
      await act(async () => { vi.advanceTimersByTime(1000); });
      await act(async () => { await waitForAudioEnd(); });
      await act(async () => { vi.advanceTimersByTime(500); });

      // Attempt 2: still incorrect
      await act(async () => { triggerBlob!(new Blob(['a2'])); });
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });

      // Correction plays, but no more retries (attempt 2 > maxRetries 1)
      await act(async () => { vi.advanceTimersByTime(1000); });
      await act(async () => { await waitForAudioEnd(); });
      await act(async () => { vi.advanceTimersByTime(800); });

      expect(props.onIncorrect).toHaveBeenCalledTimes(1);
      expect(props.onCorrect).not.toHaveBeenCalled();
      expect(result.current.state).toBe('idle');
    });

    it('maxRetries=0 skips retry', async () => {
      mockCompareResult = { normalizedDistance: 50, isMatch: false, rawDistance: 500, refFrames: 20, userFrames: 18 };
      const props = makeProps({ maxRetries: 0 });
      const { result } = renderHook(() => useHandsfreeMode(props));

      await act(async () => { vi.advanceTimersByTime(500); });
      await act(async () => { await waitForAudioEnd(); });
      await act(async () => { triggerBlob!(new Blob(['a1'])); });
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });

      // Correction plays
      await act(async () => { vi.advanceTimersByTime(1000); });
      await act(async () => { await waitForAudioEnd(); });

      // No retry, straight to onIncorrect
      await act(async () => { vi.advanceTimersByTime(800); });
      expect(props.onIncorrect).toHaveBeenCalledTimes(1);
      expect(result.current.state).toBe('idle');
      expect(mockRecorderStart).toHaveBeenCalledTimes(1);
    });
  });
});
