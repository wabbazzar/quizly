# Ticket 013: Mobile Compact Deck Grid (3-Column)

## Priority: High

## Status: Backlog

## Summary

Redesign the mobile deck display to show 3 decks per row using abbreviated
titles, enabling 10+ decks visible on screen simultaneously. Remove mode action
buttons from cards entirely - deck selection leads directly to a mode picker.

---

## Requirements

### Core Changes

1. **Add `abbreviated_title` to deck metadata** (e.g., "Chp 4 pt 1")
2. **3-column grid on mobile** - compact cards side by side
3. **Remove mode action icons** from deck cards completely
4. **Show subtitle instead of description**
5. **Keep**: card count, levels, progress indicator
6. **Remove**: tags, description, mode buttons

---

## Data Model Change

### New Metadata Field

Add `abbreviated_title` to `DeckMetadata` interface:

```typescript
// src/types/index.ts
interface DeckMetadata {
  deck_name: string;
  abbreviated_title: string;  // NEW: e.g., "Chp 4 pt 1", "Chp 10 pt 2"
  deck_subtitle?: string;
  description: string;
  // ... rest unchanged
}
```

### JSON Data Updates Required

Every deck JSON file needs the new field:

```json
{
  "metadata": {
    "deck_name": "Chinese Chapter 4 Part 1",
    "abbreviated_title": "Chp 4 pt 1",
    "deck_subtitle": "Entertainment & Hobbies",
    ...
  }
}
```

**Files to update:**
- `public/data/decks/chinese_chpt4_1.json`
- `public/data/decks/chinese_chpt4_2.json`
- `public/data/decks/chinese_chpt5_1.json`
- `public/data/decks/chinese_chpt5_2.json`
- `public/data/decks/chinese_chpt6_1.json`
- `public/data/decks/chinese_chpt6_2.json`
- `public/data/decks/chinese_chpt7_1.json`
- `public/data/decks/chinese_chpt7_2.json`
- `public/data/decks/chinese_chpt8_1.json`
- `public/data/decks/chinese_chpt9_1.json`
- `public/data/decks/chinese_chpt9_2.json`
- `public/data/decks/chinese_chpt10_1.json`
- `public/data/decks/chinese_chpt10_2.json`
- (and any others)

---

## Visual Design

### Mobile Compact Card (~100-110px height)

```
+-------------+-------------+-------------+
| Chp 4 pt 1  | Chp 4 pt 2  | Chp 5 pt 1  |
| Ent & Hobby | Shopping    | Daily Rout  |
|-------------|-------------|-------------|
| [====75%==] | [===60%===] | [==40%====] |
| 20 cards    | 25 cards    | 30 cards    |
| 3 levels    | 2 levels    | 3 levels    |
+-------------+-------------+-------------+
| Chp 5 pt 2  | Chp 6 pt 1  | Chp 6 pt 2  |
| ...         | ...         | ...         |
+-------------+-------------+-------------+
```

### Card Element Breakdown

| Element           | Display                          | Height   |
|-------------------|----------------------------------|----------|
| Abbreviated title | "Chp 4 pt 1" - bold, 13-14px     | ~18px    |
| Subtitle          | Truncated, 11-12px, secondary    | ~16px    |
| Progress bar      | Full width, 4-6px tall           | ~10px    |
| Card count        | "20 cards" - 11px                | ~14px    |
| Level count       | "3 levels" - 11px                | ~14px    |
| Padding/gaps      | Compact spacing                  | ~28px    |
| **Total**         |                                  | **~100px**|

### What This Achieves

**Screen capacity (iPhone SE, 667px viewport):**
- Header: ~60px
- Available: ~607px
- Rows visible: ~6 rows (607 ÷ 100)
- **Decks visible: 18 decks** (6 rows × 3 columns)

---

## Impact Analysis

### Removed Elements

