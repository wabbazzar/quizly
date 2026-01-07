# Ticket 012: Transcript Reader Feature

## Metadata

- **Status**: Not Started
- **Priority**: Medium
- **Effort**: 8 points
- **Created**: 2026-01-06
- **Type**: feature
- **Platforms**: Web (PWA)

## User Stories

### Primary User Story

As a language learner, I want to view and copy raw transcript text files so that I can paste them into external text-to-speech readers like Speechify for listening practice.

### Secondary User Stories

- As a user, I want the sidebar in Read mode to clearly distinguish between interactive practice (game mode) and passive reading (transcripts) so that I can choose the appropriate study method.
- As a user, I want transcripts to be automatically associated with the current deck so that I only see relevant content.
- As a user, I want to easily copy entire transcript contents with one click so that I can quickly transfer text to external tools.
- As a user, I want a comfortable reading experience for long text so that I can review transcript content in-app.

## Technical Requirements

### Functional Requirements

1. **Rename "Dialogues" to "Practice"** in `ReadDialoguePicker.tsx` sidebar title
2. **Add new "Transcripts" section** below the Practice section in the left sidebar
3. **Auto-discover transcript files** matching pattern `{deckId}_*.txt` in `public/data/transcripts/`
4. **Display transcript types**: "Phrases" and "Dialogue" based on file suffix
5. **Open transcript in modal** when clicked - large, scrollable view optimized for reading
6. **Copy button** in modal header to copy all transcript text to clipboard
7. **Rename existing transcript files** to match deck ID naming convention

### Non-Functional Requirements

1. Performance: Transcript loading should complete in <500ms
2. Accessibility: Modal must be keyboard navigable, copy button must have ARIA labels
3. Mobile: Modal must be fullscreen on mobile devices with easy scrolling
4. UX: Copy action must provide visual feedback (success notification)

## Implementation Plan

### Phase 1: File Renaming and Type Definitions (1 point)

**Files to modify:**

- `public/data/transcripts/chapter_9_dialogue.txt` -> `public/data/transcripts/chinese_chpt9_2_dialogue.txt`
- `public/data/transcripts/chapter_9_phrases.txt` -> `public/data/transcripts/chinese_chpt9_2_phrases.txt`
- `public/data/transcripts/chapter_10_dialogue.txt` -> `public/data/transcripts/chinese_chpt10_2_dialogue.txt`
- `public/data/transcripts/chapter_10_phrases.txt` -> `public/data/transcripts/chinese_chpt10_2_phrases.txt`
- `src/types/index.ts` - Add transcript types

**Type Definitions:**

```typescript
// Add to src/types/index.ts

export type TranscriptType = 'dialogue' | 'phrases';

export interface TranscriptFile {
  id: string;           // e.g., "chinese_chpt9_2_dialogue"
  deckId: string;       // e.g., "chinese_chpt9_2"
  type: TranscriptType; // "dialogue" or "phrases"
  filename: string;     // e.g., "chinese_chpt9_2_dialogue.txt"
  displayName: string;  // e.g., "Dialogue" or "Phrases"
}

export interface TranscriptManifest {
  transcripts: TranscriptFile[];
  generatedAt: string;
}
```

**Implementation steps:**

1. Rename the four transcript files using git mv
2. Add `TranscriptFile`, `TranscriptType`, and `TranscriptManifest` interfaces to `src/types/index.ts`
3. Verify file contents are unchanged (do NOT modify content)

**Commands:**

```bash
cd public/data/transcripts
git mv chapter_9_dialogue.txt chinese_chpt9_2_dialogue.txt
git mv chapter_9_phrases.txt chinese_chpt9_2_phrases.txt
git mv chapter_10_dialogue.txt chinese_chpt10_2_dialogue.txt
git mv chapter_10_phrases.txt chinese_chpt10_2_phrases.txt
```

**Commit**: `feat(transcripts): rename transcript files to match deck ID convention`

---

### Phase 2: Transcript Manifest Generator (2 points)

**Files to create:**

- `scripts/generate-transcript-manifest.js` - Script to scan and generate manifest
- `public/data/transcripts/manifest.json` - Generated manifest file

**Manifest Generator Script:**

