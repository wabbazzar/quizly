---
name: add-chinese-card
description: Add a new Chinese vocabulary or phrase card to a Quizly deck JSON, with all sides (a-g) filled in correctly and matching audio generated via Speechify (male voice for English, female voice for Chinese). Use when the user asks to "add a card / phrase / word" to one of the chinese_*.json decks under public/data/decks/, or says things like "add to the [travel/living/review/chpt#] deck". Mention the meaning, pinyin, and characters if the user has not.
---

# Add Chinese Card to Quizly Deck

End-to-end recipe for adding a new card to one of the Chinese decks under `public/data/decks/`. Covers card schema, audio generation, validation, and the common pitfalls.

## 0. Get the full info from the user before writing anything

Before editing the deck, make sure you have **three** matching pieces of information:

1. **English meaning** (free text — what the phrase means)
2. **Pinyin** (with tone marks, e.g. `wǒ bú huì wàngjì`)
3. **Chinese characters** (e.g. `我不会忘记`)

Plus the **target deck** (e.g. `chinese_living_1`, `chinese_travel_1`).

If the user gives you only one or two of these, derive the missing pieces and **show them back to the user** for confirmation before writing — but only if there is genuine ambiguity. For unambiguous translations (e.g. user says "how much money?" → 多少钱), proceed and flag in the final summary.

### Pinyin / meaning consistency check (DO NOT SKIP)

