# Ticket 001: Initial PWA Setup with Flashcards Mode

## Metadata
- **Status**: Not Started
- **Priority**: High
- **Effort**: 15 points (3 phases x 5 points)
- **Created**: 2025-01-22
- **Type**: feature
- **Platforms**: iOS/Android/Web (PWA)

## User Stories

### Primary User Story
As a language learner, I want to access flashcards on my mobile device so that I can study Chinese vocabulary anywhere.

### Secondary User Stories
- As a user, I want to see all available decks on the home screen so that I can choose what to study.
- As a user, I want to swipe through flashcards intuitively so that I can quickly review vocabulary.
- As a user, I want to track my progress during a study session so that I know how well I'm doing.
- As a user, I want to configure which card sides I see so that I can customize my learning experience.

## Technical Requirements

### Functional Requirements
1. React Native PWA setup with TypeScript strict mode
2. Home screen displaying deck list with metadata
3. Tab navigation with Home as primary tab
4. Complete Flashcards mode with swipe gestures and flip animations
5. Settings modal for side configuration
6. Progress tracking (correct/incorrect counters)
7. Chinese Chapter 9 deck integrated as sample data

### Non-Functional Requirements
1. Performance: 60 FPS animations, <3s initial load
2. Accessibility: VoiceOver/TalkBack support, minimum 44px touch targets
3. Platform Parity: Consistent behavior on iOS and Android
4. Offline Support: All functionality works without network connection

## Implementation Plan

### Phase 1: Core Infrastructure & Navigation (5 points)

**Files to create/modify:**
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration with strict mode
- `app.json` - Expo configuration
- `src/theme/index.ts` - Design system implementation
- `src/types/index.ts` - Core TypeScript interfaces
- `src/navigation/AppNavigator.tsx` - Navigation structure
- `src/store/deckStore.ts` - Zustand store for deck management

**Component Structure:**
```typescript
// src/types/index.ts
interface DeckMetadata {
  deck_name: string;
  description: string;
  category: string;
  available_levels: number[];
  available_sides: number;
  card_count: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'beginner_to_intermediate';
  tags: string[];
  version: string;
  created_date: string;
  last_updated: string;
}

interface Card {
  idx: number;
  name: string;
  side_a: string;
  side_b: string;
  side_c?: string;
  side_d?: string;
  level: number;
}

interface Deck {
  id: string;
  metadata: DeckMetadata;
  content: Card[];
}
```

