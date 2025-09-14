// Deck Metadata
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

// User Preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large';
  defaultMode: 'flashcards' | 'learn' | 'match' | 'test';
  soundEnabled: boolean;
}