# Ticket 009: Match Mode Implementation

## Metadata

- **Status**: Not Started
- **Priority**: High
- **Effort**: 21 points
- **Created**: 2025-09-19
- **Type**: feature
- **Platforms**: Mobile/Desktop

## User Stories

### Primary User Story

As a learner, I want to play a matching game with my flashcards so that I can practice recognizing relationships between card sides in an interactive and engaging way.

### Secondary User Stories

- As a learner, I want to match different sides of cards together so that I can test my understanding of relationships between different types of content
- As a learner, I want to see my completion time and track improvements so that I can gamify my learning experience
- As a learner, I want the game to respect my mastery progress so that I don't waste time on cards I've already learned
- As a learner, I want configurable grid sizes and side combinations so that I can adjust difficulty and focus areas
- As a learner, I want to continue with missed cards so that I can practice what I struggled with

## Technical Requirements

### Functional Requirements

1. **Grid-Based Matching Game**: 3x4 grid (12 cards) with adjustable size in settings
2. **Timer System**: Count-up timer displaying elapsed time, pause/resume capability
3. **Card Side Configuration**: Default side_a and side_b shown, configurable via settings modal
4. **Multi-Way Matching**: Support 2-way (A↔B), 3-way (A↔B↔C), and complex groupings
5. **Match Detection**: Tap cards in sequence to create matches, visual feedback for attempts
6. **Sound Feedback**: Play success sound on correct matches, remove matched cards from grid
7. **Round Progression**: Continue until grid is empty, shuffle in new cards for subsequent rounds
8. **Results Screen**: Show completion time, best time for deck, play again option
9. **Mastery Integration**: Honor mastered cards store, exclude mastered cards as option
10. **Session Management**: Track missed cards similar to Learn mode for re-use in subsequent rounds

### Non-Functional Requirements

1. **Performance**: 60 FPS animations, smooth card interactions
2. **Accessibility**: Full keyboard navigation, screen reader support, focus indicators
3. **Mobile-First**: Touch-optimized interactions, responsive grid layout
4. **State Persistence**: Save in-progress games, restore on page reload

## Implementation Plan

### Phase 1: Core Match Infrastructure (8 points)

**Files to create/modify:**

- `src/pages/Match.tsx` - Main match mode page component
- `src/pages/Match.module.css` - Match page styles
- `src/components/modes/match/MatchContainer.tsx` - Core game container
- `src/components/modes/match/MatchContainer.module.css` - Container styles
- `src/components/modes/match/types.ts` - Match mode TypeScript definitions
- `src/components/modes/match/index.ts` - Export file
- `src/store/matchSessionStore.ts` - Match session state management
- `src/router/AppRouter.tsx` - Add match route
- `src/utils/lazyImports.ts` - Add lazy match component

**Component Structure:**

```typescript
// Match Types
interface MatchSettings extends ModeSettings {
  gridSize: { rows: number; cols: number };
  matchType: 'two_way' | 'three_way' | 'custom';
  cardSides: MatchCardSide[];
  enableTimer: boolean;
  includeMastered: boolean;
}

interface MatchCardSide {
  sides: string[]; // e.g., ['side_a'] or ['side_b', 'side_c']
  label: string; // Display label for this grouping
  count: number; // Number of cards showing this side combination
}

interface MatchCard {
  id: string;
  cardIndex: number;
  displaySides: string[];
  content: string;
  groupId: string; // Cards with same groupId should match
  isMatched: boolean;
  isSelected: boolean;
  position: { row: number; col: number };
}

interface MatchSessionState {
  deckId: string;
  currentRound: number;
  startTime: number;
  pausedTime: number;
  isPaused: boolean;
  grid: MatchCard[];
  selectedCards: string[];
  matchedPairs: string[][];
  missedCardIndices: number[];
  roundStartTime: number;
  bestTime: number | null;
  settings: MatchSettings;
}
```

**State Management:**

