import { FC, memo, useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Deck, FlashcardsSettings, LearnModeSettings, ModeSettings, ReadModeSettings } from '@/types';
import { MatchSettings as MatchSettingsType } from '@/components/modes/match/types';
import { useUnifiedSettings } from '@/hooks/useUnifiedSettings';
import styles from './UnifiedSettings.module.css';

// Settings Section Components
import QuickPresets from './settings/QuickPresets';
import SideConfiguration from './settings/SideConfiguration';
import ProgressionSettings from './settings/ProgressionSettings';
import LearningSettings from './settings/LearningSettings';
import MasterySettings from './settings/MasterySettings';
import DeckInformation from './settings/DeckInformation';
import MatchSettingsComponent from './settings/MatchSettings';
import ReadSettings from './settings/ReadSettings';

export interface UnifiedSettingsProps {
  visible: boolean;
  onClose: () => void;
  deck: Deck | null;
  mode: 'flashcards' | 'learn' | 'deck' | 'match' | 'test' | 'read';
  settings: FlashcardsSettings | LearnModeSettings | ModeSettings | MatchSettingsType | ReadModeSettings;
  onUpdateSettings: (settings: FlashcardsSettings | LearnModeSettings | ModeSettings | MatchSettingsType | ReadModeSettings) => void;
  onResetMastery?: () => void; // Only for deck mode
}

export interface UnifiedSettingsConfig {
  mode: 'flashcards' | 'learn' | 'deck' | 'match' | 'test' | 'read';
  availableSections: SettingsSection[];
  presets: PresetDefinition[];
  persistenceKey: string;
  validationRules: ValidationRule[];
}

export interface SettingsSection {
  id: string;
  title: string;
  description?: string;
  visible: boolean;
  required?: boolean;
  component: FC<SectionProps>;
  order: number;
}

export interface SectionProps {
  settings: any;
  onChange: (key: string, value: any) => void;
  deck?: Deck | null;
  mode?: string;
  error?: string;
}

export interface PresetDefinition {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  tooltip: string;
  applyToMode: (mode: string, availableSides: string[]) => Partial<ModeSettings>;
  supportedModes: string[];
}

export interface ValidationRule {
  field: string;
  validator: (value: any, settings: any) => boolean;
  errorMessage: string;
}

