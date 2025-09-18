import { PresetDefinition } from '@/components/modals/UnifiedSettings';

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
          backSides: [sides[1] || 'side_b']
        };
      }
      if (mode === 'learn') {
        return {
          questionSides: [sides[0] || 'side_a'],
          answerSides: [sides[1] || 'side_b'],
          questionTypeMix: 'auto' as const
        };
      }
      if (mode === 'match') {
        return {
          frontSides: [sides[0] || 'side_a'],
          backSides: [sides[1] || 'side_b']
        };
      }
      return {};
    }
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
          backSides: [sides[0] || 'side_a']
        };
      }
      if (mode === 'learn') {
        return {
          questionSides: [sides[1] || 'side_b'],
          answerSides: [sides[0] || 'side_a'],
          questionTypeMix: 'auto' as const
        };
      }
      return {};
    }
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
          backSides: sides.slice(1).length > 0 ? sides.slice(1) : ['side_b']
        };
      }
      if (mode === 'learn') {
        return {
          questionSides: [sides[0] || 'side_a'],
          answerSides: sides.slice(1).length > 0 ? sides.slice(1) : ['side_b'],
          questionTypeMix: 'multiple_choice' as const,
          cardsPerRound: 20
        };
      }
      return {};
    }
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
          frontSides: sides.slice(0, frontCount).length > 0 ? sides.slice(0, frontCount) : ['side_a'],
          backSides: sides.slice(frontCount).length > 0 ? sides.slice(frontCount) : ['side_b']
        };
      }
      if (mode === 'learn') {
        const questions = sides.filter((_, i) => i % 2 === 0);
        const answers = sides.filter((_, i) => i % 2 === 1);
        return {
          questionSides: questions.length > 0 ? questions : ['side_a'],
          answerSides: answers.length > 0 ? answers : ['side_b'],
          questionTypeMix: 'mixed' as const,
          randomize: true
        };
      }
      return {};
    }
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
          progressionMode: 'sequential' as const
        };
      }
      return {};
    }
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
          progressionMode: 'random' as const
        };
      }
      return {};
    }
  }
];