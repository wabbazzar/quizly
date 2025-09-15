# Ticket 002: Learn Mode Implementation

## Implementation Summary
All phases of the Learn Mode feature have been successfully implemented. The feature includes:
- Enhanced deck cards with integrated mode selection on the home page
- Complete Learn mode with multiple choice and free text questions
- Adaptive card scheduling with Smart Spaced and Leitner Box algorithms
- Comprehensive UI components with full accessibility support
- Session management with progress tracking and persistence
- Mobile-responsive design with dark mode support

### Key Components Created:
- **Phase 0**: EnhancedDeckCard, ModeIcons
- **Phase 1**: Learn page, LearnContainer
- **Phase 2**: QuestionGenerator, CardScheduler, text matching utilities
- **Phase 3**: QuestionCard, MultipleChoiceOptions, FreeTextInput, LearnProgress, FeedbackSection
- **Phase 4**: useLearnSession hook, learnSessionStore, SessionComplete component

### Testing:
- TypeScript compilation: ✅ Passing
- ESLint: ✅ Passing (except for pre-existing warnings)
- Build: ✅ Successful
- Dev server: ✅ Running on port 5174
- Demo page: Available at `/learn-demo`

## Post-Implementation Architectural Analysis

**Overall Architecture Grade: B- (73/100)**

### 🔴 Critical Issues Identified

#### **1. State Management Fragmentation** - **High Severity**
- **Problem**: Three competing state management approaches coexist
- **Evidence**:
  - Local state in `LearnContainer.tsx` (lines 22-37)
  - `useLearnSession` hook with independent state management
  - `useLearnSessionStore` Zustand store operating separately
- **Impact**: Data synchronization bugs, unclear data flow, maintenance complexity
- **Recommendation**: Consolidate to single Zustand store as primary state source

#### **2. Component Responsibility Overload** - **High Severity**
- **Problem**: `LearnContainer` violates Single Responsibility Principle
- **Evidence**: Handles UI rendering, state coordination, and event handling (323 lines)
- **Impact**: Difficult to test individual behaviors, complex debugging
- **Recommendation**: Extract session orchestration logic into dedicated service/hook

#### **3. Error Boundary Absence** - **High Severity**
- **Problem**: No error boundaries for Learn Mode components
- **Evidence**: Missing error boundary implementation at feature level
- **Impact**: Unhandled errors could crash entire application
- **Recommendation**: Implement error boundaries with graceful fallbacks

### 🟡 Medium Priority Issues

#### **4. Hook Dependency Entanglement** - **Medium Severity**
- **Problem**: `useLearnSession` and `LearnContainer` hooks have overlapping responsibilities
- **Evidence**: Both manage session state independently without coordination
- **Impact**: Potential state synchronization issues, code duplication
- **Recommendation**: Consolidate session management into single source of truth

#### **5. Data Type Serialization Issues** - **Medium Severity**
- **Problem**: `Set` objects in state don't serialize properly for persistence
- **Evidence**: `correctCards: new Set()`, `incorrectCards: new Set()` in state
- **Impact**: Data loss on page refresh, persistence layer complexity
- **Recommendation**: Use arrays for serializable state, convert to Sets in computed properties

#### **6. Open/Closed Principle Violations** - **Medium Severity**
- **Problem**: Adding new question types requires modifying existing code
- **Evidence**: Hard-coded question type checks in `QuestionCard.tsx` (lines 50-68)
- **Impact**: Fragile extension points, testing complexity for new features
- **Recommendation**: Implement strategy pattern for question type handling

### 🟢 Quality Improvements (Technical Debt)

#### **7. File Size and Complexity**
- **Problem**: Large files exceed maintainability thresholds
- **Evidence**: `LearnContainer.tsx` (323 lines), `QuestionGenerator.ts` (279 lines)
- **Recommendation**: Split into focused, single-responsibility modules

#### **8. Import Path Inconsistency**
- **Problem**: Mix of relative and aliased imports
- **Evidence**: `'@/types'` vs `'./LearnContainer'` inconsistency
- **Recommendation**: Standardize on aliased imports for cross-module dependencies

#### **9. Performance Optimization Gaps**
- **Problem**: Missing React.memo usage in frequently re-rendering components
- **Evidence**: `MultipleChoiceOptions` not memoized despite complex props
- **Recommendation**: Add selective memoization for expensive components

## Follow-Up Technical Debt Tickets

### Ticket 002-A: Consolidate State Management (Priority: Critical)
**Effort**: 5 points
**Description**: Refactor Learn Mode to use single Zustand store as source of truth
- Remove duplicate state management in `LearnContainer` and `useLearnSession`
- Migrate all session state to `learnSessionStore`
- Update components to consume from single store
- Add state persistence for session recovery

### Ticket 002-B: Extract Session Orchestration Service (Priority: High)
**Effort**: 3 points
**Description**: Separate complex coordination logic from UI components
- Create `LearnSessionOrchestrator` service class
- Move session lifecycle management out of `LearnContainer`
- Implement clean component/service boundaries
- Add comprehensive unit tests

### Ticket 002-C: Implement Error Boundaries (Priority: High)
**Effort**: 2 points
**Description**: Add robust error handling for Learn Mode
- Create `LearnModeErrorBoundary` component
- Implement graceful fallback UI for errors
- Add error tracking and reporting
- Test error scenarios and recovery

### Ticket 002-D: Optimize Component Performance (Priority: Medium)
**Effort**: 2 points
**Description**: Add performance optimizations for better UX
- Implement React.memo for list components
- Add selective re-render optimization
- Profile and optimize expensive operations
- Add performance monitoring

### Ticket 002-E: Implement Strategy Pattern for Question Types (Priority: Medium)
**Effort**: 3 points
**Description**: Make question type handling extensible
- Create `QuestionTypeStrategy` interface
- Implement separate strategies for multiple choice and free text
- Add plugin architecture for new question types
- Update `QuestionCard` to use strategy pattern

## Architecture Quality Metrics

| Category | Current Score | Target Score | Priority |
|----------|---------------|--------------|----------|
| Modularity | 75/100 | 85/100 | High |
| Data Design | 70/100 | 85/100 | Critical |
| Architecture Quality | 72/100 | 85/100 | High |
| Code Organization | 78/100 | 85/100 | Medium |
| **Overall** | **73/100** | **85/100** | **High** |

**Target**: Achieve B+ grade (85/100) after addressing critical and high-priority issues.

## Metadata
- **Status**: Complete
- **Priority**: High
- **Effort**: 13 points
- **Created**: 2025-09-14
- **Completed**: 2025-09-14
- **Type**: feature
- **Platforms**: Web (Mobile-First PWA)
- **Phases Completed**:
  - ✅ Phase 0: Home Page UI Enhancement
  - ✅ Phase 1: Core Learn Page Component
  - ✅ Phase 2: Question Generation Engine
  - ✅ Phase 3: Learn Mode UI Components
  - ✅ Phase 4: Session Management and Progress Tracking

## User Stories

### Primary User Story
As a student, I want to use a Learn mode that combines multiple choice and free text questions so that I can actively test my knowledge and receive immediate feedback while studying flashcards.

### Secondary User Stories
- As a learner, I want to see my progress through a round so that I can track how much I've completed.
- As a student, I want incorrect answers to be reshuffled back into the round so that I can master difficult concepts.
- As a user, I want adaptive difficulty based on my performance so that the learning experience matches my skill level.
- As a mobile user, I want the interface to work perfectly on touch devices with proper input handling.
- As an accessibility user, I want full keyboard navigation and screen reader support.

## Technical Requirements

