/**
 * Core TypeScript interfaces for Quizly
 */

export interface DeckMetadata {
  deck_name: string;
  description: string;
  category: string;
  available_levels: number[];
  available_sides: number;
  card_count: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'beginner_to_intermediate';
  tags: string[];
  version: string;
  created_date: string;
  last_updated: string;
}

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

export interface Deck {
  id: string;
  metadata: DeckMetadata;
  content: Card[];
}

export interface FlashcardsSettings {
  frontSides: string[];     // Which sides to show on front
  backSides: string[];      // Which sides to show on back
  enableTimer: boolean;     // Enable auto-swipe timer
  timerSeconds: number;     // Seconds before auto-swipe left
  enableAudio: boolean;     // Enable text-to-speech
  groupSides: {            // Side grouping preferences
    [key: string]: string[];
  };
}

export interface SessionState {
  mode: 'flashcards' | 'learn' | 'match' | 'test';
  deckId: string;
  startTime: Date;
  currentCardIndex: number;
  correctCount: number;
  incorrectCount: number;
  missedCards: number[];
  settings: FlashcardsSettings;
}

export interface UserPreferences {
  defaultFrontSides: string[];
  defaultBackSides: string[];
  enableHaptics: boolean;
  enableSound: boolean;
  theme: 'light' | 'dark' | 'auto';
}