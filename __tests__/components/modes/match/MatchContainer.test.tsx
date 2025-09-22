import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../utils/testUtils';
import MatchContainer from '@/components/modes/match/MatchContainer';
import { Deck } from '@/types';
import { useMatchSessionStore } from '@/store/matchSessionStore';
import { useCardMasteryStore } from '@/store/cardMasteryStore';

// Mock stores
vi.mock('@/store/matchSessionStore');
vi.mock('@/store/cardMasteryStore');

// Mock sound utilities
vi.mock('@/utils/soundUtils', () => ({
  playSound: vi.fn(),
  initializeAudio: vi.fn(),
  setAudioEnabled: vi.fn(),
  isAudioSupported: vi.fn(() => true),
}));

// Mock deck data
const mockDeck: Deck = {
  id: 'test-deck',
  metadata: {
    deck_name: 'Test Match Deck',
    description: 'Test deck for match mode testing',
    version: '1.0.0',
    created_date: '2024-01-01',
    last_modified: '2024-01-01',
    author: 'Test',
    tags: ['test'],
    difficulty_level: 'beginner',
    estimated_duration: 10,
    prerequisites: [],
    learning_objectives: [],
    total_cards: 6,
    category: 'test',
  },
  content: [
    {
      idx: 0,
      level: 1,
      side_a: 'Apple',
      side_b: 'Red Fruit',
      side_c: 'Pomme',
      notes: 'Test note',
      examples: [],
      related_cards: [],
    },
    {
      idx: 1,
      level: 1,
      side_a: 'Banana',
      side_b: 'Yellow Fruit',
      side_c: 'Banane',
      notes: '',
      examples: [],
      related_cards: [],
    },
    {
      idx: 2,
      level: 1,
      side_a: 'Cherry',
      side_b: 'Small Red Fruit',
      side_c: 'Cerise',
      notes: '',
      examples: [],
      related_cards: [],
    },
    {
      idx: 3,
      level: 1,
      side_a: 'Date',
      side_b: 'Brown Fruit',
      side_c: 'Datte',
      notes: '',
      examples: [],
      related_cards: [],
    },
    {
      idx: 4,
      level: 1,
      side_a: 'Elderberry',
      side_b: 'Purple Fruit',
      side_c: 'Sureau',
      notes: '',
      examples: [],
      related_cards: [],
    },
    {
      idx: 5,
      level: 1,
      side_a: 'Fig',
      side_b: 'Sweet Fruit',
      side_c: 'Figue',
      notes: '',
      examples: [],
      related_cards: [],
    },
  ],
};

