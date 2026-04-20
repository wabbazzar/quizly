import { useCallback, useRef, useState } from 'react';
import {
  type ComparisonResult,
  type MFCCFrames,
  compareMFCC,
  extractMFCC,
  resampleTo16kMono,
} from '../utils/audioComparisonUtils';

interface UseAudioComparisonReturn {
  /** Compare a recorded blob against a reference audio URL */
  compare: (userBlob: Blob, referenceUrl: string) => Promise<ComparisonResult | null>;
  /** Whether comparison is in progress */
  isComparing: boolean;
  /** Last comparison result */
  result: ComparisonResult | null;
  /** Preload and cache reference MFCC for a given URL */
  preloadReference: (url: string) => Promise<void>;
  /** Clear cached references */
  clearCache: () => void;
}

/**
 * Hook that compares a user's recorded audio blob against a reference MP3 URL
 * using MFCC extraction + multi-pitch DTW. Caches decoded reference MFCCs.
 */
export function useAudioComparison(): UseAudioComparisonReturn {
  const [isComparing, setIsComparing] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const cacheRef = useRef<Map<string, MFCCFrames>>(new Map());
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const getReferenceMFCC = useCallback(async (url: string): Promise<MFCCFrames> => {
    const cached = cacheRef.current.get(url);
    if (cached) return cached;

    const ctx = getAudioContext();
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to load reference: ${resp.status}`);
    const arrayBuf = await resp.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuf);
    const samples = await resampleTo16kMono(audioBuffer);
    const mfcc = extractMFCC(samples);
    cacheRef.current.set(url, mfcc);
    return mfcc;
  }, [getAudioContext]);

  const preloadReference = useCallback(async (url: string) => {
    await getReferenceMFCC(url);
  }, [getReferenceMFCC]);

  const compare = useCallback(async (userBlob: Blob, referenceUrl: string): Promise<ComparisonResult | null> => {
    setIsComparing(true);
    setResult(null);
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();

      // Decode user audio to raw 16kHz mono samples
      const userArrayBuf = await userBlob.arrayBuffer();
      const userAudioBuffer = await ctx.decodeAudioData(userArrayBuf);
      const userSamples = await resampleTo16kMono(userAudioBuffer);

      // Get reference MFCC (cached)
      const refMFCC = await getReferenceMFCC(referenceUrl);

      // Multi-pitch comparison: compareMFCC tries several pitch offsets internally
      const compResult = compareMFCC(refMFCC, userSamples);
      setResult(compResult);
      return compResult;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Comparison failed';
      throw new Error(msg);
    } finally {
      setIsComparing(false);
    }
  }, [getAudioContext, getReferenceMFCC]);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return { compare, isComparing, result, preloadReference, clearCache };
}
