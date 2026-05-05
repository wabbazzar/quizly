#!/usr/bin/env node
/**
 * Comprehensive matching benchmark.
 *
 * The original tuning script (`audio-compare-iterate.mjs`) only checked a
 * handful of hand-picked cross-pairs from one chapter, so a "good gap" there
 * did not prevent unrelated words from passing the threshold in real use.
 *
 * This harness:
 *   - Loads EVERY Chinese reference audio across all decks (~540 files).
 *   - Builds a real adversarial pool by randomly sampling thousands of
 *     different-word, same-speaker pairs.
 *   - Builds a positive pool from synthetic pitch/speed/octave shifts on a
 *     stratified card sample (cheap proxy for cross-speaker).
 *   - Reports full distribution stats (min/p5/p25/med/p75/p95/max) on both
 *     pools, computes the ROC curve, picks Equal-Error-Rate (EER) threshold,
 *     and reports separation power as TPR@1%FPR / TPR@5%FPR.
 *   - Then sweeps a small grid of algorithm variants — including the things
 *     not in the in-app version: Sakoe-Chiba band constraints (block DTW
 *     from warping unrelated audio into alignment), length-ratio penalty
 *     (reject big duration mismatches), and richer features.
 *
 * Run:  node scripts/audio-compare-bench.mjs [--samples N] [--decks REGEX]
 */

import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

// ============================================================
// CLI
// ============================================================
const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : def;
};
const NEG_SAMPLES = parseInt(arg('--samples', '1500'), 10);
const DECK_REGEX = new RegExp(arg('--decks', '.'));
const SEED = parseInt(arg('--seed', '42'), 10);
const POS_CARDS = parseInt(arg('--pos-cards', '24'), 10);
const SHOW_BEST = parseInt(arg('--show', '12'), 10);
const ONLY_VARIANT = arg('--variant', null);

// Deterministic RNG (mulberry32)
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(SEED);

// ============================================================
// Audio
// ============================================================
function decodeMP3(filePath) {
  const raw = execSync(
    `ffmpeg -i "${filePath}" -f f32le -acodec pcm_f32le -ar 16000 -ac 1 - 2>/dev/null`,
    { maxBuffer: 20 * 1024 * 1024 }
  );
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
}

function resample(samples, factor) {
  const newLen = Math.floor(samples.length / factor);
  const out = new Float32Array(newLen);
  for (let i = 0; i < newLen; i++) {
    const src = i * factor;
    const lo = Math.floor(src);
    const hi = Math.min(lo + 1, samples.length - 1);
    const frac = src - lo;
    out[i] = samples[lo] * (1 - frac) + samples[hi] * frac;
  }
  return out;
}
const pitchShift = (s, st) => resample(s, Math.pow(2, st / 12));

function pureNoise(length) {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = (rand() * 2 - 1) * 0.3;
  return out;
}

// Soft "wrong word" simulation: take samples of word A, splice with B's
// envelope and add a bit of A back — represents user speaking nonsense
// that has roughly correct prosody but wrong content.
function spliceMix(a, b, mix = 0.6) {
  const len = Math.min(a.length, b.length);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) out[i] = a[i] * (1 - mix) + b[i] * mix;
  return out;
}

// ============================================================
// DSP primitives
// ============================================================
const hann = (n, N) => 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1)));

function fft(real, imag) {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [real[i], real[j]] = [real[j], real[i]]; [imag[i], imag[j]] = [imag[j], imag[i]]; }
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

const melToHz = m => 700 * (Math.exp(m / 1127) - 1);
const hzToMel = h => 1127 * Math.log(1 + h / 700);

function buildMel(numFilters, fftSize, sampleRate) {
  const numBins = fftSize / 2 + 1;
  const points = [];
  const mMin = hzToMel(0), mMax = hzToMel(sampleRate / 2);
  for (let i = 0; i <= numFilters + 1; i++) points.push(melToHz(mMin + (mMax - mMin) * i / (numFilters + 1)));
  const bins = points.map(f => Math.floor((fftSize + 1) * f / sampleRate));
  const filters = [];
  for (let i = 0; i < numFilters; i++) {
    const f = new Float64Array(numBins);
    for (let j = bins[i]; j < bins[i+1]; j++) f[j] = (j - bins[i]) / (bins[i+1] - bins[i]);
    for (let j = bins[i+1]; j < bins[i+2]; j++) f[j] = (bins[i+2] - j) / (bins[i+2] - bins[i+1]);
    filters.push(f);
  }
  return filters;
}

