#!/usr/bin/env node
/**
 * Self-test: MFCC + DTW audio comparison
 * Compares card audio files against themselves and each other.
 */
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// We need to decode MP3 to raw PCM. Use ffmpeg.
function decodeMP3ToFloat32(filePath) {
  // ffmpeg -> raw f32le PCM at 16kHz mono
  const raw = execSync(
    `ffmpeg -i "${filePath}" -f f32le -acodec pcm_f32le -ar 16000 -ac 1 - 2>/dev/null`,
    { maxBuffer: 10 * 1024 * 1024 }
  );
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
}

// --- MFCC extraction (manual implementation, no Meyda dependency issues) ---
function hann(n, N) {
  return 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1)));
}

function fft(real, imag) {
  const n = real.length;
  if (n <= 1) return;

  // Bit-reversal permutation
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
        const tRe = curRe * real[i + j + len/2] - curIm * imag[i + j + len/2];
        const tIm = curRe * imag[i + j + len/2] + curIm * real[i + j + len/2];
        real[i + j + len/2] = real[i + j] - tRe;
        imag[i + j + len/2] = imag[i + j] - tIm;
        real[i + j] += tRe;
        imag[i + j] += tIm;
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
    for (let j = binPoints[i]; j < binPoints[i+1]; j++) {
      filter[j] = (j - binPoints[i]) / (binPoints[i+1] - binPoints[i]);
    }
    for (let j = binPoints[i+1]; j < binPoints[i+2]; j++) {
      filter[j] = (binPoints[i+2] - j) / (binPoints[i+2] - binPoints[i+1]);
    }
    filters.push(filter);
  }
  return filters;
}

function dct(input, numCoeffs) {
  const N = input.length;
  const output = new Float64Array(numCoeffs);
  for (let k = 0; k < numCoeffs; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += input[n] * Math.cos(Math.PI * k * (n + 0.5) / N);
    }
    output[k] = sum;
  }
  return output;
}

function extractMFCC(samples, sampleRate, { numCoeffs = 13, numFilters = 26, fftSize = 512, hopSize = 256 } = {}) {
  const filters = createMelFilterbank(numFilters, fftSize, sampleRate);
  const frames = [];

  for (let i = 0; i + fftSize <= samples.length; i += hopSize) {
    // Check energy
    let energy = 0;
    for (let j = 0; j < fftSize; j++) energy += samples[i+j] * samples[i+j];
    energy = Math.sqrt(energy / fftSize);
    if (energy < 0.005) continue; // skip silence

    // Windowed frame
    const real = new Float64Array(fftSize);
    const imag = new Float64Array(fftSize);
    for (let j = 0; j < fftSize; j++) {
      real[j] = samples[i+j] * hann(j, fftSize);
    }

    // FFT
    fft(real, imag);

    // Power spectrum
    const numBins = fftSize / 2 + 1;
    const power = new Float64Array(numBins);
    for (let j = 0; j < numBins; j++) {
      power[j] = real[j] * real[j] + imag[j] * imag[j];
    }

    // Apply mel filterbank
    const melEnergies = new Float64Array(numFilters);
    for (let f = 0; f < numFilters; f++) {
      let sum = 0;
      for (let j = 0; j < numBins; j++) sum += power[j] * filters[f][j];
      melEnergies[f] = Math.log(sum + 1e-10);
    }

    // DCT to get MFCCs
    const mfcc = dct(melEnergies, numCoeffs);
    frames.push(Array.from(mfcc));
  }

  return frames;
}

// --- DTW ---
function euclideanDist(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; sum += d * d; }
  return Math.sqrt(sum);
}

