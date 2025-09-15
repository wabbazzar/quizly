# Ticket 001: Initial PWA Setup with Flashcards Mode

## Metadata
- **Status**: In Progress
- **Priority**: High
- **Effort**: 15 points (3 phases x 5 points)
- **Created**: 2025-01-22
- **Type**: feature
- **Platforms**: Web (Desktop/Tablet/Mobile)

## User Stories

### Primary User Story
As a language learner, I want to access flashcards on any device through my web browser so that I can study Chinese vocabulary anywhere.

### Secondary User Stories
- As a user, I want to see all available decks on the home screen so that I can choose what to study.
- As a user, I want to click/tap or swipe through flashcards intuitively so that I can quickly review vocabulary.
- As a user, I want to track my progress during a study session so that I know how well I'm doing.
- As a user, I want to configure which card sides I see so that I can customize my learning experience.

## Technical Requirements

### Functional Requirements
1. Vite setup with React 18 and TypeScript strict mode
2. Home page displaying deck list with metadata
3. React Router v6 navigation with URL-based routing
4. Complete Flashcards mode with mouse/touch gestures and keyboard navigation
5. Settings modal for side configuration
6. Progress tracking (correct/incorrect counters)
7. Chinese Chapter 9 deck integrated as sample data

### Non-Functional Requirements
1. Performance: Lighthouse score >90, smooth 60 FPS animations
2. Accessibility: WCAG AA compliance, full keyboard navigation
3. Responsive: Mobile-first design working on all screen sizes
4. Offline Support: Service Worker enabling offline functionality

## Implementation Plan

### Phase 1: Core Infrastructure & Routing (5 points) ✅ COMPLETED

**Files to create/modify:**
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration with strict mode
- `vite.config.ts` - Vite configuration
- `index.html` - Entry HTML file
- `src/styles/theme.css` - CSS custom properties design system
- `src/styles/global.css` - Global styles
- `src/types/index.ts` - Core TypeScript interfaces
- `src/router/AppRouter.tsx` - React Router configuration
- `src/store/deckStore.ts` - Zustand store for deck management

**Component Structure:**
```typescript
// src/types/index.ts
interface DeckMetadata {
  deck_name: string;
  description: string;
  category: string;
  available_levels: number[];
  available_sides: number;
  card_count: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'beginner_to_intermediate';
  tags: string[];
  version: string;
  created_date: string;
  last_updated: string;
}

interface Card {
  idx: number;
  name: string;
  side_a: string;
  side_b: string;
  side_c?: string;
  side_d?: string;
  level: number;
}

interface Deck {
  id: string;
  metadata: DeckMetadata;
  content: Card[];
}
```

**Theme Implementation:**
```css
/* src/styles/theme.css */

/**
 * Quizly Design System
 *
 * A vibrant yet professional color palette that creates an engaging
 * learning environment while maintaining excellent readability and
 * accessibility. The design emphasizes clarity and focus for
 * effective studying.
 */

:root {
  /* Primary Colors */
  --primary-main: #4A90E2;
  --primary-light: #6BA5E9;
  --primary-dark: #3A7BC8;

  /* Secondary Colors */
  --secondary-main: #50E3C2;
  --secondary-light: #6FEBD0;
  --secondary-dark: #3DCBAA;

  /* Neutral Colors */
  --neutral-white: #FFFFFF;
  --neutral-gray-100: #F7F8FA;
  --neutral-gray-200: #E5E7EB;
  --neutral-gray-300: #D1D5DB;
  --neutral-gray-400: #9CA3AF;
  --neutral-gray-500: #6B7280;
  --neutral-gray-600: #4B5563;
  --neutral-gray-700: #374151;
  --neutral-gray-800: #1F2937;
  --neutral-black: #000000;

  /* Semantic Colors */
  --semantic-success: #10B981;
  --semantic-warning: #F59E0B;
  --semantic-error: #EF4444;
  --semantic-info: #3B82F6;

  /* Typography */
  --font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'SF Mono', Consolas, monospace;

  /* Font Sizes */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);

  /* Dark Mode Variables */
  @media (prefers-color-scheme: dark) {
    --bg-primary: var(--neutral-gray-800);
    --bg-secondary: var(--neutral-gray-700);
    --text-primary: var(--neutral-gray-100);
    --text-secondary: var(--neutral-gray-300);
  }
}
```

