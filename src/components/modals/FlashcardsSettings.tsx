import { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Deck } from '@/types';
import styles from './FlashcardsSettings.module.css';

interface FlashcardsSettingsProps {
  visible: boolean;
  onClose: () => void;
  deck: Deck | null;
  frontSides: string[];
  backSides: string[];
  onUpdateSettings: (frontSides: string[], backSides: string[]) => void;
}

const FlashcardsSettings: FC<FlashcardsSettingsProps> = ({
  visible,
  onClose,
  deck,
  frontSides,
  backSides,
  onUpdateSettings,
}) => {
  const [localFrontSides, setLocalFrontSides] = useState<string[]>(frontSides);
  const [localBackSides, setLocalBackSides] = useState<string[]>(backSides);

  if (!deck) return null;

  const availableSides: string[] = [];
  if (deck.content[0].side_a) availableSides.push('side_a');
  if (deck.content[0].side_b) availableSides.push('side_b');
  if (deck.content[0].side_c) availableSides.push('side_c');
  if (deck.content[0].side_d) availableSides.push('side_d');
  if (deck.content[0].side_e) availableSides.push('side_e');
  if (deck.content[0].side_f) availableSides.push('side_f');

  // Get side labels from deck metadata or fallback to generic labels
  const getSideLabel = (side: string): string => {
    // Use actual side label from deck metadata if available
    const label = deck.metadata?.side_labels?.[side as keyof typeof deck.metadata.side_labels];
    if (label) {
      // Capitalize first letter
      return label.charAt(0).toUpperCase() + label.slice(1);
    }

    // Fallback to generic labels
    const sideIndex = side.split('_')[1]?.toUpperCase();
    return `Side ${sideIndex}`;
  };

  // Get shortened side label for preset buttons
  const getShortSideLabel = (side: string): string => {
    const label = deck.metadata?.side_labels?.[side as keyof typeof deck.metadata.side_labels];
    if (label) {
      // Capitalize first letter and keep it short
      return label.charAt(0).toUpperCase() + label.slice(1);
    }

    // Fallback to single letter
    const sideIndex = side.split('_')[1]?.toUpperCase();
    return sideIndex || 'A';
  };

  const toggleSide = (type: 'front' | 'back', side: string) => {
    if (type === 'front') {
      const newSides = localFrontSides.includes(side)
        ? localFrontSides.filter(s => s !== side)
        : [...localFrontSides, side];
      setLocalFrontSides(newSides);
    } else {
      const newSides = localBackSides.includes(side)
        ? localBackSides.filter(s => s !== side)
        : [...localBackSides, side];
      setLocalBackSides(newSides);
    }
  };

  const applyPreset = (preset: string) => {
    switch (preset) {
      case 'simple':
        // First side on front, second side on back
        setLocalFrontSides([availableSides[0] || 'side_a']);
        setLocalBackSides([availableSides[1] || 'side_b']);
        break;
      case 'reverse':
        // Second side on front, first side on back
        setLocalFrontSides([availableSides[1] || 'side_b']);
        setLocalBackSides([availableSides[0] || 'side_a']);
        break;
      case 'comprehensive':
        // First side on front, all others on back
        setLocalFrontSides([availableSides[0] || 'side_a']);
        setLocalBackSides(availableSides.slice(1));
        break;
      case 'multifront':
        // First two sides on front, rest on back
        const frontCount = Math.min(2, availableSides.length);
        setLocalFrontSides(availableSides.slice(0, frontCount));
        setLocalBackSides(availableSides.slice(frontCount));
        break;
    }
  };

  const handleSave = () => {
    onUpdateSettings(localFrontSides, localBackSides);
    onClose();
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
          >
            <header className={styles.header}>
              <h2 className={styles.title}>Flashcard Settings</h2>
              <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Close settings"
              >
                ✕
              </button>
            </header>

            <div className={styles.content}>
              {/* Quick Presets */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Quick Presets</h3>
                <div className={styles.presets}>
                  <button
                    className={styles.presetButton}
                    onClick={() => applyPreset('simple')}
                    title={`Show ${getSideLabel(availableSides[0] || 'side_a')} on front, ${getSideLabel(availableSides[1] || 'side_b')} on back`}
                  >
                    Simple ({getShortSideLabel(availableSides[0] || 'side_a')} → {getShortSideLabel(availableSides[1] || 'side_b')})
                  </button>
                  <button
                    className={styles.presetButton}
                    onClick={() => applyPreset('reverse')}
                    title={`Show ${getSideLabel(availableSides[1] || 'side_b')} on front, ${getSideLabel(availableSides[0] || 'side_a')} on back`}
                  >
                    Reverse ({getShortSideLabel(availableSides[1] || 'side_b')} → {getShortSideLabel(availableSides[0] || 'side_a')})
                  </button>
                  <button
                    className={styles.presetButton}
                    onClick={() => applyPreset('comprehensive')}
                    title={`Show ${getSideLabel(availableSides[0] || 'side_a')} on front, all others on back`}
                  >
                    Comprehensive
                  </button>
                  <button
                    className={styles.presetButton}
                    onClick={() => applyPreset('multifront')}
                    title="Show multiple sides on both front and back"
                  >
                    Multi-Side
                  </button>
                </div>
              </section>

              {/* Front Side Configuration */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Card Front</h3>
                <p className={styles.sectionDescription}>
                  Select which sides appear on the front of the card
                </p>
                <div className={styles.sideSelector}>
                  {availableSides.map((side) => (
                    <button
                      key={side}
                      className={`${styles.sideOption} ${
                        localFrontSides.includes(side) ? styles.selected : ''
                      }`}
                      onClick={() => toggleSide('front', side)}
                    >
                      {getSideLabel(side)}
                    </button>
                  ))}
                </div>
              </section>

              {/* Back Side Configuration */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Card Back</h3>
                <p className={styles.sectionDescription}>
                  Select which sides appear on the back of the card
                </p>
                <div className={styles.sideSelector}>
                  {availableSides.map((side) => (
                    <button
                      key={side}
                      className={`${styles.sideOption} ${
                        localBackSides.includes(side) ? styles.selected : ''
                      }`}
                      onClick={() => toggleSide('back', side)}
                    >
                      {getSideLabel(side)}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <footer className={styles.footer}>
              <button
                className={styles.cancelButton}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className={styles.saveButton}
                onClick={handleSave}
                disabled={localFrontSides.length === 0 || localBackSides.length === 0}
              >
                Save Settings
              </button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FlashcardsSettings;