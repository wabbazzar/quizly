import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { useAudioComparison } from './useAudioComparison';
import { playSound } from '@/utils/soundUtils';
import type { Card } from '@/types';

export type HandsfreeState =
  | 'idle'
  | 'playing_prompt'
  | 'listening'
  | 'evaluating'
  | 'showing_result'
  | 'playing_correction'
  | 'retrying';

interface UseHandsfreeModeOptions {
  enabled: boolean;
  deckId: string;
  card: Card | null;
  cardIndex: number;
  frontSides: string[];
  backSides: string[];
  playbackOnIncorrect?: boolean;
  maxRetries?: number;
  onCorrect: () => void;
  onIncorrect: () => void;
}

interface UseHandsfreeModeReturn {
  state: HandsfreeState;
  distance: number | null;
  isCorrect: boolean | null;
  level: number;
  attempt: number;
  skip: () => void;
  restart: () => void;
  isSupported: boolean;
  error: string | null;
}

const RESULT_DISPLAY_MS = 1500;

export function useHandsfreeMode({
  enabled,
  deckId,
  card,
  cardIndex,
  frontSides,
  backSides,
  playbackOnIncorrect = true,
  maxRetries = 1,
  onCorrect,
  onIncorrect,
}: UseHandsfreeModeOptions): UseHandsfreeModeReturn {
  const [state, setState] = useState<HandsfreeState>('idle');
  const [distance, setDistance] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(1);

  const recorder = useAudioRecorder();
  const comparison = useAudioComparison();

  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processedBlobRef = useRef<Blob | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const attemptRef = useRef(attempt);
  attemptRef.current = attempt;
  const onCorrectRef = useRef(onCorrect);
  onCorrectRef.current = onCorrect;
  const onIncorrectRef = useRef(onIncorrect);
  onIncorrectRef.current = onIncorrect;
  const playbackOnIncorrectRef = useRef(playbackOnIncorrect);
  playbackOnIncorrectRef.current = playbackOnIncorrect;
  const maxRetriesRef = useRef(maxRetries);
  maxRetriesRef.current = maxRetries;

  // --- Shared AudioContext for playback ---
  // Using Web Audio API instead of HTMLAudioElement to avoid iOS Safari's
  // audio session conflict: HTMLAudioElement takes exclusive audio session
  // control, which kills the MediaRecorder mic stream. Web Audio API and
  // MediaRecorder can coexist on the same AudioContext.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  // --- Warmup on enable ---
  useEffect(() => {
    if (enabled) {
      // Create AudioContext during user gesture to unlock on iOS
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      // Play silent buffer to fully unlock
      try {
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      } catch { /* ignore */ }
      recorder.warmup();
    } else {
      recorder.release();
    }
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- URL helpers ---
  const getAudioUrl = useCallback((side: string, idx: number) => {
    const sideLetter = side.replace('side_', '');
    return `${import.meta.env.BASE_URL}data/audio/words/${deckId}_card${idx}_side_${sideLetter}.mp3`;
  }, [deckId]);

  const getReferenceUrl = useCallback(() => {
    if (!backSides.length) return null;
    return getAudioUrl(backSides[0], cardIndex);
  }, [backSides, cardIndex, getAudioUrl]);

  const getPromptUrl = useCallback(() => {
    if (!frontSides.length) return null;
    return getAudioUrl(frontSides[0], cardIndex);
  }, [frontSides, cardIndex, getAudioUrl]);

  const preloadNext = useCallback((nextIdx: number) => {
    if (!backSides.length) return;
    comparison.preloadReference(getAudioUrl(backSides[0], nextIdx));
  }, [backSides, getAudioUrl, comparison]);

  // --- Stop any in-flight audio/timers ---
  const cancelInFlight = useCallback(() => {
    if (activeSourceRef.current) {
      try { activeSourceRef.current.stop(); } catch { /* already stopped */ }
      activeSourceRef.current = null;
    }
    if (resultTimerRef.current) {
      clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
  }, []);

  // --- Play audio via Web Audio API (no HTMLAudioElement) ---
  const playAudioUrl = useCallback(async (url: string): Promise<void> => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    // Check cache first
    let buffer = audioBufferCacheRef.current.get(url);
    if (!buffer) {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`audio fetch failed: ${resp.status}`);
      const arrayBuf = await resp.arrayBuffer();
      buffer = await ctx.decodeAudioData(arrayBuf);
      audioBufferCacheRef.current.set(url, buffer);
    }

    // Stop any previous source
    if (activeSourceRef.current) {
      try { activeSourceRef.current.stop(); } catch { /* ok */ }
    }

    return new Promise<void>((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer!;
      source.connect(ctx.destination);
      activeSourceRef.current = source;

      source.onended = () => {
        activeSourceRef.current = null;
        resolve();
      };

      // Safety timeout in case onended doesn't fire
      const safety = setTimeout(() => {
        activeSourceRef.current = null;
        resolve();
      }, (buffer!.duration + 1) * 1000);

      source.addEventListener('ended', () => clearTimeout(safety), { once: true });
      source.start(0);
    });
  }, [getAudioContext]);

  // --- Core state machine actions ---

  const doStartListening = useCallback(() => {
    processedBlobRef.current = null;
    setState('listening');
    recorder.start();
  }, [recorder]);

  const doPlayPromptThenListen = useCallback(() => {
    const url = getPromptUrl();
    if (!url) {
      doStartListening();
      return;
    }

    setState('playing_prompt');
    setDistance(null);
    setIsCorrect(null);
    setError(null);

    playAudioUrl(url)
      .then(() => {
        if (stateRef.current === 'playing_prompt') {
          doStartListening();
        }
      })
      .catch(() => {
        if (stateRef.current === 'playing_prompt') {
          setError('Tap to start');
          setState('idle');
        }
      });
  }, [getPromptUrl, doStartListening, playAudioUrl]);

  const doAdvanceCorrect = useCallback(() => {
    onCorrectRef.current();
    setState('idle');
  }, []);

  const doAdvanceIncorrect = useCallback(() => {
    onIncorrectRef.current();
    setState('idle');
  }, []);

  const doPlayCorrectionThenMaybeRetry = useCallback(() => {
    const refUrl = getReferenceUrl();
    if (!refUrl) {
      doAdvanceIncorrect();
      return;
    }

    setState('playing_correction');

    playAudioUrl(refUrl)
      .then(() => {
        if (attemptRef.current <= maxRetriesRef.current) {
          resultTimerRef.current = setTimeout(() => {
            setAttempt(prev => prev + 1);
            setDistance(null);
            setIsCorrect(null);
            doStartListening();
          }, 500);
        } else {
          resultTimerRef.current = setTimeout(doAdvanceIncorrect, 800);
        }
      })
      .catch(() => {
        // Correction failed to play - still retry if we can
        if (attemptRef.current <= maxRetriesRef.current) {
          resultTimerRef.current = setTimeout(() => {
            setAttempt(prev => prev + 1);
            setDistance(null);
            setIsCorrect(null);
            doStartListening();
          }, 500);
        } else {
          resultTimerRef.current = setTimeout(doAdvanceIncorrect, 800);
        }
      });
  }, [getReferenceUrl, playAudioUrl, doStartListening, doAdvanceIncorrect]);

  // --- Recording complete → evaluate ---
  useEffect(() => {
    const blob = recorder.audioBlob;
    if (!enabled || !blob) return;
    if (blob === processedBlobRef.current) return;
    if (stateRef.current !== 'listening') return;

    processedBlobRef.current = blob;

    const refUrl = getReferenceUrl();
    if (!refUrl) {
      setError('No reference audio');
      setState('idle');
      return;
    }

    setState('evaluating');

    comparison.compare(blob, refUrl).then(result => {
      if (!result) {
        playSound('match_failure');
        setIsCorrect(false);
        setDistance(null);
      } else {
        setDistance(result.normalizedDistance);
        setIsCorrect(result.isMatch);
        playSound(result.isMatch ? 'match_success' : 'match_failure');
      }
      setState('showing_result');
      recorder.reset();
    }).catch(() => {
      playSound('match_failure');
      setIsCorrect(false);
      setState('showing_result');
      recorder.reset();
    });
  }, [recorder.audioBlob]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Showing result → advance or correction/retry ---
  useEffect(() => {
    if (state !== 'showing_result') return;

    if (isCorrect) {
      resultTimerRef.current = setTimeout(doAdvanceCorrect, RESULT_DISPLAY_MS);
    } else if (playbackOnIncorrectRef.current) {
      resultTimerRef.current = setTimeout(doPlayCorrectionThenMaybeRetry, 1000);
    } else {
      resultTimerRef.current = setTimeout(doAdvanceIncorrect, RESULT_DISPLAY_MS);
    }

    return () => {
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Start flow on card change ---
  useEffect(() => {
    if (!enabled || !card) return;
    if (stateRef.current !== 'idle') return;

    setAttempt(1);
    processedBlobRef.current = null;
    const timer = setTimeout(() => {
      if (enabledRef.current && stateRef.current === 'idle') {
        doPlayPromptThenListen();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [enabled, cardIndex, card]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Preload next card ---
  useEffect(() => {
    if (enabled && card) {
      preloadNext(cardIndex + 1);
      // Also pre-fetch and decode next card's prompt audio
      const nextPromptUrl = frontSides.length ? getAudioUrl(frontSides[0], cardIndex + 1) : null;
      if (nextPromptUrl) {
        const ctx = getAudioContext();
        fetch(nextPromptUrl).then(r => r.ok ? r.arrayBuffer() : null).then(buf => {
          if (buf) ctx.decodeAudioData(buf).then(decoded => {
            audioBufferCacheRef.current.set(nextPromptUrl, decoded);
          }).catch(() => {});
        }).catch(() => {});
      }
    }
  }, [enabled, cardIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      cancelInFlight();
      if (recorder.isRecording) recorder.stop();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Resume after app foreground ---
  useEffect(() => {
    if (!enabled) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && enabledRef.current) {
        recorder.warmup();
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        if (stateRef.current === 'idle') {
          processedBlobRef.current = null;
          doPlayPromptThenListen();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const skip = useCallback(() => {
    cancelInFlight();
    if (recorder.isRecording) recorder.stop();
    recorder.reset();
    setState('idle');
    onIncorrectRef.current();
  }, [recorder, cancelInFlight]);

  const restart = useCallback(() => {
    cancelInFlight();
    if (recorder.isRecording) recorder.stop();
    recorder.reset();
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    recorder.warmup();
    setAttempt(1);
    processedBlobRef.current = null;
    setError(null);
    doPlayPromptThenListen();
  }, [recorder, cancelInFlight, getAudioContext, doPlayPromptThenListen]);

  return {
    state,
    distance,
    isCorrect,
    level: recorder.level,
    attempt,
    skip,
    restart,
    isSupported: recorder.isSupported,
    error: error || recorder.error,
  };
}
