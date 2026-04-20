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
  /** Max retry attempts after hearing correction (0 = no retries) */
  maxRetries?: number;
  onCorrect: () => void;
  onIncorrect: () => void;
}

interface UseHandsfreeModeReturn {
  state: HandsfreeState;
  distance: number | null;
  isCorrect: boolean | null;
  level: number;
  /** Current attempt number (1-based) */
  attempt: number;
  skip: () => void;
  isSupported: boolean;
  error: string | null;
}

const RESULT_DISPLAY_MS = 2000;

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

  // iOS Safari requires audio.play() from a user gesture. We "unlock" audio
  // playback by playing a silent buffer once during the first user interaction
  // (the settings save that enables handsfree). This persists for the page session.
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
      // Also play and immediately pause an Audio element to unlock HTMLAudioElement
      const a = new Audio();
      a.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      a.play().then(() => a.pause()).catch(() => {});
      audioUnlockedRef.current = true;
    } catch {
      // ignore - will retry on next interaction
    }
  }, []);

  // On enable: unlock audio playback AND warm up mic (both need user gesture context)
  useEffect(() => {
    if (enabled) {
      unlockAudio();
      recorder.warmup();
    } else {
      recorder.release();
    }
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Start listening (used for both initial and retry)
  const startListening = useCallback(() => {
    processedBlobRef.current = null; // allow next blob to be processed
    setState('listening');
    recorder.start();
  }, [recorder]);

  const playPrompt = useCallback(() => {
    const url = getPromptUrl();
    if (!url) {
      setError('No prompt audio available');
      setState('idle');
      return;
    }

    setState('playing_prompt');
    setDistance(null);
    setIsCorrect(null);
    setError(null);

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onended = () => {
      if (stateRef.current === 'playing_prompt') {
        startListening();
      }
    };

    audio.onerror = () => {
      startListening();
    };

    audio.play().catch(() => {
      // iOS autoplay blocked - skip prompt audio, go straight to listening
      // The mic getUserMedia will serve as the user gesture gate
      startListening();
    });
  }, [getPromptUrl, startListening]);

  // When recording completes, evaluate
  useEffect(() => {
    const blob = recorder.audioBlob;
    if (!enabled || !blob) return;
    // Only process if this is a new blob we haven't seen
    if (blob === processedBlobRef.current) return;
    // Only process if we're in a state where we expect a recording
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

  // After showing result: handle correction playback and retries
  useEffect(() => {
    if (state !== 'showing_result') return;

    if (!isCorrect && playbackOnIncorrect) {
      // Play correction audio, then possibly retry
      resultTimerRef.current = setTimeout(() => {
        const refUrl = getReferenceUrl();
        if (refUrl) {
          setState('playing_correction');
          const correctionAudio = new Audio(refUrl);
          audioRef.current = correctionAudio;
          correctionAudio.onended = () => {
            const canRetry = attemptRef.current <= maxRetries;
            if (canRetry) {
              // Retry: go back to listening
              resultTimerRef.current = setTimeout(() => {
                setAttempt(prev => prev + 1);
                setDistance(null);
                setIsCorrect(null);
                setState('retrying');
              }, 500);
            } else {
              // Out of retries
              resultTimerRef.current = setTimeout(() => {
                onIncorrect();
                setState('idle');
              }, 800);
            }
          };
          correctionAudio.onerror = () => {
            onIncorrect();
            setState('idle');
          };
          correctionAudio.play().catch(() => {
            onIncorrect();
            setState('idle');
          });
        } else {
          onIncorrect();
          setState('idle');
        }
      }, 1000);
    } else if (!isCorrect) {
      // No playback, no retry
      resultTimerRef.current = setTimeout(() => {
        onIncorrect();
        setState('idle');
      }, RESULT_DISPLAY_MS);
    } else {
      // Correct
      resultTimerRef.current = setTimeout(() => {
        onCorrect();
        setState('idle');
      }, RESULT_DISPLAY_MS);
    }

    return () => {
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle retry state -> start listening again
  useEffect(() => {
    if (state !== 'retrying') return;
    startListening();
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start on card change
  useEffect(() => {
    if (!enabled || !card) {
      setState('idle');
      return;
    }

    setAttempt(1);
    processedBlobRef.current = null;
    const timer = setTimeout(() => {
      if (enabledRef.current) playPrompt();
    }, 500);

    return () => clearTimeout(timer);
  }, [enabled, cardIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preload next
  useEffect(() => {
    if (enabled && card) preloadNext(cardIndex + 1);
  }, [enabled, cardIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on disable (mic release handled in the enable/disable effect above)
  useEffect(() => {
    if (!enabled) {
      setState('idle');
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (recorder.isRecording) recorder.stop();
      if (resultTimerRef.current) { clearTimeout(resultTimerRef.current); resultTimerRef.current = null; }
    }
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []);

  const skip = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (recorder.isRecording) recorder.stop();
    recorder.reset();
    setState('idle');
    onIncorrect();
  }, [recorder, onIncorrect]);

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
