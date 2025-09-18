import { FC, useMemo } from 'react';
import { motion } from 'framer-motion';
import { UNIVERSAL_PRESETS } from '@/constants/presets';
import { SectionProps } from '../UnifiedSettings';
import styles from './QuickPresets.module.css';

const QuickPresets: FC<SectionProps> = ({ settings, onChange, mode = 'flashcards', deck }) => {
  // Get presets applicable to current mode
  const applicablePresets = useMemo(() => {
    return UNIVERSAL_PRESETS.filter(preset => preset.supportedModes.includes(mode));
  }, [mode]);

  // Determine which preset is currently active (if any)
  const activePresetId = useMemo(() => {
    // Simple heuristic to detect active preset based on current settings
    for (const preset of applicablePresets) {
      const presetSettings = preset.applyToMode(mode, getAvailableSides(settings, deck));
      if (isPresetActive(settings, presetSettings, mode)) {
        return preset.id;
      }
    }
    return null;
  }, [settings, applicablePresets, mode, deck]);

  const handlePresetClick = (presetId: string) => {
    const preset = UNIVERSAL_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    const availableSides = getAvailableSides(settings, deck);
    const presetSettings = preset.applyToMode(mode, availableSides);

    // Apply all preset settings
    Object.entries(presetSettings).forEach(([key, value]) => {
      onChange(key, value);
    });
  };

  if (applicablePresets.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Quick Presets</h3>
      <div className={styles.presets}>
        {applicablePresets.map((preset, index) => (
          <motion.button
            key={preset.id}
            className={`${styles.presetButton} ${
              activePresetId === preset.id ? styles.active : ''
            }`}
            onClick={() => handlePresetClick(preset.id)}
            title={preset.tooltip}
            data-testid={`preset-${preset.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className={styles.presetLabel}>
              {preset.label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// Helper function to get available sides from deck
const getAvailableSides = (_settings: any, deck: any): string[] => {
  // If deck exists and has content, determine available sides from the first card
  if (deck && deck.content && deck.content.length > 0) {
    const firstCard = deck.content[0];
    const availableSides: string[] = [];

    // Check which sides exist on the card
    if (firstCard.side_a !== undefined && firstCard.side_a !== null) availableSides.push('side_a');
    if (firstCard.side_b !== undefined && firstCard.side_b !== null) availableSides.push('side_b');
    if (firstCard.side_c !== undefined && firstCard.side_c !== null) availableSides.push('side_c');
    if (firstCard.side_d !== undefined && firstCard.side_d !== null) availableSides.push('side_d');
    if (firstCard.side_e !== undefined && firstCard.side_e !== null) availableSides.push('side_e');
    if (firstCard.side_f !== undefined && firstCard.side_f !== null) availableSides.push('side_f');

    // Return available sides if we found any
    if (availableSides.length > 0) {
      return availableSides;
    }
  }

  // Fallback to defaults if no deck info
  return ['side_a', 'side_b'];
};

// Helper function to check if preset is currently active
const isPresetActive = (currentSettings: any, presetSettings: any, mode: string): boolean => {
  // Check key settings based on mode
  if (mode === 'flashcards') {
    return (
      JSON.stringify(currentSettings.frontSides) === JSON.stringify(presetSettings.frontSides) &&
      JSON.stringify(currentSettings.backSides) === JSON.stringify(presetSettings.backSides)
    );
  }

  if (mode === 'learn') {
    return (
      JSON.stringify(currentSettings.questionSides) === JSON.stringify(presetSettings.questionSides) &&
      JSON.stringify(currentSettings.answerSides) === JSON.stringify(presetSettings.answerSides) &&
      currentSettings.questionTypeMix === presetSettings.questionTypeMix
    );
  }

  // For other modes, just check front and back sides
  return (
    JSON.stringify(currentSettings.frontSides) === JSON.stringify(presetSettings.frontSides) &&
    JSON.stringify(currentSettings.backSides) === JSON.stringify(presetSettings.backSides)
  );
};

export default QuickPresets;