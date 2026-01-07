import { FC, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Deck } from '@/types';
import { CompactDeckCard } from './CompactDeckCard';
import styles from './CompactDeckGrid.module.css';

interface CompactDeckGridProps {
  decks: Deck[];
  onSelectDeck: (deckId: string) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
    },
  },
};

export const CompactDeckGrid: FC<CompactDeckGridProps> = memo(({
  decks,
  onSelectDeck,
}) => {
  if (decks.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No decks available</p>
      </div>
    );
  }

  return (
    <motion.div
      className={styles.grid}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence mode="popLayout">
        {decks.map((deck) => (
          <motion.div
            key={deck.id}
            variants={itemVariants}
            layout
          >
            <CompactDeckCard
              deck={deck}
              onSelect={onSelectDeck}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
});

CompactDeckGrid.displayName = 'CompactDeckGrid';
