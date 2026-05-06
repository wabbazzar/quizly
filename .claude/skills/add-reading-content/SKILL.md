---
name: add-reading-content
description: Add reading practice content to a Chinese deck — both the in-deck `reading` section (token-aligned dialogues + grammar patterns rendered by the in-app Read mode) and the separate `*_phrases.txt` / `*_dialogue.txt` transcript files used by Speechify TTS for the Audio player. Use when the user asks to "add reading", "add practice", "add dialogues", "add transcripts" to an existing Chinese deck, or after creating a new deck via the create-chinese-deck skill.
---

# Add Reading Content to a Chinese Deck

Reading content has **two separate surfaces** that must be kept in sync:

1. **In-deck `reading` section** — JSON appended to the deck file. Renders via the in-app Read mode with token-level translation popovers.
2. **Transcript `.txt` files** — separate files in `public/data/transcripts/`, generated to MP3 by the Speechify pipeline and played by the Audio Player.

These look superficially similar but the data models are completely different. Don't try to derive one from the other automatically — they're authored differently and registered in different manifests.

## Surface 1 — in-deck `reading` section

### What it is

A `reading` object appended after the `content` array in the deck JSON. Holds the textbook dialogue plus 2–4 grammar pattern drills, each broken into Chinese / pinyin / English lines, with **per-token alignments** so the Read mode can show a translation when you tap a word.

### Where to look first

`public/data/decks/chinese_chpt13_1.json` lines 224 to end. That's the canonical example — same shape every chapter deck uses. Length is typically 800–1500 lines of JSON because each line carries a `wordAlignments` array with one entry per word + punctuation mark.

### Don't write this by hand

There's a built-in agent for this — `reading-content-generator` — designed to produce the exact JSON shape with valid token alignments. Dispatch it:

```
Agent({
  description: "Reading content for chpt<N>_<part>",
  subagent_type: "reading-content-generator",
  prompt: <see prompt template below>
})
```

Two parallel agent calls (one per chapter part) finish in ~3 minutes total.

### Prompt template for `reading-content-generator`

Include these specifics each time:

- **Source PDF** — `~/Downloads/L<N>D<part>_Textbook.pdf`, with the dialogue page range (typically PDF pages 2-4 for the dialogue itself).
- **Deck file path** — full absolute path to `public/data/decks/chinese_chpt<N>_<part>.json`.
- **Vocabulary list** — the chapter's vocab items, comma-separated, so the agent knows what to weave in.
- **Grammar patterns** — the textbook's grammar headings for the chapter (e.g. "时间副词 的 时间-Duration", "是…的 sentences", "还 (still)"). These come from the textbook PDF in the Grammar section after the dialogue.
- **Canonical reference** — point to `chinese_chpt13_1.json` lines 224-end as the structural template. The agent reads it to mirror the shape exactly.
- **Validation** — instruct the agent to run `node -e "JSON.parse(...)"` and `npm run type-check` and to verify each line's `wordAlignments[].chinese` concatenation equals the line's `a` field.
- **Counts** — typical target is 2 dialogues + 2-4 grammar sections, 30-100 practice lines (the JSON expands ~30x because of alignment tokens).

### What the agent produces

Six top-level keys are assembled inside `reading`:

```json
"reading": {
  "sides": { "a": "characters", "b": "pinyin", "c": "english" },
  "tokenization": {
    "unit": { "a": "character", "b": "space", "c": "space" },
    "preservePunctuation": true,
    "alignment": "index"
  },
  "practice": {
    "dialogue_001": { "title": "...", "description": "...", "lines": [...] },
    "dialogue_002": { ... },
    "grammar_001":  { ... },
    "grammar_002":  { ... }
  }
}
```

Each line in `lines`:

```json
{
  "a": "小明，下课了？上哪儿去？",
  "b": "Xiǎo Míng, xià kè le? Shàng nǎr qù?",
  "c": "Xiao Ming, class is over? Where are you going?",
  "wordAlignments": [
    { "chinese": "小明", "pinyin": "Xiǎo Míng", "english": "Xiao Ming" },
    { "chinese": "，",   "pinyin": ",",         "english": "," },
    { "chinese": "下课", "pinyin": "xià kè",    "english": "class is over" },
    ...
  ]
}
```

