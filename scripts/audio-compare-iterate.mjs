#!/usr/bin/env node
/**
 * Iterative MFCC+DTW tuning harness.
 * Tests variations of the algorithm against ground truth:
 * - Same recording with pitch/speed/octave shifts should score LOW
 * - Different words should score HIGH
 * Goal: same-word variations < 20, different words > 60
 */
import { execSync } from 'child_process';

// ============================================================
// Audio loading
// ============================================================
function decodeMP3ToFloat32(filePath) {
  const raw = execSync(
    `ffmpeg -i "${filePath}" -f f32le -acodec pcm_f32le -ar 16000 -ac 1 - 2>/dev/null`,
    { maxBuffer: 10 * 1024 * 1024 }
  );
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
}

// ============================================================
// Audio transformations (ground truth variations)
// ============================================================
function resample(samples, factor) {
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

function pitchShift(samples, semitones) {
  return resample(samples, Math.pow(2, semitones / 12));
}

function pureNoise(length) {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = (Math.random() * 2 - 1) * 0.3;
  return out;
}

// ============================================================
// DSP primitives
// ============================================================
function hann(n, N) {
  return 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1)));
}

function fft(real, imag) {
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
    const wRe = Math.cos(angle), wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const tRe = curRe * real[i+j+len/2] - curIm * imag[i+j+len/2];
        const tIm = curRe * imag[i+j+len/2] + curIm * real[i+j+len/2];
        real[i+j+len/2] = real[i+j] - tRe;
        imag[i+j+len/2] = imag[i+j] - tIm;
        real[i+j] += tRe;
        imag[i+j] += tIm;
        const newRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newRe;
      }
    }
  }
}

function melToHz(mel) { return 700 * (Math.exp(mel / 1127) - 1); }
function hzToMel(hz) { return 1127 * Math.log(1 + hz / 700); }

function createMelFilterbank(numFilters, fftSize, sampleRate) {
  const numBins = fftSize / 2 + 1;
  const melMin = hzToMel(0);
  const melMax = hzToMel(sampleRate / 2);
  const melPoints = [];
  for (let i = 0; i <= numFilters + 1; i++) {
    melPoints.push(melToHz(melMin + (melMax - melMin) * i / (numFilters + 1)));
  }
  const binPoints = melPoints.map(f => Math.floor((fftSize + 1) * f / sampleRate));
  const filters = [];
  for (let i = 0; i < numFilters; i++) {
    const filter = new Float64Array(numBins);
    for (let j = binPoints[i]; j < binPoints[i+1]; j++)
      filter[j] = (j - binPoints[i]) / (binPoints[i+1] - binPoints[i]);
    for (let j = binPoints[i+1]; j < binPoints[i+2]; j++)
      filter[j] = (binPoints[i+2] - j) / (binPoints[i+2] - binPoints[i+1]);
    filters.push(filter);
  }
  return filters;
}

function dct(input, numCoeffs) {
  const N = input.length;
  const output = new Float64Array(numCoeffs);
  for (let k = 0; k < numCoeffs; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++)
      sum += input[n] * Math.cos(Math.PI * k * (n + 0.5) / N);
    output[k] = sum;
  }
  return output;
}

