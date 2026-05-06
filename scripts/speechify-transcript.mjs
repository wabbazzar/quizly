/**
 * Speechify transcript audio generator using direct API calls.
 *
 * Companion to `speechify-cdp-batch.mjs` — same token-borrowing pattern,
 * different output. The cdp-batch script generates per-card MP3s
 * (`<deckId>_card<N>_side_<a|b|c>.mp3`); this one generates per-transcript
 * MP3s (`<deckId>_phrases.mp3`, `<deckId>_dialogue.mp3`) by reading the
 * `*.txt` files in `public/data/transcripts/` and synthesizing them
 * through Speechify's backend.
 *
 * Speaker handling:
 *   - Lines beginning with `小明:` use the male voice (Junjie / yunfeng).
 *   - Lines beginning with `小美:` use the female voice (Yarui / xiaoxiao).
 *   - Everything else (headers, English translations, vocab blocks) uses
 *     the female voice as the default.
 *   - Each speaker turn is synthesized as one Speechify call; the resulting
 *     MP3 chunks are concatenated. MP3 streams concat naturally as long as
 *     all chunks share encoding params (Speechify's are stable per voice).
 *
 * Prerequisites:
 *   - Chrome running with --remote-debugging-port=9333
 *   - Logged into app.speechify.com (for the auth token)
 *
 * Usage:
 *   node scripts/speechify-transcript.mjs public/data/transcripts/<file>.txt
 *
 *   --voice <yunfeng|xiaoxiao>   force a single voice for the whole file
 *                                (default: auto-detect from speaker tags)
 *   --skip-existing              skip if the output MP3 already exists
 *   --out <path>                 override output path (default:
 *                                public/data/audio/<basename>.mp3)
 */

import { chromium } from "playwright";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { resolve, basename, dirname } from "path";

// ---------- CLI ----------
const argv = process.argv.slice(2);
const positional = argv.filter((a) => !a.startsWith("--"));
const flag = (name, def = null) => {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return def;
  const next = argv[i + 1];
  if (!next || next.startsWith("--")) return true;
  return next;
};

const TRANSCRIPT_FILE = positional[0];
if (!TRANSCRIPT_FILE) {
  console.error("Usage: node scripts/speechify-transcript.mjs <transcript.txt> [--voice X] [--out path] [--skip-existing]");
  process.exit(1);
}
if (!existsSync(TRANSCRIPT_FILE)) {
  console.error(`Not found: ${TRANSCRIPT_FILE}`);
  process.exit(1);
}

const FORCED_VOICE = flag("voice");
const SKIP_EXISTING = flag("skip-existing", false);
const AUDIO_DIR = "public/data/audio";
const TRANSCRIPT_BASENAME = basename(TRANSCRIPT_FILE).replace(/\.txt$/, "");
const OUT_PATH = flag("out") || resolve(AUDIO_DIR, `${TRANSCRIPT_BASENAME}.mp3`);
const CDP_URL = "http://127.0.0.1:9333";

// Speechify API voice IDs (mapped from display names)
//   小明 (male) -> yunfeng (display: "Junjie")
//   小美 (female) -> xiaoxiao (display: "Yarui")
const VOICE_MALE = "yunfeng";
const VOICE_FEMALE = "xiaoxiao";

// Speechify caps per request — stay well below the documented ceiling
// because long single-call jobs occasionally 5xx mid-stream.
const MAX_CHARS_PER_CHUNK = 1200;

// ---------- Token helper (same as cdp-batch) ----------
async function getAuthToken(page) {
  return page.evaluate(() => {
    return new Promise((resolve) => {
      const req = indexedDB.open("firebaseLocalStorageDb");
      req.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction("firebaseLocalStorage", "readonly");
        const store = tx.objectStore("firebaseLocalStorage");
        const all = store.getAll();
        all.onsuccess = () => {
          for (const item of all.result) {
            if (item?.value?.stsTokenManager?.accessToken) {
              resolve(item.value.stsTokenManager.accessToken);
              return;
            }
          }
          resolve(null);
        };
      };
      req.onerror = () => resolve(null);
    });
  });
}

