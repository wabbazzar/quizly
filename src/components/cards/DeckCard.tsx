import React, { FC, memo } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Deck } from '@/types';
import { colors, spacing, typography, shadows, borderRadius } from '@/theme';
import { RootStackParamList } from '@/navigation/AppNavigator';

interface DeckCardProps {
  deck: Deck;
  onPress: () => void;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const DeckCard: FC<DeckCardProps> = memo(({ deck, onPress }) => {
  const navigation = useNavigation<NavigationProp>();

  const difficultyColor = {
    beginner: colors.semantic.success,
    intermediate: colors.semantic.warning,
    advanced: colors.semantic.error,
    beginner_to_intermediate: colors.semantic.info,
  };

  const handlePress = () => {
    navigation.navigate('DeckDetail', { deckId: deck.id });
    onPress();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      onPress={handlePress}
    >
      {/* Category Badge */}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{deck.metadata.category}</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.deckName}>{deck.metadata.deck_name}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {deck.metadata.description}
        </Text>

        {/* Metadata Row */}
        <View style={styles.metadataRow}>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Cards</Text>
            <Text style={styles.metadataValue}>{deck.metadata.card_count}</Text>
          </View>

          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Sides</Text>
            <Text style={styles.metadataValue}>{deck.metadata.available_sides}</Text>
          </View>

          <View style={[
            styles.difficultyBadge,
            { backgroundColor: difficultyColor[deck.metadata.difficulty] }
          ]}>
            <Text style={styles.difficultyText}>
              {deck.metadata.difficulty.replace('_', ' ')}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.primary.light,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    zIndex: 1,
  },
  categoryText: {
    ...typography.body.small,
    color: colors.neutral.white,
    fontWeight: '600',
  },
  content: {
    padding: spacing.lg,
  },
  deckName: {
    ...typography.h3,
    marginBottom: spacing.xs,
    paddingRight: spacing.xxl,
  },
  description: {
    ...typography.body.regular,
    color: colors.neutral.gray500,
    marginBottom: spacing.md,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataItem: {
    marginRight: spacing.lg,
  },
  metadataLabel: {
    ...typography.body.small,
    color: colors.neutral.gray400,
    marginBottom: 2,
  },
  metadataValue: {
    ...typography.body.large,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  difficultyBadge: {
    marginLeft: 'auto',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  difficultyText: {
    ...typography.body.small,
    color: colors.neutral.white,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});