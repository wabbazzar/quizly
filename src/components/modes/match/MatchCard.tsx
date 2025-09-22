import { FC, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MatchCardProps } from './types';
import {
  cardSelectionVariants,
  getMobileOptimizedVariants,
  getReducedMotionVariants,
} from './animations/matchAnimations';
import styles from './MatchCard.module.css';

const MatchCard: FC<MatchCardProps> = memo(({
  card,
  isSelected,
  isMatched,
  isAnimating,
  isCurrentlyAnimating = false,
  onSelect,
  position,
  isMobile = false,
  prefersReducedMotion = false,
}) => {
  // Handle card selection with haptic feedback for mobile devices
  const handleCardClick = useCallback(() => {
    if (isMatched || isAnimating) return;

    onSelect(card.id);
  }, [card.id, isMatched, isAnimating, onSelect]);

  // Handle keyboard interaction
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardClick();
    }
  }, [handleCardClick]);

  // Get appropriate animation variants
  const getCardVariants = () => {
    let variants = cardSelectionVariants;

    if (prefersReducedMotion) {
      variants = getReducedMotionVariants(variants);
    } else if (isMobile) {
      variants = getMobileOptimizedVariants(variants, true);
    }

    return variants;
  };

  // Determine current animation state
  const getAnimationState = () => {
    if (isCurrentlyAnimating) {
      return isMatched ? 'removing' : 'matching';
    }
    if (isMatched) {
      return 'matched';
    }
    if (isSelected) {
      return 'selected';
    }
    return 'unselected';
  };

  const cardVariants = getCardVariants();
  const animationState = getAnimationState();

  return (
    <motion.div
      className={`${styles.card} ${isSelected ? styles.selected : ''} ${isMatched ? styles.matched : ''} ${isCurrentlyAnimating ? styles.animating : ''}`}
      style={{
        gridRow: position.row + 1,
        gridColumn: position.col + 1,
      }}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={isMatched ? -1 : 0}
      aria-label={`Match card: ${card.content}`}
      aria-pressed={isSelected}
      aria-disabled={isMatched}
      data-testid={`match-card-${card.id}`}
      // Enhanced Framer Motion animations
      variants={cardVariants}
      initial="unselected"
      animate={animationState}
      exit="exit"
      whileHover={!isMatched && !prefersReducedMotion ? 'hover' : undefined}
      whileTap={!isMatched && !prefersReducedMotion ? { scale: 0.98 } : undefined}
      layout
      layoutId={card.id}
    >
      <div className={styles.content}>
        {card.content}
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          className={styles.selectionIndicator}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      )}

      {/* Match indicator */}
      {isMatched && (
        <motion.div
          className={styles.matchIndicator}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          ✓
        </motion.div>
      )}

      {/* Touch target overlay for better mobile interaction */}
      <div className={styles.touchTarget} />
    </motion.div>
  );
});

MatchCard.displayName = 'MatchCard';

export default MatchCard;