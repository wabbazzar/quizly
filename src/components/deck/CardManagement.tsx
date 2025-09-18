import { FC, memo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/types';
import { CardManagementProps } from './types';
import {
  BookOpenIcon,
  CheckCircleIcon,
  RefreshIcon,
  DragHandleIcon,
  TrophyIcon,
} from '@/components/icons/StatusIcons';
import { useNotificationStore } from '@/store/notificationStore';
import { useCardMasteryStore } from '@/store/cardMasteryStore';
import styles from './CardManagement.module.css';

export const CardManagement: FC<CardManagementProps> = memo(({
  deck,
  learningCards,
  masteredCards,
  onCardClick,
  onToggleMastered
}) => {
  const { showNotification } = useNotificationStore();
  const { markCardMastered, unmarkCardMastered } = useCardMasteryStore();
  const [draggedCard, setDraggedCard] = useState<number | null>(null);
  const [dragOverSection, setDragOverSection] = useState<'learning' | 'mastered' | null>(null);
  const dragCardRef = useRef<number | null>(null);

  // Add safety check for deck
  if (!deck || !deck.content || !deck.metadata) {
    return null;
  }

  const handleDragStart = (cardIdx: number) => {
    setDraggedCard(cardIdx);
    dragCardRef.current = cardIdx;
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
    dragCardRef.current = null;
    setDragOverSection(null);
  };

  const handleDragOver = (section: 'learning' | 'mastered') => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSection(section);
  };

  const handleDragLeave = () => {
    setDragOverSection(null);
  };

  const handleDrop = (section: 'learning' | 'mastered') => (e: React.DragEvent) => {
    e.preventDefault();
    const draggedIdx = dragCardRef.current;

    const deckId = deck.metadata.deck_name; // Use deck_name as ID
    if (draggedIdx === null || !deckId) return;

    const isMastered = masteredCards.some(card => card.idx === draggedIdx);

    if (section === 'mastered' && !isMastered) {
      markCardMastered(deckId, draggedIdx, deck.content.length);
      showNotification({
        message: 'Card marked as mastered!',
        type: 'success',
        duration: 2000,
      });
    } else if (section === 'learning' && isMastered) {
      unmarkCardMastered(deckId, draggedIdx);
      showNotification({
        message: 'Card moved back to learning',
        type: 'info',
        duration: 2000,
      });
    }

    setDragOverSection(null);
    handleDragEnd();
  };

  // Check if device supports touch (mobile/tablet)
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Get side labels from deck metadata, fallback to Side A/Side B
  const sideALabel = deck.metadata.side_labels?.side_a || 'Side A';
  const sideBLabel = deck.metadata.side_labels?.side_b || 'Side B';

  const renderCard = (card: Card, isMastered: boolean) => (
    <motion.div
      key={card.idx}
      className={`${styles.cardItem} ${isMastered ? styles.masteredCard : ''} ${draggedCard === card.idx ? styles.dragging : ''}`}
      draggable={!isTouchDevice} // Only enable dragging on non-touch devices
      onDragStart={!isTouchDevice ? () => handleDragStart(card.idx) : undefined}
      onDragEnd={!isTouchDevice ? handleDragEnd : undefined}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: draggedCard === card.idx ? 0.5 : 1, x: 0 }}
      transition={{ duration: 0.3 }}
      onClick={() => onCardClick(card)}
      whileHover={{ backgroundColor: isMastered ? 'rgba(16, 185, 129, 0.15)' : '#F7F8FA' }}
      layout
    >
      {!isTouchDevice && <DragHandleIcon className={styles.cardDragHandle} size={20} />}
      <div className={styles.cardNumber}>{card.idx + 1}</div>
      <div className={styles.cardContent}>
        <div className={styles.cardSide}>
          <span className={styles.sideLabel}>{sideALabel}:</span>
          <span className={styles.sideText}>{card.side_a}</span>
        </div>
        <div className={styles.cardSide}>
          <span className={styles.sideLabel}>{sideBLabel}:</span>
          <span className={styles.sideText}>{card.side_b}</span>
        </div>
      </div>
      <button
        className={isMastered ? styles.unmasterButton : styles.masterButton}
        onClick={(e) => {
          e.stopPropagation();
          onToggleMastered(card.idx);
        }}
        title={isMastered ? "Move back to learning" : "Mark as mastered"}
      >
        {isMastered ? <RefreshIcon size={16} /> : <CheckCircleIcon size={16} />}
      </button>
    </motion.div>
  );

  return (
    <section className={styles.cardsSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          Cards Management ({deck.content.length} total)
        </h2>
        <div className={styles.cardActions}>
          {'ontouchstart' in window || navigator.maxTouchPoints > 0 ? null : (
            <span className={styles.dragHint}>Drag cards to categorize them</span>
          )}
        </div>
      </div>

      <div className={styles.cardsManagement}>
        {/* Learning Cards Section */}
        <div
          className={`${styles.cardCategory} ${styles.learningSection} ${dragOverSection === 'learning' ? styles.dragOver : ''}`}
          onDragOver={handleDragOver('learning')}
          onDrop={handleDrop('learning')}
          onDragLeave={handleDragLeave}
        >
          <h3 className={styles.categoryTitle}>
            <BookOpenIcon size={20} className={styles.categoryIcon} />
            Learning ({learningCards.length})
          </h3>
          <div className={styles.cardsList}>
            {learningCards.length > 0 ? (
              learningCards.map((card) => renderCard(card, false))
            ) : (
              <div className={styles.emptyState}>
                <p>No cards in learning</p>
                <span>{'ontouchstart' in window || navigator.maxTouchPoints > 0 ? 'Tap cards to categorize them' : 'Drag cards here to start learning'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Mastered Cards Section */}
        <div
          className={`${styles.cardCategory} ${styles.masteredSection} ${dragOverSection === 'mastered' ? styles.dragOver : ''}`}
          onDragOver={handleDragOver('mastered')}
          onDrop={handleDrop('mastered')}
          onDragLeave={handleDragLeave}
        >
          <h3 className={styles.categoryTitle}>
            <TrophyIcon size={20} className={styles.categoryIcon} />
            Mastered ({masteredCards.length})
          </h3>
          <div className={styles.cardsList}>
            {masteredCards.length > 0 ? (
              masteredCards.map((card) => renderCard(card, true))
            ) : (
              <div className={styles.emptyState}>
                <p>No mastered cards</p>
                <span>{'ontouchstart' in window || navigator.maxTouchPoints > 0 ? 'Cards appear here when marked as mastered' : 'Cards auto-populate here during learn mode or drag to mark as mastered'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});

CardManagement.displayName = 'CardManagement';