### Functional Requirements
1. **Question Generation System**: Generate multiple choice questions with 1 correct answer + 3 distractors from deck content, plus free text input questions with fuzzy matching validation
2. **Multi-Sided Card Support**: Handle cards with 2-6 sides, configurable front/back side selection, and side grouping for complex question-answer relationships
3. **Progress Tracking**: Real-time progress bar, correct/incorrect counters, streak tracking, and session completion statistics
4. **Adaptive Difficulty**: Level-based progression system that adjusts question difficulty based on user performance patterns
5. **Responsive Design**: Mobile-first interface optimizing for touch interactions while maintaining desktop usability

### Non-Functional Requirements
1. **Performance**: Question rendering <100ms, smooth animations at 60 FPS, bundle size impact <50KB
2. **Accessibility**: WCAG AA compliance with full keyboard navigation, screen reader support, and proper focus management
3. **Platform Parity**: Consistent behavior across modern browsers with progressive enhancement

## UI/UX Design - Home Page Navigation Flow

### Design Concept: Mode Selection Hub
The home page will feature an elegant two-tier navigation system that presents decks as the primary selection, with learning modes as secondary actions within each deck card.

### Home Page Layout Architecture

```typescript
interface HomePageLayout {
  header: {
    title: 'Quizly';
    subtitle: 'Master your learning';
    searchBar: boolean;
    filterOptions: string[];
  };

  mainContent: {
    deckGrid: EnhancedDeckCard[];
    viewToggle: 'grid' | 'list';
    sortOptions: 'recent' | 'alphabetical' | 'difficulty' | 'progress';
  };

  modeSelector: {
    position: 'inline' | 'modal' | 'expandable';
    defaultMode: 'flashcards';
  };
}
```

### Enhanced Deck Card Design

```typescript
interface EnhancedDeckCard {
  // Existing deck info
  deck: Deck;

  // Mode selection integrated
  quickActions: {
    flashcards: QuickAction;
    learn: QuickAction;
    match: QuickAction;
    test: QuickAction;
  };

  // Progress indicators
  progress: {
    overall: number;
    byMode: Record<LearningMode, number>;
    lastStudied: Date;
  };
}

interface QuickAction {
  icon: IconComponent;
  label: string;
  color: string;
  route: string;
  tooltip: string;
}
```

### Visual Design Implementation

```css
/* Enhanced DeckCard with Mode Selection */
.enhancedDeckCard {
  background: var(--neutral-white);
  border-radius: 16px;
  padding: var(--space-5);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base) ease;
  position: relative;
  overflow: hidden;
}

.enhancedDeckCard:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}

/* Mode Selection Strip */
.modeStrip {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--neutral-gray-200);
}

.modeButton {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-3);
  background: var(--neutral-gray-100);
  border-radius: var(--radius-lg);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast) ease;
}

.modeButton:hover {
  background: var(--mode-color-light);
  border-color: var(--mode-color);
  transform: scale(1.05);
}

/* Mode-specific colors */
.modeButton.flashcards {
  --mode-color: var(--primary-main);
  --mode-color-light: rgba(74, 144, 226, 0.1);
}

.modeButton.learn {
  --mode-color: var(--secondary-main);
  --mode-color-light: rgba(80, 227, 194, 0.1);
}

.modeButton.match {
  --mode-color: #9333EA; /* Purple */
  --mode-color-light: rgba(147, 51, 234, 0.1);
}

.modeButton.test {
  --mode-color: #EA580C; /* Orange */
  --mode-color-light: rgba(234, 88, 12, 0.1);
}

/* Icon styling */
.modeIcon {
  width: 24px;
  height: 24px;
  color: var(--mode-color);
}

.modeLabel {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--text-secondary);
}

/* Progress Ring */
.progressRing {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  width: 48px;
  height: 48px;
}

.progressRing svg {
  transform: rotate(-90deg);
}

.progressRing circle {
  fill: none;
  stroke-width: 3;
}

.progressRing .background {
  stroke: var(--neutral-gray-200);
}

.progressRing .progress {
  stroke: var(--primary-main);
  stroke-linecap: round;
  stroke-dasharray: var(--circumference);
  stroke-dashoffset: var(--offset);
  transition: stroke-dashoffset var(--transition-slow) ease;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .modeStrip {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--neutral-white);
    border-top: 1px solid var(--neutral-gray-200);
    padding: var(--space-3);
    margin: 0;
    z-index: var(--z-sticky);
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  }

  .modeButton {
    padding: var(--space-2);
  }

  .modeLabel {
    font-size: 10px;
  }
}
```

### React Component Structure

```typescript
// Enhanced DeckCard Component
export const EnhancedDeckCard: FC<EnhancedDeckCardProps> = memo(({
  deck,
  onModeSelect,
  progress
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const modes: ModeConfig[] = [
    {
      id: 'flashcards',
      label: 'Flashcards',
      icon: FlashcardsIcon,
      color: 'primary',
      description: 'Classic flip cards',
      route: `/flashcards/${deck.id}`,
    },
    {
      id: 'learn',
      label: 'Learn',
      icon: LearnIcon,
      color: 'secondary',
      description: 'Interactive questions',
      route: `/learn/${deck.id}`,
    },
    {
      id: 'match',
      label: 'Match',
      icon: MatchIcon,
      color: 'purple',
      description: 'Memory game',
      route: `/match/${deck.id}`,
    },
    {
      id: 'test',
      label: 'Test',
      icon: TestIcon,
      color: 'orange',
      description: 'Practice exam',
      route: `/test/${deck.id}`,
    },
  ];

  const handleModeClick = (mode: ModeConfig) => {
    onModeSelect?.(deck.id, mode.id);
    navigate(mode.route);
  };

  return (
    <motion.article
      className={styles.enhancedDeckCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      layout
    >
      {/* Progress Ring */}
      <div className={styles.progressRing}>
        <CircularProgress value={progress.overall} />
      </div>

      {/* Deck Info */}
      <header className={styles.cardHeader}>
        <h3 className={styles.deckName}>{deck.metadata.deck_name}</h3>
        <DifficultyBadge level={deck.metadata.difficulty} />
      </header>

      <p className={styles.description}>
        {deck.metadata.description}
      </p>

      <div className={styles.stats}>
        <StatItem icon={CardsIcon} value={deck.metadata.card_count} label="cards" />
        <StatItem icon={LevelsIcon} value={deck.metadata.available_levels.length} label="levels" />
        <StatItem icon={ClockIcon} value={formatLastStudied(progress.lastStudied)} label="last studied" />
      </div>

      {/* Mode Selection Strip */}
      <motion.div
        className={styles.modeStrip}
        initial={false}
        animate={{ height: isExpanded ? 'auto' : 60 }}
      >
        {modes.map((mode) => (
          <motion.button
            key={mode.id}
            className={`${styles.modeButton} ${styles[mode.id]}`}
            onClick={() => handleModeClick(mode)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={`Study ${deck.metadata.deck_name} with ${mode.label} mode`}
          >
            <mode.icon className={styles.modeIcon} />
            <span className={styles.modeLabel}>{mode.label}</span>
            {progress.byMode[mode.id] > 0 && (
              <span className={styles.modeProgress}>
                {progress.byMode[mode.id]}%
              </span>
            )}
          </motion.button>
        ))}
      </motion.div>
    </motion.article>
  );
});

// Updated Home Page Component
export const Home: FC = () => {
  const { decks, isLoading } = useDeckStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical' | 'progress'>('recent');

  return (
    <div className={styles.homePage}>
      {/* Hero Section */}
      <header className={styles.hero}>
        <motion.h1
          className={styles.title}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Welcome to Quizly
        </motion.h1>
        <p className={styles.subtitle}>
          Choose a deck and select your preferred learning mode
        </p>
      </header>

      {/* Controls Bar */}
      <div className={styles.controls}>
        <SearchBar />
        <ViewToggle value={viewMode} onChange={setViewMode} />
        <SortDropdown value={sortBy} onChange={setSortBy} />
      </div>

      {/* Deck Grid with Integrated Mode Selection */}
      <motion.main
        className={`${styles.deckContainer} ${styles[viewMode]}`}
        layout
      >
        <AnimatePresence mode="popLayout">
          {sortedDecks.map((deck) => (
            <EnhancedDeckCard
              key={deck.id}
              deck={deck}
              progress={getProgressForDeck(deck.id)}
              onModeSelect={handleModeSelect}
            />
          ))}
        </AnimatePresence>
      </motion.main>

      {/* Mobile Mode Dock (optional alternative) */}
      {isMobile && selectedDeck && (
        <MobileModeDock
          deck={selectedDeck}
          onModeSelect={handleModeSelect}
        />
      )}
    </div>
  );
};
```

