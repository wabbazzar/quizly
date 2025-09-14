# Quizly Project Guidelines for Claude

## 🎯 Project Overview

Quizly is a high-performance, mobile-first Progressive Web Application (PWA) built with React Native that provides an advanced flashcard and learning system. This document contains critical guidelines for maintaining code quality, consistency, and the project specification.

## 📋 CRITICAL: Specification Maintenance

**⚠️ ALWAYS KEEP `docs/spec.md` UP TO DATE ⚠️**

The specification document (`docs/spec.md`) is the single source of truth for this project. Any changes to:
- Data models or TypeScript interfaces
- Component architecture
- Learning mode functionality
- UI/UX patterns
- Performance requirements
- API structures

**MUST be immediately reflected in the spec.md file.**

### Specification Update Workflow:
```bash
# Before implementing any feature
1. Review docs/spec.md for current requirements
2. Update spec.md if requirements change
3. Implement according to updated spec
4. Verify implementation matches spec

# After completing any feature
1. Review implementation
2. Update spec.md with any deviations or improvements
3. Commit spec.md changes with the feature
```

## 🏗️ Project Structure

```
quizly2/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── common/     # Generic components
│   │   ├── cards/      # Card-specific components
│   │   ├── modes/      # Learning mode components
│   │   └── ui/         # UI primitives
│   ├── screens/        # Screen components
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API and data services
│   ├── store/          # Zustand state management
│   ├── types/          # TypeScript definitions
│   ├── utils/          # Utility functions
│   ├── theme/          # Design system
│   └── navigation/     # React Navigation config
├── docs/
│   ├── spec.md         # PROJECT SPECIFICATION (KEEP UPDATED!)
│   └── tickets/        # Feature tickets
├── .claude/
│   └── agents/         # AI agent configurations
└── __tests__/          # Test files
```

## 🎨 Design System & Styling

### Color Palette (from spec.md)
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

### Component Styling Rules
- **Always use StyleSheet.create()** for performance
- **Never use inline styles** except for dynamic values
- **Maintain consistent spacing** using the spacing system
- **Ensure touch targets** are ≥44px (iOS) / ≥48px (Android)

## 💾 Data Models & Types

### CRITICAL: Multi-Sided Card System
The app supports cards with 2-6 sides (configurable):
- `side_a` and `side_b` are REQUIRED
- `side_c` through `side_f` are OPTIONAL
- Sides can be grouped for display (e.g., show side_b + side_c together)
- Each learning mode can configure which sides appear

### TypeScript Requirements
- **NO `any` types** - ever
- **Strict mode enabled** - always
- **All props and state fully typed**
- **Use discriminated unions** for complex types

Example component structure:
```typescript
interface ComponentProps {
  // Properly typed props
}

export const ComponentName: FC<ComponentProps> = memo(({
  prop1,
  prop2,
}) => {
  // Implementation
});
```

## 🧪 Testing Standards

### Test-Driven Development
1. **Write failing test first** for bugs
2. **Implement fix**
3. **Verify test passes**
4. **Add edge cases**

### Testing Requirements
- **Unit tests**: >80% coverage target
- **Component tests**: React Native Testing Library
- **Platform tests**: Test iOS and Android separately
- **E2E tests**: Critical user flows with Detox

### Platform Testing Pattern
```typescript
it.each(['ios', 'android'])('should work on %s', (platform) => {
  Platform.OS = platform as 'ios' | 'android';
  // Test implementation
});
```

## 🚀 Performance Requirements

### Target Metrics (from spec.md)
- **Time to Interactive**: <3 seconds
- **Frame Rate**: 60 FPS for all animations
- **Memory Usage**: <200MB active
- **Bundle Size**: <5MB initial download
- **Offline Start**: <1 second

### Optimization Checklist
- [ ] Use `React.memo` for expensive components
- [ ] Implement `FlatList` with proper props
- [ ] Use `InteractionManager` for heavy operations
- [ ] Optimize images with proper sizing
- [ ] Use `react-native-reanimated` for animations

## 📝 Development Workflow

### Incremental Development
1. **Work on ONE component at a time**
2. **Complete each step fully before moving on**
3. **Update spec.md if requirements change**
4. **Test before proceeding to next component**

### Agent Workflow
```bash
# For new features
claude --agent ticket-writer "Create ticket for [feature]"
claude --agent code-writer "Implement [component] from ticket #XXX"
claude --agent code-quality-assessor "Review [component] implementation"
claude --agent test-writer "Write tests for [component]"
claude --agent test-critic "Review tests for [component]"
```

