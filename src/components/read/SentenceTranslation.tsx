import { FC, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ReadingLine, ReadModeSettings, SentenceTranslationResult } from '@/types';
import { checkSentenceTranslation, generateSentenceMultipleChoice } from '@/utils/sentenceTranslation';
import { hasWordAlignments, extractAlignedTokens, AlignedToken } from '@/utils/wordAlignments';
import { Button } from '@/components/ui/Button';
import styles from './SentenceTranslation.module.css';

interface Props {
  line: ReadingLine;
  allLines: ReadingLine[]; // For generating MC distractors
  settings: ReadModeSettings;
  onAnswer: (result: SentenceTranslationResult) => void;
  onSkip?: () => void;
  showResult?: boolean;
  disabled?: boolean;
}

export const SentenceTranslation: FC<Props> = ({
  line,
  allLines,
  settings,
  onAnswer,
  onSkip,
  showResult = false,
  disabled = false
}) => {
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<SentenceTranslationResult | null>(null);

  // Get source and target text
  const sourceText = line[settings.translationDirection.from] || '';
  // const targetText = line[settings.translationDirection.to] || ''; // Used in checking

  // Generate multiple choice options
  const mcOptions = useMemo(() => {
    if (settings.answerType === 'multiple_choice') {
      return generateSentenceMultipleChoice(
        line,
        settings.translationDirection.to,
        allLines,
        settings.optionsCount || 4,
        settings.multipleChoiceDifficulty || 'medium'
      );
    }
    return [];
  }, [line, allLines, settings]);

  // Check if word alignments are available for hints
  const hasAlignments = useMemo(() => hasWordAlignments(line), [line]);
  const alignedTokens = useMemo(() => {
    return hasAlignments ? extractAlignedTokens(line) : [];
  }, [line, hasAlignments]);

  // Handle answer submission
  const handleSubmit = useCallback(() => {
    if (disabled || result) return;

    const answer = settings.answerType === 'multiple_choice' ? selectedOption || '' : userAnswer;
    const translationResult = checkSentenceTranslation(
      answer,
      line,
      settings.translationDirection.to,
      settings.accuracyThreshold || 70
    );

    setResult(translationResult);
    onAnswer(translationResult);
  }, [userAnswer, selectedOption, settings, line, onAnswer, disabled, result]);

  // Handle multiple choice selection
  const handleOptionSelect = useCallback((option: string) => {
    if (disabled || result) return;
    setSelectedOption(option);

    if (settings.checkMode === 'live') {
      // Auto-submit on selection for live mode
      setTimeout(() => {
        const translationResult = checkSentenceTranslation(
          option,
          line,
          settings.translationDirection.to,
          settings.accuracyThreshold || 70
        );
        setResult(translationResult);
        onAnswer(translationResult);
      }, 100);
    }
  }, [settings, line, onAnswer, disabled, result]);

  // Handle free text input
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (disabled || result) return;
    setUserAnswer(e.target.value);

    if (settings.checkMode === 'live' && e.target.value.trim()) {
      // Debounced live checking could go here
    }
  }, [settings, disabled, result]);

  // Handle key press for submission
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Track which token is tapped (for mobile hint display)
  const [tappedTokenIndex, setTappedTokenIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close tapped hint when clicking outside
  useEffect(() => {
    if (tappedTokenIndex === null) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTappedTokenIndex(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [tappedTokenIndex]);

  // Get the display text and hint text for a token based on translation direction
  const getTokenDisplay = useCallback((token: AlignedToken): string => {
    const from = settings.translationDirection.from;
    if (from === 'b') return token.pinyin;
    if (from === 'c') return token.english;
    return token.chinese; // default: side 'a'
  }, [settings.translationDirection.from]);

  const getTokenHint = useCallback((token: AlignedToken): string => {
    const from = settings.translationDirection.from;
    const parts: string[] = [];
    if (from !== 'a' && token.chinese) parts.push(token.chinese);
    if (from !== 'b' && token.pinyin) parts.push(token.pinyin);
    if (from !== 'c' && token.english) parts.push(token.english);
    return parts.join(' - ');
  }, [settings.translationDirection.from]);

  // Determine if a token has a meaningful hint
  const tokenHasHint = useCallback((token: AlignedToken): boolean => {
    return getTokenHint(token).length > 0;
  }, [getTokenHint]);

  // Handle token tap/click for hints
  const handleTokenTap = useCallback((index: number) => {
    if (!settings.showWordHints || !hasAlignments) return;
    setTappedTokenIndex(prev => prev === index ? null : index);
  }, [settings.showWordHints, hasAlignments]);

  // Reset when line changes
  useEffect(() => {
    setUserAnswer('');
    setSelectedOption(null);
    setResult(null);
    setTappedTokenIndex(null);
  }, [line]);

  const canSubmit = settings.answerType === 'multiple_choice'
    ? selectedOption !== null
    : userAnswer.trim().length > 0;

  return (
    <div className={styles.container}>
      {/* Source text with word hints */}
      <div className={styles.sourceSection}>
        <div className={styles.sectionLabel}>
          Translate this sentence:
        </div>
        <div className={styles.sourceText} ref={containerRef}>
           {hasAlignments && settings.showWordHints ? (
             <div className={styles.interactiveSource}>
               <div className={styles.wordTokensContainer}>
                 {alignedTokens.map((token, index) => {
                   const hint = getTokenHint(token);
                   const hasHint = tokenHasHint(token);
                   const isRevealed = tappedTokenIndex === index;
                   return (
                     <span
                       key={index}
                       className={`${styles.wordToken} ${hasHint ? styles.clickable : styles.static} ${isRevealed ? styles.revealed : ''}`}
                       onClick={() => hasHint && handleTokenTap(index)}
                     >
                       {getTokenDisplay(token)}
                       {isRevealed && hint && (
                         <span className={styles.tokenHintPopup}>{hint}</span>
                       )}
                     </span>
                   );
                 })}
               </div>
               <div className={styles.hintText}>
                 Tap words for hints
               </div>
             </div>
           ) : (
             <div className={styles.staticSource}>{sourceText}</div>
           )}
         </div>
      </div>

      {/* Answer input section */}
      <div className={styles.answerSection}>
        <div className={styles.sectionLabel}>
          Your translation:
        </div>

        {settings.answerType === 'free_text' ? (
          <div className={styles.freeTextSection}>
            <textarea
              className={`${styles.textInput} ${result ? styles.submitted : ''}`}
              value={userAnswer}
              onChange={handleTextChange}
              onKeyPress={handleKeyPress}
              placeholder="Type your translation here..."
              disabled={disabled || !!result}
              rows={3}
            />
          </div>
        ) : (
          <div className={styles.multipleChoiceSection}>
            {mcOptions.map((option, index) => (
              <button
                key={index}
                className={`${styles.option} ${
                  selectedOption === option ? styles.selected : ''
                } ${result ? (
                  option === result.correctAnswer ? styles.correct :
                  selectedOption === option ? styles.incorrect : ''
                ) : ''}`}
                onClick={() => handleOptionSelect(option)}
                disabled={disabled || !!result}
              >
                <span className={styles.optionLetter}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span className={styles.optionText}>{option}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!result && (
        <div className={styles.actions}>
          {settings.checkMode === 'wait' && (
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!canSubmit || disabled}
              className={styles.submitButton}
            >
              Check Answer
            </Button>
          )}
          {onSkip && (
            <Button
              variant="secondary"
              onClick={onSkip}
              disabled={disabled}
              className={styles.skipButton}
            >
              Skip
            </Button>
          )}
        </div>
      )}

      {/* Results display */}
      {result && showResult && (
        <div className={styles.resultSection}>
          <div className={`${styles.resultHeader} ${result.isCorrect ? styles.correct : styles.incorrect}`}>
            <div className={styles.accuracyScore}>
              {result.accuracy}% accuracy
            </div>
            <div className={styles.resultStatus}>
              {result.isCorrect ? 'Correct!' : 'Needs improvement'}
            </div>
          </div>

          {!result.isCorrect && (
            <div className={styles.correctAnswer}>
              <div className={styles.correctLabel}>Correct answer:</div>
              <div className={styles.correctText}>{result.correctAnswer}</div>
            </div>
          )}

          {result.wordMatches && result.wordMatches.length > 0 && (
            <div className={styles.wordAnalysis}>
              <div className={styles.analysisLabel}>Word analysis:</div>
              <div className={styles.wordMatches}>
                {result.wordMatches.map((match, index) => (
                  <span
                    key={index}
                    className={`${styles.wordMatch} ${match.matched ? styles.matched : styles.unmatched}`}
                    title={match.similarity ? `${Math.round(match.similarity)}% match` : undefined}
                  >
                    {match.word}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.suggestions && result.suggestions.length > 0 && (
            <div className={styles.suggestions}>
              <div className={styles.suggestionsLabel}>Alternative answers:</div>
              <div className={styles.suggestionsList}>
                {result.suggestions.map((suggestion, index) => (
                  <div key={index} className={styles.suggestion}>
                    {suggestion}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};