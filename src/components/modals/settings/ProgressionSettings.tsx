import { FC } from 'react';
import { SectionProps } from '../UnifiedSettings';
import styles from './ProgressionSettings.module.css';

const ProgressionSettings: FC<SectionProps> = ({ settings, onChange, mode = 'flashcards' }) => {
  // Get current progression mode
  const currentMode = settings.progressionMode || 'shuffle';

  // Use identical options for both flashcards and learn modes
  const getOptions = () => {
    // Same options for flashcards and learn to ensure consistency
    if (mode === 'flashcards' || mode === 'learn') {
      return [
        { value: 'shuffle', label: 'Shuffle', description: 'Random order for better retention' },
        { value: 'sequential', label: 'Sequential', description: 'Content in order as it appears' },
        {
          value: 'level',
          label: 'By Level',
          description: 'Progressive difficulty based on performance',
        },
      ];
    } else {
      // Deck and other modes
      return [
        { value: 'sequential', label: 'Sequential', description: 'In order' },
        { value: 'random', label: 'Random', description: 'Randomized order' },
      ];
    }
  };

  const options = getOptions();

  const handleChange = (value: string) => {
    onChange('progressionMode', value);
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Progression Mode</h3>
      <p className={styles.description}>Choose how content is presented during your session</p>

      <div className={styles.progressionOptions}>
        {options.map(option => (
          <label key={option.value} className={styles.radioOption}>
            <input
              type="radio"
              name="progression"
              value={option.value}
              checked={currentMode === option.value}
              onChange={e => handleChange(e.target.value)}
              className={styles.radioInput}
            />
            <div className={styles.radioContent}>
              <span className={styles.radioLabel}>{option.label}</span>
              <span className={styles.radioDescription}>{option.description}</span>
            </div>
          </label>
        ))}
      </div>

      {currentMode === 'shuffle' && (
        <div className={styles.infoBox}>
          <span className={styles.infoIcon}>ℹ️</span>
          <span className={styles.infoText}>
            Shuffled content improves long-term retention through varied practice
          </span>
        </div>
      )}

      {currentMode === 'level' && (
        <div className={styles.infoBox}>
          <span className={styles.infoIcon}>ℹ️</span>
          <span className={styles.infoText}>
            Progressive difficulty adapts based on your performance
          </span>
        </div>
      )}
    </div>
  );
};

export default ProgressionSettings;
