import { FC, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import { useDeckStore } from '@/store/deckStore';
import { Card } from '@/types';
import FlashCard from '@/components/FlashCard';
import { SharedModeHeader } from '@/components/common/SharedModeHeader';
import styles from './Flashcards.module.css';

// Default side configuration
const DEFAULT_FRONT_SIDES = ['side_a'];
const DEFAULT_BACK_SIDES = ['side_b', 'side_c'];

const AllFlashcards: FC = () => {
  const navigate = useNavigate();
  const { decks, isLoading } = useDeckStore();

  // State
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [frontSides] = useState(DEFAULT_FRONT_SIDES);
  const [backSides] = useState(DEFAULT_BACK_SIDES);
  const [progress, setProgress] = useState<{ [key: number]: 'correct' | 'incorrect' | null }>({});
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [cardOrder, setCardOrder] = useState<number[]>([]);
  const isInitialMount = useRef(true);

  // Create aggregated cards from all decks
  const allCards = useMemo(() => {
    const cards: Array<Card & { deckName: string; deckId: string }> = [];
    decks.forEach((deck) => {
      deck.content.forEach((card) => {
        cards.push({
          ...card,
          deckName: deck.metadata.deck_name,
          deckId: deck.id,
        });
      });
    });
    return cards;
  }, [decks]);

  // Initialize shuffled card order
  useEffect(() => {
    if (allCards.length > 0 && isInitialMount.current) {
      const indices = Array.from({ length: allCards.length }, (_, i) => i);
      // Fisher-Yates shuffle
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      setCardOrder(indices);
      isInitialMount.current = false;
    }
  }, [allCards.length]);

  // Prevent body scrolling on mobile
  useEffect(() => {
    document.body.classList.add('no-scroll');
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, []);

  const handleNext = useCallback(() => {
    const totalCards = cardOrder.length;
    if (currentCardIndex < totalCards - 1) {
      setCurrentCardIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  }, [currentCardIndex, cardOrder.length]);

  const handlePrevious = useCallback(() => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  }, [currentCardIndex]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const markCard = useCallback(
    (status: 'correct' | 'incorrect') => {
      setProgress((prev) => ({
        ...prev,
        [currentCardIndex]: status,
      }));
      setSwipeDirection(status === 'correct' ? 'right' : 'left');
      setTimeout(() => {
        handleNext();
        setSwipeDirection(null);
      }, 400);
    },
    [currentCardIndex, handleNext]
  );

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 100;
      if (Math.abs(info.offset.x) > threshold) {
        if (info.offset.x > 0) {
          markCard('correct');
        } else {
          markCard('incorrect');
        }
      }
    },
    [markCard]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          (target as HTMLElement).isContentEditable)
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handleFlip();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case '1':
          markCard('incorrect');
          break;
        case '2':
          markCard('correct');
          break;
      }
    },
    [handleFlip, handleNext, handlePrevious, markCard]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (isLoading || allCards.length === 0) {
    return null;
  }

  const actualCardIndex = cardOrder.length > 0 ? cardOrder[currentCardIndex] : currentCardIndex;
  const currentCard = allCards[actualCardIndex];
  const totalCards = cardOrder.length > 0 ? cardOrder.length : allCards.length;
  const progressPercentage = (Object.keys(progress).length / totalCards) * 100;
  const correctCount = Object.values(progress).filter((p) => p === 'correct').length;
  const incorrectCount = Object.values(progress).filter((p) => p === 'incorrect').length;

  return (
    <div className={styles.container}>
      <SharedModeHeader
        deckName="All Decks"
        currentCard={currentCardIndex + 1}
        totalCards={totalCards}
        onBackClick={() => navigate('/')}
        showSettings={false}
        subtitle={currentCard ? currentCard.deckName : undefined}
      />

      <div className={styles.progressSection}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progressPercentage}%` }} />
        </div>
        <div className={styles.progressStats}>
          <span className={styles.incorrectStat}>✗ {incorrectCount}</span>
          <span className={styles.correctStat}>✓ {correctCount}</span>
        </div>
      </div>

      <main className={styles.main}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCardIndex}
            className={styles.cardWrapper}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={handleDragEnd}
            initial={{ y: window.innerHeight, opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              x:
                swipeDirection === 'right'
                  ? window.innerWidth
                  : swipeDirection === 'left'
                    ? -window.innerWidth
                    : 0,
              rotate: swipeDirection === 'right' ? 20 : swipeDirection === 'left' ? -20 : 0,
            }}
            exit={{
              opacity: 0,
              transition: { duration: 0.2 },
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
          >
            <FlashCard
              card={currentCard}
              isFlipped={isFlipped}
              onFlip={handleFlip}
              frontSides={frontSides}
              backSides={backSides}
            />

            <div
              className={`${styles.swipeIndicator} ${styles.incorrect}`}
              style={{ opacity: swipeDirection === 'left' ? 1 : 0 }}
            >
              ✗
            </div>
            <div
              className={`${styles.swipeIndicator} ${styles.correct}`}
              style={{ opacity: swipeDirection === 'right' ? 1 : 0 }}
            >
              ✓
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      <div className={styles.controls}>
        <button
          className={styles.navButton}
          onClick={handlePrevious}
          disabled={currentCardIndex === 0}
          aria-label="Previous card"
        >
          ←
        </button>

        <div className={styles.actionButtons}>
          <button
            className={`${styles.markButton} ${styles.incorrect}`}
            onClick={() => markCard('incorrect')}
            aria-label="Mark as incorrect"
          >
            ✗ Incorrect
          </button>
          <button className={styles.flipButton} onClick={handleFlip} aria-label="Flip card">
            Flip
          </button>
          <button
            className={`${styles.markButton} ${styles.correct}`}
            onClick={() => markCard('correct')}
            aria-label="Mark as correct"
          >
            ✓ Correct
          </button>
        </div>

        <button
          className={styles.navButton}
          onClick={handleNext}
          disabled={currentCardIndex === totalCards - 1}
          aria-label="Next card"
        >
          →
        </button>
      </div>
    </div>
  );
};

export default AllFlashcards;