function dct(input, k) {
  const N = input.length;
  const out = new Float64Array(k);
  for (let i = 0; i < k; i++) {
    let s = 0;
    for (let n = 0; n < N; n++) s += input[n] * Math.cos(Math.PI * i * (n + 0.5) / N);
    out[i] = s;
  }
  return out;
}

// ============================================================
// MFCC extraction with full set of options
// ============================================================
function extractMFCC(samples, opts = {}) {
  const {
    numCoeffs = 13,
    numFilters = 26,
    fftSize = 512,
    hopSize = 256,
    dropC0 = false,
    dropC1 = false,
    applyMeanNorm = false,
    applyCMVN = false,
    addDeltas = false,
    energyFloor = 0.005,
  } = opts;

  const filters = buildMel(numFilters, fftSize, 16000);
  const numBins = fftSize / 2 + 1;
  const frames = [];

  for (let i = 0; i + fftSize <= samples.length; i += hopSize) {
    let energy = 0;
    for (let j = 0; j < fftSize; j++) energy += samples[i+j] * samples[i+j];
    energy = Math.sqrt(energy / fftSize);
    if (energy < energyFloor) continue;

    const real = new Float64Array(fftSize);
    const imag = new Float64Array(fftSize);
    for (let j = 0; j < fftSize; j++) real[j] = samples[i+j] * hann(j, fftSize);
    fft(real, imag);

    const power = new Float64Array(numBins);
    for (let j = 0; j < numBins; j++) power[j] = real[j]*real[j] + imag[j]*imag[j];

    const mel = new Float64Array(numFilters);
    for (let f = 0; f < numFilters; f++) {
      let s = 0;
      for (let j = 0; j < numBins; j++) s += power[j] * filters[f][j];
      mel[f] = Math.log(s + 1e-10);
    }

    const c = dct(mel, numCoeffs);
    let start = 0;
    if (dropC0) start = 1;
    if (dropC1) start = Math.max(start, 2);
    frames.push(Array.from(c).slice(start));
  }

  if (frames.length === 0) return frames;

  if (applyMeanNorm) {
    const dim = frames[0].length;
    const mean = new Float64Array(dim);
    for (const f of frames) for (let d = 0; d < dim; d++) mean[d] += f[d];
    for (let d = 0; d < dim; d++) mean[d] /= frames.length;
    for (const f of frames) for (let d = 0; d < dim; d++) f[d] -= mean[d];
  }

  if (applyCMVN) {
    const dim = frames[0].length;
    const mean = new Float64Array(dim);
    const variance = new Float64Array(dim);
    for (const f of frames) for (let d = 0; d < dim; d++) mean[d] += f[d];
    for (let d = 0; d < dim; d++) mean[d] /= frames.length;
    for (const f of frames) for (let d = 0; d < dim; d++) variance[d] += (f[d] - mean[d]) ** 2;
    for (let d = 0; d < dim; d++) variance[d] = Math.sqrt(variance[d] / frames.length) || 1;
    for (const f of frames) for (let d = 0; d < dim; d++) f[d] = (f[d] - mean[d]) / variance[d];
  }

  if (addDeltas) {
    const out = [];
    for (let i = 0; i < frames.length; i++) {
      const prev = frames[Math.max(0, i - 1)];
      const next = frames[Math.min(frames.length - 1, i + 1)];
      const delta = prev.map((v, d) => (next[d] - v) / 2);
      out.push([...frames[i], ...delta]);
    }
    return out;
  }
  return frames;
}

// ============================================================
// DTW with optional Sakoe-Chiba band constraint
// ============================================================
function eucl(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s);
}

/**
 * @param bandRatio  null = full DTW; otherwise window = max(8, ratio * max(n,m))
 *                   Limits how far off the diagonal the warp can stray.
 *                   Tighter band = unrelated audio can't align freely.
 */