Function words (了 / 的 / 呢 / 吗) get their own alignment entry with empty `english`. Punctuation gets its own entry. The concatenation of `chinese` across the alignment array MUST equal `a`.

## Surface 2 — Transcript `.txt` files

### What they are

Plain text files in `public/data/transcripts/` that Speechify's TTS renders to MP3 audio. Two per chapter part:

- `chinese_chpt<N>_<part>_phrases.txt` — vocab repetition drill (each word 3× with a couple of paraphrases). 60-100 lines. ~2-3 minutes of audio.
- `chinese_chpt<N>_<part>_dialogue.txt` — alternating 4-vocab block and 2-line dialogue exchange between 小明 and 小美, with English translation, followed by a repeat of the Chinese exchange. 250-350 lines. ~10 minutes of audio.

### Where to look first

`public/data/transcripts/chinese_chpt13_1_phrases.txt` and `chinese_chpt13_1_dialogue.txt`. These are the canonical sizes and rhythm.

### Authoring these by hand

These ARE author-written — no agent. They're mostly mechanical templates filled in with the chapter vocab.

#### Phrases template

```
Chinese Phrase Practice - Chapter <N> Part <part>
<Chapter title> Vocabulary
Estimated listening time: <2-3> minutes

<vocab1>, <main definition>.
<vocab1>, <paraphrase>.
<vocab1>, <main definition>.

<vocab2>, ...
```

Three repetitions per vocab item, blank line between groups.

#### Dialogue template

```
Chinese Dialogue Practice - Chapter <N> Part <part>
<Chapter title>
Estimated listening time: 10 minutes

<vocab1>, <def>.
<vocab2>, <def>.
<vocab3>, <def>.
<vocab4>, <def>.

小明: <Chinese line>
小美: <Chinese line>

Xiaoming: <English translation>
Xiaomei: <English translation>

小明: <Chinese line>      ← repeat the exchange
小美: <Chinese line>

<next 4-vocab block>
...

END OF DIALOGUE

Vocabulary Review - Key words from Chapter <N> Part <part> used:
<comma-separated full vocab list>
```

Hard rules:
- Always **小明 / 小美** as speakers (per CLAUDE.md). Don't use the textbook character names — those are dialogue characters in the in-deck reading section, not the audio.
- **Repeat each exchange after the English translation** — that's why the dialogue file is ~3× the size you'd expect.
- Cycle through the chapter vocab in the 4-vocab blocks. Reuse blocks as needed if the deck is small (16-20 cards).
- Target ~140 Chinese characters per minute spoken pace, so a 10-min dialogue lands at 1300-1500 Chinese characters total.

### Register the transcripts