function dtwDistance(s, t) {
  const n = s.length, m = t.length;
  // Use 2-row optimization for memory
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

// --- Main ---
const DECK_ID = 'chinese_chpt10_1';
const AUDIO_DIR = './public/data/audio/words';

const cards = [
  { idx: 0, word: '寒假', pinyin: 'hanjia' },
  { idx: 1, word: '飞机', pinyin: 'feiji' },
  { idx: 2, word: '票', pinyin: 'piao' },
  { idx: 3, word: '飞机场', pinyin: 'feijichang' },
  { idx: 4, word: '坐', pinyin: 'zuo' },
];

console.log('Loading and extracting MFCC from audio files...\n');

const mfccData = {};
for (const card of cards) {
  for (const side of ['a', 'b']) {
    const path = `${AUDIO_DIR}/${DECK_ID}_card${card.idx}_side_${side}.mp3`;
    try {
      const samples = decodeMP3ToFloat32(path);
      const mfcc = extractMFCC(samples, 16000);
      const key = `card${card.idx}_${side}`;
      mfccData[key] = { mfcc, word: card.word, pinyin: card.pinyin, duration: samples.length / 16000 };
      console.log(`  ${key} (${card.word}): ${mfcc.length} frames, ${(samples.length/16000).toFixed(2)}s`);
    } catch (e) {
      console.log(`  SKIP card${card.idx}_${side}: ${e.message}`);
    }
  }
}

function compare(keyA, keyB) {
  const a = mfccData[keyA], b = mfccData[keyB];
  if (!a || !b) return null;
  const dist = dtwDistance(a.mfcc, b.mfcc);
  const pathLen = Math.max(a.mfcc.length, b.mfcc.length);
  const norm = dist / pathLen;
  return { dist, norm, pathLen };
}

console.log('\n' + '='.repeat(70));
console.log('SELF-COMPARISON (expect distance = 0, or very close to 0)');
console.log('='.repeat(70));
for (const key of Object.keys(mfccData).slice(0, 5)) {
  const r = compare(key, key);
  console.log(`  ${key.padEnd(12)} vs ITSELF:  dist=${r.dist.toFixed(2)}, norm=${r.norm.toFixed(4)}`);
}

console.log('\n' + '='.repeat(70));
console.log('SAME WORD: Chinese (side_b) vs English (side_a) - DIFFERENT LANGUAGE');
console.log('='.repeat(70));
for (const card of cards) {
  const r = compare(`card${card.idx}_a`, `card${card.idx}_b`);
  if (r) console.log(`  card${card.idx} (${card.word.padEnd(4)}): a(EN) vs b(ZH)  dist=${r.dist.toFixed(2)}, norm=${r.norm.toFixed(4)}`);
}

console.log('\n' + '='.repeat(70));
console.log('DIFFERENT WORDS (should have HIGH distance)');
console.log('='.repeat(70));
const pairs = [
  ['card0_b', 'card1_b', '寒假 vs 飞机'],
  ['card0_b', 'card2_b', '寒假 vs 票'],
  ['card0_b', 'card3_b', '寒假 vs 飞机场'],
  ['card1_b', 'card2_b', '飞机 vs 票'],
  ['card1_b', 'card3_b', '飞机 vs 飞机场'],
  ['card2_b', 'card4_b', '票 vs 坐'],
  ['card0_b', 'card4_b', '寒假 vs 坐'],
];

for (const [a, b, label] of pairs) {
  const r = compare(a, b);
  if (r) console.log(`  ${label.padEnd(16)}  dist=${r.dist.toFixed(2)}, norm=${r.norm.toFixed(4)}`);
}

// --- Simulated variations ---
console.log('\n' + '='.repeat(70));
console.log('SIMULATED: same audio with pitch/speed shifts (like a different speaker)');
console.log('='.repeat(70));

function resampleSimple(samples, factor) {
  // Simple linear interpolation resample (simulates speed change)
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

function addNoise(samples, level) {
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    out[i] = samples[i] + (Math.random() * 2 - 1) * level;
  }
  return out;
}

function pureNoise(length) {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = (Math.random() * 2 - 1) * 0.3;
  return out;
}

// Take card0_b as reference
const refPath = `${AUDIO_DIR}/${DECK_ID}_card0_side_b.mp3`;
const refSamples = decodeMP3ToFloat32(refPath);
const refMfcc = extractMFCC(refSamples, 16000);

// Pitch shift via resampling (changes formants - simulates different speaker)
function pitchShift(samples, semitones) {
  const factor = Math.pow(2, semitones / 12);
  return resampleSimple(samples, factor);
}

const variations = [
  { label: 'Same, 10% faster', samples: resampleSimple(refSamples, 1.1) },
  { label: 'Same, 20% faster', samples: resampleSimple(refSamples, 1.2) },
  { label: 'Same, 10% slower', samples: resampleSimple(refSamples, 0.9) },
  { label: 'Same, 20% slower', samples: resampleSimple(refSamples, 0.8) },
  { label: 'Pitch +2 semitones', samples: pitchShift(refSamples, 2) },
  { label: 'Pitch +4 semitones', samples: pitchShift(refSamples, 4) },
  { label: 'Pitch -3 semitones', samples: pitchShift(refSamples, -3) },
  { label: 'Pitch -5 semitones', samples: pitchShift(refSamples, -5) },
  { label: 'Pitch+4 & 15% faster', samples: resampleSimple(pitchShift(refSamples, 4), 1.15) },
  { label: 'Pure white noise', samples: pureNoise(refSamples.length) },
  { label: 'Silence', samples: new Float32Array(refSamples.length) },
];

for (const v of variations) {
  const mfcc = extractMFCC(v.samples, 16000);
  if (mfcc.length === 0) {
    console.log(`  ${v.label.padEnd(25)}  frames=0 (rejected as silence)`);
    continue;
  }
  const dist = dtwDistance(refMfcc, mfcc);
  const pathLen = Math.max(refMfcc.length, mfcc.length);
  const norm = dist / pathLen;
  console.log(`  ${v.label.padEnd(25)}  frames=${mfcc.length}, dist=${dist.toFixed(2)}, norm=${norm.toFixed(4)}`);
}

console.log('\n' + '='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log('Self = 0 (correct)');
console.log('Speed variations should be LOW distance (DTW handles timing)');
console.log('Noise should be HIGH distance');
console.log('Silence should be REJECTED (0 frames)');
console.log('Different words: norm ~40-80');
console.log('\nFor handsfree mode we need a threshold that:');
console.log('  - PASSES: same word at different speed/slight noise');
console.log('  - FAILS: different words, noise, silence');
