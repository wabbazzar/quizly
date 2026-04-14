# Ticket 014: Audio Mode for Flashcard and Learn Modes

## Metadata

- **Status**: Not Started
- **Priority**: High
- **Effort**: 18 points
- **Created**: 2026-02-11
- **Type**: feature
- **Platforms**: Both (PWA - iOS Safari, Android Chrome, Desktop browsers)

## User Stories

### Primary User Story

As a Chinese language learner, I want the app to play an audio pronunciation of each flashcard/question word so that I can train my listening comprehension alongside reading.

### Secondary User Stories

- As a learner studying Chinese characters, I want audio to auto-play when a new card appears so that I hear the pronunciation before I translate it.
- As a learner studying pinyin, I want audio to auto-play when a new question is shown so that I can associate the tonal sounds with the romanization.
- As a learner, I want to tap a speaker icon on any card to replay the audio on demand so that I can re-listen to a word I did not catch.
- As a learner, I want to toggle auto-play audio on or off in settings so that I can control whether audio plays automatically or only on tap.
- As a learner reviewing missed cards, I want audio to work the same way in missed-card rounds so that the experience is consistent.

## Technical Requirements

### Functional Requirements

1. **Per-card MP3 audio files**: Each of the ~445 cards across all 23 decks must have a corresponding MP3 audio file stored in `public/data/audio/words/`. Audio files are generated via ElevenLabs TTS for the Chinese character content (side_c) of each card.
2. **Audio file reference in deck data**: Each deck JSON file gains an optional `audio` field mapping card indices to audio filenames, enabling data-centric audio lookup without code changes when decks grow.
3. **Flashcard mode audio**: When `enableAudio` is `true` in flashcard settings AND the front side is Chinese (side_b pinyin or side_c characters), the app auto-plays the MP3 for the current card when it appears. A speaker icon is ALWAYS visible on the card front (regardless of `enableAudio`) so users can tap to hear audio on demand.
4. **Learn mode audio**: When `enableAudio` is `true` in learn settings AND the question side is Chinese (side_b or side_c), the app auto-plays the MP3 for the current question's card when the question appears. A speaker icon is ALWAYS visible next to the question text so users can tap to hear audio on demand.
5. **Direction restriction**: Audio auto-play and the speaker icon only activate when the "question" side is Chinese/Pinyin (side_b or side_c). When the question side is English (side_a), no audio is offered (this halves the MP3 generation work and aligns with the Chinese-to-English listening use case).
6. **Settings toggle**: The existing `enableAudio` boolean in `ModeSettings` (already present in types) controls auto-play. The toggle must appear in the UnifiedSettings modal for both flashcards and learn modes.
7. **On-demand replay**: Tapping the speaker icon replays the current card's audio regardless of auto-play setting.
8. **No change to answer input**: The answer/grading mechanism remains unchanged; audio is purely an additive presentation layer.

### Non-Functional Requirements

1. **Performance**: Audio files must be small (<50KB each, mono, 64kbps MP3) to keep total asset size under 25MB for all ~445 words. Preload the next card's audio while the current card is displayed.
2. **Accessibility**: Speaker icon must have `aria-label="Play pronunciation"`, be at least 44x44px touch target. Screen reader users hear the label and can activate it.
3. **Offline/PWA**: Audio files are cached by the service worker for offline access. They are static assets under `public/` and are cache-eligible by default.
4. **Error resilience**: If an audio file fails to load (404, network error), silently degrade -- hide the speaker icon for that card and skip auto-play. Never block the user flow with an audio error.
5. **Mobile Safari**: Use the `HTMLAudioElement` API with user-gesture considerations. iOS Safari requires the first `play()` call to originate from a user gesture. The implementation must handle this by "unlocking" audio on the first tap interaction.

## Implementation Plan

### Phase 1: Data Model and Audio File Infrastructure (3 points)

**Files to create/modify:**

- `src/types/index.ts` - Add `CardAudio` and `DeckAudio` types
- `public/data/decks/*.json` - Add `audio` field to each deck JSON
- `scripts/generate-card-audio-manifest.js` - Script to build audio mapping from files on disk

**Type Additions:**

```typescript
// Add to src/types/index.ts

/** Maps a card index to its audio filename */
export interface DeckAudio {
  /** Base path relative to public/data/audio/words/ */
  basePath: string;
  /** Map of card index to audio filename (without basePath prefix) */
  files: Record<number, string>;
}
```

**Deck JSON Schema Update:**

```json
{
  "id": "chinese_chpt1_1",
  "metadata": { ... },
  "content": [ ... ],
  "audio": {
    "basePath": "words/chinese_chpt1_1/",
    "files": {
      "0": "ni3.mp3",
      "1": "hao3.mp3",
      "2": "qing3.mp3"
    }
  }
}
```