After writing the four `.txt` files, append four entries to `public/data/transcripts/manifest.json` (just below the previous chapter's entries):

```json
{
  "id": "chinese_chpt<N>_<part>_phrases",
  "deckId": "chinese_chpt<N>_<part>",
  "type": "phrases",
  "filename": "chinese_chpt<N>_<part>_phrases.txt",
  "displayName": "Phrases",
  "displayTitle": "Chp <N> pt <part>",
  "sortOrder": <next integer>,
  "audioFile": "chinese_chpt<N>_<part>_phrases.mp3"
},
{
  "id": "chinese_chpt<N>_<part>_dialogue",
  "deckId": "chinese_chpt<N>_<part>",
  "type": "dialogue",
  "filename": "chinese_chpt<N>_<part>_dialogue.txt",
  "displayName": "Dialogue",
  "displayTitle": "Chp <N> pt <part>",
  "sortOrder": <same integer>,
  "audioFile": "chinese_chpt<N>_<part>_dialogue.mp3"
}
```

Both transcripts share the same `sortOrder` (they're sibling entries for one chapter). Increment from the previous chapter's value.

## Surface 3 — Audio generation (separate, ElevenLabs)

The transcript `.txt` files are converted to MP3 via ElevenLabs (NOT Speechify — Speechify is for the per-card `_side_a/b/c.mp3` files). See the relevant section of the project root `CLAUDE.md`:

> **ElevenLabs Audio Generation**
> Voices: **Amy** (`bhJUNIXWQQ94l8eI2VUf`, female, 小美) and **Adam Li** (`hZTuv9Zqrq4yHYrEmF1r`, male, 小明).
> Settings: `eleven_multilingual_v2`, `speed: 0.9`, `stability: 0.6`, `language: zh`.
> Output to `public/data/audio/` (NOT `public/data/transcripts/`):
>   - `chinese_chpt<N>_<part>_dialogue.mp3`
>   - `chinese_chpt<N>_<part>_phrases.mp3`
> Max 10000 chars per TTS call — split if longer.

The MCP tool `mcp__elevenlabs__text_to_speech` handles the API call. Generate the dialogue and phrases files separately. The generated MP3s go to `public/data/audio/` — the manifest already references them by name so they appear in the app once the files exist.

If ElevenLabs API access isn't available in the session, leave the audio gap as a documented TODO and commit the text files anyway. The transcripts work fine as readable text in the Audio player even before the MP3s exist (the player falls back gracefully).

## Validation

Before committing:

```bash
# In-deck reading
node -e "
for (const f of ['chinese_chpt<N>_<part>.json']) {
  const d = require('/abs/path/'+f);
  const r = d.reading;
  if (!r) { console.log(f, 'NO READING'); continue; }
  const sections = Object.keys(r.practice || {});
  let total = 0;
  for (const k of sections) total += (r.practice[k].lines || []).length;
  console.log(f, '|', 'sections:', sections.length, '| lines:', total);
  // Per-line concat check:
  for (const k of sections) {
    for (const line of r.practice[k].lines) {
      const concat = line.wordAlignments.map(a => a.chinese).join('');
      if (concat !== line.a) console.log('MISMATCH', k, line.a, '!==', concat);
    }
  }
}
"

# Transcript manifest
node -e "JSON.parse(require('fs').readFileSync('public/data/transcripts/manifest.json','utf8'))"

# Type check
npm run type-check
```

All concat checks must pass; both JSON files must parse; type-check must be clean.

## Commit

Conventional commits, no AI signature:

```bash
git add public/data/decks/chinese_chpt<N>_<part>.json \
        public/data/transcripts/chinese_chpt<N>_<part>_phrases.txt \
        public/data/transcripts/chinese_chpt<N>_<part>_dialogue.txt \
        public/data/transcripts/manifest.json
# (also include public/data/audio/chinese_chpt<N>_<part>_*.mp3 if generated)
git commit -m "feat(content): add Chapter <N> Part <part> reading + transcripts"
git push
```

## Common mistakes to avoid

- **Conflating the two surfaces** — the in-deck `reading` JSON and the `.txt` transcripts are unrelated. Don't try to share author content between them; they're designed for different rendering paths.
- **Hand-writing the in-deck reading section** — the per-token alignment work is exactly what `reading-content-generator` exists to do. Hand-authored alignments are nearly always wrong (off-by-one tokens, missing punctuation entries).
- **Wrong character names in the .txt** — always 小明 / 小美 in transcripts. Don't use the textbook narrative names (王朋, 李友) — those appear in the in-deck reading.
- **Forgetting to repeat the exchange** — the `dialogue.txt` repeats every Chinese exchange after the English line. That's by design; the listener gets the Chinese twice with the meaning sandwiched in between.
- **Forgetting the manifest entry** — the `.txt` files are on disk but Audio Player won't surface them without a `transcripts/manifest.json` entry.
- **Putting MP3s in `transcripts/` instead of `audio/`** — text files go in `transcripts/`, MP3s go in `audio/`. The manifest's `audioFile` field is the audio filename, resolved against `public/data/audio/`.

## Reference files

- In-deck reading canonical example: `public/data/decks/chinese_chpt13_1.json` lines 224-end
- Phrases transcript canonical: `public/data/transcripts/chinese_chpt13_1_phrases.txt`
- Dialogue transcript canonical: `public/data/transcripts/chinese_chpt13_1_dialogue.txt`
- Transcript manifest: `public/data/transcripts/manifest.json`
- Speechify (per-card) audio script: `scripts/speechify-cdp-batch.mjs` (different pipeline — see `add-chinese-card` skill)
- ElevenLabs (transcript) audio: `mcp__elevenlabs__text_to_speech` MCP tool
- Companion skills: `create-chinese-deck` (build the deck first), `add-chinese-card` (single-card adds + per-card Speechify audio)