```javascript
// scripts/generate-transcript-manifest.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRANSCRIPTS_DIR = path.join(__dirname, '../public/data/transcripts');
const MANIFEST_PATH = path.join(TRANSCRIPTS_DIR, 'manifest.json');

function generateTranscriptManifest() {
  const files = fs.readdirSync(TRANSCRIPTS_DIR)
    .filter(f => f.endsWith('.txt'));

  const transcripts = files.map(filename => {
    // Parse filename: {deckId}_{type}.txt
    const match = filename.match(/^(.+)_(dialogue|phrases)\.txt$/);
    if (!match) return null;

    const [, deckId, type] = match;
    return {
      id: filename.replace('.txt', ''),
      deckId,
      type,
      filename,
      displayName: type.charAt(0).toUpperCase() + type.slice(1)
    };
  }).filter(Boolean);

  const manifest = {
    transcripts,
    generatedAt: new Date().toISOString()
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`Generated transcript manifest with ${transcripts.length} files`);
}

generateTranscriptManifest();
```

**Update package.json scripts:**

```json
{
  "scripts": {
    "generate-transcripts": "node scripts/generate-transcript-manifest.js",
    "dev": "node scripts/generate-deck-manifest.js && node scripts/generate-transcript-manifest.js && vite",
    "build": "node scripts/generate-deck-manifest.js && node scripts/generate-transcript-manifest.js && tsc -b && vite build"
  }
}
```

**Implementation steps:**

1. Create `scripts/generate-transcript-manifest.js` following existing `generate-deck-manifest.js` patterns
2. Update `package.json` dev and build scripts to include transcript manifest generation
3. Run script to generate initial `public/data/transcripts/manifest.json`
4. Add manifest.json to .gitignore (generated file)

**Commit**: `feat(transcripts): add transcript manifest generator script`

---

### Phase 3: Transcript Service and Store (2 points)

**Files to create:**

- `src/services/transcriptService.ts` - Service for loading transcripts
- `src/store/transcriptStore.ts` - Zustand store for transcript state

**Transcript Service:**

```typescript
// src/services/transcriptService.ts
import { TranscriptFile, TranscriptManifest } from '@/types';

const TRANSCRIPTS_BASE_PATH = '/data/transcripts';

let manifestCache: TranscriptManifest | null = null;

export async function loadTranscriptManifest(): Promise<TranscriptManifest> {
  if (manifestCache) return manifestCache;

  const response = await fetch(`${TRANSCRIPTS_BASE_PATH}/manifest.json`);
  if (!response.ok) {
    throw new Error('Failed to load transcript manifest');
  }

  manifestCache = await response.json();
  return manifestCache as TranscriptManifest;
}

export async function getTranscriptsForDeck(deckId: string): Promise<TranscriptFile[]> {
  const manifest = await loadTranscriptManifest();
  return manifest.transcripts.filter(t => t.deckId === deckId);
}

export async function loadTranscriptContent(filename: string): Promise<string> {
  const response = await fetch(`${TRANSCRIPTS_BASE_PATH}/${filename}`);
  if (!response.ok) {
    throw new Error(`Failed to load transcript: ${filename}`);
  }
  return response.text();
}

export function clearManifestCache(): void {
  manifestCache = null;
}
```

**Transcript Store:**

```typescript
// src/store/transcriptStore.ts
import { create } from 'zustand';
import { TranscriptFile } from '@/types';
import {
  getTranscriptsForDeck,
  loadTranscriptContent
} from '@/services/transcriptService';

interface TranscriptState {
  // State
  availableTranscripts: TranscriptFile[];
  selectedTranscript: TranscriptFile | null;
  transcriptContent: string | null;
  isLoading: boolean;
  error: string | null;
  isModalOpen: boolean;

  // Actions
  loadTranscriptsForDeck: (deckId: string) => Promise<void>;
  selectTranscript: (transcript: TranscriptFile) => Promise<void>;
  closeModal: () => void;
  clearError: () => void;
}

export const useTranscriptStore = create<TranscriptState>((set, get) => ({
  // Initial state
  availableTranscripts: [],
  selectedTranscript: null,
  transcriptContent: null,
  isLoading: false,
  error: null,
  isModalOpen: false,

  // Actions
  loadTranscriptsForDeck: async (deckId: string) => {
    set({ isLoading: true, error: null });
    try {
      const transcripts = await getTranscriptsForDeck(deckId);
      set({ availableTranscripts: transcripts, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load transcripts',
        isLoading: false
      });
    }
  },

  selectTranscript: async (transcript: TranscriptFile) => {
    set({
      selectedTranscript: transcript,
      isLoading: true,
      error: null,
      isModalOpen: true
    });
    try {
      const content = await loadTranscriptContent(transcript.filename);
      set({ transcriptContent: content, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load transcript content',
        isLoading: false
      });
    }
  },

  closeModal: () => {
    set({
      isModalOpen: false,
      selectedTranscript: null,
      transcriptContent: null
    });
  },

  clearError: () => set({ error: null })
}));
```

