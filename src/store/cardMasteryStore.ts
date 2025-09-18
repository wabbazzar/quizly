import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CardMasteryRecord {
  cardIndex: number;
  masteredAt: Date;
  attemptCount: number;
  lastSeen: Date;
  consecutiveCorrect: number;
}

export interface DeckMastery {
  deckId: string;
  masteredCards: Map<number, CardMasteryRecord>;
  totalCards: number;
  lastUpdated: Date;
  masteryThreshold: number; // Store the threshold per deck
}

interface CardMasteryStore {
  // Mastery data by deck ID
  mastery: Record<string, DeckMastery>;

  // Actions
  markCardMastered: (deckId: string, cardIndex: number, totalCards: number) => void;
  unmarkCardMastered: (deckId: string, cardIndex: number) => void;
  getMasteredCards: (deckId: string) => number[];
  getDeckMasteryPercentage: (deckId: string) => number;
  resetDeckMastery: (deckId: string) => void;
  updateCardAttempt: (
    deckId: string,
    cardIndex: number,
    isCorrect: boolean,
    totalCards: number,
    masteryThreshold?: number
  ) => void;
  isCardMastered: (deckId: string, cardIndex: number) => boolean;
}

export const useCardMasteryStore = create<CardMasteryStore>()(
  persist(
    (set, get) => ({
      mastery: {},

      markCardMastered: (deckId: string, cardIndex: number, totalCards: number) => {
        set(state => {
          const deckMastery = state.mastery[deckId] || {
            deckId,
            masteredCards: new Map(),
            totalCards,
            lastUpdated: new Date(),
            masteryThreshold: 3,
          };

          const updatedMasteredCards = new Map(deckMastery.masteredCards);
          updatedMasteredCards.set(cardIndex, {
            cardIndex,
            masteredAt: new Date(),
            attemptCount: 1,
            lastSeen: new Date(),
            consecutiveCorrect: deckMastery.masteryThreshold || 3,
          });

          return {
            mastery: {
              ...state.mastery,
              [deckId]: {
                ...deckMastery,
                masteredCards: updatedMasteredCards,
                totalCards,
                lastUpdated: new Date(),
                masteryThreshold: deckMastery.masteryThreshold,
              },
            },
          };
        });
      },

      unmarkCardMastered: (deckId: string, cardIndex: number) => {
        set(state => {
          const deckMastery = state.mastery[deckId];
          if (!deckMastery) return state;

          const updatedMasteredCards = new Map(deckMastery.masteredCards);
          updatedMasteredCards.delete(cardIndex);

          return {
            mastery: {
              ...state.mastery,
              [deckId]: {
                ...deckMastery,
                masteredCards: updatedMasteredCards,
                lastUpdated: new Date(),
                masteryThreshold: deckMastery.masteryThreshold,
              },
            },
          };
        });
      },

      getMasteredCards: (deckId: string) => {
        const deckMastery = get().mastery[deckId];
        if (!deckMastery) return [];

        // Only return cards that have actually achieved mastery (3+ consecutive correct)
        const masteredIndices: number[] = [];
        deckMastery.masteredCards.forEach((record, cardIndex) => {
          if (record.consecutiveCorrect >= (deckMastery.masteryThreshold || 3)) {
            masteredIndices.push(cardIndex);
          }
        });
        return masteredIndices;
      },

      getDeckMasteryPercentage: (deckId: string) => {
        const deckMastery = get().mastery[deckId];
        if (!deckMastery || deckMastery.totalCards === 0) return 0;

        // Count only cards with 3+ consecutive correct answers
        let masteredCount = 0;
        deckMastery.masteredCards.forEach(record => {
          if (record.consecutiveCorrect >= (deckMastery.masteryThreshold || 3)) {
            masteredCount++;
          }
        });

        return Math.round((masteredCount / deckMastery.totalCards) * 100);
      },

      resetDeckMastery: (deckId: string) => {
        set(state => {
          const newMastery = { ...state.mastery };
          delete newMastery[deckId];
          return { mastery: newMastery };
        });
      },

      updateCardAttempt: (
        deckId: string,
        cardIndex: number,
        isCorrect: boolean,
        totalCards: number,
        masteryThreshold: number = 3
      ) => {
        set(state => {
          const deckMastery = state.mastery[deckId] || {
            deckId,
            masteredCards: new Map(),
            totalCards,
            lastUpdated: new Date(),
            masteryThreshold,
          };

          const updatedMasteredCards = new Map(deckMastery.masteredCards);
          const existingRecord = updatedMasteredCards.get(cardIndex);

          if (isCorrect) {
            const consecutiveCorrect = existingRecord ? existingRecord.consecutiveCorrect + 1 : 1;
            const attemptCount = existingRecord ? existingRecord.attemptCount + 1 : 1;

            // Mark as mastered if consecutive correct reaches configurable threshold
            if (consecutiveCorrect >= masteryThreshold) {
              updatedMasteredCards.set(cardIndex, {
                cardIndex,
                masteredAt: existingRecord?.masteredAt || new Date(),
                attemptCount,
                lastSeen: new Date(),
                consecutiveCorrect,
              });
            } else {
              // Create or update record for cards not yet mastered
              updatedMasteredCards.set(cardIndex, {
                cardIndex,
                masteredAt: existingRecord?.masteredAt || new Date(),
                attemptCount,
                lastSeen: new Date(),
                consecutiveCorrect,
              });
            }
          } else {
            // Reset consecutive correct on wrong answer
            if (existingRecord) {
              // If it was mastered but got wrong, remove mastery
              if (existingRecord.consecutiveCorrect >= masteryThreshold) {
                updatedMasteredCards.delete(cardIndex);
              } else {
                updatedMasteredCards.set(cardIndex, {
                  ...existingRecord,
                  attemptCount: existingRecord.attemptCount + 1,
                  lastSeen: new Date(),
                  consecutiveCorrect: 0,
                });
              }
            }
          }

          return {
            mastery: {
              ...state.mastery,
              [deckId]: {
                ...deckMastery,
                masteredCards: updatedMasteredCards,
                totalCards,
                lastUpdated: new Date(),
                masteryThreshold,
              },
            },
          };
        });
      },

      isCardMastered: (deckId: string, cardIndex: number) => {
        const deckMastery = get().mastery[deckId];
        if (!deckMastery) return false;

        const record = deckMastery.masteredCards.get(cardIndex);
        const masteryThreshold = deckMastery?.masteryThreshold || 3;
        return record ? record.consecutiveCorrect >= masteryThreshold : false;
      },
    }),
    {
      name: 'card-mastery-store',
      // Custom serialization to handle Map objects
      storage: {
        getItem: name => {
          const str = localStorage.getItem(name);
          if (!str) return null;

          const parsed = JSON.parse(str);
          if (parsed.state && parsed.state.mastery) {
            // Convert arrays back to Maps
            Object.keys(parsed.state.mastery).forEach(deckId => {
              const deckMastery = parsed.state.mastery[deckId];
              if (Array.isArray(deckMastery.masteredCards)) {
                deckMastery.masteredCards = new Map(deckMastery.masteredCards);
              }
              // Convert date strings back to Date objects
              if (deckMastery.lastUpdated) {
                deckMastery.lastUpdated = new Date(deckMastery.lastUpdated);
              }
              // Convert dates in mastery records
              deckMastery.masteredCards.forEach((record: CardMasteryRecord) => {
                if (record.masteredAt) record.masteredAt = new Date(record.masteredAt);
                if (record.lastSeen) record.lastSeen = new Date(record.lastSeen);
              });
            });
          }
          return parsed;
        },
        setItem: (name, value) => {
          // Convert Maps to arrays for serialization
          const toStore = {
            ...value,
            state: {
              ...value.state,
              mastery: Object.keys(value.state.mastery).reduce(
                (
                  acc: Record<
                    string,
                    Omit<DeckMastery, 'masteredCards'> & {
                      masteredCards: [number, CardMasteryRecord][];
                    }
                  >,
                  deckId: string
                ) => {
                  const deckMastery = value.state.mastery[deckId];
                  acc[deckId] = {
                    ...deckMastery,
                    masteredCards: deckMastery.masteredCards
                      ? Array.from(deckMastery.masteredCards.entries())
                      : [],
                  };
                  return acc;
                },
                {}
              ),
            },
          };
          localStorage.setItem(name, JSON.stringify(toStore));
        },
        removeItem: name => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);
