import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  MatchSessionState,
  MatchSessionStore,
  MatchSettings,
  MatchCard,
  DEFAULT_MATCH_SETTINGS,
  MatchValidationResult,
} from '@/components/modes/match/types';
import { Card } from '@/types';

const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Utility function to generate unique card IDs
const generateCardId = (cardIndex: number, sideGroup: string, position: number): string => {
  return `${cardIndex}-${sideGroup}-${position}`;
};

// Utility function to generate group ID for matching
const generateGroupId = (cardIndex: number): string => {
  return `group-${cardIndex}`;
};

// Utility function to shuffle array
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Generate match cards from deck cards
const generateMatchCards = (
  cards: Card[],
  settings: MatchSettings,
  excludeMastered: boolean = false,
  masteredIndices: number[] = []
): MatchCard[] => {
  const { gridSize, matchType } = settings;
  const totalSlots = gridSize.rows * gridSize.cols;

  // Filter cards if excluding mastered
  let availableCards = excludeMastered
    ? cards.filter((_, index) => !masteredIndices.includes(index))
    : cards;

  // Calculate how many source cards we need based on match type
  let cardsPerGroup = 2; // Default for two_way
  if (matchType === 'three_way') {
    cardsPerGroup = 3;
  }

  const maxGroups = Math.floor(totalSlots / cardsPerGroup);

  // Ensure we have enough cards
  if (availableCards.length < maxGroups) {
    // If not enough cards, use all available and potentially repeat some
    const needed = maxGroups - availableCards.length;
    const repeated = shuffleArray(availableCards).slice(0, needed);
    availableCards = [...availableCards, ...repeated];
  }

  // Select cards for this round
  const selectedCards = shuffleArray(availableCards).slice(0, maxGroups);
  const matchCards: MatchCard[] = [];

  // Generate match cards based on match type
  selectedCards.forEach((card) => {
    const groupId = generateGroupId(card.idx);

    if (matchType === 'two_way') {
      // Create two cards: one showing side_a, one showing side_b
      // Card 1: Shows side_a (the question/term)
      matchCards.push({
        id: generateCardId(card.idx, 'side_a', 0),
        cardIndex: card.idx,
        displaySides: ['side_a'],
        content: (card.side_a || '').trim(),
        groupId,
        isMatched: false,
        isSelected: false,
        position: { row: 0, col: 0 },
      });

      // Card 2: Shows side_b (the answer/definition)
      matchCards.push({
        id: generateCardId(card.idx, 'side_b', 1),
        cardIndex: card.idx,
        displaySides: ['side_b'],
        content: (card.side_b || '').trim(),
        groupId,
        isMatched: false,
        isSelected: false,
        position: { row: 0, col: 0 },
      });
    } else if (matchType === 'three_way') {
      // Create three cards: showing side_a, side_b, and side_c
      // Card 1: Shows side_a
      matchCards.push({
        id: generateCardId(card.idx, 'side_a', 0),
        cardIndex: card.idx,
        displaySides: ['side_a'],
        content: (card.side_a || '').trim(),
        groupId,
        isMatched: false,
        isSelected: false,
        position: { row: 0, col: 0 },
      });

      // Card 2: Shows side_b
      matchCards.push({
        id: generateCardId(card.idx, 'side_b', 1),
        cardIndex: card.idx,
        displaySides: ['side_b'],
        content: (card.side_b || '').trim(),
        groupId,
        isMatched: false,
        isSelected: false,
        position: { row: 0, col: 0 },
      });

      // Card 3: Shows side_c
      matchCards.push({
        id: generateCardId(card.idx, 'side_c', 2),
        cardIndex: card.idx,
        displaySides: ['side_c'],
        content: (card.side_c || '').trim(),
        groupId,
        isMatched: false,
        isSelected: false,
        position: { row: 0, col: 0 },
      });
    } else {
      // Custom mode: use the cardSides configuration from settings
      if (settings.cardSides && settings.cardSides.length > 0) {
        settings.cardSides.forEach((cardSide, index) => {
          const sideKey = cardSide.sides[0]; // e.g., 'side_a', 'side_b', 'side_c'
          const sideContent = (card as any)[sideKey] || '';

          matchCards.push({
            id: generateCardId(card.idx, sideKey, index),
            cardIndex: card.idx,
            displaySides: [sideKey],
            content: sideContent.trim(),
            groupId,
            isMatched: false,
            isSelected: false,
            position: { row: 0, col: 0 },
          });
        });
      } else {
        // Fallback to two-way if not properly configured
        matchCards.push({
          id: generateCardId(card.idx, 'side_a', 0),
          cardIndex: card.idx,
          displaySides: ['side_a'],
          content: (card.side_a || '').trim(),
          groupId,
          isMatched: false,
          isSelected: false,
          position: { row: 0, col: 0 },
        });

        matchCards.push({
          id: generateCardId(card.idx, 'side_b', 1),
          cardIndex: card.idx,
          displaySides: ['side_b'],
          content: (card.side_b || '').trim(),
          groupId,
          isMatched: false,
          isSelected: false,
          position: { row: 0, col: 0 },
        });
      }
    }
  });

  // Shuffle and place cards on grid
  const shuffledCards = shuffleArray(matchCards);

  // Assign grid positions
  shuffledCards.forEach((card, index) => {
    const row = Math.floor(index / gridSize.cols);
    const col = index % gridSize.cols;
    card.position = { row, col };
  });

  return shuffledCards.slice(0, totalSlots);
};

