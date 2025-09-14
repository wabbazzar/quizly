import React, { FC, useEffect } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDeckStore } from '@/store/deckStore';
import { DeckCard } from '@/components/cards/DeckCard';
import { colors, spacing, typography } from '@/theme';
import { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'HomeTabs'>;

export const HomeScreen: FC = () => {
  const { decks, loadDecks } = useDeckStore();

  useEffect(() => {
    loadDecks();
  }, []);

  const handleDeckPress = (deckId: string) => {
    // Navigation will be handled in DeckCard component
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Screen Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Decks</Text>
        <Text style={styles.subtitle}>Choose a deck to start studying</Text>
      </View>

      {/* Deck List */}
      <FlatList
        data={decks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DeckCard
            deck={item}
            onPress={() => handleDeckPress(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.gray100,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body.regular,
    color: colors.neutral.gray500,
  },
  list: {
    padding: spacing.md,
    paddingTop: 0,
  },
});