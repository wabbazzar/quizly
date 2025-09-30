import { FC, useMemo, useCallback } from 'react';
import { Deck, ReadingLine, ReadModeSettings, SentenceTranslationResult } from '@/types';
import { SentenceTranslation } from './SentenceTranslation';
import { AlignedReadLine } from './AlignedReadLine';
import styles from './EnhancedReadLine.module.css';

interface ReadSessionState {
  deckId: string;
  currentDialogueId: string | null;
  currentLineIndex: number;
  currentTokenIndex: number;
  showPinyin: boolean;
  showTranslation: boolean;
  correctCount: number;
  incorrectCount: number;
  startTime: number;
  responseStartTime: number;
  responseTimes: number[];
}

interface Props {
  line: ReadingLine;
  deck: Deck;
  session: ReadSessionState;
  settings: ReadModeSettings;
  allLines: ReadingLine[]; // For MC distractors
  onAnswer?: (result: SentenceTranslationResult) => void;
  onTokenClick?: (tokenIndex: number) => void;
  onTokenComplete?: () => void;
  onNext?: () => void;
  showControls?: boolean;
}

export const EnhancedReadLine: FC<Props> = ({
  line,
  deck,
  session,
  settings,
  allLines,
  onAnswer,
  onTokenClick,
  onTokenComplete,
  onNext: _onNext // Reserved for potential future auto-advance feature
  // showControls = true // Reserved for future use
}) => {
  // Get side labels
  const getSideLabel = useCallback((sideId: string) => {
    if (!deck.reading?.sides) {
      const defaultLabels: Record<string, string> = {
        a: 'Characters',
        b: 'Pinyin',
        c: 'English',
        d: 'Side D',
        e: 'Side E',
        f: 'Side F'
      };
      return defaultLabels[sideId] || sideId.toUpperCase();
    }
    return deck.reading.sides[sideId as keyof typeof deck.reading.sides] || sideId.toUpperCase();
  }, [deck]);

  // Handle sentence translation answer
  const handleSentenceAnswer = useCallback((result: SentenceTranslationResult) => {
    if (onAnswer) {
      onAnswer(result);
    }

    // Don't auto-advance - let user manually navigate with keyboard or buttons
  }, [onAnswer]);

  // Render based on translation mode
  const renderContent = useMemo(() => {
    if (settings.translationMode === 'sentence') {
      return (
        <div className={styles.sentenceMode}>
          <div className={styles.lineHeader}>
            <span className={styles.lineNumber}>Line {session.currentLineIndex + 1}</span>
            <span className={styles.translationDirection}>
              {getSideLabel(settings.translationDirection.from)} → {getSideLabel(settings.translationDirection.to)}
            </span>
          </div>

          <SentenceTranslation
            line={line}
            allLines={allLines}
            settings={settings}
            onAnswer={handleSentenceAnswer}
            showResult={true}
          />

          {/* Show additional content if enabled */}
          {(session.showPinyin || session.showTranslation) && (
            <div className={styles.additionalContent}>
              {session.showPinyin && line.b && (
                <div className={styles.additionalSide}>
                  <div className={styles.sideLabel}>Pinyin</div>
                  <div className={styles.sideText}>{line.b}</div>
                </div>
              )}
              {session.showTranslation && line[settings.translationDirection.to] && (
                <div className={styles.additionalSide}>
                  <div className={styles.sideLabel}>{getSideLabel(settings.translationDirection.to)}</div>
                  <div className={styles.sideText}>{line[settings.translationDirection.to]}</div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Fall back to token-based mode
    return (
      <AlignedReadLine
        line={line}
        deck={deck}
        session={session}
        settings={settings}
        onTokenClick={onTokenClick || (() => {})}
        onTokenComplete={onTokenComplete || (() => {})}
      />
    );
  }, [
    settings.translationMode,
    line,
    deck,
    session,
    settings,
    allLines,
    getSideLabel,
    handleSentenceAnswer,
    onTokenClick,
    onTokenComplete
  ]);

  return (
    <div className={styles.container}>
      {renderContent}
    </div>
  );
};