// ============================================================
// MFCC extraction with configurable options
// ============================================================
function extractMFCC(samples, sampleRate, opts = {}) {
  const {
    numCoeffs = 13,
    numFilters = 26,
    fftSize = 512,
    hopSize = 256,
    dropC0 = false,
    dropC1 = false,
    applyCMVN = false,
    applyMeanNorm = false,  // subtract mean only (no variance norm)
    addDeltas = false,      // append delta (velocity) features
    coeffWeights = null,    // per-coefficient weights
  } = opts;

  const filters = createMelFilterbank(numFilters, fftSize, sampleRate);
  const numBins = fftSize / 2 + 1;
  const rawFrames = [];

  for (let i = 0; i + fftSize <= samples.length; i += hopSize) {
    let energy = 0;
    for (let j = 0; j < fftSize; j++) energy += samples[i+j] * samples[i+j];
    energy = Math.sqrt(energy / fftSize);
    if (energy < 0.005) continue;

    const real = new Float64Array(fftSize);
    const imag = new Float64Array(fftSize);
    for (let j = 0; j < fftSize; j++) real[j] = samples[i+j] * hann(j, fftSize);
    fft(real, imag);

    const power = new Float64Array(numBins);
    for (let j = 0; j < numBins; j++) power[j] = real[j]*real[j] + imag[j]*imag[j];

    const melEnergies = new Float64Array(numFilters);
    for (let f = 0; f < numFilters; f++) {
      let sum = 0;
      for (let j = 0; j < numBins; j++) sum += power[j] * filters[f][j];
      melEnergies[f] = Math.log(sum + 1e-10);
    }

    const mfcc = dct(melEnergies, numCoeffs);
    let startIdx = 0;
    if (dropC0) startIdx = 1;
    if (dropC1) startIdx = Math.max(startIdx, 2);
    rawFrames.push(Array.from(mfcc).slice(startIdx));
  }

  if (rawFrames.length === 0) return rawFrames;

  // Mean normalization (subtract mean, keep variance)
  if (applyMeanNorm) {
    const dim = rawFrames[0].length;
    const mean = new Float64Array(dim);
    for (const frame of rawFrames)
      for (let d = 0; d < dim; d++) mean[d] += frame[d];
    for (let d = 0; d < dim; d++) mean[d] /= rawFrames.length;
    for (const frame of rawFrames)
      for (let d = 0; d < dim; d++) frame[d] -= mean[d];
  }

  // Full CMVN
  if (applyCMVN) {
    const dim = rawFrames[0].length;
    const mean = new Float64Array(dim);
    const variance = new Float64Array(dim);
    for (const frame of rawFrames)
      for (let d = 0; d < dim; d++) mean[d] += frame[d];
    for (let d = 0; d < dim; d++) mean[d] /= rawFrames.length;
    for (const frame of rawFrames) {
      for (let d = 0; d < dim; d++) {
        const diff = frame[d] - mean[d];
        variance[d] += diff * diff;
      }
    }
    for (let d = 0; d < dim; d++)
      variance[d] = Math.sqrt(variance[d] / rawFrames.length) || 1;
    for (const frame of rawFrames)
      for (let d = 0; d < dim; d++) frame[d] = (frame[d] - mean[d]) / variance[d];
  }

  // Apply coefficient weights
  if (coeffWeights) {
    for (const frame of rawFrames) {
      for (let d = 0; d < frame.length && d < coeffWeights.length; d++) {
        frame[d] *= coeffWeights[d];
      }
    }
  }

  // Add delta features (first derivative)
  if (addDeltas) {
    const withDeltas = [];
    for (let i = 0; i < rawFrames.length; i++) {
      const prev = rawFrames[Math.max(0, i - 1)];
      const next = rawFrames[Math.min(rawFrames.length - 1, i + 1)];
      const delta = prev.map((v, d) => (next[d] - v) / 2);
      withDeltas.push([...rawFrames[i], ...delta]);
    }
    return withDeltas;
  }

  return rawFrames;
}

// ============================================================
// DTW
// ============================================================
function euclideanDist(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; sum += d * d; }
  return Math.sqrt(sum);
}

function dtwDistance(s, t) {
  const n = s.length, m = t.length;
  let prev = new Float64Array(m + 1).fill(Infinity);
  let curr = new Float64Array(m + 1).fill(Infinity);
  prev[0] = 0;
  for (let i = 1; i <= n; i++) {
    curr[0] = Infinity;
    for (let j = 1; j <= m; j++) {
      const cost = euclideanDist(s[i-1], t[j-1]);
      curr[j] = cost + Math.min(prev[j], curr[j-1], prev[j-1]);
    }
    [prev, curr] = [curr, prev];
    curr.fill(Infinity);
  }
  return prev[m];
}