// ---------- Synth (same protobuf-stripping as cdp-batch) ----------
async function synthesize(page, text, voice, token) {
  const result = await page.evaluate(
    async (args) => {
      const resp = await fetch("https://audio.api.speechify.com/v3/synthesis/get", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + args.token,
          "x-speechify-client": "WebApp",
          "x-speechify-client-version": "11.1.0",
          "x-speechify-synthesis-options": "sentence-splitting=false",
        },
        body: JSON.stringify({
          ssml: "<speak>" + args.text + "</speak>",
          voice: args.voice,
          forcedAudioFormat: "mp3",
        }),
      });
      if (!resp.ok) {
        return { error: true, status: resp.status, body: await resp.text() };
      }
      const buf = await resp.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return { error: false, base64: btoa(bin), size: buf.byteLength };
    },
    { token, text, voice }
  );

  if (result.error) {
    throw new Error(`API ${result.status}: ${result.body?.slice(0, 200)}`);
  }

  // Strip protobuf wrapper. Find the first ID3 tag or MP3 frame sync byte.
  const raw = Buffer.from(result.base64, "base64");
  let start = 0;
  for (let i = 0; i < Math.min(raw.length, 32); i++) {
    if (raw[i] === 0x49 && raw[i + 1] === 0x44 && raw[i + 2] === 0x33) {
      start = i;
      break;
    }
    if (raw[i] === 0xff && (raw[i + 1] & 0xe0) === 0xe0) {
      start = i;
      break;
    }
  }
  return raw.slice(start);
}

