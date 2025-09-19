import { FC, useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import { useDeckStore } from '@/store/deckStore';
import { useCardMasteryStore } from '@/store/cardMasteryStore';
import {
  useFlashcardSessionStore,
  DEFAULT_FRONT_SIDES,
  DEFAULT_BACK_SIDES,
} from '@/store/flashcardSessionStore';
import { useProgressStore } from '@/store/progressStore';
import { FlashcardSessionResults } from '@/types';
import FlashCard from '@/components/FlashCard';
import UnifiedSettings from '@/components/modals/UnifiedSettings';
import { FlashcardsSettings, LearnModeSettings, ModeSettings } from '@/types';
import { useSettingsStore } from '@/store/settingsStore';
import FlashcardsCompletionModal from '@/components/modals/FlashcardsCompletionModal';
import { LoadingScreen } from '@/components/ui';
import { SharedModeHeader } from '@/components/common/SharedModeHeader';
import styles from './Flashcards.module.css';

const Flashcards: FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { decks, activeDeck, selectDeck } = useDeckStore();
  const { getSession, saveSession, startNewRound, startMissedCardsRound, getMissedCardIndices } =
    useFlashcardSessionStore();
  const { updateDeckProgress } = useProgressStore();
  const { updateSettings: updateStoredSettings } = useSettingsStore();
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
  const [progressionMode, setProgressionMode] = useState<'sequential' | 'shuffle' | 'level'>(
    'shuffle'
  );
  const [includeMastered, setIncludeMastered] = useState(true);

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
            setStartTime(session.startTime || Date.now());
            setIsMissedCardsRound(session.isMissedCardsRound || false);
            setProgressionMode(session.progressionMode || 'shuffle');

            // Handle includeMastered and card order
            const sessionIncludeMastered =
              session.includeMastered !== undefined ? session.includeMastered : true;
            setIncludeMastered(sessionIncludeMastered);

            // Validate card order against current mastered cards
            if (session.cardOrder && !session.isMissedCardsRound) {
              const { getMasteredCards } = useCardMasteryStore.getState();
              const masteredIndices = getMasteredCards(deckId);

              if (!sessionIncludeMastered && masteredIndices.length > 0) {
                // Filter out mastered cards from the order
                const filteredOrder = session.cardOrder.filter(
                  (idx: number) => !masteredIndices.includes(idx)
                );
                setCardOrder(filteredOrder.length > 0 ? filteredOrder : session.cardOrder);
              } else {
                setCardOrder(session.cardOrder);
              }
            } else {
              setCardOrder(
                session.cardOrder || Array.from({ length: deck.content.length }, (_, i) => i)
              );
            }
          } else {
            // Initialize new session with shuffled cards (excluding mastered if needed)
            const { getMasteredCards } = useCardMasteryStore.getState();
            const masteredIndices = getMasteredCards(deckId);
            let initialIndices = Array.from({ length: deck.content.length }, (_, i) => i);

            // Exclude mastered cards by default for new sessions
            if (masteredIndices.length > 0) {
              initialIndices = initialIndices.filter(i => !masteredIndices.includes(i));
              setIncludeMastered(false);
            }

            // Shuffle by default
            const shuffled = [...initialIndices];
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            setCardOrder(shuffled);
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
        isMissedCardsRound,
        progressionMode,
        includeMastered,
      });
    }
  }, [
    deckId,
    currentCardIndex,
    progress,
    frontSides,
    backSides,
    saveSession,
    roundNumber,
    cardOrder,
    startTime,
    isMissedCardsRound,
    progressionMode,
    includeMastered,
  ]);

  // Helper function to create card order based on progression mode
  const createCardOrder = useCallback(
    (
      deck: typeof activeDeck,
      mode: 'sequential' | 'shuffle' | 'level',
      excludeMastered: boolean = false
    ): number[] => {
      if (!deck || !deckId) return [];

      let indices = Array.from({ length: deck.content.length }, (_, i) => i);

      // Filter out mastered cards if needed
      if (excludeMastered) {
        const { getMasteredCards } = useCardMasteryStore.getState();
        const masteredIndices = getMasteredCards(deckId);
        indices = indices.filter(i => !masteredIndices.includes(i));
      }

      switch (mode) {
        case 'sequential':
          return indices;

        case 'shuffle':
          // Fisher-Yates shuffle
          const shuffled = [...indices];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;

        case 'level':
          // Sort by level, then by index within each level
          return indices.sort((a, b) => {
            const levelDiff = deck.content[a].level - deck.content[b].level;
            return levelDiff !== 0 ? levelDiff : a - b;
          });

        default:
          return indices;
      }
    },
    [deckId]
  );

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
      isMissedCardsRound,
    };

    const missedIndices = getMissedCardIndices(session);
    const totalCards = cardOrder.length > 0 ? cardOrder.length : activeDeck.content.length;
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
      endTime: Date.now(),
    };

    setCompletionResults(results);
    setShowCompletionModal(true);

    // Update progress store with the session results
    if (deckId) {
      updateDeckProgress(deckId, 'flashcards', cardsAnswered, correctCards, cardsAnswered);
    }
  }, [
    activeDeck,
    deckId,
    currentCardIndex,
    progress,
    frontSides,
    backSides,
    roundNumber,
    cardOrder,
    startTime,
    isMissedCardsRound,
    getMissedCardIndices,
    updateDeckProgress,
  ]);

  const handleNext = useCallback(() => {
    if (!activeDeck) return;

    const totalCards = cardOrder.length > 0 ? cardOrder.length : activeDeck.content.length;

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

  const markCard = useCallback(
    (status: 'correct' | 'incorrect') => {
      setProgress(prev => ({
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

  const handleContinueWithMissed = useCallback(() => {
    if (!completionResults || !deckId || !activeDeck) return;

    const missedIndices = completionResults.missedCardIndices;

    // Apply progression mode to missed cards
    let orderedMissedIndices: number[];
    if (progressionMode === 'shuffle') {
      orderedMissedIndices = [...missedIndices];
      for (let i = orderedMissedIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [orderedMissedIndices[i], orderedMissedIndices[j]] = [
          orderedMissedIndices[j],
          orderedMissedIndices[i],
        ];
      }
    } else if (progressionMode === 'level') {
      orderedMissedIndices = [...missedIndices].sort((a, b) => {
        const levelDiff = activeDeck.content[a].level - activeDeck.content[b].level;
        return levelDiff !== 0 ? levelDiff : a - b;
      });
    } else {
      orderedMissedIndices = missedIndices;
    }

    const newSession = startMissedCardsRound(deckId, orderedMissedIndices);

    // Update local state from new session
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setProgress({});
    setRoundNumber(newSession.roundNumber);
    setCardOrder(orderedMissedIndices);
    setStartTime(newSession.startTime);
    setIsMissedCardsRound(true);
    setShowCompletionModal(false);
    setCompletionResults(null);
  }, [completionResults, deckId, activeDeck, startMissedCardsRound, progressionMode]);

  const handleStartNewRound = useCallback(() => {
    if (!deckId || !activeDeck) return;

    const newSession = startNewRound(deckId, activeDeck.content.length);
    const newOrder = createCardOrder(activeDeck, progressionMode, !includeMastered);

    // Update local state from new session
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setProgress({});
    setRoundNumber(newSession.roundNumber);
    setCardOrder(newOrder);
    setStartTime(newSession.startTime);
    setIsMissedCardsRound(false);
    setShowCompletionModal(false);
    setCompletionResults(null);
  }, [deckId, activeDeck, startNewRound, createCardOrder, progressionMode, includeMastered]);

  const handleBackToDeck = useCallback(() => {
    navigate(`/deck/${deckId}`);
  }, [navigate, deckId]);

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

  const updateSettings = useCallback(
    (settings: FlashcardsSettings) => {
      const newFrontSides = settings.frontSides || frontSides;
      const newBackSides = settings.backSides || backSides;
      const newProgressionMode = settings.progressionMode || progressionMode;
      const newIncludeMastered =
        settings.includeMastered !== undefined ? settings.includeMastered : includeMastered;

      setFrontSides(newFrontSides);
      setBackSides(newBackSides);
      setIsFlipped(false);

      // Check if we need to reorder cards
      const shouldReorder =
        newProgressionMode !== progressionMode || newIncludeMastered !== includeMastered;

      if (shouldReorder && activeDeck && !isMissedCardsRound) {
        setProgressionMode(newProgressionMode);
        setIncludeMastered(newIncludeMastered);

        const newOrder = createCardOrder(activeDeck, newProgressionMode, !newIncludeMastered);
        setCardOrder(newOrder);
        // Reset to first card when changing settings
        setCurrentCardIndex(0);
        setProgress({});
      } else {
        setProgressionMode(newProgressionMode);
        setIncludeMastered(newIncludeMastered);
      }

      // Save settings to store
      if (deckId) {
        updateStoredSettings(deckId, 'flashcards', settings);
      }
    },
    [
      progressionMode,
      includeMastered,
      activeDeck,
      isMissedCardsRound,
      createCardOrder,
      frontSides,
      backSides,
      deckId,
      updateStoredSettings,
    ]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
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

  if (!activeDeck) {
    return <LoadingScreen />;
  }

  // Get the actual card based on the card order (always use cardOrder for proper shuffling)
  const actualCardIndex = cardOrder.length > 0 ? cardOrder[currentCardIndex] : currentCardIndex;
  const currentCard = activeDeck.content[actualCardIndex];
  const totalCards = cardOrder.length > 0 ? cardOrder.length : activeDeck.content.length;
  const progressPercentage = (Object.keys(progress).length / totalCards) * 100;
  const correctCount = Object.values(progress).filter(p => p === 'correct').length;
  const incorrectCount = Object.values(progress).filter(p => p === 'incorrect').length;

  return (
    <div className={styles.container}>
      <SharedModeHeader
        deckName={activeDeck.metadata.deck_name}
        currentCard={currentCardIndex + 1}
        totalCards={totalCards}
        onBackClick={() => {
          // Session is automatically saved via useEffect
          navigate(`/deck/${deckId}`);
        }}
        onSettingsClick={() => setShowSettings(true)}
        showSettings={true}
        subtitle={[
          isMissedCardsRound ? 'Review' : null,
          roundNumber > 1 ? `Round ${roundNumber}` : null,
        ]
          .filter(Boolean)
          .join(' ')}
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

      <UnifiedSettings
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        deck={activeDeck}
        mode="flashcards"
        settings={
          {
            frontSides,
            backSides,
            progressionMode,
            includeMastered,
            enableTimer: false,
            timerSeconds: 30,
            enableAudio: false,
            groupSides: {},
          } as FlashcardsSettings
        }
        onUpdateSettings={
          updateSettings as (
            settings: FlashcardsSettings | LearnModeSettings | ModeSettings
          ) => void
        }
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
