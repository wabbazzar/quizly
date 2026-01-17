import { FC, useEffect, useMemo } from 'react';
import { SectionProps } from '../UnifiedSettings';
import { ReadModeSettings, SideId } from '@/types';
import styles from './ReadSettings.module.css';

const ReadSettings: FC<SectionProps> = ({ settings, onChange, deck }) => {
  const readSettings = settings as ReadModeSettings;

  // Get available sides from deck, with data-driven fallback from deck metadata
  const availableSides = useMemo(() => {
    // First priority: deck.reading.sides (explicit reading mode sides)
    if (deck?.reading?.sides) {
      return deck.reading.sides;
    }

    // Second priority: derive from deck.metadata.side_labels
    if (deck?.metadata?.side_labels) {
      const labels = deck.metadata.side_labels;
      const sides: Partial<Record<SideId, string>> = {};

      // Map side_a/side_b/etc to a/b/etc with proper labels
      if (labels.side_a) sides.a = labels.side_a;
      if (labels.side_b) sides.b = labels.side_b;
      if (labels.side_c) sides.c = labels.side_c;
      if (labels.side_d) sides.d = labels.side_d;
      if (labels.side_e) sides.e = labels.side_e;
      if (labels.side_f) sides.f = labels.side_f;

      if (Object.keys(sides).length > 0) {
        return sides;
      }
    }

    // Last resort: generic fallback
    return {
      a: 'Side A',
      b: 'Side B',
      c: 'Side C'
    };
  }, [deck]);

  const sideOptions = useMemo(() =>
    Object.entries(availableSides)
      .filter(([_, label]) => label)
      .map(([side, label]) => ({
        value: side as SideId,
        label: label as string
      })),
    [availableSides]
  );

  // Validate and auto-correct translation direction if sides don't exist in current deck
  useEffect(() => {
    if (sideOptions.length < 2) return;

    const validSideIds = sideOptions.map(opt => opt.value);
    const currentFrom = readSettings.translationDirection?.from;
    const currentTo = readSettings.translationDirection?.to;

    const fromIsValid = currentFrom && validSideIds.includes(currentFrom);
    const toIsValid = currentTo && validSideIds.includes(currentTo);

    // If either side is invalid, reset to valid defaults
    if (!fromIsValid || !toIsValid) {
      const newFrom = fromIsValid ? currentFrom : validSideIds[0];
      // Pick the first different side for 'to'
      const newTo = toIsValid && currentTo !== newFrom
        ? currentTo
        : validSideIds.find(id => id !== newFrom) || validSideIds[1] || validSideIds[0];

      if (newFrom !== currentFrom || newTo !== currentTo) {
        onChange('translationDirection', { from: newFrom, to: newTo });
      }
    }
  }, [sideOptions, readSettings.translationDirection, onChange]);

  // Handle translation direction change
  const handleDirectionChange = (fromOrTo: 'from' | 'to', value: string) => {
    const newDirection = { ...readSettings.translationDirection };
    newDirection[fromOrTo] = value as SideId;
    onChange('translationDirection', newDirection);
  };

  return (
    <div className={styles.settingsSection}>
      <h3 className={styles.sectionTitle}>Read Mode Settings</h3>

      {/* Answer Type */}
      <div className={styles.settingGroup}>
        <label className={styles.settingLabel}>
          Answer Type
          <span className={styles.settingHint}>How you want to practice translation</span>
        </label>
        <div className={styles.radioGroup}>
          <label className={styles.radioOption}>
            <input
              type="radio"
              name="answerType"
              value="free_text"
              checked={readSettings.answerType === 'free_text'}
              onChange={(e) => onChange('answerType', e.target.value)}
            />
            <span>Free Text</span>
          </label>
          <label className={styles.radioOption}>
            <input
              type="radio"
              name="answerType"
              value="multiple_choice"
              checked={readSettings.answerType === 'multiple_choice'}
              onChange={(e) => onChange('answerType', e.target.value)}
            />
            <span>Multiple Choice</span>
          </label>
        </div>
      </div>

      {/* Check Mode */}
      <div className={styles.settingGroup}>
        <label className={styles.settingLabel}>
          Check Mode
          <span className={styles.settingHint}>When to check your answers</span>
        </label>
        <div className={styles.radioGroup}>
          <label className={styles.radioOption}>
            <input
              type="radio"
              name="checkMode"
              value="live"
              checked={readSettings.checkMode === 'live'}
              onChange={(e) => onChange('checkMode', e.target.value)}
            />
            <span>Live (check as you type)</span>
          </label>
          <label className={styles.radioOption}>
            <input
              type="radio"
              name="checkMode"
              value="wait"
              checked={readSettings.checkMode === 'wait'}
              onChange={(e) => onChange('checkMode', e.target.value)}
            />
            <span>Wait (check on submit)</span>
          </label>
        </div>
      </div>

      {/* Translation Mode */}
      <div className={styles.settingGroup}>
        <label className={styles.settingLabel}>
          Translation Mode
          <span className={styles.settingHint}>How to practice translation</span>
        </label>
        <div className={styles.radioGroup}>
          <label className={styles.radioOption}>
            <input
              type="radio"
              name="translationMode"
              value="sentence"
              checked={readSettings.translationMode === 'sentence'}
              onChange={(e) => onChange('translationMode', e.target.value)}
            />
            <span>Full Sentence (Recommended)</span>
          </label>
          <label className={styles.radioOption}>
            <input
              type="radio"
              name="translationMode"
              value="token"
              checked={readSettings.translationMode === 'token'}
              onChange={(e) => onChange('translationMode', e.target.value)}
            />
            <span>Word/Character by Word</span>
          </label>
        </div>
      </div>

      {/* Translation Direction */}
      <div className={styles.settingGroup}>
        <label className={styles.settingLabel}>
          Translation Direction
          <span className={styles.settingHint}>What to translate from and to</span>
        </label>
        <div className={styles.selectGroup}>
          <div className={styles.selectWrapper}>
            <label className={styles.selectLabel}>From:</label>
            <select
              value={readSettings.translationDirection.from}
              onChange={(e) => handleDirectionChange('from', e.target.value)}
              className={styles.select}
            >
              {sideOptions.map(option => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.value === readSettings.translationDirection.to}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <span className={styles.directionArrow}>→</span>
          <div className={styles.selectWrapper}>
            <label className={styles.selectLabel}>To:</label>
            <select
              value={readSettings.translationDirection.to}
              onChange={(e) => handleDirectionChange('to', e.target.value)}
              className={styles.select}
            >
              {sideOptions.map(option => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.value === readSettings.translationDirection.from}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Multiple Choice Settings */}
      {readSettings.answerType === 'multiple_choice' && (
        <>
          <div className={styles.settingGroup}>
            <label className={styles.settingLabel}>
              Number of Options
              <span className={styles.settingHint}>How many choices to show</span>
            </label>
            <input
              type="number"
              min="2"
              max="8"
              value={readSettings.optionsCount || 4}
              onChange={(e) => onChange('optionsCount', parseInt(e.target.value))}
              className={styles.numberInput}
            />
          </div>

          <div className={styles.settingGroup}>
            <label className={styles.settingLabel}>
              Difficulty
              <span className={styles.settingHint}>Controls distractor pool</span>
            </label>
            <div className={styles.radioGroup}>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="difficulty"
                  value="easy"
                  checked={readSettings.multipleChoiceDifficulty === 'easy'}
                  onChange={(e) => onChange('multipleChoiceDifficulty', e.target.value)}
                />
                <span>Easy (same line)</span>
              </label>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="difficulty"
                  value="medium"
                  checked={readSettings.multipleChoiceDifficulty === 'medium'}
                  onChange={(e) => onChange('multipleChoiceDifficulty', e.target.value)}
                />
                <span>Medium (same dialogue)</span>
              </label>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="difficulty"
                  value="hard"
                  checked={readSettings.multipleChoiceDifficulty === 'hard'}
                  onChange={(e) => onChange('multipleChoiceDifficulty', e.target.value)}
                />
                <span>Hard (any dialogue)</span>
              </label>
            </div>
          </div>
        </>
      )}

      {/* Sentence Mode Settings */}
      {readSettings.translationMode === 'sentence' && (
        <>
          <div className={styles.settingGroup}>
            <label className={styles.settingLabel}>
              Accuracy Threshold
              <span className={styles.settingHint}>Minimum similarity % for partial credit</span>
            </label>
            <input
              type="number"
              min="50"
              max="100"
              step="5"
              value={readSettings.accuracyThreshold || 70}
              onChange={(e) => onChange('accuracyThreshold', parseInt(e.target.value))}
              className={styles.numberInput}
            />
          </div>

          <div className={styles.settingGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={readSettings.showWordHints !== false}
                onChange={(e) => onChange('showWordHints', e.target.checked)}
              />
              <span>Show Word Hints on Hover/Tap</span>
            </label>
          </div>
        </>
      )}

      {/* Display Settings */}
      <div className={styles.settingGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={readSettings.showPinyinDefault}
            onChange={(e) => onChange('showPinyinDefault', e.target.checked)}
          />
          <span>Show Pinyin by Default</span>
        </label>
      </div>

      {/* Token Unit */}
      <div className={styles.settingGroup}>
        <label className={styles.settingLabel}>
          Token Unit
          <span className={styles.settingHint}>How to split text for practice</span>
        </label>
        <div className={styles.radioGroup}>
          <label className={styles.radioOption}>
            <input
              type="radio"
              name="unit"
              value="character"
              checked={readSettings.unit === 'character'}
              onChange={(e) => onChange('unit', e.target.value)}
            />
            <span>Character</span>
          </label>
          <label className={styles.radioOption}>
            <input
              type="radio"
              name="unit"
              value="word"
              checked={readSettings.unit === 'word'}
              onChange={(e) => onChange('unit', e.target.value)}
            />
            <span>Word</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default ReadSettings;