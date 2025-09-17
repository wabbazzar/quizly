import { FC, useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDeckStore } from '@/store/deckStore';
import { useProgressStore } from '@/store/progressStore';
import { useCardMasteryStore } from '@/store/cardMasteryStore';
import LoadingScreen from '@/components/common/LoadingScreen';
import LearnContainer from '@/components/modes/learn/LearnContainer';
import LearnSettings from '@/components/modals/LearnSettings';
import { LearnModeSettings, LearnSessionResults } from '@/types';
import styles from './Learn.module.css';

const defaultLearnSettings: LearnModeSettings = {
  questionTypes: ['multiple_choice', 'free_text'],
  adaptiveDifficulty: true,
  cardsPerRound: 10,
  masteryThreshold: 3,
  schedulingAlgorithm: 'smart_spaced',
  aggressiveness: 'balanced',
  minSpacing: 2,
  maxSpacing: 8,
  clusterLimit: 2,
  progressRatio: 0.3,
  difficultyWeight: 0.5,
  questionSides: ['side_a'],
  answerSides: ['side_b'],
  frontSides: ['side_a'],
  backSides: ['side_b'],
  enableTimer: false,
  enableAudio: false,
  randomize: true,
  progressionMode: 'sequential',
  questionTypeMix: 'auto',
  timerSeconds: 30,
  progressiveLearning: 'spaced',
  progressiveLearningSpacing: 3,
};

const Learn: FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentDeck, loadDeck, isLoading, error, shuffleMasteredCardsBack } = useDeckStore();
  const { updateDeckProgress } = useProgressStore();
  const { updateCardAttempt, getMasteredCards } = useCardMasteryStore();

  // Get excluded cards and struggling cards from navigation state
  const excludeCards = location.state?.excludeCards as number[] | undefined;
  const strugglingCards = location.state?.strugglingCards as number[] | undefined;

  // Get mastered cards for filtering from the NEW cardMasteryStore (unless shuffle back is enabled)
  const masteredCards = deckId ? getMasteredCards(deckId) : [];

  // Load settings from localStorage or use defaults
  const [settings, setSettings] = useState<LearnModeSettings>(() => {
    const savedSettings = localStorage.getItem('learnModeSettings');
    if (savedSettings) {
      try {
        return { ...defaultLearnSettings, ...JSON.parse(savedSettings) };
      } catch (e) {
        console.error('Failed to parse saved settings:', e);
      }
    }
    return defaultLearnSettings;
  });

  const [showSettings, setShowSettings] = useState(false);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('learnModeSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (deckId) {
      // Always reload the deck to ensure fresh data after refresh
      loadDeck(deckId);
    }
  }, [deckId, loadDeck]);

  // Prevent body scrolling on mobile
  useEffect(() => {
    document.body.classList.add('no-scroll');

    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, []);

  const handleComplete = (results: LearnSessionResults) => {
    // Update progress store with the session results
    if (deckId && currentDeck) {
      const totalCards = currentDeck.content.length;
      const correctCards = results.correctAnswers;

      // Update card mastery for each card that was answered correctly
      // Pass the masteryThreshold from settings
      const masteryThreshold = settings.masteryThreshold || 3;

      if (results.passedCards) {
        results.passedCards.forEach((cardIndex) => {
          updateCardAttempt(deckId, cardIndex, true, totalCards, masteryThreshold);
        });
      }

      if (results.strugglingCards) {
        results.strugglingCards.forEach((cardIndex) => {
          updateCardAttempt(deckId, cardIndex, false, totalCards, masteryThreshold);
        });
      }

      updateDeckProgress(
        deckId,
        'learn',
        results.totalQuestions,
        correctCards,
        results.totalQuestions
      );
    }

    // Navigate to results page or back to deck
    navigate(`/deck/${deckId}/results`, { state: { results } });
  };

  const handleExit = () => {
    navigate(`/deck/${deckId}`);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !currentDeck) {
    return (
      <div className={styles.errorContainer}>
        <h2>Unable to Load Deck</h2>
        <p>{error || 'Deck not found'}</p>
        <button onClick={() => navigate(`/deck/${deckId}`)} className={styles.backButton}>
          Back to Deck
        </button>
      </div>
    );
  }

  // Check if deck content is loaded
  if (!currentDeck.content || currentDeck.content.length === 0) {
    return <LoadingScreen />;
  }

  // Filter deck content based on excludeCards and mastered cards
  let cardsToExclude = excludeCards || [];

  // If shuffle is NOT enabled, exclude mastered cards
  if (!shuffleMasteredCardsBack && masteredCards.length > 0) {
    cardsToExclude = [...new Set([...cardsToExclude, ...masteredCards])];
  }

  const filteredDeck = cardsToExclude.length > 0
    ? {
        ...currentDeck,
        content: currentDeck.content.filter(
          (_card, index) => !cardsToExclude.includes(index)
        )
      }
    : currentDeck;

  return (
    <div className={styles.learnPage}>
      <LearnContainer
        deck={filteredDeck}
        settings={settings}
        strugglingCardIndices={strugglingCards}
        onComplete={handleComplete}
        onExit={handleExit}
        onOpenSettings={() => setShowSettings(true)}
        deckId={deckId}
        allDeckCards={currentDeck.content}
      />
      <LearnSettings
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        deck={currentDeck}
        settings={settings}
        onUpdateSettings={setSettings}
      />
    </div>
  );
};

export default Learn;