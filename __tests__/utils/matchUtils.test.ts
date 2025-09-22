import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  shuffleCards,
  calculateGridPosition,
  validateMatch,
  filterCardsByMastery,
  calculateOptimalGridSize,
  validateGridConfiguration,
} from '@/utils/matchUtils';
import { Card } from '@/types';
import { MatchCard, MatchSettings } from '@/components/modes/match/types';

describe('matchUtils', () => {
  describe('shuffleCards', () => {
    it('should shuffle array and return new array', () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled = shuffleCards(original);

      // Should return new array
      expect(shuffled).not.toBe(original);

      // Should have same elements
      expect(shuffled).toHaveLength(original.length);
      expect(new Set(shuffled)).toEqual(new Set(original));
    });

    it('should produce different orderings', () => {
      const original = Array.from({ length: 20 }, (_, i) => i);
      const results = new Set();

      // Run shuffle multiple times
      for (let i = 0; i < 10; i++) {
        const shuffled = shuffleCards(original);
        results.add(JSON.stringify(shuffled));
      }

      // Should produce at least 2 different orderings
      expect(results.size).toBeGreaterThan(1);
    });

    it('should handle empty arrays', () => {
      expect(shuffleCards([])).toEqual([]);
    });

    it('should handle single-element arrays', () => {
      expect(shuffleCards([1])).toEqual([1]);
    });
  });

  describe('calculateGridPosition', () => {
    it('should calculate correct position for index', () => {
      expect(calculateGridPosition(0, 4)).toEqual({ row: 0, col: 0 });
      expect(calculateGridPosition(3, 4)).toEqual({ row: 0, col: 3 });
      expect(calculateGridPosition(4, 4)).toEqual({ row: 1, col: 0 });
      expect(calculateGridPosition(7, 4)).toEqual({ row: 1, col: 3 });
      expect(calculateGridPosition(11, 4)).toEqual({ row: 2, col: 3 });
    });

    it('should handle different column counts', () => {
      expect(calculateGridPosition(5, 3)).toEqual({ row: 1, col: 2 });
      expect(calculateGridPosition(5, 5)).toEqual({ row: 1, col: 0 });
      expect(calculateGridPosition(5, 6)).toEqual({ row: 0, col: 5 });
    });

    it('should handle edge cases', () => {
      expect(calculateGridPosition(0, 1)).toEqual({ row: 0, col: 0 });
      expect(calculateGridPosition(99, 10)).toEqual({ row: 9, col: 9 });
    });
  });

  describe('validateMatch', () => {
    const createMatchCard = (id: string, groupId: string, sides: string[]): MatchCard => ({
      id,
      cardIndex: 0,
      displaySides: sides,
      content: 'test',
      groupId,
      isMatched: false,
      isSelected: false,
      position: { row: 0, col: 0 },
    });

    describe('two-way matching', () => {
      it('should validate matching cards with same groupId', () => {
        const cards = [
          createMatchCard('card-1', 'group-1', ['side_a']),
          createMatchCard('card-2', 'group-1', ['side_b']),
        ];

        expect(validateMatch(cards, 'two_way')).toBe(true);
      });

      it('should reject non-matching cards', () => {
        const cards = [
          createMatchCard('card-1', 'group-1', ['side_a']),
          createMatchCard('card-2', 'group-2', ['side_b']),
        ];

        expect(validateMatch(cards, 'two_way')).toBe(false);
      });

      it('should reject incorrect number of cards', () => {
        const cards = [
          createMatchCard('card-1', 'group-1', ['side_a']),
        ];

        expect(validateMatch(cards, 'two_way')).toBe(false);
      });

      it('should reject duplicate cards', () => {
        const card = createMatchCard('card-1', 'group-1', ['side_a']);
        const cards = [card, card];

        expect(validateMatch(cards, 'two_way')).toBe(false);
      });
    });

    describe('three-way matching', () => {
      it('should validate three matching cards', () => {
        const cards = [
          createMatchCard('card-1', 'group-1', ['side_a']),
          createMatchCard('card-2', 'group-1', ['side_b']),
          createMatchCard('card-3', 'group-1', ['side_c']),
        ];

        expect(validateMatch(cards, 'three_way')).toBe(true);
      });

      it('should reject non-matching cards', () => {
        const cards = [
          createMatchCard('card-1', 'group-1', ['side_a']),
          createMatchCard('card-2', 'group-1', ['side_b']),
          createMatchCard('card-3', 'group-2', ['side_c']),
        ];

        expect(validateMatch(cards, 'three_way')).toBe(false);
      });

      it('should reject incorrect number of cards', () => {
        const cards = [
          createMatchCard('card-1', 'group-1', ['side_a']),
          createMatchCard('card-2', 'group-1', ['side_b']),
        ];

        expect(validateMatch(cards, 'three_way')).toBe(false);
      });
    });

    describe('custom matching', () => {
      it('should validate cards with same groupId', () => {
        const cards = [
          createMatchCard('card-1', 'custom-1', ['side_a', 'side_b']),
          createMatchCard('card-2', 'custom-1', ['side_c']),
          createMatchCard('card-3', 'custom-1', ['side_d', 'side_e']),
        ];

        expect(validateMatch(cards, 'custom')).toBe(true);
      });

      it('should allow variable number of cards', () => {
        const cards = [
          createMatchCard('card-1', 'custom-1', ['side_a']),
          createMatchCard('card-2', 'custom-1', ['side_b']),
          createMatchCard('card-3', 'custom-1', ['side_c']),
          createMatchCard('card-4', 'custom-1', ['side_d']),
        ];

        expect(validateMatch(cards, 'custom')).toBe(true);
      });

      it('should reject non-matching cards', () => {
        const cards = [
          createMatchCard('card-1', 'custom-1', ['side_a']),
          createMatchCard('card-2', 'custom-2', ['side_b']),
        ];

        expect(validateMatch(cards, 'custom')).toBe(false);
      });
    });
  });

  describe('filterCardsByMastery', () => {
    const mockCards: Card[] = [
      { idx: 0, level: 1, side_a: 'A1', side_b: 'B1' } as Card,
      { idx: 1, level: 1, side_a: 'A2', side_b: 'B2' } as Card,
      { idx: 2, level: 1, side_a: 'A3', side_b: 'B3' } as Card,
      { idx: 3, level: 1, side_a: 'A4', side_b: 'B4' } as Card,
    ];

    it('should exclude mastered cards when includeMastered is false', () => {
      const masteredIndices = new Set([0, 2]);
      const filtered = filterCardsByMastery(mockCards, masteredIndices, false);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(c => c.idx)).toEqual([1, 3]);
    });

    it('should include all cards when includeMastered is true', () => {
      const masteredIndices = new Set([0, 2]);
      const filtered = filterCardsByMastery(mockCards, masteredIndices, true);

      expect(filtered).toHaveLength(4);
      expect(filtered).toEqual(mockCards);
    });

    it('should handle empty mastered set', () => {
      const masteredIndices = new Set<number>();
      const filtered = filterCardsByMastery(mockCards, masteredIndices, false);

      expect(filtered).toHaveLength(4);
      expect(filtered).toEqual(mockCards);
    });

    it('should handle all cards mastered', () => {
      const masteredIndices = new Set([0, 1, 2, 3]);
      const filtered = filterCardsByMastery(mockCards, masteredIndices, false);

      expect(filtered).toHaveLength(0);
    });

    it('should handle empty cards array', () => {
      const masteredIndices = new Set([0, 1]);
      const filtered = filterCardsByMastery([], masteredIndices, false);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('calculateOptimalGridSize', () => {
    it('should return 2x3 for 6 cards', () => {
      expect(calculateOptimalGridSize(6)).toEqual({ rows: 2, cols: 3 });
    });

    it('should return 3x4 for 12 cards', () => {
      expect(calculateOptimalGridSize(12)).toEqual({ rows: 3, cols: 4 });
    });

    it('should return 4x5 for 20 cards', () => {
      expect(calculateOptimalGridSize(20)).toEqual({ rows: 4, cols: 5 });
    });

    it('should handle odd numbers of cards', () => {
      expect(calculateOptimalGridSize(7)).toEqual({ rows: 2, cols: 4 });
      expect(calculateOptimalGridSize(11)).toEqual({ rows: 3, cols: 4 });
      expect(calculateOptimalGridSize(15)).toEqual({ rows: 3, cols: 5 });
    });

    it('should handle very small numbers', () => {
      expect(calculateOptimalGridSize(2)).toEqual({ rows: 1, cols: 2 });
      expect(calculateOptimalGridSize(3)).toEqual({ rows: 1, cols: 3 });
      expect(calculateOptimalGridSize(4)).toEqual({ rows: 2, cols: 2 });
    });

    it('should handle large numbers', () => {
      const result = calculateOptimalGridSize(100);
      expect(result.rows * result.cols).toBeGreaterThanOrEqual(100);
      expect(result.rows).toBeLessThanOrEqual(10);
      expect(result.cols).toBeLessThanOrEqual(10);
    });

    it('should prefer wider grids over taller', () => {
      const result = calculateOptimalGridSize(8);
      expect(result.cols).toBeGreaterThanOrEqual(result.rows);
    });
  });

  describe('validateGridConfiguration', () => {
    it('should validate correct configuration', () => {
      const result = validateGridConfiguration(
        { rows: 3, cols: 4 },
        12,
        'two_way'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect insufficient cards', () => {
      const result = validateGridConfiguration(
        { rows: 3, cols: 4 },
        10,
        'two_way'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Not enough cards for the selected grid size');
    });

    it('should detect odd cards for two-way matching', () => {
      const result = validateGridConfiguration(
        { rows: 3, cols: 3 },
        9,
        'two_way'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Two-way matching requires an even number of cards');
    });

    it('should validate three-way matching', () => {
      const result = validateGridConfiguration(
        { rows: 3, cols: 3 },
        9,
        'three_way'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect incorrect multiple for three-way matching', () => {
      const result = validateGridConfiguration(
        { rows: 2, cols: 4 },
        8,
        'three_way'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Three-way matching requires a multiple of 3 cards');
    });

    it('should allow any configuration for custom matching', () => {
      const result = validateGridConfiguration(
        { rows: 2, cols: 3 },
        6,
        'custom'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid grid dimensions', () => {
      const result = validateGridConfiguration(
        { rows: 0, cols: 4 },
        12,
        'two_way'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid grid dimensions');
    });

    it('should detect too large grid', () => {
      const result = validateGridConfiguration(
        { rows: 20, cols: 20 },
        400,
        'two_way'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Grid too large (maximum 100 cells)');
    });
  });
});