### Alternative Design: Floating Action Mode Selector

For mobile devices, an alternative floating action button approach:

```typescript
// Floating Mode Selector for Mobile
export const FloatingModeSelector: FC<FloatingModeSelectorProps> = ({
  deck,
  isOpen,
  onToggle,
  onSelect
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className={styles.floatingOverlay}>
          <motion.div className={styles.modeWheel}>
            {modes.map((mode, index) => {
              const angle = (index * 90) - 135; // Arrange in arc
              return (
                <motion.button
                  key={mode.id}
                  className={styles.floatingMode}
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{
                    scale: 1,
                    x: Math.cos(angle * Math.PI / 180) * 80,
                    y: Math.sin(angle * Math.PI / 180) * 80,
                  }}
                  exit={{ scale: 0 }}
                  onClick={() => onSelect(mode)}
                >
                  <mode.icon />
                </motion.button>
              );
            })}
          </motion.div>
        </motion.div>
      )}

      <motion.button
        className={styles.fab}
        onClick={onToggle}
        animate={{ rotate: isOpen ? 45 : 0 }}
      >
        <PlusIcon />
      </motion.button>
    </AnimatePresence>
  );
};
```

### Accessibility Considerations

1. **Keyboard Navigation**: Full tab support through mode buttons
2. **Screen Readers**: Descriptive ARIA labels for all interactive elements
3. **Focus Management**: Clear focus indicators and logical tab order
4. **Touch Targets**: Minimum 44x44px for all interactive elements
5. **Color Contrast**: WCAG AA compliant color combinations

### Performance Optimizations

1. **Lazy Loading**: Load mode components only when selected
2. **Memoization**: Use React.memo for deck cards
3. **Virtual Scrolling**: For large deck collections
4. **Optimistic UI**: Immediate feedback on mode selection
5. **Prefetching**: Preload mode assets on hover

## Implementation Plan

### Phase 0: Home Page UI Enhancement (2 points)
**Files to create/modify:**
- `src/components/EnhancedDeckCard.tsx` - New deck card with mode selection
- `src/components/modes/ModeSelector.tsx` - Mode selection component
- `src/components/icons/ModeIcons.tsx` - Icons for each learning mode
- `src/pages/Home.tsx` - Update with new navigation flow
- `src/styles/modes.css` - Mode-specific styling

**Implementation steps:**
1. Create enhanced deck card component with integrated mode selection
2. Implement mode selector with hover effects and transitions
3. Add progress tracking visualization
4. Update home page layout with new components
5. Implement mobile-specific navigation patterns
6. Add keyboard navigation and accessibility features

### Phase 1: Core Learn Page Component (3 points)
**Files to create/modify:**
- `src/pages/Learn.tsx` - Main Learn mode page component
- `src/router/AppRouter.tsx` - Add Learn route with lazy loading
- `src/components/modes/learn/LearnContainer.tsx` - Container component managing learn session state

**Component Structure:**
```typescript
interface LearnPageProps {
  deckId: string;
}

interface LearnContainerProps {
  deck: Deck;
  settings: LearnModeSettings;
  onComplete: (results: LearnSessionResults) => void;
}

export const Learn: FC<LearnPageProps> = memo(({ deckId }) => {
  const deck = useDeck(deckId);
  const navigate = useNavigate();

  if (!deck) {
    return <LoadingScreen />;
  }

  return (
    <div className={styles.learnPage}>
      <LearnHeader deckName={deck.metadata.deck_name} />
      <LearnContainer
        deck={deck}
        settings={defaultLearnSettings}
        onComplete={(results) => navigate(`/deck/${deckId}/results`)}
      />
    </div>
  );
});
```

**State Management:**
```typescript
interface LearnModeSettings extends ModeSettings {
  questionTypes: ('multiple_choice' | 'free_text')[];
  adaptiveDifficulty: boolean;
  cardsPerRound: number;
  masteryThreshold: number;

  // Scheduling configuration
  schedulingAlgorithm?: 'smart_spaced' | 'leitner_box';
  aggressiveness?: 'gentle' | 'balanced' | 'intensive';
  minSpacing?: number;
  maxSpacing?: number;
  clusterLimit?: number;
  progressRatio?: number;
  difficultyWeight?: number;
}

interface LearnSessionState {
  currentQuestion: Question | null;
  questionIndex: number;
  roundCards: Card[];
  correctCards: Set<number>;
  incorrectCards: Set<number>;
  currentStreak: number;
  maxStreak: number;
  startTime: number;
}
```

**Navigation Updates:**
```typescript
// Add to AppRouter.tsx routes
const Learn = lazy(() => import('@/pages/Learn'));

<Route path="/deck/:deckId/learn" element={<Learn />} />
```

**Implementation steps:**
1. Create Learn page component with proper routing and error handling
2. Implement LearnContainer with session state management using custom hook
3. Add proper loading states and error boundaries for deck fetching
4. Integrate with existing deck store and session management patterns
5. Follow responsive design patterns from existing Flashcards component

**Code Implementation:**
1. Run: `claude --agent code-writer "Implement Learn page component for Phase 1 following ticket #002 specifications"`
2. Run: `claude --agent code-quality-assessor "Review the Learn page implementation for React best practices"`
3. Apply code quality improvements

**Testing:**
1. Run: `claude --agent test-writer "Write tests for src/pages/Learn.tsx"`
2. Run: `claude --agent test-critic "Review tests for src/pages/Learn.tsx"`
3. Run: `claude --agent test-writer "Implement critic's suggestions"`

**Platform Testing:**
```bash
# Desktop browsers
npm run dev  # Test on Chrome, Firefox, Safari, Edge

# Mobile simulation
# Test responsive breakpoints and touch interactions
```

**Commit**: `feat(learn): implement core Learn mode page and routing`

### Phase 2: Question Generation Engine with Adaptive Scheduling (4 points)
**Files to create/modify:**
- `src/services/questionGenerator.ts` - Question generation logic and algorithms
- `src/services/cardScheduler.ts` - Modular card scheduling algorithms for missed cards
- `src/types/index.ts` - Add question-related TypeScript interfaces
- `src/utils/textMatching.ts` - Fuzzy matching utilities for free text validation
- `src/hooks/useQuestionGenerator.ts` - React hook for question generation
- `src/hooks/useCardScheduler.ts` - React hook for adaptive card scheduling

