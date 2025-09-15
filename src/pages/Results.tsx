import { FC, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { LearnSessionResults } from '@/types';
import { useDeckStore } from '@/store/deckStore';
import ReviewCard from '@/components/cards/ReviewCard';
import styles from './Results.module.css';

const Results: FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentDeck, loadDeck } = useDeckStore();

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
    const masteredCount = results.masteredCards?.length || 0;

    // If all cards in the deck are mastered, show a message
    if (totalDeckCards > 0 && masteredCount >= totalDeckCards) {
      alert('🎉 Congratulations! You have mastered all cards in this deck!');
      navigate(`/deck/${deckId}`);
      return;
    }

    // For "Continue with New Cards": exclude only mastered cards
    // This keeps struggling cards in the pool to be mixed with new cards
    // For "Try Again": don't exclude any cards (when no cards were mastered)
    const cardsToExclude = results.masteredCards?.length > 0
      ? results.masteredCards
      : [];

    navigate(`/learn/${deckId}`, {
      state: {
        excludeCards: cardsToExclude,
        strugglingCards: results.strugglingCards || []
      }
    });
  };

  const handleBackToDeck = () => {
    navigate(`/deck/${deckId}`);
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className={styles.resultsPage}>
      <div className={styles.resultsContainer}>
        {/* Performance Header */}
        <div className={styles.performanceHeader}>
          <div className={styles.performanceEmoji}>
            {currentDeck && results.masteredCards?.length >= currentDeck.content.length
              ? '🏆'
              : getPerformanceEmoji()}
          </div>
          <h1 className={styles.performanceMessage}>
            {currentDeck && results.masteredCards?.length >= currentDeck.content.length
              ? 'Deck Fully Mastered!'
              : getPerformanceMessage()}
          </h1>
          {currentDeck && results.masteredCards?.length >= currentDeck.content.length && (
            <p className={styles.completionMessage}>
              Congratulations! You've mastered all {currentDeck.content.length} cards in this deck!
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
          {results.masteredCards.length > 0 && (
            <div className={styles.statRow}>
              <span className={styles.statRowLabel}>Mastered Cards:</span>
              <span className={styles.statRowValue}>{results.masteredCards.length}</span>
            </div>
          )}
          {results.strugglingCards.length > 0 && (
            <div className={styles.statRow}>
              <span className={styles.statRowLabel}>Need Review:</span>
              <span className={styles.statRowValue}>{results.strugglingCards.length}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button
            onClick={handleTryAgain}
            className={`${styles.actionButton} ${styles.primaryButton}`}
          >
            {currentDeck && results.masteredCards?.length >= currentDeck.content.length
              ? 'View Deck'
              : results.masteredCards?.length > 0
              ? 'Continue with New Cards'
              : 'Try Again'
            }
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
              {results.strugglingCards.map((cardIndex) => {
                const card = currentDeck.content[cardIndex];
                if (!card) return null;
                return (
                  <ReviewCard
                    key={cardIndex}
                    card={card}
                    frontSides={['side_a']}
                    backSides={['side_b']}
                    showBothSides={true}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;