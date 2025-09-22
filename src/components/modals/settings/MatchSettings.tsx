import { FC } from 'react';
import { SectionProps } from '../UnifiedSettings';
import { MatchSettings as MatchSettingsType } from '@/components/modes/match/types';
import { ClockIcon, DragHandleIcon } from '@/components/icons/StatusIcons';
import styles from './MatchSettings.module.css';

// Info Icon Component for tooltips
const InfoTooltip: FC<{ text: string }> = ({ text }) => (
  <span className={styles.infoTooltipWrapper}>
    <span className={styles.infoIcon}>ℹ️</span>
    <span className={styles.infoTooltip}>{text}</span>
  </span>
);

// Grid size presets
const GRID_PRESETS = [
  { label: 'Small (2×3)', rows: 2, cols: 3, cards: 6 },
  { label: 'Medium (3×4)', rows: 3, cols: 4, cards: 12 },
  { label: 'Large (4×4)', rows: 4, cols: 4, cards: 16 },
  { label: 'Extra Large (4×5)', rows: 4, cols: 5, cards: 20 },
] as const;

const MatchSettings: FC<SectionProps> = ({ settings, onChange, deck }) => {
  const matchSettings = settings as MatchSettingsType;

  // Get available sides from the deck based on available_sides count
  const availableSidesCount = deck?.metadata?.available_sides || 2;
  const availableSides: string[] = [];
  for (let i = 0; i < Math.min(availableSidesCount, 6); i++) {
    const sideKeys = ['side_a', 'side_b', 'side_c', 'side_d', 'side_e', 'side_f'];
    availableSides.push(sideKeys[i]);
  }

  // Helper to get side display name
  const getSideDisplayName = (side: string): string => {
    const sideMap: Record<string, string> = {
      side_a: 'Side A',
      side_b: 'Side B',
      side_c: 'Side C',
      side_d: 'Side D',
      side_e: 'Side E',
      side_f: 'Side F',
    };
    return sideMap[side] || side.replace('side_', 'Side ').toUpperCase();
  };

  // Handle grid size change
  const handleGridSizeChange = (rows: number, cols: number) => {
    onChange('gridSize', { rows, cols });
  };

  // Handle match type change
  const handleMatchTypeChange = (matchType: MatchSettingsType['matchType']) => {
    onChange('matchType', matchType);

    // Update card sides configuration based on match type
    const totalCards = matchSettings.gridSize.rows * matchSettings.gridSize.cols;
    const cardsPerSide = Math.floor(totalCards / 2);

    let newCardSides;
    switch (matchType) {
      case 'two_way':
        newCardSides = [
          { sides: ['side_a'], label: getSideDisplayName('side_a'), count: cardsPerSide },
          { sides: ['side_b'], label: getSideDisplayName('side_b'), count: cardsPerSide },
        ];
        break;
      case 'three_way':
        const cardsPerSideThree = Math.floor(totalCards / 3);
        newCardSides = [
          { sides: ['side_a'], label: getSideDisplayName('side_a'), count: cardsPerSideThree },
          { sides: ['side_b'], label: getSideDisplayName('side_b'), count: cardsPerSideThree },
          { sides: ['side_c'], label: getSideDisplayName('side_c'), count: cardsPerSideThree },
        ];
        break;
      case 'custom':
        // Keep existing configuration for custom
        newCardSides = matchSettings.cardSides;
        break;
      default:
        newCardSides = matchSettings.cardSides;
    }

    onChange('cardSides', newCardSides);
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>
        <DragHandleIcon size={20} className={styles.titleIcon} />
        Match Game Settings
      </h3>

      <div className={styles.settingsGrid}>
        {/* Grid Size */}
        <div className={styles.settingSection}>
          <label className={styles.sectionLabel}>
            Grid Size
            <InfoTooltip text="Choose how many cards appear in the match grid" />
          </label>

          <div className={styles.gridPresets}>
            {GRID_PRESETS.map((preset) => (
              <button
                key={`${preset.rows}x${preset.cols}`}
                type="button"
                className={`${styles.gridPresetButton} ${
                  matchSettings.gridSize.rows === preset.rows &&
                  matchSettings.gridSize.cols === preset.cols
                    ? styles.active
                    : ''
                }`}
                onClick={() => handleGridSizeChange(preset.rows, preset.cols)}
              >
                <span className={styles.presetLabel}>{preset.label}</span>
                <span className={styles.presetInfo}>{preset.cards} cards</span>
              </button>
            ))}
          </div>

          {/* Custom grid size */}
          <div className={styles.customGridSize}>
            <span className={styles.customLabel}>Custom Size:</span>
            <div className={styles.gridInputs}>
              <label className={styles.gridInput}>
                <span>Rows</span>
                <input
                  type="number"
                  min="2"
                  max="6"
                  value={matchSettings.gridSize.rows}
                  onChange={e => {
                    const rows = parseInt(e.target.value) || 2;
                    handleGridSizeChange(rows, matchSettings.gridSize.cols);
                  }}
                  className={styles.numberInput}
                />
              </label>
              <span className={styles.gridMultiplier}>×</span>
              <label className={styles.gridInput}>
                <span>Cols</span>
                <input
                  type="number"
                  min="2"
                  max="6"
                  value={matchSettings.gridSize.cols}
                  onChange={e => {
                    const cols = parseInt(e.target.value) || 2;
                    handleGridSizeChange(matchSettings.gridSize.rows, cols);
                  }}
                  className={styles.numberInput}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Match Type */}
        <div className={styles.settingSection}>
          <label className={styles.sectionLabel}>
            Match Type
            <InfoTooltip text="How cards should match together" />
          </label>

          <div className={styles.matchTypeOptions}>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="matchType"
                value="two_way"
                checked={matchSettings.matchType === 'two_way'}
                onChange={() => handleMatchTypeChange('two_way')}
                className={styles.radioInput}
              />
              <div className={styles.radioContent}>
                <span className={styles.radioLabel}>Two-Way Matching</span>
                <span className={styles.radioDescription}>Match Side A ↔ Side B</span>
              </div>
            </label>

            <label className={styles.radioOption}>
              <input
                type="radio"
                name="matchType"
                value="three_way"
                checked={matchSettings.matchType === 'three_way'}
                onChange={() => handleMatchTypeChange('three_way')}
                className={styles.radioInput}
                disabled={availableSides.length < 3}
              />
              <div className={styles.radioContent}>
                <span className={styles.radioLabel}>Three-Way Matching</span>
                <span className={styles.radioDescription}>
                  {availableSides.length < 3 ? 'Requires 3+ sides' : 'Match A ↔ B ↔ C'}
                </span>
              </div>
            </label>

            <label className={styles.radioOption}>
              <input
                type="radio"
                name="matchType"
                value="custom"
                checked={matchSettings.matchType === 'custom'}
                onChange={() => handleMatchTypeChange('custom')}
                className={styles.radioInput}
              />
              <div className={styles.radioContent}>
                <span className={styles.radioLabel}>Custom Configuration</span>
                <span className={styles.radioDescription}>Configure manually below</span>
              </div>
            </label>
          </div>
        </div>

        {/* Card Sides Configuration (shown for custom or when configured) */}
        {(matchSettings.matchType === 'custom' || matchSettings.cardSides.length > 0) && (
          <div className={styles.settingSection}>
            <label className={styles.sectionLabel}>
              Card Sides to Display
              <InfoTooltip text="Configure which sides appear and how many cards show each side" />
            </label>

            <div className={styles.cardSidesConfig}>
              {matchSettings.cardSides.map((cardSide, index) => (
                <div key={index} className={styles.cardSideRow}>
                  <div className={styles.sideSelection}>
                    <label className={styles.sideLabel}>
                      Side to show:
                      <select
                        value={cardSide.sides[0] || 'side_a'}
                        onChange={e => {
                          const newCardSides = [...matchSettings.cardSides];
                          newCardSides[index] = {
                            ...cardSide,
                            sides: [e.target.value],
                            label: getSideDisplayName(e.target.value),
                          };
                          onChange('cardSides', newCardSides);
                        }}
                        className={styles.select}
                      >
                        {availableSides.map(side => (
                          <option key={side} value={side}>
                            {getSideDisplayName(side)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className={styles.sideCount}>
                    <label className={styles.sideLabel}>
                      Card count:
                      <input
                        type="number"
                        min="1"
                        max={matchSettings.gridSize.rows * matchSettings.gridSize.cols - 1}
                        value={cardSide.count}
                        onChange={e => {
                          const newCardSides = [...matchSettings.cardSides];
                          newCardSides[index] = {
                            ...cardSide,
                            count: parseInt(e.target.value) || 1,
                          };
                          onChange('cardSides', newCardSides);
                        }}
                        className={styles.numberInput}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timer Settings */}
        <div className={styles.settingSection}>
          <label className={styles.sectionLabel}>
            <ClockIcon size={18} className={styles.sectionIcon} />
            Timer Settings
          </label>

          <label className={styles.checkboxRow}>
            <div className={styles.checkboxContainer}>
              <input
                type="checkbox"
                checked={matchSettings.enableTimer === true}
                onChange={e => onChange('enableTimer', e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.checkboxLabel}>Enable timer</span>
            </div>
          </label>

          {matchSettings.enableTimer && (
            <div className={styles.timerOptions}>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="timerMode"
                  checked={matchSettings.timerSeconds === 0}
                  onChange={() => onChange('timerSeconds', 0)}
                  className={styles.radioInput}
                />
                <div className={styles.radioContent}>
                  <span className={styles.radioLabel}>Count-up Timer</span>
                  <span className={styles.radioDescription}>Track your completion time</span>
                </div>
              </label>

              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="timerMode"
                  checked={matchSettings.timerSeconds > 0}
                  onChange={() => onChange('timerSeconds', 120)}
                  className={styles.radioInput}
                />
                <div className={styles.radioContent}>
                  <span className={styles.radioLabel}>Countdown Timer</span>
                  <span className={styles.radioDescription}>Race against time</span>
                </div>
              </label>

              {matchSettings.timerSeconds > 0 && (
                <label className={styles.settingRow}>
                  <span className={styles.label}>Time limit (seconds)</span>
                  <input
                    type="number"
                    min="30"
                    max="600"
                    value={matchSettings.timerSeconds}
                    onChange={e => {
                      const value = parseInt(e.target.value) || 120;
                      onChange('timerSeconds', Math.max(30, Math.min(600, value)));
                    }}
                    className={styles.numberInput}
                  />
                </label>
              )}
            </div>
          )}
        </div>

        {/* Additional Options */}
        <div className={styles.settingSection}>
          <label className={styles.sectionLabel}>Additional Options</label>

          <label className={styles.checkboxRow}>
            <div className={styles.checkboxContainer}>
              <input
                type="checkbox"
                checked={matchSettings.includeMastered === true}
                onChange={e => onChange('includeMastered', e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.checkboxLabel}>
                Include mastered cards
                <InfoTooltip text="Include cards you've already mastered in the game" />
              </span>
            </div>
          </label>

          <label className={styles.checkboxRow}>
            <div className={styles.checkboxContainer}>
              <input
                type="checkbox"
                checked={matchSettings.enableAudio === true}
                onChange={e => onChange('enableAudio', e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.checkboxLabel}>
                Enable sound effects
                <InfoTooltip text="Play sounds for matches and game completion" />
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Settings Summary */}
      <div className={styles.settingsSummary}>
        <h4 className={styles.summaryTitle}>Current Configuration</h4>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Grid:</span>
            <span className={styles.summaryValue}>
              {matchSettings.gridSize.rows}×{matchSettings.gridSize.cols}
              ({matchSettings.gridSize.rows * matchSettings.gridSize.cols} cards)
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Match Type:</span>
            <span className={styles.summaryValue}>
              {matchSettings.matchType === 'two_way' && 'Two-Way'}
              {matchSettings.matchType === 'three_way' && 'Three-Way'}
              {matchSettings.matchType === 'custom' && 'Custom'}
            </span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Timer:</span>
            <span className={styles.summaryValue}>
              {matchSettings.enableTimer
                ? (matchSettings.timerSeconds === 0 ? 'Count-up' : `${matchSettings.timerSeconds}s countdown`)
                : 'Disabled'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchSettings;