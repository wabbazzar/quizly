# Quizly Project Guidelines for Claude

## CRITICAL: Read spec.md Before Starting Any Work

**⚠️ MANDATORY: Before implementing ANY feature or making ANY changes, you
MUST:**

1. Read and understand `docs/spec.md` completely
2. Ensure your work aligns with the specification
3. Update spec.md if requirements change during implementation

The spec.md file is the single source of truth for all technical requirements
and design decisions.

## Project Overview

Quizly is a high-performance, mobile-first Progressive Web Application (PWA)
built with React and Vite that provides an advanced flashcard and learning
system. This document contains critical guidelines for maintaining code quality,
consistency, and the project specification.

## CRITICAL: Specification Maintenance

**ALWAYS KEEP `docs/spec.md` UP TO DATE**

The specification document (`docs/spec.md`) is the single source of truth for
this project. Any changes to:

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

## Project Structure

```
quizly2/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── common/     # Generic components
│   │   ├── cards/      # Card-specific components
│   │   ├── modes/      # Learning mode components
│   │   └── ui/         # UI primitives
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API and data services
│   ├── store/          # Zustand state management
│   ├── types/          # TypeScript definitions
│   ├── utils/          # Utility functions
│   ├── styles/         # Global styles and theme
│   │   ├── theme.css   # CSS custom properties
│   │   └── global.css  # Global styles
│   └── router/         # React Router config
├── public/
│   └── data/           # Static JSON data files
├── docs/
│   ├── spec.md         # PROJECT SPECIFICATION (KEEP UPDATED!)
│   └── tickets/        # Feature tickets
├── .claude/
│   └── agents/         # AI agent configurations
└── __tests__/          # Test files
```

## Design System & Styling

### CSS Custom Properties (from spec.md)

**CRITICAL: Always use theme-aware custom properties, never hardcoded colors**

### Semi-Transparent Design Pattern

**CRITICAL: Use semi-transparent boxes throughout the app for consistency**

The app follows a semi-transparent design pattern where components use subtle
gradient backgrounds instead of solid colors:

#### ✅ Correct Semi-Transparent Patterns

```css
/* Mode cards and interactive components */
.component {
  background: linear-gradient(
    135deg,
    rgba(74, 144, 226, 0.1),
    rgba(74, 144, 226, 0.05)
  );
  border: 2px solid rgba(74, 144, 226, 0.2);
}

/* Card categories and sections */
.section {
  background: linear-gradient(
    135deg,
    rgba(74, 144, 226, 0.03),
    rgba(74, 144, 226, 0.01)
  );
}

/* Settings notices and info boxes */
.infoBox {
  background: linear-gradient(
    135deg,
    rgba(74, 144, 226, 0.1),
    rgba(74, 144, 226, 0.05)
  );
  border: 1px solid var(--primary-light);
}
```

#### ❌ Forbidden Patterns

```css
/* NEVER use solid backgrounds for main components */
.component {
  background: var(--neutral-white); /* ❌ Bad - solid white */
  background: white; /* ❌ Bad - hardcoded */
  background: var(--bg-primary); /* ❌ Bad - should be semi-transparent */
}
```

```css
:root {
  /* Primary Colors */
  --primary-main: #4a90e2;
  --primary-light: #6ba5e9;
  --primary-dark: #3a7bc8;

  /* Secondary Colors */
  --secondary-main: #50e3c2;
  --secondary-light: #6febd0;
  --secondary-dark: #3dcbaa;

  /* Neutral Colors (Use sparingly - prefer theme variables) */
  --neutral-white: #ffffff;
  --neutral-gray-100: #f7f8fa;
  --neutral-gray-200: #e5e7eb;
  --neutral-gray-300: #d1d5db;
  --neutral-gray-400: #9ca3af;
  --neutral-gray-500: #6b7280;
  --neutral-gray-600: #4b5563;
  --neutral-gray-700: #374151;
  --neutral-gray-800: #1f2937;
  --neutral-black: #000000;

  /* Semantic Colors */
  --semantic-success: #10b981;
  --semantic-warning: #f59e0b;
  --semantic-error: #ef4444;
  --semantic-info: #3b82f6;

  /* Theme-Aware Colors (ALWAYS USE THESE) */
  --bg-primary: var(--neutral-white);
  --bg-secondary: var(--neutral-gray-100);
  --bg-tertiary: var(--neutral-gray-200);
  --text-primary: var(--neutral-gray-800);
  --text-secondary: var(--neutral-gray-600);
  --text-tertiary: var(--neutral-gray-500);
  --text-primary-on-dark: var(--neutral-white);
  --border-color: var(--neutral-gray-200);
}
```

