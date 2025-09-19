import { FC, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDeckStore } from '@/store/deckStore';
import { useProgressStore } from '@/store/progressStore';
import EnhancedDeckCard from '@/components/EnhancedDeckCard';
import { LoadingScreen } from '@/components/ui';
import styles from './Home.module.css';

const Home: FC = () => {
  const { decks, isLoading, error, loadDecks, selectDeck } = useDeckStore();
  const { getDeckProgress } = useProgressStore();

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  const handleModeSelect = useCallback(
    (deckId: string, _mode: string) => {
      selectDeck(deckId);
      // Mode navigation is handled by EnhancedDeckCard
    },
    [selectDeck]
  );

  if (isLoading) {
    return <LoadingScreen message="Loading decks..." />;
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
      <header
        className={styles.header}
        ref={node => {
          if (!node) return;
          const img = node.querySelector('img.' + styles.mascot) as HTMLImageElement | null;
          if (!img) return;
          const updateGradientStart = () => {
            try {
              const rect = img.getBoundingClientRect();
              const headerRect = node.getBoundingClientRect();
              const start = Math.max(0, rect.right - headerRect.left + 8); // start just past mascot (+8px padding)
              node.style.setProperty('--grad-start', `${Math.round(start)}px`);
              // set colors (left current header color, right quizly primary)
              node.style.setProperty('--left-color', '#5b82b0');
              node.style.setProperty('--right-color', getComputedStyle(document.documentElement).getPropertyValue('--primary-main') || '#4a90e2');
            } catch {}
          };
          updateGradientStart();
          window.addEventListener('resize', updateGradientStart);
          if (img.complete) {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = 1;
              canvas.height = 1;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;
              ctx.drawImage(img, 0, 0, 1, 1);
              const data = ctx.getImageData(0, 0, 1, 1).data;
              const toHex = (v: number) => v.toString(16).padStart(2, '0');
              const hex = `#${toHex(data[0])}${toHex(data[1])}${toHex(data[2])}`;
              node.style.setProperty('--header-start', hex);
              updateGradientStart();
            } catch {}
          } else {
            img.addEventListener(
              'load',
              () => {
                try {
                  const canvas = document.createElement('canvas');
                  canvas.width = 1;
                  canvas.height = 1;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  ctx.drawImage(img, 0, 0, 1, 1);
                  const data = ctx.getImageData(0, 0, 1, 1).data;
                  const toHex = (v: number) => v.toString(16).padStart(2, '0');
                  const hex = `#${toHex(data[0])}${toHex(data[1])}${toHex(data[2])}`;
                  node.style.setProperty('--header-start', hex);
                  updateGradientStart();
                } catch {}
              },
              { once: true }
            );
          }
          return () => {
            window.removeEventListener('resize', updateGradientStart);
          };
        }}
      >
            <img
              src={`${import.meta.env.BASE_URL}icons/mrquizly.png`}
              alt="Mr. Quizly"
              className={styles.mascot}
              decoding="async"
              loading="eager"
            />
            <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
              <h1 className={styles.title}>Quizly</h1>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 1600 220"
                role="img"
                aria-labelledby="quizlyCursiveHeaderTitle"
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: 120,
                  transform: 'rotate(-6deg) skewX(-6deg)',
                  transformOrigin: 'center center',
                  marginTop: 8
                }}
                className={styles.taglineSvg}
              >
                <title id="quizlyCursiveHeaderTitle">it's not a test! — cursive header</title>
                <style>{`
                  :root{
                    --quizly-blue:#4A90E2;
                    --quizly-white:#FFFFFF;
                  }
                  text {
                    font-family: "Pacifico", "Lobster", "Brush Script MT", "Segoe Script",
                                 "Snell Roundhand", "Dancing Script", cursive;
                    font-size: 94px;
                    font-weight: 700;
                    fill: var(--quizly-white);
                    letter-spacing: 3px;
                    paint-order: stroke fill;
                    stroke: var(--quizly-white);
                    stroke-width: 1px;
                    dominant-baseline: middle;
                    text-anchor: middle;
                  }
                  .tg-center { display: block; }
                  .tg-right { display: none; text-anchor: end; }
                  @media (max-width: 768px) {
                    .tg-center { display: none; }
                    .tg-right { display: block; }
                    text { font-size: 172px; stroke-width: 1.6px; }
                  }
                `}</style>
                <text className="tg-center" x="50%" y="120">it's not a test!</text>
                <text className="tg-right" x="100%" y="120">it's not a test!</text>
              </svg>
        </motion.div>
      </header>

      <main className={styles.main}>
        <section className={styles.deckSection}>
          <h2 className={styles.sectionTitle}>Available Decks</h2>

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
                {decks.map(deck => (
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
