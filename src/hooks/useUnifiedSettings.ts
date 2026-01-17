import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { UnifiedSettingsConfig } from '@/components/modals/UnifiedSettings';
import { useSettingsStore } from '@/store/settingsStore';
import { UNIVERSAL_PRESETS } from '@/constants/presets';

export const useUnifiedSettings = (
  initialSettings: any,
  config: UnifiedSettingsConfig,
  onUpdateSettings: (settings: any) => void
) => {
  const [localSettings, setLocalSettings] = useState(initialSettings);
  const { saveSettings, getSettings } = useSettingsStore();

  // Track if we've already loaded settings to prevent re-running on initialSettings reference changes
  const hasLoadedRef = useRef(false);
  const persistenceKeyRef = useRef(config.persistenceKey);

  // Load settings only on mount or when persistence key actually changes
  useEffect(() => {
    // Reset loaded flag if persistence key changed (different mode)
    if (persistenceKeyRef.current !== config.persistenceKey) {
      hasLoadedRef.current = false;
      persistenceKeyRef.current = config.persistenceKey;
    }

    // Only load once per persistence key
    if (hasLoadedRef.current) {
      return;
    }

    const stored = getSettings(config.persistenceKey);
    if (stored) {
      // Merge stored settings with initial settings to handle new fields
      setLocalSettings({ ...initialSettings, ...stored });
    } else {
      setLocalSettings(initialSettings);
    }
    hasLoadedRef.current = true;
  }, [config.persistenceKey, getSettings, initialSettings]);

  // Update a single setting
  const updateSetting = useCallback((key: string, value: any) => {
    setLocalSettings((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Apply a preset
  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = UNIVERSAL_PRESETS.find(p => p.id === presetId);
      if (!preset || !preset.supportedModes.includes(config.mode)) {
        return;
      }

      // Get available sides for this deck
      const availableSides = getAvailableSidesFromSettings(localSettings);
      const presetSettings = preset.applyToMode(config.mode, availableSides);

      setLocalSettings((prev: any) => ({
        ...prev,
        ...presetSettings,
      }));
    },
    [config.mode, localSettings]
  );

  // Validate settings
  const validate = useCallback(
    (settings: any): Record<string, string> => {
      const errors: Record<string, string> = {};

      config.validationRules.forEach(rule => {
        if (!rule.validator(settings[rule.field], settings)) {
          errors[rule.field] = rule.errorMessage;
        }
      });

      return errors;
    },
    [config.validationRules]
  );

  // Save settings
  const handleSave = useCallback(async () => {
    const validationErrors = validate(localSettings);
    if (Object.keys(validationErrors).length > 0) {
      throw new Error('Validation failed');
    }

    // Save to store
    saveSettings(config.persistenceKey, localSettings);

    // Call parent update handler
    onUpdateSettings(localSettings);
  }, [localSettings, validate, saveSettings, config.persistenceKey, onUpdateSettings]);

  // Get applicable presets for current mode
  const applicablePresets = useMemo(() => {
    return UNIVERSAL_PRESETS.filter(p => p.supportedModes.includes(config.mode));
  }, [config.mode]);

  return {
    localSettings,
    updateSetting,
    applyPreset,
    handleSave,
    validate,
    applicablePresets,
  };
};

// Helper function to extract available sides from settings
const getAvailableSidesFromSettings = (settings: any): string[] => {
  // Try to extract from various settings formats
  if (settings.frontSides && settings.backSides) {
    const allSides = [...settings.frontSides, ...settings.backSides];
    return [...new Set(allSides)];
  }

  if (settings.questionSides && settings.answerSides) {
    const allSides = [...settings.questionSides, ...settings.answerSides];
    return [...new Set(allSides)];
  }

  // Default sides
  return ['side_a', 'side_b'];
};
