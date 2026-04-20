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
  | 'playing_correction';

interface UseHandsfreeModeOptions {
  enabled: boolean;
  deckId: string;
  card: Card | null;
  cardIndex: number;
  /** Which side(s) the app plays as the prompt */
  frontSides: string[];
  /** Which side(s) the user speaks (used to determine reference audio) */
  backSides: string[];
  /** Play back the correct audio on incorrect answer (default: true) */
  playbackOnIncorrect?: boolean;
  onCorrect: () => void;
  onIncorrect: () => void;
}

interface UseHandsfreeModeReturn {
  state: HandsfreeState;
  /** Normalized DTW distance from last comparison */
  distance: number | null;
  /** Whether the last answer was correct */
  isCorrect: boolean | null;
  /** Audio input level (0-100) for visualization */
  level: number;
  /** Skip current card manually */
  skip: () => void;
  /** Whether the recorder/comparison system is supported */
  isSupported: boolean;
  /** Error message if any */
  error: string | null;
}

const RESULT_DISPLAY_MS = 2000;

/**
 * Orchestrates the handsfree flashcard loop:
 * idle -> playing_prompt -> listening -> evaluating -> showing_result -> (callback) -> idle
 *
 * On each card:
 * 1. Plays the prompt audio (front side)
 * 2. Records user's response
 * 3. Compares against reference audio (back side) via MFCC + DTW
 * 4. Plays success/fail chime
 * 5. Calls onCorrect/onIncorrect after showing result
 */
export function useHandsfreeMode({
  enabled,
  deckId,
  card,
  cardIndex,
  frontSides,
  backSides,
  playbackOnIncorrect = true,
  onCorrect,
  onIncorrect,
}: UseHandsfreeModeOptions): UseHandsfreeModeReturn {
  const [state, setState] = useState<HandsfreeState>('idle');
  const [distance, setDistance] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorder = useAudioRecorder();
  const comparison = useAudioComparison();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Track if we should auto-start on card change
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const getAudioUrl = useCallback((side: string, idx: number) => {
    const sideLetter = side.replace('side_', '');
    return `${import.meta.env.BASE_URL}data/audio/words/${deckId}_card${idx}_side_${sideLetter}.mp3`;
  }, [deckId]);

  // Get the reference audio URL (the side the user should speak)
  const getReferenceUrl = useCallback(() => {
    if (!backSides.length) return null;
    return getAudioUrl(backSides[0], cardIndex);
  }, [backSides, cardIndex, getAudioUrl]);

  // Get the prompt audio URL (the side the app plays)
  const getPromptUrl = useCallback(() => {
    if (!frontSides.length) return null;
    return getAudioUrl(frontSides[0], cardIndex);
  }, [frontSides, cardIndex, getAudioUrl]);

  // Preload reference audio for next card
  const preloadNext = useCallback((nextIdx: number) => {
    if (!backSides.length) return;
    const url = getAudioUrl(backSides[0], nextIdx);
    comparison.preloadReference(url);
  }, [backSides, getAudioUrl, comparison]);

  // --- State machine transitions ---

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
        setState('listening');
        recorder.start();
      }
    };

    audio.onerror = () => {
      // If prompt audio doesn't exist, skip to listening directly
      setState('listening');
      recorder.start();
    };

    audio.play().catch(() => {
      // Autoplay blocked - need user gesture
      setError('Tap to start (audio permission needed)');
      setState('idle');
    });
  }, [getPromptUrl, recorder]);

  // When recording completes (audioBlob changes), evaluate
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
        // Silent recording
        playSound('match_failure');
        setIsCorrect(false);
        setDistance(null);
      } else {
        setDistance(result.normalizedDistance);
        setIsCorrect(result.isMatch);
        if (result.isMatch) {
          playSound('match_success');
        } else {
          playSound('match_failure');
        }
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

  // After showing result: if incorrect and playbackOnIncorrect, play the correct audio
  useEffect(() => {
    if (state !== 'showing_result') return;

    if (!isCorrect && playbackOnIncorrect) {
      // Wait a beat then play the correct pronunciation
      resultTimerRef.current = setTimeout(() => {
        const refUrl = getReferenceUrl();
        if (refUrl) {
          setState('playing_correction');
          const correctionAudio = new Audio(refUrl);
          audioRef.current = correctionAudio;
          correctionAudio.onended = () => {
            // Brief pause after correction plays, then advance
            resultTimerRef.current = setTimeout(() => {
              onIncorrect();
              setState('idle');
            }, 800);
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
    } else {
      // Correct answer or playback disabled - just advance after delay
      resultTimerRef.current = setTimeout(() => {
        if (isCorrect) {
          onCorrect();
        } else {
          onIncorrect();
        }
        setState('idle');
      }, RESULT_DISPLAY_MS);
    }

    return () => {
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start playing prompt when card changes and mode is enabled
  useEffect(() => {
    if (!enabled || !card) {
      setState('idle');
      return;
    }

    // Small delay to let animations settle
    const timer = setTimeout(() => {
      if (enabledRef.current) {
        playPrompt();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [enabled, cardIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preload next card's reference
  useEffect(() => {
    if (enabled && card) {
      preloadNext(cardIndex + 1);
    }
  }, [enabled, cardIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on disable
  useEffect(() => {
    if (!enabled) {
      setState('idle');
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (recorder.isRecording) recorder.stop();
    }
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []);

  const skip = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
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
    skip,
    isSupported: recorder.isSupported,
    error: error || recorder.error,
  };
}
