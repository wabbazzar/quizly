import { FC } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/types';
import { SpeechButton } from '@/components/common/SpeechButton';
import styles from './FlashCard.module.css';

interface FlashCardProps {
  card: Card;
  isFlipped: boolean;
  onFlip: () => void;
  frontSides?: string[];
  backSides?: string[];
  badgeText?: string;
  deckId?: string;
}

const FlashCard: FC<FlashCardProps> = ({
  card,
  isFlipped,
  onFlip,
  frontSides = ['side_a'],
  backSides = ['side_b'],
  badgeText,
  deckId,
}) => {
  // Guard against an undefined card: the parent should always pass a valid
  // card, but a stale cardOrder index can briefly produce one during
  // session restoration, and we shouldn't crash the whole route.
  if (!card) return null;

  const frontContent = frontSides
    .filter(side => card[side as keyof Card])
    .map(side => ({
      content: card[side as keyof Card] as string,
      sideKey: side.replace('side_', ''), // 'a', 'b', 'c', etc.
    }));

  const backContent = backSides
    .filter(side => card[side as keyof Card])
    .map(side => ({
      content: card[side as keyof Card] as string,
      sideKey: side.replace('side_', ''),
    }));

  return (
    <div className={styles.cardContainer} onClick={onFlip}>
      <motion.div
        className={styles.card}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front of card */}
        <div className={`${styles.cardFace} ${styles.cardFront}`}>
          <div className={styles.cardContent}>
            {frontContent.map((item, index) => (
              <div key={index} className={styles.contentItem}>
                <div className={styles.text}>{item.content}</div>
                {deckId && !isFlipped && (
                  <SpeechButton
                    deckId={deckId}
                    cardIdx={card.idx}
                    side={item.sideKey}
                  />
                )}
              </div>
            ))}
          </div>
          {(badgeText || card.level) && (
            <div className={styles.level}>{badgeText || `Level ${card.level}`}</div>
          )}
        </div>

        {/* Back of card */}
        <div className={`${styles.cardFace} ${styles.cardBack}`}>
          <div className={styles.cardContent}>
            {backContent.map((item, index) => (
              <div key={index} className={styles.contentItem}>
                <div className={styles.text}>{item.content}</div>
                {deckId && isFlipped && (
                  <SpeechButton
                    deckId={deckId}
                    cardIdx={card.idx}
                    side={item.sideKey}
                  />
                )}
              </div>
            ))}
          </div>
          {(badgeText || card.level) && (
            <div className={styles.level}>{badgeText || `Level ${card.level}`}</div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default FlashCard;