**Audio file naming convention:**

- Directory: `public/data/audio/words/<deck_id>/`
- Filename: `<card_idx>_<pinyin_sanitized>.mp3` (e.g., `0_ni3.mp3`, `1_hao3.mp3`)
- Sanitized pinyin strips diacritics and replaces them with tone numbers for filesystem safety

**Manifest generation script:**

Create `scripts/generate-card-audio-manifest.js` that:
1. Scans `public/data/audio/words/` for per-deck directories
2. For each deck, reads the deck JSON to get card count
3. Matches audio files to card indices
4. Writes the `audio` field into each deck JSON
5. Reports missing audio files for any cards

**Implementation steps:**

1. Add `DeckAudio` interface to `src/types/index.ts`
2. Add optional `audio?: DeckAudio` field to the `Deck` interface
3. Create directory structure `public/data/audio/words/` with subdirectories per deck
4. Write `scripts/generate-card-audio-manifest.js`
5. Update `package.json` to add `"generate-audio-manifest": "node scripts/generate-card-audio-manifest.js"` script

**Code Implementation:**

1. Run: `claude --agent code-writer "Implement Phase 1 of ticket #014: Add DeckAudio type to src/types/index.ts, add audio field to Deck interface, and create scripts/generate-card-audio-manifest.js"`
2. Run: `claude --agent code-quality-assessor "Review the type additions and manifest script for ticket #014 Phase 1"`
3. Apply code quality improvements

**Testing:**

1. Run: `claude --agent test-writer "Write tests for scripts/generate-card-audio-manifest.js"`
2. Run: `claude --agent test-critic "Review tests for scripts/generate-card-audio-manifest.js"`
3. Run: `claude --agent test-writer "Implement critic's suggestions"`

**Commit**: `feat(audio): add DeckAudio type and audio manifest generation script`

---

### Phase 2: Generate MP3 Audio Files via ElevenLabs (5 points)

**Files to create/modify:**

- `scripts/generate-card-audio-tts.js` - ElevenLabs TTS generation script
- `public/data/audio/words/<deck_id>/*.mp3` - Generated audio files (~445 files)
- `public/data/decks/*.json` - Updated with audio field by manifest script

**ElevenLabs TTS Configuration (Multi-Voice):**

Two voices are used, alternating per card to provide variety and mimic natural multi-speaker exposure:

| Voice | Voice ID | Gender | Style |
|-------|----------|--------|-------|
| **Adam Li** | `hZTuv9Zqrq4yHYrEmF1r` | Male | Deep, Steady and Calm |
| **Amy** | `bhJUNIXWQQ94l8eI2VUf` | Female | Friendly, Young and Natural |

```javascript
// Voice configuration for word-level TTS
const VOICES = [
  { id: 'hZTuv9Zqrq4yHYrEmF1r', name: 'Adam Li' },  // male
  { id: 'bhJUNIXWQQ94l8eI2VUf', name: 'Amy' },        // female
];

const TTS_CONFIG = {
  model_id: 'eleven_multilingual_v2',
  speed: 0.85,        // Slightly slower for clarity on single words
  stability: 0.7,     // Stable pronunciation for individual vocabulary
  language: 'zh',
  output_format: 'mp3_22050_32', // 22050Hz sample rate, 32kbps - small files
};

// Voice assignment: alternate by card index within each deck
// Even-indexed cards → Adam Li, Odd-indexed cards → Amy
const getVoiceForCard = (cardIndex) => VOICES[cardIndex % VOICES.length];
```

**Generation script logic:**

```javascript
// scripts/generate-card-audio-tts.js
// For each deck:
//   For each card in deck.content:
//     1. Get the Chinese characters from side_c
//     2. If side_c is empty, skip (non-Chinese card)
//     3. Check if audio file already exists (skip if so, for idempotency)
//     4. Select voice: even card index → Adam Li, odd → Amy
//     5. Call ElevenLabs TTS MCP with the Chinese text and selected voice
//     6. Save MP3 to public/data/audio/words/<deck_id>/<idx>_<sanitized_pinyin>.mp3
//     7. Rate-limit: wait 200ms between calls to avoid API throttling
// After all files generated, run generate-card-audio-manifest.js to update deck JSONs
```

**Important considerations:**

- Use ElevenLabs MCP tool `text_to_speech` for generation
- Process decks sequentially, cards sequentially within each deck
- Alternate voices per card index (even = Adam Li, odd = Amy) for natural variety
- Log progress: `[12/445] chinese_chpt1_1 card 0: "你" (Adam Li) -> 0_ni3.mp3`
- Handle API errors with 3 retries and exponential backoff
- Total estimated API calls: ~445 (one per unique card, split ~50/50 between voices)
- Expected total audio size: ~445 files x ~15KB avg = ~6.7MB

