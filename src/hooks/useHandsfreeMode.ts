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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processedBlobRef = useRef<Blob | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const attemptRef = useRef(attempt);
  attemptRef.current = attempt;
  // Stable refs for callbacks that change every render
  const onCorrectRef = useRef(onCorrect);
  onCorrectRef.current = onCorrect;
  const onIncorrectRef = useRef(onIncorrect);
  onIncorrectRef.current = onIncorrect;
  const playbackOnIncorrectRef = useRef(playbackOnIncorrect);
  playbackOnIncorrectRef.current = playbackOnIncorrect;
  const maxRetriesRef = useRef(maxRetries);
  maxRetriesRef.current = maxRetries;

  // --- Audio unlock for iOS ---
  const audioUnlockedRef = useRef(false);
  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      const a = new Audio();
      a.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      a.play().then(() => a.pause()).catch(() => {});
      audioUnlockedRef.current = true;
    } catch {
      // will retry
    }
  }, []);

  // --- Warmup on enable, release on disable ---
  useEffect(() => {
    if (enabled) {
      unlockAudio();
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

  // --- Helpers to stop any in-flight audio/timers ---
  const cancelInFlight = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (resultTimerRef.current) { clearTimeout(resultTimerRef.current); resultTimerRef.current = null; }
  }, []);

  // --- Play audio with iOS fallback ---
  const playAudioUrl = useCallback((url: string): Promise<HTMLAudioElement> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.volume = 0.5;
      audioRef.current = audio;
      audio.onended = () => resolve(audio);
      audio.onerror = () => reject(new Error('audio error'));
      audio.play().catch(() => reject(new Error('play blocked')));
    });
  }, []);

  // --- Core state machine actions ---

  const doStartListening = useCallback(() => {
    processedBlobRef.current = null;
    setState('listening');
    recorder.start();
  }, [recorder]);

  const doPlayPromptThenListen = useCallback(() => {
    const url = getPromptUrl();
    if (!url) {
      // No prompt audio, go straight to listening
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
        // Audio play failed (iOS autoplay, missing file) — skip to listening
        if (stateRef.current === 'playing_prompt') {
          doStartListening();
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
        // Correction played. Can we retry?
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
        // Correction audio failed to play — still retry if we can
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
      // Incorrect + playback enabled: wait, then play correction
      resultTimerRef.current = setTimeout(doPlayCorrectionThenMaybeRetry, 1000);
    } else {
      // Incorrect, no playback
      resultTimerRef.current = setTimeout(doAdvanceIncorrect, RESULT_DISPLAY_MS);
    }

    return () => {
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Start flow on card change (only when enabled and not already running) ---
  useEffect(() => {
    if (!enabled || !card) return;

    // If we're already in a non-idle state (e.g. returning from settings),
    // don't restart — the flow is still in progress
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
    if (enabled && card) preloadNext(cardIndex + 1);
  }, [enabled, cardIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      cancelInFlight();
      if (recorder.isRecording) recorder.stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Resume after app foreground / visibility change ---
  useEffect(() => {
    if (!enabled) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && enabledRef.current) {
        // Re-warmup mic (stream may have died in background)
        recorder.warmup();
        // If we're stuck in idle, restart the current card
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

  return {
    state,
    distance,
    isCorrect,
    level: recorder.level,
    attempt,
    skip,
    isSupported: recorder.isSupported,
    error: error || recorder.error,
  };
}
