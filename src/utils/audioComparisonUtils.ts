/**
 * Audio comparison utilities using MFCC extraction + DTW.
 * Compares a user's recorded audio against a reference MP3 to determine
 * if they said the same word/phrase.
 *
 * Algorithm:
 *   1. Extract MFCCs c2-c12 (drop c0 energy + c1 pitch-sensitive)
 *   2. Apply mean normalization per utterance
 *   3. Multi-pitch comparison: try [-8..+8] semitone offsets, take minimum DTW
 *   4. Threshold: normalized distance < 20 = match
 *
 * Calibrated via synthetic pitch/speed variations across 8 cards:
 *   Same-word variations max: 16.7 (with multi-pitch)
 *   Different-word min: 22.3
 *   Gap: +5.6
 */

const FFT_SIZE = 512;
const HOP_SIZE = 256;
const NUM_MFCC = 13;
const NUM_MEL_FILTERS = 26;
const TARGET_SAMPLE_RATE = 16000;
const ENERGY_FLOOR = 0.005;

/** Pitch offsets (in semitones) to try when comparing */
const PITCH_OFFSETS = [-8, -6, -4, -2, 0, 2, 4, 6, 8];

/** Normalized DTW distance below this = pass */
export const MATCH_THRESHOLD = 20;

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

function hann(n: number, N: number): number {
  return 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1)));
}

// ============================================================
// MFCC Extraction
// ============================================================

export type MFCCFrames = number[][];

/**
 * Extract MFCC frames from mono 16kHz audio samples.
 * Uses coefficients c2-c12 (drops c0 energy and c1 pitch-sensitive).
 * Applies mean normalization per utterance.
 */
export function extractMFCC(samples: Float32Array): MFCCFrames {
  const frames: MFCCFrames = [];
  const numBins = FFT_SIZE / 2 + 1;

  for (let i = 0; i + FFT_SIZE <= samples.length; i += HOP_SIZE) {
    let energy = 0;
    for (let j = 0; j < FFT_SIZE; j++) energy += samples[i + j] * samples[i + j];
    energy = Math.sqrt(energy / FFT_SIZE);
    if (energy < ENERGY_FLOOR) continue;

    const real = new Float64Array(FFT_SIZE);
    const imag = new Float64Array(FFT_SIZE);
    for (let j = 0; j < FFT_SIZE; j++) real[j] = samples[i + j] * hann(j, FFT_SIZE);
    fft(real, imag);

    const power = new Float64Array(numBins);
    for (let j = 0; j < numBins; j++) power[j] = real[j] * real[j] + imag[j] * imag[j];

    const melEnergies = new Float64Array(NUM_MEL_FILTERS);
    for (let f = 0; f < NUM_MEL_FILTERS; f++) {
      let sum = 0;
      for (let j = 0; j < numBins; j++) sum += power[j] * melFilters[f][j];
      melEnergies[f] = Math.log(sum + 1e-10);
    }

    // DCT -> full MFCCs, then take c2-c12 (skip c0 and c1)
    const allCoeffs = dct(melEnergies, NUM_MFCC);
    frames.push(allCoeffs.slice(2));
  }

  if (frames.length === 0) return frames;

  // Mean normalization: subtract per-coefficient mean across all frames
  const dim = frames[0].length;
  const mean = new Float64Array(dim);
  for (const frame of frames) {
    for (let d = 0; d < dim; d++) mean[d] += frame[d];
  }
  for (let d = 0; d < dim; d++) mean[d] /= frames.length;
  for (const frame of frames) {
    for (let d = 0; d < dim; d++) frame[d] -= mean[d];
  }

  return frames;
}

// ============================================================
// Pitch shifting (linear interpolation resample)
// ============================================================

function pitchShiftSamples(samples: Float32Array, semitones: number): Float32Array {
  const factor = Math.pow(2, semitones / 12);
  const newLen = Math.floor(samples.length / factor);
  const out = new Float32Array(newLen);
  for (let i = 0; i < newLen; i++) {
    const srcIdx = i * factor;
    const lo = Math.floor(srcIdx);
    const hi = Math.min(lo + 1, samples.length - 1);
    const frac = srcIdx - lo;
    out[i] = samples[lo] * (1 - frac) + samples[hi] * frac;
  }
  return out;
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
 * Compare user audio against reference MFCC using multi-pitch DTW.
 * Tries several pitch offsets on the user audio and returns the best match.
 * Returns null if either input has 0 frames (silence).
 */
export function compareMFCC(refMFCC: MFCCFrames, userSamples: Float32Array): ComparisonResult | null {
  if (refMFCC.length === 0) return null;

  let bestDist = Infinity;
  let bestRaw = Infinity;
  let bestFrames = 0;

  for (const offset of PITCH_OFFSETS) {
    const shifted = offset === 0 ? userSamples : pitchShiftSamples(userSamples, offset);
    const userMFCC = extractMFCC(shifted);
    if (userMFCC.length === 0) continue;

    const raw = dtwDistance(refMFCC, userMFCC);
    const norm = raw / Math.max(refMFCC.length, userMFCC.length);

    if (norm < bestDist) {
      bestDist = norm;
      bestRaw = raw;
      bestFrames = userMFCC.length;
    }
  }

  if (bestDist === Infinity) return null;

  return {
    rawDistance: bestRaw,
    normalizedDistance: bestDist,
    isMatch: bestDist < MATCH_THRESHOLD,
    refFrames: refMFCC.length,
    userFrames: bestFrames,
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