### Mobile-First Design Principles

**CRITICAL: All CSS must be mobile-first and prevent horizontal overflow**

#### ✅ Required Patterns

```css
/* Always prevent horizontal overflow */
.component {
  max-width: 100vw;
  overflow-x: hidden;
}

/* Always use theme-aware colors */
.component {
  background: var(--bg-primary); /* ✅ Good */
  color: var(--text-primary); /* ✅ Good */
}

/* Mobile-first responsive design */
.component {
  /* Mobile styles first */
  padding: var(--space-4);
  font-size: var(--text-sm);
}

@media (min-width: 768px) {
  .component {
    /* Tablet and up */
    padding: var(--space-6);
    font-size: var(--text-base);
  }
}

/* Proper text wrapping for mobile */
.textContent {
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
  max-width: 100%;
}
```

#### ❌ Forbidden Patterns

```css
/* NEVER use hardcoded colors */
.component {
  background: white; /* ❌ Bad - breaks dark mode */
  color: #1f2937; /* ❌ Bad - hardcoded */
  background: var(--neutral-white); /* ❌ Bad - not theme aware */
}

/* NEVER allow horizontal overflow */
.component {
  width: 500px; /* ❌ Bad - fixed width on mobile */
  min-width: 400px; /* ❌ Bad - forces horizontal scroll */
}

/* NEVER use desktop-first responsive */
.component {
  /* Desktop styles first */
  padding: var(--space-8);
}

@media (max-width: 768px) {
  /* ❌ Bad - desktop-first */
  .component {
    padding: var(--space-4);
  }
}
```

### Component Styling Rules

- **Always use CSS Modules** for component-specific styles
- **Use CSS custom properties** for theming (theme-aware variables only)
- **Never use inline styles** except for dynamic values
- **Maintain mobile-first approach** with responsive design
- **Ensure WCAG AA compliance** for accessibility
- **Prevent horizontal overflow** on all screen sizes
- **Use proper text wrapping** for mobile content

### Mobile Responsive Checklist

Before committing any component, verify:

- [ ] **No horizontal overflow** on mobile (< 480px)
- [ ] **Theme-aware colors** (no hardcoded `--neutral-*` or color values)
- [ ] **Semi-transparent backgrounds** (use gradient patterns, not solid colors)
- [ ] **Mobile-first responsive design** (styles start with mobile, use
      min-width)
- [ ] **Proper text wrapping** for long content
- [ ] **Safe area support** for iOS devices
- [ ] **Touch-friendly targets** (minimum 44px)
- [ ] **Dark mode compatibility** (uses theme variables)

### Responsive Design Patterns

#### Grid Layouts

```css
/* ✅ Good - Mobile-first responsive grid */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
  max-width: 100vw;
  overflow-x: hidden;
}

@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-6);
  }
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
    max-width: var(--content-width-xl);
    margin: 0 auto;
  }
}
```

#### Modal Responsiveness

```css
/* ✅ Good - Mobile-friendly modals */
.modal {
  position: fixed;
  inset: 0;
  background: var(--bg-primary);
  max-width: 100vw;
  overflow-y: auto;
  padding: var(--space-4);
}

@media (min-width: 768px) {
  .modal {
    inset: var(--space-8);
    border-radius: var(--radius-xl);
    max-width: 600px;
    max-height: 80vh;
    margin: auto;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
}
```