```typescript
interface MatchSessionStore {
  session: MatchSessionState | null;

  // Session management
  startSession: (deckId: string, settings: MatchSettings) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => void;

  // Game actions
  selectCard: (cardId: string) => void;
  clearSelection: () => void;
  processMatch: () => { isMatch: boolean; matchedCards?: string[] };

  // Round management
  startNewRound: (missedCards?: number[]) => void;
  generateGrid: (cards: Card[], settings: MatchSettings) => MatchCard[];

  // Persistence
  saveSession: () => void;
  loadSession: (deckId: string) => MatchSessionState | null;
}
```

**Implementation steps:**

1. Create match types and interfaces following existing patterns from `learn/types.ts`
2. Implement MatchSessionStore following patterns from `flashcardSessionStore.ts`
3. Create basic MatchContainer component with grid layout
4. Add match route to AppRouter following existing route patterns
5. Create Match page component following patterns from `Flashcards.tsx`

**Code Implementation:**

1. Run: `claude --agent code-writer "Implement match mode core infrastructure for Phase 1 following ticket #010 specifications"`
2. Run: `claude --agent code-quality-assessor "Review the match mode infrastructure for React best practices"`
3. Apply code quality improvements

**Testing:**

1. Run: `claude --agent test-writer "Write tests for match mode stores and types"`
2. Run: `claude --agent test-critic "Review tests for match mode infrastructure"`
3. Run: `claude --agent test-writer "Implement critic's suggestions"`

**Platform Testing:**

```bash
# Test routing
npm run dev
# Navigate to /match/[deckId] → Should load without errors

# Test store persistence
# Start match → Close browser → Reopen → Should restore state
```

**Commit**: `feat(match): implement core match mode infrastructure`

### Phase 2: Grid and Card Management (6 points)

**Files to create/modify:**

- `src/components/modes/match/MatchGrid.tsx` - Grid layout component
- `src/components/modes/match/MatchGrid.module.css` - Grid responsive styles
- `src/components/modes/match/MatchCard.tsx` - Individual match card component
- `src/components/modes/match/MatchCard.module.css` - Card styles and animations
- `src/components/modes/match/hooks/useMatchLogic.ts` - Match detection logic hook
- `src/utils/matchUtils.ts` - Card generation and matching utilities

**Component Structure:**

```typescript
interface MatchGridProps {
  cards: MatchCard[];
  onCardSelect: (cardId: string) => void;
  selectedCards: string[];
  matchedCards: string[][];
  gridSize: { rows: number; cols: number };
  isAnimating: boolean;
}

interface MatchCardProps {
  card: MatchCard;
  isSelected: boolean;
  isMatched: boolean;
  isAnimating: boolean;
  onSelect: (cardId: string) => void;
  position: { row: number; col: number };
}

// Match Logic Hook
interface UseMatchLogicReturn {
  generateMatchCards: (
    cards: Card[],
    settings: MatchSettings,
    gridSize: { rows: number; cols: number }
  ) => MatchCard[];

  checkMatch: (
    selectedCards: MatchCard[],
    matchType: 'two_way' | 'three_way' | 'custom'
  ) => boolean;

  shuffleGrid: (cards: MatchCard[]) => MatchCard[];
}
```

**Implementation steps:**

1. Create responsive grid layout using CSS Grid with mobile-first approach
2. Implement MatchCard component with hover states and selection animations
3. Build useMatchLogic hook for card generation and match validation
4. Add card selection state management with visual feedback
5. Implement match detection algorithm for different matching types

**Code Implementation:**

1. Run: `claude --agent code-writer "Implement match grid and card components for Phase 2 following ticket #010 specifications"`
2. Run: `claude --agent code-quality-assessor "Review match grid components for performance and accessibility"`
3. Apply code quality improvements

**Testing:**

1. Run: `claude --agent test-writer "Write tests for match grid and card components"`
2. Test responsive grid on different screen sizes
3. Test touch interactions on mobile devices

**Commit**: `feat(match): implement match grid and card selection system`

### Phase 3: Game Logic and Animations (4 points)

**Files to create/modify:**

