import { FC } from 'react';
import { SectionProps } from '../UnifiedSettings';
import { ClockIcon } from '@/components/icons/StatusIcons';
import styles from './LearningSettings.module.css';

// Info Icon Component for tooltips
const InfoTooltip: FC<{ text: string }> = ({ text }) => (
  <span className={styles.infoTooltipWrapper}>
    <span className={styles.infoIcon}>ℹ️</span>
    <span className={styles.infoTooltip}>{text}</span>
  </span>
);

const LearningSettings: FC<SectionProps> = ({ settings, onChange }) => {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>
        <ClockIcon size={20} className={styles.titleIcon} />
        Learning Settings
      </h3>

      <div className={styles.settingsGrid}>
        {/* Cards per round */}
        <label className={styles.settingRow}>
          <div className={styles.labelContainer}>
            <span className={styles.label}>
              Cards per round
              <InfoTooltip text="Number of cards to practice per session" />
            </span>
          </div>
          <input
            type="number"
            min="5"
            max="50"
            value={settings.cardsPerRound || 10}
            onChange={e =>
              onChange('cardsPerRound', Math.max(5, Math.min(50, parseInt(e.target.value) || 10)))
            }
            className={styles.numberInput}
          />
        </label>

        {/* Question type mix */}
        <label className={styles.settingRow}>
          <span className={styles.label}>Question type mix</span>
          <select
            value={settings.questionTypeMix || 'auto'}
            onChange={e => onChange('questionTypeMix', e.target.value)}
            className={styles.select}
          >
            <option value="auto">Auto (80% MC, 20% Text)</option>
            <option value="multiple_choice">Multiple Choice Only</option>
            <option value="free_text">Free Text Only</option>
            <option value="mixed">50/50 Mix</option>
          </select>
        </label>

        {/* Scheduling algorithm */}
        <label className={styles.settingRow}>
          <div className={styles.labelContainer}>
            <span className={styles.label}>
              Scheduling algorithm
              <InfoTooltip text="How cards are scheduled for review" />
            </span>
          </div>
          <select
            value={settings.schedulingAlgorithm || 'smart_spaced'}
            onChange={e => onChange('schedulingAlgorithm', e.target.value)}
            className={styles.select}
          >
            <option value="smart_spaced">Smart Spaced (Adaptive)</option>
            <option value="leitner_box">Leitner Box System</option>
          </select>
        </label>

        {/* Randomize cards */}
        <label className={styles.checkboxRow}>
          <div className={styles.checkboxContainer}>
            <input
              type="checkbox"
              checked={settings.randomize !== false}
              onChange={e => onChange('randomize', e.target.checked)}
              className={styles.checkbox}
            />
            <span className={styles.checkboxLabel}>Randomize cards</span>
          </div>
        </label>

        {/* Enable timer */}
        <label className={styles.checkboxRow}>
          <div className={styles.checkboxContainer}>
            <input
              type="checkbox"
              checked={settings.enableTimer === true}
              onChange={e => onChange('enableTimer', e.target.checked)}
              className={styles.checkbox}
            />
            <span className={styles.checkboxLabel}>Enable timer</span>
          </div>
        </label>

        {/* Timer seconds (conditional) */}
        {settings.enableTimer && (
          <label className={styles.settingRow}>
            <span className={styles.label}>Timer seconds</span>
            <input
              type="number"
              min="10"
              max="120"
              value={settings.timerSeconds || 30}
              onChange={e =>
                onChange(
                  'timerSeconds',
                  Math.max(10, Math.min(120, parseInt(e.target.value) || 30))
                )
              }
              className={styles.numberInput}
            />
          </label>
        )}
      </div>

      {/* Progressive Learning Section */}
      <div className={styles.subsection}>
        <h4 className={styles.subsectionTitle}>
          Progressive Learning
          <InfoTooltip text="Control how free text questions follow multiple choice" />
        </h4>

        <label className={styles.settingRow}>
          <span className={styles.label}>Progressive mode</span>
          <select
            value={settings.progressiveLearning || 'spaced'}
            onChange={e => onChange('progressiveLearning', e.target.value)}
            className={styles.select}
          >
            <option value="disabled">Disabled (No follow-ups)</option>
            <option value="immediate">Immediate (Right after MC)</option>
            <option value="spaced">Spaced (With gap)</option>
            <option value="random">Random (30% chance)</option>
          </select>
        </label>

        {settings.progressiveLearning === 'spaced' && (
          <label className={styles.settingRow}>
            <span className={styles.label}>Minimum spacing</span>
            <input
              type="number"
              min="1"
              max="10"
              value={settings.progressiveLearningSpacing || 3}
              onChange={e =>
                onChange(
                  'progressiveLearningSpacing',
                  Math.max(1, Math.min(10, parseInt(e.target.value) || 3))
                )
              }
              className={styles.numberInput}
            />
          </label>
        )}
      </div>
    </div>
  );
};

export default LearningSettings;