#### Card Component Patterns

```css
/* ✅ Good - Responsive card layout */
.card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  max-width: 100%;
  overflow: hidden;
}

.cardContent {
  min-width: 0; /* Allows flex children to shrink */
  word-wrap: break-word;
  overflow-wrap: break-word;
}

@media (min-width: 768px) {
  .card {
    padding: var(--space-6);
  }
}
```

### Theme Variable Usage Guide

#### Always Use Theme Variables

```css
/* ✅ Correct */
.component {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

/* ❌ Incorrect */
.component {
  background: var(--neutral-white);
  color: var(--neutral-gray-800);
  border: 1px solid var(--neutral-gray-200);
}
```

#### Available Theme Variables

- **Backgrounds**: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`
- **Text**: `--text-primary`, `--text-secondary`, `--text-tertiary`,
  `--text-primary-on-dark`
- **Borders**: `--border-color`
- **Semantic**: `--semantic-success`, `--semantic-warning`, `--semantic-error`,
  `--semantic-info`
- **Brand**: `--primary-main`, `--primary-light`, `--primary-dark`,
  `--secondary-main`

### Icon System Guidelines

**CRITICAL: Never use emojis in the application. Always use proper icon
components.**

#### Icon Implementation Rules:

1. **Create SVG icon components** in `src/components/icons/`
2. **Use consistent sizing** with size prop (16, 20, 24 as standard sizes)
3. **Support color inheritance** via currentColor
4. **Maintain consistent stroke width** (2px for outline icons)
5. **Include proper ARIA labels** for accessibility

#### Icon Component Pattern:

```typescript
import { FC } from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

export const IconName: FC<IconProps> = ({
  className,
  size = 24,
  color = 'currentColor'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* SVG paths */}
  </svg>
);
```

#### Icon Usage Guidelines:

- Use semantic icon names (CheckCircleIcon, not CheckIcon)
- Group related icons in the same file
- Ensure icons work in both light and dark modes
- Test icons at different sizes for clarity
- Never use Unicode symbols or emoji characters

## Data Models & Types

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
import { FC, memo } from 'react';

interface ComponentProps {
  // Properly typed props
}

export const ComponentName: FC<ComponentProps> = memo(({ prop1, prop2 }) => {
  // Implementation
});
```

## Testing Standards

### Test-Driven Development

1. **Write failing test first** for bugs
2. **Implement fix**
3. **Verify test passes**
4. **Add edge cases**

### Testing Requirements

- **Unit tests**: >80% coverage target (Vitest)
- **Component tests**: React Testing Library
- **E2E tests**: Playwright for critical flows
- **Performance tests**: Lighthouse >90

### Testing Pattern

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## Performance Requirements

### Target Metrics (from spec.md)

- **First Contentful Paint**: <1.5s
- **Time to Interactive**: <3.5s
- **Largest Contentful Paint**: <2.5s
- **Cumulative Layout Shift**: <0.1
- **Bundle Size**: <200KB initial JS
- **Lighthouse Score**: >90

### Optimization Checklist

- [ ] Use `React.memo` for expensive components
- [ ] Implement code splitting with `React.lazy()`
- [ ] Use CSS transforms for animations
- [ ] Optimize images with WebP/AVIF
- [ ] Implement virtual scrolling for long lists

## Development Workflow

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
Scopes: components, pages, router, store, types, tests
```

**NEVER include AI signatures in commits:**

- Never include "Generated with Claude Code"
- Never include "Co-Authored-By: Claude"
- Never use emojis in commit messages

## Learning Modes Implementation

### Four Core Modes (from spec.md)

1. **Flashcards**: Click/tap to flip, keyboard/swipe navigation
2. **Learn**: Multiple choice + free text with progression
3. **Match**: Grid-based matching game
4. **Test**: Formal assessment with various question types

### Mode Configuration System

Each mode supports:

- Configurable side selection (which sides to show)
- Side grouping (combine multiple sides)
- Progression settings (sequential, level-based, random)
- Timer and audio options

## State Management

### Zustand Store Structure

```typescript
interface AppStore {
  // Deck management
  decks: Deck[];
  activeDeck: Deck | null;
  currentDeck: Deck | null;
  currentDeckId?: string;

