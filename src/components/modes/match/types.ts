import { Card, Deck } from '@/types';

// Match-specific settings interface with required properties
export interface MatchSettings {
  gridSize: { rows: number; cols: number };
  matchType: 'two_way' | 'three_way' | 'custom';
  cardSides: MatchCardSide[];
  enableTimer: boolean;
  includeMastered: boolean;
  enableAudio: boolean;
  timerSeconds: number; // 0 for count-up timer
}

// Configuration for card side groupings in match mode
export interface MatchCardSide {
  sides: string[]; // e.g., ['side_a'] or ['side_b', 'side_c']
  label: string; // Display label for this grouping
  count: number; // Number of cards showing this side combination
}

// Individual match card in the grid
export interface MatchCard {
  id: string;
  cardIndex: number; // Original card index from deck
  displaySides: string[]; // Which sides are shown (e.g., ['side_a'])
  content: string; // Rendered content for display
  groupId: string; // Cards with same groupId should match
  isMatched: boolean;
  isSelected: boolean;
  position: { row: number; col: number };
}

// Complete match session state
export interface MatchSessionState {
  deckId: string;
  currentRound: number;
  startTime: number;
  pausedTime: number;
  isPaused: boolean;
  grid: MatchCard[];
  selectedCards: string[]; // IDs of currently selected cards
  matchedPairs: string[][]; // Groups of matched card IDs
  missedCardIndices: number[]; // Original card indices that were missed
  roundStartTime: number;
  bestTime: number | null; // Best completion time in milliseconds
  settings: MatchSettings;
}

// Match session store interface
export interface MatchSessionStore {
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

// Match container component props
export interface MatchContainerProps {
  deck: Deck;
}

// Match grid component props
export interface MatchGridProps {
  cards: MatchCard[];
  onCardSelect: (cardId: string) => void;
  selectedCards: string[];
  matchedCards: string[][];
  gridSize: { rows: number; cols: number };
  isAnimating: boolean;
  animatingCards?: string[]; // Cards currently in animation state
  isMobile?: boolean; // Mobile device detection for optimizations
}

// Individual match card component props
export interface MatchCardProps {
  card: MatchCard;
  isSelected: boolean;
  isMatched: boolean;
  isAnimating: boolean;
  isCurrentlyAnimating?: boolean; // Whether this specific card is animating
  onSelect: (cardId: string) => void;
  position: { row: number; col: number };
  isMobile?: boolean; // Mobile device detection for optimizations
  prefersReducedMotion?: boolean; // Accessibility setting for reduced motion
}

// Match timer component props
export interface MatchTimerProps {
  startTime: number;
  pausedTime: number;
  isPaused: boolean;
  isComplete: boolean;
  onPause?: () => void;
  onResume?: () => void;
}

// Match results interface
export interface MatchResults {
  deckId: string;
  totalTime: number; // Time in milliseconds
  bestTime: number | null; // Previous best time
  isNewBest: boolean;
  totalMatches: number;
  missedCardIndices: number[];
  roundNumber: number;
  startTime: number;
  endTime: number;
}

// Match completion modal props
export interface MatchResultsProps {
  visible: boolean;
  results: MatchResults | null;
  onContinueWithMissed: () => void;
  onStartNewRound: () => void;
  onBackToDeck: () => void;
  onClose: () => void;
}

// Default match settings
export const DEFAULT_MATCH_SETTINGS: MatchSettings = {
  gridSize: { rows: 3, cols: 4 },
  matchType: 'two_way',
  cardSides: [
    { sides: ['side_a'], label: 'Front', count: 6 },
    { sides: ['side_b'], label: 'Back', count: 6 },
  ],
  enableTimer: true,
  includeMastered: false,
  enableAudio: false,
  timerSeconds: 0, // Count-up timer
};

// Match validation utility types
export interface MatchValidationResult {
  isValid: boolean;
  matchedCards: string[];
  matchType: 'two_way' | 'three_way' | 'custom';
}

// Card generation utility types
export interface CardGenerationOptions {
  deck: Deck;
  settings: MatchSettings;
  excludeMastered: boolean;
  masteredIndices: number[];
}

// Grid layout utility types
export interface GridPosition {
  row: number;
  col: number;
  index: number;
}

// Animation state management
export interface MatchAnimationState {
  isAnimating: boolean;
  animationType: 'select' | 'match' | 'mismatch' | 'complete' | null;
  animatingCards: string[];
}

// Sound feedback types
export interface MatchSoundEvents {
  onSelect: () => void;
  onMatch: () => void;
  onMismatch: () => void;
  onComplete: () => void;
}

// Error types for match mode
export interface MatchError {
  type: 'GENERATION_ERROR' | 'VALIDATION_ERROR' | 'PERSISTENCE_ERROR' | 'GRID_ERROR';
  message: string;
  code?: string;
  details?: any;
}

// Session restoration types
export interface SessionRestoration {
  shouldRestore: boolean;
  session: MatchSessionState | null;
  isExpired: boolean;
  errorMessage?: string;
}