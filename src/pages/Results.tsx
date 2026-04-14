import { FC, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LearnSessionResults, LearnModeSettings, Card } from '@/types';
import { useDeckStore } from '@/store/deckStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useCardMasteryStore } from '@/store/cardMasteryStore';
import ReviewCard from '@/components/cards/ReviewCard';
import styles from './Results.module.css';

const Results: FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentDeck, loadDeck } = useDeckStore();
  const { updateSettings: updateStoredSettings } = useSettingsStore();
  const cardMastery = useCardMasteryStore(state => (deckId ? state.mastery[deckId] : undefined));
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);

  // Get results from navigation state
  const results = location.state?.results as LearnSessionResults | undefined;
  const learnSettings = location.state?.settings as LearnModeSettings | undefined;
  const previouslyExcluded = (location.state?.previouslyExcluded as number[] | undefined) || [];

  // Load deck if not already loaded
  useEffect(() => {
    if (deckId && !currentDeck) {
      loadDeck(deckId);
    }
  }, [deckId, currentDeck, loadDeck]);

  if (!results) {
    // If no results (e.g., direct navigation), redirect to home
    navigate('/');
    return null;
  }

  const accuracyPercentage = Math.round(results.accuracy);
  const timeInSeconds = Math.round(results.duration / 1000);
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;

  const getPerformanceMessage = () => {
    if (currentDeck && results.passedCards?.length >= currentDeck.content.length)
      return 'All Cards Passed!';
    if (accuracyPercentage >= 90) return 'Outstanding!';
    if (accuracyPercentage >= 75) return 'Great job!';
    if (accuracyPercentage >= 60) return 'Good effort!';
    return 'Keep practicing!';
  };

  const handleTryAgain = () => {
    // Check if there are any cards left to learn
    const totalDeckCards = currentDeck?.content?.length || 0;
    const passedCount = results.passedCards?.length || 0;

    // If all cards in the deck are passed, show a message
    if (totalDeckCards > 0 && passedCount >= totalDeckCards) {
      alert('You have passed all cards in this deck.');
      navigate(`/deck/${deckId}`);
      return;
    }

    // Accumulate exclusions across retry rounds so cards passed in any earlier
    // round stay out of the pool — without this, round-1 passes reappear once
    // round-2 shrinks the "available but unseen" pool.
    const newPassed = results.passedCards || [];
    const cardsToExclude =
      previouslyExcluded.length + newPassed.length > 0
        ? Array.from(new Set([...previouslyExcluded, ...newPassed]))
        : [];

    navigate(`/learn/${deckId}`, {
      state: {
        excludeCards: cardsToExclude,
        strugglingCards: results.strugglingCards || [],
      },
    });
  };

  const handleRepeatWithFreeText = () => {
    if (!learnSettings || !deckId) return;
    // Flip both fields — questionTypeMix takes precedence over questionTypes
    // in QuestionGenerator.selectQuestionType, so setting only questionTypes
    // leaves the session in its previous ('multiple_choice') mix.
    const newSettings: LearnModeSettings = {
      ...learnSettings,
      questionTypes: ['free_text'],
      questionTypeMix: 'free_text',
    };
    localStorage.setItem('learnModeSettings', JSON.stringify(newSettings));
    updateStoredSettings(deckId, 'learn', newSettings);
    navigate(`/learn/${deckId}`, { state: {} });
  };

  const isMultipleChoiceOnly =
    !!learnSettings &&
    learnSettings.questionTypes?.length === 1 &&
    learnSettings.questionTypes[0] === 'multiple_choice';
  // Treat the deck as conquered when every card has reached its mastery
  // threshold (consecutive-correct model). Covers single-round and
  // multi-round retry sequences equivalently.
  const masteryThreshold = cardMastery?.masteryThreshold ?? 3;
  const deckConquered = !!currentDeck
    && currentDeck.content.length > 0
    && currentDeck.content.every(card => {
      const rec = cardMastery?.masteredCards?.get(card.idx);
      return !!rec && rec.consecutiveCorrect >= masteryThreshold;
    });
  const showRepeatFreeText = isMultipleChoiceOnly && deckConquered;

  const handleBackToDeck = () => {
    navigate(`/deck/${deckId}`);
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleCardClick = (card: Card) => {
    setSelectedCard(card);
    setShowCardModal(true);
  };

  const closeCardModal = () => {
    setShowCardModal(false);
    setTimeout(() => setSelectedCard(null), 300);
  };

  // Keyboard shortcuts: 1 = Continue/Try Again, 2 = Back to Deck, 3 = Home
  useEffect(() => {
    const isEditableTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || el.isContentEditable || tag === 'select';
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (isEditableTarget(e.target)) return;
      if (showCardModal) return; // avoid interfering while viewing a card

      switch (e.key) {
        case '1':
          e.preventDefault();
          handleTryAgain();
          break;
        case '2':
          e.preventDefault();
          handleBackToDeck();
          break;
        case '3':
          e.preventDefault();
          handleBackToHome();
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTryAgain, handleBackToDeck, handleBackToHome, showCardModal]);

  return (
    <div className={`${styles.resultsPage} ${results.strugglingCards.length <= 1 ? styles.noScroll : ''}`}>
      <div className={styles.resultsContainer}>
        {/* Header: message + accuracy */}
        <div className={styles.header}>
          <h1 className={styles.title}>{getPerformanceMessage()}</h1>
          <span className={styles.accuracy}>{accuracyPercentage}%</span>
        </div>

        {/* Compact stats line */}
        <div className={styles.statsLine}>
          <span>{results.correctAnswers}/{results.totalQuestions} correct</span>
          <span className={styles.statsDot} />
          <span>{results.maxStreak} streak</span>
          <span className={styles.statsDot} />
          <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>
        </div>

        {/* Review count if any */}
        {results.strugglingCards.length > 0 && (
          <p className={styles.reviewNote}>
            {results.strugglingCards.length} card{results.strugglingCards.length !== 1 ? 's' : ''} to review
          </p>
        )}

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button
            onClick={handleTryAgain}
            className={`${styles.actionButton} ${styles.primaryButton}`}
          >
            {currentDeck && results.passedCards?.length >= currentDeck.content.length
              ? 'View Deck'
              : results.passedCards?.length > 0
                ? 'Continue with New Cards'
                : 'Try Again'}
          </button>
          {showRepeatFreeText && (
            <button
              onClick={handleRepeatWithFreeText}
              className={`${styles.actionButton} ${styles.secondaryButton}`}
            >
              Repeat with free text mode
            </button>
          )}
          <button
            onClick={handleBackToDeck}
            className={`${styles.actionButton} ${styles.secondaryButton}`}
          >
            Back to Deck
          </button>
          <button
            onClick={handleBackToHome}
            className={`${styles.actionButton} ${styles.tertiaryButton}`}
          >
            Home
          </button>
        </div>

        {/* Missed Cards Section */}
        {currentDeck && results.strugglingCards && results.strugglingCards.length > 0 && (
          <div className={styles.missedCardsSection}>
            <h2 className={styles.missedCardsTitle}>Cards to Review</h2>
            <div className={styles.missedCardsGrid}>
              {results.strugglingCards.map(cardIndex => {
                const card = currentDeck.content[cardIndex];
                if (!card) return null;
                return (
                  <div
                    key={cardIndex}
                    onClick={() => handleCardClick(card)}
                    style={{ cursor: 'pointer' }}
                  >
                    <ReviewCard
                      card={card}
                      frontSides={['side_a']}
                      backSides={['side_b']}
                      showBothSides={true}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
      </div>
    </div>
  );
};

export default Results;