  // Session management
  session: SessionState | null;

  // User preferences
  preferences: UserPreferences;

  // UI state
  theme: 'light' | 'dark' | 'auto';

  // Actions
  loadDecks: () => Promise<void>;
  loadDeck: (deckId: string) => Promise<void>;
  selectDeck: (id: string) => void;
  startSession: (mode: string, settings: ModeSettings) => void;
  updateProgress: (correct: boolean, cardIdx: number) => void;
}
```

### Persistence & Reload Handling

#### Store Persistence Configuration

```typescript
// CRITICAL: Only persist minimal state to avoid stale data
persist(
  (set, get) => ({
    /* store implementation */
  }),
  {
    name: 'deck-store',
    partialize: state => ({
      // Only persist IDs and user data, not content
      currentDeckId: state.currentDeck?.id,
      masteredCards: state.masteredCards,
      // Never persist deck content - always reload fresh
    }),
    onRehydrateStorage: () => state => {
      // Auto-reload current deck after refresh
      if (state?.currentDeckId) {
        state.loadDeck(state.currentDeckId);
      }
    },
  }
);
```

#### Page Reload Pattern

**CRITICAL: All pages must handle async deck loading gracefully**

```typescript
// ✅ CORRECT: Component pattern for reload-safe pages
const PageComponent: FC = () => {
  const { currentDeck, isLoading, error, loadDeck } = useDeckStore();

  // 1. Load deck on mount
  useEffect(() => {
    if (deckId) {
      loadDeck(deckId);
    }
  }, [deckId, loadDeck]);

  // 2. Use useMemo for derived state with null checks
  const derivedData = useMemo(() => {
    if (!currentDeck?.content) return [];
    return currentDeck.content.filter(/* ... */);
  }, [currentDeck]);

  // 3. Handle loading state FIRST
  if (isLoading) {
    return <LoadingScreen />;
  }

  // 4. Handle error/missing data SECOND
  if (error || !currentDeck) {
    return <ErrorState />;
  }

  // 5. Only render content when data is ready
  return <Content deck={currentDeck} />;
};
```

#### Component Safety Rules

```typescript
// ✅ CORRECT: Defensive component with null checks
export const Component: FC<Props> = ({ deck }) => {
  // Always check for required data
  if (!deck?.content || !deck?.metadata) {
    return null;
  }

  // Safe to use deck properties here
  return <div>{deck.content.length} cards</div>;
};

// ❌ WRONG: Assumes data exists
export const Component: FC<Props> = ({ deck }) => {
  // This will crash on reload!
  return <div>{deck.content.length} cards</div>;
};
```

### Persistence Rules

- Use localStorage for user preferences and session IDs only
- Never persist full deck content (reload from source)
- Cache active session state in memory
- Implement Service Worker for offline support
- Always validate persisted data on rehydration

## Responsive Design

### Breakpoints

```css
/* Mobile First Approach */
--breakpoint-sm: 640px; /* Small tablets */
--breakpoint-md: 768px; /* Tablets */
--breakpoint-lg: 1024px; /* Small laptops */
--breakpoint-xl: 1280px; /* Desktops */
--breakpoint-2xl: 1536px; /* Large screens */
```

### CSS Modules Pattern

```css
/* Component.module.css */
.container {
  padding: var(--space-4);
}

