// Deck Metadata
export interface DeckMetadata {
  deck_name: string;
  deck_subtitle?: string;
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

// Reading Types
export type SideId = 'a' | 'b' | 'c' | 'd' | 'e' | 'f';
export type TokenUnit = 'character' | 'word' | 'space';

export type ReadingSidesMap = Partial<Record<SideId, string>>;

export interface ReadingTokenizationConfig {
  // Per-side tokenization unit
  unit: Record<SideId, TokenUnit | undefined>;
  preservePunctuation: boolean;
  alignment?: 'index'; // hint; explicit per-line alignments are optional
}

export interface WordAlignment {
  chinese: string;
  pinyin: string;
  english: string;
}

export interface ReadingLine {
  // Generic sides
  a?: string;
  b?: string;
  c?: string;
  d?: string;
  e?: string;
  f?: string;
  // Optional explicit token alignment entries, deferred by default
  // Example unified mapping entries: { a?: number; b?: number; c?: number }
  alignments?: Array<Partial<Record<SideId, number>>>;
  // New word-based alignment system
  wordAlignments?: WordAlignment[];
}

export interface DeckReadingDialogue {
  lines: ReadingLine[];
}

export interface DeckReading {
  sides?: ReadingSidesMap; // e.g., { a: 'characters', b: 'pinyin', c: 'english' }
  tokenization?: ReadingTokenizationConfig;
  dialogues: Record<string, DeckReadingDialogue>;
}

export type ReadAnswerType = 'free_text' | 'multiple_choice';
export type ReadCheckMode = 'live' | 'wait';

export interface ReadTranslationDirection {
  from: SideId; // e.g., 'a'
  to: SideId;   // e.g., 'c'
}

export type ReadUnit = 'character' | 'word' | 'sentence';
export type ReadTranslationMode = 'token' | 'sentence';

export interface ReadModeSettings {
  answerType: ReadAnswerType;
  checkMode: ReadCheckMode;
  translationDirection: ReadTranslationDirection; // side-to-side
  optionsCount?: number; // for multiple choice (default 4)
  showPinyinDefault: boolean;
  multipleChoiceDifficulty?: 'easy' | 'medium' | 'hard';
  unit: ReadUnit; // UI preference: characters vs words when tokenizing side 'a' by default
  translationMode: ReadTranslationMode; // token-by-token vs full sentence translation
  accuracyThreshold?: number; // minimum similarity percentage for partial credit (default 70)
  showWordHints?: boolean; // whether to show word-level hints on hover/tap (default true)
}

// Sentence translation result with accuracy scoring
export interface SentenceTranslationResult {
  userAnswer: string;
  correctAnswer: string;
  accuracy: number; // 0-100 percentage
  isCorrect: boolean; // true if accuracy >= threshold
  wordMatches?: Array<{
    word: string;
    matched: boolean;
    similarity?: number;
  }>;
  suggestions?: string[]; // alternative correct answers
}

// Complete Deck
export interface Deck {
  id: string;
  metadata: DeckMetadata;
  content: Card[];
  reading?: DeckReading; // NEW optional field
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
  frontSides: string[]; // e.g., ['side_a']
  backSides: string[]; // e.g., ['side_b', 'side_c']
  cardsPerRound: number;
  enableTimer: boolean;
  timerSeconds?: number | null;
  enableAudio: boolean;
  randomize: boolean;
  progressionMode: 'sequential' | 'level' | 'random' | 'shuffle';
}

// Flashcards specific settings
export interface FlashcardsSettings extends ModeSettings {
  progressionMode: 'sequential' | 'shuffle' | 'level';
  includeMastered?: boolean;
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

  // Progressive learning configuration
  progressiveLearning?: 'disabled' | 'immediate' | 'spaced' | 'random';
  progressiveLearningSpacing?: number; // Minimum questions between free text for same card

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
  responseTimes: number[]; // Track response times for each question
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
  explanation?: string; // Optional explanation for the correct answer
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
  passedCards: number[]; // Cards answered correctly in this session
  strugglingCards: number[];
  masteredCards: number[]; // Cards that reached mastery threshold during this session
}

export interface FlashcardSessionResults {
  deckId: string;
  totalCards: number;
  correctCards: number;
  incorrectCards: number;
  accuracy: number;
  roundNumber: number;
  isComplete: boolean;
  missedCardIndices: number[];
  startTime: number;
  endTime: number;
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
  minSpacing: number; // Minimum cards between reviews
  maxSpacing: number; // Maximum spacing
  clusterLimit: number; // Max consecutive missed cards
  progressRatio: number; // Min % of new cards
  difficultyWeight: number; // How much difficulty affects spacing (0-1)
}

export interface SchedulingAlgorithm {
  name: string;
  description: string;
  schedule(missedCards: MissedCard[], upcomingCards: Card[], config: SchedulerConfig): Card[];
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
