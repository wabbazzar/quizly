import { FC, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDeckStore } from '@/store/deckStore';
import { useProgressStore } from '@/store/progressStore';
import EnhancedDeckCard from '@/components/EnhancedDeckCard';
import LoadingScreen from '@/components/common/LoadingScreen';
import styles from './Home.module.css';

const Home: FC = () => {
  const { decks, isLoading, error, loadDecks, selectDeck } = useDeckStore();
  const { getDeckProgress } = useProgressStore();

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  const handleModeSelect = useCallback((deckId: string, _mode: string) => {
    selectDeck(deckId);
    // Mode navigation is handled by EnhancedDeckCard
  }, [selectDeck]);

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
      {/* Hero Section */}
      <header className={styles.header}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className={styles.title}>
            Welcome to Quizly
          </h1>
          <p className={styles.subtitle}>
            Choose a deck and select your preferred learning mode
          </p>
        </motion.div>
      </header>

      <main className={styles.main}>
        <section className={styles.deckSection}>
          <h2 className={styles.sectionTitle}>
            Available Decks
          </h2>

          {decks.length === 0 ? (
            <motion.div
              className={styles.emptyState}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <p>No decks available</p>
              <p className={styles.emptyHint}>Import a deck to get started</p>
            </motion.div>
          ) : (
            <motion.div
              className={styles.deckGrid}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence mode="popLayout">
                {decks.map((deck) => (
                  <motion.div
                    key={deck.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <EnhancedDeckCard
                      deck={deck}
                      progress={getDeckProgress(deck.id)}
                      onModeSelect={handleModeSelect}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Home;