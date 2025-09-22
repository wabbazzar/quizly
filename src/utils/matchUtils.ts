import { Card } from '@/types';
import {
  MatchCard,
  MatchSettings,
  MatchValidationResult,
  CardGenerationOptions,
  GridPosition,
} from '@/components/modes/match/types';

/**
 * Generate unique card ID for match mode
 */
export const generateCardId = (
  cardIndex: number,
  sideGroup: string,
  position: number
): string => {
  return `${cardIndex}-${sideGroup}-${position}`;
};

/**
 * Generate group ID for matching cards
 */
export const generateGroupId = (cardIndex: number): string => {
  return `group-${cardIndex}`;
};

/**
 * Shuffle array using Fisher-Yates algorithm
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Calculate grid positions for given dimensions
 */
export const calculateGridPositions = (
  totalCards: number,
  gridSize: { rows: number; cols: number }
): GridPosition[] => {
  const positions: GridPosition[] = [];

  for (let i = 0; i < totalCards; i++) {
    const row = Math.floor(i / gridSize.cols);
    const col = i % gridSize.cols;

    positions.push({ row, col, index: i });
  }

  return positions;
};

/**
 * Generate match cards from deck cards with proper configuration
 */
export const generateMatchCards = (
  cards: Card[],
  settings: MatchSettings,
  gridSize: { rows: number; cols: number }
): MatchCard[] => {
  const { cardSides } = settings;
  const totalSlots = gridSize.rows * gridSize.cols;

  // Ensure we have enough cards for the grid
  const maxPairs = Math.floor(totalSlots / cardSides.length);

  if (cards.length < maxPairs) {
    console.warn('Not enough cards for grid. Using available cards.');
  }

  // Select cards for this round
  const selectedCards = shuffleArray(cards).slice(0, Math.min(maxPairs, cards.length));
  const matchCards: MatchCard[] = [];

  // Generate match cards based on card sides configuration
  selectedCards.forEach((card) => {
    const groupId = generateGroupId(card.idx);

    cardSides.forEach((sideConfig, sideIndex) => {
      // Create content by combining the specified sides
      const content = sideConfig.sides
        .map(side => {
          const sideKey = side as keyof Card;
          return card[sideKey] || '';
        })
        .filter(Boolean)
        .join(' • ');

      // Skip empty content
      if (!content.trim()) return;

      const cardId = generateCardId(card.idx, sideConfig.label, sideIndex);

      matchCards.push({
        id: cardId,
        cardIndex: card.idx,
        displaySides: sideConfig.sides,
        content: content.trim(),
        groupId,
        isMatched: false,
        isSelected: false,
        position: { row: 0, col: 0 }, // Will be set during grid placement
      });
    });
  });

  // Shuffle and place cards on grid
  const shuffledCards = shuffleArray(matchCards);
  const gridPositions = calculateGridPositions(
    Math.min(shuffledCards.length, totalSlots),
    gridSize
  );

  // Assign grid positions
  shuffledCards.forEach((card, index) => {
    if (index < gridPositions.length) {
      card.position = {
        row: gridPositions[index].row,
        col: gridPositions[index].col,
      };
    }
  });

  return shuffledCards.slice(0, totalSlots);
};

/**
 * Validate if selected cards form a match
 */
