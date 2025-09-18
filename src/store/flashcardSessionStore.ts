import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FlashcardSession {
  deckId: string;
  currentCardIndex: number;
  progress: { [key: number]: 'correct' | 'incorrect' | null };
  frontSides: string[];
  backSides: string[];
  lastAccessed: number;
  roundNumber: number;
  cardOrder: number[]; // Current order of cards (for shuffling missed cards)
  startTime: number;
  isMissedCardsRound: boolean; // True if current round is missed cards only
  progressionMode?: 'sequential' | 'shuffle' | 'level'; // Card progression mode
  includeMastered?: boolean; // Whether to include mastered cards in the session
}

interface FlashcardSessionStore {
  sessions: Map<string, FlashcardSession>;

  getSession: (deckId: string) => FlashcardSession | undefined;
  saveSession: (session: FlashcardSession) => void;
  clearSession: (deckId: string) => void;
  clearOldSessions: () => void;
  startNewRound: (deckId: string, totalCards: number) => FlashcardSession;
  startMissedCardsRound: (deckId: string, missedCardIndices: number[]) => FlashcardSession;
  getMissedCardIndices: (session: FlashcardSession) => number[];
}

export const DEFAULT_FRONT_SIDES = ['side_a'];
export const DEFAULT_BACK_SIDES = ['side_b'];
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const useFlashcardSessionStore = create<FlashcardSessionStore>()(
  persist(
    (set, get) => ({
      sessions: new Map(),

      getSession: (deckId: string) => {
        const sessions = get().sessions;
        const session = sessions.get(deckId);

        if (session) {
          // Check if session is expired
          if (Date.now() - session.lastAccessed > SESSION_EXPIRY_MS) {
            get().clearSession(deckId);
            return undefined;
          }
          return session;
        }

        return undefined;
      },

      saveSession: (session: FlashcardSession) => {
        set(state => {
          const newSessions = new Map(state.sessions);
          newSessions.set(session.deckId, {
            ...session,
            lastAccessed: Date.now(),
          });
          return { sessions: newSessions };
        });
      },

      clearSession: (deckId: string) => {
        set(state => {
          const newSessions = new Map(state.sessions);
          newSessions.delete(deckId);
          return { sessions: newSessions };
        });
      },

      clearOldSessions: () => {
        set(state => {
          const newSessions = new Map();
          const now = Date.now();

          state.sessions.forEach((session, deckId) => {
            if (now - session.lastAccessed <= SESSION_EXPIRY_MS) {
              newSessions.set(deckId, session);
            }
          });

          return { sessions: newSessions };
        });
      },

      startNewRound: (deckId: string, totalCards: number) => {
        const existingSession = get().getSession(deckId);
        const newSession: FlashcardSession = {
          deckId,
          currentCardIndex: 0,
          progress: {},
          frontSides: existingSession?.frontSides || DEFAULT_FRONT_SIDES,
          backSides: existingSession?.backSides || DEFAULT_BACK_SIDES,
          lastAccessed: Date.now(),
          roundNumber: (existingSession?.roundNumber || 0) + 1,
          cardOrder: Array.from({ length: totalCards }, (_, i) => i),
          startTime: Date.now(),
          isMissedCardsRound: false,
          progressionMode: existingSession?.progressionMode || 'shuffle',
          includeMastered:
            existingSession?.includeMastered !== undefined ? existingSession.includeMastered : true,
        };

        get().saveSession(newSession);
        return newSession;
      },

      startMissedCardsRound: (deckId: string, missedCardIndices: number[]) => {
        const existingSession = get().getSession(deckId);

        // Shuffle the missed cards for variety
        const shuffled = [...missedCardIndices].sort(() => Math.random() - 0.5);

        const newSession: FlashcardSession = {
          deckId,
          currentCardIndex: 0,
          progress: {},
          frontSides: existingSession?.frontSides || DEFAULT_FRONT_SIDES,
          backSides: existingSession?.backSides || DEFAULT_BACK_SIDES,
          lastAccessed: Date.now(),
          roundNumber: (existingSession?.roundNumber || 0) + 1,
          cardOrder: shuffled,
          startTime: Date.now(),
          isMissedCardsRound: true,
          progressionMode: existingSession?.progressionMode || 'shuffle',
          includeMastered:
            existingSession?.includeMastered !== undefined ? existingSession.includeMastered : true,
        };

        get().saveSession(newSession);
        return newSession;
      },

      getMissedCardIndices: (session: FlashcardSession) => {
        const missedIndices: number[] = [];

        if (session.isMissedCardsRound) {
          // For missed cards round, check progress against the card order
          session.cardOrder.forEach((originalIndex, currentIndex) => {
            if (session.progress[currentIndex] === 'incorrect' || !session.progress[currentIndex]) {
              missedIndices.push(originalIndex);
            }
          });
        } else {
          // For regular round, check all cards
          Object.entries(session.progress).forEach(([index, status]) => {
            if (status === 'incorrect') {
              missedIndices.push(parseInt(index));
            }
          });
        }

        return missedIndices;
      },
    }),
    {
      name: 'flashcard-session-store',
      // Custom storage to handle Map serialization
      storage: {
        getItem: name => {
          const str = localStorage.getItem(name);
          if (!str) return null;

          const { state } = JSON.parse(str);
          return {
            state: {
              ...state,
              sessions: new Map(state.sessions || []),
            },
          };
        },
        setItem: (name, value) => {
          const { state } = value;
          const serialized = {
            state: {
              ...state,
              sessions: Array.from(state.sessions.entries()),
            },
          };
          localStorage.setItem(name, JSON.stringify(serialized));
        },
        removeItem: name => localStorage.removeItem(name),
      },
    }
  )
);