**Implementation steps:**

1. Create `scripts/generate-card-audio-tts.js` with the above logic
2. Run the script to generate all ~445 MP3 files across 23 decks
3. Run `npm run generate-audio-manifest` to update all deck JSONs with audio fields
4. Verify all 445 cards have corresponding audio files
5. Spot-check 10 random audio files for correct pronunciation

**Code Implementation:**

1. Run: `claude --agent code-writer "Create scripts/generate-card-audio-tts.js for ticket #014 Phase 2 that generates MP3 files for all card Chinese characters using ElevenLabs TTS"`
2. Execute the TTS generation script (this is a long-running operation, ~15 minutes)
3. Run: `node scripts/generate-card-audio-manifest.js` to update deck JSONs
4. Verify file counts match card counts per deck

**Testing:**

1. Verify file count: `find public/data/audio/words -name "*.mp3" | wc -l` should equal ~445
2. Verify each deck JSON has a valid `audio` field with correct file count
3. Manually play 5 random files to verify audio quality

**Commit**: `feat(audio): generate MP3 pronunciation files for all 445 vocabulary cards`

---

### Phase 3: useCardAudio Hook and SpeakerButton Component (5 points)

**Files to create/modify:**

- `src/hooks/useCardAudio.ts` - New custom hook for card audio playback
- `src/components/common/SpeakerButton.tsx` - New speaker icon button component
- `src/components/common/SpeakerButton.module.css` - Styles for speaker button
- `src/components/icons/ModeIcons.tsx` - Add `SpeakerIcon` if not already present

**Hook Interface:**

```typescript
// src/hooks/useCardAudio.ts
import { useRef, useCallback, useState, useEffect } from 'react';
import { Card, Deck } from '@/types';

interface UseCardAudioOptions {
  /** The deck containing audio configuration */
  deck: Deck | null;
  /** The current card to play audio for */
  card: Card | null;
  /** Whether auto-play is enabled (from settings) */
  autoPlay: boolean;
  /** Which sides are displayed as the "question" (front) side */
  questionSides: string[];
}

interface UseCardAudioReturn {
  /** Play the current card's audio */
  play: () => void;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Whether audio is available for the current card */
  hasAudio: boolean;
  /** Whether the current question direction qualifies for audio (Chinese side shown) */
  isAudioEligible: boolean;
  /** Preload audio for a specific card index (for next-card preloading) */
  preloadCard: (cardIndex: number) => void;
}

export function useCardAudio(options: UseCardAudioOptions): UseCardAudioReturn {
  // Implementation:
  // 1. Determine if current card has audio (deck.audio.files[card.idx] exists)
  // 2. Determine if question side is Chinese (side_b or side_c in questionSides)
  // 3. Build audio URL: /data/audio/words/<basePath>/<filename>
  // 4. Use HTMLAudioElement for playback
  // 5. Handle iOS Safari audio unlock pattern
  // 6. Auto-play when card changes if autoPlay is true AND isAudioEligible
  // 7. Expose play() for on-demand replay
  // 8. Preload next card's audio for instant playback
  // 9. Clean up audio element on unmount
}
```

**SpeakerButton Component:**

```typescript
// src/components/common/SpeakerButton.tsx
import { FC, memo } from 'react';
import styles from './SpeakerButton.module.css';

interface SpeakerButtonProps {
  /** Callback to play audio */
  onPlay: () => void;
  /** Whether audio is currently playing (shows animated state) */
  isPlaying: boolean;
  /** Whether audio is available (hides button if false) */
  hasAudio: boolean;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Additional CSS class */
  className?: string;
}

export const SpeakerButton: FC<SpeakerButtonProps> = memo(({
  onPlay,
  isPlaying,
  hasAudio,
  size = 'medium',
  className,
}) => {
  if (!hasAudio) return null;

  return (
    <button
      className={/* styles based on size and isPlaying */}
      onClick={(e) => {
        e.stopPropagation(); // Prevent card flip on flashcards
        onPlay();
      }}
      aria-label={isPlaying ? 'Audio playing' : 'Play pronunciation'}
      type="button"
    >
      <SpeakerIcon size={size === 'small' ? 18 : size === 'large' ? 28 : 22} />
      {isPlaying && <span className={styles.playingIndicator} />}
    </button>
  );
});
```

**SpeakerButton CSS:**