| Element              | Current State                      | Impact                           |
|----------------------|------------------------------------|----------------------------------|
| **Mode buttons**     | 4 buttons per card (Flash/Learn/Match/Read) | Requires new mode selection flow |
| **Tags**             | Up to 3 tags shown                 | No loss - redundant with lessons |
| **Description**      | 2-line truncated text              | Replaced by subtitle             |
| **Full deck name**   | "Chinese Chapter 4 Part 1"         | Replaced by abbreviated title    |
| **Progress ring**    | Circular 40px indicator            | Replaced by inline progress bar  |
| **Stats icons**      | Icon + text for each stat          | Text only, more compact          |

### Retained Elements

| Element         | Current                    | New Format                    |
|-----------------|----------------------------|-------------------------------|
| **Title**       | Full deck name             | Abbreviated (Chp X pt Y)      |
| **Subtitle**    | Sometimes shown            | Always shown, truncated       |
| **Card count**  | "20 cards" with icon       | "20 cards" text only          |
| **Level count** | "3 levels" with icon       | "3 levels" text only          |
| **Progress**    | Circular ring              | Horizontal bar + percentage   |

### New Interaction Flow

**Current flow (1 tap):**
1. Tap mode button on card → Navigate to mode

**New flow (2 taps):**
1. Tap compact card → Open mode selection sheet
2. Tap mode in sheet → Navigate to mode

**Tradeoff:** Extra tap required, but 9x more decks visible for selection.

---

## Component Specifications

### New: `CompactDeckCard`

```typescript
interface CompactDeckCardProps {
  deck: Deck;
  mastered?: number;
  total?: number;
  onSelect: (deckId: string) => void;
}
```

**Styling requirements:**
- Fixed aspect ratio or height (~100-110px)
- 1/3 width with small gap
- Text truncation with ellipsis
- Touch feedback on tap
- Semi-transparent background (per design system)

### New: `ModeSelectionSheet`

Bottom sheet triggered on deck tap:

```typescript
interface ModeSelectionSheetProps {
  deck: Deck | null;
  isOpen: boolean;
  onClose: () => void;
  onModeSelect: (deckId: string, mode: LearningMode) => void;
}
```

**Content:**
- Full deck name (not abbreviated)
- Subtitle
- Full progress stats
- 4 large mode buttons with descriptions

### Modified: `Home.tsx`

```tsx
// Mobile: 3-column compact grid
// Tablet/Desktop: Keep EnhancedDeckCard grid

<div className={styles.deckGrid}>
  {isMobile ? (
    <CompactDeckGrid decks={decks} onSelectDeck={handleSelectDeck} />
  ) : (
    decks.map(deck => <EnhancedDeckCard key={deck.id} deck={deck} />)
  )}
</div>

{/* Mode selection sheet (mobile only) */}
<ModeSelectionSheet
  deck={selectedDeck}
  isOpen={isSheetOpen}
  onClose={() => setIsSheetOpen(false)}
  onModeSelect={handleModeSelect}
/>
```

---

## CSS Specifications

### Compact Grid Layout

```css
/* Mobile: 3 columns */
@media (max-width: 767px) {
  .compactGrid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2); /* 8px */
    padding: var(--space-2);
  }
}

/* Tablet: Continue with EnhancedDeckCard */
@media (min-width: 768px) {
  .compactGrid {
    display: none; /* Use EnhancedDeckCard instead */
  }
}
```

### Compact Card Styling

```css
.compactCard {
  background: linear-gradient(
    135deg,
    rgba(74, 144, 226, 0.08),
    rgba(74, 144, 226, 0.03)
  );
  border: 1px solid rgba(74, 144, 226, 0.15);
  border-radius: var(--radius-md);
  padding: var(--space-2); /* 8px */
  min-height: 100px;
  display: flex;
  flex-direction: column;
  gap: var(--space-1); /* 4px */
  cursor: pointer;
  transition: var(--transition-fast);
}

.compactCard:active {
  transform: scale(0.98);
  background: linear-gradient(
    135deg,
    rgba(74, 144, 226, 0.12),
    rgba(74, 144, 226, 0.06)
  );
}

.abbreviatedTitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.subtitle {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.progressBar {
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
  margin-top: auto;
}

.progressFill {
  height: 100%;
  background: var(--primary-main);
  transition: width var(--transition-base);
}

.stats {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: var(--text-tertiary);
}
```

