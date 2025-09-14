import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Deck, SessionState, FlashcardsSettings } from '@/types';
import { loadAllDecks } from '@/utils/deckLoader';

interface DeckStore {
  decks: Deck[];
  activeDeck: Deck | null;
  currentSession: SessionState | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadDecks: () => Promise<void>;
  selectDeck: (deckId: string) => void;
  importDeck: (jsonPath: string) => Promise<void>;

  // Session management
  startSession: (deckId: string, mode: SessionState['mode'], settings: FlashcardsSettings) => void;
  updateSessionProgress: (correct: boolean, cardIdx: number) => void;
  endSession: () => void;

  // Card navigation
  nextCard: () => void;
  previousCard: () => void;
  shuffleCards: () => void;
}

export const useDeckStore = create<DeckStore>()(
  persist(
    (set, get) => ({
      decks: [],
      activeDeck: null,
      currentSession: null,
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
        }
      },

      selectDeck: (deckId: string) => {
        const deck = get().decks.find(d => d.id === deckId);
        set({ activeDeck: deck || null });
      },

      importDeck: async (jsonPath: string) => {
        // Future feature: Import deck from file system or URL
        // This enables deck sharing functionality
      },

      startSession: (deckId: string, mode: SessionState['mode'], settings: FlashcardsSettings) => {
        const deck = get().decks.find(d => d.id === deckId);
        if (!deck) return;

        set({
          activeDeck: deck,
          currentSession: {
            mode,
            deckId,
            startTime: new Date(),
            currentCardIndex: 0,
            correctCount: 0,
            incorrectCount: 0,
            missedCards: [],
            settings,
          }
        });
      },

      updateSessionProgress: (correct: boolean, cardIdx: number) => {
        const session = get().currentSession;
        if (!session) return;

        set({
          currentSession: {
            ...session,
            correctCount: correct ? session.correctCount + 1 : session.correctCount,
            incorrectCount: !correct ? session.incorrectCount + 1 : session.incorrectCount,
            missedCards: !correct ? [...session.missedCards, cardIdx] : session.missedCards,
          }
        });
      },

      endSession: () => {
        set({ currentSession: null });
      },

      nextCard: () => {
        const session = get().currentSession;
        const deck = get().activeDeck;
        if (!session || !deck) return;

        const nextIndex = session.currentCardIndex + 1;
        if (nextIndex < deck.content.length) {
          set({
            currentSession: {
              ...session,
              currentCardIndex: nextIndex,
            }
          });
        }
      },

      previousCard: () => {
        const session = get().currentSession;
        if (!session) return;

        const prevIndex = session.currentCardIndex - 1;
        if (prevIndex >= 0) {
          set({
            currentSession: {
              ...session,
              currentCardIndex: prevIndex,
            }
          });
        }
      },

      shuffleCards: () => {
        const deck = get().activeDeck;
        if (!deck) return;

        const shuffled = [...deck.content].sort(() => Math.random() - 0.5);
        set({
          activeDeck: {
            ...deck,
            content: shuffled,
          }
        });
      },
    }),
    {
      name: 'deck-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist deck metadata, not full content
        decks: state.decks.map(d => ({
          id: d.id,
          metadata: d.metadata,
        })) as any,
      }),
    }
  )
);