// ---------- SSML escape ----------
function ssmlEscape(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------- Plan: split the transcript into voiced segments ----------
/**
 * Yields { voice, text } segments. Speaker tags assign a voice; lines
 * without a tag inherit the previously-set voice (or the default).
 *
 * Adjacent same-voice lines are coalesced (cheaper, fewer API hits, less
 * chance of mid-pause artifacts at the joins).
 */
function planSegments(content, defaultVoice) {
  const lines = content.split(/\r?\n/);
  const segments = [];
  let current = { voice: defaultVoice, text: "" };

  const flush = () => {
    const trimmed = current.text.trim();
    if (trimmed) segments.push({ voice: current.voice, text: trimmed });
    current.text = "";
  };

  for (const raw of lines) {
    if (!raw.trim()) {
      // Blank line — preserve as a separator within the current segment so
      // the synthesized audio gets a small natural pause.
      if (current.text) current.text += "\n";
      continue;
    }
    let voice = current.voice;
    let text = raw;

    if (raw.startsWith("小明:") || raw.startsWith("小明：")) {
      voice = VOICE_MALE;
      text = raw.replace(/^小明[:：]\s*/, "");
    } else if (raw.startsWith("小美:") || raw.startsWith("小美：")) {
      voice = VOICE_FEMALE;
      text = raw.replace(/^小美[:：]\s*/, "");
    } else if (raw.startsWith("Xiaoming:") || raw.startsWith("Xiaoming：")) {
      // English translation lines must be routed by speaker, not inherited
      // from the previous line. Inheriting was the bug in the first chapter
      // 14 run: both English translation lines ended up in whichever voice
      // happened to speak last in Chinese (always 小美, the second turn),
      // so the English dialogue sounded like a monologue. Strip the prefix
      // because the voice change is the cue.
      voice = VOICE_MALE;
      text = raw.replace(/^Xiaoming[:：]\s*/, "");
    } else if (raw.startsWith("Xiaomei:") || raw.startsWith("Xiaomei：")) {
      voice = VOICE_FEMALE;
      text = raw.replace(/^Xiaomei[:：]\s*/, "");
    }

    if (voice !== current.voice) {
      flush();
      current.voice = voice;
    }
    current.text += (current.text ? "\n" : "") + text;
  }
  flush();

  return segments;
}

/** Break a segment into chunks that fit MAX_CHARS_PER_CHUNK. */
function chunkSegment(seg) {
  if (seg.text.length <= MAX_CHARS_PER_CHUNK) return [seg];
  const chunks = [];
  let buf = "";
  // Prefer to break on sentence punctuation; fall back to any newline.
  const sentences = seg.text.split(/(?<=[。！？\.\!\?])\s*/);
  for (const s of sentences) {
    if (!s) continue;
    if ((buf + s).length > MAX_CHARS_PER_CHUNK && buf) {
      chunks.push({ voice: seg.voice, text: buf });
      buf = "";
    }
    buf += s;
  }
  if (buf) chunks.push({ voice: seg.voice, text: buf });
  return chunks;
}

// ---------- Main ----------
const transcriptText = readFileSync(TRANSCRIPT_FILE, "utf-8");
const totalChars = transcriptText.length;
console.log(`Input:  ${TRANSCRIPT_FILE} (${totalChars} chars)`);
console.log(`Output: ${OUT_PATH}`);

if (SKIP_EXISTING && existsSync(OUT_PATH)) {
  console.log(`SKIP: output already exists`);
  process.exit(0);
}

mkdirSync(dirname(OUT_PATH), { recursive: true });

// Phrases files are mostly Chinese vocab + English glosses, no speaker tags
// — default to the female (Yarui) voice. Dialogue files have speaker tags
// and the planner assigns voices per turn.
let defaultVoice = VOICE_FEMALE;
if (FORCED_VOICE === "yunfeng" || FORCED_VOICE === "xiaoxiao") {
  defaultVoice = FORCED_VOICE;
}

let segments;
if (FORCED_VOICE && FORCED_VOICE !== true) {
  // Single voice for the whole file — skip speaker parsing.
  segments = [{ voice: defaultVoice, text: transcriptText.trim() }];
} else {
  segments = planSegments(transcriptText, defaultVoice);
}

const allChunks = segments.flatMap(chunkSegment);
console.log(`Plan: ${segments.length} speaker segments → ${allChunks.length} synth chunks`);

// Connect to Chrome and grab the token.
const browser = await chromium.connectOverCDP(CDP_URL);
const ctx = browser.contexts()[0];
let page = ctx.pages().find((p) => p.url().includes("speechify.com")) || (await ctx.newPage());
if (!page.url().includes("speechify.com")) {
  await page.goto("https://app.speechify.com/");
  await page.waitForTimeout(3000);
}

let token = await getAuthToken(page);
if (!token) {
  console.error("FATAL: Could not get auth token. Is Speechify logged in?");
  process.exit(1);
}
console.log(`Auth token acquired (${token.length} chars)`);

// Synthesize each chunk and concatenate.
const buffers = [];
let i = 0;
const TOKEN_REFRESH_INTERVAL = 30;
let totalBytes = 0;

for (const chunk of allChunks) {
  i++;
  const ssml = ssmlEscape(chunk.text);
  const preview = chunk.text.replace(/\s+/g, " ").slice(0, 64);
  console.log(`[${i}/${allChunks.length}] (${chunk.voice}) ${chunk.text.length}c — ${preview}…`);

  if (i % TOKEN_REFRESH_INTERVAL === 0) {
    const fresh = await getAuthToken(page);
    if (fresh) {
      token = fresh;
      console.log("  (token refreshed)");
    }
  }

  let attempts = 0;
  let mp3 = null;
  while (attempts < 3 && !mp3) {
    try {
      mp3 = await synthesize(page, ssml, chunk.voice, token);
    } catch (err) {
      attempts++;
      const msg = err.message || String(err);
      console.log(`  attempt ${attempts} failed: ${msg.slice(0, 120)}`);
      if (msg.includes("401") || msg.includes("403")) {
        await page.goto("https://app.speechify.com/");
        await page.waitForTimeout(2000);
        const fresh = await getAuthToken(page);
        if (fresh) {
          token = fresh;
          console.log("  (token refreshed after auth error)");
        }
      } else {
        await page.waitForTimeout(2000);
      }
    }
  }
  if (!mp3) {
    console.error(`  GIVE UP on chunk ${i} after 3 attempts.`);
    process.exit(2);
  }
  buffers.push(mp3);
  totalBytes += mp3.length;
  await page.waitForTimeout(300); // be nice to the API
}

const merged = Buffer.concat(buffers);
writeFileSync(OUT_PATH, merged);
console.log(`\n=== DONE ===`);
console.log(`Wrote: ${OUT_PATH} (${(merged.length / 1024).toFixed(1)} KB, ${buffers.length} chunks)`);

await browser.close();
