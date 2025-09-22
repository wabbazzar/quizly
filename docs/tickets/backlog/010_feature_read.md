# Ticket 010: Read Mode — Structured Reading and Translation

## Metadata

- **Status**: Not Started
- **Priority**: High
- **Effort**: 5–8 points
- **Created**: 2025-09-22
- **Type**: feature
- **Platforms**: Web

## User Stories

- **Primary**: As a language learner, I want a Read mode that presents deck-specific dialogues as structured stories so I can translate line-by-line and build reading comprehension.
- **Toggle pinyin**: As a learner, I want to reveal/hide pinyin per line to assist when characters are hard.
- **Toggle English**: As a learner, I want to reveal/hide the English translation to check my understanding after attempting a line.
- **Progress**: As a learner, I want my place saved within a dialogue so I can resume later.

## Acceptance Criteria

- **Deck fallback**: If a deck has `reading.dialogues`, the Read mode is available at `/deck/:id/read`; if not, the UI shows an informative empty state with a CTA to go back.
- **Dialogue list**: The page lists available dialogues by key (e.g., `dialogue1`, `dialogue2`, `dialogue3`) with friendly titles.
 - **Token-centric view**: Selected dialogue renders lines split into tokens (word/character level). Default view shows characters; pinyin/English can be revealed per token.
 - **Translate workflow**: The practice unit is a token. The user answers for the current token (free-text or MC depending on settings), then can reveal the official translation for that token.
- **Keyboard support**: Up/Down or J/K navigate lines; Enter reveals next hint; R toggles pinyin; T toggles English.
- **Persistence**: Current dialogue and line index persist per deck (e.g., in store) and restore on revisit.
- **Non-breaking**: Existing deck loading and modes are unaffected; decks without `reading` still load.
- **Settings toggles**: Read mode settings include:
  - Checking mode: Live (check as you type) vs Wait (check on submit/reveal)
  - Answer type: Free text vs Multiple choice (default 4 options)
  - Translation direction: generic side-to-side (e.g., a→b, a→c), labeled via the deck's `reading.sides` mapping
  - Multiple-choice difficulty: easy, medium, hard (affects distractor pool)
  - Direction options are constrained to sides present for the current deck (from `reading.sides`).
 - **Tokenization config**: If the deck provides `reading.tokenization`, it is respected. If absent, app falls back to defaults (characters=character, pinyin=space, english=space, preservePunctuation=true).

## Technical Requirements

### Data Model

- Extend deck type definitions to optionally include reading content. Add interfaces in `src/types/index.ts`.

```typescript
export type SideId = 'a' | 'b' | 'c' | 'd' | 'e' | 'f';
export type TokenUnit = 'character' | 'word' | 'space';

export interface ReadingSidesMap {
  // Human-readable labels (e.g., characters/pinyin/english, or STEM-specific labels)
  [side in SideId]?: string;
}

export interface ReadingTokenizationConfig {
  // Per-side tokenization unit
  unit: Record<SideId, TokenUnit | undefined>;
  preservePunctuation: boolean;
  alignment?: 'index'; // hint; explicit per-line alignments are optional
}

export interface ReadingLine {
  // Generic sides
  a?: string;
  b?: string;
  c?: string;
  d?: string;
  e?: string;
  f?: string;
  // Optional explicit token alignment entries, deferred by default
  // Example unified mapping entries: { a?: number; b?: number; c?: number }
  alignments?: Array<Partial<Record<SideId, number>>>;
}

export interface DeckReadingDialogue {
  lines: ReadingLine[];
}

export interface DeckReading {
  sides?: ReadingSidesMap; // e.g., { a: 'characters', b: 'pinyin', c: 'english' }
  tokenization?: ReadingTokenizationConfig;
  dialogues: Record<string, DeckReadingDialogue>;
}

export type ReadAnswerType = 'free_text' | 'multiple_choice';
export type ReadCheckMode = 'live' | 'wait';

export interface ReadTranslationDirection {
  from: SideId; // e.g., 'a'
  to: SideId;   // e.g., 'c'
}

export type ReadUnit = 'character' | 'word';

export interface ReadModeSettings {
  answerType: ReadAnswerType;
  checkMode: ReadCheckMode;
  translationDirection: ReadTranslationDirection; // side-to-side
  optionsCount?: number; // for multiple choice (default 4)
  showPinyinDefault: boolean;
  multipleChoiceDifficulty?: 'easy' | 'medium' | 'hard';
  unit: ReadUnit; // UI preference: characters vs words when tokenizing side 'a' by default
}

### Tokenization & Alignment

- Implement a tokenizer utility (`src/utils/tokenize.ts`) to produce token arrays per line, using deck-provided `reading.tokenization.unit` per side when available:
  - Each side is tokenized according to its declared unit (e.g., side 'a' = character; side 'b'/'c' = space).
  - Normalize casing/spacing for Latin-based sides.
  - Provide `Token { text: string; start: number; end: number }` and `LineTokens { characters: Token[]; pinyin?: Token[]; english?: Token[] }`.
- Alignment strategy (initial):
  - If `line.alignments` present, use it for cross-side mapping.
  - Else, index-aligned by heuristic when lengths are close; otherwise, independent token practice (no strict cross-side alignment).
  - Alignment maps are deferred; schema supported but optional.

export interface Deck {
  id: string;
  metadata: DeckMetadata;
  content: Card[];
  reading?: DeckReading; // NEW optional field
}
```

