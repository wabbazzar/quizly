---
name: speechify-auth
description: Bring up the Speechify-authed Chrome session that backs both audio scripts (`speechify-cdp-batch.mjs` for per-card, `speechify-transcript.mjs` for transcripts). Covers the auto-login click flow, token verification, and the failure-mode recovery. Use this BEFORE running either Speechify script — both expect a logged-in session at `http://127.0.0.1:9333`.
---

# Speechify Auth Session

Both audio pipelines (`scripts/speechify-cdp-batch.mjs` for per-card MP3s, `scripts/speechify-transcript.mjs` for chapter dialogue/phrases MP3s) borrow a Firebase auth token from a Chrome instance that has Speechify open and signed in. This skill is how you bring that Chrome instance up — without prompting the user — and verify it's ready before kicking off long synth jobs.

The user has explicitly asked Claude to handle this end-to-end. Do not ask them to "log in" if you haven't tried the auto-login flow first.

## Prerequisites

- A persistent Chrome user-data directory at `/tmp/chrome-cdp` that has been signed into Google **and** Speechify at least once (Wesley's account, `wesleybeckner@gmail.com`). The Google session in this profile is what makes the auto-login click work without a password.
- `DISPLAY=:0` is set (it always is on this machine — verify if you're skeptical).
- Speechify subscription (~500 hours of credits available — no need to ration).

## Procedure

### 1. Start non-headless Chrome on the debug port

```bash
nohup google-chrome --remote-debugging-port=9333 \
  --user-data-dir=/tmp/chrome-cdp --no-first-run \
  https://app.speechify.com/ > /tmp/chrome-cdp.log 2>&1 &
disown
sleep 8
curl -sf http://127.0.0.1:9333/json/version | head -2
```

Non-headless is intentional: a window pops on the user's desktop. If the auto-login fails, that window is what they'd interact with directly. Leaving it visible is also a tell that the script is doing real work.

### 2. Check whether the session already has a token

If Chrome was idle and the Speechify session is still alive, you may already have a token. Probe IndexedDB before doing anything else:

```mjs
import { chromium } from "playwright";
const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p => p.url().includes("speechify")) || (await ctx.newPage());
if (!page.url().includes("speechify")) {
  await page.goto("https://app.speechify.com/");
  await page.waitForTimeout(3000);
}
const tok = await page.evaluate(() => new Promise((resolve) => {
  const req = indexedDB.open("firebaseLocalStorageDb");
  req.onsuccess = (e) => {
    const all = e.target.result.transaction("firebaseLocalStorage").objectStore("firebaseLocalStorage").getAll();
    all.onsuccess = () => {
      for (const item of all.result) {
        if (item?.value?.stsTokenManager?.accessToken) {
          return resolve({ ok: true, len: item.value.stsTokenManager.accessToken.length, email: item.value.email });
        }
      }
      resolve({ ok: false, url: page.url() });
    };
  };
  req.onerror = () => resolve({ ok: false });
}));
console.log(tok);
await browser.close();
```

If `ok: true`, you're done — proceed to running the synth scripts.

### 3. If no token, run the auto-login click

When the page is on `https://speechify.com/auth/web/?returnTo=...`, click `Continue with Google`:

```mjs
const candidates = [
  'button:has-text("Continue with Google")',
  'button:has-text("Sign in with Google")',
  '[aria-label*="Google" i]',
];
for (const sel of candidates) {
  const loc = page.locator(sel).first();
  if (await loc.count() > 0) {
    await loc.click({ timeout: 8000 }).catch(() => {});
    break;
  }
}
```

Then poll until the URL settles on `app.speechify.com` (no `/auth`) AND a token appears in IndexedDB. The full cycle usually takes 5–15 seconds because the OAuth round-trip is fast in the auto-login case (the persistent Google session means Google answers immediately without showing an account chooser).

```mjs
const start = Date.now();
while (Date.now() - start < 60_000) {
  // ...re-run the IndexedDB token check from step 2
  if (tok.ok) break;
  await new Promise(r => setTimeout(r, 2000));
}
```

### 4. Run the synth scripts

```bash
# Per-card audio (one deck at a time)
node scripts/speechify-cdp-batch.mjs public/data/decks/<deck>.json

# Transcript audio (one transcript at a time)
node scripts/speechify-transcript.mjs public/data/transcripts/<file>.txt
```

Both scripts grab the token via the same IndexedDB pattern and refresh it inline every ~30–50 calls (tokens expire ~hourly).

### 5. Tear down when done

```bash
pkill -f "remote-debugging-port=9333" || true
```

Leave the persistent profile (`/tmp/chrome-cdp`) alone — it's what makes the next session's auto-login work.

## Failure mode: Google account chooser stays empty

If you see the URL navigate to `https://accounts.google.com/v3/signin/accountchooser?...` and stay there beyond ~30 seconds, the Google session in the profile has expired. The user has to interact directly:

1. Leave the non-headless Chrome window up (don't kill it).
2. Tell the user: "The Chrome window on your desktop needs you — pick your Google account once, then I'll take it from there."
3. Re-poll IndexedDB after they've done it.

After this one re-login, the persistent Google session is good for weeks again.

## What NOT to do

- **Don't run Chrome headless for the login step.** Headless can complete the click but if the Google session is dead, there's no way to recover — the account chooser doesn't render visibly. Always start non-headless when you might need user interaction; the user can close the window after the token is acquired.
- **Don't share the token across scripts manually.** Both scripts re-extract it from IndexedDB on demand, which handles refreshes automatically. Caching it in a file would silently break after expiry.
- **Don't change the user-data-dir.** Both scripts hardcode `/tmp/chrome-cdp` indirectly via the CDP port — using a different profile means starting from scratch with login. Stick with `/tmp/chrome-cdp`.
- **Don't introduce non-Chinese voices.** The handsfree pronunciation matcher is calibrated against `xiaoxiao` references — swapping the voice would break the matcher. Speechify's voice catalog is large; resist the urge to "improve" the audio with a different voice.

## Reference files

- Per-card synth script: `scripts/speechify-cdp-batch.mjs`
- Transcript synth script: `scripts/speechify-transcript.mjs`
- Voice IDs and API endpoint reference: project root `CLAUDE.md` § "Speechify Per-Card Audio Generation" and § "Speechify Transcript Audio Generation"
- Companion skills: `add-chinese-card` (single card → Speechify per-card), `add-reading-content` (transcripts → Speechify transcript), `create-chinese-deck` (deck JSON → audio later)
