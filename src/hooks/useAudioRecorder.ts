import { useCallback, useEffect, useRef, useState } from 'react';

const SILENCE_THRESHOLD = 0.015;
const SILENCE_DURATION_MS = 1500;
const MAX_RECORD_MS = 6000;

interface UseAudioRecorderReturn {
  isRecording: boolean;
  audioBlob: Blob | null;
  error: string | null;
  isSupported: boolean;
  /** Current RMS level (0-100) for visualization */
  level: number;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
  /** Pre-acquire mic permission and keep stream alive */
  warmup: () => Promise<boolean>;
  /** Release mic stream */
  release: () => void;
}

/**
 * Records audio via MediaRecorder with automatic silence detection.
 * Auto-stops after SILENCE_DURATION_MS of silence or MAX_RECORD_MS total.
 *
 * Supports warmup() to pre-acquire the mic stream during a user gesture
 * (important for iOS Safari). The stream is reused across recordings
 * until release() is called.
 */
export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const persistentStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isSupported = typeof MediaRecorder !== 'undefined'
    && typeof navigator.mediaDevices?.getUserMedia === 'function';

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const getStream = useCallback(async (): Promise<MediaStream | null> => {
    // Reuse existing stream if alive
    if (persistentStreamRef.current) {
      const tracks = persistentStreamRef.current.getAudioTracks();
      if (tracks.length > 0 && tracks[0].readyState === 'live') {
        return persistentStreamRef.current;
      }
      // Stream died, clear it
      persistentStreamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      persistentStreamRef.current = stream;
      return stream;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Microphone access denied');
      return null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    analyserRef.current = null;
    setLevel(0);
    setIsRecording(false);
  }, []);

  /** Pre-acquire mic during a user gesture (e.g. button tap). Returns true if successful. */
  const warmup = useCallback(async (): Promise<boolean> => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    const stream = await getStream();
    return stream !== null;
  }, [getAudioContext, getStream]);

  /** Release the persistent mic stream */
  const release = useCallback(() => {
    if (persistentStreamRef.current) {
      persistentStreamRef.current.getTracks().forEach(t => t.stop());
      persistentStreamRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    chunksRef.current = [];

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    const stream = await getStream();
    if (!stream) return;

    // Analyser for silence detection + level meter
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyserRef.current = analyser;

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      if (chunksRef.current.length > 0) {
        setAudioBlob(new Blob(chunksRef.current, { type: recorder.mimeType }));
      }
    };

    recorder.start();
    setIsRecording(true);

    // Silence detection
    const dataArray = new Float32Array(analyser.fftSize);
    let silentSince: number | null = null;
    let hasHadSound = false;

    levelIntervalRef.current = setInterval(() => {
      if (!analyserRef.current) return;
      analyserRef.current.getFloatTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
      const rms = Math.sqrt(sum / dataArray.length);

      setLevel(Math.min(rms * 600, 100));

      if (rms > SILENCE_THRESHOLD * 2) hasHadSound = true;

      if (hasHadSound && rms < SILENCE_THRESHOLD) {
        if (!silentSince) silentSince = Date.now();
        else if (Date.now() - silentSince > SILENCE_DURATION_MS) {
          stopRecording();
        }
      } else {
        silentSince = null;
      }
    }, 80);

    // Safety cap
    maxTimerRef.current = setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') stopRecording();
    }, MAX_RECORD_MS);
  }, [getAudioContext, getStream, stopRecording]);

  const stop = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const reset = useCallback(() => {
    setAudioBlob(null);
    setError(null);
    setLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (levelIntervalRef.current) clearInterval(levelIntervalRef.current);
      if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
      if (persistentStreamRef.current) {
        persistentStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, []);

  return { isRecording, audioBlob, error, isSupported, level, start, stop, reset, warmup, release };
}
