# Quizly - Technical Specification

## Executive Summary

Quizly is a high-performance, mobile-first Progressive Web Application (PWA) built with React Native that provides an advanced flashcard and learning system. Inspired by Quizlet's functionality, Quizly offers multiple learning modes with a focus on speed, accessibility, and beautiful design even on older devices.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technical Architecture](#technical-architecture)
3. [Data Models](#data-models)
4. [Core Features](#core-features)
5. [Learning Modes](#learning-modes)
6. [UI/UX Requirements](#uiux-requirements)
7. [Performance Requirements](#performance-requirements)
8. [Development Standards](#development-standards)
9. [Phase 1 Deliverables](#phase-1-deliverables)

## Project Overview

### Vision
Create a versatile flashcard application that supports multi-sided cards with various learning modes, enabling users to study any subject through different perspectives and learning styles.

### Core Principles
- **Mobile-First Design**: Optimized for touch interactions and mobile screens
- **Performance**: Lightning-fast even on older devices
- **Flexibility**: Multi-sided cards support various learning scenarios
- **Beauty**: Clean, sleek graphics with systematic styling
- **Offline-First**: All functionality runs client-side

### Target Platforms
- iOS (iPhone & iPad)
- Android (Phone & Tablet)
- Progressive Web App (PWA)

## Technical Architecture

### Technology Stack

#### Frontend
- **Framework**: React Native with Expo
- **Language**: TypeScript (strict mode)
- **State Management**: Zustand with persistence
- **Navigation**: React Navigation v6
- **Styling**: StyleSheet with systematic theme system
- **Storage**: AsyncStorage for offline data
- **Testing**: React Native Testing Library + Jest

#### Key Libraries
```json
{
  "react-native": "^0.74.x",
  "expo": "^51.x",
  "react-navigation": "^6.x",
  "zustand": "^4.x",
  "@react-native-async-storage/async-storage": "^1.x",
  "react-native-reanimated": "^3.x",
  "react-native-gesture-handler": "^2.x",
  "react-native-safe-area-context": "^4.x"
}
```

### Architecture Patterns

#### Component Structure
```
src/
├── components/
│   ├── common/        # Reusable UI components
│   ├── cards/         # Card-specific components
│   ├── modes/         # Learning mode components
│   └── ui/            # UI primitives
├── screens/
│   ├── HomeScreen.tsx
│   ├── DeckScreen.tsx
│   ├── FlashcardsScreen.tsx
│   ├── LearnScreen.tsx
│   ├── MatchScreen.tsx
│   └── TestScreen.tsx
├── hooks/             # Custom React hooks
├── services/          # API and data services
├── store/            # Zustand stores
├── types/            # TypeScript definitions
├── utils/            # Utility functions
├── theme/            # Design system
└── navigation/       # Navigation configuration
```

## Data Models

### Core TypeScript Interfaces

```typescript
// Deck Metadata
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

// Card Structure
interface Card {
  idx: number;
  name: string;
  side_a: string;
  side_b: string;
  side_c?: string;
  side_d?: string;
  side_e?: string;
  side_f?: string;
  level: number;
}

// Complete Deck
interface Deck {
  id: string;
  metadata: DeckMetadata;
  content: Card[];
}

// Learning Session State
interface SessionState {
  deckId: string;
  mode: 'flashcards' | 'learn' | 'match' | 'test';
  currentCardIndex: number;
  correctCount: number;
  incorrectCount: number;
  missedCards: number[];
  startTime: number;
  settings: ModeSettings;
}

// Mode Settings
interface ModeSettings {
  frontSides: string[];  // e.g., ['side_a']
  backSides: string[];   // e.g., ['side_b', 'side_c']
  cardsPerRound: number;
  enableTimer: boolean;
  timerSeconds?: number;
  enableAudio: boolean;
  randomize: boolean;
  progressionMode: 'sequential' | 'level' | 'random';
}
```

### Data Validation Requirements

Minimum required fields for card sanitization:
- `idx`: Unique identifier within deck
- `name`: Human-readable card identifier
- `side_a`: Primary content (required)
- `side_b`: Secondary content (required)
- `level`: Difficulty level (1-3)

## Core Features

### 1. Deck Management

#### Home Screen
- Display list of available decks
- Show deck metadata (name, description, card count)
- Search and filter by category/tags
- Quick access to recent decks

#### Deck Operations
- **View Deck**: Display deck details and card list
- **Add Deck**: Manual data entry form with validation
- **Edit Deck**: Modify existing deck properties and cards
- **Delete Deck**: Remove deck with confirmation

### 2. Card Display System

#### Multi-Side Support
- Support 2-6 sides per card (defined by `available_sides`)
- Dynamic side grouping for display
- Configurable side combinations for each mode

#### Card Rendering
- Clean, readable typography
- Support for special characters (Chinese, Arabic, etc.)
- Responsive sizing based on content length
- Smooth flip animations

## Learning Modes

### 1. Flashcards Mode

#### Core Functionality
- Display one card at a time
- Tap to flip between front/back
- Swipe gestures:
  - Left: Mark as missed
  - Right: Mark as correct
- Progress counters on screen edges

#### Settings
- **Side Configuration**: Choose which sides appear on front/back
- **Side Grouping**: Combine multiple sides (e.g., side_b + side_c)
- **Timer Option**: Auto-swipe left after timeout
- **Audio**: Text-to-speech for card content

#### Flow
1. Start with full deck
2. Show cards sequentially
3. Track correct/missed cards
4. After deck completion, auto-restart with missed cards only
5. Repeat until all cards marked correct

### 2. Learn Mode

#### Core Functionality
- Question displayed at top (configurable sides)
- Multiple choice answers at bottom (4 options)
- Mix multiple choice with free text input
- Immediate feedback on answers

#### Question Types
- **Multiple Choice**: 1 correct + 3 distractors from deck
- **Free Text**: Type answer with fuzzy matching
- **Combined Sides**: Questions/answers can show grouped sides

#### Settings
- **Cards per Round**: Default 10, adjustable
- **Side Selection**: Configure Q&A sides
- **Randomize**: Auto-swap and combine sides
- **Progression**: Level-based or random

#### Flow
1. Start round with N cards
2. Present questions (80% multiple choice, 20% free text)
3. Show encouragement for correct answers
4. Show correct answer for incorrect attempts
5. Shuffle incorrect cards back into round
6. Include missed cards in next round

#### Special Features
- "Let's try again" message for re-attempted questions
- "Override: I was correct" option for free text
- Progressive difficulty based on levels

### 3. Match Mode

#### Core Functionality
- Grid layout (default 3x4, configurable)
- Timer counting up
- Match related sides from same card
- Touch to select, match pairs/triplets

#### Grid Configuration
- **Size**: 3x4, 4x4, 4x5 options
- **Match Types**:
  - 2-way: side_a ↔ side_b
  - 3-way: side_a ↔ side_b ↔ side_c
  - Mixed: Different combinations per card

#### Settings
- **Side Selection**: Which sides appear
- **Match Complexity**: 2-way, 3-way, or mixed
- **Grid Size**: Adjust based on difficulty

#### Flow
1. Display grid with shuffled cards
2. User taps cards to match
3. Correct matches play sound and disappear
4. Timer tracks completion time
5. Show success screen with time and best time
6. Option to play another round with new cards

### 4. Test Mode

#### Core Functionality
- Formal assessment with multiple question types
- Configurable question count
- Optional instant feedback

#### Question Types
- **True/False**: Statement verification
- **Multiple Choice**: 4 options
- **Free Response**: Text input with validation

#### Settings
- **Question Types**: Select which types to include
- **Side Configuration**: Choose Q&A sides
- **Auto Mode**: Shuffle which sides are questions/answers
- **Side Grouping**: Always show certain sides together
- **Question Count**: Up to deck maximum
- **Feedback**: Instant or end-of-test

#### Flow
1. Configure test parameters
2. Present questions sequentially
3. Provide feedback (if instant mode)
4. Show results summary at end
5. Review incorrect answers

## UI/UX Requirements

### Design System

#### Color Palette
```typescript
const colors = {
  primary: {
    main: '#4A90E2',
    light: '#6BA5E9',
    dark: '#3A7BC8',
  },
  secondary: {
    main: '#50E3C2',
    light: '#6FEBD0',
    dark: '#3DCBAA',
  },
  neutral: {
    white: '#FFFFFF',
    gray100: '#F7F8FA',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    black: '#000000',
  },
  semantic: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  }
};
```

#### Typography
```typescript
const typography = {
  heading: {
    h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
    h2: { fontSize: 28, fontWeight: '600', lineHeight: 36 },
    h3: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  },
  body: {
    large: { fontSize: 18, fontWeight: '400', lineHeight: 28 },
    regular: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
    small: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  },
  card: {
    primary: { fontSize: 24, fontWeight: '500', lineHeight: 32 },
    secondary: { fontSize: 20, fontWeight: '400', lineHeight: 28 },
  }
};
```

#### Spacing System
```typescript
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
```

### Component Design

#### Cards
- Rounded corners (12px radius)
- Subtle shadows for depth
- Smooth flip animations (300ms)
- Touch feedback states

#### Buttons
- Primary, secondary, and ghost variants
- 44x44 minimum touch target (iOS)
- 48x48 minimum touch target (Android)
- Haptic feedback on press

#### Navigation
- Tab bar for main navigation
- Stack navigation for mode screens
- Gesture-based navigation support
- Breadcrumb for deep navigation

### Accessibility

#### Requirements
- WCAG AA compliance
- Screen reader support (VoiceOver/TalkBack)
- High contrast mode support
- Minimum font size 14px
- Touch targets ≥44px (iOS) / ≥48px (Android)

#### Implementation
- Semantic component structure
- Proper ARIA labels
- Keyboard navigation support
- Focus management
- Reduced motion options

## Performance Requirements

### Target Metrics
- **Time to Interactive**: <3 seconds
- **Frame Rate**: 60 FPS for animations
- **Memory Usage**: <200MB active
- **Bundle Size**: <5MB initial download
- **Offline Start**: <1 second

### Optimization Strategies

#### React Native Specific
- Use `React.memo` for expensive components
- Implement `FlatList` with proper optimization props
- Use `InteractionManager` for heavy operations
- Lazy load screens and components
- Image optimization with proper sizing

#### State Management
- Selective subscriptions with Zustand
- Memoized selectors
- Batch state updates
- Persist only essential data

#### Animations
- Use `react-native-reanimated` for 60 FPS
- GPU-accelerated transforms
- Avoid layout animations where possible
- Preload animation assets

## Development Standards

### Code Quality

#### TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

#### Linting Rules
- ESLint with React Native configuration
- Prettier for code formatting
- Pre-commit hooks for validation

### Testing Requirements

#### Unit Tests
- Component logic testing
- Hook testing
- Store action testing
- Utility function testing
- Target: >80% coverage

#### Integration Tests
- Navigation flow testing
- State management integration
- Data persistence testing

#### E2E Tests (Detox)
- Critical user journeys
- Learning mode flows
- Cross-platform validation

### Git Workflow

#### Branch Strategy
- `main`: Production-ready code
- `develop`: Development branch
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches
- `release/*`: Release preparation

#### Commit Standards
```
feat: Add new feature
fix: Bug fix
refactor: Code refactoring
test: Add/update tests
docs: Documentation updates
style: Code style changes
perf: Performance improvements
```

## Phase 1 Deliverables

### MVP Features

#### 1. Core Infrastructure
- [x] React Native setup with TypeScript
- [ ] Navigation system
- [ ] Theme system implementation
- [ ] Zustand store setup
- [ ] AsyncStorage integration

#### 2. Deck Management
- [ ] Home screen with deck list
- [ ] Deck detail view
- [ ] Add deck functionality
- [ ] Edit deck capability
- [ ] Card list display

#### 3. Learning Modes
- [ ] Flashcards mode (complete)
- [ ] Learn mode (complete)
- [ ] Match mode (complete)
- [ ] Test mode (complete)

#### 4. Settings System
- [ ] Side configuration for each mode
- [ ] Side grouping options
- [ ] Timer settings
- [ ] Audio settings
- [ ] Persistence of preferences

#### 5. UI Components
- [ ] Card component with flip animation
- [ ] Multiple choice component
- [ ] Free text input component
- [ ] Match grid component
- [ ] Progress indicators
- [ ] Success/feedback screens

### Success Criteria

1. **Functionality**: All four learning modes operational
2. **Performance**: <3s load time, 60 FPS animations
3. **Quality**: >80% test coverage
4. **Accessibility**: Screen reader compatible
5. **Cross-Platform**: Works on iOS and Android

### Timeline

- **Week 1-2**: Core infrastructure and navigation
- **Week 3-4**: Deck management and data layer
- **Week 5-6**: Flashcards and Learn modes
- **Week 7-8**: Match and Test modes
- **Week 9-10**: Polish, testing, and optimization

## Appendices

### A. Sample Data Structure

```json
{
  "metadata": {
    "deck_name": "Chinese Language Basics",
    "description": "Essential Chinese vocabulary for beginners",
    "category": "Language Learning",
    "available_levels": [1, 2, 3],
    "available_sides": 4,
    "card_count": 44,
    "difficulty": "beginner_to_intermediate",
    "tags": ["chinese", "mandarin", "language"],
    "version": "1.0.0"
  },
  "content": [
    {
      "idx": 0,
      "name": "hello_greeting",
      "side_a": "hello",
      "side_b": "nǐ hǎo",
      "side_c": "你好",
      "side_d": "Common greeting, literally 'you good'",
      "level": 1
    }
  ]
}
```

### B. Navigation Structure

```
TabNavigator
├── Home (Stack)
│   ├── DeckList
│   ├── DeckDetail
│   └── DeckEdit
└── DeckView (Stack)
    ├── DeckOverview
    ├── Flashcards
    ├── Learn
    ├── Match
    └── Test
```

### C. State Management Structure

```typescript
// Store slices
interface AppStore {
  // Deck management
  decks: Deck[];
  activeDeck: Deck | null;

  // Session management
  session: SessionState | null;

  // User preferences
  preferences: UserPreferences;

  // Actions
  loadDecks: () => void;
  selectDeck: (id: string) => void;
  startSession: (mode: string, settings: ModeSettings) => void;
  updateProgress: (correct: boolean, cardIdx: number) => void;
  // ... more actions
}
```

---

*This specification is a living document and will be updated as development progresses and requirements evolve.*