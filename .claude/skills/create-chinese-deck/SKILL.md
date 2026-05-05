---
name: create-chinese-deck
description: Build a full Chinese vocabulary deck JSON from a textbook PDF (typically Integrated Chinese L# D# Textbook PDFs in ~/Downloads), then register it in the manifest. Use when the user asks to "create a deck", "add chapter N", "grab vocab and create a deck", or points at a chapter / lesson PDF in ~/Downloads. The companion skill `add-chinese-card` handles single-card additions to an existing deck.
---

# Create a Chinese Deck from a Textbook PDF

End-to-end recipe for turning a chapter/lesson PDF (e.g. `L14D1_Textbook.pdf`) into a full Quizly deck JSON. The deck comes out matching the canonical schema used by every existing `chinese_chpt*.json`, ready to ship.

## 0. Locate the PDFs

Textbook PDFs typically arrive in `~/Downloads/` named `L<N>D<part>_Textbook.pdf` (e.g. `L14D1_Textbook.pdf`, `L14D2_Textbook.pdf`). Each lesson is split into Part 1 (Dialogue I) and Part 2 (Dialogue II); each becomes its own deck.

```bash
ls ~/Downloads/ | grep -iE 'L[0-9]+D[12]_Textbook'
# Copy to /tmp first so the Read tool can page through them safely
cp ~/Downloads/L<N>D<part>_Textbook.pdf /tmp/
```

## 1. Extract the vocabulary list

Use the Read tool with the `pages` parameter to load the PDF. The vocabulary list lives in a labeled green VOCABULARY box, usually 2–3 pages in (right after the dialogue text). For Lesson 14 it was on book pages 104–105 (PDF pages 4–5) for D1 and pages 116–117 (PDF pages 4–5) for D2.

```
Read /tmp/L<N>D<part>_Textbook.pdf pages="1-12"
```

The VOCABULARY box has columns: number, characters, pinyin, part-of-speech (n / v / adj / m / t / vc / adv / proper noun), English gloss. Transcribe each row into a worklist:

```
1. 舞会  wǔhuì     n     dance party; ball
2. 表姐  biǎojiě   n     older female cousin
...
```

Don't forget the **Proper Nouns** subsection at the bottom — those become cards too (zodiac names, character names like 王红, 海伦, 汤姆).

Skip diagram labels (the face diagram in L14D2 has 头发, 耳朵, 眉毛, 牙齿 floating around the cartoon — these aren't on the official vocab list and shouldn't be in the deck).

## 2. Use the canonical deck schema

Every `chinese_chpt*.json` in `public/data/decks/` follows this exact shape. Copy it verbatim and fill in the values.

```json
{
  "id": "chinese_chpt<N>_<part>",
  "metadata": {
    "deck_name": "Chinese Chapter <N> Part <part>",
    "abbreviated_title": "Chp <N> pt <part>",
    "deck_subtitle": "<Chapter title> — <dialogue title>",
    "description": "<one-sentence summary of what this part teaches>",
    "category": "Language Learning",
    "available_levels": [1, 2, 3],
    "available_sides": 7,
    "side_labels": {
      "side_a": "english",
      "side_b": "pinyin",
      "side_c": "characters",
      "side_d": "description",
      "side_e": "example (pinyin)",
      "side_f": "example translation",
      "side_g": "usage notes"
    },
    "card_count": <N>,
    "difficulty": "intermediate",
    "tags": ["chinese", "mandarin", "<topic>", "vocabulary", "chapter<N>"],
    "version": "1.0.0",
    "created_date": "<today YYYY-MM-DDT00:00:00Z>",
    "last_updated": "<today YYYY-MM-DDT00:00:00Z>",
    "family_id": "chinese"
  },
  "content": [ ... ]
}
```

`card_count` MUST equal the length of `content`. If you add 19 cards, that field is 19.

## 3. Card structure

Every card follows the 7-side template — same shape as in the `add-chinese-card` skill. Cribbing the relevant bit:

| Side | Field label | Content |
|------|-------------|---------|
| `side_a` | english | English translation/definition |
| `side_b` | pinyin | Pinyin with tone marks |
| `side_c` | characters | Chinese characters |
| `side_d` | description | POS tag — `noun`, `verb`, `adjective`, `adverb`, `measure word`, `time word`, `proper noun`, `verb-complement`, etc. |
| `side_e` | example (pinyin) | Example sentence in pinyin only |
| `side_f` | example translation | English translation of the example |
| `side_g` | usage notes | Character breakdown, related forms, register, common collocations |

Card template:

```json
{
  "card_id": "card-0NN",
  "idx": NN-1,
  "name": "snake_case_label",
  "side_a": "...",
  "side_b": "...",
  "side_c": "...",
  "side_d": "...",
  "side_e": "...",
  "side_f": "...",
  "side_g": "...",
  "level": 1
}
```

Hard rules:

- `card_id` is `card-001`, `card-002`, … with leading zeros. `idx` is 0-based: `card-001` has `idx: 0`.
- `side_e` is **pinyin only** — no characters, no English. `side_f` is the English translation. **Never bundle** them. (This was a real bug in the travel deck — `side_e` had `pinyin / 中文 (translation)` jammed in. The audit script in step 4 catches it.)
- `side_g` should be a few useful sentences, not a wall of text. Cover: character breakdown, related forms (positive/negative, polite/casual, related compounds), and a related phrase. Keep it concise.
- All cards default to `"level": 1` unless you have a deliberate reason to bump less-common items.
- Map textbook POS abbreviations: `n` → `"noun"`, `v` → `"verb"`, `adj` → `"adjective"`, `adv` → `"adverb"`, `m` → `"measure word"`, `t` → `"time word"`, `vc` → `"verb-complement"`, `pn` → `"proper noun"`.

For example sentences, **prefer sentences that actually appear in the dialogue** — they sound natural and tie the vocab back to its source. The dialogue is also in the PDF, transcribed in pinyin a few pages after the Chinese version.

## 4. Validate

```bash
node -e "
const d = require('/abs/path/chinese_chpt<N>_<part>.json');
const bad = d.content.filter(c => { const e = c.side_e||''; return e.includes('/') || /[一-鿿]/.test(e); });
const noF = d.content.filter(c => !c.side_f);
const noG = d.content.filter(c => !c.side_g);
console.log('cards:', d.content.length, 'card_count:', d.metadata.card_count);
console.log('bundled side_e:', bad.length, 'missing side_f:', noF.length, 'missing side_g:', noG.length);
"
```

All three malformed-side counts must be `0`. Card count must match content length.

Then `npm run type-check` to catch any JSON parse error caught at compile time.

## 5. Register in the manifest

Append the new file at the **top** of `public/data/decks/manifest.json` (the file is sorted newest-first, and the home-page rendering expects newer chapters earlier in the list).

```json
[
  "chinese_chpt<N>_<part>.json",
  "chinese_chpt<N-or-prev>...json",
  ...
]
```

## 6. Audio (separate step — not always done at deck-creation time)

The deck JSON is functional without audio; per-card audio is generated separately via Speechify. See the `add-chinese-card` skill's audio section for the full recipe — same script, same voices:

- `_side_a.mp3` — English text, **male** voice (`yunfeng` / "Junjie")
- `_side_b.mp3` — Chinese characters, **female** voice (`xiaoxiao` / "Yarui")
- `_side_c.mp3` — copy of `_side_b.mp3`

Run after the Chrome CDP debug session is set up and Speechify is logged in:

```bash
node scripts/speechify-cdp-batch.mjs public/data/decks/chinese_chpt<N>_<part>.json
```

The script processes every card in the deck and skips ones that already have audio files, so it's safe to run on a partially-populated deck.

## 7. Commit

Conventional commit, no AI signature:

```bash
git add public/data/decks/chinese_chpt<N>_<part>.json \
        public/data/decks/manifest.json
git commit -m "feat(content): add Chinese Chapter <N> Part <part> deck"
git push
```

If you generated audio in step 6, include the `public/data/audio/words/chinese_chpt<N>_<part>_card*.mp3` files in the commit too.

## Common mistakes to avoid

- **Bundling `side_e`** — never put `Pinyin / 中文 / (translation)` in `side_e`. Each side has one job.
- **Off-by-one `idx`** — `card-001` has `idx: 0`, `card-002` has `idx: 1`. The script's audio-file naming uses `idx`, not the card number, so getting this wrong silently mismatches audio to cards.
- **Forgetting `card_count`** — must equal `content.length`. Bench scripts and the deck loader both check this.
- **Skipping Proper Nouns** — the textbook puts character names and zodiac labels in a separate sub-section. They're real vocab items and belong in the deck.
- **Including diagram floaters** — only the numbered items in the green VOCABULARY box are in scope. Annotation labels around illustrations are not.
- **Forgetting the manifest** — the deck file is on disk but the home page won't see it without a manifest entry. The home page renders strictly from the manifest order.

## Reference files

- Canonical card structure: `public/data/decks/chinese_chpt13_1.json` (or any other `chinese_chpt*.json`)
- Manifest: `public/data/decks/manifest.json`
- Speechify batch script: `scripts/speechify-cdp-batch.mjs`
- Single-card additions: see the `add-chinese-card` skill at `.claude/skills/add-chinese-card/SKILL.md`