**Theme Implementation:**
```typescript
// src/theme/index.ts

/**
 * Quizly Design System
 *
 * A vibrant yet professional color palette that creates an engaging
 * learning environment while maintaining excellent readability and
 * accessibility. The design emphasizes clarity and focus for
 * effective studying.
 */

export const colors = {
  primary: {
    // Ocean Blue - Evokes trust, stability, and intelligence
    // Used for primary actions, navigation, and key interactive elements
    main: '#4A90E2',    // Confident ocean blue - CTAs, active states
    light: '#6BA5E9',   // Soft sky blue - hover states, highlights
    dark: '#3A7BC8',    // Deep sea blue - pressed states, emphasis
  },
  secondary: {
    // Mint Turquoise - Fresh, energizing, and optimistic
    // Used for success states, progress indicators, and positive feedback
    main: '#50E3C2',    // Vibrant mint - correct answers, achievements
    light: '#6FEBD0',   // Gentle seafoam - subtle success indicators
    dark: '#3DCBAA',    // Rich teal - strong positive emphasis
  },
  neutral: {
    // Carefully crafted grayscale for optimal contrast and hierarchy
    white: '#FFFFFF',    // Pure white - card backgrounds, primary surfaces
    gray100: '#F7F8FA',  // Ghost white - app background, subtle containers
    gray200: '#E5E7EB',  // Mist gray - borders, dividers, disabled states
    gray300: '#D1D5DB',  // Silver gray - inactive elements, placeholders
    gray400: '#9CA3AF',  // Cool gray - secondary text, subtle icons
    gray500: '#6B7280',  // Slate gray - body text, secondary content
    gray600: '#4B5563',  // Charcoal gray - primary text, headings
    gray700: '#374151',  // Dark slate - high emphasis text
    gray800: '#1F2937',  // Near black - maximum contrast text
    black: '#000000',    // True black - reserved for critical emphasis
  },
  semantic: {
    // Functional colors for user feedback and system states
    success: '#10B981',  // Emerald green - correct answers, achievements
    warning: '#F59E0B',  // Amber - warnings, time running out
    error: '#EF4444',    // Coral red - incorrect answers, errors
    info: '#3B82F6',     // Bright blue - hints, information, tips
  }
};

/**
 * Spacing System
 *
 * Based on an 8-point grid system for consistent rhythm and
 * visual harmony across all components. Each increment serves
 * a specific purpose in the visual hierarchy.
 */
export const spacing = {
  xs: 4,   // Hairline spacing - subtle gaps, inline elements
  sm: 8,   // Tight spacing - related elements, compact layouts
  md: 16,  // Default spacing - standard padding, margins
  lg: 24,  // Comfortable spacing - section breaks, card padding
  xl: 32,  // Generous spacing - major sections, breathing room
  xxl: 48, // Maximum spacing - hero sections, major divisions
};

/**
 * Typography Scale
 *
 * Optimized for mobile readability with clear hierarchy.
 * All sizes tested for legibility on small screens.
 */
export const typography = {
  // Headlines - Bold and commanding for screen titles
  h1: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.5,
    color: colors.neutral.gray800,
  },
  h2: {
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 36,
    letterSpacing: -0.3,
    color: colors.neutral.gray800,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    letterSpacing: -0.2,
    color: colors.neutral.gray700,
  },

  // Body text - Optimized for extended reading
  body: {
    large: {
      fontSize: 18,
      fontWeight: '400',
      lineHeight: 28,
      color: colors.neutral.gray600,
    },
    regular: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
      color: colors.neutral.gray600,
    },
    small: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      color: colors.neutral.gray500,
    },
  },

  // Card text - Larger sizes for flashcard content
  card: {
    primary: {
      fontSize: 24,
      fontWeight: '500',
      lineHeight: 32,
      color: colors.neutral.gray800,
    },
    secondary: {
      fontSize: 20,
      fontWeight: '400',
      lineHeight: 28,
      color: colors.neutral.gray700,
    },
    caption: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 18,
      color: colors.neutral.gray500,
    },
  },
};

/**
 * Shadow System
 *
 * Subtle shadows that create depth without overwhelming
 * the clean, focused interface.
 */
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
};

/**
 * Border Radius System
 *
 * Friendly, approachable rounded corners that soften
 * the interface while maintaining structure.
 */
export const borderRadius = {
  sm: 4,   // Subtle rounding - buttons, inputs
  md: 8,   // Standard rounding - cards, containers
  lg: 12,  // Prominent rounding - modals, featured cards
  xl: 16,  // Strong rounding - floating elements
  full: 9999, // Fully rounded - pills, badges
};
```

**Navigation Setup:**
```typescript
// src/navigation/AppNavigator.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

export type RootStackParamList = {
  HomeTabs: undefined;
  Flashcards: { deckId: string };
  DeckDetail: { deckId: string };
};

export type TabParamList = {
  Home: undefined;
};
```

**Implementation steps:**
1. Initialize Expo project with TypeScript template
2. Install core dependencies (react-navigation, zustand, react-native-reanimated, etc.)
3. Configure TypeScript with strict mode
4. Implement design system tokens
5. Set up navigation structure
6. Create Zustand store for deck management

**Testing:**
```bash
npm run type-check
npm run lint
npm test
```

**Commit**: `feat(core): initialize React Native PWA with navigation and theme`

### Phase 2: Home Screen & Deck Management (5 points)

**Files to create/modify:**
- `src/screens/HomeScreen.tsx` - Main deck list screen
- `src/components/cards/DeckCard.tsx` - Individual deck display
- `src/hooks/useDeckData.ts` - Hook for deck data management
- `src/data/decks/chinese_chpt9.ts` - Chinese deck data (converted)
- `src/store/deckStore.ts` - Update with deck loading logic

