import { FC, memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Deck } from '@/types';
import { ReadIcon } from '@/components/icons/ModeIcons';
import { PinIcon, PinFilledIcon } from '@/components/icons/PinIcon';
import { usePinnedDecksStore } from '@/store/pinnedDecksStore';
import {
  hasTranscriptsForDeck,
  hasTranscriptsForDeckSync,
} from '@/services/transcriptService';
import styles from './CompactDeckCard.module.css';

interface CompactDeckCardProps {
  deck: Deck;
  onSelect: (deckId: string) => void;
}

export const CompactDeckCard: FC<CompactDeckCardProps> = memo(({
  deck,
  onSelect,
}) => {
  // Seed synchronously from the manifest cache so the first paint already
  // knows whether the Reading badge should show. Falls back to the async
  // check when the manifest hasn't been fetched yet (avoids a layout-shift
  // re-render that the grid's layout animation would otherwise amplify).
  const [hasTranscripts, setHasTranscripts] = useState<boolean>(
    () => hasTranscriptsForDeckSync(deck.id) ?? false
  );
  const cardCount = deck.metadata.card_count;

  const displayTitle = deck.metadata.abbreviated_title || deck.metadata.deck_name;
  const subtitle = deck.metadata.deck_subtitle;

  const pinned = usePinnedDecksStore(state => state.pinnedDeckIds.includes(deck.id));
  const togglePin = usePinnedDecksStore(state => state.togglePin);

  // Check for reading content availability
  const hasReadingContent = hasTranscripts ||
    (deck.reading && Object.keys(deck.reading.dialogues).length > 0);

  useEffect(() => {
    const sync = hasTranscriptsForDeckSync(deck.id);
    if (sync !== null) return; // already resolved on first render
    let cancelled = false;
    hasTranscriptsForDeck(deck.id).then(v => {
      if (!cancelled) setHasTranscripts(v);
    });
    return () => {
      cancelled = true;
    };
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

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePin(deck.id);
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
      <motion.button
        type="button"
        className={`${styles.pinButton} ${pinned ? styles.pinned : ''}`}
        onClick={handlePinClick}
        aria-label={pinned ? 'Unpin deck' : 'Pin deck'}
        aria-pressed={pinned}
        whileTap={{ scale: 0.85 }}
      >
        {pinned ? <PinFilledIcon size={16} /> : <PinIcon size={16} />}
      </motion.button>

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
