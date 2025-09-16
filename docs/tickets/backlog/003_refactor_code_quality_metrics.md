# Ticket 003: Code Quality Metrics Improvements

## Metadata
- **Status**: Not Started
- **Priority**: High
- **Effort**: 8 points
- **Created**: 2025-09-15
- **Type**: refactor
- **Platforms**: Both
- **Parent Ticket**: #001 - Initial PWA Setup with Flashcards Mode

## User Stories

### Primary User Story
As a developer, I want strict code quality enforcement so that the codebase maintains high standards of maintainability, type safety, and testing coverage.

### Secondary User Stories
- As a developer, I want zero TypeScript errors so that the application is type-safe and IDE support is optimal
- As a maintainer, I want comprehensive test coverage so that changes can be made confidently without breaking functionality
- As a team member, I want consistent linting standards so that code style is uniform across the project
- As a quality assurance engineer, I want automated quality gates so that low-quality code cannot be committed

## Technical Requirements

### Functional Requirements
1. **Zero TypeScript Errors**: Eliminate all `any` types and ensure complete type coverage
2. **ESLint Compliance**: Fix all current linting errors (2255+ errors) and enforce standards
3. **Test Coverage**: Achieve >80% coverage for utilities, >70% for React components
4. **Code Organization**: Implement proper file organization patterns from project guidelines
5. **Quality Gates**: Set up pre-commit hooks and CI quality validation

### Non-Functional Requirements
1. Performance: Linting and type checking must complete in <30 seconds
2. Maintainability: Code quality rules must be clearly documented
3. Developer Experience: Quality tools should provide helpful error messages
4. Automation: Quality checks must run automatically on commit and CI

## Implementation Plan

### Phase 1: TypeScript Compliance (2 points)
**Files to create/modify:**
- `src/hooks/usePWAVisibility.ts` - Replace `any` types with proper interfaces
- `src/main.tsx` - Type navigator.serviceWorker properly
- `src/services/questionGenerator.ts` - Replace `any` with proper Card/question types
- `src/utils/deckLoader.ts` - Type JSON parsing and validation functions
- `src/vite-env.d.ts` - Proper service worker types
- `tests/pwa-restoration.test.ts` - Replace `any` with proper test types

**TypeScript Interface Updates:**
```typescript
// Add to src/types/index.ts
export interface ServiceWorkerNavigator extends Navigator {
  serviceWorker: ServiceWorkerContainer;
}

export interface PWAVisibilityState {
  isVisible: boolean;
  visibilityState: DocumentVisibilityState;
}

export interface DeckValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedDeck?: Deck;
}

export interface QuestionGenerationContext {
  availableCards: Card[];
  usedCards: Set<number>;
  difficulty: number;
  questionType: 'multiple_choice' | 'free_text';
}
```

**Implementation steps:**
1. Replace `any` types in usePWAVisibility.ts with PWAVisibilityState interface
2. Type navigator.serviceWorker with ServiceWorkerNavigator interface
3. Replace JSON parsing `any` types with DeckValidationResult interface
4. Type question generation context with QuestionGenerationContext interface
5. Run `npm run type-check` to verify zero errors

**Testing:**
1. Run: `npm run type-check` - must pass with zero errors
2. Verify IDE type support works correctly
3. Test hot module reloading still functions

**Commit**: `refactor(types): eliminate all any types and add proper TypeScript interfaces`

### Phase 2: ESLint Configuration and Core Fixes (3 points)
**Files to create/modify:**
- `eslint.config.js` - Update ESLint configuration for better rule enforcement
- `.eslintignore` - Exclude generated files and build artifacts
- `__tests__/e2e/gh-pages.test.ts` - Fix unused variable errors
- `src/pages/Results.tsx` - Fix React unescaped entities
- `src/services/questionGenerator.ts` - Fix regex escape sequences

**ESLint Configuration:**
```typescript
// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'public/sw.js', 'scripts/**/*.js'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-empty-function': 'error',
      'no-console': 'warn',
      'prefer-const': 'error',
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off', // Allow console in Node.js scripts
    },
  }
);
```

**Implementation steps:**
1. Update ESLint configuration to ignore generated files (dev-dist/, public/sw.js)
2. Fix unused variable in `__tests__/e2e/gh-pages.test.ts` by using or prefixing with underscore
3. Fix React unescaped entities in Results.tsx using proper HTML entities
4. Fix regex escape sequences in questionGenerator.ts
5. Add Node.js globals for scripts directory
6. Run `npm run lint` to verify <10 errors remain

**Testing:**
1. Run: `npm run lint` - should show <10 errors (down from 2255+)
2. Verify scripts can run without console/globals errors
3. Test React components render without entity warnings

