import { FC, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MatchGridProps } from './types';
import MatchCard from './MatchCard';
import {
  gridLayoutVariants,
  getMobileOptimizedVariants,
  getReducedMotionVariants,
} from './animations/matchAnimations';
import styles from './MatchGrid.module.css';

const MatchGrid: FC<MatchGridProps> = memo(({
  cards,
  onCardSelect,
  selectedCards,
  matchedCards,
  gridSize,
  isAnimating,
  animatingCards = [],
  isMobile = false,
}) => {
  // Flatten matched cards array for easier lookup
  const matchedCardIds = new Set(matchedCards.flat());

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Get appropriate animation variants
  let gridVariants = gridLayoutVariants;
  if (prefersReducedMotion) {
    gridVariants = getReducedMotionVariants(gridLayoutVariants);
  } else if (isMobile) {
    gridVariants = getMobileOptimizedVariants(gridLayoutVariants, true);
  }

  return (
    <motion.div
      className={styles.grid}
      style={{
        gridTemplateRows: `repeat(${gridSize.rows}, 1fr)`,
        gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`,
      }}
      variants={gridVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      role="grid"
      aria-label="Match game grid"
      data-testid="match-grid"
    >
      <AnimatePresence mode="popLayout">
        {cards.map((card) => (
          <MatchCard
            key={card.id}
            card={card}
            isSelected={selectedCards.includes(card.id)}
            isMatched={matchedCardIds.has(card.id)}
            isAnimating={isAnimating}
            isCurrentlyAnimating={animatingCards.includes(card.id)}
            onSelect={onCardSelect}
            position={card.position}
            isMobile={isMobile}
            prefersReducedMotion={prefersReducedMotion}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
});

MatchGrid.displayName = 'MatchGrid';

export default MatchGrid;