**Home Screen Implementation:**
```typescript
// src/screens/HomeScreen.tsx
import React, { FC, useEffect } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDeckStore } from '@/store/deckStore';
import { DeckCard } from '@/components/cards/DeckCard';
import { colors, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen: FC<Props> = ({ navigation }) => {
  const { decks, loadDecks } = useDeckStore();

  useEffect(() => {
    loadDecks();
  }, []);

  const handleDeckPress = (deckId: string) => {
    navigation.navigate('DeckDetail', { deckId });
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
    backgroundColor: colors.neutral.gray100, // Ghost white background for subtle depth
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
```

**DeckCard Component Design:**
```typescript
// src/components/cards/DeckCard.tsx
import React, { FC, memo } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Deck } from '@/types';
import { colors, spacing, typography, shadows, borderRadius } from '@/theme';

interface DeckCardProps {
  deck: Deck;
  onPress: () => void;
}

export const DeckCard: FC<DeckCardProps> = memo(({ deck, onPress }) => {
  const difficultyColor = {
    beginner: colors.semantic.success,
    intermediate: colors.semantic.warning,
    advanced: colors.semantic.error,
    beginner_to_intermediate: colors.semantic.info,
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
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
    paddingRight: spacing.xxl, // Space for category badge
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
```

**Deck Data Loading System:**
```typescript
// src/utils/deckLoader.ts
// Dynamic JSON deck loader that transforms JSON to match our TypeScript model
// This allows easy deck sharing and import/export functionality

import { Deck } from '@/types';

interface RawDeckJSON {
  deck_id?: string;  // Optional, will use 'id' if present
  id?: string;
  metadata: {
    deck_name: string;
    description: string;
    category: string;
    available_levels: number[];
    available_sides: number;
    card_count: number;
    difficulty: string;
    tags: string[];
    version: string;
    created_date: string;
    last_updated: string;
  };
  content: Array<{
    card_id?: string;  // Will be removed
    idx: number;
    name: string;
    side_a: string;
    side_b: string;
    side_c?: string;
    side_d?: string;
    side_e?: string;
    side_f?: string;
    level: number;
  }>;
}

export const loadDeckFromJSON = async (jsonPath: string): Promise<Deck> => {
  try {
    // Import JSON deck dynamically
    const rawDeck: RawDeckJSON = await import(jsonPath);

    // Transform to our Deck model
    const deck: Deck = {
      // Use 'id' or 'deck_id' from JSON, or generate from filename
      id: rawDeck.id || rawDeck.deck_id || jsonPath.split('/').pop()?.replace('.json', '') || 'unknown',
      metadata: {
        ...rawDeck.metadata,
        // Ensure dates are in correct format
        created_date: rawDeck.metadata.created_date.split('T')[0],
        last_updated: rawDeck.metadata.last_updated.split('T')[0],
      },
      content: rawDeck.content.map((card, index) => ({
        // Ensure idx starts at 0 and increments properly
        idx: index,
        name: card.name,
        side_a: card.side_a,
        side_b: card.side_b,
        side_c: card.side_c,
        side_d: card.side_d,
        side_e: card.side_e,
        side_f: card.side_f,
        level: card.level,
        // Remove card_id if present (not in our model)
      })),
    };

    return deck;
  } catch (error) {
    console.error('Error loading deck from JSON:', error);
    throw error;
  }
};

// Load all decks from assets
export const loadAllDecks = async (): Promise<Deck[]> => {
  const deckPaths = [
    '../assets/decks/chinese_chpt9.json',
    // Add more deck paths as they're added
  ];

  const decks = await Promise.all(
    deckPaths.map(path => loadDeckFromJSON(path))
  );

  return decks;
};
```