```css
/* src/components/common/SpeakerButton.module.css */
.speakerButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.12), rgba(74, 144, 226, 0.06));
  border: 1.5px solid rgba(74, 144, 226, 0.25);
  border-radius: var(--radius-full);
  color: var(--primary-main);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  /* Minimum 44x44 touch target */
  min-width: 44px;
  min-height: 44px;
  padding: var(--space-2);
}

.speakerButton:hover {
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.2), rgba(74, 144, 226, 0.1));
  border-color: var(--primary-main);
}

.speakerButton:active {
  transform: scale(0.95);
}

.playing {
  color: var(--secondary-main);
  border-color: var(--secondary-main);
}

/* Animated sound waves while playing */
.playingIndicator {
  position: absolute;
  inset: -4px;
  border-radius: var(--radius-full);
  border: 2px solid var(--secondary-main);
  animation: pulse 1s ease-out infinite;
}

@keyframes pulse {
  0% { opacity: 0.8; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.3); }
}

/* Size variants */
.small { min-width: 36px; min-height: 36px; }
.large { min-width: 52px; min-height: 52px; }
```

**SpeakerIcon (add to ModeIcons.tsx):**

```typescript
export const SpeakerIcon: FC<IconProps> = ({ className, size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M11 5L6 9H2v6h4l5 4V5z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15.54 8.46a5 5 0 010 7.07"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19.07 4.93a10 10 0 010 14.14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
```

**Implementation steps:**

1. Add `SpeakerIcon` to `src/components/icons/ModeIcons.tsx`
2. Create `src/components/common/SpeakerButton.tsx` and its CSS module
3. Create `src/hooks/useCardAudio.ts` with full playback logic
4. Handle iOS Safari audio unlock: on first user interaction, create and play a silent audio buffer
5. Implement audio preloading for the next card
6. Handle error cases: missing audio files, network failures, decode errors

**iOS Safari Audio Unlock Pattern:**

```typescript
// Inside useCardAudio.ts
const unlockAudioRef = useRef(false);

const unlockAudio = useCallback(() => {
  if (unlockAudioRef.current) return;
  const audio = new Audio();
  audio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRBqmAAAAAAD/+1DEAAAB8ANoAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==';
  audio.volume = 0;
  audio.play().then(() => {
    unlockAudioRef.current = true;
    audio.remove();
  }).catch(() => { /* ignore */ });
}, []);
```

**Code Implementation:**

1. Run: `claude --agent code-writer "Implement Phase 3 of ticket #014: Create useCardAudio hook, SpeakerButton component, and SpeakerIcon for card-level audio playback"`
2. Run: `claude --agent code-quality-assessor "Review useCardAudio hook and SpeakerButton component for React best practices, memory leaks, and mobile compatibility"`
3. Apply code quality improvements

**Testing:**

1. Run: `claude --agent test-writer "Write tests for src/hooks/useCardAudio.ts and src/components/common/SpeakerButton.tsx"`
2. Run: `claude --agent test-critic "Review tests for useCardAudio and SpeakerButton"`
3. Run: `claude --agent test-writer "Implement critic's suggestions"`

**Platform Testing:**

```bash
# Build and test
npm run build
npm run preview
# Test on iOS Safari (audio unlock behavior)
# Test on Android Chrome (auto-play policies)
# Test on desktop Firefox and Chrome
```

**Commit**: `feat(audio): add useCardAudio hook and SpeakerButton component`

---

### Phase 4: Integrate Audio into Flashcard Mode (3 points)

**Files to modify:**

- `src/components/FlashCard.tsx` - Add SpeakerButton to card front
- `src/components/FlashCard.module.css` - Style speaker button positioning
- `src/pages/Flashcards.tsx` - Wire up useCardAudio hook, pass audio state to FlashCard
- `src/components/modals/UnifiedSettings.tsx` - Ensure enableAudio toggle shows for flashcards mode

**FlashCard.tsx Changes:**

```typescript
// Updated FlashCard props
interface FlashCardProps {
  card: Card;
  isFlipped: boolean;
  onFlip: () => void;
  frontSides?: string[];
  backSides?: string[];
  badgeText?: string;
  // NEW audio props
  hasAudio?: boolean;
  isAudioPlaying?: boolean;
  onPlayAudio?: () => void;
}
```

The SpeakerButton is placed in the top-right corner of the card front face, positioned absolutely so it does not interfere with the card content layout:

```css
/* Addition to FlashCard.module.css */
.audioButton {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  z-index: 2; /* Above card content, below flip transform */
}
```

**Flashcards.tsx Integration:**

