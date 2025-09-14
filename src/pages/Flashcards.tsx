import { FC, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useDeckStore } from '@/store/deckStore';
import FlashCard from '@/components/FlashCard';
import FlashcardsSettings from '@/components/modals/FlashcardsSettings';
import LoadingScreen from '@/components/common/LoadingScreen';
import SettingsIcon from '@/components/icons/SettingsIcon';
import styles from './Flashcards.module.css';

const Flashcards: FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { decks, activeDeck, selectDeck } = useDeckStore();

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [frontSides, setFrontSides] = useState(['side_a']);
  const [backSides, setBackSides] = useState(['side_b', 'side_c', 'side_d']);
  const [progress, setProgress] = useState<{ [key: number]: 'correct' | 'incorrect' | null }>({});
  const [showSettings, setShowSettings] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const rotate = useTransform(x, [-200, 0, 200], [-20, 0, 20]);

  useEffect(() => {
    if (deckId && !activeDeck) {
      const deck = decks.find(d => d.id === deckId);
      if (deck) {
        selectDeck(deckId);
      } else {
        navigate('/');
      }
    }
  }, [deckId, activeDeck, decks, selectDeck, navigate]);

  const handleNext = useCallback(() => {
    if (activeDeck && currentCardIndex < activeDeck.content.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setIsFlipped(false);
      x.set(0);
    }
  }, [activeDeck, currentCardIndex, x]);

  const handlePrevious = useCallback(() => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
      setIsFlipped(false);
      x.set(0);
    }
  }, [currentCardIndex, x]);

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const markCard = useCallback((status: 'correct' | 'incorrect') => {
    setProgress(prev => ({
      ...prev,
      [currentCardIndex]: status
    }));
    setSwipeDirection(status === 'correct' ? 'right' : 'left');
    setTimeout(() => {
      handleNext();
      setSwipeDirection(null);
      x.set(0);
    }, 400);
  }, [currentCardIndex, handleNext, x]);

  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    if (Math.abs(info.offset.x) > threshold) {
      if (info.offset.x > 0) {
        markCard('correct');
      } else {
        markCard('incorrect');
      }
    } else {
      x.set(0);
    }
  }, [markCard, x]);

  const updateSettings = useCallback((newFrontSides: string[], newBackSides: string[]) => {
    setFrontSides(newFrontSides);
    setBackSides(newBackSides);
    setIsFlipped(false);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
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
  }, [handleFlip, handleNext, handlePrevious, markCard]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!activeDeck) {
    return <LoadingScreen />;
  }

  const currentCard = activeDeck.content[currentCardIndex];
  const progressPercentage = (Object.keys(progress).length / activeDeck.content.length) * 100;
  const correctCount = Object.values(progress).filter(p => p === 'correct').length;
  const incorrectCount = Object.values(progress).filter(p => p === 'incorrect').length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => navigate('/')}
          aria-label="Back to decks"
        >
          ← Back
        </button>
        <div className={styles.deckInfo}>
          <h1 className={styles.deckTitle}>{activeDeck.metadata.deck_name}</h1>
          <div className={styles.cardCounter}>
            Card {currentCardIndex + 1} of {activeDeck.content.length}
          </div>
        </div>
        <button
          className={styles.settingsButton}
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
        >
          <SettingsIcon size={20} />
        </button>
      </header>

      <div className={styles.progressSection}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className={styles.progressStats}>
          <span className={styles.incorrectStat}>✗ {incorrectCount}</span>
          <span className={styles.correctStat}>✓ {correctCount}</span>
        </div>
      </div>

      <main className={styles.main}>
        <motion.div
          className={styles.cardWrapper}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          onDragEnd={handleDragEnd}
          style={{ x, opacity, rotate }}
          animate={swipeDirection ? {
            x: swipeDirection === 'right' ? window.innerWidth : -window.innerWidth,
            opacity: 0,
            rotate: swipeDirection === 'right' ? 20 : -20
          } : {
            x: 0,
            opacity: 1,
            rotate: 0
          }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 25,
            duration: 0.4
          }}
        >
          <FlashCard
            card={currentCard}
            isFlipped={isFlipped}
            onFlip={handleFlip}
            showFront={true}
            showBack={true}
            frontSides={frontSides}
            backSides={backSides}
          />

          {/* Swipe indicators */}
          <motion.div
            className={`${styles.swipeIndicator} ${styles.incorrect}`}
            animate={{ opacity: x.get() < -50 ? 1 : 0 }}
          >
            ✗
          </motion.div>
          <motion.div
            className={`${styles.swipeIndicator} ${styles.correct}`}
            animate={{ opacity: x.get() > 50 ? 1 : 0 }}
          >
            ✓
          </motion.div>
        </motion.div>
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
          <button
            className={styles.flipButton}
            onClick={handleFlip}
            aria-label="Flip card"
          >
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
          disabled={currentCardIndex === activeDeck.content.length - 1}
          aria-label="Next card"
        >
          →
        </button>
      </div>

      <FlashcardsSettings
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        deck={activeDeck}
        frontSides={frontSides}
        backSides={backSides}
        onUpdateSettings={updateSettings}
      />
    </div>
  );
};

export default Flashcards;