// Get configuration for the current mode
const getConfigForMode = (mode: string, _deck: Deck | null): UnifiedSettingsConfig => {
  const sections: Record<string, SettingsSection[]> = {
    flashcards: [
      {
        id: 'quick_presets',
        title: 'Quick Presets',
        visible: true,
        component: QuickPresets,
        order: 1,
      },
      {
        id: 'front_sides',
        title: 'Card Front',
        description: 'Select which sides appear on the front of the card',
        visible: true,
        required: true,
        component: SideConfiguration,
        order: 2,
      },
      {
        id: 'back_sides',
        title: 'Card Back',
        description: 'Select which sides appear on the back of the card',
        visible: true,
        required: true,
        component: SideConfiguration,
        order: 3,
      },
      {
        id: 'progression',
        title: 'Card Progression',
        description: 'Choose how cards are presented during your session',
        visible: true,
        component: ProgressionSettings,
        order: 4,
      },
      {
        id: 'mastered_cards',
        title: 'Mastered Cards',
        visible: true,
        component: MasterySettings,
        order: 5,
      },
    ],
    learn: [
      {
        id: 'quick_presets',
        title: 'Quick Presets',
        visible: true,
        component: QuickPresets,
        order: 1,
      },
      {
        id: 'question_sides',
        title: 'Question Sides',
        description: 'Select which sides to use for questions',
        visible: true,
        required: true,
        component: SideConfiguration,
        order: 2,
      },
      {
        id: 'answer_sides',
        title: 'Answer Sides',
        description: 'Select which sides to use for answers',
        visible: true,
        required: true,
        component: SideConfiguration,
        order: 3,
      },
      {
        id: 'learning_settings',
        title: 'Learning Settings',
        visible: true,
        component: LearningSettings,
        order: 4,
      },
      {
        id: 'progression',
        title: 'Progression Mode',
        visible: true,
        component: ProgressionSettings,
        order: 5,
      },
      {
        id: 'mastery_settings',
        title: 'Mastery Settings',
        visible: true,
        component: MasterySettings,
        order: 6,
      },
    ],
    deck: [
      {
        id: 'deck_information',
        title: 'Deck Information',
        visible: true,
        component: DeckInformation,
        order: 1,
      },
      {
        id: 'mastery_management',
        title: 'Mastery Management',
        visible: true,
        component: MasterySettings,
        order: 2,
      },
    ],
    match: [
      {
        id: 'quick_presets',
        title: 'Quick Presets',
        visible: true,
        component: QuickPresets,
        order: 1,
      },
      {
        id: 'match_settings',
        title: 'Match Game Settings',
        description: 'Configure grid size, match type, and game options',
        visible: true,
        required: true,
        component: MatchSettingsComponent,
        order: 2,
      },
      {
        id: 'mastery_settings',
        title: 'Mastery Settings',
        description: 'Control which cards appear in the game',
        visible: true,
        component: MasterySettings,
        order: 3,
      },
    ],
    test: [
      {
        id: 'quick_presets',
        title: 'Quick Presets',
        visible: true,
        component: QuickPresets,
        order: 1,
      },
      {
        id: 'test_configuration',
        title: 'Test Configuration',
        visible: false, // Future implementation
        component: QuickPresets, // Placeholder
        order: 2,
      },
    ],
    read: [
      {
        id: 'read_settings',
        title: 'Read Mode Settings',
        description: 'Configure translation direction and answer options',
        visible: true,
        required: true,
        component: ReadSettings,
        order: 1,
      },
    ],
  };

  const validation: Record<string, ValidationRule[]> = {
    flashcards: [
      {
        field: 'frontSides',
        validator: (value: string[]) => value && value.length > 0,
        errorMessage: 'At least one front side is required',
      },
      {
        field: 'backSides',
        validator: (value: string[]) => value && value.length > 0,
        errorMessage: 'At least one back side is required',
      },
    ],
    learn: [
      {
        field: 'questionSides',
        validator: (value: string[]) => value && value.length > 0,
        errorMessage: 'At least one question side is required',
      },
      {
        field: 'answerSides',
        validator: (value: string[]) => value && value.length > 0,
        errorMessage: 'At least one answer side is required',
      },
      {
        field: 'duplicateSides',
        validator: (_: any, settings: LearnModeSettings) => {
          const duplicates = settings.questionSides.filter(s => settings.answerSides.includes(s));
          return duplicates.length === 0;
        },
        errorMessage: 'Same side cannot be both question and answer',
      },
      {
        field: 'cardsPerRound',
        validator: (value: number) => value >= 5 && value <= 50,
        errorMessage: 'Cards per round must be between 5 and 50',
      },
    ],
    deck: [],
    match: [
      {
        field: 'gridSize',
        validator: (value: any) => value && value.rows >= 2 && value.cols >= 2 && (value.rows * value.cols) >= 6,
        errorMessage: 'Grid must be at least 2x2 with minimum 6 cards',
      },
      {
        field: 'cardSides',
        validator: (value: any[]) => value && value.length >= 2 && value.every(side => side.count > 0),
        errorMessage: 'At least 2 card side configurations required with positive counts',
      },
      {
        field: 'timerSeconds',
        validator: (value: number, settings: any) => !settings.enableTimer || value >= 0,
        errorMessage: 'Timer seconds must be 0 or positive when timer is enabled',
      },
    ],
    test: [],
    read: [
      {
        field: 'translationDirection',
        validator: (value: any) => value && value.from && value.to && value.from !== value.to,
        errorMessage: 'Translation direction must have different from and to sides',
      },
      {
        field: 'optionsCount',
        validator: (value: any) => !value || value >= 2,
        errorMessage: 'Options count must be at least 2',
      },
    ],
  };

  return {
    mode: mode as any,
    availableSections: sections[mode] || [],
    presets: [], // Will be populated by the preset system
    persistenceKey: `unified-settings-${mode}`,
    validationRules: validation[mode] || [],
  };
};

