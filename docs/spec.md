# Quizly - Technical Specification

## Executive Summary

Quizly is a high-performance, mobile-first Progressive Web Application (PWA) built with React and Vite that provides an advanced flashcard and learning system. Inspired by Quizlet's functionality, Quizly offers multiple learning modes with a focus on speed, accessibility, and beautiful responsive design that works seamlessly across all devices.

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
Create a versatile flashcard web application that supports multi-sided cards with various learning modes, enabling users to study any subject through different perspectives and learning styles on any device with a modern browser.

### Core Principles
- **Mobile-First Design**: Responsive design optimized for touch and mobile screens
- **Performance**: Lightning-fast load times with optimal bundle sizes
- **Flexibility**: Multi-sided cards support various learning scenarios
- **Beauty**: Clean, modern UI with smooth animations and transitions
- **Offline-First**: Service Worker enabling full offline functionality
- **Accessibility**: WCAG AA compliant with full keyboard navigation

### Target Platforms
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Progressive Web App (installable on mobile and desktop)
- Responsive design for phones, tablets, and desktops

## Technical Architecture

### Technology Stack

#### Frontend
- **Build Tool**: Vite 5.x for lightning-fast HMR and optimized builds
- **Framework**: React 18.x with concurrent features
- **Language**: TypeScript 5.x (strict mode)
- **State Management**: Zustand with localStorage persistence
- **Routing**: React Router v6
- **Styling**: CSS Modules with CSS custom properties for theming
- **Animations**: Framer Motion for smooth, performant animations
- **Storage**: localStorage/IndexedDB for offline data
- **Testing**: Vitest + React Testing Library

#### Key Libraries
```json
{
  "react": "^18.3.x",
  "react-dom": "^18.3.x",
  "vite": "^5.x",
  "typescript": "^5.x",
  "react-router-dom": "^6.x",
  "zustand": "^4.x",
  "framer-motion": "^11.x",
  "react-query": "^5.x",
  "workbox": "^7.x",
  "vitest": "^1.x",
  "@testing-library/react": "^14.x"
}
```

### Architecture Patterns

#### Project Structure
```
src/
├── components/
│   ├── common/        # Reusable UI components
│   ├── cards/         # Card-specific components
│   ├── modes/         # Learning mode components
│   └── ui/            # UI primitives
├── pages/
│   ├── Home.tsx
│   ├── Deck.tsx
│   ├── Flashcards.tsx
│   ├── Learn.tsx
│   ├── Match.tsx
│   └── Test.tsx
├── hooks/             # Custom React hooks
├── services/          # API and data services
├── store/            # Zustand stores
├── types/            # TypeScript definitions
├── utils/            # Utility functions
├── styles/           # Global styles and theme
│   ├── theme.css     # CSS custom properties
│   ├── global.css    # Global styles
│   └── animations.css # Shared animations
├── assets/           # Static assets
└── router/           # Routing configuration
```

### Progressive Web App Features
- **Service Worker**: Offline caching with Workbox
- **Web App Manifest**: Installable on mobile and desktop
- **Push Notifications**: Study reminders (optional)
- **Background Sync**: Sync progress when online
- **Share API**: Share decks with other users

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
- Display grid/list of available decks
- Show deck metadata (name, description, card count)
- Search and filter by category/tags
- Quick access to recent decks
- Deck statistics and progress tracking

#### Deck Operations
- **View Deck**: Display deck details and card list
- **Add Deck**: Manual data entry form with validation
- **Import Deck**: JSON/CSV import functionality
- **Edit Deck**: Modify existing deck properties and cards
- **Delete Deck**: Remove deck with confirmation
- **Export Deck**: Share deck as JSON/CSV

### 2. Card Display System

#### Multi-Side Support
- Support 2-6 sides per card (defined by `available_sides`)
- Dynamic side grouping for display
- Configurable side combinations for each mode

#### Card Rendering
- Clean, readable typography with web fonts
- Support for special characters (Unicode, emojis, math symbols)
- Responsive sizing based on viewport and content
- Smooth CSS/Framer Motion animations
- Syntax highlighting for code content
- LaTeX/MathJax support for mathematical formulas

