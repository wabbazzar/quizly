import { FC, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDeckStore } from '@/store/deckStore';
import { useProgressStore } from '@/store/progressStore';
import { useCardMasteryStore } from '@/store/cardMasteryStore';
import LearnContainer from '@/components/modes/learn/LearnContainer';
import UnifiedSettings from '@/components/modals/UnifiedSettings';
import { useSettingsStore } from '@/store/settingsStore';
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
  // Select only the action so this component doesn't re-render on every
  // mastery mutation (mastery is updated inline during the session).
  const getMasteredCards = useCardMasteryStore(state => state.getMasteredCards);
  const { updateSettings: updateStoredSettings } = useSettingsStore();

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
    // Update progress store with the session results.
    // Per-card mastery is recorded inline during the session by LearnContainer
    // (so it has access to the question type).
    if (deckId && currentDeck) {
      const correctCards = results.correctAnswers;
      updateDeckProgress(
        deckId,
        'learn',
        results.totalQuestions,
        correctCards,
        results.totalQuestions
      );
    }

    // Navigate to results page or back to deck
    navigate(`/deck/${deckId}/results`, { state: { results, settings } });
  };

  const handleExit = () => {
    navigate(`/deck/${deckId}`);
  };

  // Filter deck content based on excludeCards and mastered cards.
  // Memoize so the object reference stays stable across renders — otherwise
  // LearnContainer's init effect (deps on `deck`) re-runs and resets the
  // session on every parent render.
  const cardsToExcludeKey = useMemo(() => {
    const base = excludeCards ? [...excludeCards] : [];
    if (!shuffleMasteredCardsBack && masteredCards.length > 0) {
      const set = new Set([...base, ...masteredCards]);
      return Array.from(set).sort((a, b) => a - b).join(',');
    }
    return base.sort((a, b) => a - b).join(',');
  }, [excludeCards, masteredCards, shuffleMasteredCardsBack]);

  const filteredDeck = useMemo(() => {
    if (!currentDeck) return currentDeck;
    if (!cardsToExcludeKey) return currentDeck;
    const excludeSet = new Set(cardsToExcludeKey.split(',').map(Number));
    return {
      ...currentDeck,
      content: currentDeck.content.filter(card => !excludeSet.has(card.idx)),
    };
  }, [currentDeck, cardsToExcludeKey]);

  if (isLoading) {
    return null; // Let PageLazyBoundary handle loading state
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
    return null; // Let PageLazyBoundary handle loading state
  }

  return (
    <div className={styles.learnPage}>
      <LearnContainer
        deck={filteredDeck as NonNullable<typeof filteredDeck>}
        settings={settings}
        strugglingCardIndices={strugglingCards}
        onComplete={handleComplete}
        onExit={handleExit}
        onOpenSettings={() => setShowSettings(true)}
        deckId={deckId}
        allDeckCards={currentDeck.content}
      />
      <UnifiedSettings
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        deck={currentDeck}
        mode="learn"
        settings={settings}
        onUpdateSettings={newSettings => {
          const learnSettings = newSettings as LearnModeSettings;
          setSettings(learnSettings);
          if (deckId) {
            updateStoredSettings(deckId, 'learn', learnSettings);
          }
        }}
      />
    </div>
  );
};

export default Learn;
