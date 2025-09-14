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
}

export const useQuestionGenerator = (
  _deck: Deck,
  settings: LearnModeSettings
): UseQuestionGeneratorReturn => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const generateRound = useCallback((cards: Card[]) => {
    const newQuestions = QuestionGenerator.generateQuestions(cards, {
      questionTypes: settings.questionTypes || ['multiple_choice'],
      frontSides: settings.frontSides || ['side_a'],
      backSides: settings.backSides || ['side_b'],
      difficulty: 1, // Can be adjusted based on user performance
      excludeCards: new Set(),
    });

    setQuestions(newQuestions);
    setCurrentQuestionIndex(0);
  }, [settings]);

  const nextQuestion = useCallback(() => {
    setCurrentQuestionIndex(prev => Math.min(prev + 1, questions.length - 1));
  }, [questions.length]);

  const reset = useCallback(() => {
    setQuestions([]);
    setCurrentQuestionIndex(0);
  }, []);

  const currentQuestion = useMemo(() => {
    return questions[currentQuestionIndex] || null;
  }, [questions, currentQuestionIndex]);

  const hasNext = useMemo(() => {
    return currentQuestionIndex < questions.length - 1;
  }, [currentQuestionIndex, questions.length]);

  return {
    questions,
    currentQuestion,
    currentQuestionIndex,
    hasNext,
    nextQuestion,
    generateRound,
    reset,
  };
};