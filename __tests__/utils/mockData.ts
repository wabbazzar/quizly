// Mock data factories for comprehensive testing

export interface Card {
  idx: number;
  name: string;
  side_a: string;
  side_b: string;
  side_c?: string;
  side_d?: string;
  side_e?: string;
  side_f?: string;
  level: number;
}

export interface DeckMetadata {
  deck_name: string;
  description: string;
  category: string;
  available_levels: number[];
  available_sides: number;
  card_count: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  version: string;
  created_date: string;
  last_updated: string;
}

export interface Deck {
  id: string;
  metadata: DeckMetadata;
  content: Card[];
}

export interface ModeSettings {
  frontSides: string[];
  backSides: string[];
  cardsPerRound: number;
  enableTimer: boolean;
  enableAudio: boolean;
  randomize: boolean;
  progressionMode: 'sequential' | 'shuffle' | 'spaced_repetition';
  questionTypes: ('multiple_choice' | 'free_text' | 'true_false')[];
  adaptiveDifficulty: boolean;
  masteryThreshold: number;
  questionSides: string[];
  answerSides: string[];
}

export interface SessionState {
  deckId: string;
  mode: 'flashcards' | 'learn' | 'match' | 'test';
  currentCardIndex: number;
  correctCount: number;
  incorrectCount: number;
  startTime: number;
  endTime?: number;
  settings: ModeSettings;
  cards: Card[];
  missedCards: number[];
  masteredCards: number[];
}

// Card Factory
export const createMockCard = (overrides?: Partial<Card>): Card => ({
  idx: 1,
  name: 'Test Card',
  side_a: 'Front Side',
  side_b: 'Back Side',
  level: 1,
  ...overrides,
});

export const createMockCardWithMultipleSides = (overrides?: Partial<Card>): Card => ({
  idx: 1,
  name: 'Multi-Side Card',
  side_a: 'Question',
  side_b: 'Answer',
  side_c: 'Additional Info',
  side_d: 'Example',
  side_e: 'Notes',
  side_f: 'Reference',
  level: 1,
  ...overrides,
});

// Deck Metadata Factory
export const createMockDeckMetadata = (overrides?: Partial<DeckMetadata>): DeckMetadata => ({
  deck_name: 'Test Deck',
  description: 'A test deck for unit testing',
  category: 'Test',
  available_levels: [1, 2, 3],
  available_sides: 2,
  card_count: 10,
  difficulty: 'beginner',
  tags: ['test', 'demo'],
  version: '1.0.0',
  created_date: '2023-01-01',
  last_updated: '2023-01-01',
  ...overrides,
});

// Deck Factory
export const createMockDeck = (overrides?: Partial<Deck>): Deck => ({
  id: 'test-deck-1',
  metadata: createMockDeckMetadata(),
  content: [
    createMockCard(),
    createMockCard({ idx: 2, name: 'Card 2', side_a: 'Question 2', side_b: 'Answer 2' }),
  ],
  ...overrides,
});

export const createLargeMockDeck = (cardCount: number = 100): Deck => ({
  id: 'large-test-deck',
  metadata: createMockDeckMetadata({
    deck_name: 'Large Test Deck',
    card_count: cardCount,
    description: `A large deck with ${cardCount} cards for performance testing`,
  }),
  content: Array.from({ length: cardCount }, (_, i) =>
    createMockCard({
      idx: i,
      name: `Card ${i + 1}`,
      side_a: `Question ${i + 1}`,
      side_b: `Answer ${i + 1}`,
      level: Math.floor(i / 20) + 1, // Distribute across levels
    })
  ),
});

// Settings Factory
export const createMockModeSettings = (
  mode: 'flashcards' | 'learn' | 'deck',
  overrides?: Partial<ModeSettings>
): ModeSettings => {
  const baseSettings: ModeSettings = {
    frontSides: ['side_a'],
    backSides: ['side_b'],
    cardsPerRound: 10,
    enableTimer: false,
    enableAudio: false,
    randomize: false,
    progressionMode: 'sequential',
    questionTypes: ['multiple_choice'],
    adaptiveDifficulty: false,
    masteryThreshold: 3,
    questionSides: ['side_a'],
    answerSides: ['side_b'],
  };

  // Mode-specific defaults
  const modeDefaults: Record<string, Partial<ModeSettings>> = {
    flashcards: {
      questionTypes: ['multiple_choice'],
      progressionMode: 'sequential',
    },
    learn: {
      questionTypes: ['multiple_choice', 'free_text'],
      adaptiveDifficulty: true,
      progressionMode: 'spaced_repetition',
    },
    deck: {
      cardsPerRound: 50,
      enableTimer: true,
    },
  };

  return {
    ...baseSettings,
    ...modeDefaults[mode],
    ...overrides,
  };
};

// Session State Factory
export const createMockSessionState = (overrides?: Partial<SessionState>): SessionState => ({
  deckId: 'test-deck-1',
  mode: 'learn',
  currentCardIndex: 0,
  correctCount: 0,
  incorrectCount: 0,
  startTime: Date.now(),
  settings: createMockModeSettings('learn'),
  cards: [createMockCard(), createMockCard({ idx: 2 })],
  missedCards: [],
  masteredCards: [],
  ...overrides,
});

// Question Generation Mock Data
export const createMockMultipleChoiceQuestion = () => ({
  type: 'multiple_choice' as const,
  questionText: 'What is the capital of France?',
  options: ['Paris', 'London', 'Berlin', 'Madrid'],
  correctAnswer: 'Paris',
  cardIndex: 0,
});

