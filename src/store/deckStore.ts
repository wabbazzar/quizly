import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Deck } from '@/types';
import { loadAllDecks } from '@/utils/deckLoader';

interface MasteredCardsData {
  [deckId: string]: number[]; // Array of card indices that are mastered
}

interface DeckStore {
  decks: Deck[];
  activeDeck: Deck | null;
  currentDeck: Deck | null;
  currentDeckId?: string;
  isLoading: boolean;
  error: string | null;
  masteredCards: MasteredCardsData;
  shuffleMasteredCardsBack: boolean;

  loadDecks: () => Promise<void>;
  loadDeck: (deckId: string) => Promise<void>;
  selectDeck: (deckId: string) => void;
  importDeck: (jsonData: string) => Promise<void>;
  clearError: () => void;
  rehydrateCurrentDeck: () => Promise<void>;
  toggleCardMastered: (deckId: string, cardIdx: number) => void;
  setMasteredCards: (deckId: string, cardIndices: number[]) => void;
  getMasteredCardsForDeck: (deckId: string) => number[];
  toggleShuffleMastered: () => void;
}

export const useDeckStore = create<DeckStore>()(
  persist(
    (set, get) => ({
      decks: [],
      activeDeck: null,
      currentDeck: null,
      isLoading: false,
      error: null,
      masteredCards: {},
      shuffleMasteredCardsBack: false,

      loadDecks: async () => {
        set({ isLoading: true, error: null });
        try {
          const loadedDecks = await loadAllDecks();
          set({ decks: loadedDecks, isLoading: false });
        } catch (error) {
          set({
            error: 'Failed to load decks',
            isLoading: false,
          });
          console.error('Error loading decks:', error);
        }
      },

      loadDeck: async (deckId: string) => {
        set({ isLoading: true, error: null, currentDeckId: deckId });
        try {
          // First check if deck is already loaded
          let deck = get().decks.find(d => d.id === deckId);

          if (!deck) {
            // If not in memory, load all decks and find the one we need
            const loadedDecks = await loadAllDecks();
            deck = loadedDecks.find(d => d.id === deckId);

            if (deck) {
              set({
                decks: loadedDecks,
                currentDeck: deck,
                currentDeckId: deckId,
                isLoading: false,
              });
            } else {
              set({ error: 'Deck not found', isLoading: false, currentDeckId: undefined });
            }
          } else {
            set({ currentDeck: deck, currentDeckId: deckId, isLoading: false });
          }
        } catch (error) {
          set({
            error: 'Failed to load deck',
            isLoading: false,
            currentDeckId: undefined,
          });
          console.error('Error loading deck:', error);
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
            decks: [...state.decks, deck],
          }));
        } catch (error) {
          set({ error: 'Failed to import deck' });
          console.error('Error importing deck:', error);
        }
      },

      clearError: () => set({ error: null }),

      rehydrateCurrentDeck: async () => {
        const currentDeckId = get().currentDeckId;
        if (currentDeckId && !get().currentDeck) {
          await get().loadDeck(currentDeckId);
        }
      },

      toggleCardMastered: (deckId: string, cardIdx: number) => {
        set(state => {
          const currentMastered = state.masteredCards[deckId] || [];
          const isCurrentlyMastered = currentMastered.includes(cardIdx);

          const newMastered = isCurrentlyMastered
            ? currentMastered.filter(idx => idx !== cardIdx)
            : [...currentMastered, cardIdx];

          return {
            masteredCards: {
              ...state.masteredCards,
              [deckId]: newMastered,
            },
          };
        });
      },

      setMasteredCards: (deckId: string, cardIndices: number[]) => {
        set(state => ({
          masteredCards: {
            ...state.masteredCards,
            [deckId]: cardIndices,
          },
        }));
      },

      getMasteredCardsForDeck: (deckId: string) => {
        return get().masteredCards[deckId] || [];
      },

      toggleShuffleMastered: () => {
        set(state => ({
          shuffleMasteredCardsBack: !state.shuffleMasteredCardsBack,
        }));
      },
    }),
    {
      name: 'deck-store',
      partialize: state => ({
        // Persist the current deck ID so we can reload it on refresh
        currentDeckId: state.currentDeck?.id,
        masteredCards: state.masteredCards,
        shuffleMasteredCardsBack: state.shuffleMasteredCardsBack,
      }),
      onRehydrateStorage: () => state => {
        // After rehydration, if we have a currentDeckId, reload that deck
        if (state?.currentDeckId) {
          state.loadDeck(state.currentDeckId);
        }
      },
    }
  )
);
