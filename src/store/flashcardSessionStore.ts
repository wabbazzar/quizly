import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FlashcardSession {
  deckId: string;
  currentCardIndex: number;
  progress: { [key: number]: 'correct' | 'incorrect' | null };
  frontSides: string[];
  backSides: string[];
  lastAccessed: number;
}

interface FlashcardSessionStore {
  sessions: Map<string, FlashcardSession>;

  getSession: (deckId: string) => FlashcardSession | undefined;
  saveSession: (session: FlashcardSession) => void;
  clearSession: (deckId: string) => void;
  clearOldSessions: () => void;
}

const DEFAULT_FRONT_SIDES = ['side_a'];
const DEFAULT_BACK_SIDES = ['side_b'];
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
        set((state) => {
          const newSessions = new Map(state.sessions);
          newSessions.set(session.deckId, {
            ...session,
            lastAccessed: Date.now()
          });
          return { sessions: newSessions };
        });
      },

      clearSession: (deckId: string) => {
        set((state) => {
          const newSessions = new Map(state.sessions);
          newSessions.delete(deckId);
          return { sessions: newSessions };
        });
      },

      clearOldSessions: () => {
        set((state) => {
          const newSessions = new Map();
          const now = Date.now();

          state.sessions.forEach((session, deckId) => {
            if (now - session.lastAccessed <= SESSION_EXPIRY_MS) {
              newSessions.set(deckId, session);
            }
          });

          return { sessions: newSessions };
        });
      }
    }),
    {
      name: 'flashcard-session-store',
      // Custom storage to handle Map serialization
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;

          const { state } = JSON.parse(str);
          return {
            state: {
              ...state,
              sessions: new Map(state.sessions || [])
            }
          };
        },
        setItem: (name, value) => {
          const { state } = value;
          const serialized = {
            state: {
              ...state,
              sessions: Array.from(state.sessions.entries())
            }
          };
          localStorage.setItem(name, JSON.stringify(serialized));
        },
        removeItem: (name) => localStorage.removeItem(name)
      }
    }
  )
);

export { DEFAULT_FRONT_SIDES, DEFAULT_BACK_SIDES };