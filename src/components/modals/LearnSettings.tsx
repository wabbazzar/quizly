import { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Deck, LearnModeSettings } from '@/types';
import styles from './LearnSettings.module.css';

interface LearnSettingsProps {
  visible: boolean;
  onClose: () => void;
  deck: Deck | null;
  settings: LearnModeSettings;
  onUpdateSettings: (settings: LearnModeSettings) => void;
}

const LearnSettings: FC<LearnSettingsProps> = ({
  visible,
  onClose,
  deck,
  settings,
  onUpdateSettings,
}) => {
  const [localSettings, setLocalSettings] = useState<LearnModeSettings>(settings);

  // Check if deck and deck content exist
  if (!deck || !deck.content || deck.content.length === 0) return null;

  const availableSides: string[] = [];
  const firstCard = deck.content[0];

  // Safely check for available sides
  if (firstCard?.side_a) availableSides.push('side_a');
  if (firstCard?.side_b) availableSides.push('side_b');
  if (firstCard?.side_c) availableSides.push('side_c');
  if (firstCard?.side_d) availableSides.push('side_d');
  if (firstCard?.side_e) availableSides.push('side_e');
  if (firstCard?.side_f) availableSides.push('side_f');

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

  const toggleSide = (type: 'question' | 'answer', side: string) => {
    if (type === 'question') {
      const newSides = localSettings.questionSides.includes(side)
        ? localSettings.questionSides.filter(s => s !== side)
        : [...localSettings.questionSides, side];
      setLocalSettings({ ...localSettings, questionSides: newSides });
    } else {
      const newSides = localSettings.answerSides.includes(side)
        ? localSettings.answerSides.filter(s => s !== side)
        : [...localSettings.answerSides, side];
      setLocalSettings({ ...localSettings, answerSides: newSides });
    }
  };

  const applyPreset = (preset: string) => {
    switch (preset) {
      case 'simple':
        // First side as question, second side as answer
        setLocalSettings({
          ...localSettings,
          questionSides: [availableSides[0] || 'side_a'],
          answerSides: [availableSides[1] || 'side_b'],
        });
        break;
      case 'reverse':
        // Second side as question, first side as answer
        setLocalSettings({
          ...localSettings,
          questionSides: [availableSides[1] || 'side_b'],
          answerSides: [availableSides[0] || 'side_a'],
        });
        break;
      case 'comprehensive':
        // First side as question, all others as answers
        setLocalSettings({
          ...localSettings,
          questionSides: [availableSides[0] || 'side_a'],
          answerSides: availableSides.slice(1),
        });
        break;
      case 'mixed':
        // Alternating questions and answers
        setLocalSettings({
          ...localSettings,
          questionSides: availableSides.filter((_, i) => i % 2 === 0),
          answerSides: availableSides.filter((_, i) => i % 2 === 1),
        });
        break;
    }
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <header className={styles.header}>
              <h2 className={styles.title}>Learn Mode Settings</h2>
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
                    title="Basic question and answer format"
                  >
                    Simple
                  </button>
                  <button
                    className={styles.presetButton}
                    onClick={() => applyPreset('reverse')}
                    title="Reverse question and answer sides"
                  >
                    Reverse
                  </button>
                  <button
                    className={styles.presetButton}
                    onClick={() => applyPreset('comprehensive')}
                    title="Show all information in answers"
                  >
                    Comprehensive
                  </button>
                  <button
                    className={styles.presetButton}
                    onClick={() => applyPreset('mixed')}
                    title="Mix different sides for variety"
                  >
                    Mixed
                  </button>
                </div>
              </section>

              {/* Question Side Configuration */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Question Sides</h3>
                <p className={styles.sectionDescription}>
                  Select which sides to use for questions
                </p>
                <div className={styles.sideSelector}>
                  {availableSides.map((side) => (
                    <button
                      key={side}
                      className={`${styles.sideOption} ${
                        localSettings.questionSides.includes(side) ? styles.selected : ''
                      }`}
                      onClick={() => toggleSide('question', side)}
                    >
                      {getSideLabel(side)}
                    </button>
                  ))}
                </div>
              </section>

              {/* Answer Side Configuration */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Answer Sides</h3>
                <p className={styles.sectionDescription}>
                  Select which sides to use for answers
                </p>
                <div className={styles.sideSelector}>
                  {availableSides.map((side) => (
                    <button
                      key={side}
                      className={`${styles.sideOption} ${
                        localSettings.answerSides.includes(side) ? styles.selected : ''
                      }`}
                      onClick={() => toggleSide('answer', side)}
                    >
                      {getSideLabel(side)}
                    </button>
                  ))}
                </div>
              </section>

              {/* General Settings */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>General Settings</h3>
                <div className={styles.generalSettings}>
                  <label className={styles.settingRow}>
                    <span>Cards per round</span>
                    <input
                      type="number"
                      min="5"
                      max="50"
                      value={localSettings.cardsPerRound}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        cardsPerRound: Math.max(5, Math.min(50, parseInt(e.target.value) || 10))
                      })}
                      className={styles.numberInput}
                    />
                  </label>

                  <label className={styles.settingRow}>
                    <span>Randomize cards</span>
                    <input
                      type="checkbox"
                      checked={localSettings.randomize}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        randomize: e.target.checked
                      })}
                      className={styles.checkbox}
                    />
                  </label>

                  <label className={styles.settingRow}>
                    <span>Enable timer</span>
                    <input
                      type="checkbox"
                      checked={localSettings.enableTimer}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        enableTimer: e.target.checked
                      })}
                      className={styles.checkbox}
                    />
                  </label>

                  {localSettings.enableTimer && (
                    <label className={styles.settingRow}>
                      <span>Timer seconds</span>
                      <input
                        type="number"
                        min="10"
                        max="120"
                        value={localSettings.timerSeconds}
                        onChange={(e) => setLocalSettings({
                          ...localSettings,
                          timerSeconds: Math.max(10, Math.min(120, parseInt(e.target.value) || 30))
                        })}
                        className={styles.numberInput}
                      />
                    </label>
                  )}

                  <label className={styles.settingRow}>
                    <span>Question type mix</span>
                    <select
                      value={localSettings.questionTypeMix}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        questionTypeMix: e.target.value as 'auto' | 'multiple_choice' | 'free_text' | 'mixed'
                      })}
                      className={styles.select}
                    >
                      <option value="auto">Auto (80% MC, 20% Text)</option>
                      <option value="multiple_choice">Multiple Choice Only</option>
                      <option value="free_text">Free Text Only</option>
                      <option value="mixed">50/50 Mix</option>
                    </select>
                  </label>

                  <label className={styles.settingRow}>
                    <span>Progression mode</span>
                    <select
                      value={localSettings.progressionMode}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        progressionMode: e.target.value as 'sequential' | 'level' | 'random'
                      })}
                      className={styles.select}
                    >
                      <option value="sequential">Sequential</option>
                      <option value="level">By Level</option>
                      <option value="random">Random</option>
                    </select>
                  </label>

                  <label className={styles.settingRow}>
                    <span>Scheduling algorithm</span>
                    <select
                      value={localSettings.schedulingAlgorithm}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        schedulingAlgorithm: e.target.value as 'smart_spaced' | 'leitner_box'
                      })}
                      className={styles.select}
                    >
                      <option value="smart_spaced">Smart Spaced (Adaptive)</option>
                      <option value="leitner_box">Leitner Box System</option>
                    </select>
                  </label>
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
                disabled={localSettings.questionSides.length === 0 || localSettings.answerSides.length === 0}
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

export default LearnSettings;