**Commit**: `refactor(lint): update ESLint config and fix core linting errors`

### Phase 3: Test Coverage Infrastructure (2 points)
**Files to create/modify:**
- `vitest.config.ts` - Configure test coverage reporting
- `package.json` - Add missing @vitest/coverage-v8 dependency
- `__tests__/components/` - Create component test directory structure
- `__tests__/utils/` - Create utility test directory structure
- `__tests__/hooks/` - Create hooks test directory structure

**Vitest Configuration:**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'dev-dist/',
        'public/',
        'scripts/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
        'src/utils/': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Test Setup File:**
```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Mock IntersectionObserver for components that use it
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver for responsive components
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};
```

**Implementation steps:**
1. Install @vitest/coverage-v8 dependency
2. Create vitest.config.ts with coverage thresholds
3. Set up test directory structure for organized testing
4. Create test setup file with global mocks
5. Configure coverage exclusions for build artifacts

**Testing:**
1. Run: `npm run test:coverage` - should complete without dependency errors
2. Verify coverage thresholds are enforced
3. Test coverage reports generate correctly (HTML/JSON)

**Commit**: `test: configure comprehensive test coverage infrastructure`

### Phase 4: Critical Component Tests (1 point)
**Files to create/modify:**
- `__tests__/components/cards/FlashCard.test.tsx` - Test card flipping and interactions
- `__tests__/utils/deckLoader.test.ts` - Test deck loading and validation
- `__tests__/hooks/usePWAVisibility.test.ts` - Test PWA visibility detection

**Component Test Example:**
```typescript
// __tests__/components/cards/FlashCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FlashCard } from '@/components/cards/FlashCard';
import { Card } from '@/types';

const mockCard: Card = {
  idx: 0,
  name: 'test_card',
  side_a: 'Front side',
  side_b: 'Back side',
  level: 1,
};

describe('FlashCard', () => {
  it('should render front side initially', () => {
    render(
      <FlashCard
        card={mockCard}
        frontSides={['side_a']}
        backSides={['side_b']}
        onAnswer={vi.fn()}
      />
    );

    expect(screen.getByText('Front side')).toBeInTheDocument();
    expect(screen.queryByText('Back side')).not.toBeInTheDocument();
  });

  it('should flip to back side when clicked', () => {
    render(
      <FlashCard
        card={mockCard}
        frontSides={['side_a']}
        backSides={['side_b']}
        onAnswer={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('Back side')).toBeInTheDocument();
  });

  it('should handle keyboard navigation', () => {
    const onAnswer = vi.fn();
    render(
      <FlashCard
        card={mockCard}
        frontSides={['side_a']}
        backSides={['side_b']}
        onAnswer={onAnswer}
      />
    );

    fireEvent.keyDown(document, { key: 'ArrowRight' });

    expect(onAnswer).toHaveBeenCalledWith(true, 0);
  });
});
```

**Implementation steps:**
1. Create FlashCard component tests covering flipping, keyboard navigation, and answer handling
2. Create deckLoader utility tests covering validation, sanitization, and error cases
3. Create usePWAVisibility hook tests covering visibility state changes
4. Ensure all tests follow React Testing Library best practices

**Testing:**
1. Run: `npm test` - all new tests should pass
2. Verify component interactions work as expected
3. Check accessibility features are properly tested

**Commit**: `test: add critical component and utility tests for core functionality`

## Testing Strategy

### Unit Tests
- Test files: `__tests__/utils/*.test.ts`, `__tests__/hooks/*.test.ts`
- Key scenarios:
  - DeckLoader validation with invalid JSON
  - PWA visibility state changes
  - Question generation edge cases
  - Text matching algorithms with typos
- Mock requirements: localStorage, IndexedDB, navigator APIs

### Component Tests
```typescript
describe('FlashCard Component', () => {
  it('should render on desktop', () => {
    render(<FlashCard {...defaultProps} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should handle touch gestures on mobile', () => {
    // Mock touch events
    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent(screen.getByRole('button'), touchStart);
    // Verify swipe gesture handling
  });

  it('should support keyboard accessibility', () => {
    render(<FlashCard {...defaultProps} />);
    fireEvent.keyDown(document, { key: 'Space' });
    expect(screen.getByText('Back side')).toBeInTheDocument();
  });
});
```

### Integration Tests
- User flows: Complete flashcard session from start to results
- Store integration: Verify Zustand state updates correctly
- Router integration: Test navigation between learning modes

### E2E Tests (Future Enhancement)
```typescript
// __tests__/e2e/quality-gates.test.ts
describe('Quality Gates E2E', () => {
  it('should maintain quality metrics in production', async () => {
    // Run Lighthouse audit
    const result = await runLighthouseAudit();
    expect(result.performance).toBeGreaterThan(90);
    expect(result.accessibility).toBeGreaterThan(90);
  });
});
```

