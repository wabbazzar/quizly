import { useCallback, useMemo } from 'react';
import { Card } from '@/types';
import {
  MatchCard,
  MatchSettings,
  MatchValidationResult,
} from '../types';
import {
  generateMatchCards,
  validateMatchCards,
  shuffleArray,
  generateCardId,
  generateGroupId,
} from '@/utils/matchUtils';

interface UseMatchLogicReturn {
  generateMatchCards: (
    cards: Card[],
    settings: MatchSettings,
    gridSize: { rows: number; cols: number }
  ) => MatchCard[];

  checkMatch: (
    selectedCards: MatchCard[],
    matchType: 'two_way' | 'three_way' | 'custom'
  ) => MatchValidationResult;

  shuffleGrid: (cards: MatchCard[]) => MatchCard[];

  validateCardSelection: (
    selectedCards: string[],
    allCards: MatchCard[],
    maxSelections: number
  ) => {
    isValid: boolean;
    canSelectMore: boolean;
    selectedCardObjects: MatchCard[];
  };

  calculateGridDimensions: (
    totalCards: number,
    preferredRatio?: number
  ) => { rows: number; cols: number };
}

export const useMatchLogic = (): UseMatchLogicReturn => {
  // Generate match cards from deck cards with proper grid placement
  const generateCards = useCallback((
    cards: Card[],
    settings: MatchSettings,
    gridSize: { rows: number; cols: number }
  ): MatchCard[] => {
    return generateMatchCards(cards, settings, gridSize);
  }, []);

  // Check if selected cards form a valid match
  const checkMatch = useCallback((
    selectedCards: MatchCard[],
    matchType: 'two_way' | 'three_way' | 'custom'
  ): MatchValidationResult => {
    return validateMatchCards(selectedCards, matchType);
  }, []);

  // Shuffle grid cards while maintaining position integrity
  const shuffleGrid = useCallback((cards: MatchCard[]): MatchCard[] => {
    const shuffled = shuffleArray([...cards]);

    // Reassign positions after shuffling
    return shuffled.map((card, index) => {
      const gridCols = Math.ceil(Math.sqrt(cards.length));
      const row = Math.floor(index / gridCols);
      const col = index % gridCols;

      return {
        ...card,
        position: { row, col },
      };
    });
  }, []);

  // Validate card selection constraints
  const validateCardSelection = useCallback((
    selectedCards: string[],
    allCards: MatchCard[],
    maxSelections: number
  ) => {
    const selectedCardObjects = allCards.filter(card =>
      selectedCards.includes(card.id) && !card.isMatched
    );

    const isValid = selectedCardObjects.length <= maxSelections;
    const canSelectMore = selectedCardObjects.length < maxSelections;

    return {
      isValid,
      canSelectMore,
      selectedCardObjects,
    };
  }, []);

  // Calculate optimal grid dimensions for given number of cards
  const calculateGridDimensions = useCallback((
    totalCards: number,
    preferredRatio: number = 4/3 // Default 4:3 aspect ratio
  ): { rows: number; cols: number } => {
    if (totalCards <= 0) return { rows: 1, cols: 1 };

    // Find the best grid dimensions that approximate the preferred ratio
    let bestRows = 1;
    let bestCols = totalCards;
    let bestRatioDiff = Math.abs((bestCols / bestRows) - preferredRatio);

    for (let rows = 1; rows <= Math.ceil(Math.sqrt(totalCards)); rows++) {
      const cols = Math.ceil(totalCards / rows);
      const ratio = cols / rows;
      const ratioDiff = Math.abs(ratio - preferredRatio);

      if (ratioDiff < bestRatioDiff) {
        bestRatioDiff = ratioDiff;
        bestRows = rows;
        bestCols = cols;
      }
    }

    return { rows: bestRows, cols: bestCols };
  }, []);

  // Memoized utility functions for consistent reference
  const memoizedUtils = useMemo(() => ({
    generateCardId,
    generateGroupId,
    shuffleArray,
  }), []);

  return {
    generateMatchCards: generateCards,
    checkMatch,
    shuffleGrid,
    validateCardSelection,
    calculateGridDimensions,
    ...memoizedUtils,
  };
};

export default useMatchLogic;