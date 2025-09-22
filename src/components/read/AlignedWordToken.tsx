import { FC, useState, useCallback } from 'react';
import { AlignedToken } from '@/utils/wordAlignments';
import styles from './AlignedWordToken.module.css';

interface Props {
  token: AlignedToken;
  showPinyin: boolean;
  showTranslation: boolean;
  onClick?: (token: AlignedToken) => void;
}

export const AlignedWordToken: FC<Props> = ({
  token,
  showPinyin,
  showTranslation,
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isTapped, setIsTapped] = useState(false);

  const hasTranslation = token.english.trim().length > 0;
  const isPunctuation = /^[.,!?;:()\[\]{}"'`~@#$%^&*+=\-\/\\|<>]+$/.test(token.chinese);

  const handleClick = useCallback(() => {
    if (!hasTranslation) return;

    // Toggle tap state for mobile
    setIsTapped(prev => !prev);

    if (onClick) {
      onClick(token);
    }
  }, [hasTranslation, onClick, token]);

  const handleMouseEnter = useCallback(() => {
    if (hasTranslation) {
      setIsHovered(true);
    }
  }, [hasTranslation]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const shouldShowTooltip = (isHovered || isTapped) && hasTranslation && !showTranslation;

  return (
    <span
      className={`
        ${styles.token}
        ${hasTranslation ? styles.interactive : styles.static}
        ${isPunctuation ? styles.punctuation : ''}
        ${shouldShowTooltip ? styles.tooltipVisible : ''}
      `}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role={hasTranslation ? 'button' : undefined}
      tabIndex={hasTranslation ? 0 : undefined}
      aria-label={hasTranslation ? `${token.chinese}: ${token.english}` : undefined}
    >
      {/* Main Chinese text */}
      <span className={styles.chinese}>{token.chinese}</span>

      {/* Pinyin display */}
      {showPinyin && token.pinyin && token.pinyin !== '.' && token.pinyin !== ',' && (
        <span className={styles.pinyin}>{token.pinyin}</span>
      )}

      {/* Translation display - always visible if setting is on */}
      {showTranslation && hasTranslation && (
        <span className={styles.translation}>{token.english}</span>
      )}

      {/* Tooltip for hover/tap when translation is not always visible */}
      {shouldShowTooltip && (
        <div className={styles.tooltip}>
          <div className={styles.tooltipContent}>
            {token.pinyin && token.pinyin !== '.' && token.pinyin !== ',' && (
              <div className={styles.tooltipPinyin}>{token.pinyin}</div>
            )}
            {hasTranslation && (
              <div className={styles.tooltipTranslation}>{token.english}</div>
            )}
          </div>
        </div>
      )}
    </span>
  );
};