function dtw(s, t, bandRatio = null) {
  const n = s.length, m = t.length;
  if (n === 0 || m === 0) return Infinity;
  const band = bandRatio == null ? Infinity : Math.max(8, Math.floor(bandRatio * Math.max(n, m)));

  let prev = new Float64Array(m + 1).fill(Infinity);
  let curr = new Float64Array(m + 1).fill(Infinity);
  prev[0] = 0;

  for (let i = 1; i <= n; i++) {
    curr[0] = Infinity;
    // band: enforce |i - j*(n/m)| <= band
    const ji = (i * m) / n;
    const jLo = Math.max(1, Math.floor(ji - band));
    const jHi = Math.min(m, Math.ceil(ji + band));
    for (let j = jLo; j <= jHi; j++) {
      const cost = eucl(s[i-1], t[j-1]);
      curr[j] = cost + Math.min(prev[j], curr[j-1], prev[j-1]);
    }
    [prev, curr] = [curr, prev];
    curr.fill(Infinity);
  }
  return prev[m];
}

// ============================================================
// Distance with options (multi-pitch + length penalty + DTW band)
// ============================================================
function compare(refSamples, userSamples, opts) {
  const { pitchOffsets, mfccOpts, bandRatio = null, lengthPenalty = 0 } = opts;
  const refMFCC = extractMFCC(refSamples, mfccOpts);
  if (refMFCC.length === 0) return Infinity;

  let best = Infinity;
  for (const st of pitchOffsets) {
    const shifted = st === 0 ? userSamples : pitchShift(userSamples, st);
    const userMFCC = extractMFCC(shifted, mfccOpts);
    if (userMFCC.length === 0) continue;

    const raw = dtw(refMFCC, userMFCC, bandRatio);
    let nd = raw / Math.max(refMFCC.length, userMFCC.length);

    if (lengthPenalty > 0) {
      const r = Math.max(refMFCC.length, userMFCC.length) / Math.min(refMFCC.length, userMFCC.length);
      nd += lengthPenalty * Math.max(0, r - 1.0); // penalty grows with length ratio above 1
    }
    if (nd < best) best = nd;
  }
  return best;
}

// ============================================================
// Statistics helpers
// ============================================================
function pct(arr, p) {
  if (arr.length === 0) return NaN;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)));
  return sorted[idx];
}
function stats(arr) {
  if (arr.length === 0) return { n: 0 };
  return {
    n: arr.length,
    min: Math.min(...arr).toFixed(2),
    p05: pct(arr, 0.05).toFixed(2),
    p25: pct(arr, 0.25).toFixed(2),
    med: pct(arr, 0.5).toFixed(2),
    p75: pct(arr, 0.75).toFixed(2),
    p95: pct(arr, 0.95).toFixed(2),
    max: Math.max(...arr).toFixed(2),
    mean: (arr.reduce((a, x) => a + x, 0) / arr.length).toFixed(2),
  };
}

/**
 * ROC analysis. Positives = same-word scores (low). Negatives = different-word.
 * Sweep candidate thresholds; report:
 *   EER         — threshold where FN-rate ≈ FP-rate (industry standard)
 *   J (Youden)  — argmax(TPR - FPR)
 *   T@1%FPR     — strictest threshold that keeps FPR ≤ 1% (high-precision)
 *   T@5%FPR     — same with 5% slack
 */
