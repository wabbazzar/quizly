import { FC, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDeckStore } from '@/store/deckStore';
import LoadingScreen from '@/components/common/LoadingScreen';
import LearnContainer from '@/components/modes/learn/LearnContainer';
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
  frontSides: ['side_a'],
  backSides: ['side_b'],
  enableTimer: false,
  enableAudio: false,
  randomize: true,
  progressionMode: 'sequential',
};

const Learn: FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { currentDeck, loadDeck, isLoading, error } = useDeckStore();

  useEffect(() => {
    if (deckId) {
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
    // Navigate to results page or back to deck
    navigate(`/deck/${deckId}/results`, { state: { results } });
  };

  const handleExit = () => {
    navigate('/');
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !currentDeck) {
    return (
      <div className={styles.errorContainer}>
        <h2>Unable to Load Deck</h2>
        <p>{error || 'Deck not found'}</p>
        <button onClick={() => navigate('/')} className={styles.backButton}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className={styles.learnPage}>
      <LearnContainer
        deck={currentDeck}
        settings={defaultLearnSettings}
        onComplete={handleComplete}
        onExit={handleExit}
      />
    </div>
  );
};

export default Learn;