- `src/components/modes/match/MatchTimer.tsx` - Timer display component
- `src/components/modes/match/MatchTimer.module.css` - Timer styles
- `src/components/modes/match/animations/matchAnimations.ts` - Framer Motion animations
- `src/hooks/useGameTimer.ts` - Reusable timer hook
- `src/utils/soundUtils.ts` - Sound feedback utilities

**Implementation steps:**

1. Create match timer with pause/resume functionality
2. Implement match success animations using Framer Motion
3. Add sound feedback for matches (integrate with existing audio system)
4. Create card removal animations for successful matches
5. Implement game completion detection and round transitions

**Code Implementation:**

1. Run: `claude --agent code-writer "Implement match game logic and animations for Phase 3 following ticket #010 specifications"`
2. Run: `claude --agent code-quality-assessor "Review match animations and timer for performance"`
3. Apply code quality improvements

**Testing:**

1. Test timer accuracy and pause/resume functionality
2. Test animations on different devices and browsers
3. Test sound feedback with audio enabled/disabled

**Commit**: `feat(match): implement match animations and timer system`

### Phase 4: Settings and Results Integration (3 points)

**Files to create/modify:**

- `src/components/modes/match/MatchResults.tsx` - Results modal component
- `src/components/modes/match/MatchResults.module.css` - Results styles
- `src/components/modals/settings/MatchSettings.tsx` - Match-specific settings
- `src/components/modals/UnifiedSettings.tsx` - Add match mode sections
- `src/store/matchBestTimesStore.ts` - Track best times per deck

**Implementation steps:**

1. Create match results modal showing completion time and best time
2. Implement match-specific settings (grid size, sides, matching type)
3. Integrate with UnifiedSettings modal following existing patterns
4. Add best times tracking with persistence
5. Create "Play Again" and "Back to Deck" functionality

**Code Implementation:**

1. Run: `claude --agent code-writer "Implement match settings and results for Phase 4 following ticket #010 specifications"`
2. Run: `claude --agent code-quality-assessor "Review match settings integration"`
3. Apply code quality improvements

**Testing:**

1. Test settings persistence across sessions
2. Test best time tracking and display
3. Test results modal on different screen sizes

**Commit**: `feat(match): implement match settings and results system`

## Testing Strategy

### Test File Organization

Following the project's existing test structure:

```
__tests__/
├── components/
│   └── modes/
│       └── match/          # New directory for match mode tests
│           ├── MatchContainer.test.tsx
│           ├── MatchGrid.test.tsx
│           ├── MatchCard.test.tsx
│           ├── MatchTimer.test.tsx
│           └── MatchResults.test.tsx
├── store/
│   └── matchSessionStore.test.ts
└── utils/
    └── matchUtils.test.ts
```

### Test Framework & Configuration

- **Test Runner**: Vitest (already configured in project)
- **Testing Library**: React Testing Library + user-event
- **Coverage Target**: 85% for match mode components (per vitest.config.ts)
- **Mocks**: Framer Motion, localStorage, fetch (configured in __tests__/setup.ts)
- **Test Utils**: Use existing testUtils.tsx for consistent test setup

### Unit Tests

**Store Tests** (`__tests__/store/matchSessionStore.test.ts`):

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMatchSessionStore } from '@/store/matchSessionStore';

