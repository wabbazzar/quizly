import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FlashcardsSettings, LearnModeSettings, ModeSettings } from '@/types';

interface UnifiedSettingsStore {
  // Settings by deck and mode
  flashcardsSettings: Record<string, FlashcardsSettings>;
  learnSettings: Record<string, LearnModeSettings>;
  matchSettings: Record<string, ModeSettings>;
  testSettings: Record<string, ModeSettings>;

  // Preset selections per deck and mode
  presetSelections: Record<string, { [mode: string]: string }>;

  // Actions
  getSettingsForMode: (deckId: string, mode: string) => ModeSettings | FlashcardsSettings | LearnModeSettings;
  updateSettings: (deckId: string, mode: string, settings: ModeSettings | FlashcardsSettings | LearnModeSettings) => void;
  applyPreset: (deckId: string, mode: string, presetId: string) => void;
  getSettings: (key: string) => any;
  saveSettings: (key: string, settings: any) => void;
  migrateOldSettings: () => void;
}

// Default settings for each mode
const getDefaultSettings = (mode: string): any => {
  const defaults: Record<string, any> = {
    flashcards: {
      frontSides: ['side_a'],
      backSides: ['side_b'],
      progressionMode: 'shuffle' as const,
      includeMastered: true,
      enableTimer: false,
      timerSeconds: 30,
      enableAudio: false,
      groupSides: {}
    },
    learn: {
      questionSides: ['side_a'],
      answerSides: ['side_b'],
      cardsPerRound: 10,
      randomize: true,
      enableTimer: false,
      timerSeconds: 30,
      enableAudio: false,
      questionTypeMix: 'auto' as const,
      progressionMode: 'sequential' as const,
      schedulingAlgorithm: 'smart_spaced' as const,
      masteryThreshold: 3,
      progressiveLearning: 'spaced' as const,
      progressiveLearningSpacing: 3,
      questionTypes: ['multiple_choice', 'free_text'],
      adaptiveDifficulty: false,
      frontSides: ['side_a'],
      backSides: ['side_b']
    },
    match: {
      frontSides: ['side_a'],
      backSides: ['side_b'],
      cardsPerRound: 12,
      enableTimer: true,
      timerSeconds: 60,
      enableAudio: true,
      randomize: true,
      progressionMode: 'random' as const
    },
    test: {
      frontSides: ['side_a'],
      backSides: ['side_b'],
      cardsPerRound: 20,
      enableTimer: false,
      timerSeconds: 1800,
      enableAudio: false,
      randomize: true,
      progressionMode: 'sequential' as const
    }
  };

  return defaults[mode] || defaults.flashcards;
};

export const useSettingsStore = create<UnifiedSettingsStore>()(
  persist(
    (set, get) => ({
      flashcardsSettings: {},
      learnSettings: {},
      matchSettings: {},
      testSettings: {},
      presetSelections: {},

      getSettingsForMode: (deckId: string, mode: string) => {
        const state = get();

        switch (mode) {
          case 'flashcards':
            return state.flashcardsSettings[deckId] || getDefaultSettings('flashcards');
          case 'learn':
            return state.learnSettings[deckId] || getDefaultSettings('learn');
          case 'match':
            return state.matchSettings[deckId] || getDefaultSettings('match');
          case 'test':
            return state.testSettings[deckId] || getDefaultSettings('test');
          default:
            return getDefaultSettings(mode);
        }
      },

      updateSettings: (deckId: string, mode: string, settings: any) => {
        set((state) => {
          switch (mode) {
            case 'flashcards':
              return {
                ...state,
                flashcardsSettings: {
                  ...state.flashcardsSettings,
                  [deckId]: settings
                }
              };
            case 'learn':
              return {
                ...state,
                learnSettings: {
                  ...state.learnSettings,
                  [deckId]: settings as LearnModeSettings
                }
              };
            case 'match':
              return {
                ...state,
                matchSettings: {
                  ...state.matchSettings,
                  [deckId]: settings
                }
              };
            case 'test':
              return {
                ...state,
                testSettings: {
                  ...state.testSettings,
                  [deckId]: settings
                }
              };
            default:
              return state;
          }
        });
      },

      applyPreset: (deckId: string, mode: string, presetId: string) => {
        set((state) => ({
          ...state,
          presetSelections: {
            ...state.presetSelections,
            [deckId]: {
              ...state.presetSelections[deckId],
              [mode]: presetId
            }
          }
        }));
      },

      getSettings: (key: string) => {
        // Generic getter for backwards compatibility
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch {
            return null;
          }
        }
        return null;
      },

      saveSettings: (key: string, settings: any) => {
        // Generic setter for backwards compatibility
        localStorage.setItem(key, JSON.stringify(settings));
      },

      migrateOldSettings: () => {
        const migrationVersion = '1.0.0';
        const existingVersion = localStorage.getItem('settings-migration-version');

        if (existingVersion === migrationVersion) {
          return; // Already migrated
        }

        try {
          // Migrate flashcards settings
          const oldFlashcardsSettings = localStorage.getItem('flashcards-settings');
          if (oldFlashcardsSettings) {
            const parsed = JSON.parse(oldFlashcardsSettings);
            set((state) => ({
              ...state,
              flashcardsSettings: parsed
            }));
          }

          // Migrate learn settings
          const oldLearnSettings = localStorage.getItem('learn-settings');
          if (oldLearnSettings) {
            const parsed = JSON.parse(oldLearnSettings);
            set((state) => ({
              ...state,
              learnSettings: parsed
            }));
          }

          // Mark migration complete
          localStorage.setItem('settings-migration-version', migrationVersion);

          // Clean up old keys after successful migration
          localStorage.removeItem('flashcards-settings');
          localStorage.removeItem('learn-settings');

        } catch (error) {
          console.error('Settings migration failed:', error);
          // Don't mark as migrated, will retry next time
        }
      }
    }),
    {
      name: 'unified-settings-store',
      partialize: (state) => ({
        flashcardsSettings: state.flashcardsSettings,
        learnSettings: state.learnSettings,
        matchSettings: state.matchSettings,
        testSettings: state.testSettings,
        presetSelections: state.presetSelections
      }),
      onRehydrateStorage: () => (state) => {
        // Run migration after rehydration
        state?.migrateOldSettings();
      }
    }
  )
);