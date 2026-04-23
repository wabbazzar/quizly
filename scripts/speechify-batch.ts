/**
 * Speechify batch audio generator.
 *
 * Creates notes in app.speechify.com, triggers the download flow,
 * and captures the MP3 by intercepting the audio blob URL.
 *
 * Run from the dev-browser skills directory:
 *   cd ~/.claude/plugins/cache/dev-browser-marketplace/dev-browser/66682fb0513a/skills/dev-browser
 *   npx tsx /home/wabbazzar/code/quizly/scripts/speechify-batch.ts
 *
 * Prerequisites:
 *   - dev-browser extension relay running (npm run start-extension)
 *   - Extension connected in Chrome
 *   - Logged into app.speechify.com
 */

import { connect, waitForPageLoad } from "@/client.js";
import { readFileSync, existsSync, writeFileSync, copyFileSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";

// ---- CONFIG ----
const DECK_FILE = process.argv[2] || "/home/wabbazzar/code/quizly/public/data/decks/chinese_chpt1_1.json";
const DECK_ID = DECK_FILE.split("/").pop()!.replace(".json", "");
const AUDIO_DIR = "/home/wabbazzar/code/quizly/public/data/audio/words";

// Voice assignments:
//   side_a (English) -> Junjie (male)
//   side_b (Chinese) -> Yarui (female) -- uses side_c characters as TTS input
//   side_c = copy of side_b (same audio)
const VOICE_MAP: Record<string, string> = {
  a: "Junjie",
  b: "Yarui",
};

// Only generate a and b; side_c is a copy of side_b
const SIDES: Array<"a" | "b"> = ["a", "b"];

// ---- LOAD DECK ----
const deck = JSON.parse(readFileSync(DECK_FILE, "utf-8"));
const cards: Array<{ idx: number; side_a: string; side_c: string }> = deck.content;

// ---- HELPERS ----
async function dismissOverlays(page: any) {
  await page.evaluate(() => {
    document.querySelectorAll('[class*="fixed"][class*="inset"]').forEach((el: any) => {
      if (el.style) el.style.display = "none";
    });
  });
  await page.waitForTimeout(300);
}

async function generateOne(
  client: any,
  page: any,
  title: string,
  text: string,
  voiceName: string,
  targetPath: string
): Promise<boolean> {
  try {
    // 1. Go to library and create note
    await page.goto("https://app.speechify.com/");
    await page.waitForTimeout(3000);
    await dismissOverlays(page);

    await page.evaluate(() => {
      document.querySelectorAll("button").forEach((b: any) => {
        if (b.textContent?.includes("Create Note")) b.click();
      });
    });
    await page.waitForTimeout(2000);

    // 2. Find and fill fields
    const snapshot = await client.getAISnapshot("speechify");
    let titleRef = "", textRef = "";
    for (const line of snapshot.split("\n")) {
      if (line.includes('textbox "Title"')) {
        const m = line.match(/ref=(e\d+)/);
        if (m) titleRef = m[1];
      }
      if (line.includes('textbox "Text"')) {
        const m = line.match(/ref=(e\d+)/);
        if (m) textRef = m[1];
      }
    }
    if (!titleRef || !textRef) {
      console.error(`  FAIL: fields not found`);
      return false;
    }

    const titleEl = await client.selectSnapshotRef("speechify", titleRef);
    await titleEl.fill(title);
    const textEl = await client.selectSnapshotRef("speechify", textRef);
    await textEl.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(200);
    await page.keyboard.insertText(text);
    await page.waitForTimeout(500);

    // 3. Save File
    await page.evaluate(() => {
      document.querySelectorAll("button").forEach((b: any) => {
        if (b.textContent?.includes("Save File")) b.click();
      });
    });
    await page.waitForTimeout(4000);
    await dismissOverlays(page);

    // 4. Title dropdown -> Download
    const snap2 = await client.getAISnapshot("speechify");
    const lines = snap2.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("Annotations")) {
        for (let j = i + 1; j <= Math.min(lines.length - 1, i + 5); j++) {
          const m = lines[j].match(/button \[ref=(e\d+)\]/);
          if (m) {
            const btn = await client.selectSnapshotRef("speechify", m[1]);
            await btn.click({ force: true });
            break;
          }
        }
        break;
      }
    }
    await page.waitForTimeout(1500);

    await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll("*"));
      const dl = els.find((e: any) => e.textContent?.trim() === "Download");
      if (dl) ((dl as any).closest("button") || dl).click();
    });
    await page.waitForTimeout(2000);

    // 5. Select voice - click the row containing the voice name
    await page.evaluate((name: string) => {
      // Find all elements with the voice name text
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent?.trim() === name) {
          // Click the closest clickable parent (the voice row)
          let target = node.parentElement;
          while (target && target !== document.body) {
            if (target.onclick || target.getAttribute('role') === 'option' ||
                target.tagName === 'BUTTON' || target.tagName === 'LI' ||
                target.classList.toString().includes('voice') ||
                target.classList.toString().includes('item') ||
                target.classList.toString().includes('row')) {
              target.click();
              return;
            }
            target = target.parentElement;
          }
          // Fallback: click the grandparent
          node.parentElement?.parentElement?.click();
          return;
        }
      }
    }, voiceName);
    await page.waitForTimeout(1000);

    // 6. Continue
    await page.evaluate(() => {
      document.querySelectorAll("button").forEach((b: any) => {
        if (b.textContent?.trim() === "Continue") b.click();
      });
    });
    await page.waitForTimeout(4000);

    // 7. Capture the audio data before clicking final Download
    // The "Your file is ready" page has the audio ready. We grab it by
    // finding the download button's click handler which creates a blob URL.
    // Instead, we intercept the actual download by reading the audio from
    // the page's fetch response.
    const audioBase64 = await page.evaluate(async () => {
      // Find the download button and intercept its blob
      const origCreateObjectURL = URL.createObjectURL;
      let blobUrl = "";
      URL.createObjectURL = function(blob: Blob) {
        blobUrl = origCreateObjectURL(blob);
        return blobUrl;
      };

      // Click Download
      document.querySelectorAll("button").forEach((b: any) => {
        if (b.textContent?.trim() === "Download") b.click();
      });

      // Wait for blob to be created
      await new Promise(r => setTimeout(r, 3000));

      // Restore
      URL.createObjectURL = origCreateObjectURL;

      if (blobUrl) {
        try {
          const resp = await fetch(blobUrl);
          const blob = await resp.blob();
          const buffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          return btoa(binary);
        } catch {
          return "";
        }
      }
      return "";
    });

    if (audioBase64 && audioBase64.length > 100) {
      const buffer = Buffer.from(audioBase64, "base64");
      writeFileSync(targetPath, buffer);
      console.log(`  OK: ${targetPath.split("/").pop()} (${buffer.length} bytes)`);
      return true;
    }

    // Fallback: check Downloads folder
    await page.waitForTimeout(3000);
    // Check Downloads - handle Chrome's (1), (2) suffixes
    const dlBase = resolve("/home/wabbazzar/Downloads", `${title}.mp3`);
    let found = "";
    if (existsSync(dlBase)) {
      found = dlBase;
    } else {
      for (let n = 1; n <= 5; n++) {
        const suffixed = resolve("/home/wabbazzar/Downloads", `${title} (${n}).mp3`);
        if (existsSync(suffixed)) { found = suffixed; break; }
      }
    }
    if (found) {
      execSync(`mv "${found}" "${targetPath}"`);
      console.log(`  OK (from Downloads): ${targetPath.split("/").pop()}`);
      return true;
    }

    console.error(`  FAIL: could not capture audio`);
    return false;
  } catch (err) {
    console.error(`  ERROR: ${(err as Error).message?.slice(0, 80)}`);
    return false;
  }
}

