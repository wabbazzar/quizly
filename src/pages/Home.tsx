import { FC, useEffect } from 'react';
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

  const handleModeSelect = (deckId: string, _mode: string) => {
    selectDeck(deckId);
    // Mode navigation is handled by EnhancedDeckCard
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
      {/* Hero Section */}
      <header className={styles.header}>
        <motion.h1
          className={styles.title}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Welcome to Quizly
        </motion.h1>
        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Choose a deck and select your preferred learning mode
        </motion.p>
      </header>

      <main className={styles.main}>
        <section className={styles.deckSection}>
          <motion.h2
            className={styles.sectionTitle}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Available Decks
          </motion.h2>

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
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <AnimatePresence mode="popLayout">
                {decks.map((deck, index) => (
                  <motion.div
                    key={deck.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
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