**Store Integration:**
```typescript
// src/store/deckStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Deck } from '@/types';
import { loadAllDecks } from '@/utils/deckLoader';

interface DeckStore {
  decks: Deck[];
  activeDeck: Deck | null;
  isLoading: boolean;
  error: string | null;

  loadDecks: () => Promise<void>;
  selectDeck: (deckId: string) => void;
  importDeck: (jsonPath: string) => Promise<void>;
}

export const useDeckStore = create<DeckStore>()(
  persist(
    (set, get) => ({
      decks: [],
      activeDeck: null,
      isLoading: false,
      error: null,

      loadDecks: async () => {
        set({ isLoading: true, error: null });
        try {
          // Load all decks from JSON files
          const loadedDecks = await loadAllDecks();
          set({ decks: loadedDecks, isLoading: false });
        } catch (error) {
          set({
            error: 'Failed to load decks',
            isLoading: false
          });
        }
      },

      selectDeck: (deckId: string) => {
        const deck = get().decks.find(d => d.id === deckId);
        set({ activeDeck: deck || null });
      },

      importDeck: async (jsonPath: string) => {
        // Future feature: Import deck from file system or URL
        // This enables deck sharing functionality
      },
    }),
    {
      name: 'deck-store',
      storage: AsyncStorage,
      partialize: (state) => ({
        // Only persist deck metadata, not full content
        decks: state.decks.map(d => ({
          id: d.id,
          metadata: d.metadata,
        })),
      }),
    }
  )
);
```

**Note:** The Chinese Chapter 9 deck JSON file (`pwa/assets/decks/chinese_chpt9.json`) remains unchanged and serves as the data source. The transformation happens at runtime when loading the deck, ensuring:
- Easy deck import/export
- Simple deck sharing between users
- Backward compatibility with different JSON formats
- Clean TypeScript typing in the application

**Implementation steps:**
1. Create HomeScreen with FlatList
2. Build DeckCard component with proper styling
3. Convert Chinese deck JSON to TypeScript
4. Implement deck loading in Zustand store
5. Add navigation from Home to DeckDetail
6. Test deck display and navigation

**Testing:**
```typescript
describe('HomeScreen', () => {
  it('should display list of decks', () => {
    // Test deck list rendering
  });

  it('should navigate to deck detail on press', () => {
    // Test navigation
  });
});
```

**Commit**: `feat(home): implement home screen with deck management`

### Phase 3: Flashcards Mode Implementation (5 points)

**Files to create/modify:**
- `src/screens/FlashcardsScreen.tsx` - Main flashcards screen
- `src/components/cards/FlashCard.tsx` - Swipeable flash card
- `src/components/modes/FlashcardsSettings.tsx` - Settings modal
- `src/hooks/useFlashcards.ts` - Flashcards logic hook
- `src/store/sessionStore.ts` - Session state management
- `src/utils/gestures.ts` - Swipe gesture handlers

**Flashcards Screen:**
```typescript
// src/screens/FlashcardsScreen.tsx
import React, { FC, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { FlashCard } from '@/components/cards/FlashCard';
import { useFlashcards } from '@/hooks/useFlashcards';

export const FlashcardsScreen: FC<Props> = ({ route, navigation }) => {
  const { deckId } = route.params;
  const {
    currentCard,
    isFlipped,
    correctCount,
    incorrectCount,
    flipCard,
    handleSwipeLeft,
    handleSwipeRight,
    settings,
    updateSettings,
  } = useFlashcards(deckId);

  // Swipe gesture implementation
  // Flip animation implementation
  // Progress counters display
  // Settings modal

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Progress counters */}
      <View style={styles.progressBar}>
        <Text style={styles.incorrectCount}>{incorrectCount}</Text>
        <Text style={styles.correctCount}>{correctCount}</Text>
      </View>

      {/* Flashcard with swipe gestures */}
      <FlashCard
        card={currentCard}
        isFlipped={isFlipped}
        frontSides={settings.frontSides}
        backSides={settings.backSides}
        onFlip={flipCard}
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
      />

      {/* Settings button */}
      <Pressable style={styles.settingsButton} onPress={openSettings}>
        <Text>Settings</Text>
      </Pressable>
    </GestureHandlerRootView>
  );
};
```