function rocAnalysis(positives, negatives) {
  if (positives.length === 0 || negatives.length === 0) return null;

  const candidates = [...new Set([...positives, ...negatives].map(v => Math.round(v * 10) / 10))]
    .sort((a, b) => a - b);

  let eerT = null, eerVal = Infinity;
  let yT = null, yVal = -Infinity;
  let t1FPR = null, t5FPR = null;
  let auc = 0;

  // ROC curve: sweep threshold high→low, accumulate (FPR, TPR)
  const points = [];
  for (const t of candidates) {
    const tpr = positives.filter(p => p < t).length / positives.length;
    const fpr = negatives.filter(n => n < t).length / negatives.length;
    points.push({ t, tpr, fpr });

    const fnr = 1 - tpr;
    if (Math.abs(fnr - fpr) < eerVal) { eerVal = Math.abs(fnr - fpr); eerT = t; }
    const j = tpr - fpr;
    if (j > yVal) { yVal = j; yT = t; }
    if (fpr <= 0.01 && (t1FPR === null || t > t1FPR)) t1FPR = t;
    if (fpr <= 0.05 && (t5FPR === null || t > t5FPR)) t5FPR = t;
  }

  // Trapezoidal AUC
  points.sort((a, b) => a.fpr - b.fpr);
  for (let i = 1; i < points.length; i++) {
    auc += (points[i].fpr - points[i-1].fpr) * (points[i].tpr + points[i-1].tpr) / 2;
  }

  // At EER threshold report TPR/FPR
  const eerPoint = points.reduce((p, q) => Math.abs(q.t - eerT) < Math.abs(p.t - eerT) ? q : p);
  const yPoint = points.reduce((p, q) => Math.abs(q.t - yT) < Math.abs(p.t - yT) ? q : p);
  const t1Point = t1FPR == null ? null : points.reduce((p, q) => Math.abs(q.t - t1FPR) < Math.abs(p.t - t1FPR) ? q : p);
  const t5Point = t5FPR == null ? null : points.reduce((p, q) => Math.abs(q.t - t5FPR) < Math.abs(p.t - t5FPR) ? q : p);

  return {
    auc: auc.toFixed(4),
    eer: { t: eerT, tpr: eerPoint?.tpr.toFixed(3), fpr: eerPoint?.fpr.toFixed(3) },
    youden: { t: yT, tpr: yPoint?.tpr.toFixed(3), fpr: yPoint?.fpr.toFixed(3), j: yVal.toFixed(3) },
    t1fpr: t1FPR == null ? null : { t: t1FPR, tpr: t1Point.tpr.toFixed(3) },
    t5fpr: t5FPR == null ? null : { t: t5FPR, tpr: t5Point.tpr.toFixed(3) },
  };
}

// ============================================================
// Load all reference audio
// ============================================================
const AUDIO_DIR = './public/data/audio/words';
console.log('Scanning audio dir...');
const allFiles = readdirSync(AUDIO_DIR).filter(f => f.endsWith('_side_b.mp3'));
const filtered = allFiles.filter(f => DECK_REGEX.test(f));
console.log(`Found ${allFiles.length} side_b files; ${filtered.length} match /${DECK_REGEX.source}/`);

// Load samples for negatives (sample ~NEG_SAMPLES * 2 unique files)
const FILES_NEEDED = Math.min(filtered.length, Math.max(POS_CARDS, Math.ceil(Math.sqrt(NEG_SAMPLES * 8))));
const shuffled = [...filtered].sort(() => rand() - 0.5).slice(0, FILES_NEEDED);
console.log(`Decoding ${shuffled.length} reference files (this is the slow step)...`);

const refs = []; // { id, samples }
let done = 0;
for (const f of shuffled) {
  try {
    const samples = decodeMP3(join(AUDIO_DIR, f));
    if (samples.length < 2000) continue;     // <125ms — bad audio
    if (samples.length > 16000 * 6) continue; // >6s — likely a phrase, not a word
    refs.push({ id: f.replace('_side_b.mp3', ''), samples });
    done++;
    if (done % 50 === 0) process.stdout.write(`  ${done}\r`);
  } catch (e) { /* skip */ }
}
console.log(`  Loaded ${refs.length} usable references`);

// Pick positive set: stratified sample of POS_CARDS cards
const positiveCards = [...refs].sort(() => rand() - 0.5).slice(0, POS_CARDS);

// Build negative pairs (different-word, same-speaker)
const negPairs = [];
for (let i = 0; i < NEG_SAMPLES; i++) {
  let a, b;
  do { a = refs[Math.floor(rand() * refs.length)]; b = refs[Math.floor(rand() * refs.length)]; } while (a === b);
  negPairs.push([a, b]);
}
console.log(`Built ${negPairs.length} adversarial pairs from ${refs.length} cards`);

// Variations applied to positive cards
function buildVariations(samples) {
  return [
    { label: '+0',         fn: () => samples },
    { label: '+10%speed',  fn: () => resample(samples, 1.1) },
    { label: '-10%speed',  fn: () => resample(samples, 0.9) },
    { label: '+20%speed',  fn: () => resample(samples, 1.2) },
    { label: '-20%speed',  fn: () => resample(samples, 0.8) },
    { label: '+2st',       fn: () => pitchShift(samples, 2) },
    { label: '-2st',       fn: () => pitchShift(samples, -2) },
    { label: '+4st',       fn: () => pitchShift(samples, 4) },
    { label: '-4st',       fn: () => pitchShift(samples, -4) },
    { label: '+6st',       fn: () => pitchShift(samples, 6) },
    { label: '-6st',       fn: () => pitchShift(samples, -6) },
    { label: '+4st+15%fast', fn: () => resample(pitchShift(samples, 4), 1.15) },
    { label: '-4st+15%slow', fn: () => resample(pitchShift(samples, -4), 0.85) },
    { label: '+6st+20%fast', fn: () => resample(pitchShift(samples, 6), 1.20) },
    { label: '-6st+20%slow', fn: () => resample(pitchShift(samples, -6), 0.80) },
  ];
}

