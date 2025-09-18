import { FC, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LearnSessionResults, Card } from '@/types';
import { useDeckStore } from '@/store/deckStore';
import ReviewCard from '@/components/cards/ReviewCard';
import styles from './Results.module.css';

const Results: FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentDeck, loadDeck } = useDeckStore();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);

  // Get results from navigation state
  const results = location.state?.results as LearnSessionResults | undefined;

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

  const getPerformanceEmoji = () => {
    if (accuracyPercentage >= 90) return '🌟';
    if (accuracyPercentage >= 75) return '✨';
    if (accuracyPercentage >= 60) return '👍';
    return '💪';
  };

  const getPerformanceMessage = () => {
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
      alert('🎉 Congratulations! You have passed all cards in this deck!');
      navigate(`/deck/${deckId}`);
      return;
    }

    // For "Continue with New Cards": exclude only passed cards
    // This keeps struggling cards in the pool to be mixed with new cards
    // For "Try Again": don't exclude any cards (when no cards were passed)
    const cardsToExclude = results.passedCards?.length > 0 ? results.passedCards : [];

    navigate(`/learn/${deckId}`, {
      state: {
        excludeCards: cardsToExclude,
        strugglingCards: results.strugglingCards || [],
      },
    });
  };

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
    <div className={styles.resultsPage}>
      <div className={styles.resultsContainer}>
        {/* Performance Header */}
        <div className={styles.performanceHeader}>
          <div className={styles.performanceEmoji}>
            {currentDeck && results.passedCards?.length >= currentDeck.content.length
              ? '🏆'
              : getPerformanceEmoji()}
          </div>
          <h1 className={styles.performanceMessage}>
            {currentDeck && results.passedCards?.length >= currentDeck.content.length
              ? 'All Cards Passed!'
              : getPerformanceMessage()}
          </h1>
          {currentDeck && results.passedCards?.length >= currentDeck.content.length && (
            <p className={styles.completionMessage}>
              Congratulations! You&apos;ve passed all {currentDeck.content.length} cards in this
              session!
            </p>
          )}
        </div>

        {/* Main Score */}
        <div className={styles.mainScore}>
          <div className={styles.accuracyDisplay}>
            <span className={styles.accuracyNumber}>{accuracyPercentage}</span>
            <span className={styles.accuracyPercent}>%</span>
          </div>
          <p className={styles.accuracyLabel}>Accuracy</p>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{results.correctAnswers}</div>
            <div className={styles.statLabel}>Correct</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{results.incorrectAnswers}</div>
            <div className={styles.statLabel}>Incorrect</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{results.maxStreak} 🔥</div>
            <div className={styles.statLabel}>Best Streak</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
            <div className={styles.statLabel}>Time</div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className={styles.additionalStats}>
          <div className={styles.statRow}>
            <span className={styles.statRowLabel}>Total Questions:</span>
            <span className={styles.statRowValue}>{results.totalQuestions}</span>
          </div>
          {results.passedCards.length > 0 && (
            <div className={styles.statRow}>
              <span className={styles.statRowLabel}>Cards Passed:</span>
              <span className={styles.statRowValue}>{results.passedCards.length}</span>
            </div>
          )}
          {results.strugglingCards.length > 0 && (
            <div className={styles.statRow}>
              <span className={styles.statRowLabel}>Need Review:</span>
              <span className={styles.statRowValue}>{results.strugglingCards.length}</span>
            </div>
          )}
          {results.masteredCards && results.masteredCards.length > 0 && (
            <div className={styles.statRow}>
              <span className={styles.statRowLabel}>Cards Mastered:</span>
              <span className={styles.statRowValue}>{results.masteredCards.length}</span>
            </div>
          )}
        </div>

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
