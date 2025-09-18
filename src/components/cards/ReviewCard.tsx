import { FC, useState } from 'react';
import { Card } from '@/types';
import styles from './ReviewCard.module.css';

interface ReviewCardProps {
  card: Card;
  frontSides?: string[];
  backSides?: string[];
  showBothSides?: boolean;
}

const ReviewCard: FC<ReviewCardProps> = ({
  card,
  frontSides = ['side_a'],
  backSides = ['side_b'],
  showBothSides = false,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const frontContent = frontSides
    .filter(side => card[side as keyof Card])
    .map(side => card[side as keyof Card] as string)
    .join(' • ');

  const backContent = backSides
    .filter(side => card[side as keyof Card])
    .map(side => card[side as keyof Card] as string)
    .join(' • ');

  const handleClick = () => {
    if (!showBothSides) {
      setIsFlipped(!isFlipped);
    }
  };

  return (
    <div
      className={`${styles.reviewCard} ${showBothSides ? styles.expanded : ''}`}
      onClick={handleClick}
      role={showBothSides ? undefined : 'button'}
      tabIndex={showBothSides ? undefined : 0}
      aria-label={showBothSides ? undefined : 'Click to flip card'}
    >
      {showBothSides ? (
        <>
          <div className={styles.side}>
            <div className={styles.sideLabel}>Question</div>
            <div className={styles.content}>{frontContent}</div>
          </div>
          <div className={styles.divider} />
          <div className={styles.side}>
            <div className={styles.sideLabel}>Answer</div>
            <div className={styles.content}>{backContent}</div>
          </div>
        </>
      ) : (
        <div className={styles.flipCard}>
          <div className={styles.content}>{isFlipped ? backContent : frontContent}</div>
          {!showBothSides && (
            <div className={styles.flipHint}>
              {isFlipped ? 'Click to see question' : 'Click to see answer'}
            </div>
          )}
        </div>
      )}
      {card.level && <div className={styles.level}>Level {card.level}</div>}
    </div>
  );
};

export default ReviewCard;