**Flashcards Settings Modal:**
```typescript
// src/components/modes/FlashcardsSettings.tsx
import React, { FC } from 'react';
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
import { colors, spacing, typography, borderRadius, shadows } from '@/theme';

interface FlashcardsSettingsProps {
  visible: boolean;
  onClose: () => void;
  settings: FlashcardsSettings;
  onUpdateSettings: (settings: FlashcardsSettings) => void;
  availableSides: number;
}

interface FlashcardsSettings {
  frontSides: string[];     // Which sides to show on front
  backSides: string[];      // Which sides to show on back
  enableTimer: boolean;     // Enable auto-swipe timer
  timerSeconds: number;     // Seconds before auto-swipe left
  enableAudio: boolean;     // Enable text-to-speech
  groupSides: {            // Side grouping preferences
    [key: string]: string[];
  };
}

export const FlashcardsSettingsModal: FC<FlashcardsSettingsProps> = ({
  visible,
  onClose,
  settings,
  onUpdateSettings,
  availableSides,
}) => {
  // Available sides based on deck (side_a through side_f maximum)
  const sideOptions = ['side_a', 'side_b', 'side_c', 'side_d', 'side_e', 'side_f']
    .slice(0, availableSides);

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
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Done</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content}>
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
                    settings.frontSides.includes(side) && styles.sideOptionSelected
                  ]}
                  onPress={() => toggleSide('front', side)}
                >
                  <Text style={[
                    styles.sideOptionText,
                    settings.frontSides.includes(side) && styles.sideOptionTextSelected
                  ]}>
                    {side.replace('_', ' ').toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.hint}>
              Example: Show Chinese characters (Side C) on front
            </Text>
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
                    settings.backSides.includes(side) && styles.sideOptionSelected
                  ]}
                  onPress={() => toggleSide('back', side)}
                >
                  <Text style={[
                    styles.sideOptionText,
                    settings.backSides.includes(side) && styles.sideOptionTextSelected
                  ]}>
                    {side.replace('_', ' ').toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.hint}>
              Example: Show pinyin (Side B) + English (Side A) together on back
            </Text>
          </View>

          {/* Side Grouping */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Side Grouping</Text>
            <Text style={styles.sectionDescription}>
              Always show these sides together when selected
            </Text>
            <View style={styles.groupingOption}>
              <Text style={styles.groupingLabel}>Group Chinese + Pinyin</Text>
              <Switch
                value={settings.groupSides['chinese_pinyin']?.includes('side_b')}
                onValueChange={(value) => {
                  // Group side_b and side_c together
                  const newGrouping = value
                    ? { ...settings.groupSides, chinese_pinyin: ['side_b', 'side_c'] }
                    : { ...settings.groupSides, chinese_pinyin: [] };
                  onUpdateSettings({ ...settings, groupSides: newGrouping });
                }}
                trackColor={{ false: colors.neutral.gray300, true: colors.primary.light }}
                thumbColor={colors.neutral.white}
              />
            </View>
          </View>

          {/* Timer Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timer</Text>
            <View style={styles.timerOption}>
              <Text style={styles.optionLabel}>Enable Timer</Text>
              <Switch
                value={settings.enableTimer}
                onValueChange={(value) =>
                  onUpdateSettings({ ...settings, enableTimer: value })
                }
                trackColor={{ false: colors.neutral.gray300, true: colors.primary.light }}
                thumbColor={colors.neutral.white}
              />
            </View>
            {settings.enableTimer && (
              <View style={styles.timerDuration}>
                <Text style={styles.optionLabel}>Seconds per card</Text>
                <Picker
                  selectedValue={settings.timerSeconds}
                  style={styles.picker}
                  onValueChange={(value) =>
                    onUpdateSettings({ ...settings, timerSeconds: value })
                  }
                >
                  <Picker.Item label="10 sec" value={10} />
                  <Picker.Item label="15 sec" value={15} />
                  <Picker.Item label="20 sec" value={20} />
                  <Picker.Item label="30 sec" value={30} />
                  <Picker.Item label="45 sec" value={45} />
                  <Picker.Item label="60 sec" value={60} />
                </Picker>
                <Text style={styles.hint}>
                  Card will auto-swipe left (missed) after timer expires
                </Text>
              </View>
            )}
          </View>

          {/* Audio Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Audio</Text>
            <View style={styles.audioOption}>
              <Text style={styles.optionLabel}>Text-to-Speech</Text>
              <Switch
                value={settings.enableAudio}
                onValueChange={(value) =>
                  onUpdateSettings({ ...settings, enableAudio: value })
                }
                trackColor={{ false: colors.neutral.gray300, true: colors.primary.light }}
                thumbColor={colors.neutral.white}
              />
            </View>
            <Text style={styles.hint}>
              Tap the speaker icon on cards to hear pronunciation
            </Text>
          </View>

          {/* Preset Configurations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Presets</Text>
            <View style={styles.presets}>
              <Pressable
                style={styles.presetButton}
                onPress={() => applyPreset('englishToChinese')}
              >
                <Text style={styles.presetButtonText}>English → Chinese</Text>
              </Pressable>
              <Pressable
                style={styles.presetButton}
                onPress={() => applyPreset('chineseToEnglish')}
              >
                <Text style={styles.presetButtonText}>Chinese → English</Text>
              </Pressable>
              <Pressable
                style={styles.presetButton}
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
  hint: {
    ...typography.body.small,
    color: colors.neutral.gray400,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  groupingOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  groupingLabel: {
    ...typography.body.regular,
  },
  timerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  timerDuration: {
    marginTop: spacing.md,
  },
  optionLabel: {
    ...typography.body.regular,
  },
  picker: {
    height: 50,
    marginVertical: spacing.sm,
  },
  audioOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
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
  presetButtonText: {
    ...typography.body.regular,
    color: colors.neutral.white,
    fontWeight: '600',
  },
});
```