**Implementation steps:**

1. Create `src/services/transcriptService.ts` with manifest loading and content fetching
2. Create `src/store/transcriptStore.ts` with Zustand state management
3. Follow existing service/store patterns from `deckService.ts` and `deckStore.ts`

**Commit**: `feat(transcripts): add transcript service and Zustand store`

---

### Phase 4: Sidebar UI Updates (2 points)

**Files to modify:**

- `src/components/read/ReadDialoguePicker.tsx` - Rename title, restructure for sections
- `src/components/read/ReadDialoguePicker.module.css` - Add section styling

**Files to create:**

- `src/components/read/TranscriptPicker.tsx` - New component for transcript selection
- `src/components/read/TranscriptPicker.module.css` - Styling for transcript picker
- `src/components/read/ReadSidebar.tsx` - Container for both Practice and Transcripts sections
- `src/components/read/ReadSidebar.module.css` - Sidebar container styling

**ReadSidebar Component:**

```typescript
// src/components/read/ReadSidebar.tsx
import { FC } from 'react';
import { Deck } from '@/types';
import { ReadDialoguePicker } from './ReadDialoguePicker';
import { TranscriptPicker } from './TranscriptPicker';
import styles from './ReadSidebar.module.css';

interface ReadProgress {
  dialogueId: string;
  lineIndex: number;
  tokenIndex: number;
  completedTokens: Set<string>;
  masteredTokens: Set<string>;
}

interface Props {
  deck: Deck;
  selectedDialogueId: string | null;
  onSelectDialogue: (dialogueId: string) => void;
  progress: ReadProgress | null;
}

export const ReadSidebar: FC<Props> = ({
  deck,
  selectedDialogueId,
  onSelectDialogue,
  progress
}) => {
  return (
    <div className={styles.sidebar}>
      <ReadDialoguePicker
        deck={deck}
        selectedDialogueId={selectedDialogueId}
        onSelectDialogue={onSelectDialogue}
        progress={progress}
      />

      <div className={styles.divider} />

      <TranscriptPicker deckId={deck.id} />
    </div>
  );
};
```

**ReadDialoguePicker Update (rename title):**

```typescript
// In ReadDialoguePicker.tsx, change line 65:
// FROM: <h3 className={styles.title}>Dialogues</h3>
// TO:   <h3 className={styles.title}>Practice</h3>
```

**TranscriptPicker Component:**

```typescript
// src/components/read/TranscriptPicker.tsx
import { FC, useEffect } from 'react';
import { useTranscriptStore } from '@/store/transcriptStore';
import { Button } from '@/components/ui/Button';
import styles from './TranscriptPicker.module.css';

interface Props {
  deckId: string;
}

export const TranscriptPicker: FC<Props> = ({ deckId }) => {
  const {
    availableTranscripts,
    isLoading,
    loadTranscriptsForDeck,
    selectTranscript
  } = useTranscriptStore();

  useEffect(() => {
    loadTranscriptsForDeck(deckId);
  }, [deckId, loadTranscriptsForDeck]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Transcripts</h3>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (availableTranscripts.length === 0) {
    return null; // Don't show section if no transcripts
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Transcripts</h3>
      <p className={styles.subtitle}>Raw text for external readers</p>
      <div className={styles.transcriptList}>
        {availableTranscripts.map((transcript) => (
          <Button
            key={transcript.id}
            variant="secondary"
            className={styles.transcriptButton}
            onClick={() => selectTranscript(transcript)}
          >
            <div className={styles.transcriptContent}>
              <span className={styles.transcriptName}>
                {transcript.displayName}
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={styles.icon}
              >
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15,3 21,3 21,9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};
```

**TranscriptPicker Styles:**

