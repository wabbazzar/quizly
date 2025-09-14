import { FC } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/types';
import styles from './FlashCard.module.css';

interface FlashCardProps {
  card: Card;
  isFlipped: boolean;
  onFlip: () => void;
  frontSides?: string[];
  backSides?: string[];
}

const FlashCard: FC<FlashCardProps> = ({
  card,
  isFlipped,
  onFlip,
  frontSides = ['side_a'],
  backSides = ['side_b', 'side_c', 'side_d'],
}) => {
  const sideLabels: Record<string, string> = {
    side_a: 'English',
    side_b: 'Pinyin',
    side_c: 'Character',
    side_d: 'Definition',
    side_e: 'Extra',
    side_f: 'Notes',
  };

  const frontContent = frontSides
    .filter(side => card[side as keyof Card])
    .map(side => ({
      label: sideLabels[side] || side,
      content: card[side as keyof Card] as string,
    }));

  const backContent = backSides
    .filter(side => card[side as keyof Card])
    .map(side => ({
      label: sideLabels[side] || side,
      content: card[side as keyof Card] as string,
    }));

  return (
    <div className={styles.cardContainer} onClick={onFlip}>
      <motion.div
        className={styles.card}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front of card */}
        <div className={`${styles.cardFace} ${styles.cardFront}`}>
          <div className={styles.cardContent}>
            {frontContent.map((item, index) => (
              <div key={index} className={styles.contentItem}>
                {item.label && (
                  <div className={styles.label}>{item.label}</div>
                )}
                <div className={styles.text}>{item.content}</div>
              </div>
            ))}
          </div>
          {card.level && (
            <div className={styles.level}>Level {card.level}</div>
          )}
        </div>

        {/* Back of card */}
        <div className={`${styles.cardFace} ${styles.cardBack}`}>
          <div className={styles.cardContent}>
            {backContent.map((item, index) => (
              <div key={index} className={styles.contentItem}>
                {item.label && (
                  <div className={styles.label}>{item.label}</div>
                )}
                <div className={styles.text}>{item.content}</div>
              </div>
            ))}
          </div>
          {card.level && (
            <div className={styles.level}>Level {card.level}</div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default FlashCard;