**Routing Setup:**
```typescript
// src/router/AppRouter.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const Home = lazy(() => import('../pages/Home'));
const Deck = lazy(() => import('../pages/Deck'));
const Flashcards = lazy(() => import('../pages/Flashcards'));

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/deck/:id" element={<Deck />} />
          <Route path="/deck/:id/flashcards" element={<Flashcards />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

**Implementation steps:**
1. ✅ Initialize Vite project with React TypeScript template
2. ✅ Install core dependencies (react-router-dom, zustand, framer-motion, etc.)
3. ✅ Configure TypeScript with strict mode
4. ✅ Implement CSS custom properties design system
5. ✅ Set up React Router structure
6. ✅ Create Zustand store for deck management

**Testing:**
```bash
npm run type-check
npm run lint
npm test
npm run build
```

**Commit**: `feat(core): initialize Vite React PWA with routing and theme`

### Phase 2: Home Screen & Deck Management (5 points) ✅ COMPLETED

**Files to create/modify:**
- `src/pages/Home.tsx` - Main deck list page
- `src/components/cards/DeckCard.tsx` - Individual deck display
- `src/hooks/useDeckData.ts` - Hook for deck data management
- `src/data/decks/chinese_chpt9.json` - Chinese deck data
- `src/store/deckStore.ts` - Update with deck loading logic

**Home Page Implementation:**
```typescript
// src/pages/Home.tsx
import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeckStore } from '@/store/deckStore';
import { DeckCard } from '@/components/cards/DeckCard';
import styles from './Home.module.css';

export const Home: FC = () => {
  const navigate = useNavigate();
  const { decks, loadDecks } = useDeckStore();

  useEffect(() => {
    loadDecks();
  }, []);

  const handleDeckClick = (deckId: string) => {
    navigate(`/deck/${deckId}`);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>My Decks</h1>
        <p className={styles.subtitle}>Choose a deck to start studying</p>
      </header>

      <div className={styles.deckGrid}>
        {decks.map((deck) => (
          <DeckCard
            key={deck.id}
            deck={deck}
            onClick={() => handleDeckClick(deck.id)}
          />
        ))}
      </div>
    </div>
  );
};
```

**DeckCard Component Design:**
```typescript
// src/components/cards/DeckCard.tsx
import { FC, memo } from 'react';
import { Deck } from '@/types';
import styles from './DeckCard.module.css';

interface DeckCardProps {
  deck: Deck;
  onClick: () => void;
}

