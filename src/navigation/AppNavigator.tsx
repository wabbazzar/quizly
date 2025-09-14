import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

// Import screens
import { HomeScreen } from '@/screens/HomeScreen';
import { DeckDetailScreen } from '@/screens/DeckDetailScreen';
import { FlashcardsScreen } from '@/screens/FlashcardsScreen';

// Type definitions for navigation
export type RootStackParamList = {
  HomeTabs: undefined;
  DeckDetail: { deckId: string };
  Flashcards: { deckId: string };
  Learn: { deckId: string };
  Match: { deckId: string };
  Test: { deckId: string };
};

export type TabParamList = {
  Home: undefined;
  Stats: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Placeholder screens for tabs
const StatsScreen = () => null; // Will be implemented later
const SettingsScreen = () => null; // Will be implemented later

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Stats') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.neutral.gray400,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.neutral.white,
        },
        headerTintColor: colors.neutral.gray800,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="HomeTabs"
        component={HomeTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DeckDetail"
        component={DeckDetailScreen}
        options={{ title: 'Deck Details' }}
      />
      <Stack.Screen
        name="Flashcards"
        component={FlashcardsScreen}
        options={{ title: 'Flashcards' }}
      />
    </Stack.Navigator>
  );
}