describe('MatchSessionStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Session Management', () => {
    it('should start a new match session', () => {
      const { result } = renderHook(() => useMatchSessionStore());

      act(() => {
        result.current.startSession('deck-1', mockSettings);
      });

      expect(result.current.session).toBeDefined();
      expect(result.current.session?.deckId).toBe('deck-1');
    });

    it('should persist session to localStorage', () => {
      // Test persistence following existing flashcardSessionStore patterns
    });
  });

  describe('Card Selection', () => {
    it('should handle card selection and deselection', () => {
      // Test selection logic
    });

    it('should process matches correctly', () => {
      // Test match detection for 2-way, 3-way, custom
    });
  });

  describe('Timer Management', () => {
    it('should track elapsed time', () => {
      // Test timer functionality with vi.useFakeTimers()
    });
  });
});
```

### Component Tests

**Main Container Test** (`__tests__/components/modes/match/MatchContainer.test.tsx`):

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/testUtils';
import MatchContainer from '@/components/modes/match/MatchContainer';
import { Deck } from '@/types';

// Use existing mock deck pattern from LearnMode.integration.test.tsx
const mockDeck: Deck = {
  // ... deck structure
};

describe('MatchContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render match grid with correct dimensions', () => {
    render(<MatchContainer deck={mockDeck} />);

    const grid = screen.getByTestId('match-grid');
    expect(grid).toBeInTheDocument();
    expect(grid.children).toHaveLength(12); // 3x4 grid
  });

  it('should handle card matching flow', async () => {
    render(<MatchContainer deck={mockDeck} />);

    const card1 = screen.getByTestId('match-card-0');
    const card2 = screen.getByTestId('match-card-6');

    fireEvent.click(card1);
    expect(card1).toHaveClass('selected');

    fireEvent.click(card2);
    await waitFor(() => {
      expect(card1).toHaveClass('matched');
      expect(card2).toHaveClass('matched');
    });
  });

  it('should display timer and update', async () => {
    vi.useFakeTimers();
    render(<MatchContainer deck={mockDeck} />);

    const timer = screen.getByTestId('match-timer');
    expect(timer).toHaveTextContent('00:00');

    vi.advanceTimersByTime(5000);
    await waitFor(() => {
      expect(timer).toHaveTextContent('00:05');
    });

    vi.useRealTimers();
  });
});
```

### Integration Tests

**Match Mode Integration** (`__tests__/MatchMode.integration.test.tsx`):

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/testUtils';
import { BrowserRouter } from 'react-router-dom';
import Match from '@/pages/Match';

describe('Match Mode Integration', () => {
  it('should complete full match game flow', async () => {
    // Test complete user journey
  });

  it('should integrate with UnifiedSettings', async () => {
    // Test settings modal integration
  });

  it('should respect mastered cards store', async () => {
    // Test mastery integration
  });
});
```

### Accessibility Tests

Following project patterns from existing UI component tests:

```typescript
describe('Match Mode Accessibility', () => {
  it('should support keyboard navigation', () => {
    render(<MatchContainer deck={mockDeck} />);

    const firstCard = screen.getByTestId('match-card-0');
    firstCard.focus();

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByTestId('match-card-1')).toHaveFocus();
  });

  it('should have proper ARIA attributes', () => {
    render(<MatchContainer deck={mockDeck} />);

    const grid = screen.getByTestId('match-grid');
    expect(grid).toHaveAttribute('role', 'grid');
    expect(grid).toHaveAttribute('aria-label', 'Match game grid');
  });
});
```

### Performance Tests

Using existing test utilities:

```typescript
import { measureRenderTime } from '@/__tests__/utils/testUtils';

describe('Match Mode Performance', () => {
  it('should render grid within performance budget', async () => {
    const renderTime = await measureRenderTime(() => {
      render(<MatchContainer deck={mockDeck} />);
    });

    expect(renderTime).toBeLessThan(100); // 100ms budget
  });
});
```

### Test Commands

```bash
# Run all match mode tests
npm test -- match

# Run with coverage
npm run test:coverage -- match

# Watch mode for development
npm run test:watch -- match

