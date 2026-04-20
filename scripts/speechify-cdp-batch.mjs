/**
 * Speechify batch audio generator using direct API calls.
 * Connects to Chrome via CDP to borrow the auth token, then calls
 * the synthesis API directly -- no UI automation needed.
 *
 * Prerequisites:
 *   - Chrome running with --remote-debugging-port=9333
 *   - Logged into app.speechify.com (for the auth token)
 *
 * Usage: node scripts/speechify-cdp-batch.mjs [deck_json_path]
 */

import { chromium } from "playwright";
import { readFileSync, existsSync, writeFileSync, copyFileSync } from "fs";
import { resolve } from "path";

const DECK_FILE = process.argv[2] || "public/data/decks/chinese_chpt1_1.json";
const DECK_ID = DECK_FILE.split("/").pop().replace(".json", "");
const AUDIO_DIR = "public/data/audio/words";
const CDP_URL = "http://127.0.0.1:9333";

// Speechify API voice IDs (mapped from display names)
// side_a (English text)  -> yunfeng  (display: "Junjie", male Chinese voice)
// side_b (Chinese chars)  -> xiaoxiao (display: "Yarui", female Chinese voice)
// side_c = copy of side_b (same audio)
const VOICE_MAP = { a: "yunfeng", b: "xiaoxiao" };

const deck = JSON.parse(readFileSync(DECK_FILE, "utf-8"));
const cards = deck.content;

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

async function synthesize(page, text, voice, token) {
  const result = await page.evaluate(async (args) => {
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
  }, { token, text, voice });

  if (result.error) {
    throw new Error(`API ${result.status}: ${result.body}`);
  }

  // Strip protobuf wrapper (first 2-5 bytes before "ID3" or 0xFF sync)
  const raw = Buffer.from(result.base64, "base64");
  let start = 0;
  for (let i = 0; i < Math.min(raw.length, 20); i++) {
    // ID3 header
    if (raw[i] === 0x49 && raw[i + 1] === 0x44 && raw[i + 2] === 0x33) {
      start = i;
      break;
    }
    // MP3 frame sync
    if (raw[i] === 0xff && (raw[i + 1] & 0xe0) === 0xe0) {
      start = i;
      break;
    }
  }
  return raw.slice(start);
}

// Main
const browser = await chromium.connectOverCDP(CDP_URL);
const ctx = browser.contexts()[0];
let page = ctx.pages().find((p) => p.url().includes("speechify.com")) || (await ctx.newPage());

// Ensure we're on a speechify page (needed for CORS)
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

let generated = 0,
  skipped = 0,
  failed = 0;
const TOKEN_REFRESH_INTERVAL = 50; // refresh token every N calls

for (const card of cards) {
  for (const side of ["a", "b"]) {
    const filename = `${DECK_ID}_card${card.idx}_side_${side}.mp3`;
    const targetPath = resolve(AUDIO_DIR, filename);

    if (existsSync(targetPath)) {
      skipped++;
      continue;
    }

    // side_a = English text, side_b = Chinese characters (from side_c field)
    const text = side === "a" ? card.side_a : card.side_c;
    const voice = VOICE_MAP[side];

    console.log(`GEN card${card.idx} side_${side}: "${text}" (${voice})`);

    try {
      // Refresh token periodically to avoid expiry
      if ((generated + failed) > 0 && (generated + failed) % TOKEN_REFRESH_INTERVAL === 0) {
        const newToken = await getAuthToken(page);
        if (newToken) {
          token = newToken;
          console.log("  (token refreshed)");
        }
      }

      const mp3Data = await synthesize(page, text, voice, token);
      writeFileSync(targetPath, mp3Data);
      console.log(`  OK: ${filename} (${mp3Data.length} bytes)`);
      generated++;

      // Small delay to be nice to the API
      await page.waitForTimeout(500);
    } catch (err) {
      console.log(`  ERROR: ${err.message?.slice(0, 100)}`);
      failed++;

      // On auth error, try refreshing token once
      if (err.message?.includes("401") || err.message?.includes("403")) {
        console.log("  Refreshing auth token...");
        await page.goto("https://app.speechify.com/");
        await page.waitForTimeout(3000);
        const newToken = await getAuthToken(page);
        if (newToken) {
          token = newToken;
          console.log("  Token refreshed, retrying...");
          try {
            const mp3Data = await synthesize(page, text, voice, token);
            writeFileSync(targetPath, mp3Data);
            console.log(`  RETRY OK: ${filename} (${mp3Data.length} bytes)`);
            generated++;
            failed--; // undo the failure count
          } catch (retryErr) {
            console.log(`  RETRY FAIL: ${retryErr.message?.slice(0, 100)}`);
          }
        }
      }
    }
  }
}

// Copy side_b to side_c
let copied = 0;
for (const card of cards) {
  const b = resolve(AUDIO_DIR, `${DECK_ID}_card${card.idx}_side_b.mp3`);
  const c = resolve(AUDIO_DIR, `${DECK_ID}_card${card.idx}_side_c.mp3`);
  if (existsSync(b) && !existsSync(c)) {
    copyFileSync(b, c);
    copied++;
  }
}

console.log(
  `\n=== DONE: ${generated} generated, ${skipped} skipped, ${failed} failed, ${copied} side_c copies ===`
);
await browser.close();
