import { useCallback, useEffect, useRef, useState } from 'react';

const SILENCE_THRESHOLD = 0.015;
const SILENCE_DURATION_MS = 1500;
const MAX_RECORD_MS = 6000;

interface UseAudioRecorderReturn {
  isRecording: boolean;
  audioBlob: Blob | null;
  error: string | null;
  isSupported: boolean;
  /** Current RMS level (0-1) for visualization */
  level: number;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

/**
 * Records audio via MediaRecorder with automatic silence detection.
 * Auto-stops after SILENCE_DURATION_MS of silence or MAX_RECORD_MS total.
 */
export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isSupported = typeof MediaRecorder !== 'undefined'
    && typeof navigator.mediaDevices?.getUserMedia === 'function';

  const cleanup = useCallback(() => {
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    analyserRef.current = null;
    setLevel(0);
  }, []);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    cleanup();
    setIsRecording(false);
  }, [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    chunksRef.current = [];

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Microphone access denied');
      return;
    }
    mediaStreamRef.current = stream;

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
          stop();
        }
      } else {
        silentSince = null;
      }
    }, 80);

    // Safety cap
    maxTimerRef.current = setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') stop();
    }, MAX_RECORD_MS);
  }, [stop]);

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
      cleanup();
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, [cleanup]);

  return { isRecording, audioBlob, error, isSupported, level, start, stop, reset };
}