---

## Files to Create

```
src/components/deck/
  CompactDeckCard.tsx
  CompactDeckCard.module.css
  CompactDeckGrid.tsx
  CompactDeckGrid.module.css
  ModeSelectionSheet.tsx
  ModeSelectionSheet.module.css
```

## Files to Modify

```
src/types/index.ts              # Add abbreviated_title to DeckMetadata
src/pages/Home.tsx              # Conditional rendering for mobile
src/pages/Home.module.css       # Add responsive container
public/data/decks/*.json        # Add abbreviated_title to all decks
```

---

## Implementation Checklist

### Phase 1: Data Model

- [ ] Add `abbreviated_title` to `DeckMetadata` type
- [ ] Update all deck JSON files with abbreviated titles
- [ ] Update manifest if needed

### Phase 2: Components

- [ ] Create `CompactDeckCard` component
- [ ] Create `CompactDeckGrid` container
- [ ] Create `ModeSelectionSheet` bottom sheet
- [ ] Add responsive logic to Home.tsx

### Phase 3: Styling & Polish

- [ ] Implement 3-column grid CSS
- [ ] Add touch feedback animations
- [ ] Test text truncation on various screen widths
- [ ] Ensure accessibility (touch targets, screen reader)

### Phase 4: Testing

- [ ] Test on iPhone SE (smallest common viewport)
- [ ] Test on larger phones (iPhone Pro Max, Pixel)
- [ ] Verify 10+ decks visible
- [ ] Test mode selection flow

---

## Success Metrics

| Metric                 | Current        | Target         |
|------------------------|----------------|----------------|
| Decks per row (mobile) | 1              | 3              |
| Decks visible          | ~2             | 10-18          |
| Card height            | ~400px         | ~100px         |
| Mode buttons on card   | 4              | 0              |
| Taps to start mode     | 1              | 2              |

---

## Abbreviated Title Convention

Standard format for all decks:

| Full Name                    | Abbreviated Title |
|------------------------------|-------------------|
| Chinese Chapter 4 Part 1     | Chp 4 pt 1        |
| Chinese Chapter 4 Part 2     | Chp 4 pt 2        |
| Chinese Chapter 10 Part 1    | Chp 10 pt 1       |
| Chinese Chapter 10 Part 2    | Chp 10 pt 2       |

**Rules:**
- "Chapter" → "Chp"
- "Part" → "pt"
- Keep numbers as-is
- Maximum ~12 characters for clean display

---

## Mode Selection Sheet Design

When user taps a compact card:

```
+--------------------------------------------------+
|                    ────                          |
|                                                  |
|  Chinese Chapter 4 Part 1                        |
|  Entertainment & Hobbies                         |
|                                                  |
|  ████████████████░░░░  75% (15/20 cards)        |
|  3 levels available                              |
|                                                  |
|  ┌──────────────────────────────────────────┐   |
|  │  Flashcards                              │   |
|  │  Flip cards to review                    │   |
|  └──────────────────────────────────────────┘   |
|                                                  |
|  ┌──────────────────────────────────────────┐   |
|  │  Learn                                   │   |
|  │  Multiple choice & typing                │   |
|  └──────────────────────────────────────────┘   |
|                                                  |
|  ┌──────────────────────────────────────────┐   |
|  │  Match                                   │   |
|  │  Pair matching game                      │   |
|  └──────────────────────────────────────────┘   |
|                                                  |
|  ┌──────────────────────────────────────────┐   |
|  │  Read                                    │   |
|  │  Browse cards in reading mode            │   |
|  └──────────────────────────────────────────┘   |
|                                                  |
+--------------------------------------------------+
```

---

## Notes

- Desktop/tablet continues using `EnhancedDeckCard` with full details
- The abbreviated title is **only used on mobile** compact cards
- Mode selection sheet shows **full deck name** for clarity
- Future lesson grouping can add section headers above card rows