```typescript
// Inside the Flashcards component, after deck validation:

const { play, isPlaying, hasAudio, isAudioEligible, preloadCard } = useCardAudio({
  deck: activeDeck,
  card: currentCard,
  autoPlay: settings.enableAudio && isAudioEligible,
  questionSides: frontSides,
});

// Preload next card audio when current card changes
useEffect(() => {
  if (activeDeck && cardOrder.length > 0) {
    const nextIndex = currentCardIndex + 1;
    if (nextIndex < cardOrder.length) {
      const nextCardIdx = cardOrder[nextIndex];
      preloadCard(nextCardIdx);
    }
  }
}, [currentCardIndex, cardOrder, activeDeck, preloadCard]);

// In the FlashCard render:
<FlashCard
  card={currentCard}
  isFlipped={isFlipped}
  onFlip={handleFlip}
  frontSides={frontSides}
  backSides={backSides}
  hasAudio={hasAudio && isAudioEligible}
  isAudioPlaying={isPlaying}
  onPlayAudio={play}
/>
```

**Settings integration:**

The `enableAudio` field already exists on `ModeSettings` and `FlashcardsSettings`. Ensure the UnifiedSettings modal for flashcards mode renders an "Auto-play Audio" toggle in an Audio section. The toggle must:
- Only appear when the deck has audio data (`deck.audio` is defined)
- Show descriptive text: "Automatically play word pronunciation when a new card appears"
- Indicate that the speaker icon is always available regardless of this toggle

**Implementation steps:**

1. Update `FlashCardProps` in `src/components/FlashCard.tsx` to accept audio props
2. Add `SpeakerButton` to the card front face in FlashCard
3. Add CSS for speaker button positioning on the card
4. Wire `useCardAudio` into `src/pages/Flashcards.tsx`
5. Pass audio props from Flashcards page to FlashCard component
6. Add audio preloading for the next card
7. Verify `enableAudio` toggle appears in UnifiedSettings for flashcards
8. Add an "Audio" settings section to `UnifiedSettings.tsx` for flashcards mode that controls `enableAudio`
9. Test: speaker button must NOT trigger card flip (use `e.stopPropagation()`)
10. Test: audio auto-plays on card change when enabled
11. Test: audio does NOT auto-play when `enableAudio` is false
12. Test: speaker icon visible and functional even when auto-play is off

**Code Implementation:**

1. Run: `claude --agent code-writer "Implement Phase 4 of ticket #014: Integrate useCardAudio hook and SpeakerButton into Flashcards mode following the specifications"`
2. Run: `claude --agent code-quality-assessor "Review the Flashcard audio integration for event handling (stopPropagation), memory leaks, and mobile UX"`
3. Apply code quality improvements

**Testing:**

1. Run: `claude --agent test-writer "Write tests for FlashCard audio integration and Flashcards page audio behavior"`
2. Run: `claude --agent test-critic "Review tests for FlashCard audio integration"`
3. Run: `claude --agent test-writer "Implement critic's suggestions"`

**Platform Testing:**

```bash
npm run dev
# Navigate to /flashcards/chinese_chpt1_1
# Test 1: With front sides = side_c (characters) - audio icon should appear
# Test 2: With front sides = side_a (english) - no audio icon
# Test 3: Tap speaker icon - audio plays, card does NOT flip
# Test 4: Enable auto-play in settings - audio plays on card change
# Test 5: Disable auto-play - audio only plays on speaker tap
# Test 6: Swipe to next card - audio preloaded, plays instantly
```

**Commit**: `feat(flashcards): integrate card audio playback with speaker button`

---

### Phase 5: Integrate Audio into Learn Mode (2 points)

**Files to modify:**

- `src/components/modes/learn/QuestionCard.tsx` - Add SpeakerButton next to question text
- `src/components/modes/learn/QuestionCard.module.css` - Style speaker button in question header
- `src/components/modes/learn/LearnContainer.tsx` - Wire up useCardAudio hook
- `src/components/modes/learn/components/QuestionFlow.tsx` - Pass audio props through

**QuestionCard.tsx Changes:**

```typescript
interface QuestionCardProps {
  question: Question;
  card?: Card;
  onAnswer: (answer: string, isCorrect: boolean) => void;
  showFeedback: boolean;
  feedback?: { ... };
  disabled?: boolean;
  onShowCardDetails?: () => void;
  // NEW audio props
  hasAudio?: boolean;
  isAudioPlaying?: boolean;
  onPlayAudio?: () => void;
}
```

The speaker button is placed inline within the question header, right-aligned next to the question text:

```css
/* Addition to QuestionCard.module.css */
.questionHeader {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}

.questionText {
  flex: 1;
}

.audioButtonWrapper {
  flex-shrink: 0;
  margin-top: var(--space-1);
}
```

**LearnContainer.tsx Integration:**

```typescript
// Inside LearnContainer, after currentCard state:

const { play, isPlaying, hasAudio, isAudioEligible, preloadCard } = useCardAudio({
  deck,
  card: currentCard,
  autoPlay: settings.enableAudio,
  questionSides: settings.questionSides,
});

// Pass audio props through QuestionFlow to QuestionCard
```