// ---- MAIN ----
async function main() {
  let client = await connect();
  let page = await client.page("speechify");

  let generated = 0, skipped = 0, failed = 0;

  // Helper: reconnect if the page/extension died
  async function ensurePage() {
    try {
      await page.evaluate(() => true);
    } catch {
      console.log("  Reconnecting...");
      try { await client.disconnect(); } catch {}
      await new Promise(r => setTimeout(r, 3000));
      client = await connect();
      page = await client.page("speechify");
      console.log("  Reconnected");
    }
  }

  for (const card of cards) {
    for (const side of SIDES) {
      const filename = `${DECK_ID}_card${card.idx}_side_${side}.mp3`;
      const targetPath = resolve(AUDIO_DIR, filename);

      if (existsSync(targetPath)) {
        console.log(`SKIP card${card.idx} side_${side}`);
        skipped++;
        continue;
      }

      // side_a = English text, side_b = Chinese characters (from side_c field)
      const text = side === "a" ? card.side_a : card.side_c;
      const voice = VOICE_MAP[side];

      console.log(`GEN  card${card.idx} side_${side}: "${text}" (${voice})`);
      await ensurePage();
      const ok = await generateOne(client, page, filename.replace(".mp3", ""), text, voice, targetPath);

      if (ok) generated++;
      else failed++;
    }
  }

  // Copy side_b to side_c for each card
  let copied = 0;
  for (const card of cards) {
    const sideB = resolve(AUDIO_DIR, `${DECK_ID}_card${card.idx}_side_b.mp3`);
    const sideC = resolve(AUDIO_DIR, `${DECK_ID}_card${card.idx}_side_c.mp3`);
    if (existsSync(sideB)) {
      copyFileSync(sideB, sideC);
      copied++;
    }
  }

  console.log(`\n=== DONE: ${generated} generated, ${skipped} skipped, ${failed} failed, ${copied} side_c copies ===`);
  await client.disconnect();
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