### Commit Standards
```
<type>(<scope>): <subject under 50 chars>

Types: feat, fix, docs, style, refactor, test, chore
Scopes: components, screens, navigation, store, types, tests
```

**NEVER include AI signatures in commits:**
- ❌ "🤖 Generated with Claude Code"
- ❌ "Co-Authored-By: Claude"

## 🎮 Learning Modes Implementation

### Four Core Modes (from spec.md)
1. **Flashcards**: Swipe-based with configurable sides
2. **Learn**: Multiple choice + free text with progression
3. **Match**: Grid-based matching game
4. **Test**: Formal assessment with various question types

### Mode Configuration System
Each mode supports:
- Configurable side selection (which sides to show)
- Side grouping (combine multiple sides)
- Progression settings (sequential, level-based, random)
- Timer and audio options

## 🔧 State Management

### Zustand Store Structure
```typescript
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
}
```

### Persistence Rules
- Use AsyncStorage for offline data
- Persist user preferences
- Cache deck data locally
- Store session progress

## 📱 Platform-Specific Considerations

### iOS vs Android
```typescript
const styles = StyleSheet.create({
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
  }),
});
```

### Accessibility Requirements
- Screen reader support (VoiceOver/TalkBack)
- Minimum touch targets
- WCAG AA compliance
- Proper ARIA labels

## 🚫 Common Pitfalls to Avoid

1. **Never use inline functions in props** - causes re-renders
2. **Never skip React.memo** for list items
3. **Never use index as key** in dynamic lists
4. **Never ignore platform differences**
5. **Never ship without testing both platforms**

## ✅ Pre-Commit Checklist

Before ANY commit:
```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Tests
npm test

# Build verification
npm run build

# Update spec.md if needed
git add docs/spec.md
```

## 🔄 Continuous Maintenance

### Daily Tasks
- Review and update spec.md
- Keep TypeScript types in sync
- Maintain test coverage above 80%
- Profile performance regularly

### Weekly Tasks
- Review bundle size
- Check for dependency updates
- Test on real devices
- Update documentation

## 🎯 Phase 1 Priorities

Current focus areas (from spec.md):
1. Core infrastructure setup ✅
2. Navigation system implementation
3. Theme system and design tokens
4. Deck management features
5. All four learning modes
6. Settings and persistence

## 📚 Quick References

### Key Files
- `docs/spec.md` - Complete project specification
- `src/types/index.ts` - All TypeScript interfaces
- `src/theme/index.ts` - Design system tokens
- `src/store/index.ts` - State management

### Testing Commands
```bash
npm test                    # Run all tests
npm test -- --coverage      # With coverage
npm test ComponentName      # Specific component
npm run test:e2e           # E2E tests
```

### Development Commands
```bash
npm start                   # Start Metro bundler on port 8081
npm run ios                # iOS simulator
npm run android            # Android emulator
npm run type-check         # TypeScript validation
npm run lint              # ESLint check
```

### Dev Server Configuration
**IMPORTANT**: The development server runs on port **8081** instead of the standard 8080 to avoid conflicts with other local services.

To configure this in your project:
```json
// metro.config.js
module.exports = {
  server: {
    port: 8081,
  },
  // ... other config
};
```

If you need to manually specify the port:
```bash
npx react-native start --port 8081
```

## 🎓 Learning Resources

- React Native docs: Use Context7 MCP for latest patterns
- Testing patterns: See `.claude/agents/test-writer.md`
- Code quality: See `.claude/agents/code-quality-assessor.md`
- Debugging: See `.claude/agents/debugger.md`

## 💡 Important Reminders

1. **ALWAYS update spec.md** when requirements change
2. **ALWAYS write complete functions**, not snippets
3. **ALWAYS test on both platforms**
4. **ALWAYS use proper TypeScript types**
5. **ALWAYS follow the design system**
6. **NEVER commit without running tests**
7. **NEVER include AI attribution in commits**
8. **NEVER use `any` type**
9. **NEVER ship broken code**

## 🆘 When Stuck

1. Review `docs/spec.md` for requirements
2. Check existing components for patterns
3. Use appropriate agent for help
4. Test incrementally
5. Update documentation

---

*This document should be reviewed and updated regularly as the project evolves. The spec.md file remains the authoritative source for all technical requirements.*