**QuestionFlow.tsx must be updated** to accept and pass through audio props:

```typescript
interface QuestionFlowProps {
  // ... existing props
  hasAudio?: boolean;
  isAudioPlaying?: boolean;
  onPlayAudio?: () => void;
}
```

**Settings integration:**

Similar to flashcards, ensure the UnifiedSettings modal for learn mode renders the "Auto-play Audio" toggle. The toggle should only appear when `deck.audio` is defined.

**Implementation steps:**

1. Update `QuestionCardProps` to accept audio props
2. Add `SpeakerButton` to `QuestionCard` question header
3. Style the speaker button inline with the question text
4. Wire `useCardAudio` into `LearnContainer.tsx`
5. Update `QuestionFlow.tsx` to pass audio props through to QuestionCard
6. Add "Audio" settings section to UnifiedSettings for learn mode
7. Test: speaker button visible when question side is Chinese
8. Test: audio auto-plays on new question when enabled
9. Test: speaker button hidden when question side is English
10. Test: audio does NOT interfere with answer input focus

**Code Implementation:**

1. Run: `claude --agent code-writer "Implement Phase 5 of ticket #014: Integrate useCardAudio hook and SpeakerButton into Learn mode QuestionCard and LearnContainer"`
2. Run: `claude --agent code-quality-assessor "Review the Learn mode audio integration for prop drilling, event handling, and mobile UX"`
3. Apply code quality improvements

**Testing:**

1. Run: `claude --agent test-writer "Write tests for QuestionCard audio integration and LearnContainer audio behavior"`
2. Run: `claude --agent test-critic "Review tests for Learn mode audio"`
3. Run: `claude --agent test-writer "Implement critic's suggestions"`

**Platform Testing:**

```bash
npm run dev
# Navigate to /learn/chinese_chpt1_1
# Test 1: With question side = side_c (characters) - speaker icon appears
# Test 2: With question side = side_a (english) - no speaker icon
# Test 3: Tap speaker icon - audio plays, does NOT submit answer
# Test 4: Enable auto-play - audio plays when new question appears
# Test 5: Free text input stays focused after audio plays
# Test 6: Multiple choice - audio plays, then user can select option normally
```

**Commit**: `feat(learn): integrate card audio playback with speaker button in question cards`

---

## Testing Strategy

### Unit Tests

- Test file: `__tests__/hooks/useCardAudio.test.ts`
- Key scenarios:
  - Returns `hasAudio: false` when deck has no audio field
  - Returns `hasAudio: true` when deck has audio for current card
  - Returns `isAudioEligible: true` only when question sides include side_b or side_c
  - Returns `isAudioEligible: false` when question sides are only side_a
  - Calls `HTMLAudioElement.play()` when autoPlay is true and card changes
  - Does NOT call play when autoPlay is false
  - Handles play() promise rejection gracefully (iOS autoplay restrictions)
  - Preloads next card audio by setting `src` without calling play

- Test file: `__tests__/components/SpeakerButton.test.tsx`
- Key scenarios:
  - Renders nothing when `hasAudio` is false
  - Renders button when `hasAudio` is true
  - Calls `onPlay` when clicked
  - Calls `e.stopPropagation()` on click
  - Shows playing indicator animation when `isPlaying` is true
  - Has correct aria-label for accessibility
  - Meets 44x44px minimum touch target

### Component Tests

```typescript
describe('FlashCard with audio', () => {
  it('should show speaker button when hasAudio is true and front side is Chinese', () => {
    render(
      <FlashCard
        card={mockCard}
        isFlipped={false}
        onFlip={jest.fn()}
        frontSides={['side_c']}
        backSides={['side_a']}
        hasAudio={true}
        isAudioPlaying={false}
        onPlayAudio={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /play pronunciation/i })).toBeInTheDocument();
  });

  it('should not show speaker button when hasAudio is false', () => {
    render(
      <FlashCard
        card={mockCard}
        isFlipped={false}
        onFlip={jest.fn()}
        hasAudio={false}
        onPlayAudio={jest.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: /play pronunciation/i })).not.toBeInTheDocument();
  });

  it('should not trigger flip when speaker button is clicked', () => {
    const flipFn = jest.fn();
    render(
      <FlashCard
        card={mockCard}
        isFlipped={false}
        onFlip={flipFn}
        frontSides={['side_c']}
        hasAudio={true}
        onPlayAudio={jest.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /play pronunciation/i }));
    expect(flipFn).not.toHaveBeenCalled();
  });
});

describe('QuestionCard with audio', () => {
  it('should show speaker button in question header when hasAudio is true', () => {
    render(
      <QuestionCard
        question={mockQuestion}
        onAnswer={jest.fn()}
        showFeedback={false}
        hasAudio={true}
        isAudioPlaying={false}
        onPlayAudio={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /play pronunciation/i })).toBeInTheDocument();
  });
});
```