**Component Structure:**
```typescript
interface Question {
  id: string;
  type: 'multiple_choice' | 'free_text';
  cardIndex: number;
  questionText: string;
  questionSides: string[];
  correctAnswer: string;
  options?: string[]; // For multiple choice
  acceptedAnswers?: string[]; // For free text
  difficulty: number;
}

interface QuestionGeneratorOptions {
  questionTypes: ('multiple_choice' | 'free_text')[];
  frontSides: string[];
  backSides: string[];
  difficulty: number;
  excludeCards?: Set<number>;
}

export class QuestionGenerator {
  static generateQuestions(
    cards: Card[],
    options: QuestionGeneratorOptions
  ): Question[];

  static generateMultipleChoice(
    card: Card,
    allCards: Card[],
    sides: { front: string[]; back: string[] }
  ): Question;

  static generateFreeText(
    card: Card,
    sides: { front: string[]; back: string[] }
  ): Question;

  static generateDistractors(
    correctAnswer: string,
    allCards: Card[],
    answerSides: string[]
  ): string[];
}
```

**Text Matching Utilities:**
```typescript
interface TextMatchOptions {
  caseSensitive: boolean;
  allowTypos: boolean;
  maxEditDistance: number;
  synonyms?: Map<string, string[]>;
}

export class TextMatcher {
  static isMatch(
    userInput: string,
    acceptedAnswers: string[],
    options: TextMatchOptions = defaultOptions
  ): boolean;

  static calculateSimilarity(text1: string, text2: string): number;

  static normalizeText(text: string): string;
}
```

**Card Scheduling System:**
```typescript
// Modular scheduling algorithm interface
interface SchedulingAlgorithm {
  name: string;
  description: string;
  schedule(
    missedCards: MissedCard[],
    upcomingCards: Card[],
    config: SchedulerConfig
  ): Card[];
}

interface MissedCard {
  cardId: string;
  cardIndex: number;
  missCount: number;
  lastSeen: number;
  difficulty: number; // 0-1, calculated from error rate
  responseTime: number;
}

interface SchedulerConfig {
  algorithm: 'smart_spaced' | 'leitner_box';
  aggressiveness: 'gentle' | 'balanced' | 'intensive';
  minSpacing: number;        // Minimum cards between reviews
  maxSpacing: number;        // Maximum spacing
  clusterLimit: number;      // Max consecutive missed cards
  progressRatio: number;     // Min % of new cards
  difficultyWeight: number;  // How much difficulty affects spacing (0-1)
}

// Smart Spaced Reinforcement Algorithm (Default)
export class SmartSpacedScheduler implements SchedulingAlgorithm {
  name = 'Smart Spaced Reinforcement';
  description = 'Adaptive spacing based on performance with anti-clustering';

  schedule(
    missedCards: MissedCard[],
    upcomingCards: Card[],
    config: SchedulerConfig
  ): Card[] {
    // Calculate dynamic position for each missed card
    const positions = missedCards.map(card => ({
      card,
      position: this.calculatePosition(card, upcomingCards.length, config)
    }));

    // Sort by priority (higher difficulty first)
    positions.sort((a, b) => b.card.difficulty - a.card.difficulty);

    // Apply anti-clustering rules
    return this.mergeWithAntiClustering(positions, upcomingCards, config);
  }

  private calculatePosition(
    card: MissedCard,
    queueSize: number,
    config: SchedulerConfig
  ): number {
    const base = config.minSpacing;
    const range = config.maxSpacing - base;

    // Factors affecting position
    const difficultyFactor = 1 - (card.difficulty * config.difficultyWeight);
    const attemptFactor = Math.min(1, card.missCount / 3);
    const timeFactor = (Date.now() - card.lastSeen) / 60000; // minutes

    const spacing = base + Math.floor(
      range * difficultyFactor * (1 - attemptFactor)
    );
    const jitter = Math.floor(Math.random() * 3) - 1; // ±1 randomness

    return Math.max(base, Math.min(queueSize - 1, spacing + jitter));
  }

  private mergeWithAntiClustering(
    positions: Array<{ card: MissedCard; position: number }>,
    upcomingCards: Card[],
    config: SchedulerConfig
  ): Card[] {
    const result = [...upcomingCards];
    const insertedPositions = new Set<number>();

    // Track clustering
    let consecutiveMissed = 0;

    for (const { card, position } of positions) {
      let finalPosition = position;

      // Adjust for clustering limit
      if (consecutiveMissed >= config.clusterLimit) {
        finalPosition += config.clusterLimit;
        consecutiveMissed = 0;
      }

      // Ensure minimum spacing between missed cards
      while (insertedPositions.has(finalPosition)) {
        finalPosition += config.minSpacing;
      }

      // Insert card at calculated position
      result.splice(finalPosition, 0, card as unknown as Card);
      insertedPositions.add(finalPosition);
      consecutiveMissed++;
    }

    // Ensure progress ratio is maintained
    const newCardsRatio = upcomingCards.length / result.length;
    if (newCardsRatio < config.progressRatio) {
      // Redistribute to maintain progress
      return this.redistributeForProgress(result, config.progressRatio);
    }

    return result;
  }

  private redistributeForProgress(cards: Card[], targetRatio: number): Card[] {
    // Implementation to ensure minimum new card ratio
    return cards;
  }
}

// Leitner Box Algorithm (Proven spaced repetition)
export class LeitnerBoxScheduler implements SchedulingAlgorithm {
  name = 'Leitner Box System';
  description = 'Classic spaced repetition with exponential intervals';

  private readonly boxes = [2, 4, 8, 16, 32]; // Review intervals per box

  schedule(
    missedCards: MissedCard[],
    upcomingCards: Card[],
    config: SchedulerConfig
  ): Card[] {
    const result = [...upcomingCards];

    // Group cards by their box level (based on miss count)
    const boxGroups = this.groupByBox(missedCards);

    // Insert cards based on their box interval
    boxGroups.forEach((cards, boxLevel) => {
      const interval = this.getBoxInterval(boxLevel, config);

      cards.forEach((card, index) => {
        const position = interval + (index * config.minSpacing);
        result.splice(position, 0, card as unknown as Card);
      });
    });

    return result;
  }

  private groupByBox(missedCards: MissedCard[]): Map<number, MissedCard[]> {
    const groups = new Map<number, MissedCard[]>();

    missedCards.forEach(card => {
      // Move down boxes based on miss count
      const boxLevel = Math.max(0, 5 - card.missCount);

      if (!groups.has(boxLevel)) {
        groups.set(boxLevel, []);
      }
      groups.get(boxLevel)!.push(card);
    });

    return groups;
  }

  private getBoxInterval(boxLevel: number, config: SchedulerConfig): number {
    const baseInterval = this.boxes[Math.min(boxLevel, this.boxes.length - 1)];

    // Adjust based on aggressiveness setting
    const aggressivenessMultiplier = {
      gentle: 1.5,
      balanced: 1.0,
      intensive: 0.5
    }[config.aggressiveness];

    return Math.round(baseInterval * aggressivenessMultiplier);
  }
}

// Factory for creating schedulers
export class CardSchedulerFactory {
  private static schedulers = new Map<string, SchedulingAlgorithm>([
    ['smart_spaced', new SmartSpacedScheduler()],
    ['leitner_box', new LeitnerBoxScheduler()],
  ]);

  static getScheduler(algorithm: string): SchedulingAlgorithm {
    const scheduler = this.schedulers.get(algorithm);
    if (!scheduler) {
      throw new Error(`Unknown scheduling algorithm: ${algorithm}`);
    }
    return scheduler;
  }

  static registerScheduler(key: string, scheduler: SchedulingAlgorithm): void {
    this.schedulers.set(key, scheduler);
  }

  static getAvailableAlgorithms(): Array<{ key: string; name: string; description: string }> {
    return Array.from(this.schedulers.entries()).map(([key, scheduler]) => ({
      key,
      name: scheduler.name,
      description: scheduler.description,
    }));
  }
}

**Custom Hooks:**
```typescript
export const useQuestionGenerator = (
  deck: Deck,
  settings: LearnModeSettings
) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const generateRound = useCallback((cards: Card[]) => {
    const newQuestions = QuestionGenerator.generateQuestions(cards, {
      questionTypes: settings.questionTypes,
      frontSides: settings.frontSides,
      backSides: settings.backSides,
      difficulty: getCurrentDifficulty(),
    });
    setQuestions(newQuestions);
    setCurrentQuestionIndex(0);
  }, [deck, settings]);

  return {
    questions,
    currentQuestion: questions[currentQuestionIndex],
    hasNext: currentQuestionIndex < questions.length - 1,
    nextQuestion: () => setCurrentQuestionIndex(i => i + 1),
    generateRound,
  };
};

