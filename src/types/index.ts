// Deck Metadata
export interface DeckMetadata {
  deck_name: string;
  description: string;
  category: string;
  available_levels: number[];
  available_sides: number;
  side_labels?: {
    side_a?: string;
    side_b?: string;
    side_c?: string;
    side_d?: string;
    side_e?: string;
    side_f?: string;
  };
  card_count: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'beginner_to_intermediate';
  tags: string[];
  version: string;
  created_date: string;
  last_updated: string;
}

// Card Structure
export interface Card {
  idx: number;
  name: string;
  side_a: string;
  side_b: string;
  side_c?: string;
  side_d?: string;
  side_e?: string;
  side_f?: string;
  level: number;
}

// Complete Deck
export interface Deck {
  id: string;
  metadata: DeckMetadata;
  content: Card[];
}

// Learning Session State
export interface SessionState {
  deckId: string;
  mode: 'flashcards' | 'learn' | 'match' | 'test';
  currentCardIndex: number;
  correctCount: number;
  incorrectCount: number;
  missedCards: number[];
  startTime: number;
  settings: ModeSettings;
}

// Mode Settings
export interface ModeSettings {
  frontSides: string[];  // e.g., ['side_a']
  backSides: string[];   // e.g., ['side_b', 'side_c']
  cardsPerRound: number;
  enableTimer: boolean;
  timerSeconds?: number;
  enableAudio: boolean;
  randomize: boolean;
  progressionMode: 'sequential' | 'level' | 'random';
}

// Flashcards specific settings
export interface FlashcardsSettings {
  frontSides: string[];
  backSides: string[];
  enableTimer: boolean;
  timerSeconds: number;
  enableAudio: boolean;
  groupSides: Record<string, string[]>;
}

// Learn Mode Specific Types
export interface LearnModeSettings extends ModeSettings {
  questionTypes: ('multiple_choice' | 'free_text')[];
  adaptiveDifficulty: boolean;
  cardsPerRound: number;
  masteryThreshold: number;

  // Side configuration
  questionSides: string[];
  answerSides: string[];

  // Question configuration
  questionTypeMix?: 'auto' | 'multiple_choice' | 'free_text' | 'mixed';
  timerSeconds?: number;

  // Scheduling configuration
  schedulingAlgorithm?: 'smart_spaced' | 'leitner_box';
  aggressiveness?: 'gentle' | 'balanced' | 'intensive';
  minSpacing?: number;
  maxSpacing?: number;
  clusterLimit?: number;
  progressRatio?: number;
  difficultyWeight?: number;
}

export interface LearnSessionState {
  currentQuestion: Question | null;
  questionIndex: number;
  roundCards: Card[];
  correctCards: Set<number>;
  incorrectCards: Set<number>;
  currentStreak: number;
  maxStreak: number;
  startTime: number;
  responseStartTime: number;
}

export interface Question {
  id: string;
  type: 'multiple_choice' | 'free_text';
  cardIndex: number;
  questionText: string;
  questionSides: string[];
  correctAnswer: string;
  options?: string[]; // For multiple choice
  acceptedAnswers?: string[]; // For free text
  difficulty: number;
  isFollowUp?: boolean; // True if this is a free text follow-up to a correct MC answer
  parentQuestionId?: string; // ID of the multiple choice question this follows
}

export interface LearnSessionResults {
  deckId: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  averageResponseTime: number;
  maxStreak: number;
  duration: number;
  masteredCards: number[];
  strugglingCards: number[];
}

// Scheduling System Types
export interface MissedCard {
  cardId: string;
  cardIndex: number;
  missCount: number;
  lastSeen: number;
  difficulty: number; // 0-1, calculated from error rate
  responseTime: number;
}

export interface SchedulerConfig {
  algorithm: 'smart_spaced' | 'leitner_box';
  aggressiveness: 'gentle' | 'balanced' | 'intensive';
  minSpacing: number;        // Minimum cards between reviews
  maxSpacing: number;        // Maximum spacing
  clusterLimit: number;      // Max consecutive missed cards
  progressRatio: number;     // Min % of new cards
  difficultyWeight: number;  // How much difficulty affects spacing (0-1)
}

export interface SchedulingAlgorithm {
  name: string;
  description: string;
  schedule(
    missedCards: MissedCard[],
    upcomingCards: Card[],
    config: SchedulerConfig
  ): Card[];
}

// Question Generation Types
export interface QuestionGeneratorOptions {
  questionTypes: ('multiple_choice' | 'free_text')[];
  frontSides: string[];
  backSides: string[];
  difficulty: number;
  excludeCards?: Set<number>;
  forceMultipleChoice?: boolean; // Force multiple choice for initial questions
  questionTypeMix?: 'auto' | 'multiple_choice' | 'free_text' | 'mixed'; // Control question type distribution
}

// Text Matching Options
export interface TextMatchOptions {
  caseSensitive: boolean;
  allowTypos: boolean;
  maxEditDistance: number;
  synonyms?: Map<string, string[]>;
}

// User Preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large';
  defaultMode: 'flashcards' | 'learn' | 'match' | 'test';
  soundEnabled: boolean;
}