import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DeckFamily } from '@/types';
import { loadFamilies } from '@/utils/familyLoader';

interface DeckVisibilityStore {
  hiddenDeckIds: string[];
  families: DeckFamily[];
  familiesLoaded: boolean;

  loadFamilies: () => Promise<void>;
  toggleDeckVisibility: (deckId: string) => void;
  hideAllInFamily: (familyId: string, deckIds: string[]) => void;
  showAllInFamily: (familyId: string, deckIds: string[]) => void;
  isDeckHidden: (deckId: string) => boolean;
}

export const useDeckVisibilityStore = create<DeckVisibilityStore>()(
  persist(
    (set, get) => ({
      hiddenDeckIds: [],
      families: [],
      familiesLoaded: false,

      loadFamilies: async () => {
        if (get().familiesLoaded) return;
        const families = await loadFamilies();
        set({ families, familiesLoaded: true });
      },

      toggleDeckVisibility: (deckId: string) => {
        set(state => {
          const isHidden = state.hiddenDeckIds.includes(deckId);
          return {
            hiddenDeckIds: isHidden
              ? state.hiddenDeckIds.filter(id => id !== deckId)
              : [...state.hiddenDeckIds, deckId],
          };
        });
      },

      hideAllInFamily: (_familyId: string, deckIds: string[]) => {
        set(state => {
          const newHidden = new Set(state.hiddenDeckIds);
          deckIds.forEach(id => newHidden.add(id));
          return { hiddenDeckIds: Array.from(newHidden) };
        });
      },

      showAllInFamily: (_familyId: string, deckIds: string[]) => {
        set(state => ({
          hiddenDeckIds: state.hiddenDeckIds.filter(id => !deckIds.includes(id)),
        }));
      },

      isDeckHidden: (deckId: string) => {
        return get().hiddenDeckIds.includes(deckId);
      },
    }),
    {
      name: 'deck-visibility-store',
      partialize: state => ({
        hiddenDeckIds: state.hiddenDeckIds,
      }),
    }
  )
);
