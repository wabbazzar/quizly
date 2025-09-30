import { FC, useState, useCallback, useEffect, useRef } from 'react';
import { ReadModeSettings } from '@/types';
import { isAnswerClose } from '@/utils/tokenize';
import { Button } from '@/components/ui/Button';
import styles from './ReadToken.module.css';

interface Token {
  text: string;
  start: number;
  end: number;
}

interface Props {
  token: Token;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
  onClose?: () => void; // New prop to deactivate token
  onComplete?: () => void;
  settings: ReadModeSettings;
  sourceText: string;
  targetText: string;
  pinyinText?: string;
  translationText?: string;
}

export const ReadToken: FC<Props> = ({
  isActive,
  isCompleted,
  onClick,
  onClose,
  onComplete,
  settings,
  sourceText,
  targetText,
  pinyinText,
  translationText
}) => {
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [mcOptions, setMcOptions] = useState<string[]>([]);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const tokenRef = useRef<HTMLDivElement>(null);

  // Check if a string is punctuation or special character
  const isPunctuation = (text: string) => {
    return /^[.,!?;:()\[\]{}"'`~@#$%^&*+=\-\/\\|<>]+$/.test(text);
  };

  // Check if tokens should be skipped for practice
  const shouldSkipToken = (source: string, target: string) => {
    // Skip if both source and target are punctuation
    if (isPunctuation(source) && isPunctuation(target)) return true;
    // Skip if target is empty or whitespace only
    if (!target || !target.trim()) return true;
    return false;
  };

  // Generate multiple choice options if needed
  useEffect(() => {
    if (settings.answerType === 'multiple_choice' && isActive && targetText) {
      // Skip MC for punctuation/special cases
      if (shouldSkipToken(sourceText, targetText)) {
        // Auto-advance for punctuation
        if (onComplete) {
          setTimeout(() => onComplete(), 500);
        }
        return;
      }

      // Generate distractors based on the target text
      const options = [targetText];

      // Generate appropriate distractors based on target language/side
      let distractorPool: string[] = [];
      const targetSide = settings.translationDirection.to;

      // Check if target is a number (language agnostic)
      if (/^\d+$/.test(targetText)) {
        // For numbers, use other numbers as distractors
        const num = parseInt(targetText);
        distractorPool = [
          (num - 1).toString(),
          (num + 1).toString(),
          (num * 2).toString(),
          (num + 10).toString(),
          Math.floor(num / 2).toString()
        ].filter(n => n !== targetText && parseInt(n) >= 0);
      }
      // Generate distractors based on target language/side
      else if (targetSide === 'b') {
        // Pinyin distractors - common pinyin syllables
        const pinyinSyllables = [
          'ma', 'wo', 'ni', 'ta', 'de', 'shi', 'zai', 'you', 'ge', 'le',
          'dao', 'shang', 'xia', 'lai', 'qu', 'hao', 'hen', 'dou', 'bu', 'mei',
          'kan', 'shuo', 'zuo', 'chi', 'he', 'zou', 'pao', 'fei', 'kai', 'guan',
          'da', 'xiao', 'gao', 'ai', 'pang', 'shou', 'kuai', 'man', 'xin', 'jiu',
          'duo', 'shao', 'chang', 'duan', 'yuan', 'jin', 'li', 'wai', 'zhong', 'bian',
          'qian', 'hou', 'zuo', 'you', 'dong', 'xi', 'nan', 'bei', 'bai', 'hei',
          'hong', 'lu', 'huang', 'lan', 'zi', 'fen', 'hui', 'zong', 'cheng', 'qing'
        ];
        // Add tone mark variations for more realistic distractors
        const extendedPinyin = [...pinyinSyllables];
        pinyinSyllables.forEach(syllable => {
          if (syllable.includes('a')) {
            extendedPinyin.push(syllable.replace('a', 'ā'), syllable.replace('a', 'á'), syllable.replace('a', 'ǎ'), syllable.replace('a', 'à'));
          }
          if (syllable.includes('e')) {
            extendedPinyin.push(syllable.replace('e', 'ē'), syllable.replace('e', 'é'), syllable.replace('e', 'ě'), syllable.replace('e', 'è'));
          }
          if (syllable.includes('i')) {
            extendedPinyin.push(syllable.replace('i', 'ī'), syllable.replace('i', 'í'), syllable.replace('i', 'ǐ'), syllable.replace('i', 'ì'));
          }
          if (syllable.includes('o')) {
            extendedPinyin.push(syllable.replace('o', 'ō'), syllable.replace('o', 'ó'), syllable.replace('o', 'ǒ'), syllable.replace('o', 'ò'));
          }
          if (syllable.includes('u')) {
            extendedPinyin.push(syllable.replace('u', 'ū'), syllable.replace('u', 'ú'), syllable.replace('u', 'ǔ'), syllable.replace('u', 'ù'));
          }
        });
        distractorPool = extendedPinyin;
      }
      else if (targetSide === 'a') {
        // Chinese character distractors - common characters
        distractorPool = [
          '我', '你', '他', '她', '的', '是', '在', '有', '个', '了',
          '到', '上', '下', '来', '去', '好', '很', '都', '不', '没',
          '看', '说', '做', '吃', '喝', '走', '跑', '飞', '开', '关',
          '大', '小', '高', '矮', '胖', '瘦', '快', '慢', '新', '旧',
          '多', '少', '长', '短', '远', '近', '里', '外', '中', '边',
          '前', '后', '左', '右', '东', '西', '南', '北', '白', '黑',
          '红', '绿', '黄', '蓝', '紫', '粉', '灰', '棕', '橙', '青'
        ];
      }
      else {
        // English distractors (side c or other)
        // Check if target is very short (1-2 chars)
        if (targetText.length <= 2) {
          distractorPool = [
            'a', 'I', 'it', 'is', 'to', 'be', 'of', 'in', 'on', 'at',
            'or', 'an', 'as', 'by', 'we', 'he', 'me', 'my', 'up', 'so'
          ];
        } else {
          // Group words by part of speech/meaning for better distractors
          const pronouns = ['I', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];
          const verbs = ['is', 'are', 'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'can', 'could', 'would', 'should', 'make', 'take', 'give', 'get', 'go', 'come', 'see', 'know', 'think', 'want'];
          const adjectives = ['good', 'bad', 'big', 'small', 'new', 'old', 'happy', 'sad', 'fast', 'slow', 'hot', 'cold', 'easy', 'hard', 'beautiful', 'ugly'];
          const articles = ['the', 'a', 'an', 'this', 'that', 'these', 'those'];
          const prepositions = ['in', 'on', 'at', 'to', 'for', 'with', 'from', 'by', 'about', 'into', 'through', 'during', 'before', 'after'];
          const adverbs = ['very', 'really', 'quite', 'too', 'so', 'just', 'still', 'already', 'yet', 'even', 'only', 'also', 'never', 'always', 'sometimes'];

          // Try to match the target word type and select from appropriate pool
          if (pronouns.includes(targetText.toLowerCase())) {
            distractorPool = pronouns;
          } else if (verbs.includes(targetText.toLowerCase())) {
            distractorPool = verbs;
          } else if (adjectives.includes(targetText.toLowerCase())) {
            distractorPool = adjectives;
          } else if (articles.includes(targetText.toLowerCase())) {
            distractorPool = articles;
          } else if (prepositions.includes(targetText.toLowerCase())) {
            distractorPool = prepositions;
          } else if (adverbs.includes(targetText.toLowerCase())) {
            distractorPool = adverbs;
          } else {
            // Default mixed pool for unknown words
            distractorPool = [...verbs.slice(0, 5), ...adjectives.slice(0, 5), ...pronouns.slice(0, 5)];
          }
        }
      }

      // Filter out the correct answer and select random distractors
      const availableDisractors = distractorPool.filter(d =>
        d.toLowerCase() !== targetText.toLowerCase()
      );

      while (options.length < (settings.optionsCount || 4) && availableDisractors.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableDisractors.length);
        const distractor = availableDisractors[randomIndex];
        if (!options.includes(distractor)) {
          options.push(distractor);
          availableDisractors.splice(randomIndex, 1);
        }
      }

      // If we still need more options, add language-appropriate fallbacks
      while (options.length < (settings.optionsCount || 4)) {
        let fallbackOptions: string[];
        if (targetSide === 'b') {
          // Pinyin fallbacks
          fallbackOptions = ['shénme', 'nǎlǐ', 'zěnme', 'shéi'];
        } else if (targetSide === 'a') {
          // Chinese character fallbacks
          fallbackOptions = ['什么', '哪里', '怎么', '谁'];
        } else {
          // English fallbacks
          fallbackOptions = ['something', 'nothing', 'anything', 'everything'];
        }
        const fallback = fallbackOptions[options.length - 1] || `option${options.length}`;
        if (!options.includes(fallback)) {
          options.push(fallback);
        }
      }

      // Shuffle options
      setMcOptions(options.sort(() => Math.random() - 0.5));
    }
  }, [isActive, settings, targetText, sourceText, onClick]);

  // Calculate popup position when token becomes active
  useEffect(() => {
    if (isActive && tokenRef.current) {
      const rect = tokenRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Calculate position that keeps popup in viewport
      let top = rect.bottom + 10;
      let left = rect.left + (rect.width / 2);

      // Check if popup would go off bottom of screen
      if (top + 300 > viewportHeight) {
        top = rect.top - 310; // Show above instead
      }

      // Ensure horizontal position stays in viewport
      const popupWidth = 250;
      if (left - (popupWidth / 2) < 10) {
        left = popupWidth / 2 + 10;
      } else if (left + (popupWidth / 2) > viewportWidth - 10) {
        left = viewportWidth - (popupWidth / 2) - 10;
      }

      setPopupPosition({ top, left });
    }
  }, [isActive]);

  // Handle answer submission
  const handleSubmit = useCallback((answer: string) => {

    if (settings.checkMode === 'live') {
      // Live checking - check immediately
      // Use pinyin-aware matching if target is pinyin (side b)
      const answerType = settings.translationDirection.to === 'b' ? 'pinyin' : 'text';
      const correct = isAnswerClose(answer, targetText, 2, answerType);
      setIsCorrect(correct);
      setShowAnswer(true);

      // Don't auto-advance - let user manually advance
    } else {
      // Wait mode - just store answer
      setUserAnswer(answer);
    }
  }, [settings, targetText, sourceText]);

  // Handle reveal
  const handleReveal = useCallback(() => {
    if (userAnswer) {
      // Use pinyin-aware matching if target is pinyin (side b)
      const answerType = settings.translationDirection.to === 'b' ? 'pinyin' : 'text';
      const correct = isAnswerClose(userAnswer, targetText, 2, answerType);
      setIsCorrect(correct);
      setShowAnswer(true);

      // Auto-advance to next token after a short delay
      if (correct && onComplete) {
        setTimeout(() => {
          onComplete(); // Move to next token
        }, 1000);
      }
    } else {
      setShowAnswer(true);
    }
  }, [userAnswer, targetText, settings, onComplete]);

  // Handle multiple choice selection
  const handleMCSelect = useCallback((option: string) => {
    // Use pinyin-aware matching if target is pinyin (side b)
    const answerType = settings.translationDirection.to === 'b' ? 'pinyin' : 'text';
    const correct = isAnswerClose(option, targetText, 2, answerType);
    setIsCorrect(correct);
    setShowAnswer(true);
    setUserAnswer(option);

    // Auto-advance to next token after a short delay
    if (correct && onComplete) {
      setTimeout(() => {
        onComplete(); // Move to next token
      }, 1000);
    }
  }, [targetText, settings, onComplete]);

  return (
    <div
      ref={tokenRef}
      className={`
        ${styles.token}
        ${isActive ? styles.active : ''}
        ${isCompleted ? styles.completed : ''}
        ${isCorrect === true ? styles.correct : ''}
        ${isCorrect === false ? styles.incorrect : ''}
      `}
      onClick={onClick}
    >
      <span className={styles.tokenText}>{sourceText}</span>

      {/* Show interaction UI when active - skip for punctuation */}
      {isActive && !showAnswer && !shouldSkipToken(sourceText, targetText) && (
        <div
          className={styles.interactionArea}
          style={{
            position: 'fixed',
            top: `${popupPosition.top}px`,
            left: `${popupPosition.left}px`,
            transform: 'translateX(-50%)'
          }}
        >
          {/* Close button to dismiss popup */}
          <button
            className={styles.closeButton}
            onClick={(e) => {
              e.stopPropagation();
              if (onClose) {
                onClose(); // Deactivate this token
              }
            }}
            aria-label="Close input"
            title="Close (to see translations below)"
          >
            ✕
          </button>

          {settings.answerType === 'free_text' ? (
            <div className={styles.freeTextInput}>
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    if (settings.checkMode === 'live') {
                      handleSubmit(userAnswer);
                    } else {
                      handleReveal();
                    }
                  }
                }}
                placeholder="Type translation..."
                className={styles.textInput}
                autoFocus
              />
              {settings.checkMode === 'wait' && (
                <Button
                  size="small"
                  variant="primary"
                  onClick={handleReveal}
                  disabled={!userAnswer}
                >
                  Check
                </Button>
              )}
            </div>
          ) : (
            <div className={styles.multipleChoice}>
              {mcOptions.map((option, idx) => (
                <Button
                  key={idx}
                  size="small"
                  variant="secondary"
                  onClick={() => handleMCSelect(option)}
                  className={styles.mcOption}
                >
                  {option}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Show answer when revealed */}
      {showAnswer && (
        <div className={styles.answerDisplay}>
          <span className={styles.correctAnswer}>{targetText}</span>
          {isCorrect !== null && (
            <span className={isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect}>
              {isCorrect ? '✓' : '✗'}
            </span>
          )}
        </div>
      )}

      {/* Show hints if enabled */}
      {pinyinText && !isActive && (
        <span className={styles.pinyinHint}>{pinyinText}</span>
      )}
      {translationText && !isActive && (
        <span className={styles.translationHint}>{translationText}</span>
      )}
    </div>
  );
};