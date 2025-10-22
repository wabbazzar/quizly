import { FC, useMemo, useCallback } from 'react';
import { Deck, ReadingLine, ReadModeSettings } from '@/types';
import {
  hasWordAlignments,
  createInteractiveTokens
} from '@/utils/wordAlignments';
import { tokenizeLine } from '@/utils/tokenize';
import { ReadToken } from './ReadToken';
import styles from './AlignedReadLine.module.css';

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

export const AlignedReadLine: FC<Props> = ({
  line,
  deck,
  session,
  settings,
  onTokenClick,
  onTokenComplete
}) => {
  // Check if we have word alignments for this line
  const hasAlignments = useMemo(() => hasWordAlignments(line), [line]);

  // Get aligned tokens if available
  const alignedTokens = useMemo(() => {
    if (hasAlignments) {
      return createInteractiveTokens(line);
    }
    return [];
  }, [line, hasAlignments]);



  // Fall back to traditional tokenization if no alignments
  const lineTokens = useMemo(() => {
    if (hasAlignments) return null; // Don't compute if we have alignments

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
  }, [line, deck, hasAlignments]);

  // Get tokens for interactive mode - use wordAlignments if available, fallback to traditional
  const sourceTokens = useMemo(() => {
    if (hasAlignments && alignedTokens.length > 0) {
      // Convert aligned tokens to traditional token format for ReadToken components
      const tokens = alignedTokens.map((alignedToken, index) => ({
        text: alignedToken.chinese,
        start: index,
        end: index + 1
      }));
      return tokens;
    }

    if (!lineTokens) return [];
    const sourceSide = settings.translationDirection.from;
    return lineTokens[sourceSide] || [];
  }, [hasAlignments, alignedTokens, lineTokens, settings]);

  const targetTokens = useMemo(() => {
    if (hasAlignments && alignedTokens.length > 0) {
      // Convert aligned tokens to traditional token format
      const targetSide = settings.translationDirection.to;
      return alignedTokens.map((alignedToken, index) => ({
        text: targetSide === 'b' ? alignedToken.pinyin : alignedToken.english,
        start: index,
        end: index + 1
      }));
    }

    if (!lineTokens) return [];
    const targetSide = settings.translationDirection.to;
    return lineTokens[targetSide] || [];
  }, [hasAlignments, alignedTokens, lineTokens, settings]);

  const pinyinTokens = useMemo(() => {
    if (hasAlignments && alignedTokens.length > 0) {
      // Convert aligned tokens to traditional token format for pinyin
      return alignedTokens.map((alignedToken, index) => ({
        text: alignedToken.pinyin,
        start: index,
        end: index + 1
      }));
    }

    if (!lineTokens) return [];
    return lineTokens['b'] || [];
  }, [hasAlignments, alignedTokens, lineTokens]);


  // Traditional token click handler
  const handleTokenClick = useCallback((tokenIndex: number) => {
    onTokenClick(tokenIndex);
  }, [onTokenClick]);

  // Traditional token completion handler
  const handleTokenComplete = useCallback(() => {
    onTokenComplete();
  }, [onTokenComplete]);

  // Get target text for tokens (now supports wordAlignment-based tokens)
  const getTargetForSourceToken = useCallback((sourceIndex: number) => {
    if (!targetTokens.length) return '';
    const targetToken = targetTokens[sourceIndex];
    return targetToken?.text || '';
  }, [targetTokens]);

  // Get pinyin for tokens (now supports wordAlignment-based tokens)
  const getPinyinForSourceToken = useCallback((sourceIndex: number) => {
    if (!pinyinTokens.length) return '';
    const pinyinToken = pinyinTokens[sourceIndex];
    return pinyinToken?.text || '';
  }, [pinyinTokens]);

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

  return (
    <div className={styles.container}>
      <div className={styles.lineHeader}>
        <span className={styles.lineNumber}>Line {session.currentLineIndex + 1}</span>
        <span className={styles.translationDirection}>
          {getSideLabel(settings.translationDirection.from)} → {getSideLabel(settings.translationDirection.to)}
        </span>
        {hasAlignments && (
          <span className={styles.alignmentBadge}>Word Aligned</span>
        )}
      </div>

      <div className={styles.lineContent}>
        {/* Always use interactive ReadToken components for token-by-token practice */}
        {/* Now uses wordAlignment-based tokens when available for correct boundaries */}
        <div className={styles.sourceSide}>
          <div className={styles.sideLabel}>
            {getSideLabel(settings.translationDirection.from)}
            {hasAlignments && (
              <span className={styles.alignmentBadge}>Word Aligned</span>
            )}
          </div>
          <div className={styles.tokens}>
            {sourceTokens.map((token, index) => (
              <ReadToken
                key={`${session.currentLineIndex}-${index}`}
                token={token}
                index={index}
                isActive={session.currentTokenIndex === index}
                isCompleted={false}
                onClick={() => handleTokenClick(index)}
                onClose={() => handleTokenClick(-1)} // Deactivate by setting to -1
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

        {/* Show additional sides if enabled and not using word alignments */}
        {!hasAlignments && session.showPinyin && line.b && (
          <div className={styles.additionalSide}>
            <div className={styles.sideLabel}>Pinyin</div>
            <div className={styles.sideText}>{line.b}</div>
          </div>
        )}

        {!hasAlignments && session.showTranslation && (
          <div className={styles.additionalSide}>
            <div className={styles.sideLabel}>{getSideLabel(settings.translationDirection.to)}</div>
            <div className={styles.sideText}>{line[settings.translationDirection.to] || ''}</div>
          </div>
        )}

        {/* For aligned content, show full sentences when enabled */}
        {hasAlignments && (session.showPinyin || session.showTranslation) && (
          <div className={styles.fullSentences}>
            {session.showPinyin && line.b && (
              <div className={styles.fullSentence}>
                <div className={styles.sideLabel}>Full Pinyin</div>
                <div className={styles.sideText}>{line.b}</div>
              </div>
            )}
            {session.showTranslation && line.c && (
              <div className={styles.fullSentence}>
                <div className={styles.sideLabel}>Full Translation</div>
                <div className={styles.sideText}>{line.c}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};