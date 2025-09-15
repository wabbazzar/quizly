import { FC, useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import { useDeckStore } from '@/store/deckStore';
import { useFlashcardSessionStore, DEFAULT_FRONT_SIDES, DEFAULT_BACK_SIDES } from '@/store/flashcardSessionStore';
import { FlashcardSessionResults } from '@/types';
import FlashCard from '@/components/FlashCard';
import FlashcardsSettings from '@/components/modals/FlashcardsSettings';
import FlashcardsCompletionModal from '@/components/modals/FlashcardsCompletionModal';
import LoadingScreen from '@/components/common/LoadingScreen';
import SettingsIcon from '@/components/icons/SettingsIcon';
import styles from './Flashcards.module.css';

const Flashcards: FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { decks, activeDeck, selectDeck } = useDeckStore();
  const { getSession, saveSession, startNewRound, startMissedCardsRound, getMissedCardIndices } = useFlashcardSessionStore();
  const isInitialMount = useRef(true);

  // Initialize state from persisted session or defaults
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [frontSides, setFrontSides] = useState(DEFAULT_FRONT_SIDES);
  const [backSides, setBackSides] = useState(DEFAULT_BACK_SIDES);
  const [progress, setProgress] = useState<{ [key: number]: 'correct' | 'incorrect' | null }>({});
  const [showSettings, setShowSettings] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [cardOrder, setCardOrder] = useState<number[]>([]);
  const [startTime, setStartTime] = useState(Date.now());
  const [isMissedCardsRound, setIsMissedCardsRound] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionResults, setCompletionResults] = useState<FlashcardSessionResults | null>(null);


  // Load deck and restore session on mount
  useEffect(() => {
    if (deckId) {
      const deck = decks.find(d => d.id === deckId);
      if (deck) {
        selectDeck(deckId);

        // Only restore session on initial mount
        if (isInitialMount.current) {
          const session = getSession(deckId);
          if (session) {
            setCurrentCardIndex(session.currentCardIndex);
            setProgress(session.progress);
            setFrontSides(session.frontSides);
            setBackSides(session.backSides);
            setRoundNumber(session.roundNumber || 1);
            setCardOrder(session.cardOrder || Array.from({ length: deck.content.length }, (_, i) => i));
            setStartTime(session.startTime || Date.now());
            setIsMissedCardsRound(session.isMissedCardsRound || false);
          } else {
            // Initialize new session
            setCardOrder(Array.from({ length: deck.content.length }, (_, i) => i));
            setStartTime(Date.now());
          }
          isInitialMount.current = false;
        }
      } else {
        navigate('/');
      }
    }
  }, [deckId, decks, selectDeck, navigate, getSession]);

  // Prevent body scrolling on mobile
  useEffect(() => {
    document.body.classList.add('no-scroll');

    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, []);

  // Save session whenever progress changes
  useEffect(() => {
    if (deckId && !isInitialMount.current) {
      saveSession({
        deckId,
        currentCardIndex,
        progress,
        frontSides,
        backSides,
        lastAccessed: Date.now(),
        roundNumber,
        cardOrder,
        startTime,
        isMissedCardsRound
      });
    }
  }, [deckId, currentCardIndex, progress, frontSides, backSides, saveSession, roundNumber, cardOrder, startTime, isMissedCardsRound]);

  // Define handleDeckCompletion before handleNext since handleNext depends on it
  const handleDeckCompletion = useCallback(() => {
    if (!activeDeck || !deckId) return;

    const session = {
      deckId,
      currentCardIndex,
      progress,
      frontSides,
      backSides,
      lastAccessed: Date.now(),
      roundNumber,
      cardOrder,
      startTime,
      isMissedCardsRound
    };

    const missedIndices = getMissedCardIndices(session);
    const totalCards = isMissedCardsRound ? cardOrder.length : activeDeck.content.length;
    const correctCards = Object.values(progress).filter(p => p === 'correct').length;
    const incorrectCards = Object.values(progress).filter(p => p === 'incorrect').length;

    // Calculate accuracy based on cards actually answered, not total deck size
    const cardsAnswered = correctCards + incorrectCards;
    const accuracy = cardsAnswered > 0 ? (correctCards / cardsAnswered) * 100 : 0;

    const results: FlashcardSessionResults = {
      deckId,
      totalCards,
      correctCards,
      incorrectCards,
      accuracy,
      roundNumber,
      isComplete: incorrectCards === 0,
      missedCardIndices: missedIndices,
      startTime,
      endTime: Date.now()
    };

    setCompletionResults(results);
    setShowCompletionModal(true);
  }, [activeDeck, deckId, currentCardIndex, progress, frontSides, backSides, roundNumber, cardOrder, startTime, isMissedCardsRound, getMissedCardIndices]);

  const handleNext = useCallback(() => {
    if (!activeDeck) return;

    const totalCards = isMissedCardsRound ? cardOrder.length : activeDeck.content.length;

    if (currentCardIndex < totalCards - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      // Deck completion - show modal
      handleDeckCompletion();
    }
  }, [activeDeck, currentCardIndex, isMissedCardsRound, cardOrder, handleDeckCompletion]);

  const handlePrevious = useCallback(() => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  }, [currentCardIndex]);

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
    }, 400);
  }, [currentCardIndex, handleNext]);

  const handleContinueWithMissed = useCallback(() => {
    if (!completionResults || !deckId || !activeDeck) return;

    const newSession = startMissedCardsRound(deckId, completionResults.missedCardIndices);

    // Update local state from new session
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setProgress({});
    setRoundNumber(newSession.roundNumber);
    setCardOrder(newSession.cardOrder);
    setStartTime(newSession.startTime);
    setIsMissedCardsRound(true);
    setShowCompletionModal(false);
    setCompletionResults(null);
  }, [completionResults, deckId, activeDeck, startMissedCardsRound]);

  const handleStartNewRound = useCallback(() => {
    if (!deckId || !activeDeck) return;

    const newSession = startNewRound(deckId, activeDeck.content.length);

    // Update local state from new session
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setProgress({});
    setRoundNumber(newSession.roundNumber);
    setCardOrder(newSession.cardOrder);
    setStartTime(newSession.startTime);
    setIsMissedCardsRound(false);
    setShowCompletionModal(false);
    setCompletionResults(null);
  }, [deckId, activeDeck, startNewRound]);

  const handleBackToDeck = useCallback(() => {
    navigate(`/deck/${deckId}`);
  }, [navigate, deckId]);

  const handleDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    if (Math.abs(info.offset.x) > threshold) {
      if (info.offset.x > 0) {
        markCard('correct');
      } else {
        markCard('incorrect');
      }
    }
  }, [markCard]);

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

  // Get the actual card based on whether we're in a missed cards round
  const actualCardIndex = isMissedCardsRound ? cardOrder[currentCardIndex] : currentCardIndex;
  const currentCard = activeDeck.content[actualCardIndex];
  const totalCards = isMissedCardsRound ? cardOrder.length : activeDeck.content.length;
  const progressPercentage = (Object.keys(progress).length / totalCards) * 100;
  const correctCount = Object.values(progress).filter(p => p === 'correct').length;
  const incorrectCount = Object.values(progress).filter(p => p === 'incorrect').length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => {
            // Session is automatically saved via useEffect
            navigate(`/deck/${deckId}`);
          }}
          aria-label="Back to deck"
        >
          ← Back
        </button>
        <div className={styles.deckInfo}>
          <h1 className={styles.deckTitle}>{activeDeck.metadata.deck_name}</h1>
          <div className={styles.cardCounter}>
            {isMissedCardsRound && (
              <span className={styles.missedCardsIndicator}>Review: </span>
            )}
            Card {currentCardIndex + 1} of {totalCards}
            {roundNumber > 1 && (
              <span className={styles.roundIndicator}> • Round {roundNumber}</span>
            )}
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
              x: swipeDirection === 'right' ? window.innerWidth : swipeDirection === 'left' ? -window.innerWidth : 0,
              rotate: swipeDirection === 'right' ? 20 : swipeDirection === 'left' ? -20 : 0
            }}
            exit={{
              opacity: 0,
              transition: { duration: 0.2 }
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30
            }}
          >
              <FlashCard
                card={currentCard}
                isFlipped={isFlipped}
                onFlip={handleFlip}
                frontSides={frontSides}
                backSides={backSides}
              />

              {/* Swipe indicators */}
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
          disabled={currentCardIndex === totalCards - 1}
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

      <FlashcardsCompletionModal
        visible={showCompletionModal}
        results={completionResults}
        onContinueWithMissed={handleContinueWithMissed}
        onStartNewRound={handleStartNewRound}
        onBackToDeck={handleBackToDeck}
        onClose={() => setShowCompletionModal(false)}
      />
    </div>
  );
};

export default Flashcards;