import { PresetDefinition } from '@/components/modals/UnifiedSettings';

// For Learn mode we only drill the "core recall" sides and deliberately omit
// the trailing reference/context sides (description, example, usage notes,
// etc.). Those are useful for flashcards and reading but noisy when being
// quizzed. Rule: drop the last three sides, but always keep at least two.
// Example: [a, b, c, d, e, f, g] -> [a, b, c, d]
//          [a, b, c, d, e, f]    -> [a, b, c]
//          [a, b, c, d]          -> [a, b]  (clamp)
//          [a, b, c]             -> [a, b, c] (no trim possible)
const trimSidesForLearn = (sides: string[]): string[] => {
  if (sides.length <= 3) return sides;
  const trimmed = sides.slice(0, sides.length - 3);
  return trimmed.length >= 2 ? trimmed : sides.slice(0, 2);
};

export const UNIVERSAL_PRESETS: PresetDefinition[] = [
  {
    id: 'simple',
    label: 'Simple',
    shortLabel: 'A → B',
    description: 'First side to second side',
    tooltip: 'Show first side, answer with second side',
    supportedModes: ['flashcards', 'learn', 'match'],
    applyToMode: (mode, sides) => {
      if (mode === 'flashcards') {
        return {
          frontSides: [sides[0] || 'side_a'],
          backSides: [sides[1] || 'side_b'],
        };
      }
      if (mode === 'learn') {
        const learnSides = trimSidesForLearn(sides);
        return {
          questionSides: [learnSides[0] || 'side_a'],
          answerSides: [learnSides[1] || 'side_b'],
          questionTypes: ['free_text'],
          questionTypeMix: 'free_text' as const,
          cardsPerRound: 25,
          masteryThreshold: 2,
        };
      }
      if (mode === 'match') {
        return {
          frontSides: [sides[0] || 'side_a'],
          backSides: [sides[1] || 'side_b'],
        };
      }
      return {};
    },
  },
  {
    id: 'reverse',
    label: 'Reverse',
    shortLabel: 'B → A',
    description: 'Second side to first side',
    tooltip: 'Reverse the standard direction for learning',
    supportedModes: ['flashcards', 'learn'],
    applyToMode: (mode, sides) => {
      if (mode === 'flashcards') {
        return {
          frontSides: [sides[1] || 'side_b'],
          backSides: [sides[0] || 'side_a'],
        };
      }
      if (mode === 'learn') {
        const learnSides = trimSidesForLearn(sides);
        return {
          questionSides: [learnSides[1] || 'side_b'],
          answerSides: [learnSides[0] || 'side_a'],
          questionTypeMix: 'auto' as const,
        };
      }
      return {};
    },
  },
  {
    id: 'comprehensive',
    label: 'Complete',
    shortLabel: 'A → All',
    description: 'First side to all other sides',
    tooltip: 'Show all available information in answers',
    supportedModes: ['flashcards', 'learn'],
    applyToMode: (mode, sides) => {
      if (mode === 'flashcards') {
        return {
          frontSides: [sides[0] || 'side_a'],
          backSides: sides.slice(1).length > 0 ? sides.slice(1) : ['side_b'],
        };
      }
      if (mode === 'learn') {
        const learnSides = trimSidesForLearn(sides);
        const answers = learnSides.slice(1);
        return {
          questionSides: [learnSides[0] || 'side_a'],
          answerSides: answers.length > 0 ? answers : ['side_b'],
          questionTypes: ['multiple_choice'],
          questionTypeMix: 'multiple_choice' as const,
          cardsPerRound: 25,
          masteryThreshold: 2,
        };
      }
      return {};
    },
  },
  {
    id: 'multi',
    label: 'Multi',
    shortLabel: 'AB → CD',
    description: 'Multiple sides for comprehensive learning',
    tooltip: 'Show multiple pieces of information together',
    supportedModes: ['flashcards', 'learn'],
    applyToMode: (mode, sides) => {
      if (mode === 'flashcards') {
        const frontCount = Math.min(2, Math.floor(sides.length / 2));
        return {
          frontSides:
            sides.slice(0, frontCount).length > 0 ? sides.slice(0, frontCount) : ['side_a'],
          backSides: sides.slice(frontCount).length > 0 ? sides.slice(frontCount) : ['side_b'],
        };
      }
      if (mode === 'learn') {
        const learnSides = trimSidesForLearn(sides);
        const questions = learnSides.filter((_, i) => i % 2 === 0);
        const answers = learnSides.filter((_, i) => i % 2 === 1);
        return {
          questionSides: questions.length > 0 ? questions : ['side_a'],
          answerSides: answers.length > 0 ? answers : ['side_b'],
          questionTypeMix: 'mixed' as const,
          randomize: true,
        };
      }
      return {};
    },
  },
  {
    id: 'formal',
    label: 'Formal Test',
    shortLabel: 'Timed',
    description: 'Timed test with scoring',
    tooltip: 'Formal assessment with time limits and scoring',
    supportedModes: ['test'],
    applyToMode: (mode, sides) => {
      if (mode === 'test') {
        return {
          frontSides: [sides[0] || 'side_a'],
          backSides: [sides[1] || 'side_b'],
          enableTimer: true,
          timerSeconds: 1800, // 30 minutes
          randomize: false,
          progressionMode: 'sequential' as const,
        };
      }
      return {};
    },
  },
  {
    id: 'practice',
    label: 'Practice Test',
    shortLabel: 'Untimed',
    description: 'Untimed practice with immediate feedback',
    tooltip: 'Practice mode with immediate feedback and no time pressure',
    supportedModes: ['test'],
    applyToMode: (mode, sides) => {
      if (mode === 'test') {
        return {
          frontSides: [sides[0] || 'side_a'],
          backSides: [sides[1] || 'side_b'],
          enableTimer: false,
          timerSeconds: null,
          randomize: true,
          progressionMode: 'random' as const,
        };
      }
      return {};
    },
  },
];