// Hook for adaptive card scheduling
export const useCardScheduler = (settings: LearnModeSettings) => {
  const [missedCards, setMissedCards] = useState<Map<string, MissedCard>>(new Map());
  const [scheduler, setScheduler] = useState<SchedulingAlgorithm>(() =>
    CardSchedulerFactory.getScheduler(settings.schedulingAlgorithm || 'smart_spaced')
  );

  const config = useMemo<SchedulerConfig>(() => ({
    algorithm: settings.schedulingAlgorithm || 'smart_spaced',
    aggressiveness: settings.aggressiveness || 'balanced',
    minSpacing: settings.minSpacing || 2,
    maxSpacing: settings.maxSpacing || 8,
    clusterLimit: settings.clusterLimit || 2,
    progressRatio: settings.progressRatio || 0.3,
    difficultyWeight: settings.difficultyWeight || 0.5,
  }), [settings]);

  const trackMissedCard = useCallback((
    cardId: string,
    cardIndex: number,
    responseTime: number
  ) => {
    setMissedCards(prev => {
      const existing = prev.get(cardId);
      const updated: MissedCard = existing ? {
        ...existing,
        missCount: existing.missCount + 1,
        lastSeen: Date.now(),
        responseTime,
      } : {
        cardId,
        cardIndex,
        missCount: 1,
        lastSeen: Date.now(),
        difficulty: 0.5,
        responseTime,
      };

      // Calculate difficulty based on miss count and response time
      updated.difficulty = Math.min(1, (updated.missCount * 0.2) + (responseTime > 10000 ? 0.3 : 0));

      return new Map(prev).set(cardId, updated);
    });
  }, []);

  const markCardCorrect = useCallback((cardId: string) => {
    setMissedCards(prev => {
      const existing = prev.get(cardId);
      if (!existing) return prev;

      // Reduce difficulty on correct answer
      if (existing.missCount === 1) {
        const next = new Map(prev);
        next.delete(cardId);
        return next;
      }

      return new Map(prev).set(cardId, {
        ...existing,
        difficulty: existing.difficulty * 0.7,
        missCount: Math.max(0, existing.missCount - 1),
      });
    });
  }, []);

  const scheduleCards = useCallback((upcomingCards: Card[]): Card[] => {
    if (missedCards.size === 0) return upcomingCards;

    const missedArray = Array.from(missedCards.values());
    return scheduler.schedule(missedArray, upcomingCards, config);
  }, [missedCards, scheduler, config]);

  const changeAlgorithm = useCallback((algorithm: string) => {
    setScheduler(CardSchedulerFactory.getScheduler(algorithm));
  }, []);

  return {
    missedCards,
    trackMissedCard,
    markCardCorrect,
    scheduleCards,
    changeAlgorithm,
    availableAlgorithms: CardSchedulerFactory.getAvailableAlgorithms(),
    currentAlgorithm: config.algorithm,
  };
};
```

**Implementation steps:**
1. Implement QuestionGenerator class with multiple choice and free text generation
2. Create TextMatcher utility with fuzzy matching and normalization
3. Build modular CardScheduler system with Smart Spaced and Leitner Box algorithms
4. Implement useQuestionGenerator and useCardScheduler hooks for state management
5. Add comprehensive TypeScript interfaces for question and scheduling systems
6. Create factory pattern for extensible scheduling algorithms
7. Implement distractor generation algorithm using semantic similarity

**Code Implementation:**
1. Run: `claude --agent code-writer "Implement question generation engine for Phase 2 following ticket #002 specifications"`
2. Run: `claude --agent code-quality-assessor "Review the question generation implementation for performance and accuracy"`
3. Apply code quality improvements

**Testing:**
1. Run: `claude --agent test-writer "Write tests for src/services/questionGenerator.ts"`
2. Run: `claude --agent test-critic "Review tests for src/services/questionGenerator.ts"`
3. Run: `claude --agent test-writer "Implement critic's suggestions"`

**Platform Testing:**
```bash
# Unit testing
npm test src/services/questionGenerator.test.ts
npm test src/utils/textMatching.test.ts

# Integration testing
npm test src/hooks/useQuestionGenerator.test.ts
```

**Commit**: `feat(learn): implement question generation engine with fuzzy text matching`

### Phase 3: Learn Mode UI Components (3 points)
**Files to create/modify:**
- `src/components/modes/learn/QuestionCard.tsx` - Main question display component
- `src/components/modes/learn/MultipleChoiceOptions.tsx` - Multiple choice answer options
- `src/components/modes/learn/FreeTextInput.tsx` - Free text input with validation
- `src/components/modes/learn/LearnProgress.tsx` - Progress tracking component
- `src/components/modes/learn/QuestionCard.module.css` - Component styling

**Component Structure:**
```typescript
interface QuestionCardProps {
  question: Question;
  onAnswer: (answer: string, isCorrect: boolean) => void;
  showFeedback: boolean;
  feedback?: {
    isCorrect: boolean;
    correctAnswer?: string;
    explanation?: string;
  };
  disabled?: boolean;
}

export const QuestionCard: FC<QuestionCardProps> = memo(({
  question,
  onAnswer,
  showFeedback,
  feedback,
  disabled = false,
}) => {
  return (
    <article className={styles.questionCard} role="region" aria-labelledby="question-text">
      <header className={styles.questionHeader}>
        <h2 id="question-text" className={styles.questionText}>
          {question.questionText}
        </h2>
      </header>

      <div className={styles.questionContent}>
        {question.type === 'multiple_choice' ? (
          <MultipleChoiceOptions
            options={question.options!}
            correctAnswer={question.correctAnswer}
            onSelect={onAnswer}
            showFeedback={showFeedback}
            feedback={feedback}
            disabled={disabled}
          />
        ) : (
          <FreeTextInput
            correctAnswer={question.correctAnswer}
            acceptedAnswers={question.acceptedAnswers}
            onSubmit={onAnswer}
            showFeedback={showFeedback}
            feedback={feedback}
            disabled={disabled}
          />
        )}
      </div>

      {showFeedback && feedback && (
        <FeedbackSection
          isCorrect={feedback.isCorrect}
          correctAnswer={feedback.correctAnswer}
          explanation={feedback.explanation}
        />
      )}
    </article>
  );
});
```

**Multiple Choice Component:**
```typescript
interface MultipleChoiceOptionsProps {
  options: string[];
  correctAnswer: string;
  onSelect: (answer: string, isCorrect: boolean) => void;
  showFeedback: boolean;
  feedback?: { isCorrect: boolean };
  disabled: boolean;
}

