import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PinnedDecksStore {
  pinnedDeckIds: string[];

  togglePin: (deckId: string) => void;
  isPinned: (deckId: string) => boolean;
}

export const usePinnedDecksStore = create<PinnedDecksStore>()(
  persist(
    (set, get) => ({
      pinnedDeckIds: [],

      togglePin: (deckId: string) => {
        set(state => {
          const isPinned = state.pinnedDeckIds.includes(deckId);
          return {
            pinnedDeckIds: isPinned
              ? state.pinnedDeckIds.filter(id => id !== deckId)
              : [...state.pinnedDeckIds, deckId],
          };
        });
      },

      isPinned: (deckId: string) => {
        return get().pinnedDeckIds.includes(deckId);
      },
    }),
    {
      name: 'pinned-decks-store',
      partialize: state => ({
        pinnedDeckIds: state.pinnedDeckIds,
      }),
    }
  )
);
