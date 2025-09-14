import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeckStore } from '@/store/deckStore';
import DeckCard from '@/components/DeckCard';
import LoadingScreen from '@/components/common/LoadingScreen';
import styles from './Home.module.css';

const Home: FC = () => {
  const navigate = useNavigate();
  const { decks, isLoading, error, loadDecks, selectDeck } = useDeckStore();

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  const handleDeckSelect = (deckId: string) => {
    selectDeck(deckId);
    navigate(`/flashcards/${deckId}`);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error Loading Decks</h2>
        <p>{error}</p>
        <button onClick={loadDecks} className={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Quizly</h1>
        <p className={styles.subtitle}>Master your learning with interactive flashcards</p>
      </header>

      <main className={styles.main}>
        <section className={styles.deckSection}>
          <h2 className={styles.sectionTitle}>Available Decks</h2>

          {decks.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No decks available</p>
              <p className={styles.emptyHint}>Import a deck to get started</p>
            </div>
          ) : (
            <div className={styles.deckGrid}>
              {decks.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  onSelect={handleDeckSelect}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Home;