**FlashCard Component Design:**
```typescript
// src/components/cards/FlashCard.tsx
import React, { FC } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  withTiming,
  withSpring,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import { colors, spacing, typography, shadows, borderRadius } from '@/theme';

interface FlashCardProps {
  card: Card;
  isFlipped: boolean;
  frontSides: string[];
  backSides: string[];
  onFlip: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export const FlashCard: FC<FlashCardProps> = ({
  card,
  isFlipped,
  frontSides,
  backSides,
  onFlip,
  onSwipeLeft,
  onSwipeRight,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);

  // Swipe gesture handler
  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onActive: (event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.1; // Subtle vertical movement
      rotation.value = interpolate(
        event.translationX,
        [-200, 0, 200],
        [-15, 0, 15] // Card tilts as it's swiped
      );
    },
    onEnd: (event) => {
      const SWIPE_THRESHOLD = 120;

      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right - correct
        translateX.value = withSpring(500);
        runOnJS(onSwipeRight)();
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left - incorrect
        translateX.value = withSpring(-500);
        runOnJS(onSwipeLeft)();
      } else {
        // Return to center with spring animation
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotation.value = withSpring(0);
      }
    },
  });

  // Card animation style
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotateZ: `${rotation.value}deg` },
    ],
  }));

  // Flip animation style
  const flipAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(
      isFlipped ? 1 : 0,
      [0, 1],
      [0, 180]
    );

    return {
      transform: [{ rotateY: withTiming(`${rotateY}deg`, { duration: 300 }) }],
      backfaceVisibility: 'hidden',
    };
  });

  // Swipe indicator overlay colors
  const swipeOverlayStyle = useAnimatedStyle(() => {
    const rightOpacity = interpolate(
      translateX.value,
      [0, 100],
      [0, 1],
      'clamp'
    );
    const leftOpacity = interpolate(
      translateX.value,
      [-100, 0],
      [1, 0],
      'clamp'
    );

    return {
      // Green overlay for correct (right swipe)
      rightOverlay: {
        opacity: rightOpacity,
        backgroundColor: colors.semantic.success,
      },
      // Red overlay for incorrect (left swipe)
      leftOverlay: {
        opacity: leftOpacity,
        backgroundColor: colors.semantic.error,
      },
    };
  });

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.cardContainer, cardAnimatedStyle]}>
        <Pressable onPress={onFlip} style={styles.cardPressable}>
          <Animated.View style={[styles.card, flipAnimatedStyle]}>
            {/* Front of card */}
            {!isFlipped && (
              <View style={styles.cardContent}>
                <Text style={styles.sideLabel}>Front</Text>
                {frontSides.map((side) => (
                  <Text key={side} style={styles.cardText}>
                    {card[side as keyof Card]}
                  </Text>
                ))}
              </View>
            )}

            {/* Back of card */}
            {isFlipped && (
              <View style={[styles.cardContent, styles.cardBack]}>
                <Text style={styles.sideLabel}>Back</Text>
                {backSides.map((side) => (
                  <Text key={side} style={styles.cardText}>
                    {card[side as keyof Card]}
                  </Text>
                ))}
              </View>
            )}

            {/* Swipe indicators */}
            <Animated.View
              style={[styles.swipeOverlay, swipeOverlayStyle.rightOverlay]}
              pointerEvents="none"
            >
              <Text style={styles.swipeText}>✓</Text>
            </Animated.View>

            <Animated.View
              style={[styles.swipeOverlay, swipeOverlayStyle.leftOverlay]}
              pointerEvents="none"
            >
              <Text style={styles.swipeText}>✗</Text>
            </Animated.View>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardPressable: {
    width: '90%',
    aspectRatio: 0.65, // Classic flashcard proportions
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
    position: 'relative',
  },
  cardContent: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBack: {
    transform: [{ rotateY: '180deg' }],
  },
  sideLabel: {
    ...typography.body.small,
    color: colors.neutral.gray400,
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardText: {
    ...typography.card.primary,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  swipeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: colors.neutral.white,
  },
});
```

