import { FC, useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDeckStore } from '@/store/deckStore';
import { useCardMasteryStore } from '@/store/cardMasteryStore';
import { useNotificationStore } from '@/store/notificationStore';
import { Card } from '@/types';
import { DeckHeader } from '@/components/deck/DeckHeader';
import { ModeSelector } from '@/components/deck/ModeSelector';
import { CardManagement } from '@/components/deck/CardManagement';
import { ModeCard } from '@/components/deck/types';
import UnifiedSettings from '@/components/modals/UnifiedSettings';
import { useSettingsStore } from '@/store/settingsStore';
import { FlashcardsIcon, LearnIcon, MatchIcon, ReadIcon } from '@/components/icons/ModeIcons';
import styles from './Deck.module.css';

const Deck: FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { currentDeck, loadDeck, isLoading, error } = useDeckStore();
  const { getMasteredCards, resetDeckMastery, mastery } = useCardMasteryStore();
  const { showNotification } = useNotificationStore();
  const { getSettingsForMode } = useSettingsStore();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (deckId) {
      loadDeck(deckId);
    }
  }, [deckId, loadDeck]);

  // Calculate mastered cards - safe to do at component level with proper guards
  const masteredCardIndices = useMemo(() => {
    return deckId ? getMasteredCards(deckId) : [];
  }, [deckId, getMasteredCards, mastery]); // Added mastery to dependencies to trigger recalculation

  const learningCards = useMemo(() => {
    if (!currentDeck?.content) return [];
    return currentDeck.content.filter(card => !masteredCardIndices.includes(card.idx));
  }, [currentDeck, masteredCardIndices]);

  const masteredCardsList = useMemo(() => {
    if (!currentDeck?.content) return [];
    return currentDeck.content.filter(card => masteredCardIndices.includes(card.idx));
  }, [currentDeck, masteredCardIndices]);

  const modes: ModeCard[] = useMemo(
    () => [
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
        id: 'read',
        label: 'Read',
        icon: ReadIcon,
        color: 'orange',
        description: 'Structured reading with line-by-line translation',
        route: `/read/${deckId}`,
      },
    ],
    [deckId]
  );

  const handleModeClick = useCallback(
    (mode: ModeCard) => {
      // Check if Read mode is available for this deck
      if (mode.id === 'read') {
        if (!currentDeck?.reading || Object.keys(currentDeck.reading.dialogues).length === 0) {
          showNotification({
            message: 'No reading content available for this deck',
            type: 'info',
            duration: 3000,
          });
          return;
        }
      }
      navigate(mode.route);
    },
    [navigate, showNotification, currentDeck]
  );

  const handleCardClick = useCallback((card: Card) => {
    setSelectedCard(card);
    setShowCardModal(true);
  }, []);

  const closeCardModal = useCallback(() => {
    setShowCardModal(false);
    setTimeout(() => setSelectedCard(null), 300);
  }, []);

  const handleToggleMastered = useCallback(
    (cardIdx: number) => {
      if (!deckId || !currentDeck) return;

      const { markCardMastered, unmarkCardMastered } = useCardMasteryStore.getState();
      const isMastered = masteredCardIndices.includes(cardIdx);

      if (isMastered) {
        unmarkCardMastered(deckId, cardIdx);
      } else {
        // Always use the actual current deck's card count
        markCardMastered(deckId, cardIdx, currentDeck.content.length);
      }

      showNotification({
        message: isMastered ? 'Card moved back to learning' : 'Card marked as mastered!',
        type: isMastered ? 'info' : 'success',
        duration: 2000,
      });
    },
    [deckId, masteredCardIndices, currentDeck, showNotification]
  );

  if (isLoading) {
    return null; // Let PageLazyBoundary handle loading state
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
      <DeckHeader
        deck={currentDeck}
        onBackClick={() => navigate('/')}
        onSettingsClick={() => setShowSettings(true)}
      />

      <ModeSelector modes={modes} onModeClick={handleModeClick} />

      <CardManagement
        deck={currentDeck}
        learningCards={learningCards}
        masteredCards={masteredCardsList}
        onCardClick={handleCardClick}
        onToggleMastered={handleToggleMastered}
      />

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
            onClick={e => e.stopPropagation()}
          >
            <button className={styles.closeButton} onClick={closeCardModal}>
              ×
            </button>
            <h3 className={styles.modalTitle}>Card Details</h3>
            <div className={styles.modalCard}>
              <div className={styles.modalSide}>
                <h4>
                  {currentDeck?.metadata?.side_labels?.side_a
                    ? currentDeck.metadata.side_labels.side_a.charAt(0).toUpperCase() +
                      currentDeck.metadata.side_labels.side_a.slice(1)
                    : 'Side A (Front)'}
                </h4>
                <p>{selectedCard.side_a}</p>
              </div>
              <div className={styles.modalSide}>
                <h4>
                  {currentDeck?.metadata?.side_labels?.side_b
                    ? currentDeck.metadata.side_labels.side_b.charAt(0).toUpperCase() +
                      currentDeck.metadata.side_labels.side_b.slice(1)
                    : 'Side B (Back)'}
                </h4>
                <p>{selectedCard.side_b}</p>
              </div>
              {selectedCard.side_c && (
                <div className={styles.modalSide}>
                  <h4>
                    {currentDeck?.metadata?.side_labels?.side_c
                      ? currentDeck.metadata.side_labels.side_c.charAt(0).toUpperCase() +
                        currentDeck.metadata.side_labels.side_c.slice(1)
                      : 'Side C (Extra)'}
                  </h4>
                  <p>{selectedCard.side_c}</p>
                </div>
              )}
              {selectedCard.side_d && (
                <div className={styles.modalSide}>
                  <h4>
                    {currentDeck?.metadata?.side_labels?.side_d
                      ? currentDeck.metadata.side_labels.side_d.charAt(0).toUpperCase() +
                        currentDeck.metadata.side_labels.side_d.slice(1)
                      : 'Side D'}
                  </h4>
                  <p>{selectedCard.side_d}</p>
                </div>
              )}
              {selectedCard.side_e && (
                <div className={styles.modalSide}>
                  <h4>
                    {currentDeck?.metadata?.side_labels?.side_e
                      ? currentDeck.metadata.side_labels.side_e.charAt(0).toUpperCase() +
                        currentDeck.metadata.side_labels.side_e.slice(1)
                      : 'Side E'}
                  </h4>
                  <p>{selectedCard.side_e}</p>
                </div>
              )}
              {selectedCard.side_f && (
                <div className={styles.modalSide}>
                  <h4>
                    {currentDeck?.metadata?.side_labels?.side_f
                      ? currentDeck.metadata.side_labels.side_f.charAt(0).toUpperCase() +
                        currentDeck.metadata.side_labels.side_f.slice(1)
                      : 'Side F'}
                  </h4>
                  <p>{selectedCard.side_f}</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Deck Settings Modal */}
      <UnifiedSettings
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        deck={currentDeck}
        mode="deck"
        settings={
          deckId
            ? getSettingsForMode(deckId, 'deck')
            : {
                frontSides: [],
                backSides: [],
                cardsPerRound: 10,
                enableTimer: false,
                enableAudio: false,
                randomize: false,
                progressionMode: 'sequential' as const,
              }
        }
        onUpdateSettings={() => {}}
        onResetMastery={() => {
          if (!deckId) return;
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
