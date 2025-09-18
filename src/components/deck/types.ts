import { FC } from 'react';
import { Deck, Card } from '@/types';

export interface DeckHeaderProps {
  deck: Deck;
  onBackClick: () => void;
  onSettingsClick: () => void;
}

export interface ModeCard {
  id: 'flashcards' | 'learn' | 'match' | 'test';
  label: string;
  icon: FC<{ className?: string; size?: number }>;
  color: string;
  description: string;
  route: string;
}

export interface ModeSelectorProps {
  modes: ModeCard[];
  onModeClick: (mode: ModeCard) => void;
}

export interface DeckStatsProps {
  totalCards: number;
  learningCards: number;
  masteredCards: number;
  deckTags?: string[];
  difficulty?: string;
}

export interface CardManagementProps {
  deck: Deck;
  learningCards: Card[];
  masteredCards: Card[];
  onCardClick: (card: Card) => void;
  onToggleMastered: (cardIdx: number) => void;
}