function normDist(mfccA, mfccB) {
  if (!mfccA.length || !mfccB.length) return Infinity;
  const raw = dtwDistance(mfccA, mfccB);
  return raw / Math.max(mfccA.length, mfccB.length);
}

// ============================================================
// Test suite
// ============================================================
const AUDIO_DIR = './public/data/audio/words';
const DECK = 'chinese_chpt10_1';

// Load reference cards
const cardFiles = [
  { idx: 0, word: '寒假' },
  { idx: 1, word: '飞机' },
  { idx: 2, word: '票' },
  { idx: 3, word: '飞机场' },
  { idx: 4, word: '坐' },
  { idx: 5, word: '出租汽车' },
  { idx: 6, word: '或者' },
  { idx: 7, word: '先' },
];

const rawSamples = {};
for (const c of cardFiles) {
  try {
    rawSamples[c.idx] = decodeMP3ToFloat32(`${AUDIO_DIR}/${DECK}_card${c.idx}_side_b.mp3`);
  } catch { /* skip missing */ }
}

// Realistic speaker variations (male/female range is ~3-7 semitones, speed ±20%)
function buildVariations(samples) {
  return [
    { label: '10% faster', fn: () => resample(samples, 1.1) },
    { label: '20% faster', fn: () => resample(samples, 1.2) },
    { label: '30% faster', fn: () => resample(samples, 1.3) },
    { label: '10% slower', fn: () => resample(samples, 0.9) },
    { label: '20% slower', fn: () => resample(samples, 0.8) },
    { label: '30% slower', fn: () => resample(samples, 0.7) },
    { label: '+2 semitones', fn: () => pitchShift(samples, 2) },
    { label: '+4 semitones', fn: () => pitchShift(samples, 4) },
    { label: '+6 semitones', fn: () => pitchShift(samples, 6) },
    { label: '+8 semitones', fn: () => pitchShift(samples, 8) },
    { label: '-2 semitones', fn: () => pitchShift(samples, -2) },
    { label: '-4 semitones', fn: () => pitchShift(samples, -4) },
    { label: '-6 semitones', fn: () => pitchShift(samples, -6) },
    { label: '-8 semitones', fn: () => pitchShift(samples, -8) },
    { label: '+4st & 15% faster', fn: () => resample(pitchShift(samples, 4), 1.15) },
    { label: '-4st & 15% slower', fn: () => resample(pitchShift(samples, -4), 0.85) },
    { label: '+6st & 20% faster', fn: () => resample(pitchShift(samples, 6), 1.2) },
    { label: '-6st & 20% slower', fn: () => resample(pitchShift(samples, -6), 0.8) },
  ];
}