**Progress Counter UI:**
```typescript
// Part of FlashcardsScreen.tsx
const styles = StyleSheet.create({
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    zIndex: 10,
  },
  incorrectCount: {
    backgroundColor: colors.semantic.error,
    color: colors.neutral.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    fontSize: typography.body.large.fontSize,
    fontWeight: '600',
    overflow: 'hidden',
    ...shadows.sm,
  },
  correctCount: {
    backgroundColor: colors.semantic.success,
    color: colors.neutral.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    fontSize: typography.body.large.fontSize,
    fontWeight: '600',
    overflow: 'hidden',
    ...shadows.sm,
  },
  settingsButton: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    backgroundColor: colors.primary.main,
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
});
```

**Implementation steps:**
1. Create FlashcardsScreen with gesture handling
2. Implement FlashCard with flip animation (300ms, 3D transform)
3. Add swipe gesture recognition (left/right)
4. Build settings modal for side configuration
5. Implement progress tracking and display
6. Add auto-restart with missed cards functionality

**Testing:**
```typescript
describe('Flashcards Mode', () => {
  it('should flip card on tap', () => {
    // Test flip animation
  });

  it('should track swipe gestures', () => {
    // Test left/right swipes
  });

  it('should update progress counters', () => {
    // Test correct/incorrect tracking
  });

  it('should restart with missed cards', () => {
    // Test auto-restart functionality
  });
});
```

**Platform Testing:**
```bash
# iOS
npm run ios
# Test swipe gestures on iPhone simulator

# Android
npm run android
# Test on Android emulator

# Web PWA
npm run web
# Test in mobile browser
```

**Commit**: `feat(flashcards): implement complete flashcards mode with gestures`

## Testing Strategy

### Unit Tests
- Test file: `__tests__/screens/FlashcardsScreen.test.tsx`
- Key scenarios:
  - Card flipping animation
  - Swipe gesture recognition
  - Progress tracking
  - Settings persistence
  - Deck completion and restart

### Component Tests
```typescript
describe('FlashCard Component', () => {
  it.each(['ios', 'android'])('should render on %s', (platform) => {
    Platform.OS = platform;
    // Test platform-specific rendering
  });

  it('should handle touch interactions', () => {
    // Test tap to flip
  });

  it('should animate at 60 FPS', () => {
    // Test animation performance
  });
});
```

