import { FC, useState } from 'react';
import { SectionProps } from '../UnifiedSettings';
import { useDeckStore } from '@/store/deckStore';
import { TrophyIcon } from '@/components/icons/StatusIcons';
import styles from './MasterySettings.module.css';

// Info Icon Component for tooltips
const InfoTooltip: FC<{ text: string }> = ({ text }) => (
  <span className={styles.infoIcon} title={text}>
    ℹ️
  </span>
);

interface ExtendedSectionProps extends SectionProps {
  onResetMastery?: () => void;
}

const MasterySettings: FC<ExtendedSectionProps> = ({
  settings,
  onChange,
  deck,
  mode = 'flashcards',
  onResetMastery,
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const { getMasteredCardsForDeck, shuffleMasteredCardsBack, toggleShuffleMastered } =
    useDeckStore();
  const masteredCount = deck ? getMasteredCardsForDeck(deck.id).length : 0;

  // For deck mode, show mastery management
  if (mode === 'deck') {
    const handleReset = () => {
      if (!isConfirming) {
        setIsConfirming(true);
        return;
      }
      if (onResetMastery) {
        onResetMastery();
      }
      setIsConfirming(false);
    };

    const cancelConfirm = () => setIsConfirming(false);

    return (
      <div className={styles.container}>
        <h3 className={styles.title}>
          <TrophyIcon size={20} className={styles.titleIcon} />
          Mastery Management
        </h3>

        <div className={styles.resetBox}>
          <p className={styles.resetDescription}>
            Reset the mastered card list for this deck. This will clear all mastery progress and
            allow you to restart learning from scratch.
          </p>

          {masteredCount > 0 && (
            <div className={styles.masteredInfo}>
              Currently, {masteredCount} card{masteredCount === 1 ? ' is' : 's are'} mastered in
              this deck.
            </div>
          )}

          <div className={styles.warningBox}>
            <span className={styles.warningIcon}>⚠️</span>
            <span className={styles.warningText}>
              This action cannot be undone. All mastery progress will be permanently lost.
            </span>
          </div>

          <div className={styles.resetActions}>
            {!isConfirming ? (
              <button className={styles.resetButton} onClick={handleReset}>
                Reset Mastered Cards
              </button>
            ) : (
              <div className={styles.confirmRow}>
                <span className={styles.confirmText}>
                  Are you sure you want to reset all mastery progress?
                </span>
                <div className={styles.confirmButtons}>
                  <button className={styles.confirmButton} onClick={handleReset}>
                    Yes, Reset
                  </button>
                  <button className={styles.cancelButton} onClick={cancelConfirm}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // For learn mode, show mastery settings
  if (mode === 'learn') {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>
          <TrophyIcon size={20} className={styles.titleIcon} />
          Mastery Settings
        </h3>

        <div className={styles.settingsGrid}>
          <label className={styles.settingRow}>
            <div className={styles.labelContainer}>
              <span className={styles.label}>
                Mastery threshold
                <InfoTooltip text="Correct answers needed to master a card" />
              </span>
            </div>
            <input
              type="number"
              min="1"
              max="10"
              value={settings.masteryThreshold || 3}
              onChange={e =>
                onChange(
                  'masteryThreshold',
                  Math.max(1, Math.min(10, parseInt(e.target.value) || 3))
                )
              }
              className={styles.numberInput}
            />
          </label>

          <label className={styles.checkboxRow}>
            <div className={styles.checkboxContainer}>
              <input
                type="checkbox"
                checked={shuffleMasteredCardsBack}
                onChange={() => toggleShuffleMastered()}
                className={styles.checkbox}
              />
              <span className={styles.checkboxLabel}>
                Shuffle mastered cards back
                <InfoTooltip text="Periodically include mastered cards in learning sessions for review" />
              </span>
            </div>
          </label>

          <div className={styles.infoBox}>
            <strong>How mastery works:</strong> Cards are marked as mastered after{' '}
            {settings.masteryThreshold || 3} correct answers. Once mastered, cards can be managed
            from the deck view.
          </div>

          {masteredCount > 0 && (
            <div className={styles.masteredStatus}>
              <TrophyIcon size={16} className={styles.statusIcon} />
              <span>
                {masteredCount} card{masteredCount === 1 ? '' : 's'} mastered in this deck
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // For flashcards mode, show mastered cards settings
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Mastered Cards</h3>

      <div className={styles.masteredSettings}>
        <label className={styles.checkboxRow}>
          <div className={styles.checkboxContainer}>
            <input
              type="checkbox"
              checked={settings.includeMastered !== false}
              onChange={e => onChange('includeMastered', e.target.checked)}
              className={styles.checkbox}
            />
            <span className={styles.checkboxLabel}>Include mastered cards</span>
          </div>
        </label>

        {masteredCount > 0 && (
          <div className={styles.masteredInfo}>
            {masteredCount} card{masteredCount === 1 ? ' is' : 's are'} currently mastered
          </div>
        )}

        {masteredCount > 0 && !settings.includeMastered && (
          <div className={styles.warningBox}>
            <span className={styles.warningIcon}>ℹ️</span>
            <span className={styles.warningText}>
              {masteredCount} mastered card{masteredCount === 1 ? '' : 's'} will be excluded from
              this session
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MasterySettings;
