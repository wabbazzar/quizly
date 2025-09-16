import { FC, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDeckStore } from '@/store/deckStore';
import { useCardMasteryStore } from '@/store/cardMasteryStore';
import { useNotificationStore } from '@/store/notificationStore';
import { Card } from '@/types';
import LoadingScreen from '@/components/common/LoadingScreen';
import {
  TrophyIcon,
  BookOpenIcon,
  CheckCircleIcon,
  RefreshIcon,
  DragHandleIcon,
} from '@/components/icons/StatusIcons';
import {
  FlashcardsIcon,
  LearnIcon,
  MatchIcon,
  TestIcon,
  CardsIcon,
} from '@/components/icons/ModeIcons';
import styles from './Deck.module.css';
import SettingsIcon from '@/components/icons/SettingsIcon';
import DeckSettings from '@/components/modals/DeckSettings';

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
  const { getMasteredCards, markCardMastered, unmarkCardMastered } = useCardMasteryStore();
  const { showNotification } = useNotificationStore();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [draggedCard, setDraggedCard] = useState<number | null>(null);
  const [dragOverSection, setDragOverSection] = useState<'learning' | 'mastered' | null>(null);
  const dragCardRef = useRef<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);

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
        duration: 3000,
      });
      return;
    }
    navigate(mode.route);
  };

  // Get mastered cards for this deck from centralized mastery store
  const masteredCardIndices = deckId ? getMasteredCards(deckId) : [];
  const learningCards = currentDeck?.content.filter(card => !masteredCardIndices.includes(card.idx)) || [];
  const masteredCardsList = currentDeck?.content.filter(card => masteredCardIndices.includes(card.idx)) || [];

  const handleCardClick = (card: Card) => {
    setSelectedCard(card);
    setShowCardModal(true);
  };

  const closeCardModal = () => {
    setShowCardModal(false);
    setTimeout(() => setSelectedCard(null), 300);
  };

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

    if (draggedIdx === null || !deckId) return;

    const isMastered = masteredCardIndices.includes(draggedIdx);

    if (section === 'mastered' && !isMastered) {
      // Move to mastered (respect mastery store)
      markCardMastered(deckId, draggedIdx, currentDeck.content.length);
      showNotification({
        message: 'Card marked as mastered!',
        type: 'success',
        duration: 2000,
      });
    } else if (section === 'learning' && isMastered) {
      // Move back to learning
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

  const handleToggleMastered = (cardIdx: number) => {
    if (!deckId) return;

    const isMastered = masteredCardIndices.includes(cardIdx);
    if (isMastered) {
      unmarkCardMastered(deckId, cardIdx);
    } else {
      markCardMastered(deckId, cardIdx, currentDeck!.content.length);
    }

    showNotification({
      message: isMastered ? 'Card moved back to learning' : 'Card marked as mastered!',
      type: isMastered ? 'info' : 'success',
      duration: 2000,
    });
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
          <button
            onClick={() => setShowSettings(true)}
            className={styles.backButton}
            title="Deck settings"
          >
            <SettingsIcon size={18} />
          </button>
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

      {/* Cards Management Section */}
      <section className={styles.cardsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Cards Management ({currentDeck.content.length} total)
          </h2>
          <div className={styles.cardActions}>
            <span className={styles.dragHint}>Drag cards to categorize them</span>
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
              {learningCards.map((card) => (
                <motion.div
                  key={card.idx}
                  className={`${styles.cardItem} ${draggedCard === card.idx ? styles.dragging : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(card.idx)}
                  onDragEnd={handleDragEnd}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: draggedCard === card.idx ? 0.5 : 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => handleCardClick(card)}
                  whileHover={{ backgroundColor: 'var(--neutral-gray-100)' }}
                  layout
                >
                  <DragHandleIcon className={styles.cardDragHandle} size={20} />
                  <div className={styles.cardNumber}>{card.idx + 1}</div>
                  <div className={styles.cardContent}>
                    <div className={styles.cardSide}>
                      <span className={styles.sideLabel}>Front:</span>
                      <span className={styles.sideText}>{card.side_a}</span>
                    </div>
                    <div className={styles.cardSide}>
                      <span className={styles.sideLabel}>Back:</span>
                      <span className={styles.sideText}>{card.side_b}</span>
                    </div>
                  </div>
                  <button
                    className={styles.masterButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMastered(card.idx);
                    }}
                    title="Mark as mastered"
                  >
                    <CheckCircleIcon size={16} />
                  </button>
                </motion.div>
              ))}
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
              Mastered ({masteredCardsList.length})
            </h3>
            <div className={styles.cardsList}>
              {masteredCardsList.map((card) => (
                <motion.div
                  key={card.idx}
                  className={`${styles.cardItem} ${styles.masteredCard} ${draggedCard === card.idx ? styles.dragging : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(card.idx)}
                  onDragEnd={handleDragEnd}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: draggedCard === card.idx ? 0.5 : 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => handleCardClick(card)}
                  whileHover={{ backgroundColor: 'var(--semantic-success-light)' }}
                  layout
                >
                  <DragHandleIcon className={styles.cardDragHandle} size={20} />
                  <div className={styles.cardNumber}>{card.idx + 1}</div>
                  <div className={styles.cardContent}>
                    <div className={styles.cardSide}>
                      <span className={styles.sideLabel}>Front:</span>
                      <span className={styles.sideText}>{card.side_a}</span>
                    </div>
                    <div className={styles.cardSide}>
                      <span className={styles.sideLabel}>Back:</span>
                      <span className={styles.sideText}>{card.side_b}</span>
                    </div>
                  </div>
                  <button
                    className={styles.unmasterButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMastered(card.idx);
                    }}
                    title="Move back to learning"
                  >
                    <RefreshIcon size={16} />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
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
                <h4>{currentDeck?.metadata?.side_labels?.side_a ?
                  currentDeck.metadata.side_labels.side_a.charAt(0).toUpperCase() +
                  currentDeck.metadata.side_labels.side_a.slice(1) :
                  'Side A (Front)'}</h4>
                <p>{selectedCard.side_a}</p>
              </div>
              <div className={styles.modalSide}>
                <h4>{currentDeck?.metadata?.side_labels?.side_b ?
                  currentDeck.metadata.side_labels.side_b.charAt(0).toUpperCase() +
                  currentDeck.metadata.side_labels.side_b.slice(1) :
                  'Side B (Back)'}</h4>
                <p>{selectedCard.side_b}</p>
              </div>
              {selectedCard.side_c && (
                <div className={styles.modalSide}>
                  <h4>{currentDeck?.metadata?.side_labels?.side_c ?
                    currentDeck.metadata.side_labels.side_c.charAt(0).toUpperCase() +
                    currentDeck.metadata.side_labels.side_c.slice(1) :
                    'Side C (Extra)'}</h4>
                  <p>{selectedCard.side_c}</p>
                </div>
              )}
              {selectedCard.side_d && (
                <div className={styles.modalSide}>
                  <h4>{currentDeck?.metadata?.side_labels?.side_d ?
                    currentDeck.metadata.side_labels.side_d.charAt(0).toUpperCase() +
                    currentDeck.metadata.side_labels.side_d.slice(1) :
                    'Side D'}</h4>
                  <p>{selectedCard.side_d}</p>
                </div>
              )}
              {selectedCard.side_e && (
                <div className={styles.modalSide}>
                  <h4>{currentDeck?.metadata?.side_labels?.side_e ?
                    currentDeck.metadata.side_labels.side_e.charAt(0).toUpperCase() +
                    currentDeck.metadata.side_labels.side_e.slice(1) :
                    'Side E'}</h4>
                  <p>{selectedCard.side_e}</p>
                </div>
              )}
              {selectedCard.side_f && (
                <div className={styles.modalSide}>
                  <h4>{currentDeck?.metadata?.side_labels?.side_f ?
                    currentDeck.metadata.side_labels.side_f.charAt(0).toUpperCase() +
                    currentDeck.metadata.side_labels.side_f.slice(1) :
                    'Side F'}</h4>
                  <p>{selectedCard.side_f}</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Deck Settings Modal */}
      <DeckSettings
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        deck={currentDeck}
        onResetMastery={() => {
          if (!deckId) return;
          // Clear mastery for this deck
          const { resetDeckMastery } = useCardMasteryStore.getState();
          resetDeckMastery(deckId);
          showNotification({
            message: 'Mastered cards reset for this deck.',
            type: 'info',
            duration: 2000,
          });
        }}
      />
    </div>
  );
};

export default Deck;