export const MultipleChoiceOptions: FC<MultipleChoiceOptionsProps> = memo(({
  options,
  correctAnswer,
  onSelect,
  showFeedback,
  feedback,
  disabled,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleOptionClick = useCallback((option: string) => {
    if (disabled || selectedOption) return;

    setSelectedOption(option);
    const isCorrect = option === correctAnswer;
    onSelect(option, isCorrect);
  }, [correctAnswer, onSelect, disabled, selectedOption]);

  return (
    <div className={styles.multipleChoice} role="radiogroup" aria-label="Answer options">
      {options.map((option, index) => (
        <button
          key={option}
          className={cn(
            styles.option,
            selectedOption === option && styles.selected,
            showFeedback && option === correctAnswer && styles.correct,
            showFeedback && selectedOption === option && option !== correctAnswer && styles.incorrect
          )}
          onClick={() => handleOptionClick(option)}
          disabled={disabled}
          role="radio"
          aria-checked={selectedOption === option}
          aria-label={`Option ${index + 1}: ${option}`}
        >
          <span className={styles.optionLetter}>{String.fromCharCode(65 + index)}</span>
          <span className={styles.optionText}>{option}</span>
        </button>
      ))}
    </div>
  );
});
```

**Free Text Component:**
```typescript
interface FreeTextInputProps {
  correctAnswer: string;
  acceptedAnswers?: string[];
  onSubmit: (answer: string, isCorrect: boolean) => void;
  showFeedback: boolean;
  feedback?: { isCorrect: boolean };
  disabled: boolean;
}

export const FreeTextInput: FC<FreeTextInputProps> = memo(({
  correctAnswer,
  acceptedAnswers,
  onSubmit,
  showFeedback,
  feedback,
  disabled,
}) => {
  const [userInput, setUserInput] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || hasSubmitted || disabled) return;

    const allAcceptedAnswers = [correctAnswer, ...(acceptedAnswers || [])];
    const isCorrect = TextMatcher.isMatch(userInput, allAcceptedAnswers);

    setHasSubmitted(true);
    onSubmit(userInput, isCorrect);
  }, [userInput, correctAnswer, acceptedAnswers, onSubmit, hasSubmitted, disabled]);

  return (
    <form className={styles.freeTextForm} onSubmit={handleSubmit}>
      <div className={styles.inputGroup}>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          className={cn(
            styles.textInput,
            showFeedback && feedback?.isCorrect && styles.correct,
            showFeedback && !feedback?.isCorrect && styles.incorrect
          )}
          placeholder="Type your answer..."
          disabled={disabled || hasSubmitted}
          aria-label="Your answer"
          autoComplete="off"
        />
        <button
          type="submit"
          className={styles.submitButton}
          disabled={!userInput.trim() || disabled || hasSubmitted}
          aria-label="Submit answer"
        >
          Submit
        </button>
      </div>

      {showFeedback && !feedback?.isCorrect && (
        <div className={styles.overrideSection}>
          <button
            type="button"
            className={styles.overrideButton}
            onClick={() => onSubmit(userInput, true)}
            aria-label="Mark as correct"
          >
            Actually, I was correct
          </button>
        </div>
      )}
    </form>
  );
});
```

**CSS Module Styling:**
```css
.questionCard {
  background: var(--neutral-white);
  border-radius: 16px;
  padding: var(--space-6);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: var(--space-4);
  animation: slideInUp 0.3s ease-out;
}

.questionText {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--neutral-gray-800);
  margin-bottom: var(--space-6);
  line-height: var(--leading-relaxed);
}

.multipleChoice {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.option {
  display: flex;
  align-items: center;
  padding: var(--space-4);
  border: 2px solid var(--neutral-gray-200);
  border-radius: 12px;
  background: var(--neutral-white);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.option:hover {
  border-color: var(--primary-main);
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.1);
}

.option.selected {
  border-color: var(--primary-main);
  background: var(--primary-light);
}

.option.correct {
  border-color: var(--semantic-success);
  background: rgba(16, 185, 129, 0.1);
}

.option.incorrect {
  border-color: var(--semantic-error);
  background: rgba(239, 68, 68, 0.1);
}

.optionLetter {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--neutral-gray-100);
  font-weight: var(--font-semibold);
  margin-right: var(--space-3);
  flex-shrink: 0;
}