## Learning Modes

### 1. Flashcards Mode

#### Core Functionality
- Display one card at a time
- Click/tap to flip between front/back
- Keyboard navigation:
  - Space/Enter: Flip card
  - Arrow Left: Mark as missed
  - Arrow Right: Mark as correct
- Mouse/touch gestures:
  - Click card: Flip
  - Swipe left: Mark as missed
  - Swipe right: Mark as correct
- Progress indicators with visual feedback

#### Settings
- **Side Configuration**: Choose which sides appear on front/back
- **Side Grouping**: Combine multiple sides (e.g., side_b + side_c)
- **Timer Option**: Auto-advance after timeout
- **Audio**: Web Speech API for text-to-speech
- **Animations**: Card flip style (3D transform, fade, slide)

#### Flow
1. Start with full deck
2. Show cards sequentially
3. Track correct/missed cards
4. After deck completion, auto-restart with missed cards only
5. Repeat until all cards marked correct
6. Show completion screen with statistics

### 2. Learn Mode

#### Core Functionality
- Question displayed at top (configurable sides)
- Multiple choice answers below (4 options)
- Mix multiple choice with free text input
- Immediate feedback with animations
- Progress bar showing completion

#### Question Types
- **Multiple Choice**: 1 correct + 3 distractors from deck
- **Free Text**: Type answer with fuzzy matching
- **Combined Sides**: Questions/answers can show grouped sides
- **True/False**: Binary choice questions

#### Settings
- **Cards per Round**: Default 10, adjustable
- **Side Selection**: Configure Q&A sides
- **Randomize**: Auto-swap and combine sides
- **Progression**: Level-based or random
- **Difficulty Adaptation**: Adjust based on performance

#### Flow
1. Start round with N cards
2. Present questions (80% multiple choice, 20% free text)
3. Show success animation for correct answers
4. Show correct answer with explanation for incorrect
5. Shuffle incorrect cards back into round
6. Include missed cards in next round
7. Track mastery level per card

#### Special Features
- "Let's try again" message for re-attempted questions
- "Override: I was correct" option for free text
- Progressive difficulty based on levels
- Streak counter for motivation
- Achievement badges for milestones

### 3. Match Mode

#### Core Functionality
- Responsive grid layout (adapts to screen size)
- Timer counting up with pause option
- Match related sides from same card
- Click/tap to select, visual feedback for selections
- Drag and drop support on desktop

#### Grid Configuration
- **Responsive Sizes**:
  - Mobile: 3x4 or 4x3
  - Tablet: 4x4 or 4x5
  - Desktop: 5x4 or 6x5
- **Match Types**:
  - 2-way: side_a ↔ side_b
  - 3-way: side_a ↔ side_b ↔ side_c
  - Mixed: Different combinations per card

#### Settings
- **Side Selection**: Which sides appear
- **Match Complexity**: 2-way, 3-way, or mixed
- **Grid Size**: Auto or manual selection
- **Time Limit**: Optional countdown timer
- **Hints**: Show brief hints on hover

#### Flow
1. Display responsive grid with shuffled cards
2. User clicks/taps cards to match
3. Correct matches animate and disappear
4. Wrong matches shake and reset
5. Timer tracks completion time
6. Show leaderboard with best times
7. Option to play another round

### 4. Test Mode

#### Core Functionality
- Formal assessment with multiple question types
- Configurable question count and types
- Optional instant feedback or end-of-test results
- Progress indicator showing question N of Total

#### Question Types
- **True/False**: Statement verification
- **Multiple Choice**: 4 options with single/multi select
- **Free Response**: Text input with validation
- **Matching**: Connect related items
- **Ordering**: Arrange items in sequence

#### Settings
- **Question Types**: Select which types to include
- **Side Configuration**: Choose Q&A sides
- **Auto Mode**: Shuffle which sides are questions/answers
- **Side Grouping**: Always show certain sides together
- **Question Count**: Up to deck maximum
- **Feedback**: Instant, per-question, or end-of-test
- **Time Limit**: Optional test duration
- **Passing Score**: Set minimum percentage

