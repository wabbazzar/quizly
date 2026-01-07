import { FC, useState, useCallback, useMemo, useEffect } from 'react';
import { ReadingLine, ReadModeSettings, SentenceTranslationResult } from '@/types';
import { checkSentenceTranslation, generateSentenceMultipleChoice, getWordHint } from '@/utils/sentenceTranslation';
import { hasWordAlignments, extractAlignedTokens } from '@/utils/wordAlignments';
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

  // Word hint functionality
  const handleWordClick = useCallback((chineseWord: string) => {
    if (!settings.showWordHints || !hasAlignments) return;

    const hint = getWordHint(line, chineseWord, settings.translationDirection.to);
    if (hint) {
      // Hint is shown via title attribute on hover
      console.log('Word hint:', chineseWord, hint);
    }
  }, [line, settings, hasAlignments]);

  // Reset when line changes
  useEffect(() => {
    setUserAnswer('');
    setSelectedOption(null);
    setResult(null);
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
        <div className={styles.sourceText}>
           {hasAlignments && settings.showWordHints ? (
             <div className={styles.interactiveSource}>
               <div className={styles.wordTokensContainer}>
                 {alignedTokens.map((token, index) => (
                   <span
                     key={index}
                     className={`${styles.wordToken} ${token.english ? styles.clickable : styles.static}`}
                     onClick={() => handleWordClick(token.chinese)}
                     title={token.english ? `${token.pinyin} - ${token.english}` : undefined}
                   >
                     {token.chinese}
                   </span>
                 ))}
               </div>
               <div className={styles.hintText}>
                 Hover over words for hints
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