describe('MatchContainer', () => {
  const mockStartSession = vi.fn();
  const mockSelectCard = vi.fn();
  const mockProcessMatch = vi.fn();
  const mockEndSession = vi.fn();
  const mockGetMasteredCards = vi.fn(() => new Set<number>());

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup store mocks
    (useMatchSessionStore as any).mockReturnValue({
      session: null,
      startSession: mockStartSession,
      selectCard: mockSelectCard,
      processMatch: mockProcessMatch,
      endSession: mockEndSession,
      pauseSession: vi.fn(),
      resumeSession: vi.fn(),
      loadSession: vi.fn(() => null),
      clearSelection: vi.fn(),
      generateGrid: vi.fn(),
      startNewRound: vi.fn(),
    });

    (useCardMasteryStore as any).mockReturnValue({
      getMasteredCards: mockGetMasteredCards,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render match container with deck', () => {
      render(<MatchContainer deck={mockDeck} />);

      expect(screen.getByTestId('match-container')).toBeInTheDocument();
    });

    it('should display loading state initially', () => {
      render(<MatchContainer deck={mockDeck} />);

      expect(screen.getByText(/Preparing match game/i)).toBeInTheDocument();
    });

    it('should start a new session on mount', async () => {
      render(<MatchContainer deck={mockDeck} />);

      await waitFor(() => {
        expect(mockStartSession).toHaveBeenCalledWith(
          'test-deck',
          expect.objectContaining({
            gridSize: { rows: 3, cols: 4 },
            matchType: 'two_way',
          })
        );
      });
    });

    it('should render match grid after session starts', async () => {
      const mockSession = {
        deckId: 'test-deck',
        grid: Array(12).fill(null).map((_, i) => ({
          id: `card-${i}`,
          cardIndex: Math.floor(i / 2),
          displaySides: ['side_a'],
          content: `Content ${i}`,
          groupId: `group-${Math.floor(i / 2)}`,
          isMatched: false,
          isSelected: false,
          position: { row: Math.floor(i / 4), col: i % 4 },
        })),
        selectedCards: [],
        matchedPairs: [],
        startTime: Date.now(),
        isPaused: false,
        settings: {
          gridSize: { rows: 3, cols: 4 },
          matchType: 'two_way' as const,
        },
      };

      (useMatchSessionStore as any).mockReturnValue({
        session: mockSession,
        startSession: mockStartSession,
        selectCard: mockSelectCard,
        processMatch: mockProcessMatch,
        endSession: mockEndSession,
      });

      render(<MatchContainer deck={mockDeck} />);

      await waitFor(() => {
        expect(screen.getByTestId('match-grid')).toBeInTheDocument();
        expect(screen.getAllByTestId(/^match-card-/)).toHaveLength(12);
      });
    });
  });

  describe('Card Selection', () => {
    it('should handle card selection', async () => {
      const mockSession = {
        deckId: 'test-deck',
        grid: [
          {
            id: 'card-0',
            cardIndex: 0,
            displaySides: ['side_a'],
            content: 'Apple',
            groupId: 'group-0',
            isMatched: false,
            isSelected: false,
            position: { row: 0, col: 0 },
          },
          {
            id: 'card-1',
            cardIndex: 0,
            displaySides: ['side_b'],
            content: 'Red Fruit',
            groupId: 'group-0',
            isMatched: false,
            isSelected: false,
            position: { row: 0, col: 1 },
          },
        ],
        selectedCards: [],
        matchedPairs: [],
        startTime: Date.now(),
        isPaused: false,
        settings: {
          gridSize: { rows: 1, cols: 2 },
          matchType: 'two_way' as const,
        },
      };

      (useMatchSessionStore as any).mockReturnValue({
        session: mockSession,
        selectCard: mockSelectCard,
        processMatch: mockProcessMatch,
      });

      render(<MatchContainer deck={mockDeck} />);

      const card = await screen.findByTestId('match-card-0');
      fireEvent.click(card);

      expect(mockSelectCard).toHaveBeenCalledWith('card-0');
    });

    it('should process match when two cards are selected', async () => {
      mockProcessMatch.mockReturnValue({ isMatch: true, matchedCards: ['card-0', 'card-1'] });

      const mockSession = {
        deckId: 'test-deck',
        grid: [
          {
            id: 'card-0',
            cardIndex: 0,
            displaySides: ['side_a'],
            content: 'Apple',
            groupId: 'group-0',
            isMatched: false,
            isSelected: true,
            position: { row: 0, col: 0 },
          },
          {
            id: 'card-1',
            cardIndex: 0,
            displaySides: ['side_b'],
            content: 'Red Fruit',
            groupId: 'group-0',
            isMatched: false,
            isSelected: true,
            position: { row: 0, col: 1 },
          },
        ],
        selectedCards: ['card-0', 'card-1'],
        matchedPairs: [],
        startTime: Date.now(),
        isPaused: false,
        settings: {
          gridSize: { rows: 1, cols: 2 },
          matchType: 'two_way' as const,
          cardsToMatch: 2,
        },
      };

      (useMatchSessionStore as any).mockReturnValue({
        session: mockSession,
        selectCard: mockSelectCard,
        processMatch: mockProcessMatch,
      });

      render(<MatchContainer deck={mockDeck} />);

      await waitFor(() => {
        expect(mockProcessMatch).toHaveBeenCalled();
      });
    });
  });

  describe('Timer Functionality', () => {
    it('should display timer', async () => {
      const mockSession = {
        deckId: 'test-deck',
        grid: [],
        selectedCards: [],
        matchedPairs: [],
        startTime: Date.now(),
        isPaused: false,
        settings: {
          gridSize: { rows: 3, cols: 4 },
          matchType: 'two_way' as const,
          enableTimer: true,
        },
      };

      (useMatchSessionStore as any).mockReturnValue({
        session: mockSession,
      });

      render(<MatchContainer deck={mockDeck} />);

      await waitFor(() => {
        expect(screen.getByTestId('match-timer')).toBeInTheDocument();
      });
    });

    it('should update timer display', async () => {
      vi.useFakeTimers();

      const mockSession = {
        deckId: 'test-deck',
        grid: [],
        selectedCards: [],
        matchedPairs: [],
        startTime: Date.now(),
        isPaused: false,
        settings: {
          gridSize: { rows: 3, cols: 4 },
          matchType: 'two_way' as const,
          enableTimer: true,
        },
      };

      (useMatchSessionStore as any).mockReturnValue({
        session: mockSession,
      });

      render(<MatchContainer deck={mockDeck} />);

      const timer = await screen.findByTestId('match-timer');
      expect(timer).toHaveTextContent('00:00');

      // Advance time by 5 seconds
      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(timer).toHaveTextContent('00:05');
      });

      vi.useRealTimers();
    });
  });

  describe('Game Completion', () => {
    it('should show results when all cards are matched', async () => {
      const mockSession = {
        deckId: 'test-deck',
        grid: [
          {
            id: 'card-0',
            isMatched: true,
            isSelected: false,
          },
          {
            id: 'card-1',
            isMatched: true,
            isSelected: false,
          },
        ],
        selectedCards: [],
        matchedPairs: [['card-0', 'card-1']],
        startTime: Date.now() - 30000, // 30 seconds ago
        isPaused: false,
        isCompleted: true,
        settings: {
          gridSize: { rows: 1, cols: 2 },
          matchType: 'two_way' as const,
        },
      };

      (useMatchSessionStore as any).mockReturnValue({
        session: mockSession,
      });

      render(<MatchContainer deck={mockDeck} />);

      await waitFor(() => {
        expect(screen.getByTestId('match-results')).toBeInTheDocument();
        expect(screen.getByText(/00:30/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      const mockSession = {
        deckId: 'test-deck',
        grid: Array(12).fill(null).map((_, i) => ({
          id: `card-${i}`,
          cardIndex: Math.floor(i / 2),
          displaySides: ['side_a'],
          content: `Content ${i}`,
          groupId: `group-${Math.floor(i / 2)}`,
          isMatched: false,
          isSelected: false,
          position: { row: Math.floor(i / 4), col: i % 4 },
        })),
        selectedCards: [],
        matchedPairs: [],
        startTime: Date.now(),
        isPaused: false,
        settings: {
          gridSize: { rows: 3, cols: 4 },
          matchType: 'two_way' as const,
        },
      };

      (useMatchSessionStore as any).mockReturnValue({
        session: mockSession,
      });

      render(<MatchContainer deck={mockDeck} />);

      const container = await screen.findByTestId('match-container');
      expect(container).toHaveAttribute('role', 'main');
      expect(container).toHaveAttribute('aria-label', 'Match game container');

      const grid = await screen.findByTestId('match-grid');
      expect(grid).toHaveAttribute('role', 'grid');
      expect(grid).toHaveAttribute('aria-label', 'Match game grid');
    });

    it('should support keyboard navigation', async () => {
      const mockSession = {
        deckId: 'test-deck',
        grid: [
          {
            id: 'card-0',
            cardIndex: 0,
            displaySides: ['side_a'],
            content: 'Apple',
            groupId: 'group-0',
            isMatched: false,
            isSelected: false,
            position: { row: 0, col: 0 },
          },
          {
            id: 'card-1',
            cardIndex: 0,
            displaySides: ['side_b'],
            content: 'Red Fruit',
            groupId: 'group-0',
            isMatched: false,
            isSelected: false,
            position: { row: 0, col: 1 },
          },
        ],
        selectedCards: [],
        matchedPairs: [],
        startTime: Date.now(),
        isPaused: false,
        settings: {
          gridSize: { rows: 1, cols: 2 },
          matchType: 'two_way' as const,
        },
      };

      (useMatchSessionStore as any).mockReturnValue({
        session: mockSession,
        selectCard: mockSelectCard,
      });

      render(<MatchContainer deck={mockDeck} />);

      const firstCard = await screen.findByTestId('match-card-0');
      firstCard.focus();

      fireEvent.keyDown(firstCard, { key: 'Enter' });
      expect(mockSelectCard).toHaveBeenCalledWith('card-0');

      fireEvent.keyDown(firstCard, { key: ' ' });
      expect(mockSelectCard).toHaveBeenCalledTimes(2);
    });
  });

  describe('Settings Integration', () => {
    it('should respect mastered cards exclusion', async () => {
      mockGetMasteredCards.mockReturnValue(new Set([0, 1]));

      render(<MatchContainer deck={mockDeck} />);

      await waitFor(() => {
        expect(mockStartSession).toHaveBeenCalledWith(
          'test-deck',
          expect.objectContaining({
            includeMastered: false,
          })
        );
      });
    });

    it('should handle custom grid sizes', async () => {
      const mockSession = {
        deckId: 'test-deck',
        grid: Array(6).fill(null).map((_, i) => ({
          id: `card-${i}`,
          cardIndex: Math.floor(i / 2),
          displaySides: ['side_a'],
          content: `Content ${i}`,
          groupId: `group-${Math.floor(i / 2)}`,
          isMatched: false,
          isSelected: false,
          position: { row: Math.floor(i / 3), col: i % 3 },
        })),
        selectedCards: [],
        matchedPairs: [],
        startTime: Date.now(),
        isPaused: false,
        settings: {
          gridSize: { rows: 2, cols: 3 },
          matchType: 'two_way' as const,
        },
      };

      (useMatchSessionStore as any).mockReturnValue({
        session: mockSession,
      });

      render(<MatchContainer deck={mockDeck} />);

      await waitFor(() => {
        const cards = screen.getAllByTestId(/^match-card-/);
        expect(cards).toHaveLength(6);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle deck with insufficient cards', () => {
      const smallDeck: Deck = {
        ...mockDeck,
        content: [mockDeck.content[0]], // Only 1 card
      };

      render(<MatchContainer deck={smallDeck} />);

      expect(screen.getByText(/Not enough cards/i)).toBeInTheDocument();
    });

    it('should handle session creation errors', async () => {
      mockStartSession.mockRejectedValue(new Error('Failed to start session'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<MatchContainer deck={mockDeck} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Error starting match session'),
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });
});