// Different-word pairs to test (should all score HIGH)
const diffPairs = [
  [0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [1, 4], [2, 4], [3, 4],
  [0, 5], [1, 6], [2, 7], [5, 7],
];

// ============================================================
// Run a configuration and score it
// ============================================================
function runConfig(label, opts, preprocess, multiPitch) {
  const pitchOffsets = Array.isArray(multiPitch) ? multiPitch :
                       multiPitch === true ? [-4, -2, 0, 2, 4] : null;

  // Extract MFCC for all cards
  const cardMFCC = {};
  for (const [idx, samples] of Object.entries(rawSamples)) {
    cardMFCC[idx] = extractMFCC(samples, 16000, opts);
  }

  // Test same-word variations across multiple cards
  const sameWordScores = [];
  for (const testCard of [0, 1, 2, 4]) {
    if (!rawSamples[testCard]) continue;
    const refMFCC = cardMFCC[testCard];
    const variations = buildVariations(rawSamples[testCard]);
    for (const v of variations) {
      const varSamples = v.fn();
      let nd;
      if (pitchOffsets) {
        nd = multiPitchNormDist(varSamples, refMFCC, opts, pitchOffsets);
      } else {
        const varMFCC = extractMFCC(varSamples, 16000, opts);
        if (varMFCC.length === 0) continue;
        nd = normDist(refMFCC, varMFCC);
      }
      sameWordScores.push({ card: testCard, variation: v.label, norm: nd });
    }
  }

  // Test different words - multi-pitch also tries to find best match (adversarial)
  const diffWordScores = [];
  for (const [a, b] of diffPairs) {
    if (!cardMFCC[a] || !cardMFCC[b]) continue;
    let nd;
    if (pitchOffsets) {
      nd = multiPitchNormDist(rawSamples[b], cardMFCC[a], opts, pitchOffsets);
    } else {
      nd = normDist(cardMFCC[a], cardMFCC[b]);
    }
    diffWordScores.push({ a, b, norm: nd });
  }

  // Noise test
  const noiseMFCC = extractMFCC(pureNoise(16000), 16000, opts);
  const noiseScore = noiseMFCC.length > 0 ? normDist(cardMFCC[0], noiseMFCC) : Infinity;

  // Compute stats
  const sameMax = Math.max(...sameWordScores.map(s => s.norm));
  const sameMean = sameWordScores.reduce((a, s) => a + s.norm, 0) / sameWordScores.length;
  const sameP95 = sameWordScores.map(s => s.norm).sort((a,b) => a-b)[Math.floor(sameWordScores.length * 0.95)];
  const diffMin = Math.min(...diffWordScores.map(s => s.norm));
  const diffMean = diffWordScores.reduce((a, s) => a + s.norm, 0) / diffWordScores.length;
  const gap = diffMin - sameMax;
  const gapP95 = diffMin - sameP95;

  return {
    label,
    sameMax: sameMax.toFixed(1),
    sameMean: sameMean.toFixed(1),
    sameP95: sameP95.toFixed(1),
    diffMin: diffMin.toFixed(1),
    diffMean: diffMean.toFixed(1),
    gap: gap.toFixed(1),
    gapP95: gapP95.toFixed(1),
    noise: noiseScore === Infinity ? 'rejected' : noiseScore.toFixed(1),
    sameWordScores,
    diffWordScores,
  };
}

// ============================================================
// Test matrix - try different configurations
// ============================================================
// ============================================================
// Pitch normalization via autocorrelation F0 estimation
// ============================================================
function estimateF0(samples, sampleRate) {
  // Autocorrelation on a segment to find fundamental frequency
  const minF0 = 60, maxF0 = 400; // Hz range for human speech
  const minLag = Math.floor(sampleRate / maxF0);
  const maxLag = Math.floor(sampleRate / minF0);
  const segLen = Math.min(4096, samples.length);
  const seg = samples.slice(0, segLen);

  let bestLag = minLag, bestCorr = -Infinity;
  for (let lag = minLag; lag <= maxLag && lag < segLen; lag++) {
    let corr = 0;
    for (let i = 0; i < segLen - lag; i++) corr += seg[i] * seg[i + lag];
    if (corr > bestCorr) { bestCorr = corr; bestLag = lag; }
  }
  return sampleRate / bestLag;
}

function pitchNormalize(samples, sampleRate, targetF0 = 200) {
  const f0 = estimateF0(samples, sampleRate);
  if (f0 < 70 || f0 > 350) return samples; // out of range, skip
  const ratio = targetF0 / f0;
  if (Math.abs(ratio - 1) < 0.05) return samples; // close enough
  return resample(samples, ratio);
}

// ============================================================
// Multi-pitch DTW: compare user audio at several pitch offsets, take minimum
// ============================================================
function multiPitchNormDist(userSamples, refMFCC, opts, pitchOffsets = [-4, -2, 0, 2, 4]) {
  let best = Infinity;
  for (const st of pitchOffsets) {
    const shifted = st === 0 ? userSamples : pitchShift(userSamples, st);
    const userMFCC = extractMFCC(shifted, 16000, opts);
    if (userMFCC.length === 0) continue;
    const d = normDist(refMFCC, userMFCC);
    if (d < best) best = d;
  }
  return best;
}

const configs = [
  { label: 'BASELINE (current)',              opts: {}, preprocess: null, multiPitch: false },
  { label: 'MULTI wide c2-12+mN [-6..6]',    opts: { dropC0: true, dropC1: true, applyMeanNorm: true }, preprocess: null, multiPitch: [-6,-4,-2,0,2,4,6] },
  { label: 'MULTI wider c2-12+mN [-8..8]',   opts: { dropC0: true, dropC1: true, applyMeanNorm: true }, preprocess: null, multiPitch: [-8,-6,-4,-2,0,2,4,6,8] },
  { label: 'MULTI dense c2-12+mN [-6..6/1]', opts: { dropC0: true, dropC1: true, applyMeanNorm: true }, preprocess: null, multiPitch: [-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6] },
  { label: 'MULTI wide c2-12 (no mN)',        opts: { dropC0: true, dropC1: true }, preprocess: null, multiPitch: [-6,-4,-2,0,2,4,6] },
  { label: 'MULTI wide dropC0+mN [-6..6]',   opts: { dropC0: true, applyMeanNorm: true }, preprocess: null, multiPitch: [-6,-4,-2,0,2,4,6] },
  { label: 'MULTI wide c2-12+mN+delta',      opts: { dropC0: true, dropC1: true, applyMeanNorm: true, addDeltas: true }, preprocess: null, multiPitch: [-6,-4,-2,0,2,4,6] },
];

console.log('Testing configurations...\n');
console.log(`${'CONFIG'.padEnd(35)} | same_max | same_p95 | diff_min | GAP(max) | GAP(p95) | noise`);
console.log('-'.repeat(105));

let bestConfig = null;
let bestGap = -Infinity;

for (const { label, opts, preprocess, multiPitch } of configs) {
  const r = runConfig(label, opts, preprocess, multiPitch);
  const gapNum = parseFloat(r.gap);

  console.log(
    `${r.label.padEnd(35)} | ${r.sameMax.padStart(8)} | ${r.sameP95.padStart(8)} | ${r.diffMin.padStart(8)} | ${r.gap.padStart(8)} | ${r.gapP95.padStart(8)} | ${r.noise}`
  );

  if (gapNum > bestGap) {
    bestGap = gapNum;
    bestConfig = r;
  }
}

console.log('\n' + '='.repeat(70));
console.log(`BEST CONFIG: ${bestConfig.label} (gap = ${bestConfig.gap})`);
console.log('='.repeat(70));

// Show worst same-word cases for best config
console.log('\nWorst same-word scores (should be LOW):');
const worstSame = bestConfig.sameWordScores.sort((a,b) => b.norm - a.norm).slice(0, 10);
for (const s of worstSame) {
  console.log(`  card${s.card} ${s.variation.padEnd(22)} norm=${s.norm.toFixed(2)}`);
}

console.log('\nBest (lowest) different-word scores (should be HIGH):');
const bestDiff = bestConfig.diffWordScores.sort((a,b) => a.norm - b.norm).slice(0, 5);
for (const s of bestDiff) {
  const wA = cardFiles.find(c => c.idx === s.a)?.word;
  const wB = cardFiles.find(c => c.idx === s.b)?.word;
  console.log(`  ${wA} vs ${wB}  norm=${s.norm.toFixed(2)}`);
}

console.log('\nRECOMMENDED THRESHOLD: ' + ((parseFloat(bestConfig.sameMax) + parseFloat(bestConfig.diffMin)) / 2).toFixed(0));
