import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  LearnSessionState,
  LearnSessionResults,
  LearnModeSettings
} from '@/types';
import { LearnSessionProgress } from '@/components/modes/learn/LearnProgress';

interface LearnSessionStore {
  // Active session
  activeSession: LearnSessionState | null;
  sessionHistory: LearnSessionResults[];
  preferences: LearnModeSettings;

  // Actions
  startSession: (deckId: string, settings: LearnModeSettings) => void;
  updateProgress: (progress: Partial<LearnSessionProgress>) => void;
  completeSession: (results: LearnSessionResults) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => void;

  // Preferences
  updatePreferences: (preferences: Partial<LearnModeSettings>) => void;
  loadPreferences: () => void;
  savePreferences: () => void;

  // Statistics
  getSessionStatistics: (deckId?: string) => {
    totalSessions: number;
    averageAccuracy: number;
    totalQuestionsAnswered: number;
    totalCorrectAnswers: number;
    bestStreak: number;
    averageSessionDuration: number;
  };
}

const defaultLearnSettings: LearnModeSettings = {
  frontSides: ['side_a'],
  backSides: ['side_b'],
  questionSides: ['side_a'],
  answerSides: ['side_b'],
  cardsPerRound: 20,
  enableTimer: false,
  timerSeconds: 30,
  enableAudio: false,
  randomize: true,
  progressionMode: 'sequential',
  questionTypes: ['multiple_choice', 'free_text'],
  adaptiveDifficulty: true,
  masteryThreshold: 3,
  schedulingAlgorithm: 'smart_spaced',
  aggressiveness: 'balanced',
  minSpacing: 2,
  maxSpacing: 8,
  clusterLimit: 2,
  progressRatio: 0.3,
  difficultyWeight: 0.5,
  questionTypeMix: 'auto',
};

export const useLearnSessionStore = create<LearnSessionStore>()(
  persist(
    (set, get) => ({
      // Initial state
      activeSession: null,
      sessionHistory: [],
      preferences: defaultLearnSettings,

      // Actions
      startSession: (_deckId, settings) => {
        set({
          activeSession: {
            currentQuestion: null,
            questionIndex: 0,
            roundCards: [],
            correctCards: new Set(),
            incorrectCards: new Set(),
            currentStreak: 0,
            maxStreak: 0,
            startTime: Date.now(),
            responseStartTime: Date.now(),
          },
          preferences: settings,
        });
      },

      updateProgress: (progress) => {
        set((state) => {
          if (!state.activeSession) return state;

          return {
            activeSession: {
              ...state.activeSession,
              ...progress,
            },
          };
        });
      },

      completeSession: (results) => {
        set((state) => ({
          activeSession: null,
          sessionHistory: [...state.sessionHistory, results],
        }));
      },

      pauseSession: () => {
        // Save current session state to localStorage
        const state = get();
        if (state.activeSession) {
          localStorage.setItem('pausedLearnSession', JSON.stringify(state.activeSession));
        }
      },

      resumeSession: () => {
        // Restore session from localStorage
        const pausedSession = localStorage.getItem('pausedLearnSession');
        if (pausedSession) {
          try {
            const session = JSON.parse(pausedSession);
            // Convert Set objects back from arrays
            session.correctCards = new Set(session.correctCards);
            session.incorrectCards = new Set(session.incorrectCards);
            set({ activeSession: session });
            localStorage.removeItem('pausedLearnSession');
          } catch (error) {
            console.error('Failed to resume session:', error);
          }
        }
      },

      endSession: () => {
        set({ activeSession: null });
        localStorage.removeItem('pausedLearnSession');
      },

      // Preferences
      updatePreferences: (preferences) => {
        set((state) => ({
          preferences: { ...state.preferences, ...preferences },
        }));
      },

      loadPreferences: () => {
        const stored = localStorage.getItem('learnModePreferences');
        if (stored) {
          try {
            const preferences = JSON.parse(stored);
            set({ preferences });
          } catch (error) {
            console.error('Failed to load preferences:', error);
          }
        }
      },

      savePreferences: () => {
        const state = get();
        localStorage.setItem('learnModePreferences', JSON.stringify(state.preferences));
      },

      // Statistics
      getSessionStatistics: (deckId) => {
        const state = get();
        const sessions = deckId
          ? state.sessionHistory.filter(s => s.deckId === deckId)
          : state.sessionHistory;

        if (sessions.length === 0) {
          return {
            totalSessions: 0,
            averageAccuracy: 0,
            totalQuestionsAnswered: 0,
            totalCorrectAnswers: 0,
            bestStreak: 0,
            averageSessionDuration: 0,
          };
        }

        const totalSessions = sessions.length;
        const totalQuestionsAnswered = sessions.reduce((sum, s) => sum + s.totalQuestions, 0);
        const totalCorrectAnswers = sessions.reduce((sum, s) => sum + s.correctAnswers, 0);
        const averageAccuracy = (totalCorrectAnswers / totalQuestionsAnswered) * 100;
        const bestStreak = Math.max(...sessions.map(s => s.maxStreak));
        const averageSessionDuration = sessions.reduce((sum, s) => sum + s.duration, 0) / totalSessions;

        return {
          totalSessions,
          averageAccuracy,
          totalQuestionsAnswered,
          totalCorrectAnswers,
          bestStreak,
          averageSessionDuration,
        };
      },
    }),
    {
      name: 'learn-session-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessionHistory: state.sessionHistory.slice(-50), // Keep last 50 sessions
        preferences: state.preferences,
      }),
    }
  )
);