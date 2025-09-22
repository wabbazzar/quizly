import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMatchSessionStore } from '@/store/matchSessionStore';
import { Card } from '@/types';
import { MatchSettings } from '@/components/modes/match/types';

describe('Match Session Store - Three-Way Matching', () => {
  beforeEach(() => {
    useMatchSessionStore.setState({
      session: null,
    });
  });

  const mockCards: Card[] = [
    {
      card_id: 'card-001',
      idx: 0,
      name: 'you',
      side_a: 'you',
      side_b: 'nǐ',
      side_c: '你',
      side_d: 'pronoun',
      level: 1,
    },
    {
      card_id: 'card-002',
      idx: 1,
      name: 'good',
      side_a: 'good',
      side_b: 'hǎo',
      side_c: '好',
      side_d: 'adjective',
      level: 1,
    },
    {
      card_id: 'card-003',
      idx: 2,
      name: 'please',
      side_a: 'please',
      side_b: 'qǐng',
      side_c: '请',
      side_d: 'verb',
      level: 1,
    },
  ];

  it('should generate cards with side_c content for three-way matching', () => {
    const store = useMatchSessionStore.getState();

    const settings: MatchSettings = {
      gridSize: { rows: 3, cols: 3 },
      matchType: 'three_way',
      cardSides: [
        { sides: ['side_a'], label: 'English', count: 3 },
        { sides: ['side_b'], label: 'Pinyin', count: 3 },
        { sides: ['side_c'], label: 'Characters', count: 3 },
      ],
      enableTimer: false,
      includeMastered: false,
      enableAudio: false,
      timerSeconds: 0,
    };

    // Start session first
    store.startSession('test-deck', settings);

    // Generate grid
    const grid = store.generateGrid(mockCards, settings);

    // Check that we have 9 cards (3 cards * 3 sides each)
    expect(grid).toHaveLength(9);

    // Check that we have cards for each side
    const sideACards = grid.filter(card => card.displaySides[0] === 'side_a');
    const sideBCards = grid.filter(card => card.displaySides[0] === 'side_b');
    const sideCCards = grid.filter(card => card.displaySides[0] === 'side_c');

    expect(sideACards).toHaveLength(3);
    expect(sideBCards).toHaveLength(3);
    expect(sideCCards).toHaveLength(3);

    // Check that side_c cards have Chinese character content
    sideCCards.forEach(card => {
      expect(card.content).toBeTruthy();
      // The content should be one of the Chinese characters
      expect(['你', '好', '请']).toContain(card.content);
    });

    // Check that all cards with the same groupId have different content
    const group0Cards = grid.filter(card => card.groupId === 'group-0');
    if (group0Cards.length === 3) {
      const contents = group0Cards.map(card => card.content);
      expect(contents).toContain('you'); // side_a
      expect(contents).toContain('nǐ');  // side_b
      expect(contents).toContain('你');  // side_c
    }
  });

  it('should correctly validate three-way matches', () => {
    const store = useMatchSessionStore.getState();

    const settings: MatchSettings = {
      gridSize: { rows: 3, cols: 3 },
      matchType: 'three_way',
      cardSides: [
        { sides: ['side_a'], label: 'English', count: 3 },
        { sides: ['side_b'], label: 'Pinyin', count: 3 },
        { sides: ['side_c'], label: 'Characters', count: 3 },
      ],
      enableTimer: false,
      includeMastered: false,
      enableAudio: false,
      timerSeconds: 0,
    };

    store.startSession('test-deck', settings);
    const grid = store.generateGrid(mockCards, settings);

    // Find cards that should match (same groupId)
    const group0Cards = grid.filter(card => card.groupId === 'group-0').slice(0, 3);

    // Select all three cards from the same group
    group0Cards.forEach(card => {
      store.selectCard(card.id);
    });

    // Process the match
    const result = store.processMatch();

    // Should be a valid match
    expect(result.isMatch).toBe(true);
    expect(result.matchedCards).toHaveLength(3);
  });

  it('should not match when only 2 cards selected in three-way mode', () => {
    const store = useMatchSessionStore.getState();

    const settings: MatchSettings = {
      gridSize: { rows: 3, cols: 3 },
      matchType: 'three_way',
      cardSides: [
        { sides: ['side_a'], label: 'English', count: 3 },
        { sides: ['side_b'], label: 'Pinyin', count: 3 },
        { sides: ['side_c'], label: 'Characters', count: 3 },
      ],
      enableTimer: false,
      includeMastered: false,
      enableAudio: false,
      timerSeconds: 0,
    };

    store.startSession('test-deck', settings);
    const grid = store.generateGrid(mockCards, settings);

    // Find cards that should match (same groupId)
    const group0Cards = grid.filter(card => card.groupId === 'group-0').slice(0, 2);

    // Select only two cards from the same group
    group0Cards.forEach(card => {
      store.selectCard(card.id);
    });

    // Process the match
    const result = store.processMatch();

    // Should not be a valid match (need 3 cards for three-way)
    expect(result.isMatch).toBe(false);
  });

  it('should handle custom mode with side_c configuration', () => {
    const store = useMatchSessionStore.getState();

    const settings: MatchSettings = {
      gridSize: { rows: 3, cols: 3 },
      matchType: 'custom',
      cardSides: [
        { sides: ['side_a'], label: 'English', count: 3 },
        { sides: ['side_c'], label: 'Characters', count: 3 },
      ],
      enableTimer: false,
      includeMastered: false,
      enableAudio: false,
      timerSeconds: 0,
    };

    // Start session first
    store.startSession('test-deck', settings);

    // Generate grid
    const grid = store.generateGrid(mockCards, settings);

    // Should have cards for side_a and side_c only
    const sideACards = grid.filter(card => card.displaySides[0] === 'side_a');
    const sideCCards = grid.filter(card => card.displaySides[0] === 'side_c');
    const sideBCards = grid.filter(card => card.displaySides[0] === 'side_b');

    expect(sideACards.length).toBeGreaterThan(0);
    expect(sideCCards.length).toBeGreaterThan(0);
    expect(sideBCards).toHaveLength(0); // No side_b cards in custom mode

    // Check that side_c cards have Chinese character content
    sideCCards.forEach(card => {
      expect(card.content).toBeTruthy();
      expect(['你', '好', '请']).toContain(card.content);
    });
  });
});