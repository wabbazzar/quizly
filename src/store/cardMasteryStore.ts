import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LearnQuestionType = 'multiple_choice' | 'free_text';

export interface CardMasteryRecord {
  cardIndex: number;
  masteredAt: Date;
  attemptCount: number;
  lastSeen: Date;
  consecutiveCorrect: number;
  correctMultipleChoice?: boolean;
  correctFreeText?: boolean;
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
  getDeckMasteryPercentage: (deckId: string, actualTotalCards?: number) => number;
  resetDeckMastery: (deckId: string) => void;
  updateCardAttempt: (
    deckId: string,
    cardIndex: number,
    isCorrect: boolean,
    totalCards: number,
    masteryThreshold?: number,
    questionType?: LearnQuestionType
  ) => void;
  isCardMastered: (deckId: string, cardIndex: number) => boolean;
}

const isRecordMastered = (record: CardMasteryRecord | undefined): boolean => {
  if (!record) return false;
  return !!record.correctMultipleChoice && !!record.correctFreeText;
};

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
          const existing = updatedMasteredCards.get(cardIndex);
          updatedMasteredCards.set(cardIndex, {
            cardIndex,
            masteredAt: existing?.masteredAt || new Date(),
            attemptCount: existing?.attemptCount ?? 1,
            lastSeen: new Date(),
            consecutiveCorrect: deckMastery.masteryThreshold || 3,
            correctMultipleChoice: true,
            correctFreeText: true,
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

        // Mastery = answered correctly at least once as both multiple choice and free text
        const masteredIndices: number[] = [];
        deckMastery.masteredCards.forEach((record, cardIndex) => {
          if (isRecordMastered(record)) {
            masteredIndices.push(cardIndex);
          }
        });
        return masteredIndices;
      },

      getDeckMasteryPercentage: (deckId: string, actualTotalCards?: number) => {
        const deckMastery = get().mastery[deckId];
        // Use actualTotalCards if provided, otherwise fall back to stored totalCards
        const totalCards = actualTotalCards ?? deckMastery?.totalCards ?? 0;

        if (!deckMastery || totalCards === 0) return 0;

        let masteredCount = 0;
        deckMastery.masteredCards.forEach(record => {
          if (isRecordMastered(record)) {
            masteredCount++;
          }
        });

        return Math.round((masteredCount / totalCards) * 100);
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
        masteryThreshold: number = 3,
        questionType?: LearnQuestionType
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

          const baseRecord: CardMasteryRecord = existingRecord
            ? { ...existingRecord }
            : {
                cardIndex,
                masteredAt: new Date(),
                attemptCount: 0,
                lastSeen: new Date(),
                consecutiveCorrect: 0,
              };

          baseRecord.attemptCount += 1;
          baseRecord.lastSeen = new Date();

          if (isCorrect) {
            baseRecord.consecutiveCorrect = (existingRecord?.consecutiveCorrect ?? 0) + 1;
            if (questionType === 'multiple_choice') {
              baseRecord.correctMultipleChoice = true;
            } else if (questionType === 'free_text') {
              baseRecord.correctFreeText = true;
            }
          } else {
            baseRecord.consecutiveCorrect = 0;
          }

          updatedMasteredCards.set(cardIndex, baseRecord);

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
        return isRecordMastered(record);
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
