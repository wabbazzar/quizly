import React, { FC, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { FlashCard } from '@/components/cards/FlashCard';
import { FlashcardsSettingsModal } from '@/components/modes/FlashcardsSettings';
import { useFlashcards } from '@/hooks/useFlashcards';
import { colors, spacing, typography, shadows, borderRadius } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Flashcards'>;

export const FlashcardsScreen: FC<Props> = ({ route, navigation }) => {
  const { deckId } = route.params;
  const {
    currentCard,
    isFlipped,
    correctCount,
    incorrectCount,
    progress,
    flipCard,
    handleSwipeLeft,
    handleSwipeRight,
    settings,
    updateSettings,
    resetSession,
    isComplete,
  } = useFlashcards(deckId);

  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (isComplete) {
      // Session complete - show results or restart with missed cards
      // This will be implemented in the next iteration
    }
  }, [isComplete]);

  if (!currentCard) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View style={styles.progressCounter}>
            <View style={[styles.counterBadge, styles.incorrectBadge]}>
              <Ionicons name="close" size={16} color={colors.neutral.white} />
              <Text style={styles.counterText}>{incorrectCount}</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          <View style={styles.progressCounter}>
            <View style={[styles.counterBadge, styles.correctBadge]}>
              <Ionicons name="checkmark" size={16} color={colors.neutral.white} />
              <Text style={styles.counterText}>{correctCount}</Text>
            </View>
          </View>
        </View>

        {/* Flashcard */}
        <View style={styles.cardContainer}>
          <FlashCard
            card={currentCard}
            isFlipped={isFlipped}
            frontSides={settings.frontSides}
            backSides={settings.backSides}
            onFlip={flipCard}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.incorrectButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={handleSwipeLeft}
          >
            <Ionicons name="close" size={24} color={colors.neutral.white} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.flipButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={flipCard}
          >
            <Ionicons name="refresh" size={24} color={colors.neutral.white} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.correctButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={handleSwipeRight}
          >
            <Ionicons name="checkmark" size={24} color={colors.neutral.white} />
          </Pressable>
        </View>

        {/* Settings Button */}
        <Pressable
          style={({ pressed }) => [
            styles.settingsButton,
            pressed && styles.settingsButtonPressed,
          ]}
          onPress={() => setShowSettings(true)}
        >
          <Ionicons name="settings-outline" size={24} color={colors.primary.main} />
        </Pressable>

        {/* Settings Modal */}
        <FlashcardsSettingsModal
          visible={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onUpdateSettings={updateSettings}
          availableSides={4} // This should come from the deck metadata
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.gray100,
  },
  safeArea: {
    flex: 1,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  progressCounter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    ...shadows.sm,
  },
  incorrectBadge: {
    backgroundColor: colors.semantic.error,
  },
  correctBadge: {
    backgroundColor: colors.semantic.success,
  },
  counterText: {
    ...typography.body.regular,
    color: colors.neutral.white,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.neutral.gray200,
    borderRadius: borderRadius.full,
    marginHorizontal: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.full,
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  actionButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  incorrectButton: {
    backgroundColor: colors.semantic.error,
  },
  flipButton: {
    backgroundColor: colors.primary.main,
  },
  correctButton: {
    backgroundColor: colors.semantic.success,
  },
  settingsButton: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  settingsButtonPressed: {
    opacity: 0.8,
  },
});