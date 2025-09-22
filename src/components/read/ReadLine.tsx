import { FC, useMemo, useCallback } from 'react';
import { Deck, ReadingLine, ReadModeSettings } from '@/types';
import { tokenizeLine } from '@/utils/tokenize';
import { ReadToken } from './ReadToken';
import styles from './ReadLine.module.css';

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
  onTokenClick: (tokenIndex: number) => void;
  onTokenComplete: () => void;
}

export const ReadLine: FC<Props> = ({
  line,
  deck,
  session,
  settings,
  onTokenClick,
  onTokenComplete
}) => {
  // Tokenize the line based on configuration
  const lineTokens = useMemo(() => {
    const config = deck.reading?.tokenization || {
      unit: {
        a: 'character',
        b: 'space',
        c: 'space',
        d: undefined,
        e: undefined,
        f: undefined
      },
      preservePunctuation: true
    };

    return tokenizeLine(line, config);
  }, [line, deck]);

  // Get the tokens for the source side (what the user sees)
  const sourceTokens = useMemo(() => {
    const sourceSide = settings.translationDirection.from;
    return lineTokens[sourceSide] || [];
  }, [lineTokens, settings]);

  // Get the tokens for the target side (what the user translates to)
  const targetTokens = useMemo(() => {
    const targetSide = settings.translationDirection.to;
    return lineTokens[targetSide] || [];
  }, [lineTokens, settings]);

  // Get pinyin tokens if available
  const pinyinTokens = useMemo(() => {
    return lineTokens['b'] || [];
  }, [lineTokens]);

  // Get the aligned target text for each source token
  // With word alignments, this becomes a simple 1:1 mapping
  const getTargetForSourceToken = useCallback((sourceIndex: number) => {
    if (!targetTokens.length) return '';

    // With word alignments, we have perfect 1:1 correspondence
    const targetToken = targetTokens[sourceIndex];
    return targetToken?.text || '';
  }, [targetTokens]);

  // Similar for pinyin alignment
  const getPinyinForSourceToken = useCallback((sourceIndex: number) => {
    if (!pinyinTokens.length) return '';

    // With word alignments, we have perfect 1:1 correspondence
    const pinyinToken = pinyinTokens[sourceIndex];
    return pinyinToken?.text || '';
  }, [pinyinTokens]);

  // Get side labels
  const getSideLabel = useCallback((sideId: string) => {
    if (!deck.reading?.sides) {
      // Default labels if not specified
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

  // Handle token click - select the token
  const handleTokenClick = useCallback((tokenIndex: number) => {
    onTokenClick(tokenIndex);
  }, [onTokenClick]);

  // Handle token completion - advance to next
  const handleTokenComplete = useCallback(() => {
    onTokenComplete();
  }, [onTokenComplete]);

  return (
    <div className={styles.container}>
      <div className={styles.lineHeader}>
        <span className={styles.lineNumber}>Line {session.currentLineIndex + 1}</span>
        <span className={styles.translationDirection}>
          {getSideLabel(settings.translationDirection.from)} → {getSideLabel(settings.translationDirection.to)}
        </span>
      </div>

      <div className={styles.lineContent}>
        {/* Source side - what the user sees */}
        <div className={styles.sourceSide}>
          <div className={styles.sideLabel}>{getSideLabel(settings.translationDirection.from)}</div>
          <div className={styles.tokens}>
            {sourceTokens.map((token, index) => (
              <ReadToken
                key={`${session.currentLineIndex}-${index}`}
                token={token}
                index={index}
                isActive={session.currentTokenIndex === index}
                isCompleted={false} // Will be implemented with progress tracking
                onClick={() => handleTokenClick(index)}
                onComplete={handleTokenComplete}
                settings={settings}
                sourceText={token.text}
                targetText={getTargetForSourceToken(index)}
                pinyinText={session.showPinyin ? getPinyinForSourceToken(index) : ''}
                translationText={session.showTranslation ? getTargetForSourceToken(index) : ''}
              />
            ))}
          </div>
        </div>

        {/* Show additional sides if enabled */}
        {session.showPinyin && line.b && (
          <div className={styles.additionalSide}>
            <div className={styles.sideLabel}>Pinyin</div>
            <div className={styles.sideText}>{line.b}</div>
          </div>
        )}

        {session.showTranslation && (
          <div className={styles.additionalSide}>
            <div className={styles.sideLabel}>{getSideLabel(settings.translationDirection.to)}</div>
            <div className={styles.sideText}>{line[settings.translationDirection.to] || ''}</div>
          </div>
        )}
      </div>
    </div>
  );
};