import { FC, useState, useCallback, useEffect, memo } from 'react';
import { Card, Deck, LearnModeSettings, LearnSessionResults } from '@/types';
import { useQuestionGenerator } from '@/hooks/useQuestionGenerator';
import { useCardScheduler } from '@/hooks/useCardScheduler';
import { useCardMasteryStore } from '@/store/cardMasteryStore';
import { useSessionState } from './hooks/useSessionState';
import { QuestionFlow } from './components/QuestionFlow';
import { FeedbackData } from './types';
import CardDetailsModal from '@/components/modals/CardDetailsModal';
import { SharedModeHeader } from '@/components/common/SharedModeHeader';
import styles from './LearnContainer.module.css';

interface LearnContainerProps {
  deck: Deck;
  settings: LearnModeSettings;
  strugglingCardIndices?: number[];
  onComplete: (results: LearnSessionResults) => void;
  onExit: () => void;
  onOpenSettings: () => void;
  deckId?: string;
  allDeckCards?: Card[];
}

const LearnContainer: FC<LearnContainerProps> = memo(
  ({
    deck,
    settings,
    strugglingCardIndices: initialStrugglingCards,
    onComplete,
    onExit,
    onOpenSettings,
    deckId,
    allDeckCards,
  }) => {
    // Use the new session state hook
    const { sessionState, updateSessionState, handleAnswer, nextQuestion, cardTracking } =
      useSessionState(deck, settings);

    // Local UI state
    const [isLoading, setIsLoading] = useState(true);
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedback, setFeedback] = useState<FeedbackData | undefined>(undefined);
    const [showCardDetailsModal, setShowCardDetailsModal] = useState(false);
    const [currentCard, setCurrentCard] = useState<Card | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState(sessionState.currentQuestion);
  const [servedCount, setServedCount] = useState(0);

    // Use existing hooks
    const {
      generateRound,
      currentQuestion: generatedQuestion,
      nextQuestion: nextGeneratedQuestion,
    } = useQuestionGenerator(deck, settings);
    const scheduler = useCardScheduler(settings);
    const { isCardMastered } = useCardMasteryStore();

    // Update current question when generator changes
    useEffect(() => {
      if (generatedQuestion) {
        setCurrentQuestion(generatedQuestion);
        updateSessionState({
          currentQuestion: generatedQuestion,
        });

        // Update current card
        const cardIndex = generatedQuestion.cardIndex;
        const card = sessionState.roundCards.find(c => c.idx === cardIndex);
        if (card) {
          setCurrentCard(card);
        }
      }
    }, [generatedQuestion, sessionState.roundCards]);

    // Initialize session on mount or settings change
    useEffect(() => {
      const initializeSession = async () => {
        setIsLoading(true);

        // Check if deck has content
        if (!deck.content || deck.content.length === 0) {
          setIsLoading(false);
          return;
        }

        // Get scheduled cards
        const cardsToLearn: Card[] = [];

        // First, add struggling cards if provided
        if (initialStrugglingCards && initialStrugglingCards.length > 0) {
          const strugglingCards = initialStrugglingCards
            .map(idx => deck.content.find(c => c.idx === idx))
            .filter((c): c is Card => c !== undefined);
          cardsToLearn.push(...strugglingCards);
        }

        // If we need more cards to reach cardsPerRound, add new cards
        if (cardsToLearn.length < settings.cardsPerRound) {
          // Get cards that aren't already in the struggling list
          const strugglingIndices = new Set(initialStrugglingCards || []);
          const availableCards = deck.content.filter(card => !strugglingIndices.has(card.idx));

          // Use scheduler to select additional cards
          const additionalCards = scheduler.scheduleCards(availableCards);
          const cardsNeeded = settings.cardsPerRound - cardsToLearn.length;
          cardsToLearn.push(...additionalCards.slice(0, cardsNeeded));
        }

        if (cardsToLearn.length === 0) {
          setIsLoading(false);
          return;
        }

        // Take only the cards per round setting (in case we have more struggling cards than the round size)
        const roundCards = cardsToLearn.slice(0, settings.cardsPerRound);

        // Generate questions for the round
        generateRound(roundCards, allDeckCards || deck.content);

        // Update session state with round cards
        updateSessionState({
          roundCards,
          responseStartTime: Date.now(),
        });

        // Reset served counter for new round
        setServedCount(0);

        setIsLoading(false);
      };

      initializeSession();
    }, [deck, settings, initialStrugglingCards]);

    // Handle answer submission
    const handleAnswerSubmit = useCallback(
      (answer: string, isCorrect: boolean, cardIdx: number) => {
        // Update session state
        handleAnswer(answer, isCorrect, cardIdx);

        // Check if card is mastered
        const isMastered = deckId ? isCardMastered(deckId, cardIdx) : false;

        // Set feedback
        setFeedback({
          isCorrect,
          correctAnswer: sessionState.currentQuestion?.correctAnswer || '',
          explanation: sessionState.currentQuestion?.explanation,
          isMastered,
        });
        setShowFeedback(true);
      },
      [handleAnswer, deckId, isCardMastered, sessionState.currentQuestion]
    );

    // Handle moving to next question
    const handleQuestionComplete = useCallback(() => {
      // Hard cap session to the number of round cards, regardless of generated follow-ups
      const targetCount = sessionState.roundCards.length || 0;
      if (servedCount + 1 >= targetCount) {
        const totalAnswered = sessionState.correctCards.size + sessionState.incorrectCards.size;
        const accuracyPercent =
          totalAnswered > 0 ? (sessionState.correctCards.size / totalAnswered) * 100 : 0;

        const results: LearnSessionResults = {
          deckId: deckId || '',
          totalQuestions: totalAnswered,
          correctAnswers: sessionState.correctCards.size,
          incorrectAnswers: sessionState.incorrectCards.size,
          accuracy: accuracyPercent,
          averageResponseTime:
            sessionState.responseTimes.length > 0
              ? sessionState.responseTimes.reduce((a, b) => a + b, 0) / sessionState.responseTimes.length
              : 0,
          maxStreak: sessionState.maxStreak,
          duration: Date.now() - sessionState.startTime,
          passedCards: Array.from(sessionState.correctCards),
          strugglingCards: Array.from(cardTracking.strugglingCardIndices),
          masteredCards: Array.from(cardTracking.masteredCardIndices),
        };
        onComplete(results);
        return;
      }

      // Reset feedback BEFORE advancing so next question doesn't inherit feedback state
      setShowFeedback(false);
      setFeedback(undefined);

      // Advance question generators/state
      nextGeneratedQuestion();
      nextQuestion();
      setServedCount(prev => prev + 1);
    }, [
      sessionState,
      cardTracking,
      deckId,
      nextGeneratedQuestion,
      nextQuestion,
      onComplete,
      servedCount,
    ]);

    // Handle showing card details
    const handleShowCardDetails = useCallback((card: Card) => {
      setCurrentCard(card);
      setShowCardDetailsModal(true);
    }, []);

    // Handle settings click
    const handleSettingsClick = useCallback(() => {
      onOpenSettings();
    }, [onOpenSettings]);

    if (isLoading) {
      return (
        <div className={styles.container}>
          <div className={styles.loading}>Loading questions...</div>
        </div>
      );
    }

    if (sessionState.roundCards.length === 0) {
      return (
        <div className={styles.container}>
          <div className={styles.emptyState}>
            <h2>No cards available</h2>
            <p>Adjust your settings to include more cards.</p>
            <button onClick={onOpenSettings} className={styles.settingsButton}>
              Open Settings
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.container}>
        <SharedModeHeader
          deckName={deck.metadata.deck_name}
          currentCard={servedCount + 1}
          totalCards={sessionState.roundCards.length}
          onBackClick={onExit}
          onSettingsClick={handleSettingsClick}
          showSettings={true}
        />

        {/* Question Flow */}
        <QuestionFlow
          sessionState={sessionState}
          deck={deck}
          settings={settings}
          currentCard={currentCard}
          currentQuestion={currentQuestion}
          showFeedback={showFeedback}
          feedback={feedback}
          onAnswerSubmit={handleAnswerSubmit}
          onQuestionComplete={handleQuestionComplete}
          onShowCardDetails={handleShowCardDetails}
        />

        {/* Card Details Modal */}
        {showCardDetailsModal && currentCard && (
          <CardDetailsModal
            card={currentCard}
            visible={showCardDetailsModal}
            onClose={() => setShowCardDetailsModal(false)}
            frontSides={settings.frontSides}
            backSides={settings.backSides}
          />
        )}
      </div>
    );
  }
);

export default LearnContainer;