### Integration Tests

- User flow: Navigate to flashcards -> verify speaker icon -> tap speaker -> hear audio -> swipe card -> next card auto-plays
- User flow: Navigate to learn -> answer multiple choice with audio -> verify audio plays for each question
- Settings flow: Open settings -> toggle audio on -> close settings -> verify auto-play behavior changes
- Reload resilience: Navigate to flashcards -> reload page -> verify audio still works after deck rehydration
- Error resilience: Simulate missing audio file (404) -> verify card still works without audio

### Performance Tests

- Audio preload: Measure time between card change and audio playback start (<200ms target)
- Memory: Verify audio elements are properly cleaned up on unmount (no leaks)
- Bundle size: Verify no impact on JS bundle (audio files are static assets, not bundled)
- Total audio asset size: Must remain under 25MB for all ~445 files

## Platform-Specific Considerations

### iOS Safari

- **Audio autoplay restriction**: iOS Safari blocks `audio.play()` calls that do not originate from a user gesture. The implementation uses an "unlock" pattern where the first user tap on any interactive element plays a silent audio buffer, unlocking the audio context for subsequent programmatic plays.
- **HTMLAudioElement lifecycle**: Create a single shared `Audio` instance and swap its `src` rather than creating new instances per card (prevents memory leaks on iOS).
- **Safe area handling**: SpeakerButton uses existing card padding and does not need additional safe area insets.

### Android Chrome

- **Autoplay policy**: Chrome on Android is more lenient than Safari but still may block autoplay. The unlock pattern handles this consistently.
- **Back button**: No changes needed; audio stops on navigation by default (audio element cleanup on unmount).

### Desktop Browsers

- **Autoplay**: Most desktop browsers allow autoplay after a user gesture on the page. The unlock pattern ensures cross-browser compatibility.
- **Keyboard shortcuts**: Consider adding a keyboard shortcut (e.g., 'A' key) to replay audio in flashcards mode.

## Documentation Updates Required

1. `docs/spec.md` - Add Audio Mode section documenting:
   - DeckAudio type and data structure
   - Audio file storage conventions
   - Audio eligibility rules (Chinese side only)
   - Settings toggle behavior
   - ElevenLabs multi-voice configuration (Adam Li + Amy, alternating per card)
2. In-code documentation:
   - `useCardAudio.ts` - JSDoc explaining the hook's behavior, iOS unlock pattern, and preloading strategy
   - `SpeakerButton.tsx` - JSDoc explaining props and accessibility requirements
   - `scripts/generate-card-audio-tts.js` - Header comment explaining usage and ElevenLabs configuration

## Success Criteria

1. All ~445 vocabulary cards have corresponding MP3 audio files that play correctly
2. Speaker icon is visible on every flashcard front face when question side is Chinese (side_b or side_c)
3. Speaker icon is visible on every learn mode question when question side is Chinese
4. Tapping speaker icon plays audio without triggering card flip or answer submission
5. Auto-play toggle in settings controls automatic playback on card/question change
6. Audio works on iOS Safari, Android Chrome, and desktop Chrome/Firefox
7. Audio preloading ensures <200ms latency between card change and playback start
8. Total audio asset size is under 25MB
9. Missing audio files degrade gracefully without blocking the user flow
10. No memory leaks from audio elements (verified via DevTools)

## Dependencies

- **ElevenLabs MCP**: Required for Phase 2 to generate TTS audio files. Must have API access and sufficient credits (~445 API calls).
- **No new NPM packages**: Uses native `HTMLAudioElement` API, no additional dependencies needed.
- **No other tickets required**: This feature is self-contained and can be implemented independently.

## Risks & Mitigations

1. **Risk**: iOS Safari blocks autoplay even after unlock attempt
   **Mitigation**: The speaker button always provides manual playback as a fallback. Autoplay is a progressive enhancement.

2. **Risk**: ElevenLabs API rate limiting during bulk generation
   **Mitigation**: Built-in 200ms delay between calls, 3 retries with exponential backoff, idempotent script (skips existing files).

3. **Risk**: Audio files increase PWA cache size significantly
   **Mitigation**: Use low-bitrate MP3 (32kbps, mono, 22050Hz). Expected total ~6.7MB is well within PWA cache limits. Service worker can use cache-first strategy for audio.

4. **Risk**: Audio playback interferes with user input focus (especially free text in learn mode)
   **Mitigation**: Audio playback does not steal focus. The `play()` call is fire-and-forget and does not modify DOM focus.

