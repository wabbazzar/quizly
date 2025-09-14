import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Deck } from '@/types';
import { loadAllDecks } from '@/utils/deckLoader';

interface DeckStore {
  decks: Deck[];
  activeDeck: Deck | null;
  isLoading: boolean;
  error: string | null;

  loadDecks: () => Promise<void>;
  selectDeck: (deckId: string) => void;
  importDeck: (jsonData: string) => Promise<void>;
  clearError: () => void;
}

export const useDeckStore = create<DeckStore>()(
  persist(
    (set, get) => ({
      decks: [],
      activeDeck: null,
      isLoading: false,
      error: null,

      loadDecks: async () => {
        set({ isLoading: true, error: null });
        try {
          const loadedDecks = await loadAllDecks();
          set({ decks: loadedDecks, isLoading: false });
        } catch (error) {
          set({
            error: 'Failed to load decks',
            isLoading: false
          });
          console.error('Error loading decks:', error);
        }
      },

      selectDeck: (deckId: string) => {
        const deck = get().decks.find(d => d.id === deckId);
        set({ activeDeck: deck || null });
      },

      importDeck: async (jsonData: string) => {
        try {
          const deck = JSON.parse(jsonData) as Deck;
          // Validate deck structure
          if (!deck.id || !deck.metadata || !deck.content) {
            throw new Error('Invalid deck format');
          }
          set(state => ({
            decks: [...state.decks, deck]
          }));
        } catch (error) {
          set({ error: 'Failed to import deck' });
          console.error('Error importing deck:', error);
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'deck-store',
      partialize: (state) => ({
        // Only persist deck metadata, not full content
        decks: state.decks.map(d => ({
          id: d.id,
          metadata: d.metadata,
        })),
      }),
    }
  )
);