export const DeckCard: FC<DeckCardProps> = memo(({ deck, onClick }) => {
  const difficultyColor = {
    beginner: 'var(--semantic-success)',
    intermediate: 'var(--semantic-warning)',
    advanced: 'var(--semantic-error)',
    beginner_to_intermediate: 'var(--semantic-info)',
  };

  return (
    <article
      className={styles.card}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className={styles.categoryBadge}>
        {deck.metadata.category}
      </div>

      <div className={styles.content}>
        <h2 className={styles.deckName}>{deck.metadata.deck_name}</h2>
        <p className={styles.description}>
          {deck.metadata.description}
        </p>

        <div className={styles.metadataRow}>
          <div className={styles.metadataItem}>
            <span className={styles.label}>Cards</span>
            <span className={styles.value}>{deck.metadata.card_count}</span>
          </div>

          <div className={styles.metadataItem}>
            <span className={styles.label}>Sides</span>
            <span className={styles.value}>{deck.metadata.available_sides}</span>
          </div>

          <div
            className={styles.difficultyBadge}
            style={{ backgroundColor: difficultyColor[deck.metadata.difficulty] }}
          >
            {deck.metadata.difficulty.replace('_', ' ')}
          </div>
        </div>
      </div>
    </article>
  );
});
```

**CSS Module for DeckCard:**
```css
/* src/components/cards/DeckCard.module.css */
.card {
  background: var(--neutral-white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  cursor: pointer;
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover,
.card:focus-visible {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.categoryBadge {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  background: var(--primary-light);
  color: var(--neutral-white);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 600;
}

.content {
  padding: var(--space-6);
}

.deckName {
  font-size: var(--text-2xl);
  font-weight: 600;
  margin: 0 0 var(--space-2) 0;
  padding-right: var(--space-16);
  color: var(--neutral-gray-800);
}

.description {
  color: var(--neutral-gray-500);
  margin: 0 0 var(--space-4) 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.metadataRow {
  display: flex;
  align-items: center;
  gap: var(--space-6);
}

.metadataItem {
  display: flex;
  flex-direction: column;
}

.label {
  font-size: var(--text-sm);
  color: var(--neutral-gray-400);
  margin-bottom: var(--space-1);
}

.value {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--neutral-gray-700);
}

.difficultyBadge {
  margin-left: auto;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--neutral-white);
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: capitalize;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .card {
    background: var(--bg-secondary);
  }

  .deckName {
    color: var(--text-primary);
  }

  .description {
    color: var(--text-secondary);
  }

  .value {
    color: var(--text-primary);
  }
}
```

**Deck Data Loading System:**
```typescript
// src/utils/deckLoader.ts
import { Deck } from '@/types';

export const loadDeckFromJSON = async (jsonPath: string): Promise<Deck> => {
  try {
    const response = await fetch(jsonPath);
    const rawDeck = await response.json();

    const deck: Deck = {
      id: rawDeck.id || rawDeck.deck_id || 'unknown',
      metadata: {
        ...rawDeck.metadata,
        created_date: rawDeck.metadata.created_date.split('T')[0],
        last_updated: rawDeck.metadata.last_updated.split('T')[0],
      },
      content: rawDeck.content.map((card: any, index: number) => ({
        idx: index,
        name: card.name,
        side_a: card.side_a,
        side_b: card.side_b,
        side_c: card.side_c,
        side_d: card.side_d,
        side_e: card.side_e,
        side_f: card.side_f,
        level: card.level,
      })),
    };

    return deck;
  } catch (error) {
    console.error('Error loading deck from JSON:', error);
    throw error;
  }
};

export const loadAllDecks = async (): Promise<Deck[]> => {
  const deckPaths = [
    '/data/decks/chinese_chpt9.json',
    // Add more deck paths as they're added
  ];

  const decks = await Promise.all(
    deckPaths.map(path => loadDeckFromJSON(path))
  );

  return decks;
};
```

**Store Integration:**
```typescript
// src/store/deckStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Deck } from '@/types';
import { loadAllDecks } from '@/utils/deckLoader';

interface DeckStore {
  decks: Deck[];
  activeDeck: Deck | null;
  isLoading: boolean;
  error: string | null;

  loadDecks: () => Promise<void>;
  selectDeck: (deckId: string) => void;
  importDeck: (jsonData: string) => Promise<void>;
}

export const useDeckStore = create<DeckStore>()(
  persist(
    (set, get) => ({
      decks: [],
      activeDeck: null,
      isLoading: false,
      error: null,

      loadDecks: async () => {
        set({ isLoading: true, error: null });
        try {
          const loadedDecks = await loadAllDecks();
          set({ decks: loadedDecks, isLoading: false });
        } catch (error) {
          set({
            error: 'Failed to load decks',
            isLoading: false
          });
        }
      },

      selectDeck: (deckId: string) => {
        const deck = get().decks.find(d => d.id === deckId);
        set({ activeDeck: deck || null });
      },

      importDeck: async (jsonData: string) => {
        try {
          const deck = JSON.parse(jsonData);
          set(state => ({
            decks: [...state.decks, deck]
          }));
        } catch (error) {
          set({ error: 'Failed to import deck' });
        }
      },
    }),
    {
      name: 'deck-store',
      partialize: (state) => ({
        decks: state.decks.map(d => ({
          id: d.id,
          metadata: d.metadata,
        })),
      }),
    }
  )
);
```

**Implementation steps:**
1. ✅ Create Home page with responsive grid layout
2. ✅ Build DeckCard component with proper styling
3. ✅ Set up JSON deck loading system
4. ✅ Implement deck loading in Zustand store
5. ✅ Add navigation from Home to Deck detail
6. ✅ Test deck display and navigation

**Testing:**
```typescript
describe('Home Page', () => {
  it('should display list of decks', () => {
    // Test deck list rendering
  });

  it('should navigate to deck detail on click', () => {
    // Test navigation
  });

  it('should be keyboard accessible', () => {
    // Test keyboard navigation
  });
});
```

**Commit**: `feat(home): implement home page with deck management`

### Phase 3: Flashcards Mode Implementation (5 points) ⚠️ PARTIALLY COMPLETED

**Files to create/modify:**
- `src/pages/Flashcards.tsx` - Main flashcards page
- `src/components/cards/FlashCard.tsx` - Flipable flash card
- `src/components/modes/FlashcardsSettings.tsx` - Settings modal
- `src/hooks/useFlashcards.ts` - Flashcards logic hook
- `src/store/sessionStore.ts` - Session state management
- `src/utils/gestures.ts` - Touch/mouse gesture handlers

**Flashcards Page:**
```typescript
// src/pages/Flashcards.tsx
import { FC, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FlashCard } from '@/components/cards/FlashCard';
import { useFlashcards } from '@/hooks/useFlashcards';
import styles from './Flashcards.module.css';

export const Flashcards: FC = () => {
  const { id } = useParams<{ id: string }>();
  const {
    currentCard,
    isFlipped,
    correctCount,
    incorrectCount,
    flipCard,
    handleCorrect,
    handleIncorrect,
    settings,
    updateSettings,
  } = useFlashcards(id!);

  const handleKeyDown = (e: KeyboardEvent) => {
    switch(e.key) {
      case ' ':
      case 'Enter':
        flipCard();
        break;
      case 'ArrowLeft':
        handleIncorrect();
        break;
      case 'ArrowRight':
        handleCorrect();
        break;
    }
  };

  return (
    <div className={styles.container}>
      {/* Progress counters */}
      <div className={styles.progressBar}>
        <div className={styles.incorrectCount}>
          ✗ {incorrectCount}
        </div>
        <div className={styles.correctCount}>
          ✓ {correctCount}
        </div>
      </div>

      {/* Flashcard with animations */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentCard?.idx}
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <FlashCard
            card={currentCard}
            isFlipped={isFlipped}
            frontSides={settings.frontSides}
            backSides={settings.backSides}
            onFlip={flipCard}
            onSwipeLeft={handleIncorrect}
            onSwipeRight={handleCorrect}
          />
        </motion.div>
      </AnimatePresence>

      {/* Settings button */}
      <button
        className={styles.settingsButton}
        onClick={() => setSettingsOpen(true)}
        aria-label="Settings"
      >
        ⚙️
      </button>
    </div>
  );
};
```

**FlashCard Component Design:**
```typescript
// src/components/cards/FlashCard.tsx
import { FC, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/types';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import styles from './FlashCard.module.css';

interface FlashCardProps {
  card: Card | null;
  isFlipped: boolean;
  frontSides: string[];
  backSides: string[];
  onFlip: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export const FlashCard: FC<FlashCardProps> = ({
  card,
  isFlipped,
  frontSides,
  backSides,
  onFlip,
  onSwipeLeft,
  onSwipeRight,
}) => {
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const { handlers, dragX } = useSwipeGesture({
    onSwipeLeft: () => {
      setSwipeDirection('left');
      onSwipeLeft();
    },
    onSwipeRight: () => {
      setSwipeDirection('right');
      onSwipeRight();
    },
    threshold: 100,
  });

  if (!card) return null;

  const renderSides = (sides: string[]) => {
    return sides.map(side => (
      <div key={side} className={styles.cardText}>
        {card[side as keyof Card]}
      </div>
    ));
  };

  return (
    <motion.div
      className={styles.cardContainer}
      style={{ x: dragX }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      {...handlers}
    >
      <div
        className={styles.card}
        onClick={onFlip}
        style={{
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front of card */}
        <div className={styles.cardFace}>
          <span className={styles.sideLabel}>Front</span>
          {renderSides(frontSides)}
        </div>

        {/* Back of card */}
        <div className={`${styles.cardFace} ${styles.cardBack}`}>
          <span className={styles.sideLabel}>Back</span>
          {renderSides(backSides)}
        </div>

        {/* Swipe indicators */}
        {swipeDirection === 'left' && (
          <div className={`${styles.swipeOverlay} ${styles.incorrect}`}>
            <span className={styles.swipeIcon}>✗</span>
          </div>
        )}
        {swipeDirection === 'right' && (
          <div className={`${styles.swipeOverlay} ${styles.correct}`}>
            <span className={styles.swipeIcon}>✓</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
```

**CSS for FlashCard:**
```css
/* src/components/cards/FlashCard.module.css */
.cardContainer {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  perspective: 1000px;
}

.card {
  position: relative;
  width: 100%;
  aspect-ratio: 3/4;
  background: var(--neutral-white);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  transform-style: preserve-3d;
  transition: transform 0.6s;
  cursor: pointer;
}

.cardFace {
  position: absolute;
  width: 100%;
  height: 100%;
  padding: var(--space-8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  backface-visibility: hidden;
  border-radius: var(--radius-xl);
}

.cardBack {
  transform: rotateY(180deg);
}

.sideLabel {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  color: var(--neutral-gray-400);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.cardText {
  font-size: var(--text-2xl);
  text-align: center;
  margin: var(--space-2) 0;
  color: var(--neutral-gray-800);
}

.swipeOverlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: var(--radius-xl);
  display: flex;
  justify-content: center;
  align-items: center;
  animation: fadeIn 0.3s;
}

.swipeOverlay.correct {
  background: rgba(16, 185, 129, 0.2);
}

.swipeOverlay.incorrect {
  background: rgba(239, 68, 68, 0.2);
}

.swipeIcon {
  font-size: 4rem;
  font-weight: bold;
  color: var(--neutral-white);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Mobile responsive */
@media (max-width: 640px) {
  .card {
    aspect-ratio: 1/1.4;
  }

  .cardText {
    font-size: var(--text-xl);
  }
}
```

**Progress Counter UI:**
```css
/* Part of Flashcards.module.css */
.progressBar {
  position: fixed;
  top: var(--space-4);
  left: var(--space-4);
  right: var(--space-4);
  display: flex;
  justify-content: space-between;
  z-index: 10;
}

.incorrectCount,
.correctCount {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--neutral-white);
  box-shadow: var(--shadow-sm);
}

.incorrectCount {
  background: var(--semantic-error);
}

.correctCount {
  background: var(--semantic-success);
}

.settingsButton {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background: var(--primary-main);
  color: var(--neutral-white);
  border: none;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  transition: transform 0.2s, box-shadow 0.2s;
}

.settingsButton:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-lg);
}

.settingsButton:focus-visible {
  outline: 2px solid var(--primary-dark);
  outline-offset: 2px;
}
```

**Flashcards Settings Modal:**
```typescript
// src/components/modes/FlashcardsSettings.tsx
import { FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './FlashcardsSettings.module.css';

interface FlashcardsSettingsProps {
  visible: boolean;
  onClose: () => void;
  settings: FlashcardsSettings;
  onUpdateSettings: (settings: FlashcardsSettings) => void;
  availableSides: number;
}

interface FlashcardsSettings {
  frontSides: string[];
  backSides: string[];
  enableTimer: boolean;
  timerSeconds: number;
  enableAudio: boolean;
  groupSides: Record<string, string[]>;
}

export const FlashcardsSettingsModal: FC<FlashcardsSettingsProps> = ({
  visible,
  onClose,
  settings,
  onUpdateSettings,
  availableSides,
}) => {
  const sideOptions = ['side_a', 'side_b', 'side_c', 'side_d', 'side_e', 'side_f']
    .slice(0, availableSides);

  const toggleSide = (type: 'front' | 'back', side: string) => {
    const key = type === 'front' ? 'frontSides' : 'backSides';
    const current = settings[key];
    const updated = current.includes(side)
      ? current.filter(s => s !== side)
      : [...current, side];

    onUpdateSettings({
      ...settings,
      [key]: updated
    });
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
          >
            <header className={styles.header}>
              <h2 className={styles.title}>Flashcard Settings</h2>
              <button className={styles.closeButton} onClick={onClose}>
                Done
              </button>
            </header>

            <div className={styles.content}>
              {/* Front Side Configuration */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Card Front</h3>
                <p className={styles.sectionDescription}>
                  Select which sides appear on the front of the card
                </p>
                <div className={styles.sideSelector}>
                  {sideOptions.map((side) => (
                    <button
                      key={side}
                      className={`${styles.sideOption} ${
                        settings.frontSides.includes(side) ? styles.selected : ''
                      }`}
                      onClick={() => toggleSide('front', side)}
                    >
                      {side.replace('_', ' ').toUpperCase()}
                    </button>
                  ))}
                </div>
              </section>

              {/* Back Side Configuration */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Card Back</h3>
                <p className={styles.sectionDescription}>
                  Select which sides appear on the back of the card
                </p>
                <div className={styles.sideSelector}>
                  {sideOptions.map((side) => (
                    <button
                      key={side}
                      className={`${styles.sideOption} ${
                        settings.backSides.includes(side) ? styles.selected : ''
                      }`}
                      onClick={() => toggleSide('back', side)}
                    >
                      {side.replace('_', ' ').toUpperCase()}
                    </button>
                  ))}
                </div>
              </section>

              {/* Timer Settings */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Timer</h3>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={settings.enableTimer}
                    onChange={(e) => onUpdateSettings({
                      ...settings,
                      enableTimer: e.target.checked
                    })}
                  />
                  <span>Enable auto-advance timer</span>
                </label>
                {settings.enableTimer && (
                  <label className={styles.select}>
                    <span>Seconds per card</span>
                    <select
                      value={settings.timerSeconds}
                      onChange={(e) => onUpdateSettings({
                        ...settings,
                        timerSeconds: Number(e.target.value)
                      })}
                    >
                      <option value={10}>10 sec</option>
                      <option value={15}>15 sec</option>
                      <option value={20}>20 sec</option>
                      <option value={30}>30 sec</option>
                    </select>
                  </label>
                )}
              </section>

              {/* Quick Presets */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Quick Presets</h3>
                <div className={styles.presets}>
                  <button
                    className={styles.presetButton}
                    onClick={() => applyPreset('englishToChinese')}
                  >
                    English → Chinese
                  </button>
                  <button
                    className={styles.presetButton}
                    onClick={() => applyPreset('chineseToEnglish')}
                  >
                    Chinese → English
                  </button>
                  <button
                    className={styles.presetButton}
                    onClick={() => applyPreset('comprehensive')}
                  >
                    All Sides
                  </button>
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
```

**Implementation steps:**
1. ✅ Create Flashcards page with gesture handling
2. ✅ Implement FlashCard with flip animation (CSS transforms)
3. ⚠️ Add swipe gesture recognition using Framer Motion (keyboard only, no swipe yet)
4. ✅ Build settings modal for side configuration
5. ✅ Implement progress tracking and display (with persistence)
6. ✅ Add auto-restart with missed cards functionality

**Testing:**
```typescript
describe('Flashcards Mode', () => {
  it('should flip card on click', () => {
    // Test flip animation
  });

  it('should track keyboard navigation', () => {
    // Test arrow keys and spacebar
  });

  it('should update progress counters', () => {
    // Test correct/incorrect tracking
  });

  it('should restart with missed cards', () => {
    // Test auto-restart functionality
  });

  it('should be mobile responsive', () => {
    // Test on different viewport sizes
  });
});
```

**Browser Testing:**
```bash
# Development
npm run dev
# Test on different browsers and devices

# Build
npm run build
npm run preview

# Lighthouse audit
npx lighthouse http://localhost:5173 --view
```

**Commit**: `feat(flashcards): implement complete flashcards mode with gestures`

## Additional Implementations (Added 2025-01-22)

### Completed
1. **PWA Icons and Manifest** ✅
   - Generated all icon sizes from SVG (16x16 to 512x512)
   - Created Web App Manifest with full PWA configuration
   - Added favicon and Apple Touch icons
   - Configured meta tags for social sharing
   - Ready for PWA installation

2. **Flashcards Completion Modal with Missed Cards** ✅ (Added 2025-09-15)
   - Created FlashcardsCompletionModal component similar to Results page
   - Added round tracking and completion detection
   - Implemented reshuffling of missed cards for focused review
   - Users can continue with only missed cards or restart full deck
   - Multiple round support with round number display
   - Session persistence with progress tracking

## Required Improvements (Added 2025-01-22)

### High Priority Enhancements
1. **Card-to-Card Animations** ❌
   - Add smooth slide/fade transitions between cards
   - Use Framer Motion for spring animations
   - Implement swipe gesture animations

2. **Home Page Polish** ❌
   - Enhance visual design with gradients and shadows
   - Add hero section with app branding
   - Improve deck card design with hover effects
   - Add empty state illustration
   - Implement skeleton loaders

3. **Progress Persistence** ❌
   - Save session state to localStorage
   - Resume from last card on return
   - Track cumulative statistics across sessions
   - Add session history view

4. **Progress Counter UI** ❌
   - Add fixed header with correct/incorrect counts
   - Visual progress bar showing deck completion
   - Real-time updates with animations
   - Session statistics summary

5. **Design System Adherence** ⚠️
   - Audit current implementation against spec.md
   - Centralize all colors in theme.css
   - Ensure consistent spacing using CSS variables
   - Verify responsive breakpoints match spec

## Testing Strategy

### Unit Tests
- Test file: `src/__tests__/pages/Flashcards.test.tsx`
- Key scenarios:
  - Card flipping animation
  - Keyboard navigation
  - Touch/mouse gestures
  - Progress tracking
  - Settings persistence
  - Deck completion and restart

### Component Tests
```typescript
describe('FlashCard Component', () => {
  it('should render correctly', () => {
    // Test component rendering
  });

  it('should handle click interactions', () => {
    // Test flip on click
  });

  it('should animate at 60 FPS', () => {
    // Test animation performance
  });
});
```

### Integration Tests
- Navigation flow from Home → Deck → Flashcards
- State persistence with localStorage
- Zustand store integration

### E2E Tests (Playwright)
```typescript
describe('Flashcards E2E', () => {
  it('should complete full flashcard session', async () => {
    await page.goto('/');
    await page.click('[data-testid="deck-chinese-chpt9"]');
    await page.click('[data-testid="start-flashcards"]');

    // Test card interactions
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowRight');

    // Verify progress
    await expect(page.locator('[data-testid="correct-count"]')).toContainText('1');
  });
});
```

### Performance Tests
- FPS during flip animations: 60 FPS target
- First Contentful Paint: <1.5s
- Lighthouse score: >90

## Browser-Specific Considerations

### Desktop
- Hover states for better UX
- Keyboard shortcuts prominently displayed
- Larger touch targets for trackpad users

### Mobile
- Touch gesture zones clearly defined
- Swipe indicators for discoverability
- Responsive card sizing

### Tablet
- Optimized layout for landscape/portrait
- Touch and keyboard support
- Appropriate font sizing

## Documentation Updates Required
1. `docs/spec.md` - Mark Phase 1 features as implemented
2. `README.md` - Add setup and run instructions
3. Component documentation with Storybook

## Success Criteria
1. App loads in <1.5 seconds
2. Flashcard animations run at 60 FPS
3. Keyboard and touch navigation work seamlessly
4. Progress tracking works accurately
5. Settings persist between sessions
6. Lighthouse score >90

## Dependencies
- react: ^18.3.x
- react-dom: ^18.3.x
- vite: ^5.x
- typescript: ^5.x
- react-router-dom: ^6.x
- zustand: ^4.x
- framer-motion: ^11.x
- vitest: ^1.x
- @testing-library/react: ^14.x

## Risks & Mitigations
1. **Risk**: Browser compatibility issues
   **Mitigation**: Test on all major browsers, use autoprefixer

2. **Risk**: Animation performance on older devices
   **Mitigation**: Use CSS transforms, GPU acceleration, reduce motion option

3. **Risk**: Touch gesture conflicts on mobile
   **Mitigation**: Clear gesture zones, visual feedback

## Accessibility Requirements
- Full keyboard navigation with visible focus indicators
- Screen reader announcements for card content
- High contrast mode support
- Reduced motion option respects prefers-reduced-motion
- Semantic HTML structure

## Release & Deployment Guide

### Build Configuration
- Configure `vite.config.ts` with PWA plugin
- Set up Web App Manifest
- Configure Service Worker with Workbox

### Testing Checklist
- [ ] Unit tests passing
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile testing (iOS Safari, Chrome Android)
- [ ] Lighthouse audit >90
- [ ] Accessibility audit (axe DevTools)
- [ ] Performance profiling complete

### Release Process
1. Run full test suite
2. Build production bundle: `npm run build`
3. Test production build: `npm run preview`
4. Deploy to hosting service (Vercel/Netlify)
5. Test deployed version

### Rollback Strategy
- Keep previous build artifacts
- Version deployments
- Quick revert procedure documented

## PWA Implementation Details

### Service Worker
```javascript
// Basic offline caching with Workbox
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ request }) => request.destination === 'document',
  new StaleWhileRevalidate()
);
```

### Web App Manifest
```json
{
  "name": "Quizly - Flashcard Learning",
  "short_name": "Quizly",
  "theme_color": "#4A90E2",
  "background_color": "#FFFFFF",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Performance Optimizations
- Code splitting with React.lazy()
- Image optimization with WebP/AVIF
- Font subsetting for Chinese characters
- Critical CSS inlining
- Preload key resources

---

*This ticket establishes the foundation for Quizly as a modern web application with the core infrastructure and first learning mode. Subsequent tickets will add Learn, Match, and Test modes.*