Voice-typed pinyin frequently drops syllables — most often the negator `bù/bú` (不) and the perfective `le` (了). When the user-provided pinyin and meaning disagree, **default to the stated meaning** (it's the part the user is sure about) and produce the correct pinyin yourself. Then call out the discrepancy in your final summary.

Examples seen in this project:
- User: "I will not forget" + pinyin "wo hui wang ji" → use 我不会忘记 / `wǒ bú huì wàngjì` (the user dropped 不)
- User: "how much money?" + pinyin "Shi Shuo Jian" → use 多少钱 / `duōshao qián` (voice-mangled romanization)

## 1. Locate the deck and confirm schema

```bash
ls public/data/decks/ | grep -i <deck-name>
```

All Chinese decks use this 7-side schema (`available_sides: 7`):

| Side | Field label | Content |
|------|-------------|---------|
| `side_a` | english | English translation/definition |
| `side_b` | pinyin | Pinyin with tone marks |
| `side_c` | characters | Chinese characters |
| `side_d` | description | Part-of-speech tag (`noun`, `verb`, `adjective`, `verb object`, `verb phrase`, `phrase`, `question phrase`, etc.) |
| `side_e` | example (pinyin) | Example sentence in **pinyin only** |
| `side_f` | example translation | English translation of the example |
| `side_g` | usage notes | Usage notes — character breakdown, related forms, register, etc. |

**Critical rule**: do NOT bundle pinyin + characters + translation into `side_e`. Each side must contain only what its label says. If you see a card where `side_e` contains a slash (`/`) or Chinese characters, that card is malformed — fix it as part of this work. (See git history `fix(travel): split bundled side_e into side_e/f/g for last 3 cards` for the canonical fix.)

## 2. Add the card to the deck JSON

Open the deck JSON and find the last card. Bump `card_count` in the metadata, then append a new card with the next sequential `card_id` and `idx`.

Template:

```json
{
  "card_id": "card-0NN",
  "idx": NN-1,
  "name": "snake_case_label",
  "side_a": "<English meaning; multiple senses separated with semicolons>",
  "side_b": "<pinyin with tone marks>",
  "side_c": "<Chinese characters>",
  "side_d": "<part-of-speech>",
  "side_e": "<example sentence in pinyin only>",
  "side_f": "<English translation of side_e>",
  "side_g": "<usage notes — character breakdown, related/contrast forms, register, common collocations>",
  "level": 1
}
```

The `side_g` notes should be a few useful sentences — not encyclopedic. Cover: character breakdown, related forms (positive/negative, polite/casual, related compounds), and a related phrase a learner might want.

## 3. Validate the JSON

```bash
node -e "JSON.parse(require('fs').readFileSync('public/data/decks/<deck>.json','utf8')); console.log('JSON OK')"
```

Then audit for any malformed sides:

```bash
node -e "
const d = require('/abs/path/to/<deck>.json');
const bad = d.content.filter(c => {
  const e = c.side_e || '';
  return e.includes('/') || /[一-鿿]/.test(e);
});
const noF = d.content.filter(c => !c.side_f);
const noG = d.content.filter(c => !c.side_g);
console.log('bundled side_e:', bad.length, 'missing side_f:', noF.length, 'missing side_g:', noG.length);
"
```

All three numbers should be 0.

## 4. Generate audio via Speechify

Audio files live in `public/data/audio/words/` and are named:

- `<DECK_ID>_card<idx>_side_a.mp3` — English text, **male** voice (`yunfeng` / display name "Junjie")
- `<DECK_ID>_card<idx>_side_b.mp3` — Chinese characters, **female** voice (`xiaoxiao` / display name "Yarui")
- `<DECK_ID>_card<idx>_side_c.mp3` — copy of `_side_b.mp3` (same audio)

Note: pinyin (`side_b` in the deck JSON) is NOT a separate audio file. The "Chinese audio" is generated from `side_c` (characters), and the resulting MP3 is what plays for both the pinyin and characters sides in the UI. From the user's perspective: male voice = English; female voice = pinyin + characters.

### Pre-flight: make sure Speechify auth is alive

The script borrows the Firebase auth token from a logged-in Speechify session in a Chrome instance running with `--remote-debugging-port=9333`. **The token expires hourly and the OAuth login is interactive** — if the profile at `/tmp/chrome-cdp` has been idle for a while, the login WILL be expired and you cannot refresh it without the user.

Quick check (does NOT require the deck file):

```bash
# 1. Make sure Chrome is up on the CDP port
curl -sf http://127.0.0.1:9333/json/version | head -2

# 2. If not running, launch it. On a headless host you must use --headless=new
#    AND the persistent profile must already have a valid Speechify session
#    (which means a real interactive login was done at some point recently).
nohup google-chrome --remote-debugging-port=9333 --user-data-dir=/tmp/chrome-cdp \
  --no-first-run --headless=new https://app.speechify.com/ \
  > /tmp/chrome-cdp.log 2>&1 &
disown
sleep 8
curl -sf http://127.0.0.1:9333/json/version | head -2
```

If the script bails with `FATAL: Could not get auth token. Is Speechify logged in?`, the OAuth session has expired. **Stop and ask the user** to:

1. Launch Chrome non-headless with the CDP port and profile (the command above without `--headless=new`)
2. Log into app.speechify.com via Google OAuth in that Chrome window
3. Leave that Chrome running

Then re-run the batch. There is no way around the interactive login.

### Run the batch

```bash
node scripts/speechify-cdp-batch.mjs public/data/decks/<deck>.json
```

The script iterates every card, **skips files that already exist**, and only generates the new ones — so it's safe to run after adding a single card. Expected output for one new card:

```
GEN card<N> side_a: "<English>" (yunfeng)
  OK: <deck>_card<N>_side_a.mp3 (NNN bytes)
GEN card<N> side_b: "<characters>" (xiaoxiao)
  OK: <deck>_card<N>_side_b.mp3 (NNN bytes)

=== DONE: 2 generated, NN skipped, 0 failed, 1 side_c copies ===
```

### Verify

```bash
ls -la public/data/audio/words/<deck>_card<idx>_side_*.mp3
# Should show three files: _side_a, _side_b, _side_c
file public/data/audio/words/<deck>_card<idx>_side_a.mp3
# Should report "Audio file with ID3 ..." or MPEG audio. If it says "data" or
# is suspiciously small (<2KB), the synthesis call failed — re-run.
```

## 5. Run project checks

For data-only changes (deck JSON + new audio files), the minimum is:

```bash
npm run type-check    # must pass
npm run build         # must succeed
```

Tests aren't strictly required for a JSON content addition, but if anything in `src/` is changed alongside the card, also run `npm test -- --run` and compare against the `main` baseline (the project currently has ~84 pre-existing test failures — only flag NEW failures).

## 6. Commit and push

Conventional-commits style; no AI signature, no emoji.

```bash
git add public/data/decks/<deck>.json public/data/audio/words/<deck>_card<idx>_*.mp3
git commit -m "feat(<deck-short>): add <chinese> (<pinyin>) card"
git push
```

Where `<deck-short>` is `living`, `travel`, `review`, `common-review`, or the chapter number for chapter decks.

## Common mistakes to avoid

- **Bundling `side_e`**: don't put `Pinyin / 中文 (translation)` all in `side_e`. The deck schema has separate `side_f` and `side_g` for a reason.
- **Forgetting `card_count`**: the metadata `card_count` must match `content.length`.
- **Wrong voice for the wrong side**: `yunfeng` (male) for English `_side_a.mp3`, `xiaoxiao` (female) for Chinese `_side_b.mp3`. Mixing these up sounds bizarre and the user will catch it.
- **Skipping the auth pre-flight**: running the batch without confirming the token is alive wastes time. Curl the CDP port FIRST.
- **Trusting voice-typed pinyin literally**: cross-check pinyin against the stated meaning before committing. Missing 不 / 了 is the #1 source of errors.

## Reference files

- Card examples: any of `public/data/decks/chinese_*.json` cards 1-10 (full 7-side cards with proper structure)
- Speechify batch script: `scripts/speechify-cdp-batch.mjs`
- localStorage / sync registry (where to add new keys): `CLAUDE.md` § "Client-Side Storage"
- Voice mappings: `CLAUDE.md` § "Speechify Per-Card Audio Generation"
