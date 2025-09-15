import { useState, useCallback, useMemo } from 'react';
import { Deck, Question, LearnModeSettings, Card } from '@/types';
import { QuestionGenerator } from '@/services/questionGenerator';

interface UseQuestionGeneratorReturn {
  questions: Question[];
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  hasNext: boolean;
  nextQuestion: () => void;
  generateRound: (cards: Card[]) => void;
  reset: () => void;
  addFollowUpQuestion: (cardIndex: number, parentQuestionId: string) => void;
  markMCCorrect: (cardIndex: number) => void;
}

export const useQuestionGenerator = (
  _deck: Deck,
  settings: LearnModeSettings
): UseQuestionGeneratorReturn => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [correctMCCards, setCorrectMCCards] = useState<Set<number>>(new Set());

  const generateRound = useCallback((cards: Card[]) => {
    const newQuestions = QuestionGenerator.generateQuestions(cards, {
      questionTypes: settings.questionTypes || ['multiple_choice'],
      frontSides: settings.questionSides || settings.frontSides || ['side_a'],
      backSides: settings.answerSides || settings.backSides || ['side_b'],
      difficulty: 1, // Can be adjusted based on user performance
      excludeCards: new Set(),
      forceMultipleChoice: false, // Use questionTypeMix setting instead
      questionTypeMix: settings.questionTypeMix || 'auto',
    });

    setQuestions(newQuestions);
    setCurrentQuestionIndex(0);
    setCorrectMCCards(new Set());
  }, [settings]);

  const addFollowUpQuestion = useCallback((cardIndex: number, parentQuestionId: string) => {
    // Only add follow-up if progressive learning is enabled
    if (!settings.questionTypes?.includes('free_text')) return;

    // Create a follow-up free text question
    const cards = questions
      .filter(q => q.cardIndex === cardIndex)
      .map(q => ({ idx: cardIndex, name: '', side_a: q.questionText, side_b: q.correctAnswer, level: 1 } as Card));

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
  }, [questions, currentQuestionIndex, settings]);

  const nextQuestion = useCallback(() => {
    const currentQ = questions[currentQuestionIndex];

    // Check if we should add a follow-up question for correctly answered MC
    if (currentQ &&
        currentQ.type === 'multiple_choice' &&
        !currentQ.isFollowUp &&
        correctMCCards.has(currentQ.cardIndex) &&
        !questions[currentQuestionIndex + 1]?.isFollowUp) {
      // Add a follow-up free text question
      addFollowUpQuestion(currentQ.cardIndex, currentQ.id);
    }

    setCurrentQuestionIndex(prev => Math.min(prev + 1, questions.length - 1));
  }, [questions, currentQuestionIndex, correctMCCards, addFollowUpQuestion]);

  const reset = useCallback(() => {
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setCorrectMCCards(new Set());
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