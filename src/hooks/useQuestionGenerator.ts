import { useState, useCallback, useMemo } from 'react';
import { Deck, Question, LearnModeSettings, Card } from '@/types';
import { QuestionGenerator } from '@/services/questionGenerator';
import { useCardMasteryStore } from '@/store/cardMasteryStore';

interface UseQuestionGeneratorReturn {
  questions: Question[];
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  hasNext: boolean;
  nextQuestion: () => void;
  generateRound: (cards: Card[], allDeckCards?: Card[]) => void;
  reset: () => void;
  addFollowUpQuestion: (cardIndex: number, parentQuestionId: string) => void;
  markMCCorrect: (cardIndex: number) => void;
}

export const useQuestionGenerator = (
  deck: Deck,
  settings: LearnModeSettings
): UseQuestionGeneratorReturn => {
  const { getMasteredCards } = useCardMasteryStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [correctMCCards, setCorrectMCCards] = useState<Set<number>>(new Set());
  const [cardQuestionCounts, setCardQuestionCounts] = useState<Map<number, number>>(new Map());

  const generateRound = useCallback(
    (cards: Card[], allDeckCards?: Card[]) => {
      // Get mastered cards for the current deck
      const masteredCardIndices = getMasteredCards(deck.id);

      const newQuestions = QuestionGenerator.generateQuestions(
        cards,
        {
          questionTypes: settings.questionTypes || ['multiple_choice'],
          frontSides: settings.questionSides || settings.frontSides || ['side_a'],
          backSides: settings.answerSides || settings.backSides || ['side_b'],
          difficulty: 1, // Can be adjusted based on user performance
          excludeCards: new Set(),
          forceMultipleChoice: false, // Use questionTypeMix setting instead
          questionTypeMix: settings.questionTypeMix || 'auto',
        },
        masteredCardIndices,
        allDeckCards || cards // Pass all deck cards if provided, otherwise use round cards
      );

      setQuestions(newQuestions);
      setCurrentQuestionIndex(0);
      setCorrectMCCards(new Set());
      setCardQuestionCounts(new Map());
    },
    [settings, deck.id, getMasteredCards]
  );

  const addFollowUpQuestion = useCallback(
    (cardIndex: number, parentQuestionId: string) => {
      // Only add follow-up if progressive learning is enabled
      if (!settings.questionTypes?.includes('free_text')) return;

      // Create a follow-up free text question
      const cards = questions
        .filter(q => q.cardIndex === cardIndex)
        .map(
          q =>
            ({
              idx: cardIndex,
              name: '',
              side_a: q.questionText,
              side_b: q.correctAnswer,
              level: 1,
            }) as Card
        );

      if (cards.length > 0) {
        const followUpQuestion = QuestionGenerator.generateFreeText(
          cards[0],
          { front: settings.frontSides || ['side_a'], back: settings.backSides || ['side_b'] },
          cardIndex
        );

        const enhancedFollowUp: Question = {
          ...followUpQuestion,
          id: `ft_followup_${parentQuestionId}_${Date.now()}`,
          isFollowUp: true,
          parentQuestionId,
          questionText: `Now type the answer: ${followUpQuestion.questionText}`,
        };

        // Insert the follow-up question after the current question
        setQuestions(prev => {
          const newQuestions = [...prev];
          newQuestions.splice(currentQuestionIndex + 1, 0, enhancedFollowUp);
          return newQuestions;
        });
      }
    },
    [questions, currentQuestionIndex, settings]
  );

  const shouldAddFollowUp = useCallback(
    (cardIndex: number): boolean => {
      // Don't add follow-up if free text is not enabled
      if (!settings.questionTypes?.includes('free_text')) return false;

      // Get progressive learning configuration
      const progressiveLearning = settings.progressiveLearning ?? 'spaced';
      const minSpacing = settings.progressiveLearningSpacing ?? 3;

      if (progressiveLearning === 'disabled') return false;

      if (progressiveLearning === 'immediate') {
        // Immediate mode should still respect spacing settings
        // Only add follow-up if we haven't already asked for this card AND respect spacing
        const count = cardQuestionCounts.get(cardIndex) || 0;

        // For immediate mode with spacing, we ensure there's a gap
        if (minSpacing > 1) {
          // Must have at least (minSpacing - 1) other questions in between
          const otherQuestionsSince =
            currentQuestionIndex -
            questions
              .slice(0, currentQuestionIndex)
              .reverse()
              .findIndex(q => q.cardIndex === cardIndex);

          return count < 2 && otherQuestionsSince >= minSpacing;
        }

        // If spacing is 1 or not set, allow immediate follow-up
        return count < 2;
      }

      if (progressiveLearning === 'spaced') {
        // For spaced mode, we need proper spacing between MC and FT for the same card
        // This is called right after an MC question is answered correctly

        // Find the most recent question for this card (should be the current MC question)
        let lastCardQuestionIndex = -1;
        for (let i = currentQuestionIndex; i >= 0; i--) {
          if (questions[i].cardIndex === cardIndex && !questions[i].isFollowUp) {
            lastCardQuestionIndex = i;
            break;
          }
        }

        // If we just answered this card's MC question (it's at currentQuestionIndex)
        if (lastCardQuestionIndex === currentQuestionIndex) {
          // Don't add follow-up immediately - need spacing in spaced mode
          return false;
        }

        // Check if enough questions have passed since we last saw this card
        const questionsSince = currentQuestionIndex - lastCardQuestionIndex;

        // Only add follow-up if we have proper spacing
        return questionsSince >= minSpacing;
      }

      if (progressiveLearning === 'random') {
        // 30% chance of adding a follow-up
        return Math.random() < 0.3;
      }

      return false;
    },
    [settings, cardQuestionCounts, questions, currentQuestionIndex]
  );

  const nextQuestion = useCallback(() => {
    const currentQ = questions[currentQuestionIndex];

    // Update card question count
    if (currentQ) {
      setCardQuestionCounts(prev => {
        const newCounts = new Map(prev);
        newCounts.set(currentQ.cardIndex, (prev.get(currentQ.cardIndex) || 0) + 1);
        return newCounts;
      });
    }

    // Check if we should add a follow-up question for correctly answered MC
    if (
      currentQ &&
      currentQ.type === 'multiple_choice' &&
      !currentQ.isFollowUp &&
      correctMCCards.has(currentQ.cardIndex) &&
      !questions[currentQuestionIndex + 1]?.isFollowUp &&
      // Do not insert a follow-up if we're on the last question
      currentQuestionIndex < questions.length - 1 &&
      shouldAddFollowUp(currentQ.cardIndex)
    ) {
      // Add a follow-up free text question
      addFollowUpQuestion(currentQ.cardIndex, currentQ.id);
    }

    setCurrentQuestionIndex(prev => Math.min(prev + 1, questions.length - 1));
  }, [questions, currentQuestionIndex, correctMCCards, addFollowUpQuestion, shouldAddFollowUp]);

  const reset = useCallback(() => {
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setCorrectMCCards(new Set());
    setCardQuestionCounts(new Map());
  }, []);

  const currentQuestion = useMemo(() => {
    return questions[currentQuestionIndex] || null;
  }, [questions, currentQuestionIndex]);

  const hasNext = useMemo(() => {
    return currentQuestionIndex < questions.length - 1;
  }, [currentQuestionIndex, questions.length]);

  // Track correctly answered MC questions
  const markMCCorrect = useCallback((cardIndex: number) => {
    setCorrectMCCards(prev => new Set(prev).add(cardIndex));
  }, []);

  return {
    questions,
    currentQuestion,
    currentQuestionIndex,
    hasNext,
    nextQuestion,
    generateRound,
    reset,
    addFollowUpQuestion,
    markMCCorrect,
  };
};