export const createMockFreeTextQuestion = () => ({
  type: 'free_text' as const,
  questionText: 'What is the capital of France?',
  correctAnswer: 'Paris',
  acceptedAnswers: ['Paris', 'paris', 'PARIS'],
  cardIndex: 0,
});

// Progress Tracking Mock Data
export const createMockProgressData = () => ({
  deckId: 'test-deck-1',
  completedSessions: 5,
  totalCards: 20,
  masteredCards: 15,
  averageAccuracy: 0.85,
  timeSpent: 3600000, // 1 hour in milliseconds
  lastSessionDate: new Date().toISOString(),
  streakDays: 7,
});

// Collection of Cards for Different Test Scenarios
export const createTestCardCollection = () => ({
  // Basic cards for simple tests
  simple: [
    createMockCard({ idx: 0, side_a: 'Hello', side_b: 'Bonjour' }),
    createMockCard({ idx: 1, side_a: 'Goodbye', side_b: 'Au revoir' }),
  ],

  // Cards with multiple sides for complex tests
  multiSide: [
    createMockCardWithMultipleSides({
      idx: 0,
      side_a: 'Word',
      side_b: 'Translation',
      side_c: 'Pronunciation',
      side_d: 'Example sentence',
      side_e: 'Grammar notes',
      side_f: 'Etymology',
    }),
  ],

  // Cards for testing difficulty levels
  multiLevel: [
    createMockCard({ idx: 0, level: 1, side_a: 'Easy Question', side_b: 'Easy Answer' }),
    createMockCard({ idx: 1, level: 2, side_a: 'Medium Question', side_b: 'Medium Answer' }),
    createMockCard({ idx: 2, level: 3, side_a: 'Hard Question', side_b: 'Hard Answer' }),
  ],

  // Cards for testing edge cases
  edgeCases: [
    createMockCard({ idx: 0, side_a: '', side_b: 'Empty front' }), // Empty front
    createMockCard({ idx: 1, side_a: 'Empty back', side_b: '' }), // Empty back
    createMockCard({
      idx: 2,
      side_a: 'Very long question that exceeds normal length and might cause UI issues',
      side_b: 'Long question',
    }),
    createMockCard({ idx: 3, side_a: 'Special chars', side_b: '!@#$%^&*()_+-={}[]|\\:";\'<>?,./' }),
    createMockCard({ idx: 4, side_a: 'Unicode', side_b: '🌟⭐✨💫🎯🚀' }),
  ],
});

// Mock Store States
export const createMockDeckStoreState = (overrides?: any) => ({
  decks: [createMockDeck()],
  currentDeck: createMockDeck(),
  currentDeckId: 'test-deck-1',
  session: null,
  isLoading: false,
  error: null,
  loadDeck: vi.fn(),
  selectDeck: vi.fn(),
  startSession: vi.fn(),
  endSession: vi.fn(),
  updateProgress: vi.fn(),
  reset: vi.fn(),
  ...overrides,
});

// API Response Mocks
export const createMockApiResponse = <T>(data: T, success = true) => ({
  ok: success,
  status: success ? 200 : 400,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
});

export const createMockFetchError = (message = 'Network error') => {
  return Promise.reject(new Error(message));
};

// Test Scenarios Collection
export const testScenarios = {
  // Happy path scenarios
  successfulLearning: {
    deck: createMockDeck(),
    settings: createMockModeSettings('learn'),
    expectedResults: {
      correctAnswers: 8,
      incorrectAnswers: 2,
      accuracy: 0.8,
    },
  },

  // Error scenarios
  networkFailure: {
    deck: null,
    error: 'Failed to load deck',
    expectedBehavior: 'show error message and retry option',
  },

  // Performance scenarios
  largeDataset: {
    deck: createLargeMockDeck(1000),
    settings: createMockModeSettings('learn', { cardsPerRound: 100 }),
    expectedPerformance: {
      maxRenderTime: 16, // 60 FPS
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    },
  },

  // Accessibility scenarios
  keyboardNavigation: {
    deck: createMockDeck(),
    interactions: ['Tab', 'Enter', 'Space', 'Escape', 'ArrowLeft', 'ArrowRight'],
    expectedBehavior: 'all interactions work without mouse',
  },

  // Edge cases
  emptyDeck: {
    deck: createMockDeck({ content: [] }),
    expectedBehavior: 'show empty state message',
  },

  malformedData: {
    deck: createMockDeck({
      content: [
        // @ts-ignore - intentionally malformed for testing
        { idx: 0, side_a: null, side_b: undefined },
      ],
    }),
    expectedBehavior: 'handle gracefully with fallback',
  },
};

// Utility to validate mock data structure
export const validateMockData = {
  card: (card: Card): boolean => {
    return (
      typeof card.idx === 'number' &&
      typeof card.name === 'string' &&
      typeof card.side_a === 'string' &&
      typeof card.side_b === 'string' &&
      typeof card.level === 'number'
    );
  },

  deck: (deck: Deck): boolean => {
    return (
      typeof deck.id === 'string' &&
      deck.metadata !== null &&
      Array.isArray(deck.content) &&
      deck.content.every(validateMockData.card)
    );
  },

  settings: (settings: ModeSettings): boolean => {
    return (
      Array.isArray(settings.frontSides) &&
      Array.isArray(settings.backSides) &&
      typeof settings.cardsPerRound === 'number' &&
      typeof settings.enableTimer === 'boolean'
    );
  },
};

// Export global vi for mock functions in tests
import { vi } from 'vitest';
export { vi };