#### Flow
1. Configure test parameters
2. Present questions with navigation
3. Allow review and flag questions
4. Provide feedback (if instant mode)
5. Show detailed results summary
6. Review incorrect answers with explanations
7. Option to retake with different questions

## UI/UX Requirements

### Design System

#### Color Palette
```css
:root {
  /* Primary Colors */
  --primary-main: #4A90E2;
  --primary-light: #6BA5E9;
  --primary-dark: #3A7BC8;

  /* Secondary Colors */
  --secondary-main: #50E3C2;
  --secondary-light: #6FEBD0;
  --secondary-dark: #3DCBAA;

  /* Neutral Colors */
  --neutral-white: #FFFFFF;
  --neutral-gray-100: #F7F8FA;
  --neutral-gray-200: #E5E7EB;
  --neutral-gray-300: #D1D5DB;
  --neutral-gray-400: #9CA3AF;
  --neutral-gray-500: #6B7280;
  --neutral-gray-600: #4B5563;
  --neutral-gray-700: #374151;
  --neutral-gray-800: #1F2937;
  --neutral-black: #000000;

  /* Semantic Colors */
  --semantic-success: #10B981;
  --semantic-warning: #F59E0B;
  --semantic-error: #EF4444;
  --semantic-info: #3B82F6;

  /* Dark Mode */
  @media (prefers-color-scheme: dark) {
    --bg-primary: var(--neutral-gray-800);
    --bg-secondary: var(--neutral-gray-700);
    --text-primary: var(--neutral-gray-100);
    --text-secondary: var(--neutral-gray-300);
  }
}
```

#### Typography
```css
:root {
  /* Font Family */
  --font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'SF Mono', Consolas, monospace;

  /* Font Sizes */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

#### Spacing System
```css
:root {
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-5: 1.25rem;  /* 20px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-10: 2.5rem;  /* 40px */
  --space-12: 3rem;    /* 48px */
  --space-16: 4rem;    /* 64px */
}
```

### Component Design

#### Cards
- Border radius: 12px
- Box shadow for depth
- Smooth transitions (200-300ms)
- Hover/focus states
- Loading skeletons

#### Buttons
- Primary, secondary, ghost, and danger variants
- Consistent padding and sizing
- Ripple effect on click
- Keyboard focus indicators
- Loading states with spinners

#### Forms
- Floating labels or top labels
- Clear validation messages
- Auto-save functionality
- Inline editing where appropriate

### Responsive Design

#### Breakpoints
```css
/* Mobile First Approach */
--breakpoint-sm: 640px;   /* Small tablets */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Small laptops */
--breakpoint-xl: 1280px;  /* Desktops */
--breakpoint-2xl: 1536px; /* Large screens */
```

#### Layout Patterns
- Mobile: Single column, stacked layout
- Tablet: 2-column layouts where appropriate
- Desktop: Multi-column with sidebars
- Fluid typography and spacing
- Container queries for component-level responsiveness

### Accessibility

#### Requirements
- WCAG AA compliance minimum
- Full keyboard navigation
- Screen reader support with ARIA
- High contrast mode support
- Reduced motion support
- Focus visible indicators
- Skip links for navigation

#### Implementation
- Semantic HTML structure
- Proper heading hierarchy
- ARIA labels and descriptions
- Live regions for dynamic content
- Error announcements
- Loading state announcements

## Performance Requirements

### Target Metrics
- **First Contentful Paint**: <1.5s
- **Time to Interactive**: <3.5s
- **Largest Contentful Paint**: <2.5s
- **Cumulative Layout Shift**: <0.1
- **First Input Delay**: <100ms
- **Bundle Size**: <200KB initial JS
- **Lighthouse Score**: >90

### Optimization Strategies

#### Build Optimization
- Code splitting with React.lazy()
- Tree shaking with Vite
- Compression (gzip/brotli)
- Asset optimization (WebP, AVIF)
- Critical CSS inlining
- Preloading key resources

#### Runtime Optimization
- Virtual scrolling for long lists
- React.memo for expensive components
- useMemo/useCallback where appropriate
- Web Workers for heavy computations
- RequestIdleCallback for non-critical work
- Intersection Observer for lazy loading

#### Caching Strategy
- Service Worker with cache-first strategy
- localStorage for user preferences
- IndexedDB for deck data
- Memory caching for active session
- CDN for static assets

## Development Standards

### Code Quality

#### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "useDefineForClassFields": true
  }
}
```