// ============================================================
// Variants to evaluate
// ============================================================
const PROD = { dropC0: true, dropC1: true, applyMeanNorm: true };
const PROD_OFFSETS = [-8, -6, -4, -2, 0, 2, 4, 6, 8];

const VARIANTS = [
  {
    key: 'PROD',
    label: 'PROD (current in-app: c2-12 + meanNorm + multi-pitch [-8..8])',
    pitchOffsets: PROD_OFFSETS,
    mfccOpts: PROD,
    bandRatio: null,
    lengthPenalty: 0,
  },
  {
    key: 'PROD+band25',
    label: 'PROD + DTW Sakoe-Chiba band 25%',
    pitchOffsets: PROD_OFFSETS,
    mfccOpts: PROD,
    bandRatio: 0.25,
    lengthPenalty: 0,
  },
  {
    key: 'PROD+band15',
    label: 'PROD + DTW band 15%',
    pitchOffsets: PROD_OFFSETS,
    mfccOpts: PROD,
    bandRatio: 0.15,
    lengthPenalty: 0,
  },
  {
    key: 'PROD+band10',
    label: 'PROD + DTW band 10%',
    pitchOffsets: PROD_OFFSETS,
    mfccOpts: PROD,
    bandRatio: 0.10,
    lengthPenalty: 0,
  },
  {
    key: 'PROD+lenpen10',
    label: 'PROD + length-ratio penalty (slope 10)',
    pitchOffsets: PROD_OFFSETS,
    mfccOpts: PROD,
    bandRatio: null,
    lengthPenalty: 10,
  },
  {
    key: 'PROD+lenpen20',
    label: 'PROD + length-ratio penalty (slope 20)',
    pitchOffsets: PROD_OFFSETS,
    mfccOpts: PROD,
    bandRatio: null,
    lengthPenalty: 20,
  },
  {
    key: 'PROD+band15+lenpen20',
    label: 'PROD + band 15% + length penalty 20',
    pitchOffsets: PROD_OFFSETS,
    mfccOpts: PROD,
    bandRatio: 0.15,
    lengthPenalty: 20,
  },
  {
    key: 'PROD+band10+lenpen10',
    label: 'PROD + band 10% + length penalty 10',
    pitchOffsets: PROD_OFFSETS,
    mfccOpts: PROD,
    bandRatio: 0.10,
    lengthPenalty: 10,
  },
  {
    key: 'CMVN+band15',
    label: 'CMVN (z-score) + band 15%',
    pitchOffsets: PROD_OFFSETS,
    mfccOpts: { dropC0: true, dropC1: true, applyCMVN: true },
    bandRatio: 0.15,
    lengthPenalty: 0,
  },
  {
    key: 'mfcc20+band15+lenpen20',
    label: '20-coeff MFCC + 40 mel + band 15% + lenpen 20',
    pitchOffsets: PROD_OFFSETS,
    mfccOpts: { numCoeffs: 20, numFilters: 40, dropC0: true, dropC1: true, applyMeanNorm: true },
    bandRatio: 0.15,
    lengthPenalty: 20,
  },
  {
    key: 'PROD+narrowpitch+band15',
    label: 'PROD with narrow pitch [-4..4] + band 15%',
    pitchOffsets: [-4, -2, 0, 2, 4],
    mfccOpts: PROD,
    bandRatio: 0.15,
    lengthPenalty: 0,
  },
];

const variantsToRun = ONLY_VARIANT
  ? VARIANTS.filter(v => v.key === ONLY_VARIANT)
  : VARIANTS;