# UI test runner
npm run test:ui
```

## Platform-Specific Considerations

### Mobile

- Touch targets: Minimum 44x44px for cards
- Responsive grid: Adapt to different screen sizes and orientations
- Performance: Optimize animations for lower-end devices
- Haptic feedback: Optional vibration on successful matches

### Desktop

- Keyboard navigation: Arrow keys for card selection, Enter to select
- Mouse interactions: Hover states, click feedback
- Larger grid support: Allow bigger grids on larger screens

## Documentation Updates Required

1. `README.md` - Add match mode documentation
2. `docs/spec.md` - Add match mode specifications
3. In-code documentation: JSDoc for match utilities and hooks

## Success Criteria

1. **Functional**: Successfully match cards and complete rounds with <2 second response time
2. **User Experience**: 95% match accuracy for valid card pairs
3. **Performance**: Maintain 60 FPS during animations on mid-range devices
4. **Accessibility**: Full keyboard navigation and screen reader support

## Dependencies

- **Existing**: Framer Motion (animations), Zustand (state), React Router (routing)
- **Audio System**: Integration with existing sound settings
- **Settings Modal**: Extension of UnifiedSettings system
- **Store Pattern**: Follow existing Zustand store patterns

## Risks & Mitigations

1. **Risk**: Complex grid layouts on small screens **Mitigation**: Responsive design with minimum card sizes and scrollable containers
2. **Risk**: Performance issues with animations **Mitigation**: Use CSS transforms and React.memo optimization
3. **Risk**: Match detection complexity **Mitigation**: Comprehensive test coverage and clear algorithm documentation
4. **Risk**: State synchronization issues **Mitigation**: Single source of truth in Zustand store

## Accessibility Requirements

- Screen reader support with proper ARIA labels for grid and cards
- Keyboard navigation with focus indicators
- High contrast mode support for card selection states
- Reduced motion support for animations
- Touch target size compliance (44x44px minimum)

## Release & Deployment Guide

### Build Configuration

- Update lazy imports in `utils/lazyImports.ts`
- Add match mode to navigation patterns
- Environment variables: None required

### Testing Checklist

- [ ] Grid renders correctly on all supported screen sizes
- [ ] Match detection works for all configured matching types
- [ ] Timer functions correctly (start, pause, resume, stop)
- [ ] Sound feedback plays when enabled
- [ ] Settings persist across browser sessions
- [ ] Best times track correctly per deck
- [ ] Mastery integration excludes mastered cards when configured
- [ ] Results modal displays accurate completion times
- [ ] Keyboard navigation works for all interactions
- [ ] Screen reader announces game state changes

### Release Process

1. Create feature branch: `feature/match-mode`
2. Implement following phase order (1-4)
3. Run full test suite after each phase
4. Manual testing on iOS Safari and Android Chrome
5. Performance profiling with React DevTools
6. Accessibility audit with axe-core
7. Merge to main after all tests pass

### Rollback Strategy

- Feature flag to disable match mode if critical issues found
- Previous routing configuration available for quick rollback
- Session state isolated to prevent corruption of other modes

## Mobile-Specific Implementation Details

### Responsive Grid Layout

```css
.matchGrid {
  display: grid;
  grid-template-columns: repeat(var(--grid-cols), 1fr);
  grid-template-rows: repeat(var(--grid-rows), 1fr);
  gap: var(--space-2);
  padding: var(--space-4);
  max-width: 100vw;
  overflow-x: auto;
}

@media (min-width: 768px) {
  .matchGrid {
    gap: var(--space-4);
    padding: var(--space-6);
    max-width: 800px;
    margin: 0 auto;
  }
}
```

### Touch Interactions

```typescript
// Touch-optimized card selection
const handleCardTouch = useCallback((cardId: string) => {
  // Haptic feedback for supported devices
  if ('vibrate' in navigator) {
    navigator.vibrate(50);
  }

  selectCard(cardId);
}, [selectCard]);
```

### State Persistence

```typescript
// Session persistence for page reloads
const matchSessionStore = create<MatchSessionStore>()(
  persist(
    (set, get) => ({
      // Store implementation
    }),
    {
      name: 'match-session-store',
      partialize: state => ({
        // Only persist essential game state
        session: state.session,
      }),
    }
  )
);
```

### Performance Optimizations

- Use React.memo for MatchCard components
- Implement virtual scrolling for large grids
- Use CSS transforms for animations
- Debounce rapid card selections
- Lazy load match page component

### Error Handling

```typescript
// Game state error recovery
const handleMatchError = (error: Error) => {
  console.error('Match game error:', error);

  // Reset to safe state
  clearSelection();

  // Show user-friendly error message
  showNotification('Game error occurred. Restarting round...', 'error');

  // Restart current round
  startNewRound();
};
```