#### Linting and Formatting
- ESLint with React and TypeScript configs
- Prettier for consistent formatting
- Husky for pre-commit hooks
- lint-staged for incremental linting

### Testing Requirements

#### Unit Tests
- Component testing with Vitest
- Hook testing with @testing-library/react-hooks
- Store testing for Zustand actions
- Utility function testing
- Target: >80% coverage

#### Integration Tests
- Page-level testing
- User flow testing
- API integration testing
- Router testing

#### E2E Tests (Playwright)
- Critical user journeys
- Cross-browser testing
- Mobile viewport testing
- Accessibility testing
- Performance testing

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
docs: Documentation updates
style: Code style changes
refactor: Code refactoring
test: Add/update tests
perf: Performance improvements
chore: Build/tool updates
```

## Phase 1 Deliverables

### MVP Features

#### 1. Core Infrastructure
- [x] Vite setup with React and TypeScript
- [x] React Router configuration
- [x] Theme system with CSS custom properties
- [x] Zustand store setup
- [ ] localStorage/IndexedDB integration
- [ ] Service Worker for offline support

#### 2. Deck Management
- [x] Home page with deck grid/list
- [ ] Deck detail view
- [ ] Add deck functionality
- [ ] Edit deck capability
- [ ] Import/Export decks
- [x] Card list display

#### 3. Learning Modes
- [~] Flashcards mode (basic implementation, needs polish)
- [ ] Learn mode (complete)
- [ ] Match mode (complete)
- [ ] Test mode (complete)

#### 4. Settings System
- [ ] Side configuration for each mode
- [ ] Side grouping options
- [ ] Theme selection (light/dark/auto)
- [ ] Animation preferences
- [ ] Audio settings
- [ ] Persistence of preferences

#### 5. UI Components
- [x] Card component with flip animation
- [ ] Multiple choice component
- [ ] Free text input component
- [ ] Match grid component
- [~] Progress indicators (basic implementation)
- [ ] Success/feedback screens
- [x] Loading states and skeletons

#### 6. PWA Features
- [ ] Web App Manifest
- [ ] Service Worker with Workbox
- [ ] Offline functionality
- [ ] Install prompts
- [ ] Update notifications

### Success Criteria

1. **Functionality**: All four learning modes operational
2. **Performance**: Lighthouse score >90
3. **Quality**: >80% test coverage
4. **Accessibility**: WCAG AA compliant
5. **Responsive**: Works on all device sizes
6. **Offline**: Full functionality without internet

### Timeline

- **Week 1-2**: Core infrastructure and routing
- **Week 3-4**: Deck management and data layer
- **Week 5-6**: Flashcards and Learn modes
- **Week 7-8**: Match and Test modes
- **Week 9-10**: PWA features and offline support
- **Week 11-12**: Polish, testing, and optimization

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
    "version": "1.0.0",
    "created_date": "2024-01-01",
    "last_updated": "2024-01-15"
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

### B. Route Structure

```
/                       # Home - deck list
/deck/:id              # Deck overview
/deck/:id/flashcards   # Flashcards mode
/deck/:id/learn        # Learn mode
/deck/:id/match        # Match mode
/deck/:id/test         # Test mode
/deck/:id/edit         # Edit deck
/settings              # App settings
/about                 # About page
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

  // UI state
  theme: 'light' | 'dark' | 'auto';
  sidebarOpen: boolean;

  // Actions
  loadDecks: () => Promise<void>;
  selectDeck: (id: string) => void;
  startSession: (mode: string, settings: ModeSettings) => void;
  updateProgress: (correct: boolean, cardIdx: number) => void;
  savePreferences: (prefs: Partial<UserPreferences>) => void;
  // ... more actions
}
```

---

*This specification is a living document and will be updated as development progresses and requirements evolve.*