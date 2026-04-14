import { describe, it, expect } from 'vitest';
import { QuestionGenerator } from '@/services/questionGenerator';
import { shouldShowRepeatFreeText } from '@/utils/learnResults';
import type { Card, LearnModeSettings } from '@/types';

const cards: Card[] = Array.from({ length: 4 }, (_, i) => ({
  idx: i,
  name: `card-${i}`,
  side_a: `front-${i}`,
  side_b: `back-${i}`,
  level: 1,
}));

describe('Results → Repeat with free text mode', () => {
  describe('shouldShowRepeatFreeText gate', () => {
    const baseSettings: LearnModeSettings = {
      questionTypes: ['multiple_choice'],
      questionTypeMix: 'multiple_choice',
      adaptiveDifficulty: false,
      cardsPerRound: 4,
      masteryThreshold: 3,
      schedulingAlgorithm: 'smart_spaced',
      aggressiveness: 'balanced',
      minSpacing: 0,
      maxSpacing: 0,
      clusterLimit: 0,
      progressRatio: 0,
      difficultyWeight: 0,
      questionSides: ['side_a'],
      answerSides: ['side_b'],
      frontSides: ['side_a'],
      backSides: ['side_b'],
      enableTimer: false,
      enableAudio: false,
      randomize: false,
      progressionMode: 'sequential',
      timerSeconds: 30,
    };

    it('shows button when MC-only settings + every card passed in one round', () => {
      expect(
        shouldShowRepeatFreeText({
          settings: baseSettings,
          deckCardCount: 4,
          passedCardIndices: [0, 1, 2, 3],
          previouslyExcludedIndices: [],
        })
      ).toBe(true);
    });

    it('shows button when cumulative passes across retry rounds cover the deck', () => {
      expect(
        shouldShowRepeatFreeText({
          settings: baseSettings,
          deckCardCount: 4,
          passedCardIndices: [2, 3],
          previouslyExcludedIndices: [0, 1],
        })
      ).toBe(true);
    });

    it('hides button when any card is still unpassed', () => {
      expect(
        shouldShowRepeatFreeText({
          settings: baseSettings,
          deckCardCount: 4,
          passedCardIndices: [0, 1, 2],
          previouslyExcludedIndices: [],
        })
      ).toBe(false);
    });

    it('hides button when the session was NOT multiple-choice-only', () => {
      expect(
        shouldShowRepeatFreeText({
          settings: { ...baseSettings, questionTypeMix: 'auto', questionTypes: ['multiple_choice', 'free_text'] },
          deckCardCount: 4,
          passedCardIndices: [0, 1, 2, 3],
          previouslyExcludedIndices: [],
        })
      ).toBe(false);
    });

    it('recognizes questionTypeMix=multiple_choice even if questionTypes omitted', () => {
      expect(
        shouldShowRepeatFreeText({
          settings: { ...baseSettings, questionTypes: undefined as unknown as LearnModeSettings['questionTypes'] },
          deckCardCount: 4,
          passedCardIndices: [0, 1, 2, 3],
          previouslyExcludedIndices: [],
        })
      ).toBe(true);
    });
  });

  describe('QuestionGenerator serves free_text with flipped settings', () => {
    it('yields only free_text questions when questionTypeMix=free_text', () => {
      const questions = QuestionGenerator.generateQuestions(
        cards,
        {
          questionTypes: ['free_text'],
          questionTypeMix: 'free_text',
          frontSides: ['side_a'],
          backSides: ['side_b'],
          difficulty: 1,
          excludeCards: new Set(),
          forceMultipleChoice: false,
        },
        [],
        cards
      );

      expect(questions).toHaveLength(cards.length);
      for (const q of questions) {
        expect(q.type).toBe('free_text');
      }
    });

    it('yields only multiple_choice when mix=multiple_choice (the state before the flip)', () => {
      const questions = QuestionGenerator.generateQuestions(
        cards,
        {
          questionTypes: ['multiple_choice'],
          questionTypeMix: 'multiple_choice',
          frontSides: ['side_a'],
          backSides: ['side_b'],
          difficulty: 1,
          excludeCards: new Set(),
          forceMultipleChoice: false,
        },
        [],
        cards
      );

      for (const q of questions) {
        expect(q.type).toBe('multiple_choice');
      }
    });

    it('regression: setting only questionTypes=[free_text] while mix stays multiple_choice yields MC (why we must flip both)', () => {
      const questions = QuestionGenerator.generateQuestions(
        cards,
        {
          questionTypes: ['free_text'],
          questionTypeMix: 'multiple_choice',
          frontSides: ['side_a'],
          backSides: ['side_b'],
          difficulty: 1,
          excludeCards: new Set(),
          forceMultipleChoice: false,
        },
        [],
        cards
      );

      for (const q of questions) {
        expect(q.type).toBe('multiple_choice');
      }
    });
  });
});