export const UnifiedSettings: FC<UnifiedSettingsProps> = memo(
  ({ visible, onClose, deck, mode, settings, onUpdateSettings, onResetMastery }) => {
    const [isLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const config = useMemo(() => getConfigForMode(mode, deck), [mode, deck]);

    const { localSettings, updateSetting, handleSave, validate } = useUnifiedSettings(
      settings,
      config,
      onUpdateSettings
    );

    // Clear errors when modal closes
    useEffect(() => {
      if (!visible) {
        setErrors({});
        setIsSaving(false);
      }
    }, [visible]);

    // Handle save with loading state
    const onSave = async () => {
      const validationErrors = validate(localSettings);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      setIsSaving(true);
      try {
        await handleSave();
        onClose();
      } catch (error) {
        setErrors({ save: 'Failed to save settings. Please try again.' });
      } finally {
        setIsSaving(false);
      }
    };

    // Get title based on mode
    const getModalTitle = () => {
      const titles = {
        flashcards: 'Flashcard Settings',
        learn: 'Learn Mode Settings',
        deck: 'Deck Settings',
        match: 'Match Settings',
        test: 'Test Settings',
        read: 'Read Settings',
      };
      return titles[mode] || 'Settings';
    };

    if (!deck && mode !== 'deck') return null;

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
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
              }}
            >
              <header className={styles.header}>
                <h2 className={styles.title}>{getModalTitle()}</h2>
                <button
                  className={styles.closeButton}
                  onClick={onClose}
                  aria-label="Close settings"
                >
                  ✕
                </button>
              </header>

              <div className={styles.content}>
                {isLoading ? (
                  <div className={styles.loadingContainer}>
                    <div className={styles.spinner} data-testid="loading-spinner" />
                    <span>Loading settings...</span>
                  </div>
                ) : (
                  <>
                    {/* Render sections based on mode */}
                    {config.availableSections
                      .filter(section => section.visible)
                      .sort((a, b) => a.order - b.order)
                      .map(section => {
                        const SectionComponent = section.component;
                        const sectionError = errors[section.id] || '';

                        // Map section IDs to appropriate settings keys
                        const sectionSettings = getSectionSettings(section.id, localSettings);

                        return (
                          <motion.section
                            key={section.id}
                            className={styles.section}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              delay: section.order * 0.05,
                              type: 'spring',
                              stiffness: 100,
                            }}
                          >
                            <SectionComponent
                              settings={sectionSettings}
                              onChange={updateSetting}
                              deck={deck}
                              mode={mode}
                              error={sectionError}
                            />
                          </motion.section>
                        );
                      })}

                    {/* Error display */}
                    {Object.keys(errors).length > 0 && (
                      <motion.div
                        className={styles.errorContainer}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        role="alert"
                      >
                        {Object.values(errors).map((error, index) => (
                          <div key={index} className={styles.errorMessage}>
                            {error}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </>
                )}
              </div>

              <footer className={styles.footer}>
                <button className={styles.cancelButton} onClick={onClose}>
                  Cancel
                </button>
                {mode === 'deck' && onResetMastery ? (
                  <button className={styles.resetButton} onClick={onResetMastery}>
                    Reset Mastery
                  </button>
                ) : (
                  <button
                    className={styles.saveButton}
                    onClick={onSave}
                    disabled={isSaving || Object.keys(errors).length > 0}
                  >
                    {isSaving ? 'Saving...' : 'Save Settings'}
                  </button>
                )}
              </footer>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }
);

// Helper function to map section IDs to settings
const getSectionSettings = (sectionId: string, settings: any): any => {
  // For preset section, return the full settings
  if (sectionId === 'quick_presets') {
    return settings;
  }

  // For side configuration sections, return appropriate settings with section type
  if (sectionId === 'front_sides' || sectionId === 'back_sides') {
    return {
      ...settings,
      sectionType: sectionId === 'front_sides' ? 'front' : 'back',
    };
  }

  if (sectionId === 'question_sides' || sectionId === 'answer_sides') {
    return {
      ...settings,
      sectionType: sectionId === 'question_sides' ? 'question' : 'answer',
    };
  }

  // For match settings section, return the full match settings
  if (sectionId === 'match_settings') {
    return settings;
  }

  // For mastery settings, return the full settings
  if (sectionId === 'mastery_settings') {
    return settings;
  }

  // For other sections, return the full settings
  return settings;
};

UnifiedSettings.displayName = 'UnifiedSettings';

export default UnifiedSettings;
