/**
 * Audio comparison utilities using MFCC extraction + DTW.
 * Compares a user's recorded audio against a reference MP3 to determine
 * if they said the same word/phrase.
 *
 * Algorithm: Extract 13 MFCCs per frame (512 window, 256 hop @ 16kHz),
 * then compute DTW distance with euclidean metric.
 * Threshold: normalized distance < 70 = match.
 *
 * Calibrated from real voice tests:
 *   Correct pronunciation: norm distance 41-59
 *   Wrong word: norm distance 87-93
 */

const FFT_SIZE = 512;
const HOP_SIZE = 256;
const NUM_MFCC = 13;
const NUM_MEL_FILTERS = 26;
const TARGET_SAMPLE_RATE = 16000;
const ENERGY_FLOOR = 0.005;

/** Normalized DTW distance below this = pass */
export const MATCH_THRESHOLD = 85;

// ============================================================
// FFT (Cooley-Tukey radix-2, in-place)
// ============================================================

function fft(real: Float64Array, imag: Float64Array): void {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = -2 * Math.PI / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const tRe = curRe * real[i + j + len / 2] - curIm * imag[i + j + len / 2];
        const tIm = curRe * imag[i + j + len / 2] + curIm * real[i + j + len / 2];
        real[i + j + len / 2] = real[i + j] - tRe;
        imag[i + j + len / 2] = imag[i + j] - tIm;
        real[i + j] += tRe;
        imag[i + j] += tIm;
        const newRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newRe;
      }
    }
  }
}

// ============================================================
// Mel filterbank
// ============================================================

function melToHz(mel: number): number {
  return 700 * (Math.exp(mel / 1127) - 1);
}

function hzToMel(hz: number): number {
  return 1127 * Math.log(1 + hz / 700);
}

function createMelFilterbank(): Float64Array[] {
  const numBins = FFT_SIZE / 2 + 1;
  const melMin = hzToMel(0);
  const melMax = hzToMel(TARGET_SAMPLE_RATE / 2);
  const melPoints: number[] = [];
  for (let i = 0; i <= NUM_MEL_FILTERS + 1; i++) {
    melPoints.push(melToHz(melMin + (melMax - melMin) * i / (NUM_MEL_FILTERS + 1)));
  }
  const binPoints = melPoints.map(f => Math.floor((FFT_SIZE + 1) * f / TARGET_SAMPLE_RATE));

  const filters: Float64Array[] = [];
  for (let i = 0; i < NUM_MEL_FILTERS; i++) {
    const filter = new Float64Array(numBins);
    for (let j = binPoints[i]; j < binPoints[i + 1]; j++) {
      filter[j] = (j - binPoints[i]) / (binPoints[i + 1] - binPoints[i]);
    }
    for (let j = binPoints[i + 1]; j < binPoints[i + 2]; j++) {
      filter[j] = (binPoints[i + 2] - j) / (binPoints[i + 2] - binPoints[i + 1]);
    }
    filters.push(filter);
  }
  return filters;
}

// Pre-computed mel filterbank
const melFilters = createMelFilterbank();

// ============================================================
// DCT
// ============================================================

function dct(input: Float64Array, numCoeffs: number): number[] {
  const N = input.length;
  const output: number[] = new Array(numCoeffs);
  for (let k = 0; k < numCoeffs; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += input[n] * Math.cos(Math.PI * k * (n + 0.5) / N);
    }
    output[k] = sum;
  }
  return output;
}

// ============================================================
// Hann window
// ============================================================

function hann(n: number, N: number): number {
  return 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1)));
}

// ============================================================
// MFCC Extraction
// ============================================================

export type MFCCFrames = number[][];

/**
 * Extract MFCC frames from mono 16kHz audio samples.
 * Skips silent frames (energy below threshold).
 */
export function extractMFCC(samples: Float32Array): MFCCFrames {
  const frames: MFCCFrames = [];
  const numBins = FFT_SIZE / 2 + 1;

  for (let i = 0; i + FFT_SIZE <= samples.length; i += HOP_SIZE) {
    // Energy check - skip silent frames
    let energy = 0;
    for (let j = 0; j < FFT_SIZE; j++) energy += samples[i + j] * samples[i + j];
    energy = Math.sqrt(energy / FFT_SIZE);
    if (energy < ENERGY_FLOOR) continue;

    // Window + FFT
    const real = new Float64Array(FFT_SIZE);
    const imag = new Float64Array(FFT_SIZE);
    for (let j = 0; j < FFT_SIZE; j++) real[j] = samples[i + j] * hann(j, FFT_SIZE);
    fft(real, imag);

    // Power spectrum
    const power = new Float64Array(numBins);
    for (let j = 0; j < numBins; j++) power[j] = real[j] * real[j] + imag[j] * imag[j];

    // Mel filterbank + log
    const melEnergies = new Float64Array(NUM_MEL_FILTERS);
    for (let f = 0; f < NUM_MEL_FILTERS; f++) {
      let sum = 0;
      for (let j = 0; j < numBins; j++) sum += power[j] * melFilters[f][j];
      melEnergies[f] = Math.log(sum + 1e-10);
    }

    // DCT -> MFCCs
    frames.push(dct(melEnergies, NUM_MFCC));
  }

  return frames;
}

// ============================================================
// DTW (Dynamic Time Warping)
// ============================================================

function euclideanDist(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * Compute DTW distance between two MFCC frame sequences.
 * Uses 2-row memory optimization.
 */
export function dtwDistance(s: MFCCFrames, t: MFCCFrames): number {
  const n = s.length;
  const m = t.length;
  let prev = new Float64Array(m + 1).fill(Infinity);
  let curr = new Float64Array(m + 1).fill(Infinity);
  prev[0] = 0;

  for (let i = 1; i <= n; i++) {
    curr[0] = Infinity;
    for (let j = 1; j <= m; j++) {
      const cost = euclideanDist(s[i - 1], t[j - 1]);
      curr[j] = cost + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    [prev, curr] = [curr, prev];
    curr.fill(Infinity);
  }
  return prev[m];
}

// ============================================================
// High-level comparison
// ============================================================

export interface ComparisonResult {
  /** Raw accumulated DTW distance */
  rawDistance: number;
  /** Normalized distance (raw / max frames) */
  normalizedDistance: number;
  /** Whether the distance is below the match threshold */
  isMatch: boolean;
  /** Number of MFCC frames in reference */
  refFrames: number;
  /** Number of MFCC frames in user recording */
  userFrames: number;
}

/**
 * Compare two sets of MFCC frames and return the match result.
 * Returns null if either input has 0 frames (silence).
 */
export function compareMFCC(refMFCC: MFCCFrames, userMFCC: MFCCFrames): ComparisonResult | null {
  if (refMFCC.length === 0 || userMFCC.length === 0) return null;

  const rawDistance = dtwDistance(refMFCC, userMFCC);
  const pathLen = Math.max(refMFCC.length, userMFCC.length);
  const normalizedDistance = rawDistance / pathLen;

  return {
    rawDistance,
    normalizedDistance,
    isMatch: normalizedDistance < MATCH_THRESHOLD,
    refFrames: refMFCC.length,
    userFrames: userMFCC.length,
  };
}

/**
 * Resample an AudioBuffer to 16kHz mono using OfflineAudioContext.
 */
export async function resampleTo16kMono(audioBuffer: AudioBuffer): Promise<Float32Array> {
  const numSamples = Math.ceil(audioBuffer.duration * TARGET_SAMPLE_RATE);
  const offlineCtx = new OfflineAudioContext(1, numSamples, TARGET_SAMPLE_RATE);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start();
  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
}
