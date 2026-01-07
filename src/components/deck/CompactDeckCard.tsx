import { FC, memo } from 'react';
import { motion } from 'framer-motion';
import { Deck } from '@/types';
import styles from './CompactDeckCard.module.css';

interface CompactDeckCardProps {
  deck: Deck;
  onSelect: (deckId: string) => void;
}

export const CompactDeckCard: FC<CompactDeckCardProps> = memo(({
  deck,
  onSelect,
}) => {
  const cardCount = deck.metadata.card_count;
  const levelCount = deck.metadata.available_levels.length;

  const displayTitle = deck.metadata.abbreviated_title || deck.metadata.deck_name;
  const subtitle = deck.metadata.deck_subtitle;

  const handleClick = () => {
    onSelect(deck.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(deck.id);
    }
  };

  return (
    <motion.div
      className={styles.card}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${deck.metadata.deck_name}. ${cardCount} cards, ${levelCount} levels.`}
      whileTap={{ scale: 0.98 }}
    >
      <div className={styles.title}>{displayTitle}</div>

      <div className={styles.subtitle}>{subtitle}</div>

      <div className={styles.stats}>
        <span>{cardCount} cards</span>
        <span>{levelCount} {levelCount === 1 ? 'level' : 'levels'}</span>
      </div>
    </motion.div>
  );
});

CompactDeckCard.displayName = 'CompactDeckCard';