/* Tablet and up */
@media (min-width: 768px) {
  .container {
    padding: var(--space-6);
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .container {
    padding: var(--space-8);
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

### Accessibility Requirements

- Full keyboard navigation
- Screen reader support with ARIA
- Focus visible indicators
- High contrast mode support
- Reduced motion support
- Semantic HTML structure

## Common Pitfalls to Avoid

1. **Never use inline event handlers** - use proper event delegation
2. **Never skip React.memo** for list items
3. **Never use index as key** in dynamic lists
4. **Never ignore TypeScript errors**
5. **Never ship without browser testing**
6. **Never access deck properties without null checks** - causes reload crashes
7. **Never persist full deck content** - leads to stale data issues
8. **Never render before checking isLoading/error states** - causes undefined
   errors

## Troubleshooting Page Reload Issues

### Problem: "Cannot read properties of undefined" on page reload

**Solution**: Follow the component pattern in "Page Reload Pattern" section
above

### Problem: Deck data missing after refresh

**Solution**: Ensure `onRehydrateStorage` is configured in store

### Problem: Components render without data

**Solution**: Add defensive null checks as shown in "Component Safety Rules"

### Testing Reload Resilience

```bash
# Test each route with direct browser refresh
1. Navigate to /deck/1 → Press F5
2. Navigate to /flashcards/1 → Press F5
3. Navigate to /learn/1 → Press F5
4. Check browser console for errors
```

## Pre-Commit Checklist

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

# Lighthouse audit (for UI changes)
npm run lighthouse

# Update spec.md if needed
git add docs/spec.md
```

## Continuous Maintenance

### Daily Tasks

- Review and update spec.md
- Keep TypeScript types in sync
- Maintain test coverage above 80%
- Profile performance regularly

### Weekly Tasks

- Review bundle size
- Check for dependency updates
- Test on different browsers
- Update documentation

## Phase 1 Priorities

Current focus areas (from spec.md):

1. Core infrastructure setup [Complete]
2. React Router configuration
3. Theme system with CSS custom properties
4. Deck management features
5. All four learning modes
6. PWA features and offline support

## Quick References

### Key Files

- `docs/spec.md` - Complete project specification
- `src/types/index.ts` - All TypeScript interfaces
- `src/styles/theme.css` - CSS custom properties
- `src/store/index.ts` - State management

### Testing Commands

```bash
npm test                    # Run all tests
npm run test:coverage       # With coverage
npm run test:watch         # Watch mode
npm run test:e2e           # E2E tests with Playwright
```

### Development Commands

```bash
npm run dev                # Start Vite dev server (port 5173)
npm run build              # Production build
npm run preview            # Preview production build
npm run type-check         # TypeScript validation
npm run lint              # ESLint check
npm run lighthouse        # Performance audit
```

### Dev Server Configuration

**IMPORTANT**: The development server runs on port **5173** (Vite default).

```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
});
```

## Learning Resources

- React docs: Use Context7 MCP for latest patterns
- Vite docs: https://vitejs.dev/
- Testing patterns: See `.claude/agents/test-writer.md`
- Code quality: See `.claude/agents/code-quality-assessor.md`
- Performance: Run `npm run lighthouse`

## Important Reminders

1. **ALWAYS read spec.md before starting any work**
2. **ALWAYS update spec.md** when requirements change
3. **ALWAYS write complete components**, not snippets
4. **ALWAYS test on multiple browsers**
5. **ALWAYS use proper TypeScript types**
6. **ALWAYS follow the CSS custom properties system**
7. **NEVER use emojis** - always use proper icon components
8. **NEVER commit without running tests**
9. **NEVER include AI attribution in commits**
10. **NEVER use `any` type**
11. **NEVER ship broken code**

## When Stuck

1. Review `docs/spec.md` for requirements
2. Check existing components for patterns
3. Use appropriate agent for help
4. Test incrementally
5. Update documentation

## Browser Support

### Minimum Requirements

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Progressive Enhancement

- Core functionality works without JavaScript
- Enhanced features with JavaScript enabled
- Offline support with Service Worker
- Install as PWA on supported platforms

---

_This document should be reviewed and updated regularly as the project evolves.
The spec.md file remains the authoritative source for all technical
requirements._