- Update loader to pass through `reading` when present.
  - File: `src/utils/deckLoader.ts`
  - If `rawDeck.reading?.dialogues` is an object, attach as-is along with `reading.sides` and `reading.tokenization`.
  - Validate that each dialogue contains `lines` with one or more side strings (e.g., `a`, `b`, `c`); ignore malformed entries.

### Routing & Navigation

- Add route: `/read/:deckId` in `src/router/AppRouter.tsx`.
- Update lazy imports: register `LazyRead` in `src/utils/lazyImports.ts` and preload if needed.
- Expose a Read mode entry wherever modes are listed (deck overview and mode cards):
  - `src/pages/Deck.tsx` — add a new mode card for Read linking to `/read/:deckId`
  - `src/components/EnhancedDeckCard.tsx` — add Read to the `modes` list

### Page & Components

- Create `src/pages/Read.tsx` (page-level container):
  - Loads active deck; guards when `reading` is absent.
  - Left pane: dialogue picker; Right pane: line and token reader (current token highlighted within its line).
  - Settings panel: toggles for pinyin default, answer type (free text vs MC), checking mode (live vs wait), translation direction, token unit (character vs word), font size.

- Create components in `src/components/read/`:
  - `ReadDialoguePicker.tsx`: Lists dialogues with progress for each (lines completed/total).
  - `ReadLine.tsx`: Renders a single line split into tokens; token-level reveal toggles and focus state.
  - `ReadToken.tsx`: Handles token-level quiz UI (free-text input or MC options) and reveal for pinyin/English per token.
  - `ReadControls.tsx`: Navigation and visibility controls (prev/next line, reveal pinyin/English).
  - `ReadProgress.tsx`: Shows overall progress within dialogue.

### Unified Settings Integration

- Extend modal to support Read mode:
  - `src/components/modals/UnifiedSettings.tsx`
    - Update `getConfigForMode` to add a `read` entry with a new section `ReadSettings`.
    - Add validation rules for fields: `optionsCount >= 2`, `translationDirection.from !== translationDirection.to`, `multipleChoiceDifficulty` in ['easy','medium','hard'], and both `translationDirection.from/to` exist in the deck's `reading.sides`.
    - Ensure `persistenceKey` becomes `unified-settings-read` for Read mode.
  - Create `src/components/modals/settings/ReadSettings.tsx`:
    - Controls: answer type, check mode, translation direction (side-to-side, built from deck `reading.sides`), options count, MC difficulty, showPinyinDefault, unit.
    - Build direction options dynamically from sides present in `reading.sides`; hide/disable sides that are not present.
    - If only one side is available for the deck, hide the translation direction control.
    - If a previously saved direction is invalid for the current deck, auto-correct to a valid default and notify subtly (tooltip/toast optional).

### Store

- Add a small slice to persist per-deck read progress and settings.
  - File: `src/store/deckStore.ts` (or new `src/store/readStore.ts` if preferred):
    - `readProgress[deckId]: { dialogueId: string; lineIndex: number; settings: ReadModeSettings }`
    - Actions: `setReadDialogue(dialogueId)`, `setReadLineIndex(idx)`, `setReadSettings(partialSettings)`.

- Integrate with unified settings store:
  - `src/store/settingsStore.ts`
    - Add `readSettings: Record<string, ReadModeSettings>` to store.
    - Update `getDefaultSettings` to include sensible defaults for `read` (see Defaults below).
    - Update `getSettingsForMode` and `updateSettings` to handle mode `'read'`.

### Multiple-Choice Distractor Generation