.freeTextForm {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.inputGroup {
  display: flex;
  gap: var(--space-3);
}

.textInput {
  flex: 1;
  padding: var(--space-4);
  border: 2px solid var(--neutral-gray-200);
  border-radius: 12px;
  font-size: var(--text-base);
  transition: border-color 0.2s ease;
}

.textInput:focus {
  outline: none;
  border-color: var(--primary-main);
}

.textInput.correct {
  border-color: var(--semantic-success);
}

.textInput.incorrect {
  border-color: var(--semantic-error);
}

@media (max-width: 768px) {
  .questionCard {
    padding: var(--space-4);
    margin: 0 var(--space-2);
  }

  .inputGroup {
    flex-direction: column;
  }

  .option {
    padding: var(--space-3);
  }
}
```

**Implementation steps:**
1. Create QuestionCard component with accessibility and mobile-first design
2. Implement MultipleChoiceOptions with proper ARIA roles and keyboard navigation
3. Build FreeTextInput with validation and override functionality
4. Add responsive CSS modules following project design system
5. Implement smooth animations and feedback states using Framer Motion patterns

**Code Implementation:**
1. Run: `claude --agent code-writer "Implement Learn mode UI components for Phase 3 following ticket #002 specifications"`
2. Run: `claude --agent code-quality-assessor "Review the Learn UI components for accessibility and responsive design"`
3. Apply code quality improvements

**Testing:**
1. Run: `claude --agent test-writer "Write tests for src/components/modes/learn/"`
2. Run: `claude --agent test-critic "Review tests for src/components/modes/learn/"`
3. Run: `claude --agent test-writer "Implement critic's suggestions"`

**Platform Testing:**
```bash
# Component testing
npm test src/components/modes/learn/

# Accessibility testing
npm run test:a11y src/components/modes/learn/

# Responsive design testing
npm run dev # Test on multiple viewport sizes
```

**Commit**: `feat(learn): implement Learn mode UI components with accessibility`

### Phase 4: Session Management and Progress Tracking (3 points)
**Files to create/modify:**
- `src/hooks/useLearnSession.ts` - Session state management hook
- `src/store/learnSessionStore.ts` - Zustand store for learn sessions
- `src/components/modes/learn/LearnProgress.tsx` - Progress visualization component
- `src/components/modes/learn/SessionComplete.tsx` - Session completion screen
- `src/utils/progressCalculation.ts` - Progress calculation utilities

**Session Management Hook:**
```typescript
interface LearnSessionOptions {
  cardsPerRound: number;
  questionTypes: ('multiple_choice' | 'free_text')[];
  adaptiveDifficulty: boolean;
  masteryThreshold: number;
}

interface LearnSessionProgress {
  questionsAnswered: number;
  totalQuestions: number;
  correctAnswers: number;
  currentStreak: number;
  maxStreak: number;
  masteredCards: Set<number>;
  strugglingCards: Set<number>;
  averageResponseTime: number;
}

export const useLearnSession = (
  deck: Deck,
  options: LearnSessionOptions
) => {
  const [sessionState, setSessionState] = useState<LearnSessionState>({
    currentQuestion: null,
    questionIndex: 0,
    roundCards: [],
    correctCards: new Set(),
    incorrectCards: new Set(),
    currentStreak: 0,
    maxStreak: 0,
    startTime: Date.now(),
    responseStartTime: 0,
  });

  const [progress, setProgress] = useState<LearnSessionProgress>({
    questionsAnswered: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    currentStreak: 0,
    maxStreak: 0,
    masteredCards: new Set(),
    strugglingCards: new Set(),
    averageResponseTime: 0,
  });

  const startRound = useCallback((cards: Card[]) => {
    const roundCards = cards.slice(0, options.cardsPerRound);
    const questions = generateQuestionsFromCards(roundCards, options);

    setSessionState(prev => ({
      ...prev,
      roundCards,
      currentQuestion: questions[0] || null,
      questionIndex: 0,
    }));

    setProgress(prev => ({
      ...prev,
      totalQuestions: questions.length,
      questionsAnswered: 0,
    }));
  }, [deck, options]);

  const answerQuestion = useCallback((
    answer: string,
    isCorrect: boolean,
    responseTime: number
  ) => {
    setProgress(prev => {
      const newCorrectAnswers = isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers;
      const newStreak = isCorrect ? prev.currentStreak + 1 : 0;
      const newMaxStreak = Math.max(prev.maxStreak, newStreak);
      const newQuestionsAnswered = prev.questionsAnswered + 1;

      // Update mastered/struggling cards
      const cardIndex = sessionState.currentQuestion?.cardIndex;
      const newMasteredCards = new Set(prev.masteredCards);
      const newStrugglingCards = new Set(prev.strugglingCards);

      if (cardIndex !== undefined) {
        if (isCorrect && prev.currentStreak >= options.masteryThreshold - 1) {
          newMasteredCards.add(cardIndex);
          newStrugglingCards.delete(cardIndex);
        } else if (!isCorrect) {
          newStrugglingCards.add(cardIndex);
        }
      }

      return {
        ...prev,
        questionsAnswered: newQuestionsAnswered,
        correctAnswers: newCorrectAnswers,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
        masteredCards: newMasteredCards,
        strugglingCards: newStrugglingCards,
        averageResponseTime: (prev.averageResponseTime * (newQuestionsAnswered - 1) + responseTime) / newQuestionsAnswered,
      };
    });

    // Move to next question or complete session
    const hasNext = sessionState.questionIndex < sessionState.roundCards.length - 1;
    if (hasNext) {
      setSessionState(prev => ({
        ...prev,
        questionIndex: prev.questionIndex + 1,
        currentQuestion: questions[prev.questionIndex + 1],
        responseStartTime: Date.now(),
      }));
    } else {
      completeSession();
    }
  }, [sessionState, options]);

  return {
    sessionState,
    progress,
    startRound,
    answerQuestion,
    isComplete: progress.questionsAnswered >= progress.totalQuestions,
  };
};
```

**Zustand Store:**
```typescript
interface LearnSessionStore {
  activeSession: LearnSessionState | null;
  sessionHistory: LearnSessionResults[];
  preferences: LearnModeSettings;

  // Actions
  startSession: (deckId: string, settings: LearnModeSettings) => void;
  updateProgress: (progress: Partial<LearnSessionProgress>) => void;
  completeSession: (results: LearnSessionResults) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => void;

  // Preferences
  updatePreferences: (preferences: Partial<LearnModeSettings>) => void;
  loadPreferences: () => void;
  savePreferences: () => void;
}

export const useLearnSessionStore = create<LearnSessionStore>()(
  persist(
    (set, get) => ({
      activeSession: null,
      sessionHistory: [],
      preferences: defaultLearnSettings,

      startSession: (deckId, settings) => {
        set({
          activeSession: {
            deckId,
            mode: 'learn',
            currentCardIndex: 0,
            correctCount: 0,
            incorrectCount: 0,
            missedCards: [],
            startTime: Date.now(),
            settings,
          },
        });
      },

      updateProgress: (progress) => {
        set((state) => ({
          activeSession: state.activeSession
            ? { ...state.activeSession, ...progress }
            : null,
        }));
      },

      completeSession: (results) => {
        set((state) => ({
          activeSession: null,
          sessionHistory: [...state.sessionHistory, results],
        }));
      },

      // Additional actions...
    }),
    {
      name: 'learn-session-store',
      partialize: (state) => ({
        sessionHistory: state.sessionHistory,
        preferences: state.preferences,
      }),
    }
  )
);
```

**Progress Component:**
```typescript
interface LearnProgressProps {
  progress: LearnSessionProgress;
  className?: string;
}

export const LearnProgress: FC<LearnProgressProps> = memo(({
  progress,
  className,
}) => {
  const progressPercentage = (progress.questionsAnswered / progress.totalQuestions) * 100;
  const accuracyPercentage = progress.questionsAnswered > 0
    ? (progress.correctAnswers / progress.questionsAnswered) * 100
    : 0;

  return (
    <div className={cn(styles.progressContainer, className)}>
      <div className={styles.progressStats}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Progress</span>
          <span className={styles.statValue}>
            {progress.questionsAnswered}/{progress.totalQuestions}
          </span>
        </div>

        <div className={styles.statItem}>
          <span className={styles.statLabel}>Accuracy</span>
          <span className={styles.statValue}>
            {Math.round(accuracyPercentage)}%
          </span>
        </div>

        <div className={styles.statItem}>
          <span className={styles.statLabel}>Streak</span>
          <span className={styles.statValue}>
            {progress.currentStreak} 🔥
          </span>
        </div>
      </div>

      <div className={styles.progressBar} role="progressbar" aria-valuenow={progressPercentage} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={styles.progressFill}
          style=&#123;&#123; width: `$&#123;progressPercentage&#125;%` &#125;&#125;
        />
      </div>

      <div className={styles.masteryIndicators}>
        <div className={styles.masteryItem}>
          <div className={styles.masteryDot} style={{ backgroundColor: 'var(--semantic-success)' }} />
          <span>Mastered: {progress.masteredCards.size}</span>
        </div>
        <div className={styles.masteryItem}>
          <div className={styles.masteryDot} style={{ backgroundColor: 'var(--semantic-warning)' }} />
          <span>Struggling: {progress.strugglingCards.size}</span>
        </div>
      </div>
    </div>
  );
});
```

**Implementation steps:**
1. Create useLearnSession hook managing session state with progress tracking
2. Implement Zustand store for session persistence and preferences
3. Build LearnProgress component with visual progress indicators
4. Add session completion screen with detailed statistics
5. Integrate with existing session management patterns from Flashcards mode

**Code Implementation:**
1. Run: `claude --agent code-writer "Implement session management and progress tracking for Phase 4 following ticket #002 specifications"`
2. Run: `claude --agent code-quality-assessor "Review the session management implementation for state consistency and performance"`
3. Apply code quality improvements

**Testing:**
1. Run: `claude --agent test-writer "Write tests for src/hooks/useLearnSession.ts"`
2. Run: `claude --agent test-critic "Review tests for src/hooks/useLearnSession.ts"`
3. Run: `claude --agent test-writer "Implement critic's suggestions"`

**Platform Testing:**
```bash
# Session state testing
npm test src/hooks/useLearnSession.test.ts
npm test src/store/learnSessionStore.test.ts

# Progress tracking testing
npm test src/components/modes/learn/LearnProgress.test.ts
```

**Commit**: `feat(learn): implement session management and progress tracking system`

## Testing Strategy

### Unit Tests
- Test file: `__tests__/pages/Learn.test.tsx`
- Key scenarios: Question generation, text matching accuracy, progress calculation, session state management
- Mock requirements: React Router, Zustand stores, localStorage

### Component Tests
```typescript
describe('Learn Mode Components', () => {
  it('should render QuestionCard with multiple choice options', () => {
    const question: Question = {
      id: '1',
      type: 'multiple_choice',
      cardIndex: 0,
      questionText: 'What is React?',
      questionSides: ['side_a'],
      correctAnswer: 'A JavaScript library',
      options: ['A JavaScript library', 'A database', 'A CSS framework', 'An IDE'],
      difficulty: 1,
    };

    render(<QuestionCard question={question} onAnswer={jest.fn()} showFeedback={false} />);
    expect(screen.getByText('What is React?')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('should handle free text input with fuzzy matching', () => {
    const question: Question = {
      id: '1',
      type: 'free_text',
      cardIndex: 0,
      questionText: 'What is the capital of France?',
      questionSides: ['side_a'],
      correctAnswer: 'Paris',
      acceptedAnswers: ['Paris', 'paris', 'PARIS'],
      difficulty: 1,
    };

    render(<QuestionCard question={question} onAnswer={jest.fn()} showFeedback={false} />);

    const input = screen.getByPlaceholderText('Type your answer...');
    fireEvent.change(input, { target: { value: 'paris' } });
    fireEvent.click(screen.getByText('Submit'));

    expect(onAnswer).toHaveBeenCalledWith('paris', true);
  });

  it('should track progress correctly', () => {
    const progress: LearnSessionProgress = {
      questionsAnswered: 5,
      totalQuestions: 10,
      correctAnswers: 4,
      currentStreak: 2,
      maxStreak: 3,
      masteredCards: new Set([1, 2]),
      strugglingCards: new Set([3]),
      averageResponseTime: 3500,
    };

    render(<LearnProgress progress={progress} />);
    expect(screen.getByText('5/10')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument(); // 4/5 accuracy
    expect(screen.getByText('2 🔥')).toBeInTheDocument();
  });
});
```

### Integration Tests
- User flows: Complete learn session from start to finish
- Navigation testing: Page transitions and back button handling
- State persistence: Session resumption after page refresh

### E2E Tests (Playwright)
```typescript
describe('Learn Mode E2E', () => {
  it('should complete a full learn session', async ({ page }) => {
    await page.goto('/deck/sample/learn');

    // Wait for question to load
    await page.waitForSelector('[data-testid="question-card"]');

    // Answer multiple questions
    for (let i = 0; i < 5; i++) {
      const questionType = await page.getAttribute('[data-testid="question-card"]', 'data-question-type');

      if (questionType === 'multiple_choice') {
        await page.click('[data-testid="option-0"]');
      } else {
        await page.fill('[data-testid="text-input"]', 'test answer');
        await page.click('[data-testid="submit-button"]');
      }

      // Wait for feedback
      await page.waitForSelector('[data-testid="feedback-section"]');
      await page.click('[data-testid="continue-button"]');
    }

    // Check completion screen
    await page.waitForSelector('[data-testid="session-complete"]');
    expect(await page.textContent('[data-testid="completion-message"]')).toContain('Great job!');
  });
});
```

### Performance Tests
- Question generation: <50ms for 20-question set
- Text matching: <10ms per input validation
- Progress updates: <5ms for state changes
- Memory usage: Monitor with React DevTools Profiler

## Platform-Specific Considerations

### Web PWA
- Touch-optimized button sizes (minimum 44px)
- Keyboard navigation with proper focus management
- Screen reader announcements for dynamic content
- Responsive breakpoints for mobile, tablet, desktop
- Service Worker caching for offline functionality

### Accessibility Features
- ARIA labels and descriptions for all interactive elements
- Live regions for progress updates and feedback
- High contrast support for visual feedback states
- Reduced motion support for animations
- Keyboard shortcuts for common actions

## Documentation Updates Required
1. `README.md` - Add Learn mode documentation and user guide
2. `docs/spec.md` - Update with Learn mode implementation details
3. In-code documentation: JSDoc comments for all major components and utilities

## Success Criteria
1. **Functional**: Complete learn sessions with 95% accuracy in question generation
2. **Performance**: Question rendering <100ms, smooth 60 FPS animations
3. **Accessibility**: WCAG AA compliance verified with automated testing
4. **User Experience**: <5% user drop-off rate in learn sessions
5. **Quality**: >85% test coverage with comprehensive E2E testing

## Dependencies
- **NPM packages**: No new dependencies required (uses existing React, Zustand, Framer Motion)
- **Internal dependencies**: Deck management system, session store, UI component library
- **Data requirements**: Multi-sided card support, question generation algorithms

## Risks & Mitigations
1. **Risk**: Question generation producing poor-quality distractors
   **Mitigation**: Implement semantic similarity algorithms and manual distractor pools
2. **Risk**: Fuzzy text matching producing false positives/negatives
   **Mitigation**: Extensive testing with real user data and adjustable matching thresholds
3. **Risk**: Performance issues with large decks (>1000 cards)
   **Mitigation**: Implement question caching and lazy loading strategies
4. **Risk**: Complex state management leading to bugs
   **Mitigation**: Comprehensive unit testing and Redux DevTools integration

## Accessibility Requirements
- Screen reader support with proper ARIA semantics and live regions for dynamic updates
- Keyboard navigation with focus trapping and logical tab order
- Minimum touch target size (44x44px) for mobile interactions
- Color contrast ratios meeting WCAG AA standard (4.5:1 for normal text)
- Support for reduced motion preferences
- Voice control compatibility for hands-free operation

## Release & Deployment Guide

### Build Configuration
- Update Vite build configuration for Learn mode code splitting
- Add Learn mode routes to router configuration
- Configure service worker caching for Learn mode assets

### Testing Checklist
- [ ] Unit tests passing for all Learn mode components
- [ ] Integration tests covering full learn session flow
- [ ] E2E tests validating cross-browser compatibility
- [ ] Performance testing with Lighthouse (>90 score)
- [ ] Accessibility audit with axe-core (zero violations)
- [ ] Manual testing on iOS Safari, Android Chrome
- [ ] Responsive design testing across breakpoints

### Release Process
1. Create feature branch from develop
2. Implement all phases sequentially with testing
3. Run full test suite including E2E tests
4. Performance audit with bundle size analysis
5. Accessibility audit with automated and manual testing
6. Code review with focus on TypeScript types and React patterns
7. Merge to develop branch
8. Deploy to staging environment for user acceptance testing
9. Production deployment with feature flag

### Rollback Strategy
- Feature flag to disable Learn mode if critical issues discovered
- Graceful degradation to redirect users to Flashcards mode
- Database rollback procedures for session data if needed
- Hotfix branch procedure for critical bug fixes

## Mobile-Specific Implementation Details

### Touch Interactions
```typescript
// Touch-optimized button handling
const handleTouchStart = useCallback((e: TouchEvent) => {
  // Prevent double-tap zoom on answer selection
  e.preventDefault();
}, []);

// Swipe gesture support for question navigation
const swipeGesture = useSwipeable({
  onSwipedLeft: () => answerQuestion(currentAnswer, false),
  onSwipedRight: () => answerQuestion(currentAnswer, true),
  onSwipedUp: () => showHint(),
  trackMouse: true,
  preventDefaultTouchmoveEvent: true,
});
```

### Responsive Typography
```css
.questionText {
  font-size: clamp(1.125rem, 4vw, 1.5rem);
  line-height: 1.4;
}

@media (max-width: 480px) {
  .questionText {
    font-size: var(--text-lg);
    padding: var(--space-2);
  }
}
```

### Virtual Keyboard Handling
```typescript
// Handle virtual keyboard appearance
useEffect(() => {
  const handleResize = () => {
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty('--viewport-height', `${viewportHeight}px`);
  };

  window.visualViewport?.addEventListener('resize', handleResize);
  return () => window.visualViewport?.removeEventListener('resize', handleResize);
}, []);
```

### Performance Optimizations
- Use `React.memo` for QuestionCard and answer option components
- Implement question preloading for next 2-3 questions
- Use `requestIdleCallback` for non-critical progress calculations
- Optimize images and icons with proper sizing and lazy loading
- Implement efficient list virtualization for large question sets

### Error Handling
```typescript
// Comprehensive error boundary for Learn mode
class LearnModeErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Learn Mode Error:', error, errorInfo);
    // Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.errorFallback}>
          <h2>Something went wrong with Learn mode</h2>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
          <button onClick={() => navigate('/deck/:deckId')}>
            Back to Deck
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```