### Integration Tests
- Navigation flow from Home → DeckDetail → Flashcards
- State persistence with AsyncStorage
- Zustand store integration

### E2E Tests (Detox)
```typescript
describe('Flashcards E2E', () => {
  it('should complete full flashcard session', async () => {
    await element(by.id('deck-chinese-chpt9')).tap();
    await element(by.id('start-flashcards')).tap();

    // Swipe through cards
    await element(by.id('flashcard')).swipe('right');

    // Verify progress
    await expect(element(by.id('correct-count'))).toHaveText('1');
  });
});
```

### Performance Tests
- FPS during flip animations: 60 FPS target
- Memory usage during session: <100MB
- Initial load time: <3 seconds

## Platform-Specific Considerations

### iOS
- Safe area handling for notch devices
- Haptic feedback on swipe actions
- iOS-specific gesture feel

### Android
- Back button handling in flashcards mode
- Material Design ripple effects
- Android gesture navigation compatibility

## Documentation Updates Required
1. `docs/spec.md` - Mark Phase 1 features as implemented
2. `README.md` - Add setup and run instructions
3. Component JSDoc documentation

## Success Criteria
1. App loads in <3 seconds on older devices
2. Flashcard animations run at 60 FPS
3. Swipe gestures feel natural and responsive
4. Progress tracking works accurately
5. Settings persist between sessions

## Dependencies
- react-native: ^0.74.x
- expo: ^51.x
- react-navigation: ^6.x
- zustand: ^4.x
- react-native-reanimated: ^3.x
- react-native-gesture-handler: ^2.x
- @react-native-async-storage/async-storage: ^1.x

## Risks & Mitigations
1. **Risk**: Gesture conflicts on Android
   **Mitigation**: Test extensively on Android devices, implement gesture zones

2. **Risk**: Animation performance on older devices
   **Mitigation**: Use native driver, optimize with InteractionManager

3. **Risk**: Memory leaks from animations
   **Mitigation**: Proper cleanup in useEffect, use React.memo

## Accessibility Requirements
- Screen reader announces card content
- Minimum touch target 44x44 (iOS) / 48x48 (Android)
- High contrast mode support
- Alternative to swipe gestures (buttons)

## Release & Deployment Guide

### Build Configuration
- Update `app.json` with app metadata
- Configure PWA manifest for web
- Set up app icons and splash screens

### Testing Checklist
- [ ] Unit tests passing
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Manual testing on iOS simulator
- [ ] Manual testing on Android emulator
- [ ] PWA testing in mobile browser
- [ ] Performance profiling complete
- [ ] Accessibility audit complete

### Release Process
1. Run full test suite
2. Build for iOS: `expo build:ios`
3. Build for Android: `expo build:android`
4. Build for Web: `expo export:web`
5. Deploy PWA to hosting service

### Rollback Strategy
- Keep previous build artifacts
- Feature flag for flashcards if issues found
- Quick revert procedure documented

## Mobile-Specific Implementation Details

### State Persistence
```typescript
// Use AsyncStorage for offline capability
import AsyncStorage from '@react-native-async-storage/async-storage';

// Persist settings and progress
const saveSettings = async (settings: FlashcardsSettings) => {
  await AsyncStorage.setItem('flashcards_settings', JSON.stringify(settings));
};
```

### Gesture Handling
```typescript
// Pan gesture for swipes
const panGesture = Gesture.Pan()
  .onUpdate((event) => {
    translateX.value = event.translationX;
  })
  .onEnd((event) => {
    if (event.translationX > SWIPE_THRESHOLD) {
      runOnJS(onSwipeRight)();
    } else if (event.translationX < -SWIPE_THRESHOLD) {
      runOnJS(onSwipeLeft)();
    }
  });
```

### Performance Optimizations
- Use `React.memo` for FlashCard component
- Implement `getItemLayout` for any lists
- Use `InteractionManager` for heavy operations
- Preload next card while current is displayed

---

*This ticket establishes the foundation for Quizly with the core infrastructure and first learning mode. Subsequent tickets will add Learn, Match, and Test modes.*