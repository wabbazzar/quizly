import React, { FC, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { useDeckStore } from '@/store/deckStore';
import { colors, spacing, typography, shadows, borderRadius } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'DeckDetail'>;

export const DeckDetailScreen: FC<Props> = ({ route, navigation }) => {
  const { deckId } = route.params;
  const { selectDeck, activeDeck } = useDeckStore();

  useEffect(() => {
    selectDeck(deckId);
  }, [deckId]);

  if (!activeDeck) {
    return (
      <View style={styles.container}>
        <Text>Loading deck...</Text>
      </View>
    );
  }

  const handleStartMode = (mode: 'Flashcards' | 'Learn' | 'Match' | 'Test') => {
    navigation.navigate(mode, { deckId });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Deck Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.deckName}>{activeDeck.metadata.deck_name}</Text>
        <Text style={styles.description}>{activeDeck.metadata.description}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="albums-outline" size={24} color={colors.primary.main} />
            <Text style={styles.statValue}>{activeDeck.metadata.card_count}</Text>
            <Text style={styles.statLabel}>Cards</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="layers-outline" size={24} color={colors.primary.main} />
            <Text style={styles.statValue}>{activeDeck.metadata.available_sides}</Text>
            <Text style={styles.statLabel}>Sides</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="bar-chart-outline" size={24} color={colors.primary.main} />
            <Text style={styles.statValue}>{activeDeck.metadata.available_levels.length}</Text>
            <Text style={styles.statLabel}>Levels</Text>
          </View>
        </View>

        {/* Tags */}
        <View style={styles.tagContainer}>
          {activeDeck.metadata.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Study Modes */}
      <View style={styles.modesSection}>
        <Text style={styles.sectionTitle}>Study Modes</Text>

        <Pressable
          style={({ pressed }) => [styles.modeCard, pressed && styles.modeCardPressed]}
          onPress={() => handleStartMode('Flashcards')}
        >
          <View style={styles.modeIcon}>
            <Ionicons name="copy-outline" size={28} color={colors.primary.main} />
          </View>
          <View style={styles.modeContent}>
            <Text style={styles.modeName}>Flashcards</Text>
            <Text style={styles.modeDescription}>Swipe through cards to review vocabulary</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.neutral.gray400} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.modeCard, styles.modeCardDisabled]}
          disabled
        >
          <View style={styles.modeIcon}>
            <Ionicons name="school-outline" size={28} color={colors.neutral.gray300} />
          </View>
          <View style={styles.modeContent}>
            <Text style={[styles.modeName, styles.modeNameDisabled]}>Learn</Text>
            <Text style={[styles.modeDescription, styles.modeDescriptionDisabled]}>Coming soon</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.neutral.gray300} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.modeCard, styles.modeCardDisabled]}
          disabled
        >
          <View style={styles.modeIcon}>
            <Ionicons name="grid-outline" size={28} color={colors.neutral.gray300} />
          </View>
          <View style={styles.modeContent}>
            <Text style={[styles.modeName, styles.modeNameDisabled]}>Match</Text>
            <Text style={[styles.modeDescription, styles.modeDescriptionDisabled]}>Coming soon</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.neutral.gray300} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.modeCard, styles.modeCardDisabled]}
          disabled
        >
          <View style={styles.modeIcon}>
            <Ionicons name="clipboard-outline" size={28} color={colors.neutral.gray300} />
          </View>
          <View style={styles.modeContent}>
            <Text style={[styles.modeName, styles.modeNameDisabled]}>Test</Text>
            <Text style={[styles.modeDescription, styles.modeDescriptionDisabled]}>Coming soon</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.neutral.gray300} />
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.gray100,
  },
  infoCard: {
    backgroundColor: colors.neutral.white,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  deckName: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body.regular,
    color: colors.neutral.gray600,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    marginTop: spacing.xs,
  },
  statLabel: {
    ...typography.body.small,
    color: colors.neutral.gray500,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  tag: {
    backgroundColor: colors.primary.light,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  tagText: {
    ...typography.body.small,
    color: colors.neutral.white,
    fontWeight: '600',
  },
  modesSection: {
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  modeCard: {
    backgroundColor: colors.neutral.white,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  modeCardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  modeCardDisabled: {
    opacity: 0.6,
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  modeContent: {
    flex: 1,
  },
  modeName: {
    ...typography.body.large,
    fontWeight: '600',
    marginBottom: 2,
  },
  modeNameDisabled: {
    color: colors.neutral.gray400,
  },
  modeDescription: {
    ...typography.body.small,
    color: colors.neutral.gray500,
  },
  modeDescriptionDisabled: {
    color: colors.neutral.gray300,
  },
});