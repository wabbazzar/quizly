import { FC, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDeckStore } from '@/store/deckStore';
import { useCardMasteryStore } from '@/store/cardMasteryStore';
// import { useMatchSessionStore } from '@/store/matchSessionStore'; // Will be used in later phases
// import { useProgressStore } from '@/store/progressStore'; // Will be used in Phase 4
import MatchContainer from '@/components/modes/match/MatchContainer';
// import { MatchResults } from '@/components/modes/match/types'; // Will be used in Phase 4
import styles from './Match.module.css';

const Match: FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { decks, activeDeck, selectDeck, isLoading: deckLoading } = useDeckStore();
  const { getMasteredCards } = useCardMasteryStore();
  // const { loadSession } = useMatchSessionStore(); // Will be used in later phases
  // const { updateDeckProgress } = useProgressStore(); // Will be used in Phase 4

  // Local state
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load deck and initialize
  useEffect(() => {
    if (!deckId) {
      setError('No deck ID provided');
      return;
    }

    // Find deck in loaded decks
    const deck = decks.find(d => d.id === deckId);

    if (deck) {
      // Deck is available, select it
      selectDeck(deckId);
      setIsInitialized(true);
      setError(null);
    } else if (!deckLoading) {
      // Deck not found and not loading
      setError('Deck not found');
    }
    // If still loading, wait for decks to load
  }, [deckId, decks, selectDeck, deckLoading]);

  // Prevent body scrolling on mobile
  useEffect(() => {
    document.body.classList.add('no-scroll');

    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, []);

  // TODO: Handle session completion and progress tracking in Phase 4
  // const handleSessionComplete = useCallback((results: MatchResults) => {
  //   if (!deckId || !activeDeck) return;
  //   // Implementation will be added in Phase 4 with results modal
  // }, [deckId, activeDeck, updateDeckProgress]);

  // Handle navigation back to deck
  const handleBackToDeck = useCallback(() => {
    if (deckId) {
      navigate(`/deck/${deckId}`);
    } else {
      navigate('/');
    }
  }, [navigate, deckId]);

  // Error handling
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <h1>Match Mode Error</h1>
          <p>{error}</p>
          <button
            onClick={() => navigate('/')}
            className={styles.errorButton}
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Loading state - removed LoadingScreen to avoid duplicate with PageLazyBoundary
  if (deckLoading || !isInitialized || !activeDeck) {
    return null; // Let PageLazyBoundary handle loading state
  }

  // Check if deck has enough cards for match mode
  if (activeDeck.content.length < 2) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <h1>Insufficient Cards</h1>
          <p>
            This deck needs at least 2 cards to play Match mode.
            Current deck has {activeDeck.content.length} card{activeDeck.content.length === 1 ? '' : 's'}.
          </p>
          <button
            onClick={handleBackToDeck}
            className={styles.errorButton}
          >
            Back to Deck
          </button>
        </div>
      </div>
    );
  }

  // Check for mastered cards scenario
  const masteredIndices = getMasteredCards(deckId!);
  const availableCards = activeDeck.content.length - masteredIndices.length;

  if (availableCards < 2 && masteredIndices.length > 0) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <h1>All Cards Mastered</h1>
          <p>
            You've mastered most cards in this deck!
            Only {availableCards} unmastered card{availableCards === 1 ? '' : 's'} remaining.
          </p>
          <p>
            Enable "Include Mastered Cards" in settings to continue playing.
          </p>
          <button
            onClick={handleBackToDeck}
            className={styles.errorButton}
          >
            Back to Deck
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <MatchContainer
        deck={activeDeck}
      />
    </div>
  );
};

export default Match;