```css
/* src/components/read/TranscriptPicker.module.css */
.container {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}

.subtitle {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.loading {
  padding: var(--space-4);
  text-align: center;
  color: var(--text-secondary);
}

.transcriptList {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.transcriptButton {
  width: 100%;
  padding: var(--space-3);
  text-align: left;
  transition: all 0.2s ease;
}

.transcriptButton:hover {
  transform: translateX(2px);
  background: linear-gradient(
    135deg,
    rgba(74, 144, 226, 0.1),
    rgba(74, 144, 226, 0.05)
  );
}

.transcriptContent {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.transcriptName {
  font-weight: 500;
  color: var(--text-primary);
}

.icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}
```

**ReadSidebar Styles:**

```css
/* src/components/read/ReadSidebar.module.css */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--border-color),
    transparent
  );
  margin: var(--space-2) 0;
}
```

**Implementation steps:**

1. Create `ReadSidebar.tsx` container component
2. Update `ReadDialoguePicker.tsx` - change "Dialogues" to "Practice"
3. Create `TranscriptPicker.tsx` with transcript selection buttons
4. Create corresponding CSS module files with semi-transparent styling
5. Update `Read.tsx` to use `ReadSidebar` instead of direct `ReadDialoguePicker`

**Commit**: `feat(transcripts): add sidebar UI with Practice and Transcripts sections`

---

### Phase 5: Transcript Modal Viewer (1 point)

**Files to create:**

- `src/components/read/TranscriptModal.tsx` - Modal for viewing transcript content
- `src/components/read/TranscriptModal.module.css` - Modal styling
- `src/components/icons/CopyIcon.tsx` - Copy icon component

**CopyIcon Component:**

```typescript
// src/components/icons/CopyIcon.tsx
import { FC } from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

export const CopyIcon: FC<IconProps> = ({
  className,
  size = 24,
  color = 'currentColor'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);
```

**TranscriptModal Component:**

```typescript
// src/components/read/TranscriptModal.tsx
import { FC, useCallback, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CopyIcon } from '@/components/icons/CopyIcon';
import { useTranscriptStore } from '@/store/transcriptStore';
import styles from './TranscriptModal.module.css';

export const TranscriptModal: FC = () => {
  const {
    isModalOpen,
    selectedTranscript,
    transcriptContent,
    isLoading,
    closeModal
  } = useTranscriptStore();

  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!transcriptContent) return;

    try {
      await navigator.clipboard.writeText(transcriptContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = transcriptContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [transcriptContent]);

  const modalTitle = selectedTranscript
    ? `${selectedTranscript.displayName} Transcript`
    : 'Transcript';

  return (
    <Modal
      isOpen={isModalOpen}
      onClose={closeModal}
      title={modalTitle}
      size="large"
      className={styles.transcriptModal}
    >
      <div className={styles.modalHeader}>
        <Button
          variant="secondary"
          size="small"
          onClick={handleCopy}
          className={styles.copyButton}
          aria-label="Copy transcript to clipboard"
        >
          <CopyIcon size={18} />
          <span>{copySuccess ? 'Copied!' : 'Copy All'}</span>
        </Button>
      </div>

      <div className={styles.contentContainer}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Loading transcript...</span>
          </div>
        ) : transcriptContent ? (
          <pre className={styles.transcriptText}>
            {transcriptContent}
          </pre>
        ) : (
          <div className={styles.error}>
            Failed to load transcript content.
          </div>
        )}
      </div>
    </Modal>
  );
};
```

**TranscriptModal Styles:**

```css
/* src/components/read/TranscriptModal.module.css */
.transcriptModal {
  max-width: 800px;
}

.modalHeader {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-4);
  position: sticky;
  top: 0;
  background: linear-gradient(
    to bottom,
    var(--bg-primary) 80%,
    transparent
  );
  padding: var(--space-2) 0;
  z-index: 5;
}

.copyButton {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  transition: all 0.2s ease;
}

.copyButton:hover {
  background: linear-gradient(
    135deg,
    rgba(74, 144, 226, 0.15),
    rgba(74, 144, 226, 0.1)
  );
}

.contentContainer {
  min-height: 300px;
  max-height: 60vh;
  overflow-y: auto;
  padding: var(--space-4);
  background: linear-gradient(
    135deg,
    rgba(74, 144, 226, 0.03),
    rgba(74, 144, 226, 0.01)
  );
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
}

.transcriptText {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: 1.8;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-8);
  color: var(--text-secondary);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-main);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error {
  text-align: center;
  padding: var(--space-8);
  color: var(--semantic-error);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .contentContainer {
    max-height: calc(100vh - 200px);
    padding: var(--space-3);
  }

  .transcriptText {
    font-size: var(--text-sm);
    line-height: 1.6;
  }

  .modalHeader {
    padding: var(--space-2);
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .contentContainer {
    background: linear-gradient(
      135deg,
      rgba(107, 165, 233, 0.05),
      rgba(107, 165, 233, 0.02)
    );
  }

  .modalHeader {
    background: linear-gradient(
      to bottom,
      var(--bg-primary) 80%,
      transparent
    );
  }
}
```

