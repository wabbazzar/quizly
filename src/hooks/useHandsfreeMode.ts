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
  const stateRef = useRef(state);
  stateRef.current = state;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const attemptRef = useRef(attempt);
  attemptRef.current = attempt;

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
      setError('Tap to start (audio permission needed)');
      setState('idle');
    });
  }, [getPromptUrl, startListening]);

  // When recording completes, evaluate
  useEffect(() => {
    if (!enabled || state !== 'listening' || !recorder.audioBlob) return;

    const refUrl = getReferenceUrl();
    if (!refUrl) {
      setError('No reference audio');
      setState('idle');
      return;
    }

    setState('evaluating');

    comparison.compare(recorder.audioBlob, refUrl).then(result => {
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
    const timer = setTimeout(() => {
      if (enabledRef.current) playPrompt();
    }, 500);

    return () => clearTimeout(timer);
  }, [enabled, cardIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preload next
  useEffect(() => {
    if (enabled && card) preloadNext(cardIndex + 1);
  }, [enabled, cardIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on disable
  useEffect(() => {
    if (!enabled) {
      setState('idle');
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (recorder.isRecording) recorder.stop();
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
