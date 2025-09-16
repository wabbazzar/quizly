# Quizly Project Guidelines for Claude

## CRITICAL: Read spec.md Before Starting Any Work

**⚠️ MANDATORY: Before implementing ANY feature or making ANY changes, you MUST:**
1. Read and understand `docs/spec.md` completely
2. Ensure your work aligns with the specification
3. Update spec.md if requirements change during implementation

The spec.md file is the single source of truth for all technical requirements and design decisions.

## Project Overview

Quizly is a high-performance, mobile-first Progressive Web Application (PWA) built with React and Vite that provides an advanced flashcard and learning system. This document contains critical guidelines for maintaining code quality, consistency, and the project specification.

## CRITICAL: Specification Maintenance

**ALWAYS KEEP `docs/spec.md` UP TO DATE**

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
}
```

### Component Styling Rules
- **Always use CSS Modules** for component-specific styles
- **Use CSS custom properties** for theming
- **Never use inline styles** except for dynamic values
- **Maintain mobile-first approach** with responsive design
- **Ensure WCAG AA compliance** for accessibility

### Icon System Guidelines

**CRITICAL: Never use emojis in the application. Always use proper icon components.**

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

export const ComponentName: FC<ComponentProps> = memo(({
  prop1,
  prop2,
}) => {
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

  // Session management
  session: SessionState | null;

  // User preferences
  preferences: UserPreferences;

  // UI state
  theme: 'light' | 'dark' | 'auto';

  // Actions
  loadDecks: () => Promise<void>;
  selectDeck: (id: string) => void;
  startSession: (mode: string, settings: ModeSettings) => void;
  updateProgress: (correct: boolean, cardIdx: number) => void;
}
```

### Persistence Rules
- Use localStorage for user preferences
- Use IndexedDB for deck data
- Cache active session in memory
- Implement Service Worker for offline support

## Responsive Design

### Breakpoints
```css
/* Mobile First Approach */
--breakpoint-sm: 640px;   /* Small tablets */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Small laptops */
--breakpoint-xl: 1280px;  /* Desktops */
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

*This document should be reviewed and updated regularly as the project evolves. The spec.md file remains the authoritative source for all technical requirements.*