**Implementation steps:**

1. Create `CopyIcon.tsx` following existing icon patterns
2. Create `TranscriptModal.tsx` with copy functionality and loading states
3. Create `TranscriptModal.module.css` with mobile-first responsive styling
4. Add `TranscriptModal` to `Read.tsx` page

**Commit**: `feat(transcripts): add transcript modal viewer with copy functionality`

---

### Phase 6: Integration and Polish (1 point - FINAL)

**Files to modify:**

- `src/pages/Read.tsx` - Integrate all transcript components
- Update imports and add TranscriptModal

**Updated Read.tsx Integration:**

```typescript
// In src/pages/Read.tsx, add imports:
import { ReadSidebar } from '@/components/read/ReadSidebar';
import { TranscriptModal } from '@/components/read/TranscriptModal';

// Replace ReadDialoguePicker with ReadSidebar in the leftPanel:
<div className={styles.leftPanel}>
  <ReadSidebar
    deck={currentDeck}
    selectedDialogueId={selectedDialogueId}
    onSelectDialogue={handleSelectDialogue}
    progress={getProgress(deckId || '')}
  />
</div>

// Add TranscriptModal at the end of the component, before closing div:
<TranscriptModal />
```

**Implementation steps:**

1. Update `Read.tsx` imports to include new components
2. Replace `ReadDialoguePicker` with `ReadSidebar` in the left panel
3. Add `TranscriptModal` component to render the modal
4. Test all functionality: sidebar navigation, transcript loading, copy feature
5. Verify mobile responsiveness

**Testing Checklist:**

- [ ] "Dialogues" renamed to "Practice" in sidebar
- [ ] Transcripts section appears below Practice section
- [ ] Only transcripts matching current deck ID appear
- [ ] Clicking transcript opens modal
- [ ] Modal displays transcript content with proper formatting
- [ ] Copy button copies all text to clipboard
- [ ] Copy success feedback displays
- [ ] Modal closes with X button and Escape key
- [ ] Mobile: Modal is fullscreen and scrollable
- [ ] No transcripts: Transcripts section is hidden

**Commit**: `feat(transcripts): integrate transcript reader into Read mode`

---

## Testing Strategy

### Unit Tests

**Test file:** `src/components/read/__tests__/TranscriptPicker.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TranscriptPicker } from '../TranscriptPicker';

// Mock the store
vi.mock('@/store/transcriptStore', () => ({
  useTranscriptStore: vi.fn()
}));

describe('TranscriptPicker', () => {
  it('should render transcript options when available', async () => {
    // Test implementation
  });

  it('should not render when no transcripts available', () => {
    // Test implementation
  });

  it('should call selectTranscript when button clicked', async () => {
    // Test implementation
  });
});
```

**Test file:** `src/components/read/__tests__/TranscriptModal.test.tsx`

```typescript
describe('TranscriptModal', () => {
  it('should render modal when isModalOpen is true', () => {
    // Test implementation
  });

  it('should copy text to clipboard when copy button clicked', async () => {
    // Test implementation
  });

  it('should show loading state while content is loading', () => {
    // Test implementation
  });

  it('should close modal when close button clicked', async () => {
    // Test implementation
  });
});
```

**Test file:** `src/services/__tests__/transcriptService.test.ts`

```typescript
describe('transcriptService', () => {
  it('should load and cache manifest', async () => {
    // Test implementation
  });

  it('should filter transcripts by deckId', async () => {
    // Test implementation
  });

  it('should load transcript content', async () => {
    // Test implementation
  });
});
```

### Integration Tests

- User flow: Navigate to Read mode -> See Practice and Transcripts sections -> Click transcript -> View in modal -> Copy text -> Close modal
- Verify deck-specific filtering works correctly
- Test with decks that have no transcripts (section should be hidden)

### E2E Tests (Detox/Playwright)

