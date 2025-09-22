import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MatchBestTime {
  deckId: string;
  bestTimeMs: number;
  achievedAt: Date;
  gridSize: { rows: number; cols: number };
  matchType: 'two_way' | 'three_way' | 'custom';
  totalMatches: number;
}

interface MatchBestTimesStore {
  // Best times data by deck ID
  bestTimes: Record<string, MatchBestTime>;

  // Actions
  updateBestTime: (
    deckId: string,
    timeMs: number,
    gridSize: { rows: number; cols: number },
    matchType: 'two_way' | 'three_way' | 'custom',
    totalMatches: number
  ) => boolean; // Returns true if new best time was set
  getBestTime: (deckId: string) => MatchBestTime | null;
  hasBestTime: (deckId: string) => boolean;
  clearBestTime: (deckId: string) => void;
  clearAllBestTimes: () => void;
  getAllBestTimes: () => MatchBestTime[];
  getDeckStats: (deckId: string) => {
    bestTime: MatchBestTime | null;
    formattedTime: string;
    hasRecord: boolean;
  };
}

// Utility function to format time in MM:SS format
export const formatMatchTime = (timeMs: number): string => {
  const totalSeconds = Math.floor(timeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const useMatchBestTimesStore = create<MatchBestTimesStore>()(
  persist(
    (set, get) => ({
      bestTimes: {},

      updateBestTime: (
        deckId: string,
        timeMs: number,
        gridSize: { rows: number; cols: number },
        matchType: 'two_way' | 'three_way' | 'custom',
        totalMatches: number
      ) => {
        const currentBest = get().bestTimes[deckId];
        const isNewBest = !currentBest || timeMs < currentBest.bestTimeMs;

        if (isNewBest) {
          set(state => ({
            bestTimes: {
              ...state.bestTimes,
              [deckId]: {
                deckId,
                bestTimeMs: timeMs,
                achievedAt: new Date(),
                gridSize: { ...gridSize },
                matchType,
                totalMatches,
              },
            },
          }));
          return true;
        }

        return false;
      },

      getBestTime: (deckId: string) => {
        return get().bestTimes[deckId] || null;
      },

      hasBestTime: (deckId: string) => {
        return deckId in get().bestTimes;
      },

      clearBestTime: (deckId: string) => {
        set(state => {
          const newBestTimes = { ...state.bestTimes };
          delete newBestTimes[deckId];
          return { bestTimes: newBestTimes };
        });
      },

      clearAllBestTimes: () => {
        set({ bestTimes: {} });
      },

      getAllBestTimes: () => {
        return Object.values(get().bestTimes);
      },

      getDeckStats: (deckId: string) => {
        const bestTime = get().bestTimes[deckId] || null;
        return {
          bestTime,
          formattedTime: bestTime ? formatMatchTime(bestTime.bestTimeMs) : '--:--',
          hasRecord: !!bestTime,
        };
      },
    }),
    {
      name: 'match-best-times-store',
      // Custom storage to handle Date objects
      storage: {
        getItem: name => {
          const str = localStorage.getItem(name);
          if (!str) return null;

          const parsed = JSON.parse(str);
          if (parsed.state && parsed.state.bestTimes) {
            // Convert date strings back to Date objects
            Object.keys(parsed.state.bestTimes).forEach(deckId => {
              const bestTime = parsed.state.bestTimes[deckId];
              if (bestTime.achievedAt) {
                bestTime.achievedAt = new Date(bestTime.achievedAt);
              }
            });
          }
          return parsed;
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: name => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);