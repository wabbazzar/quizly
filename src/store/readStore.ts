import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ReadModeSettings } from '@/types';

interface ReadProgress {
  dialogueId: string;
  lineIndex: number;
  tokenIndex: number;
  completedTokens: Set<string>; // dialogueId:lineIndex:tokenIndex
  masteredTokens: Set<string>;
}

interface ReadSessionState {
  deckId: string;
  currentDialogueId: string | null;
  currentLineIndex: number;
  currentTokenIndex: number;
  showPinyin: boolean;
  showTranslation: boolean;
  correctCount: number;
  incorrectCount: number;
  startTime: number;
  responseStartTime: number;
  responseTimes: number[];
}

interface ReadStore {
  // Progress tracking
  progress: Record<string, ReadProgress>; // deckId -> progress

  // Current session
  session: ReadSessionState | null;

  // Settings
  settings: ReadModeSettings;

  // Actions
  initSession: (deckId: string, dialogueId: string) => void;
  setCurrentDialogue: (dialogueId: string) => void;
  setCurrentLine: (lineIndex: number) => void;
  setCurrentToken: (tokenIndex: number) => void;
  markTokenComplete: (dialogueId: string, lineIndex: number, tokenIndex: number) => void;
  markTokenMastered: (dialogueId: string, lineIndex: number, tokenIndex: number) => void;
  togglePinyin: () => void;
  toggleTranslation: () => void;
  updateSettings: (settings: Partial<ReadModeSettings>) => void;
  recordAnswer: (correct: boolean, responseTime: number) => void;
  clearSession: () => void;
  resetProgress: (deckId: string) => void;
  getProgress: (deckId: string) => ReadProgress | null;
}

const defaultSettings: ReadModeSettings = {
  answerType: 'free_text',
  checkMode: 'wait',
  translationDirection: { from: 'b', to: 'c' },  // pinyin → english
  optionsCount: 4,
  showPinyinDefault: false,
  multipleChoiceDifficulty: 'medium',
  unit: 'character',
  translationMode: 'sentence',
  accuracyThreshold: 70,
  showWordHints: true
};