export const validateMatchCards = (
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

/**
 * Filter cards based on mastery status
 */
export const filterCardsByMastery = (
  cards: Card[],
  excludeMastered: boolean,
  masteredIndices: number[]
): Card[] => {
  if (!excludeMastered || masteredIndices.length === 0) {
    return cards;
  }

  return cards.filter((_, index) => !masteredIndices.includes(index));
};

/**
 * Calculate optimal card count for grid
 */
export const calculateOptimalCardCount = (
  gridSize: { rows: number; cols: number },
  matchType: 'two_way' | 'three_way' | 'custom',
  cardSidesCount: number
): number => {
  const totalSlots = gridSize.rows * gridSize.cols;

  // For two-way matching, we need pairs
  if (matchType === 'two_way') {
    return Math.floor(totalSlots / 2) * 2;
  }

  // For three-way matching, we need groups of 3
  if (matchType === 'three_way') {
    return Math.floor(totalSlots / 3) * 3;
  }

  // For custom matching, use card sides configuration
  return Math.floor(totalSlots / cardSidesCount) * cardSidesCount;
};

/**
 * Generate card content from multiple sides
 */
export const generateCardContent = (
  card: Card,
  sides: string[],
  separator: string = ' • '
): string => {
  return sides
    .map(side => {
      const sideKey = side as keyof Card;
      return card[sideKey] || '';
    })
    .filter(Boolean)
    .join(separator)
    .trim();
};

/**
 * Check if grid is complete (all cards matched)
 */
export const isGridComplete = (cards: MatchCard[]): boolean => {
  return cards.length > 0 && cards.every(card => card.isMatched);
};

/**
 * Get remaining cards count
 */
export const getRemainingCardsCount = (cards: MatchCard[]): number => {
  return cards.filter(card => !card.isMatched).length;
};

/**
 * Get matched pairs information
 */
export const getMatchedPairsInfo = (
  cards: MatchCard[]
): { totalPairs: number; matchedPairs: number; progress: number } => {
  const totalCards = cards.length;
  const matchedCards = cards.filter(card => card.isMatched).length;

  // Assuming pairs for simplicity - adjust based on match type
  const totalPairs = Math.floor(totalCards / 2);
  const matchedPairs = Math.floor(matchedCards / 2);
  const progress = totalPairs > 0 ? (matchedPairs / totalPairs) * 100 : 0;

  return { totalPairs, matchedPairs, progress };
};

/**
 * Validate grid configuration
 */
export const validateGridConfiguration = (
  gridSize: { rows: number; cols: number },
  settings: MatchSettings
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const totalSlots = gridSize.rows * gridSize.cols;

  // Check minimum slots
  if (totalSlots < 4) {
    errors.push('Grid must have at least 4 slots');
  }

  // Check if slots are compatible with match type
  const cardSidesCount = settings.cardSides.length;
  if (totalSlots % cardSidesCount !== 0) {
    errors.push(`Grid slots (${totalSlots}) must be divisible by card sides count (${cardSidesCount})`);
  }

  // Check match type compatibility
  if (settings.matchType === 'two_way' && totalSlots % 2 !== 0) {
    errors.push('Two-way matching requires even number of slots');
  }

  if (settings.matchType === 'three_way' && totalSlots % 3 !== 0) {
    errors.push('Three-way matching requires slots divisible by 3');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Create match cards with proper error handling
 */
export const createMatchCardsWithValidation = (
  options: CardGenerationOptions
): { cards: MatchCard[]; errors: string[] } => {
  const errors: string[] = [];

  try {
    // Validate input
    if (!options.deck?.content || options.deck.content.length === 0) {
      errors.push('No cards available in deck');
      return { cards: [], errors };
    }

    // Filter cards by mastery if needed
    const availableCards = filterCardsByMastery(
      options.deck.content,
      options.excludeMastered,
      options.masteredIndices
    );

    if (availableCards.length === 0) {
      errors.push('No cards available after filtering');
      return { cards: [], errors };
    }

    // Validate grid configuration
    const gridValidation = validateGridConfiguration(
      options.settings.gridSize,
      options.settings
    );

    if (!gridValidation.isValid) {
      errors.push(...gridValidation.errors);
      return { cards: [], errors };
    }

    // Generate cards
    const cards = generateMatchCards(
      availableCards,
      options.settings,
      options.settings.gridSize
    );

    if (cards.length === 0) {
      errors.push('Failed to generate match cards');
    }

    return { cards, errors };

  } catch (error) {
    console.error('Error creating match cards:', error);
    errors.push('Unexpected error during card generation');
    return { cards: [], errors };
  }
};

export default {
  generateCardId,
  generateGroupId,
  shuffleArray,
  calculateGridPositions,
  generateMatchCards,
  validateMatchCards,
  filterCardsByMastery,
  calculateOptimalCardCount,
  generateCardContent,
  isGridComplete,
  getRemainingCardsCount,
  getMatchedPairsInfo,
  validateGridConfiguration,
  createMatchCardsWithValidation,
};