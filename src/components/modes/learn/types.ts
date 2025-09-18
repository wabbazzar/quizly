import { Card, Deck, LearnModeSettings, LearnSessionState, Question } from '@/types';

// Session State Management
export interface SessionStateManager {
  sessionState: LearnSessionState;
  updateSessionState: (updates: Partial<LearnSessionState>) => void;
  resetSession: () => void;
  handleAnswer: (answer: string, isCorrect: boolean, cardIdx: number) => void;
  nextQuestion: () => void;
  metrics: SessionMetrics;
}

// Question Flow Component Props
export interface QuestionFlowProps {
  sessionState: LearnSessionState;
  deck: Deck;
  settings: LearnModeSettings;
  currentCard: Card | null;
  currentQuestion: Question | null;
  showFeedback: boolean;
  feedback?: FeedbackData;
  onAnswerSubmit: (answer: string, isCorrect: boolean, cardIdx: number) => void;
  onQuestionComplete: () => void;
  onShowCardDetails: (card: Card) => void;
}

// Session Metrics Component Props
export interface SessionMetricsProps {
  correctCount: number;
  incorrectCount: number;
  currentStreak: number;
  maxStreak: number;
  timeElapsed: number;
  progressPercentage: number;
  totalCards: number;
  masteredCount: number;
}

// Session Metrics Data
export interface SessionMetrics {
  correctCount: number;
  incorrectCount: number;
  currentStreak: number;
  maxStreak: number;
  timeElapsed: number;
  progressPercentage: number;
  totalCards: number;
  masteredCount: number;
}

// Feedback Data
export interface FeedbackData {
  isCorrect: boolean;
  correctAnswer?: string;
  explanation?: string;
  isMastered?: boolean;
}

// Card Tracking State
export interface CardTrackingState {
  masteredCardIndices: Set<number>;
  strugglingCardIndices: Set<number>;
  newlyMasteredCards: Set<number>;
}

// Session Control Props
export interface SessionControlProps {
  onOpenSettings: () => void;
  onExit: () => void;
  isPaused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
}

// Question Generator Result
export interface QuestionGeneratorResult {
  question: Question;
  card: Card;
  options?: string[];
}

// Session Results (for completion)
export interface ExtendedSessionResults {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  timeSpent: number;
  maxStreak: number;
  masteredCards: number[];
  strugglingCards: number[];
  newlyMasteredCards: number[];
}