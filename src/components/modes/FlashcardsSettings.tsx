import React, { FC, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors, spacing, typography, borderRadius } from '@/theme';
import { FlashcardsSettings } from '@/types';
import { Ionicons } from '@expo/vector-icons';

interface FlashcardsSettingsProps {
  visible: boolean;
  onClose: () => void;
  settings: FlashcardsSettings;
  onUpdateSettings: (settings: FlashcardsSettings) => void;
  availableSides: number;
}

export const FlashcardsSettingsModal: FC<FlashcardsSettingsProps> = ({
  visible,
  onClose,
  settings,
  onUpdateSettings,
  availableSides,
}) => {
  const [localSettings, setLocalSettings] = useState(settings);

  const sideOptions = ['side_a', 'side_b', 'side_c', 'side_d', 'side_e', 'side_f']
    .slice(0, availableSides);

  const toggleSide = (type: 'front' | 'back', side: string) => {
    const key = type === 'front' ? 'frontSides' : 'backSides';
    const currentSides = localSettings[key];

    const newSides = currentSides.includes(side)
      ? currentSides.filter(s => s !== side)
      : [...currentSides, side];

    setLocalSettings({
      ...localSettings,
      [key]: newSides,
    });
  };

  const applyPreset = (preset: string) => {
    let newSettings = { ...localSettings };

    switch (preset) {
      case 'englishToChinese':
        newSettings.frontSides = ['side_a'];
        newSettings.backSides = ['side_b', 'side_c'];
        break;
      case 'chineseToEnglish':
        newSettings.frontSides = ['side_c'];
        newSettings.backSides = ['side_a', 'side_b'];
        break;
      case 'comprehensive':
        newSettings.frontSides = ['side_a'];
        newSettings.backSides = ['side_b', 'side_c', 'side_d'];
        break;
    }

    setLocalSettings(newSettings);
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Flashcard Settings</Text>
          <Pressable onPress={handleSave} style={styles.closeButton}>
            <Text style={styles.closeText}>Done</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Front Side Configuration */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Card Front</Text>
            <Text style={styles.sectionDescription}>
              Select which sides appear on the front of the card
            </Text>
            <View style={styles.sideSelector}>
              {sideOptions.map((side) => (
                <Pressable
                  key={side}
                  style={[
                    styles.sideOption,
                    localSettings.frontSides.includes(side) && styles.sideOptionSelected
                  ]}
                  onPress={() => toggleSide('front', side)}
                >
                  <Text style={[
                    styles.sideOptionText,
                    localSettings.frontSides.includes(side) && styles.sideOptionTextSelected
                  ]}>
                    {side.replace('_', ' ').toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Back Side Configuration */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Card Back</Text>
            <Text style={styles.sectionDescription}>
              Select which sides appear on the back of the card
            </Text>
            <View style={styles.sideSelector}>
              {sideOptions.map((side) => (
                <Pressable
                  key={side}
                  style={[
                    styles.sideOption,
                    localSettings.backSides.includes(side) && styles.sideOptionSelected
                  ]}
                  onPress={() => toggleSide('back', side)}
                >
                  <Text style={[
                    styles.sideOptionText,
                    localSettings.backSides.includes(side) && styles.sideOptionTextSelected
                  ]}>
                    {side.replace('_', ' ').toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Timer Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timer</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Enable Timer</Text>
              <Switch
                value={localSettings.enableTimer}
                onValueChange={(value) =>
                  setLocalSettings({ ...localSettings, enableTimer: value })
                }
                trackColor={{ false: colors.neutral.gray300, true: colors.primary.light }}
                thumbColor={colors.neutral.white}
              />
            </View>
            {localSettings.enableTimer && (
              <View style={styles.timerPicker}>
                <Text style={styles.settingLabel}>Seconds per card</Text>
                <Picker
                  selectedValue={localSettings.timerSeconds}
                  style={styles.picker}
                  onValueChange={(value) =>
                    setLocalSettings({ ...localSettings, timerSeconds: value })
                  }
                >
                  <Picker.Item label="10 sec" value={10} />
                  <Picker.Item label="15 sec" value={15} />
                  <Picker.Item label="20 sec" value={20} />
                  <Picker.Item label="30 sec" value={30} />
                  <Picker.Item label="45 sec" value={45} />
                  <Picker.Item label="60 sec" value={60} />
                </Picker>
              </View>
            )}
          </View>

          {/* Audio Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Audio</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Text-to-Speech</Text>
              <Switch
                value={localSettings.enableAudio}
                onValueChange={(value) =>
                  setLocalSettings({ ...localSettings, enableAudio: value })
                }
                trackColor={{ false: colors.neutral.gray300, true: colors.primary.light }}
                thumbColor={colors.neutral.white}
              />
            </View>
          </View>

          {/* Preset Configurations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Presets</Text>
            <View style={styles.presets}>
              <Pressable
                style={({ pressed }) => [
                  styles.presetButton,
                  pressed && styles.presetButtonPressed
                ]}
                onPress={() => applyPreset('englishToChinese')}
              >
                <Text style={styles.presetButtonText}>English → Chinese</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.presetButton,
                  pressed && styles.presetButtonPressed
                ]}
                onPress={() => applyPreset('chineseToEnglish')}
              >
                <Text style={styles.presetButtonText}>Chinese → English</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.presetButton,
                  pressed && styles.presetButtonPressed
                ]}
                onPress={() => applyPreset('comprehensive')}
              >
                <Text style={styles.presetButtonText}>All Sides</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.gray100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  title: {
    ...typography.h2,
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeText: {
    ...typography.body.large,
    color: colors.primary.main,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.neutral.white,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    ...typography.body.regular,
    color: colors.neutral.gray500,
    marginBottom: spacing.md,
  },
  sideSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sideOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral.gray100,
    borderWidth: 2,
    borderColor: colors.neutral.gray200,
  },
  sideOptionSelected: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.main,
  },
  sideOptionText: {
    ...typography.body.regular,
    color: colors.neutral.gray600,
  },
  sideOptionTextSelected: {
    color: colors.neutral.white,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  settingLabel: {
    ...typography.body.regular,
  },
  timerPicker: {
    marginTop: spacing.md,
  },
  picker: {
    height: 150,
    marginVertical: spacing.sm,
  },
  presets: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  presetButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  presetButtonPressed: {
    opacity: 0.8,
  },
  presetButtonText: {
    ...typography.body.regular,
    color: colors.neutral.white,
    fontWeight: '600',
  },
});