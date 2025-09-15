import { FC, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDeckStore } from '@/store/deckStore';
import { useNotificationStore } from '@/store/notificationStore';
import { Card } from '@/types';
import LoadingScreen from '@/components/common/LoadingScreen';
import {
  FlashcardsIcon,
  LearnIcon,
  MatchIcon,
  TestIcon,
  CardsIcon,
} from '@/components/icons/ModeIcons';
import styles from './Deck.module.css';

interface ModeCard {
  id: 'flashcards' | 'learn' | 'match' | 'test';
  label: string;
  icon: FC<{ className?: string; size?: number }>;
  color: string;
  description: string;
  route: string;
}

const Deck: FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { currentDeck, loadDeck, isLoading, error } = useDeckStore();
  const { showNotification } = useNotificationStore();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);

  useEffect(() => {
    if (deckId) {
      loadDeck(deckId);
    }
  }, [deckId, loadDeck]);

  const modes: ModeCard[] = [
    {
      id: 'flashcards',
      label: 'Flashcards',
      icon: FlashcardsIcon,
      color: 'primary',
      description: 'Classic flip cards for memorization',
      route: `/flashcards/${deckId}`,
    },
    {
      id: 'learn',
      label: 'Learn',
      icon: LearnIcon,
      color: 'secondary',
      description: 'Interactive questions with smart scheduling',
      route: `/learn/${deckId}`,
    },
    {
      id: 'match',
      label: 'Match',
      icon: MatchIcon,
      color: 'purple',
      description: 'Memory game to match terms and definitions',
      route: `/match/${deckId}`,
    },
    {
      id: 'test',
      label: 'Test',
      icon: TestIcon,
      color: 'orange',
      description: 'Practice exam with various question types',
      route: `/test/${deckId}`,
    },
  ];

  const handleModeClick = (mode: ModeCard) => {
    // Show "Coming Soon" notification for Match and Test modes
    if (mode.id === 'match' || mode.id === 'test') {
      showNotification({
        message: `${mode.label} mode coming soon!`,
        type: 'coming-soon',
        icon: '🚀',
        duration: 3000,
      });
      return;
    }
    navigate(mode.route);
  };

  const handleCardClick = (card: Card) => {
    setSelectedCard(card);
    setShowCardModal(true);
  };

  const closeCardModal = () => {
    setShowCardModal(false);
    setTimeout(() => setSelectedCard(null), 300);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !currentDeck) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error Loading Deck</h2>
        <p>{error || 'Deck not found'}</p>
        <button onClick={() => navigate('/')} className={styles.backButton}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className={styles.deckPage}>
      {/* Header */}
      <header className={styles.header}>
        <button onClick={() => navigate('/')} className={styles.backButton}>
          ← Back
        </button>
        <div className={styles.deckInfo}>
          <h1 className={styles.deckName}>{currentDeck.metadata.deck_name}</h1>
          {currentDeck.metadata.description && (
            <p className={styles.deckDescription}>{currentDeck.metadata.description}</p>
          )}
          <div className={styles.deckStats}>
            <span className={styles.stat}>
              <CardsIcon size={16} className={styles.statIcon} />
              {currentDeck.content.length} cards
            </span>
            {currentDeck.metadata.difficulty && (
              <span className={`${styles.stat} ${styles.difficulty}`}>
                {currentDeck.metadata.difficulty.replace('_', ' ')}
              </span>
            )}
            {currentDeck.metadata.tags && currentDeck.metadata.tags.length > 0 && (
              <span className={styles.stat}>
                {currentDeck.metadata.tags.slice(0, 2).join(', ')}
              </span>
            )}
          </div>
        </div>
        <div className={styles.headerActions}>
          {/* Future: Edit Deck button will go here */}
        </div>
      </header>

      {/* Learning Modes Section */}
      <section className={styles.modesSection}>
        <h2 className={styles.sectionTitle}>Choose Your Learning Mode</h2>
        <div className={styles.modesGrid}>
          {modes.map((mode, index) => (
            <motion.div
              key={mode.id}
              className={`${styles.modeCard} ${styles[mode.color]}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleModeClick(mode)}
            >
              <div className={styles.modeIconWrapper}>
                <mode.icon className={styles.modeIcon} size={32} />
              </div>
              <h3 className={styles.modeName}>{mode.label}</h3>
              <p className={styles.modeDescription}>{mode.description}</p>
              <div className={styles.modeAction}>
                <span className={styles.startText}>Start →</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Cards List Section */}
      <section className={styles.cardsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Cards ({currentDeck.content.length})
          </h2>
          <div className={styles.cardActions}>
            {/* Future: Add Card and Edit Cards buttons will go here */}
          </div>
        </div>

        <div className={styles.cardsList}>
          {currentDeck.content.map((card, index) => (
            <motion.div
              key={index}
              className={styles.cardItem}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.3) }}
              onClick={() => handleCardClick(card)}
              whileHover={{ backgroundColor: 'var(--neutral-gray-100)' }}
            >
              <div className={styles.cardNumber}>{index + 1}</div>
              <div className={styles.cardContent}>
                <div className={styles.cardSide}>
                  <span className={styles.sideLabel}>Front:</span>
                  <span className={styles.sideText}>{card.side_a}</span>
                </div>
                <div className={styles.cardSide}>
                  <span className={styles.sideLabel}>Back:</span>
                  <span className={styles.sideText}>{card.side_b}</span>
                </div>
                {card.side_c && (
                  <div className={styles.cardSide}>
                    <span className={styles.sideLabel}>Extra:</span>
                    <span className={styles.sideText}>{card.side_c}</span>
                  </div>
                )}
              </div>
              <div className={styles.cardArrow}>→</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Card Modal */}
      {showCardModal && selectedCard && (
        <motion.div
          className={styles.modalOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeCardModal}
        >
          <motion.div
            className={styles.modalContent}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.closeButton} onClick={closeCardModal}>
              ×
            </button>
            <h3 className={styles.modalTitle}>Card Details</h3>
            <div className={styles.modalCard}>
              <div className={styles.modalSide}>
                <h4>Side A (Front)</h4>
                <p>{selectedCard.side_a}</p>
              </div>
              <div className={styles.modalSide}>
                <h4>Side B (Back)</h4>
                <p>{selectedCard.side_b}</p>
              </div>
              {selectedCard.side_c && (
                <div className={styles.modalSide}>
                  <h4>Side C (Extra)</h4>
                  <p>{selectedCard.side_c}</p>
                </div>
              )}
              {selectedCard.side_d && (
                <div className={styles.modalSide}>
                  <h4>Side D</h4>
                  <p>{selectedCard.side_d}</p>
                </div>
              )}
              {selectedCard.side_e && (
                <div className={styles.modalSide}>
                  <h4>Side E</h4>
                  <p>{selectedCard.side_e}</p>
                </div>
              )}
              {selectedCard.side_f && (
                <div className={styles.modalSide}>
                  <h4>Side F</h4>
                  <p>{selectedCard.side_f}</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default Deck;