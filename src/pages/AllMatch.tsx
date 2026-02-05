import { FC, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeckStore } from '@/store/deckStore';
import { Card, Deck } from '@/types';
import MatchContainer from '@/components/modes/match/MatchContainer';
import styles from './Match.module.css';

const AllMatch: FC = () => {
  const navigate = useNavigate();
  const { decks, isLoading: deckLoading } = useDeckStore();

  const [isInitialized, setIsInitialized] = useState(false);

  // Create a virtual deck that combines all cards from all decks
  const combinedDeck: Deck | null = useMemo(() => {
    if (decks.length === 0) return null;

    // Combine all cards from all decks
    const allCards: Card[] = [];
    decks.forEach((deck) => {
      deck.content.forEach((card) => {
        // Adjust the index to be unique across all decks
        allCards.push({
          ...card,
          idx: allCards.length,
        });
      });
    });

    // Create a virtual deck with all cards
    return {
      id: 'all-decks',
      metadata: {
        deck_name: 'All Decks',
        description: 'Combined cards from all decks',
        category: 'combined',
        available_levels: [1, 2, 3],
        available_sides: 3,
        card_count: allCards.length,
        difficulty: 'intermediate',
        tags: ['all'],
        version: '1.0.0',
        created_date: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      },
      content: allCards,
    };
  }, [decks]);

  // Initialize once decks are loaded
  useEffect(() => {
    if (!deckLoading && combinedDeck && combinedDeck.content.length > 0) {
      setIsInitialized(true);
    }
  }, [deckLoading, combinedDeck]);

  // Prevent body scrolling on mobile
  useEffect(() => {
    document.body.classList.add('no-scroll');
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, []);

  // Loading state
  if (deckLoading || !isInitialized || !combinedDeck) {
    return null;
  }

  // Check if we have enough cards
  if (combinedDeck.content.length < 2) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <h1>Insufficient Cards</h1>
          <p>
            Need at least 2 cards to play Match mode.
            Current library has {combinedDeck.content.length} card
            {combinedDeck.content.length === 1 ? '' : 's'}.
          </p>
          <button onClick={() => navigate('/')} className={styles.errorButton}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <MatchContainer deck={combinedDeck} onBackClick={() => navigate('/')} />
    </div>
  );
};

export default AllMatch;