// ============================================================
// Run benchmark
// ============================================================
const results = [];
for (const v of variantsToRun) {
  console.log(`\n[${v.key}] ${v.label}`);
  const t0 = Date.now();

  // Positive scores: same-word, varied
  const pos = [];
  const posDetail = [];
  for (const card of positiveCards) {
    for (const vary of buildVariations(card.samples)) {
      const userSamples = vary.fn();
      const nd = compare(card.samples, userSamples, v);
      if (nd === Infinity) continue;
      pos.push(nd);
      posDetail.push({ card: card.id, variation: vary.label, nd });
    }
  }

  // Negative scores: different-word
  const neg = [];
  const negDetail = [];
  for (const [a, b] of negPairs) {
    const nd = compare(a.samples, b.samples, v);
    if (nd === Infinity) continue;
    neg.push(nd);
    negDetail.push({ a: a.id, b: b.id, nd });
  }

  const ms = Date.now() - t0;
  const sP = stats(pos), sN = stats(neg);
  const roc = rocAnalysis(pos, neg);

  console.log(`  positives n=${sP.n}  min=${sP.min}  med=${sP.med}  p95=${sP.p95}  max=${sP.max}`);
  console.log(`  negatives n=${sN.n}  min=${sN.min}  p05=${sN.p05}  med=${sN.med}  max=${sN.max}`);
  if (roc) {
    console.log(`  AUC=${roc.auc}  EER@t=${roc.eer.t} (TPR=${roc.eer.tpr} FPR=${roc.eer.fpr})  J@t=${roc.youden.t} (J=${roc.youden.j})`);
    console.log(`  TPR@1%FPR: t=${roc.t1fpr?.t ?? 'n/a'} TPR=${roc.t1fpr?.tpr ?? 'n/a'}   TPR@5%FPR: t=${roc.t5fpr?.t ?? 'n/a'} TPR=${roc.t5fpr?.tpr ?? 'n/a'}`);
  }
  console.log(`  ${ms}ms`);

  results.push({ v, sP, sN, roc, posDetail, negDetail, ms });
}

// ============================================================
// Final ranking by AUC (or EER) and adversarial drilldown
// ============================================================
console.log('\n' + '='.repeat(98));
console.log('SUMMARY  (sorted by AUC desc)');
console.log('='.repeat(98));
const sorted = results.filter(r => r.roc).sort((a, b) => parseFloat(b.roc.auc) - parseFloat(a.roc.auc));
console.log(`${'KEY'.padEnd(28)} | AUC    | EER   t  | T@1%FPR (TPR) | T@5%FPR (TPR) | pos.p95 | neg.p05`);
console.log('-'.repeat(98));
for (const r of sorted) {
  const t1 = r.roc.t1fpr ? `${r.roc.t1fpr.t} (${r.roc.t1fpr.tpr})` : 'n/a';
  const t5 = r.roc.t5fpr ? `${r.roc.t5fpr.t} (${r.roc.t5fpr.tpr})` : 'n/a';
  console.log(
    `${r.v.key.padEnd(28)} | ${r.roc.auc} | ${String(r.roc.eer.t).padStart(5)}    | ${t1.padEnd(13)} | ${t5.padEnd(13)} | ${r.sP.p95.padStart(7)} | ${r.sN.p05.padStart(7)}`
  );
}

const best = sorted[0];
console.log('\n' + '='.repeat(98));
console.log(`BEST: ${best.v.key}  —  AUC ${best.roc.auc}, EER threshold ${best.roc.eer.t}`);
console.log('='.repeat(98));
console.log(`\nWorst-${SHOW_BEST} hardest positives (real same-word that scored highest):`);
const worstPos = [...best.posDetail].sort((a, b) => b.nd - a.nd).slice(0, SHOW_BEST);
for (const p of worstPos) console.log(`  ${p.nd.toFixed(2).padStart(7)}  ${p.card}  (${p.variation})`);

console.log(`\nMost dangerous negatives (real different-word that scored lowest):`);
const dangerNeg = [...best.negDetail].sort((a, b) => a.nd - b.nd).slice(0, SHOW_BEST);
for (const n of dangerNeg) console.log(`  ${n.nd.toFixed(2).padStart(7)}  ${n.a}  vs  ${n.b}`);

console.log('\nRECOMMEND threshold near EER:', best.roc.eer.t, '— or T@5%FPR for stricter:', best.roc.t5fpr?.t ?? 'n/a');