- Difficulty-controlled distractor pools (mode-dependent, token-level):
  - `easy`: sample distractor tokens from the same line (target side) as the correct token.
  - `medium`: sample tokens from the same dialogue block (target side) as the current token.
  - `hard`: sample tokens from any dialogue across the deck’s `reading.dialogues` (target side).
- Target side depends on `translationDirection`:
  - Options are from the target side in `translationDirection.to` (e.g., if a→c, options from side 'c').
- Ensure:
  - Exactly one correct option; no duplicates; default total options = 4.
  - If pool underflows, backfill from wider scope (line → dialogue → all dialogues) and finally from deck vocabulary (`content`).
  - Basic normalization (trim, collapse whitespace, lowercase for Latin) when comparing for uniqueness.
  - For Chinese tokenization, if word boundaries are unclear, fall back to single-character tokens; prefer deck `content` mappings when side text matches.

### Settings & UX

- Add Read-mode defaults to unified settings UI if present:
  - Pinyin default (on/off)
  - Answer type (free text vs multiple choice)
  - Checking mode (live vs wait)
  - Translation direction (side-to-side; options constrained to `reading.sides`)
  - Token unit (character vs word)
- Keyboard: J/K or Up/Down to navigate; Enter to reveal next hint; R for pinyin; T for English.
- Accessibility: Ensure toggles and navigation are accessible via screen readers and keyboard.

Defaults:
- answerType: `free_text`
- checkMode: `wait`
- translationDirection: choose first two available sides in order preference: if deck maps { a, b, c }, default to a→c; otherwise a→b; otherwise b→a.
- optionsCount: `4`
- showPinyinDefault: `off`
- multipleChoiceDifficulty: `medium`
- unit: `character`

### Validation & Error Handling

- In loader, when all three arrays exist, validate equal lengths; log a warning and gracefully skip inconsistent rows.
- If only `characters` exists, render characters and allow user translation with no pinyin/English to reveal.

### Analytics (optional)

- Track how many lines are attempted and revealed; do not store user free-text content.

## Files to Create/Modify

- `src/types/index.ts` — Add `DeckReadingDialogue`, `DeckReading`, and optional `reading` on `Deck`.
- `src/utils/deckLoader.ts` — Pass through `reading` when present with light validation.
- `src/router/AppRouter.tsx` — Add route for Read mode.
- `src/utils/lazyImports.ts` — Register `LazyRead`.
- `src/pages/Read.tsx` — New page for Read mode.
- `src/components/read/ReadDialoguePicker.tsx`
- `src/components/read/ReadLine.tsx`
- `src/components/read/ReadControls.tsx`
- `src/components/read/ReadProgress.tsx`
- `src/store/deckStore.ts` (or new `src/store/readStore.ts`) — Persist dialogue and line progress.
- `src/components/modals/UnifiedSettings.tsx` — Add mode config for Read.
- `src/components/modals/settings/ReadSettings.tsx` — New settings section.
- `src/store/settingsStore.ts` — Support read mode persistence and defaults.
- `src/pages/Deck.tsx` & `src/components/EnhancedDeckCard.tsx` — Add Read mode card.

## Non-Goals / Out of Scope (for this ticket)

- Text-to-speech or audio playback.
- Advanced grading for free-text beyond simple similarity/normalization; start with self-grade or basic exact/lenient match.
- SRS integration of dialogues into mastery progression.

## QA Checklist

- Deck without `reading` loads normally; Read mode not shown.
- `public/data/decks/chinese_chpt9.json` Read mode shows three dialogues and tokenized rendering.
- Toggling pinyin/English works per token without affecting other tokens.
- Progress is persisted and restored after reload (dialogue, line, and token index).
- Keyboard shortcuts work and are documented in UI tooltips.
 - Settings toggle correctly changes behavior at runtime: live vs wait, free text vs MC, and translation direction.
 - Multiple choice shows 4 options by default and exactly one correct answer.
 - MC difficulty affects distractor scope: easy (same line), medium (same dialogue block), hard (any dialogue).
 - When pinyin/english lines are missing for a deck, MC for that direction gracefully disables or falls back with a user message.
 - Translation direction dropdown only shows sides present in `reading.sides` for the current deck; invalid saved values are auto-corrected to a valid default.

## Open Questions

1. Should Read mode use free-text input with lightweight auto-check (normalized string compare) or rely on self-grading after reveal by default?
2. What is the default translation direction (characters→English, English→characters, or configurable)?
3. Do we need per-line notes or bookmarks for later review?
4. Should Read mode contribute to deck mastery/progress metrics?