// Validate if selected cards form a match
const validateMatch = (
  selectedCards: MatchCard[],
  matchType: 'two_way' | 'three_way' | 'custom'
): MatchValidationResult => {
  if (selectedCards.length < 2) {
    return { isValid: false, matchedCards: [], matchType };
  }

  // Check if all selected cards have the same group ID
  const firstGroupId = selectedCards[0].groupId;
  const allSameGroup = selectedCards.every(card => card.groupId === firstGroupId);

  // Check for match type requirements
  let isValidCount = false;
  switch (matchType) {
    case 'two_way':
      isValidCount = selectedCards.length === 2;
      break;
    case 'three_way':
      isValidCount = selectedCards.length === 3;
      break;
    case 'custom':
      isValidCount = selectedCards.length >= 2;
      break;
  }

  const isValid = allSameGroup && isValidCount;
  const matchedCards = isValid ? selectedCards.map(card => card.id) : [];

  return { isValid, matchedCards, matchType };
};

export const useMatchSessionStore = create<MatchSessionStore>()(
  persist(
    (set, get) => ({
      session: null,

      startSession: (deckId: string, settings: MatchSettings = DEFAULT_MATCH_SETTINGS) => {
        const startTime = Date.now();
        const newSession: MatchSessionState = {
          deckId,
          currentRound: 1,
          startTime,
          pausedTime: 0,
          isPaused: false,
          grid: [],
          selectedCards: [],
          matchedPairs: [],
          missedCardIndices: [],
          roundStartTime: startTime,
          bestTime: null,
          settings,
        };

        set({ session: newSession });
      },

      pauseSession: () => {
        const { session } = get();
        if (session && !session.isPaused) {
          set({
            session: {
              ...session,
              isPaused: true,
              pausedTime: Date.now(),
            },
          });
        }
      },

      resumeSession: () => {
        const { session } = get();
        if (session && session.isPaused) {
          const pauseDuration = Date.now() - session.pausedTime;
          set({
            session: {
              ...session,
              isPaused: false,
              pausedTime: 0,
              roundStartTime: session.roundStartTime + pauseDuration,
            },
          });
        }
      },

      endSession: () => {
        set({ session: null });
      },

      selectCard: (cardId: string) => {
        const { session } = get();
        if (!session || session.isPaused) return;

        const card = session.grid.find(c => c.id === cardId);
        if (!card || card.isMatched) return;

        let newSelectedCards: string[];
        let newGrid = [...session.grid];

        if (session.selectedCards.includes(cardId)) {
          // Deselect card
          newSelectedCards = session.selectedCards.filter(id => id !== cardId);
          newGrid = newGrid.map(c =>
            c.id === cardId ? { ...c, isSelected: false } : c
          );
        } else {
          // Select card
          newSelectedCards = [...session.selectedCards, cardId];
          newGrid = newGrid.map(c =>
            c.id === cardId ? { ...c, isSelected: true } : c
          );
        }

        set({
          session: {
            ...session,
            selectedCards: newSelectedCards,
            grid: newGrid,
          },
        });
      },

      clearSelection: () => {
        const { session } = get();
        if (!session) return;

        const newGrid = session.grid.map(card => ({
          ...card,
          isSelected: false,
        }));

        set({
          session: {
            ...session,
            selectedCards: [],
            grid: newGrid,
          },
        });
      },

      processMatch: () => {
        const { session } = get();
        if (!session || session.selectedCards.length === 0) {
          return { isMatch: false };
        }

        const selectedCardObjects = session.grid.filter(card =>
          session.selectedCards.includes(card.id)
        );

        const validationResult = validateMatch(
          selectedCardObjects,
          session.settings.matchType
        );

        if (validationResult.isValid) {
          // Mark cards as matched
          const newGrid = session.grid.map(card =>
            validationResult.matchedCards.includes(card.id)
              ? { ...card, isMatched: true, isSelected: false }
              : { ...card, isSelected: false }
          );

          const newMatchedPairs = [...session.matchedPairs, validationResult.matchedCards];

          set({
            session: {
              ...session,
              grid: newGrid,
              selectedCards: [],
              matchedPairs: newMatchedPairs,
            },
          });

          return { isMatch: true, matchedCards: validationResult.matchedCards };
        } else {
          // Clear selection for mismatch
          get().clearSelection();
          return { isMatch: false };
        }
      },

      startNewRound: (missedCards?: number[]) => {
        const { session } = get();
        if (!session) return;

        set({
          session: {
            ...session,
            currentRound: session.currentRound + 1,
            roundStartTime: Date.now(),
            grid: [],
            selectedCards: [],
            matchedPairs: [],
            missedCardIndices: missedCards || [],
          },
        });
      },

      generateGrid: (cards: Card[], settings: MatchSettings) => {
        const { session } = get();
        if (!session) return [];

        const newGrid = generateMatchCards(cards, settings);

        set({
          session: {
            ...session,
            grid: newGrid,
          },
        });

        return newGrid;
      },

      saveSession: () => {
        // Session is automatically saved via persist middleware
      },

      loadSession: (deckId: string) => {
        const { session } = get();
        if (session && session.deckId === deckId) {
          // Check if session is expired
          if (Date.now() - session.startTime > SESSION_EXPIRY_MS) {
            set({ session: null });
            return null;
          }
          return session;
        }
        return null;
      },
    }),
    {
      name: 'match-session-store',
      // Custom storage to handle complex objects
      storage: {
        getItem: name => {
          const str = localStorage.getItem(name);
          if (!str) return null;

          try {
            const { state } = JSON.parse(str);
            return { state };
          } catch (error) {
            console.warn('Failed to parse match session storage:', error);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            const { state } = value;
            localStorage.setItem(name, JSON.stringify({ state }));
          } catch (error) {
            console.warn('Failed to save match session storage:', error);
          }
        },
        removeItem: name => localStorage.removeItem(name),
      },
      // Only persist essential session data
      partialize: state => ({
        session: state.session,
      }),
    }
  )
);

// Utility functions for external use
export {
  generateMatchCards,
  validateMatch,
  shuffleArray,
  generateCardId,
  generateGroupId,
};