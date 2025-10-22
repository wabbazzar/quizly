import { FC, useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDeckStore } from '@/store/deckStore';
import { useReadStore } from '@/store/readStore';
import { SentenceTranslationResult } from '@/types';
import { PageHeader } from '@/components/common/PageHeader';
import { ReadDialoguePicker } from '@/components/read/ReadDialoguePicker';
import { EnhancedReadLine } from '@/components/read/EnhancedReadLine';
import { ReadControls } from '@/components/read/ReadControls';
import { ReadProgress } from '@/components/read/ReadProgress';
import UnifiedSettings from '@/components/modals/UnifiedSettings';
import SettingsIcon from '@/components/icons/SettingsIcon';
import { Button } from '@/components/ui/Button';
import styles from './Read.module.css';

const Read: FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  // Store hooks
  const { currentDeck, isLoading, error, loadDeck } = useDeckStore();
  const {
    session,
    settings,
    initSession,
    setCurrentDialogue,
    setCurrentLine,
    setCurrentToken,
    togglePinyin,
    toggleTranslation,
    recordAnswer,
    getProgress
  } = useReadStore();


  // Local state
  const [showSettings, setShowSettings] = useState(false);
  const [selectedDialogueId, setSelectedDialogueId] = useState<string | null>(null);

  // Load deck on mount
  useEffect(() => {
    if (deckId) {
      loadDeck(deckId);
    }
  }, [deckId, loadDeck]);

  // Initialize session when deck loads
  useEffect(() => {
    if (currentDeck?.reading && deckId) {
      const dialogueIds = Object.keys(currentDeck.reading.dialogues);
      if (dialogueIds.length > 0) {
        // Check for saved progress
        const savedProgress = getProgress(deckId);
        const dialogueId = savedProgress?.dialogueId || dialogueIds[0];

        // Always set the selected dialogue (even if session exists)
        setSelectedDialogueId(dialogueId);

        // Only initialize session if it doesn't exist
        if (!session) {
          initSession(deckId, dialogueId);
        }
      }
    }
  }, [currentDeck, deckId, initSession, getProgress]);

  // Restore progress when session initializes
  useEffect(() => {
    if (session && deckId && session.currentLineIndex === 0 && session.currentTokenIndex === 0) {
      const savedProgress = getProgress(deckId);
      if (savedProgress && savedProgress.lineIndex > 0) {
        setCurrentLine(savedProgress.lineIndex);
        setCurrentToken(savedProgress.tokenIndex);
      }
    }
  }, [session?.currentDialogueId]); // Only run when dialogue changes

  // Get current dialogue and line data
  const currentDialogue = useMemo(() => {
    if (!currentDeck?.reading || !selectedDialogueId) return null;
    return currentDeck.reading.dialogues[selectedDialogueId];
  }, [currentDeck, selectedDialogueId]);

  const currentLine = useMemo(() => {
    if (!currentDialogue || !session) return null;
    return currentDialogue.lines[session.currentLineIndex];
  }, [currentDialogue, session]);

  // Get all lines for MC generation
  const allLines = useMemo(() => {
    if (!currentDialogue) return [];
    return currentDialogue.lines;
  }, [currentDialogue]);

  // Handle dialogue selection
  const handleSelectDialogue = useCallback((dialogueId: string) => {
    setSelectedDialogueId(dialogueId);
    setCurrentDialogue(dialogueId);
    setCurrentLine(0);
    setCurrentToken(0);
  }, [setCurrentDialogue, setCurrentLine, setCurrentToken]);

  // Handle navigation
  const handlePreviousLine = useCallback(() => {
    if (!session) return;

    if (session.currentLineIndex > 0) {
      setCurrentLine(session.currentLineIndex - 1);
      setCurrentToken(0);
    }
  }, [session, setCurrentLine, setCurrentToken]);

  const handleNextLine = useCallback(() => {
    if (!session || !currentDialogue) return;

    if (session.currentLineIndex < currentDialogue.lines.length - 1) {
      setCurrentLine(session.currentLineIndex + 1);
      setCurrentToken(0);
    }
  }, [session, currentDialogue, setCurrentLine, setCurrentToken]);

  // Handle sentence translation answer
  const handleSentenceAnswer = useCallback((result: SentenceTranslationResult) => {
    if (!session) return;

    const responseTime = Date.now() - session.responseStartTime;
    recordAnswer(result.isCorrect, responseTime);

  }, [session, recordAnswer]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          (target as any).isContentEditable)
      ) {
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          handlePreviousLine();
          break;
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          handleNextLine();
          break;
        case 'r':
          e.preventDefault();
          togglePinyin();
          break;
        case 't':
          e.preventDefault();
          toggleTranslation();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePreviousLine, handleNextLine, togglePinyin, toggleTranslation]);

  // Handle cleanup
  useEffect(() => {
    return () => {
      // Save progress when leaving
      if (session && deckId) {
        // Progress is already saved in the store
      }
    };
  }, [session, deckId]);

  // Loading state - removed LoadingScreen to avoid duplicate with PageLazyBoundary
  if (isLoading) {
    return null; // Let PageLazyBoundary handle loading state
  }

  // Error state
  if (error || !currentDeck) {
    return (
      <div className={styles.errorContainer}>
        <h2>Unable to load deck</h2>
        <p>The deck could not be loaded. Please try again.</p>
        <button onClick={() => navigate('/')} className={styles.backButton}>
          Back to Home
        </button>
      </div>
    );
  }

  // Check if deck has reading content
  if (!currentDeck.reading || Object.keys(currentDeck.reading.dialogues).length === 0) {
    return (
      <div className={styles.errorContainer}>
        <h2>No reading content available</h2>
        <p>This deck doesn't have any reading dialogues. Please choose a different deck.</p>
        <button onClick={() => navigate(`/deck/${deckId}`)} className={styles.backButton}>
          Back to Deck
        </button>
      </div>
    );
  }

  return (
    <div className={styles.readPage}>
      <PageHeader
        title={currentDeck.metadata.deck_name}
        subtitle="Read Mode"
        onBackClick={() => navigate(`/deck/${deckId}`)}
        backLabel="Back to Deck"
        rightContent={
          <Button
            variant="secondary"
            size="small"
            onClick={() => setShowSettings(true)}
            className={styles.settingsButton}
          >
            <SettingsIcon size={20} />
          </Button>
        }
      />

      <div className={styles.container}>
        <div className={styles.leftPanel}>
          <ReadDialoguePicker
            deck={currentDeck}
            selectedDialogueId={selectedDialogueId}
            onSelectDialogue={handleSelectDialogue}
            progress={getProgress(deckId || '')}
          />
        </div>

        <div className={styles.mainPanel}>
          {session && currentDialogue && currentLine && (
            <>
              <ReadProgress
                currentLineIndex={session.currentLineIndex}
                totalLines={currentDialogue.lines.length}
                correctCount={session.correctCount}
                incorrectCount={session.incorrectCount}
              />

              <EnhancedReadLine
                line={currentLine}
                deck={currentDeck}
                session={session}
                settings={settings}
                allLines={allLines}
                onAnswer={handleSentenceAnswer}
                onNext={handleNextLine}
                onTokenClick={(tokenIndex: number) => {
                  // Set the current token when clicked
                  setCurrentToken(tokenIndex);
                }}
                onTokenComplete={() => {
                  // Advance to next token when current one is completed
                  if (!session || !currentDialogue) return;

                  const nextTokenIndex = session.currentTokenIndex + 1;
                  const currentLine = currentDialogue.lines[session.currentLineIndex];

                  // Check if we have wordAlignments to determine max tokens
                  const maxTokens = currentLine.wordAlignments ?
                    currentLine.wordAlignments.length :
                    (currentLine.a?.length || 0);


                  if (nextTokenIndex < maxTokens) {
                    // Move to next token in same line
                    setCurrentToken(nextTokenIndex);
                  } else {
                    // Move to next line if available
                    if (session.currentLineIndex < currentDialogue.lines.length - 1) {
                      handleNextLine();
                    }
                  }
                }}
              />

              {settings.translationMode === 'token' && (
                <ReadControls
                  canGoPrevious={session.currentLineIndex > 0}
                  canGoNext={session.currentLineIndex < currentDialogue.lines.length - 1}
                  showPinyin={session.showPinyin}
                  showTranslation={session.showTranslation}
                  onPrevious={handlePreviousLine}
                  onNext={handleNextLine}
                  onTogglePinyin={togglePinyin}
                  onToggleTranslation={toggleTranslation}
                />
              )}

              {settings.translationMode === 'sentence' && (
                <div className={styles.sentenceControls}>
                  <button
                    onClick={handlePreviousLine}
                    disabled={session.currentLineIndex === 0}
                    className={styles.navButton}
                  >
                    ← Previous Sentence
                  </button>
                  <button
                    onClick={handleNextLine}
                    disabled={session.currentLineIndex >= currentDialogue.lines.length - 1}
                    className={styles.navButton}
                  >
                    Next Sentence →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showSettings && (
        <UnifiedSettings
          visible={showSettings}
          onClose={() => setShowSettings(false)}
          mode="read"
          deck={currentDeck}
          settings={settings}
          onUpdateSettings={(newSettings) => {
            useReadStore.getState().updateSettings(newSettings as any);
          }}
        />
      )}
    </div>
  );
};

export default Read;