import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMatchSessionStore } from '@/store/matchSessionStore';
import { Card } from '@/types';
import { DEFAULT_MATCH_SETTINGS } from '@/components/modes/match/types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock deck data
const mockCards: Card[] = [
  {
    idx: 0,
    level: 1,
    side_a: 'Apple',
    side_b: 'Red Fruit',
    side_c: 'Pomme',
    notes: '',
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
];

describe('matchSessionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    // Reset store state
    const { result } = renderHook(() => useMatchSessionStore());
    act(() => {
      result.current.endSession();
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Session Management', () => {
    it('should start a new session', () => {
      const { result } = renderHook(() => useMatchSessionStore());

      act(() => {
        result.current.startSession('deck-1', DEFAULT_MATCH_SETTINGS, mockCards);
      });

      expect(result.current.session).toBeDefined();
      expect(result.current.session?.deckId).toBe('deck-1');
      expect(result.current.session?.currentRound).toBe(1);
      expect(result.current.session?.grid).toHaveLength(12); // 3x4 default grid
    });

    it('should end a session', () => {
      const { result } = renderHook(() => useMatchSessionStore());

      act(() => {
        result.current.startSession('deck-1', DEFAULT_MATCH_SETTINGS, mockCards);
      });

      expect(result.current.session).toBeDefined();

      act(() => {
        result.current.endSession();
      });

      expect(result.current.session).toBeNull();
    });

    it('should pause and resume session', () => {
      const { result } = renderHook(() => useMatchSessionStore());

      act(() => {
        result.current.startSession('deck-1', DEFAULT_MATCH_SETTINGS, mockCards);
      });

      expect(result.current.session?.isPaused).toBe(false);

      act(() => {
        result.current.pauseSession();
      });

      expect(result.current.session?.isPaused).toBe(true);

      act(() => {
        result.current.resumeSession();
      });

      expect(result.current.session?.isPaused).toBe(false);
    });
  });

  describe('Card Selection', () => {
    it('should select a card', () => {
      const { result } = renderHook(() => useMatchSessionStore());

      act(() => {
        result.current.startSession('deck-1', DEFAULT_MATCH_SETTINGS, mockCards);
      });

      const firstCardId = result.current.session?.grid[0].id;

      act(() => {
        result.current.selectCard(firstCardId!);
      });

      expect(result.current.session?.selectedCards).toContain(firstCardId);
      expect(result.current.session?.grid[0].isSelected).toBe(true);
    });

    it('should deselect a card when selected twice', () => {
      const { result } = renderHook(() => useMatchSessionStore());

      act(() => {
        result.current.startSession('deck-1', DEFAULT_MATCH_SETTINGS, mockCards);
      });

      const firstCardId = result.current.session?.grid[0].id;

      act(() => {
        result.current.selectCard(firstCardId!);
      });

      expect(result.current.session?.selectedCards).toContain(firstCardId);

      act(() => {
        result.current.selectCard(firstCardId!);
      });

      expect(result.current.session?.selectedCards).not.toContain(firstCardId);
      expect(result.current.session?.grid[0].isSelected).toBe(false);
    });

    it('should not select matched cards', () => {
      const { result } = renderHook(() => useMatchSessionStore());

      act(() => {
        result.current.startSession('deck-1', DEFAULT_MATCH_SETTINGS, mockCards);
      });

      // Manually set first card as matched
      act(() => {
        if (result.current.session) {
          result.current.session.grid[0].isMatched = true;
        }
      });

      const matchedCardId = result.current.session?.grid[0].id;

      act(() => {
        result.current.selectCard(matchedCardId!);
      });

      expect(result.current.session?.selectedCards).not.toContain(matchedCardId);
    });

    it('should clear selection', () => {
      const { result } = renderHook(() => useMatchSessionStore());

      act(() => {
        result.current.startSession('deck-1', DEFAULT_MATCH_SETTINGS, mockCards);
      });

      const firstCardId = result.current.session?.grid[0].id;
      const secondCardId = result.current.session?.grid[1].id;

      act(() => {
        result.current.selectCard(firstCardId!);
        result.current.selectCard(secondCardId!);
      });

      expect(result.current.session?.selectedCards).toHaveLength(2);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.session?.selectedCards).toHaveLength(0);
      expect(result.current.session?.grid[0].isSelected).toBe(false);
      expect(result.current.session?.grid[1].isSelected).toBe(false);
    });
  });

  describe('Match Processing', () => {
    it('should process a valid match', () => {
      const { result } = renderHook(() => useMatchSessionStore());

      act(() => {
        result.current.startSession('deck-1', {
          ...DEFAULT_MATCH_SETTINGS,
          matchType: 'two_way',
        }, mockCards);
      });

      // Find two cards with same groupId
      const card1 = result.current.session?.grid.find(c => c.groupId === 'group-0');
      const card2 = result.current.session?.grid.find(
        c => c.groupId === 'group-0' && c.id !== card1?.id
      );

      act(() => {
        result.current.selectCard(card1!.id);
        result.current.selectCard(card2!.id);
      });

      const matchResult = act(() => {
        return result.current.processMatch();
      });

      expect(matchResult.isMatch).toBe(true);
      expect(matchResult.matchedCards).toEqual([card1!.id, card2!.id]);
      expect(result.current.session?.matchedPairs).toHaveLength(1);
    });

    it('should process an invalid match', () => {
      const { result } = renderHook(() => useMatchSessionStore());

      act(() => {
        result.current.startSession('deck-1', DEFAULT_MATCH_SETTINGS, mockCards);
      });

      // Find two cards with different groupIds
      const card1 = result.current.session?.grid.find(c => c.groupId === 'group-0');
      const card2 = result.current.session?.grid.find(c => c.groupId === 'group-1');

      act(() => {
        result.current.selectCard(card1!.id);
        result.current.selectCard(card2!.id);
      });

      const matchResult = act(() => {
        return result.current.processMatch();
      });

      expect(matchResult.isMatch).toBe(false);
      expect(matchResult.matchedCards).toBeUndefined();
      expect(result.current.session?.missedCardIndices).toContain(card1!.cardIndex);
      expect(result.current.session?.missedCardIndices).toContain(card2!.cardIndex);
    });

    it('should not process match with insufficient cards', () => {
      const { result } = renderHook(() => useMatchSessionStore());

      act(() => {
        result.current.startSession('deck-1', DEFAULT_MATCH_SETTINGS, mockCards);
      });

      const card1 = result.current.session?.grid[0];

      act(() => {
        result.current.selectCard(card1!.id);
      });

      const matchResult = act(() => {
        return result.current.processMatch();
      });

      expect(matchResult.isMatch).toBe(false);
      expect(matchResult.matchedCards).toBeUndefined();
    });
  });

  describe('Round Management', () => {
    it('should start a new round', () => {
      const { result } = renderHook(() => useMatchSessionStore());

      act(() => {
        result.current.startSession('deck-1', DEFAULT_MATCH_SETTINGS, mockCards);
      });

      expect(result.current.session?.currentRound).toBe(1);

      act(() => {
        result.current.startNewRound();
      });

      expect(result.current.session?.currentRound).toBe(2);
      expect(result.current.session?.grid).toHaveLength(12);
      expect(result.current.session?.selectedCards).toHaveLength(0);
      expect(result.current.session?.matchedPairs).toHaveLength(0);
    });

    it('should prioritize missed cards in new round', () => {
      const { result } = renderHook(() => useMatchSessionStore());

      act(() => {
        result.current.startSession('deck-1', DEFAULT_MATCH_SETTINGS, mockCards);
      });

      // Set some missed cards
      act(() => {
        if (result.current.session) {
          result.current.session.missedCardIndices = [0, 1];
        }
      });

      act(() => {
        result.current.startNewRound([0, 1]);
      });

      // Check that grid contains cards from indices 0 and 1
      const cardIndices = result.current.session?.grid.map(c => c.cardIndex);
      expect(cardIndices).toContain(0);
      expect(cardIndices).toContain(1);
    });
  });

  describe('Grid Generation', () => {
    it('should generate correct grid for two-way matching', () => {
      const { result } = renderHook(() => useMatchSessionStore());

      const grid = act(() => {
        return result.current.generateGrid(mockCards, {
          ...DEFAULT_MATCH_SETTINGS,
          matchType: 'two_way',
          gridSize: { rows: 2, cols: 3 },
        });
      });

      expect(grid).toHaveLength(6);

      // Each card should appear twice (as pairs)
      const groupIds = grid.map(c => c.groupId);
      const uniqueGroups = new Set(groupIds);
      expect(uniqueGroups.size).toBe(3); // 3 unique groups

      // Each group should have exactly 2 cards
      uniqueGroups.forEach(groupId => {
        const count = groupIds.filter(id => id === groupId).length;
        expect(count).toBe(2);
      });
    });

    it('should generate correct grid for three-way matching', () => {
      const { result } = renderHook(() => useMatchSessionStore());

      const grid = act(() => {
        return result.current.generateGrid(mockCards, {
          ...DEFAULT_MATCH_SETTINGS,
          matchType: 'three_way',
          gridSize: { rows: 3, cols: 3 },
        });
      });

      expect(grid).toHaveLength(9);

      // Each card should appear three times
      const groupIds = grid.map(c => c.groupId);
      const uniqueGroups = new Set(groupIds);
      expect(uniqueGroups.size).toBe(3); // 3 unique groups

      // Each group should have exactly 3 cards
      uniqueGroups.forEach(groupId => {
        const count = groupIds.filter(id => id === groupId).length;
        expect(count).toBe(3);
      });
    });

    it('should respect card side configuration', () => {
      const { result } = renderHook(() => useMatchSessionStore());

      const grid = act(() => {
        return result.current.generateGrid(mockCards, {
          ...DEFAULT_MATCH_SETTINGS,
          cardSides: [
            { sides: ['side_a'], label: 'Front', count: 3 },
            { sides: ['side_b'], label: 'Back', count: 3 },
          ],
          gridSize: { rows: 2, cols: 3 },
        });
      });

      const sideACards = grid.filter(c => c.displaySides.includes('side_a'));
      const sideBCards = grid.filter(c => c.displaySides.includes('side_b'));

      expect(sideACards).toHaveLength(3);
      expect(sideBCards).toHaveLength(3);
    });
  });

  describe('Session Persistence', () => {
    it('should save session to localStorage', () => {
      const { result } = renderHook(() => useMatchSessionStore());

      act(() => {
        result.current.startSession('deck-1', DEFAULT_MATCH_SETTINGS, mockCards);
      });

      act(() => {
        result.current.saveSession();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'match-session-deck-1',
        expect.any(String)
      );
    });

    it('should load session from localStorage', () => {
      const mockSession = {
        deckId: 'deck-1',
        currentRound: 2,
        startTime: Date.now() - 30000,
        grid: [],
        selectedCards: [],
        matchedPairs: [],
        settings: DEFAULT_MATCH_SETTINGS,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSession));

      const { result } = renderHook(() => useMatchSessionStore());

      const loadedSession = act(() => {
        return result.current.loadSession('deck-1');
      });

      expect(loadedSession).toBeDefined();
      expect(loadedSession?.currentRound).toBe(2);
      expect(loadedSession?.deckId).toBe('deck-1');
    });

    it('should handle invalid stored session data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const { result } = renderHook(() => useMatchSessionStore());

      const loadedSession = act(() => {
        return result.current.loadSession('deck-1');
      });

      expect(loadedSession).toBeNull();
    });
  });

  describe('Game Completion', () => {
    it('should detect game completion', () => {
      const { result } = renderHook(() => useMatchSessionStore());

      act(() => {
        result.current.startSession('deck-1', DEFAULT_MATCH_SETTINGS, mockCards.slice(0, 2));
      });

      // Mark all cards as matched
      act(() => {
        if (result.current.session) {
          result.current.session.grid.forEach(card => {
            card.isMatched = true;
          });
        }
      });

      // Check completion
      const isCompleted = result.current.session?.grid.every(c => c.isMatched);
      expect(isCompleted).toBe(true);
    });

    it('should calculate elapsed time correctly', () => {
      vi.useFakeTimers();
      const startTime = Date.now();

      const { result } = renderHook(() => useMatchSessionStore());

      act(() => {
        result.current.startSession('deck-1', DEFAULT_MATCH_SETTINGS, mockCards);
      });

      // Advance time by 30 seconds
      vi.advanceTimersByTime(30000);

      const elapsedTime = Date.now() - result.current.session!.startTime;
      expect(elapsedTime).toBeCloseTo(30000, -2); // Within 100ms

      vi.useRealTimers();
    });
  });
});