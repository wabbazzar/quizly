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

  const availableSides = [];
  if (deck.content[0].side_a) availableSides.push('side_a');
  if (deck.content[0].side_b) availableSides.push('side_b');
  if (deck.content[0].side_c) availableSides.push('side_c');
  if (deck.content[0].side_d) availableSides.push('side_d');
  if (deck.content[0].side_e) availableSides.push('side_e');
  if (deck.content[0].side_f) availableSides.push('side_f');

  const sideLabels: Record<string, string> = {
    side_a: 'Side A (English)',
    side_b: 'Side B (Pinyin)',
    side_c: 'Side C (Character)',
    side_d: 'Side D (Definition)',
    side_e: 'Side E',
    side_f: 'Side F',
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
      case 'englishToChinese':
        setLocalFrontSides(['side_a']);
        setLocalBackSides(['side_b', 'side_c']);
        break;
      case 'chineseToEnglish':
        setLocalFrontSides(['side_c']);
        setLocalBackSides(['side_a', 'side_d']);
        break;
      case 'pinyinToCharacter':
        setLocalFrontSides(['side_b']);
        setLocalBackSides(['side_c']);
        break;
      case 'comprehensive':
        setLocalFrontSides(['side_a']);
        setLocalBackSides(['side_b', 'side_c', 'side_d']);
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
                    onClick={() => applyPreset('englishToChinese')}
                  >
                    English → Chinese
                  </button>
                  <button
                    className={styles.presetButton}
                    onClick={() => applyPreset('chineseToEnglish')}
                  >
                    Chinese → English
                  </button>
                  <button
                    className={styles.presetButton}
                    onClick={() => applyPreset('pinyinToCharacter')}
                  >
                    Pinyin → Character
                  </button>
                  <button
                    className={styles.presetButton}
                    onClick={() => applyPreset('comprehensive')}
                  >
                    All Sides
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
                      {sideLabels[side]}
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
                      {sideLabels[side]}
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