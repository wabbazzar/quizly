import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCardMasteryStore } from './cardMasteryStore';

export interface DeckProgress {
  overall: number;
  byMode: Record<string, number>;
  lastStudied?: Date;
  totalCardsStudied: number;
  streakDays: number;
  masteredCards: number;
  totalCards: number;
}

interface ProgressStore {
  progress: Record<string, DeckProgress>;

  // Actions
  updateDeckProgress: (
    deckId: string,
    mode: string,
    cardsStudied: number,
    correctCount: number,
    totalCards: number
  ) => void;
  getDeckProgress: (deckId: string) => DeckProgress;
  resetDeckProgress: (deckId: string) => void;
  clearAllProgress: () => void;
}

const defaultProgress: DeckProgress = {
  overall: 0,
  byMode: {
    flashcards: 0,
    learn: 0,
    match: 0,
    test: 0,
  },
  lastStudied: undefined,
  totalCardsStudied: 0,
  streakDays: 0,
  masteredCards: 0,
  totalCards: 0,
};

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      progress: {},

      updateDeckProgress: (
        deckId: string,
        _mode: string,
        cardsStudied: number,
        _correctCount: number,
        totalCards: number
      ) => {
        set(state => {
          const existingProgress = state.progress[deckId] || { ...defaultProgress };

          // Get mastery data from the card mastery store
          // Dynamic import to avoid circular dependency
          const { useCardMasteryStore } = require('./cardMasteryStore');
          const cardMasteryStore = useCardMasteryStore.getState();
          const masteredCards = cardMasteryStore.getMasteredCards(deckId);
          const masteryPercentage = cardMasteryStore.getDeckMasteryPercentage(deckId);

          // For all modes, show mastery percentage instead of session performance
          // This provides a unified view of progress across all indicators
          const updatedByMode = {
            ...existingProgress.byMode,
            // All modes now show the same mastery percentage
            flashcards: masteryPercentage,
            learn: masteryPercentage,
            match: masteryPercentage,
            test: masteryPercentage,
          };

          // Use mastery percentage as overall progress if available
          const overall =
            masteryPercentage > 0
              ? masteryPercentage
              : Math.round(
                  Object.values(updatedByMode).reduce((sum, progress) => sum + progress, 0) /
                    Object.values(updatedByMode).length
                );

          // Check for streak continuation
          const lastStudied = existingProgress.lastStudied
            ? new Date(existingProgress.lastStudied)
            : null;
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          let streakDays = existingProgress.streakDays || 0;
          if (lastStudied) {
            const lastStudiedDate = new Date(lastStudied);
            lastStudiedDate.setHours(0, 0, 0, 0);

            const daysDiff = Math.floor(
              (today.getTime() - lastStudiedDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysDiff === 0) {
              // Same day, keep streak
              streakDays = existingProgress.streakDays;
            } else if (daysDiff === 1) {
              // Next day, increment streak
              streakDays = existingProgress.streakDays + 1;
            } else {
              // Streak broken, restart at 1
              streakDays = 1;
            }
          } else {
            // First time studying
            streakDays = 1;
          }

          return {
            progress: {
              ...state.progress,
              [deckId]: {
                overall,
                byMode: updatedByMode,
                lastStudied: new Date(),
                totalCardsStudied: existingProgress.totalCardsStudied + cardsStudied,
                streakDays,
                masteredCards: masteredCards.length,
                totalCards: totalCards,
              },
            },
          };
        });
      },

      getDeckProgress: (deckId: string) => {
        const progress = get().progress[deckId];

        // Get mastery data from the card mastery store
        const cardMasteryStore = useCardMasteryStore.getState();
        const masteredCards = cardMasteryStore.getMasteredCards(deckId);
        const masteryPercentage = cardMasteryStore.getDeckMasteryPercentage(deckId);

        if (!progress) {
          return {
            ...defaultProgress,
            masteredCards: masteredCards.length,
            overall: masteryPercentage,
            // Set all modes to show the mastery percentage
            byMode: {
              flashcards: masteryPercentage,
              learn: masteryPercentage,
              match: masteryPercentage,
              test: masteryPercentage,
            },
          };
        }

        // Use mastery percentage as the overall progress instead of mode averages
        // This gives a more accurate representation of deck completion
        const overall = masteryPercentage > 0 ? masteryPercentage : progress.overall;

        // Update all modes to show mastery percentage for consistency
        const unifiedByMode = {
          flashcards: masteryPercentage,
          learn: masteryPercentage,
          match: masteryPercentage,
          test: masteryPercentage,
        };

        // Convert stored date string back to Date object
        return {
          ...progress,
          overall,
          byMode: unifiedByMode,
          masteredCards: masteredCards.length,
          lastStudied: progress.lastStudied ? new Date(progress.lastStudied) : undefined,
        };
      },

      resetDeckProgress: (deckId: string) => {
        set(state => {
          const newProgress = { ...state.progress };
          delete newProgress[deckId];
          return { progress: newProgress };
        });
      },

      clearAllProgress: () => {
        set({ progress: {} });
      },
    }),
    {
      name: 'progress-store',
      // Ensure dates are properly serialized and deserialized
      partialize: state => ({
        progress: Object.entries(state.progress).reduce(
          (acc, [deckId, progress]) => ({
            ...acc,
            [deckId]: {
              ...progress,
              lastStudied: progress.lastStudied ? progress.lastStudied.toISOString() : undefined,
            },
          }),
          {}
        ),
      }),
      onRehydrateStorage: () => state => {
        // Convert ISO strings back to Date objects after rehydration
        if (state && state.progress) {
          Object.keys(state.progress).forEach(deckId => {
            const progress = state.progress[deckId];
            if (progress.lastStudied && typeof progress.lastStudied === 'string') {
              progress.lastStudied = new Date(progress.lastStudied);
            }
          });
        }
      },
    }
  )
);
