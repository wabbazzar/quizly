import { FC, memo, useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
// import { useDeckStore } from '@/store/deckStore'; // Will be used in later phases
import { useCardMasteryStore } from '@/store/cardMasteryStore';
import { useMatchSessionStore } from '@/store/matchSessionStore';
import { useMatchBestTimesStore } from '@/store/matchBestTimesStore';
import { useNotificationStore } from '@/store/notificationStore';
import { SharedModeHeader } from '@/components/common/SharedModeHeader';
import { LoadingScreen } from '@/components/ui';
import { UnifiedSettings } from '@/components/modals/UnifiedSettings';
import MatchGrid from './MatchGrid';
// Timer disabled for now
// import MatchTimer from './MatchTimer';
import MatchResults from './MatchResults';
// import useMatchLogic from './hooks/useMatchLogic'; // Will be used in later phases
import {
  MatchContainerProps,
  DEFAULT_MATCH_SETTINGS,
  MatchResults as MatchResultsData,
  MatchSettings,
} from './types';
import {
  pauseOverlayVariants,
} from './animations/matchAnimations';
import {
  playMatchSuccess,
  playMatchFailure,
  playGameComplete,
  playSound,
  vibrate,
  updateAudioSettings,
} from '@/utils/soundUtils';
import styles from './MatchContainer.module.css';

const MatchContainer: FC<MatchContainerProps> = memo(({ deck }) => {
  const navigate = useNavigate();
  const { getMasteredCards } = useCardMasteryStore();
  const { updateBestTime } = useMatchBestTimesStore();
  const { showNotification } = useNotificationStore();
  const {
    session,
    startSession,
    pauseSession,
    resumeSession,
    selectCard,
    clearSelection,
    processMatch,
    generateGrid,
    loadSession,
    startNewRound,
  } = useMatchSessionStore();

  // Match logic hook (will be used in later phases)
  // const { checkMatch, validateCardSelection } = useMatchLogic();

  // Local state
  const [isInitialized, setIsInitialized] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<MatchResultsData | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [animatingCards, setAnimatingCards] = useState<string[]>([]);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // Audio settings (sync with session settings)
  const isAudioEnabled = session?.settings.enableAudio ?? false;

  // Initialize or restore session
  useEffect(() => {
    if (!deck || isInitialized) return;

    const existingSession = loadSession(deck.id);

    if (existingSession) {
      // Check if the existing session is already complete
      const allCardsMatched = existingSession.grid.every(card => card.isMatched);

      if (allCardsMatched && existingSession.grid.length > 0) {
        // Session is complete, show results immediately
        const completionTime = Date.now() - existingSession.roundStartTime;
        const gameResults: MatchResultsData = {
          deckId: existingSession.deckId,
          totalTime: completionTime,
          bestTime: null,
          isNewBest: false,
          totalMatches: existingSession.matchedPairs.length,
          missedCardIndices: existingSession.missedCardIndices,
          roundNumber: existingSession.currentRound,
          startTime: existingSession.roundStartTime,
          endTime: Date.now(),
        };

        setResults(gameResults);
        setShowResults(true);
        setIsInitialized(true);
      } else {
        // Session exists but not complete, continue playing
        setIsInitialized(true);
      }
    } else {
      // Start new session
      const masteredIndices = getMasteredCards(deck.id);
      const settings = {
        ...DEFAULT_MATCH_SETTINGS,
        includeMastered: masteredIndices.length === 0, // Include mastered only if none exist
      };

      startSession(deck.id, settings);

      // Generate initial grid
      setTimeout(() => {
        generateGrid(deck.content, settings);
        setIsInitialized(true);
      }, 100);
    }
  }, [deck, isInitialized, loadSession, startSession, generateGrid, getMasteredCards]);

  // Check for mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || 'ontouchstart' in window;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync audio settings with match settings
  useEffect(() => {
    if (session?.settings.enableAudio !== undefined) {
      updateAudioSettings({
        enabled: session.settings.enableAudio,
        soundEffects: session.settings.enableAudio,
      });
    }
  }, [session?.settings.enableAudio]);

  // Handle card selection
  const handleCardSelect = useCallback(async (cardId: string) => {
    if (!session || animatingCards.length > 0 || gameCompleted) return;

    // Play card selection sound if audio is enabled
    if (isAudioEnabled) {
      playSound('card_select', 0.8);
      vibrate(30);
    }

    selectCard(cardId);

    // Check for match when we have the right number of cards selected
    const expectedCards = session.settings.matchType === 'three_way' ? 3 : 2;

    if (session.selectedCards.length + 1 === expectedCards) {
      // We've selected enough cards, check for a match
      setTimeout(async () => {
        const result = processMatch();

        if (result.isMatch && result.matchedCards) {
          // Play match success sound if audio is enabled
          if (isAudioEnabled) {
            await playMatchSuccess(1.2);
            vibrate([50, 50, 50]);
          }

          // Show success notification
          showNotification({
            message: 'Match found! 🎉',
            type: 'success',
            duration: 1500,
          });

          setAnimatingCards(result.matchedCards);

          // Clear animation after match animation completes
          setTimeout(() => {
            setAnimatingCards([]);

            // Check if game is complete
            const remainingCards = session.grid.filter(
              card => !card.isMatched && !result.matchedCards?.includes(card.id)
            );

            if (remainingCards.length === 0) {
              handleGameComplete();
            }
          }, 600);
        } else {
          // Play match failure sound if audio is enabled
          if (isAudioEnabled) {
            await playMatchFailure();
            vibrate(100);
          }

          // Show mismatch notification
          showNotification({
            message: 'No match! Try again.',
            type: 'error',
            duration: 1500,
          });

          // Clear selection after showing the mismatch
          setTimeout(() => {
            clearSelection();
          }, 800);
        }
      }, 150);
    }
  }, [session, selectCard, processMatch, clearSelection, animatingCards, gameCompleted, showNotification]);

  // Handle game completion
  const handleGameComplete = useCallback(async () => {
    if (!session || gameCompleted) return;

    setGameCompleted(true);

    // Play game completion sound if audio is enabled
    if (isAudioEnabled) {
      await playGameComplete();
      vibrate([100, 50, 100, 50, 200]);
    }

    const completionTime = Date.now() - session.roundStartTime;
    const endTime = Date.now();

    // Update best time
    const isNewBest = updateBestTime(
      session.deckId,
      completionTime,
      session.settings.gridSize,
      session.settings.matchType,
      session.matchedPairs.length
    );

    // Create results data
    const gameResults: MatchResultsData = {
      deckId: session.deckId,
      totalTime: completionTime,
      bestTime: null, // Will be populated by MatchResults component
      isNewBest,
      totalMatches: session.matchedPairs.length,
      missedCardIndices: session.missedCardIndices,
      roundNumber: session.currentRound,
      startTime: session.roundStartTime,
      endTime,
    };

    setResults(gameResults);

    // Show results modal immediately
    setGameCompleted(false);
    setShowResults(true);
  }, [session, gameCompleted, updateBestTime]);

  // Timer disabled - formatTime removed

  // Handle pause/resume
  const handlePause = useCallback(() => {
    if (session?.isPaused) {
      resumeSession();
    } else {
      pauseSession();
    }
  }, [session, pauseSession, resumeSession]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    navigate(`/deck/${deck.id}`);
  }, [navigate, deck.id]);

  // Results modal handlers
  const handleContinueWithMissed = useCallback(() => {
    if (!session || !results) return;

    setShowResults(false);
    setResults(null);

    // Start new round with missed cards only
    startNewRound(results.missedCardIndices);
  }, [session, results, startNewRound]);

  const handleStartNewRound = useCallback(() => {
    if (!session || !deck) return;

    setShowResults(false);
    setResults(null);

    // Start completely new round
    startNewRound();

    // Generate new grid for the new round
    setTimeout(() => {
      generateGrid(deck.content, session.settings);
    }, 100);
  }, [session, deck, startNewRound, generateGrid]);

  const handleCloseResults = useCallback(() => {
    setShowResults(false);
    setResults(null);
  }, []);

  // Settings handlers
  const handleShowSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  const handleUpdateSettings = useCallback((newSettings: any) => {
    const matchSettings = newSettings as MatchSettings;
    if (!session) return;

    // Update session settings and regenerate grid if needed
    const gridSizeChanged =
      session.settings.gridSize.rows !== matchSettings.gridSize.rows ||
      session.settings.gridSize.cols !== matchSettings.gridSize.cols;

    const cardSidesChanged =
      JSON.stringify(session.settings.cardSides) !== JSON.stringify(matchSettings.cardSides);

    // If significant changes were made, regenerate grid
    if (gridSizeChanged || cardSidesChanged) {
      // Store updated settings
      session.settings = matchSettings;

      // Regenerate grid with new settings
      generateGrid(deck.content, matchSettings);
    } else {
      // Just update settings for non-grid affecting changes
      session.settings = matchSettings;
    }
  }, [session, deck, generateGrid]);

  // Memoized grid calculations
  const gridMetrics = useMemo(() => {
    if (!session || !session.grid.length) {
      return {
        totalCards: 0,
        matchedCards: 0,
        progressPercentage: 0,
        selectedCount: session?.selectedCards.length || 0,
      };
    }

    const totalCards = session.grid.length;
    const matchedCards = session.grid.filter(card => card.isMatched).length;
    const progressPercentage = (matchedCards / totalCards) * 100;
    const selectedCount = session.selectedCards.length;

    return {
      totalCards,
      matchedCards,
      progressPercentage,
      selectedCount,
    };
  }, [session]);

  // Timer functionality disabled for now

  // Calculate matched card pairs for MatchGrid
  const matchedCardPairs = useMemo(() => {
    if (!session) return [];
    return session.matchedPairs;
  }, [session]);

  // Loading state
  if (!isInitialized || !session) {
    return <LoadingScreen />;
  }

  return (
    <div className={styles.container}>
      <SharedModeHeader
        deckName={deck.metadata.deck_name}
        currentCard={gridMetrics.matchedCards}
        totalCards={gridMetrics.totalCards}
        onBackClick={handleBack}
        onSettingsClick={handleShowSettings}
        showSettings={true}
        subtitle={session.currentRound > 1 ? `Round ${session.currentRound}` : undefined}
      />

      {/* Game stats */}
      <div className={styles.gameStats}>
        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <motion.div
              className={styles.progressFill}
              initial={{ width: 0 }}
              animate={{ width: `${gridMetrics.progressPercentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className={styles.statsText}>
            <span>{gridMetrics.matchedCards} / {gridMetrics.totalCards} matched</span>
          </div>

          {/* Timer disabled for now */}
          {/* <MatchTimer
            isEnabled={timerData.enabled}
            isPaused={timerData.isPaused}
            initialTime={timerData.elapsedTime}
            onTimeChange={handleTimerUpdate}
            compact={isMobile}
            theme="primary"
            className={styles.matchTimer}
          /> */}
        </div>

        {/* Game controls */}
        <div className={styles.gameControls}>
          {/* Timer/Pause disabled for now */}
          {/* {session.settings.enableTimer && (
            <button
              className={styles.pauseButton}
              onClick={handlePause}
              aria-label={session.isPaused ? 'Resume game' : 'Pause game'}
            >
              {session.isPaused ? '▶️' : '⏸️'}
            </button>
          )} */}

          {session.selectedCards.length > 0 && (
            <button
              className={styles.clearButton}
              onClick={clearSelection}
              aria-label="Clear selection"
            >
              Clear Selection
            </button>
          )}
        </div>
      </div>

      {/* Match grid */}
      <main className={styles.gridContainer}>
        <AnimatePresence mode="wait">
          {session.isPaused ? (
            <motion.div
              key="paused"
              className={styles.pausedOverlay}
              variants={pauseOverlayVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className={styles.pausedContent}>
                <h2>Game Paused</h2>
                <button
                  className={styles.resumeButton}
                  onClick={handlePause}
                >
                  Resume Game
                </button>
              </div>
            </motion.div>
          ) : (
            <MatchGrid
              key="grid"
              cards={session.grid}
              onCardSelect={handleCardSelect}
              selectedCards={session.selectedCards}
              matchedCards={matchedCardPairs}
              gridSize={session.settings.gridSize}
              isAnimating={animatingCards.length > 0}
              animatingCards={animatingCards}
              isMobile={isMobile}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Game completion handled by MatchResults modal */}

      {/* Selection feedback */}
      {gridMetrics.selectedCount > 0 && (
        <motion.div
          className={styles.selectionFeedback}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
        >
          {gridMetrics.selectedCount} card{gridMetrics.selectedCount > 1 ? 's' : ''} selected
        </motion.div>
      )}

      {/* Results Modal */}
      <MatchResults
        visible={showResults}
        results={results}
        onContinueWithMissed={handleContinueWithMissed}
        onStartNewRound={handleStartNewRound}
        onBackToDeck={handleBack}
        onClose={handleCloseResults}
      />

      {/* Settings Modal */}
      <UnifiedSettings
        visible={showSettings}
        onClose={handleCloseSettings}
        deck={deck}
        mode="match"
        settings={session?.settings || DEFAULT_MATCH_SETTINGS}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
});

MatchContainer.displayName = 'MatchContainer';

export default MatchContainer;