## Code Quality Enforcement

### Pre-commit Hooks Setup
```json
// package.json scripts addition
{
  "scripts": {
    "pre-commit": "lint-staged",
    "quality-check": "npm run type-check && npm run lint && npm run test:coverage"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

### Quality Gates Configuration
```typescript
// .github/workflows/quality.yml (future)
name: Quality Gates
on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run test:coverage
      - run: npm run build
```

## Documentation Updates Required
1. `README.md` - Update with quality standards and testing commands
2. `docs/development.md` - Add code quality guidelines
3. In-code documentation: JSDoc comments for complex utilities and hooks

## Success Criteria
1. **Zero TypeScript Errors**: `npm run type-check` passes with no errors
2. **Lint Compliance**: `npm run lint` shows <10 errors (down from 2255+)
3. **Test Coverage**: >70% overall, >80% for utilities
4. **Build Success**: `npm run build` completes without warnings
5. **Quality Gates**: All quality checks can run in CI environment

## Dependencies
- Add `@vitest/coverage-v8` for test coverage reporting
- Add `lint-staged` and `husky` for pre-commit hooks (future enhancement)
- Update `@testing-library/jest-dom` matchers for Vitest

## Risks & Mitigations
1. **Risk**: Large number of linting errors may require significant refactoring
   **Mitigation**: Address core errors first, use ESLint --fix for auto-fixable issues
2. **Risk**: TypeScript strict mode may break existing functionality
   **Mitigation**: Incremental typing with thorough testing after each change
3. **Risk**: Test coverage goals may be too ambitious initially
   **Mitigation**: Start with critical path coverage, expand iteratively

## Accessibility Requirements
- Test coverage must include accessibility testing with @testing-library/jest-dom
- Linting rules should enforce ARIA patterns and semantic HTML
- Quality gates should include accessibility score validation

## Quality Metrics Dashboard

### Current State (Baseline)
- TypeScript Errors: 10+ (any types in 6 files)
- ESLint Errors: 2255+ errors across multiple files
- Test Coverage: Unknown (coverage tool not configured)
- Build Warnings: Multiple TypeScript and linting warnings

### Target State (Post-Implementation)
- TypeScript Errors: 0
- ESLint Errors: <10 (non-critical warnings only)
- Test Coverage: >70% overall, >80% utilities
- Build Warnings: 0

### Key Performance Indicators
- **Type Safety Score**: (Files without `any` types / Total TypeScript files) × 100
- **Lint Compliance**: (Files without lint errors / Total files) × 100
- **Test Coverage**: Measured by Vitest coverage reporter
- **Build Health**: Zero errors in production build

## Release & Deployment Guide

### Quality Validation Checklist
- [ ] TypeScript compilation passes (`npm run type-check`)
- [ ] ESLint passes with <10 errors (`npm run lint`)
- [ ] Test coverage meets thresholds (`npm run test:coverage`)
- [ ] Build completes successfully (`npm run build`)
- [ ] No console errors in development mode
- [ ] All critical components have test coverage

### Quality Gates Integration
1. Set up package.json scripts for quality checks
2. Configure Vitest coverage thresholds
3. Document quality standards in project README
4. Create quality validation workflow for CI (future)

### Rollback Strategy
- Quality configurations are non-breaking additions
- ESLint fixes can be reverted individually via git
- TypeScript changes include comprehensive tests
- Coverage thresholds can be temporarily lowered if needed

## Code Quality Patterns

### TypeScript Best Practices
```typescript
// ✅ Good: Proper interface definition
interface CardProps {
  card: Card;
  onAnswer: (correct: boolean, cardIndex: number) => void;
  isFlipped: boolean;
}

// ❌ Bad: Using any type
interface CardProps {
  card: any;
  onAnswer: any;
  isFlipped: boolean;
}
```

### Testing Patterns
```typescript
// ✅ Good: Comprehensive component test
describe('Component behavior', () => {
  it('should handle user interaction correctly', () => {
    const mockHandler = vi.fn();
    render(<Component onAction={mockHandler} />);

    fireEvent.click(screen.getByRole('button'));

    expect(mockHandler).toHaveBeenCalledWith(expectedValue);
  });
});

// ❌ Bad: Testing implementation details
expect(wrapper.find('.internal-class')).toHaveLength(1);
```

### Linting Configuration Strategy
```typescript
// Strict rules for type safety
'@typescript-eslint/no-explicit-any': 'error',
'@typescript-eslint/no-unused-vars': 'error',

// Flexible rules for development experience
'no-console': 'warn', // Allow console for debugging
'react-refresh/only-export-components': 'warn', // HMR optimization
```