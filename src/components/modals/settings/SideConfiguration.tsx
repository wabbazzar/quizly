import { FC, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Deck } from '@/types';
import { SectionProps } from '../UnifiedSettings';
import styles from './SideConfiguration.module.css';

interface ExtendedSectionProps extends SectionProps {
  deck?: Deck | null;
  settings: any;
}

const SideConfiguration: FC<ExtendedSectionProps> = ({ settings, onChange, deck, error }) => {
  // Determine section type from settings
  const sectionType = settings.sectionType || 'front';

  // Get available sides from deck
  const availableSides = useMemo(() => {
    if (!deck || !deck.content || deck.content.length === 0) return [];

    const firstCard = deck.content[0];
    const sides: string[] = [];

    if (firstCard.side_a) sides.push('side_a');
    if (firstCard.side_b) sides.push('side_b');
    if (firstCard.side_c) sides.push('side_c');
    if (firstCard.side_d) sides.push('side_d');
    if (firstCard.side_e) sides.push('side_e');
    if (firstCard.side_f) sides.push('side_f');

    return sides;
  }, [deck]);

  // Get side labels from deck metadata
  const getSideLabel = (side: string): string => {
    const label = deck?.metadata?.side_labels?.[side as keyof typeof deck.metadata.side_labels];
    if (label) {
      return label.charAt(0).toUpperCase() + label.slice(1);
    }

    const sideIndex = side.split('_')[1]?.toUpperCase();
    return `Side ${sideIndex}`;
  };

  // Get selected sides based on section type
  const selectedSides = useMemo(() => {
    if (sectionType === 'front') {
      return settings.frontSides || [];
    } else if (sectionType === 'back') {
      return settings.backSides || [];
    } else if (sectionType === 'question') {
      return settings.questionSides || [];
    } else if (sectionType === 'answer') {
      return settings.answerSides || [];
    }
    return [];
  }, [settings, sectionType]);

  // Handle side toggle
  const toggleSide = (side: string) => {
    const currentSides = [...selectedSides];
    const sideIndex = currentSides.indexOf(side);

    if (sideIndex > -1) {
      currentSides.splice(sideIndex, 1);
    } else {
      currentSides.push(side);
    }

    // Update the appropriate setting based on section type
    if (sectionType === 'front') {
      onChange('frontSides', currentSides);
    } else if (sectionType === 'back') {
      onChange('backSides', currentSides);
    } else if (sectionType === 'question') {
      onChange('questionSides', currentSides);
    } else if (sectionType === 'answer') {
      onChange('answerSides', currentSides);
    }
  };

  // Get title and description based on section type
  const getSectionInfo = () => {
    switch (sectionType) {
      case 'front':
        return {
          title: 'Card Front',
          description: 'Select which sides appear on the front of the card',
        };
      case 'back':
        return {
          title: 'Card Back',
          description: 'Select which sides appear on the back of the card',
        };
      case 'question':
        return {
          title: 'Question Sides',
          description: 'Select which sides to use for questions',
        };
      case 'answer':
        return {
          title: 'Answer Sides',
          description: 'Select which sides to use for answers',
        };
      default:
        return {
          title: 'Side Configuration',
          description: 'Select which sides to use',
        };
    }
  };

  const { title, description } = getSectionInfo();

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>

      <div className={styles.sideSelector}>
        {availableSides.map((side, index) => (
          <motion.button
            key={side}
            className={`${styles.sideOption} ${
              selectedSides.includes(side) ? styles.selected : ''
            }`}
            onClick={() => toggleSide(side)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className={styles.sideLabel}>{getSideLabel(side)}</span>
            {selectedSides.includes(side) && <span className={styles.checkmark}>✓</span>}
          </motion.button>
        ))}
      </div>

      {selectedSides.length === 0 && (
        <div className={styles.warning}>⚠️ At least one side must be selected</div>
      )}

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {selectedSides.length > 0 && (
        <div className={styles.selectedInfo}>
          {selectedSides.length} side{selectedSides.length === 1 ? '' : 's'} selected
        </div>
      )}
    </div>
  );
};

export default SideConfiguration;