5. **Risk**: Some Chinese characters may have multiple valid pronunciations (polyphonic characters)
   **Mitigation**: Use the pinyin from side_b as the canonical pronunciation. The TTS script sends the Chinese characters but the context of the word definition should guide ElevenLabs toward the correct pronunciation. Manual review of polyphonic characters (e.g., 了, 地, 得) is recommended.

## Accessibility Requirements

- Speaker button has `aria-label="Play pronunciation"` (changes to `"Audio playing"` during playback)
- Minimum touch target size: 44x44px (enforced in CSS)
- Speaker button is keyboard-focusable and activatable with Enter/Space
- Screen reader announces button state changes
- Audio does not auto-play for screen reader users unless they have explicitly enabled the setting (respects `prefers-reduced-motion` by disabling auto-play)
- High contrast mode: Speaker icon inherits `currentColor` and works in all themes

## Release & Deployment Guide

### Build Configuration

- No app version change needed (feature is purely additive)
- No environment variables needed (audio files are static assets)
- Feature is always available; `enableAudio` defaults to `false` so it is opt-in

### Testing Checklist

- [ ] Unit tests passing for `useCardAudio`, `SpeakerButton`
- [ ] Component tests passing for `FlashCard` with audio props, `QuestionCard` with audio props
- [ ] Integration test: flashcards flow with audio
- [ ] Integration test: learn flow with audio
- [ ] Manual testing on iOS Safari (audio unlock, autoplay)
- [ ] Manual testing on Android Chrome (autoplay policy)
- [ ] Manual testing on desktop Chrome and Firefox
- [ ] All ~445 audio files present and playable
- [ ] Total audio size verified under 25MB
- [ ] Memory leak check via DevTools (audio element cleanup)
- [ ] Accessibility audit: screen reader, keyboard navigation, touch targets
- [ ] Settings toggle works and persists across sessions
- [ ] Graceful degradation when audio file is missing (404)

### Release Process

1. Merge feature branch to main
2. Run full test suite: `npm test`
3. Build: `npm run build`
4. Verify audio files are included in build output (`dist/data/audio/words/`)
5. Deploy to staging
6. Test on real iOS and Android devices
7. Deploy to production

### Rollback Strategy

- The `enableAudio` setting defaults to `false`, so the feature is invisible to users who have not opted in
- Audio files in `public/data/audio/words/` can be removed without affecting any other functionality
- The `audio` field in deck JSONs is optional and ignored by all existing code
- To fully roll back: revert the code changes and delete the audio files directory

## Mobile-Specific Implementation Details

### Audio Element Management

```typescript
// Use a singleton audio element to avoid iOS memory issues
let sharedAudioElement: HTMLAudioElement | null = null;

function getAudioElement(): HTMLAudioElement {
  if (!sharedAudioElement) {
    sharedAudioElement = new Audio();
    sharedAudioElement.preload = 'auto';
  }
  return sharedAudioElement;
}

// For preloading, use a separate element
let preloadAudioElement: HTMLAudioElement | null = null;

function getPreloadElement(): HTMLAudioElement {
  if (!preloadAudioElement) {
    preloadAudioElement = new Audio();
    preloadAudioElement.preload = 'auto';
    preloadAudioElement.volume = 0;
  }
  return preloadAudioElement;
}
```

### Audio URL Construction

```typescript
function getCardAudioUrl(deck: Deck, cardIndex: number): string | null {
  if (!deck.audio?.files?.[cardIndex]) return null;
  const basePath = deck.audio.basePath || '';
  const filename = deck.audio.files[cardIndex];
  // Use import.meta.env.BASE_URL for GitHub Pages compatibility
  return `${import.meta.env.BASE_URL}data/audio/${basePath}${filename}`;
}
```

### Error Handling

```typescript
// Graceful error handling for audio playback
const playAudio = useCallback(async () => {
  const url = getCardAudioUrl(deck, card.idx);
  if (!url) return;

  const audio = getAudioElement();
  audio.src = url;

  try {
    await audio.play();
    setIsPlaying(true);
  } catch (error) {
    // DOMException: play() request interrupted or not allowed
    // This is expected on iOS before user gesture unlock
    console.debug('Audio playback skipped:', (error as Error).message);
    setIsPlaying(false);
  }
}, [deck, card]);
```

### Performance Optimizations

- Use `React.memo` for `SpeakerButton` to prevent unnecessary re-renders
- Audio preloading uses a separate `Audio` element so it does not interrupt current playback
- The `useCardAudio` hook uses `useRef` for audio elements to avoid re-creating them on re-renders
- Audio URLs are memoized with `useMemo` based on deck and card index
