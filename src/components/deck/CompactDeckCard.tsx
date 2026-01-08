import { FC, memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Deck } from '@/types';
import { ReadIcon } from '@/components/icons/ModeIcons';
import { hasTranscriptsForDeck } from '@/services/transcriptService';
import styles from './CompactDeckCard.module.css';

interface CompactDeckCardProps {
  deck: Deck;
  onSelect: (deckId: string) => void;
}

export const CompactDeckCard: FC<CompactDeckCardProps> = memo(({
  deck,
  onSelect,
}) => {
  const [hasTranscripts, setHasTranscripts] = useState(false);
  const cardCount = deck.metadata.card_count;

  const displayTitle = deck.metadata.abbreviated_title || deck.metadata.deck_name;
  const subtitle = deck.metadata.deck_subtitle;

  // Check for reading content availability
  const hasReadingContent = hasTranscripts ||
    (deck.reading && Object.keys(deck.reading.dialogues).length > 0);

  useEffect(() => {
    hasTranscriptsForDeck(deck.id).then(setHasTranscripts);
  }, [deck.id]);

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
      aria-label={`${deck.metadata.deck_name}. ${cardCount} cards.`}
      whileTap={{ scale: 0.98 }}
    >
      <div className={styles.title}>{displayTitle}</div>

      <div className={styles.subtitle}>{subtitle}</div>

      {hasReadingContent && (
        <div className={styles.readingIndicator}>
          <ReadIcon className={styles.readingIcon} size={14} />
          <span>Reading</span>
        </div>
      )}

      <div className={styles.stats}>
        <span>{cardCount} cards</span>
      </div>
    </motion.div>
  );
});

CompactDeckCard.displayName = 'CompactDeckCard';