```typescript
describe('Transcript Reader E2E', () => {
  it('should complete full transcript viewing flow', async () => {
    // Navigate to Read mode for a deck with transcripts
    // Verify sidebar shows both Practice and Transcripts sections
    // Click on a transcript
    // Verify modal opens with content
    // Click copy button
    // Verify clipboard contains transcript text
    // Close modal
    // Verify modal is closed
  });
});
```

### Performance Tests

- Transcript loading time: <500ms
- Modal animation: 60 FPS
- No memory leaks when opening/closing modal repeatedly

---

## Documentation Updates Required

1. **README.md** - Add section about transcript reader feature (if user-facing docs exist)
2. **In-code documentation:**
   - JSDoc comments on `TranscriptService` functions
   - JSDoc comments on `TranscriptStore` actions
   - Component prop documentation for `TranscriptPicker` and `TranscriptModal`

---

## Success Criteria

1. **Functional:** Users can view and copy transcript files for the current deck
2. **UX:** Clear visual distinction between Practice (interactive) and Transcripts (passive reading)
3. **Performance:** Transcript loads in <500ms, smooth scrolling in modal
4. **Accessibility:** Full keyboard navigation, proper ARIA labels on copy button
5. **Mobile:** Fullscreen modal with easy scrolling on mobile devices

---

## Dependencies

**NPM packages:** None required (uses existing dependencies)

**Other tickets:** None

**File dependencies:**
- Transcript files must exist in `public/data/transcripts/` with correct naming
- Deck IDs must match transcript file prefixes

---

## Risks & Mitigations

1. **Risk:** Large transcript files causing slow loading
   **Mitigation:** Lazy load content only when modal opens, add loading indicator

2. **Risk:** Clipboard API not supported in older browsers
   **Mitigation:** Fallback to execCommand('copy') for older browser support

3. **Risk:** No transcripts for some decks
   **Mitigation:** Hide Transcripts section entirely when empty (already implemented)

4. **Risk:** Transcript file naming mismatch with deck IDs
   **Mitigation:** Clear naming convention documentation, manifest validation

---

## Accessibility Requirements

- Modal focus trap when open
- Escape key closes modal
- Copy button has descriptive ARIA label: "Copy transcript to clipboard"
- Success feedback announced to screen readers
- Proper heading hierarchy in modal (h2 for title)
- Sufficient color contrast for text content

---

## Mobile-Specific Considerations

- Modal is fullscreen on mobile (< 640px)
- Transcript content uses larger line-height (1.6-1.8) for readability
- Touch-friendly copy button (min 44px touch target)
- Smooth scrolling in content container
- Sticky copy button header while scrolling

---

## File Summary

### Files to Rename (Phase 1):
- `public/data/transcripts/chapter_9_dialogue.txt` -> `chinese_chpt9_2_dialogue.txt`
- `public/data/transcripts/chapter_9_phrases.txt` -> `chinese_chpt9_2_phrases.txt`
- `public/data/transcripts/chapter_10_dialogue.txt` -> `chinese_chpt10_2_dialogue.txt`
- `public/data/transcripts/chapter_10_phrases.txt` -> `chinese_chpt10_2_phrases.txt`

### Files to Create:
- `scripts/generate-transcript-manifest.js`
- `public/data/transcripts/manifest.json` (generated)
- `src/services/transcriptService.ts`
- `src/store/transcriptStore.ts`
- `src/components/read/ReadSidebar.tsx`
- `src/components/read/ReadSidebar.module.css`
- `src/components/read/TranscriptPicker.tsx`
- `src/components/read/TranscriptPicker.module.css`
- `src/components/read/TranscriptModal.tsx`
- `src/components/read/TranscriptModal.module.css`
- `src/components/icons/CopyIcon.tsx`

### Files to Modify:
- `src/types/index.ts` - Add transcript types
- `src/components/read/ReadDialoguePicker.tsx` - Rename "Dialogues" to "Practice"
- `src/pages/Read.tsx` - Integrate new components
- `package.json` - Add transcript manifest script to build/dev

---

## Commit History (Expected)

1. `feat(transcripts): rename transcript files to match deck ID convention`
2. `feat(transcripts): add transcript manifest generator script`
3. `feat(transcripts): add transcript service and Zustand store`
4. `feat(transcripts): add sidebar UI with Practice and Transcripts sections`
5. `feat(transcripts): add transcript modal viewer with copy functionality`
6. `feat(transcripts): integrate transcript reader into Read mode`