export const useReadStore = create<ReadStore>()(
  persist(
    (set, get) => ({
      progress: {},
      session: null,
      settings: defaultSettings,

      initSession: (deckId: string, dialogueId: string) => {
        set(state => {
          console.log('Initializing session with showPinyinDefault:', state.settings.showPinyinDefault);
          return {
            session: {
              deckId,
              currentDialogueId: dialogueId,
              currentLineIndex: 0,
              currentTokenIndex: 0,
              showPinyin: state.settings.showPinyinDefault,
              showTranslation: false,
              correctCount: 0,
              incorrectCount: 0,
              startTime: Date.now(),
              responseStartTime: Date.now(),
              responseTimes: []
            }
          };
        });
      },

      setCurrentDialogue: (dialogueId: string) => {
        set(state => {
          if (!state.session) return state;

          // Save progress for current deck
          const deckId = state.session.deckId;
          const currentProgress = state.progress[deckId] || {
            dialogueId,
            lineIndex: 0,
            tokenIndex: 0,
            completedTokens: new Set(),
            masteredTokens: new Set()
          };

          return {
            progress: {
              ...state.progress,
              [deckId]: {
                ...currentProgress,
                dialogueId
              }
            },
            session: {
              ...state.session,
              currentDialogueId: dialogueId,
              currentLineIndex: 0,
              currentTokenIndex: 0
            }
          };
        });
      },

      setCurrentLine: (lineIndex: number) => {
        set(state => {
          if (!state.session) return state;

          const deckId = state.session.deckId;
          const dialogueId = state.session.currentDialogueId || '';
          const currentProgress = state.progress[deckId] || {
            dialogueId,
            lineIndex: 0,
            tokenIndex: 0,
            completedTokens: new Set(),
            masteredTokens: new Set()
          };

          return {
            progress: {
              ...state.progress,
              [deckId]: {
                ...currentProgress,
                lineIndex
              }
            },
            session: {
              ...state.session,
              currentLineIndex: lineIndex,
              currentTokenIndex: 0
            }
          };
        });
      },

      setCurrentToken: (tokenIndex: number) => {
        set(state => {
          if (!state.session) return state;

          const deckId = state.session.deckId;
          const dialogueId = state.session.currentDialogueId || '';
          const lineIndex = state.session.currentLineIndex;
          const currentProgress = state.progress[deckId] || {
            dialogueId,
            lineIndex,
            tokenIndex: 0,
            completedTokens: new Set(),
            masteredTokens: new Set()
          };

          return {
            progress: {
              ...state.progress,
              [deckId]: {
                ...currentProgress,
                tokenIndex
              }
            },
            session: {
              ...state.session,
              currentTokenIndex: tokenIndex,
              responseStartTime: Date.now()
            }
          };
        });
      },

      markTokenComplete: (dialogueId: string, lineIndex: number, tokenIndex: number) => {
        set(state => {
          if (!state.session) return state;

          const deckId = state.session.deckId;
          const tokenKey = `${dialogueId}:${lineIndex}:${tokenIndex}`;
          const currentProgress = state.progress[deckId] || {
            dialogueId,
            lineIndex: 0,
            tokenIndex: 0,
            completedTokens: new Set(),
            masteredTokens: new Set()
          };

          const newCompletedTokens = new Set(currentProgress.completedTokens);
          newCompletedTokens.add(tokenKey);

          return {
            progress: {
              ...state.progress,
              [deckId]: {
                ...currentProgress,
                completedTokens: newCompletedTokens
              }
            }
          };
        });
      },

      markTokenMastered: (dialogueId: string, lineIndex: number, tokenIndex: number) => {
        set(state => {
          if (!state.session) return state;

          const deckId = state.session.deckId;
          const tokenKey = `${dialogueId}:${lineIndex}:${tokenIndex}`;
          const currentProgress = state.progress[deckId] || {
            dialogueId,
            lineIndex: 0,
            tokenIndex: 0,
            completedTokens: new Set(),
            masteredTokens: new Set()
          };

          const newMasteredTokens = new Set(currentProgress.masteredTokens);
          newMasteredTokens.add(tokenKey);

          const newCompletedTokens = new Set(currentProgress.completedTokens);
          newCompletedTokens.add(tokenKey);

          return {
            progress: {
              ...state.progress,
              [deckId]: {
                ...currentProgress,
                completedTokens: newCompletedTokens,
                masteredTokens: newMasteredTokens
              }
            }
          };
        });
      },

      togglePinyin: () => {
        set(state => {
          if (!state.session) return state;

          return {
            session: {
              ...state.session,
              showPinyin: !state.session.showPinyin
            }
          };
        });
      },

      toggleTranslation: () => {
        set(state => {
          if (!state.session) return state;

          return {
            session: {
              ...state.session,
              showTranslation: !state.session.showTranslation
            }
          };
        });
      },

      updateSettings: (settings: Partial<ReadModeSettings>) => {
        console.log('Updating settings:', settings);
        set(state => ({
          settings: {
            ...state.settings,
            ...settings
          },
          // Update session if showPinyinDefault changes
          session: state.session && settings.showPinyinDefault !== undefined
            ? {
                ...state.session,
                showPinyin: settings.showPinyinDefault
              }
            : state.session
        }));
      },

      recordAnswer: (correct: boolean, responseTime: number) => {
        set(state => {
          if (!state.session) return state;

          return {
            session: {
              ...state.session,
              correctCount: state.session.correctCount + (correct ? 1 : 0),
              incorrectCount: state.session.incorrectCount + (correct ? 0 : 1),
              responseTimes: [...state.session.responseTimes, responseTime]
            }
          };
        });
      },

      clearSession: () => {
        set({ session: null });
      },

      resetProgress: (deckId: string) => {
        set(state => {
          const newProgress = { ...state.progress };
          delete newProgress[deckId];
          return { progress: newProgress };
        });
      },

      getProgress: (deckId: string) => {
        return get().progress[deckId] || null;
      }
    }),
    {
      name: 'read-store',
      version: 3,
      partialize: state => ({
        progress: state.progress,
        settings: state.settings
      }),
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Add new sentence mode settings to existing persisted state
          persistedState = {
            ...persistedState,
            settings: {
              ...defaultSettings,
              ...persistedState.settings,
              translationMode: persistedState.settings?.translationMode || 'sentence',
              accuracyThreshold: persistedState.settings?.accuracyThreshold || 70,
              showWordHints: persistedState.settings?.showWordHints !== false
            }
          };
        }
        if (version < 3) {
          // Update default translation direction from characters→english to pinyin→english
          // Only migrate if user was on the old default (a→c)
          const currentFrom = persistedState.settings?.translationDirection?.from;
          const currentTo = persistedState.settings?.translationDirection?.to;
          if (currentFrom === 'a' && currentTo === 'c') {
            persistedState = {
              ...persistedState,
              settings: {
                ...persistedState.settings,
                translationDirection: { from: 'b', to: 'c' }
              }
            };
          }
        }
        return persistedState;
      }
    }
  )
);