# Ticket 004: Comprehensive Test Coverage Implementation

## Metadata
- **Status**: Not Started
- **Priority**: High
- **Effort**: 15 points
- **Created**: 2025-09-17
- **Type**: feature
- **Platforms**: Web (Desktop/Tablet/Mobile)

## User Stories

### Primary User Story
As a developer, I want comprehensive test coverage across all components, stores, and utilities so that bugs are caught early, regressions are prevented, and code quality is maintained at production standards.

### Secondary User Stories
- As a maintainer, I want automated test validation so that pull requests are verified before merging
- As a developer, I want confidence in refactoring so that changes don't break existing functionality
- As a QA engineer, I want reliable test suite execution so that release quality is consistently high
- As a product owner, I want reduced production bugs so that user experience remains stable

## Technical Requirements

### Functional Requirements
1. **Unit Test Coverage**: Achieve >85% test coverage for all React components, Zustand stores, and utility functions
2. **Component Testing**: Implement React Testing Library tests for all UI components with user interaction scenarios
3. **Integration Testing**: Create tests for complete user flows including navigation and state management
4. **Performance Testing**: Add tests to verify component render times and prevent performance regressions
5. **Accessibility Testing**: Automated tests for WCAG AA compliance across all components

### Non-Functional Requirements
1. Performance: Test suite execution <30 seconds for full run, <5 seconds for watch mode
2. Reliability: Tests must be deterministic with 0% flaky test rate
3. Maintainability: Tests should be readable and follow consistent patterns
4. Coverage: 85% code coverage target with critical paths at 100%

## Implementation Plan

### Phase 1: Core Component Testing Infrastructure (3 points)
**Files to create/modify:**
- `__tests__/setup.ts` - Configure testing environment with MSW, testing utilities
- `__tests__/utils/testUtils.tsx` - Custom render functions with providers
- `__tests__/utils/mockData.ts` - Comprehensive mock data factory functions
- `__tests__/utils/mockStores.ts` - Zustand store mocking utilities
- `vitest.config.ts` - Update configuration for coverage and performance

**Testing Infrastructure Setup:**
```typescript
// __tests__/setup.ts
import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

// Mock framer-motion to prevent animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
    span: 'span',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));
```

**Custom Testing Utilities:**
```typescript
// __tests__/utils/testUtils.tsx
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    initialEntries = ['/'],
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    }),
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </MemoryRouter>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

export * from '@testing-library/react';
export { renderWithProviders as render };
```

**Mock Data Factory:**
```typescript
// __tests__/utils/mockData.ts
import { Deck, Card, DeckMetadata, LearnModeSettings } from '@/types';

export const createMockCard = (overrides?: Partial<Card>): Card => ({
  idx: 1,
  name: 'Test Card',
  side_a: 'Front Side',
  side_b: 'Back Side',
  level: 1,
  ...overrides,
});

export const createMockDeck = (overrides?: Partial<Deck>): Deck => ({
  id: 'test-deck-1',
  metadata: createMockDeckMetadata(),
  content: [createMockCard(), createMockCard({ idx: 2, name: 'Card 2' })],
  ...overrides,
});

export const createMockDeckMetadata = (overrides?: Partial<DeckMetadata>): DeckMetadata => ({
  deck_name: 'Test Deck',
  description: 'A test deck for unit testing',
  category: 'Test',
  available_levels: [1, 2, 3],
  available_sides: 2,
  card_count: 10,
  difficulty: 'beginner',
  tags: ['test', 'demo'],
  version: '1.0.0',
  created_date: '2023-01-01',
  last_updated: '2023-01-01',
  ...overrides,
});

export const createMockLearnSettings = (overrides?: Partial<LearnModeSettings>): LearnModeSettings => ({
  frontSides: ['side_a'],
  backSides: ['side_b'],
  cardsPerRound: 10,
  enableTimer: false,
  enableAudio: false,
  randomize: false,
  progressionMode: 'sequential',
  questionTypes: ['multiple_choice'],
  adaptiveDifficulty: false,
  masteryThreshold: 3,
  questionSides: ['side_a'],
  answerSides: ['side_b'],
  ...overrides,
});
```

**Implementation steps:**
1. Set up Vitest configuration with coverage reporting and MSW integration
2. Create custom render utilities with React Router and Zustand providers
3. Implement comprehensive mock data factory functions
4. Configure test environment with proper cleanup and setup
5. Add VS Code test runner configuration for development workflow

**Testing:**
1. Verify test infrastructure works with simple smoke tests
2. Validate mock data factories generate valid objects
3. Test custom render utilities work with routing and state
4. Confirm coverage reporting and threshold enforcement

**Commit**: `test: implement comprehensive testing infrastructure with utilities and mocks`

### Phase 2: Component Library Test Suite (3 points)
**Files to create/modify:**
- `__tests__/components/ui/Button.test.tsx` - Complete Button component test suite
- `__tests__/components/ui/Modal.test.tsx` - Modal component with portal and accessibility testing
- `__tests__/components/ui/Card.test.tsx` - Card component with variant testing
- `__tests__/components/ui/Input.test.tsx` - Input component with validation testing
- `__tests__/components/ui/ProgressBar.test.tsx` - Progress component with animation testing
- `__tests__/components/ui/Spinner.test.tsx` - Loading spinner component testing

**Button Component Tests:**
```typescript
// __tests__/components/ui/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/utils/testUtils';
import { Button } from '@/components/ui/Button';

describe('Button Component', () => {
  it('should render with default props', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('button', 'primary', 'medium');
  });

  it('should render all variant styles correctly', () => {
    const variants = ['primary', 'secondary', 'tertiary', 'danger'] as const;

    variants.forEach(variant => {
      const { unmount } = render(<Button variant={variant}>Test</Button>);
      expect(screen.getByRole('button')).toHaveClass(variant);
      unmount();
    });
  });

  it('should render all size variations correctly', () => {
    const sizes = ['small', 'medium', 'large'] as const;

    sizes.forEach(size => {
      const { unmount } = render(<Button size={size}>Test</Button>);
      expect(screen.getByRole('button')).toHaveClass(size);
      unmount();
    });
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled button</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled');
  });

  it('should show loading state correctly', () => {
    render(<Button loading>Loading button</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('should render with icon correctly', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>;
    render(<Button icon={<TestIcon />}>With Icon</Button>);

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByText('With Icon')).toBeInTheDocument();
  });

  it('should support custom className', () => {
    render(<Button className="custom-class">Custom</Button>);

    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('should be accessible with proper ARIA attributes', () => {
    render(
      <Button aria-label="Custom label" aria-describedby="description">
        Button text
      </Button>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Custom label');
    expect(button).toHaveAttribute('aria-describedby', 'description');
  });
});
```

**Modal Component Tests:**
```typescript
// __tests__/components/ui/Modal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils/testUtils';
import { Modal } from '@/components/ui/Modal';

describe('Modal Component', () => {
  it('should not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()}>
        Modal content
      </Modal>
    );

    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        Modal content
      </Modal>
    );

    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('should render title when provided', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        Modal content
      </Modal>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Test Modal');
  });

  it('should call onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        Modal content
      </Modal>
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when overlay is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} closeOnOverlayClick={true}>
        Modal content
      </Modal>
    );

    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should not close when overlay click is disabled', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} closeOnOverlayClick={false}>
        Modal content
      </Modal>
    );

    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('should handle keyboard navigation (Escape key)', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        Modal content
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should focus trap correctly', async () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Focus Test">
        <button>First Button</button>
        <button>Second Button</button>
      </Modal>
    );

    // Should focus first interactive element
    await waitFor(() => {
      expect(screen.getByText('First Button')).toHaveFocus();
    });

    // Tab should cycle through modal elements only
    fireEvent.keyDown(document.activeElement, { key: 'Tab' });
    expect(screen.getByText('Second Button')).toHaveFocus();
  });

  it('should render different sizes correctly', () => {
    const sizes = ['small', 'medium', 'large', 'fullscreen'] as const;

    sizes.forEach(size => {
      const { unmount } = render(
        <Modal isOpen={true} onClose={vi.fn()} size={size}>
          Content for {size}
        </Modal>
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass(size);
      unmount();
    });
  });
});
```

**Implementation steps:**
1. Create comprehensive test suites for all UI components
2. Include accessibility testing with specific ARIA attribute validation
3. Test all component variants, sizes, and interactive states
4. Implement keyboard navigation and focus management testing
5. Add performance tests for component render times

**Testing:**
1. Run test suite and verify 100% coverage for UI components
2. Validate accessibility tests catch common issues
3. Performance tests verify render times <16ms
4. Integration tests with other components work correctly

**Commit**: `test: add comprehensive test suite for UI component library`

### Phase 3: Store and Service Testing (3 points)
**Files to create/modify:**
- `__tests__/store/deckStore.test.ts` - Zustand deck store testing with state transitions
- `__tests__/services/questionGenerator.test.ts` - Question generation service testing
- `__tests__/services/deckLoader.test.ts` - Deck loading service with error handling
- `__tests__/utils/textMatcher.test.ts` - Text matching utility testing
- `__tests__/utils/cardShuffler.test.ts` - Card shuffling utility testing

**Deck Store Tests:**
```typescript
// __tests__/store/deckStore.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDeckStore } from '@/store/deckStore';
import { createMockDeck, createMockLearnSettings } from '@/test/utils/mockData';

// Helper to get fresh store instance
const getStoreInstance = () => {
  const store = useDeckStore.getState();
  // Reset store to initial state
  store.reset();
  return store;
};

describe('DeckStore', () => {
  let store: ReturnType<typeof useDeckStore.getState>;

  beforeEach(() => {
    store = getStoreInstance();
    vi.clearAllMocks();
  });

  describe('Deck Loading', () => {
    it('should load deck successfully', async () => {
      const mockDeck = createMockDeck();
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDeck),
      } as Response);

      await store.loadDeck(mockDeck.id);

      expect(store.currentDeck).toEqual(mockDeck);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
    });

    it('should handle deck loading error', async () => {
      const deckId = 'invalid-deck';
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Deck not found'));

      await store.loadDeck(deckId);

      expect(store.currentDeck).toBeNull();
      expect(store.isLoading).toBe(false);
      expect(store.error).toBe('Failed to load deck: Deck not found');
    });

    it('should set loading state during deck fetch', async () => {
      const mockDeck = createMockDeck();
      let resolvePromise: (value: any) => void;
      const fetchPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      vi.mocked(fetch).mockReturnValueOnce(fetchPromise as any);

      const loadPromise = store.loadDeck(mockDeck.id);

      // Check loading state is true during fetch
      expect(store.isLoading).toBe(true);

      // Resolve the fetch
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve(mockDeck),
      });

      await loadPromise;

      // Check loading state is false after fetch
      expect(store.isLoading).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should start learn session correctly', () => {
      const mockDeck = createMockDeck();
      const mockSettings = createMockLearnSettings();
      store.currentDeck = mockDeck;

      store.startSession('learn', mockSettings);

      expect(store.session).toMatchObject({
        deckId: mockDeck.id,
        mode: 'learn',
        currentCardIndex: 0,
        correctCount: 0,
        incorrectCount: 0,
        settings: mockSettings,
      });
      expect(store.session?.startTime).toBeLessThanOrEqual(Date.now());
    });

    it('should update progress correctly', () => {
      const mockDeck = createMockDeck();
      const mockSettings = createMockLearnSettings();
      store.currentDeck = mockDeck;
      store.startSession('learn', mockSettings);

      store.updateProgress(true, 0);

      expect(store.session?.correctCount).toBe(1);
      expect(store.session?.currentCardIndex).toBe(1);
    });

    it('should handle incorrect answers', () => {
      const mockDeck = createMockDeck();
      const mockSettings = createMockLearnSettings();
      store.currentDeck = mockDeck;
      store.startSession('learn', mockSettings);

      store.updateProgress(false, 0);

      expect(store.session?.incorrectCount).toBe(1);
      expect(store.session?.missedCards).toContain(0);
    });

    it('should end session and clear state', () => {
      const mockDeck = createMockDeck();
      const mockSettings = createMockLearnSettings();
      store.currentDeck = mockDeck;
      store.startSession('learn', mockSettings);

      store.endSession();

      expect(store.session).toBeNull();
    });
  });

  describe('Persistence', () => {
    it('should persist current deck ID', () => {
      const mockDeck = createMockDeck();
      store.currentDeck = mockDeck;

      // Simulate store rehydration
      const persistedState = store.getPersistedState();
      expect(persistedState.currentDeckId).toBe(mockDeck.id);
    });

    it('should not persist full deck content', () => {
      const mockDeck = createMockDeck();
      store.currentDeck = mockDeck;

      const persistedState = store.getPersistedState();
      expect(persistedState.currentDeck).toBeUndefined();
    });
  });
});
```

**Question Generator Tests:**
```typescript
// __tests__/services/questionGenerator.test.ts
import { describe, it, expect } from 'vitest';
import { QuestionGenerator } from '@/services/questionGenerator';
import { createMockDeck, createMockLearnSettings } from '@/test/utils/mockData';

describe('QuestionGenerator', () => {
  let generator: QuestionGenerator;

  beforeEach(() => {
    generator = new QuestionGenerator();
  });

  describe('Multiple Choice Questions', () => {
    it('should generate multiple choice question with correct answer', () => {
      const deck = createMockDeck({
        content: [
          { idx: 0, name: 'Card 1', side_a: 'Question 1', side_b: 'Answer 1', level: 1 },
          { idx: 1, name: 'Card 2', side_a: 'Question 2', side_b: 'Answer 2', level: 1 },
          { idx: 2, name: 'Card 3', side_a: 'Question 3', side_b: 'Answer 3', level: 1 },
        ],
      });
      const settings = createMockLearnSettings({
        questionTypes: ['multiple_choice'],
        frontSides: ['side_a'],
        backSides: ['side_b'],
      });

      const result = generator.generateQuestion({
        cards: deck.content,
        settings,
        difficultyRange: [1, 1],
      });

      expect(result.question.type).toBe('multiple_choice');
      expect(result.question.options).toHaveLength(4);
      expect(result.question.options).toContain(result.question.correctAnswer);
      expect(result.question.questionText).toMatch(/Question \d/);
    });

    it('should generate distractors from other cards', () => {
      const deck = createMockDeck({
        content: [
          { idx: 0, name: 'Card 1', side_a: 'Capital of France', side_b: 'Paris', level: 1 },
          { idx: 1, name: 'Card 2', side_a: 'Capital of Germany', side_b: 'Berlin', level: 1 },
          { idx: 2, name: 'Card 3', side_a: 'Capital of Italy', side_b: 'Rome', level: 1 },
          { idx: 3, name: 'Card 4', side_a: 'Capital of Spain', side_b: 'Madrid', level: 1 },
        ],
      });

      const result = generator.generateQuestion({
        cards: deck.content,
        settings: createMockLearnSettings(),
        difficultyRange: [1, 1],
      });

      const options = result.question.options!;
      expect(options).toHaveLength(4);

      // All options should be different
      const uniqueOptions = new Set(options);
      expect(uniqueOptions.size).toBe(4);

      // Should include capitals from the deck
      const capitals = ['Paris', 'Berlin', 'Rome', 'Madrid'];
      options.forEach(option => {
        expect(capitals).toContain(option);
      });
    });
  });

  describe('Free Text Questions', () => {
    it('should generate free text question', () => {
      const deck = createMockDeck();
      const settings = createMockLearnSettings({
        questionTypes: ['free_text'],
      });

      const result = generator.generateQuestion({
        cards: deck.content,
        settings,
        difficultyRange: [1, 1],
      });

      expect(result.question.type).toBe('free_text');
      expect(result.question.options).toBeUndefined();
      expect(result.question.acceptedAnswers).toBeDefined();
      expect(result.question.acceptedAnswers).toContain(result.question.correctAnswer);
    });

    it('should generate accepted answer variations', () => {
      const deck = createMockDeck({
        content: [
          { idx: 0, name: 'Card 1', side_a: 'What is H2O?', side_b: 'Water', level: 1 },
        ],
      });

      const result = generator.generateQuestion({
        cards: deck.content,
        settings: createMockLearnSettings({ questionTypes: ['free_text'] }),
        difficultyRange: [1, 1],
      });

      const acceptedAnswers = result.question.acceptedAnswers!;
      expect(acceptedAnswers).toContain('Water');
      expect(acceptedAnswers).toContain('water'); // lowercase variant
      expect(acceptedAnswers.length).toBeGreaterThan(1);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid settings', () => {
      const deck = createMockDeck();
      const invalidSettings = createMockLearnSettings({
        frontSides: [], // Invalid: empty front sides
      });

      expect(() => {
        generator.generateQuestion({
          cards: deck.content,
          settings: invalidSettings,
          difficultyRange: [1, 1],
        });
      }).toThrow('Front sides must be specified');
    });

    it('should handle insufficient cards for multiple choice', () => {
      const deck = createMockDeck({
        content: [
          { idx: 0, name: 'Card 1', side_a: 'Question', side_b: 'Answer', level: 1 },
        ], // Only 1 card, need 4 for multiple choice
      });

      const result = generator.generateQuestion({
        cards: deck.content,
        settings: createMockLearnSettings({ questionTypes: ['multiple_choice'] }),
        difficultyRange: [1, 1],
      });

      // Should fallback to free text or generate synthetic distractors
      expect(result.question).toBeDefined();
    });
  });
});
```

**Implementation steps:**
1. Create comprehensive Zustand store tests with state transitions
2. Test all service layer functions with error handling scenarios
3. Add utility function tests with edge cases and performance validation
4. Implement integration tests between stores and services
5. Add mock service worker (MSW) for API testing

**Testing:**
1. Store tests verify state management integrity
2. Service tests validate business logic correctness
3. Error handling tests ensure graceful failure modes
4. Integration tests confirm service/store interactions

**Commit**: `test: add comprehensive store and service test coverage`

### Phase 4: Integration and E2E Testing (3 points)
**Files to create/modify:**
- `__tests__/integration/LearnFlow.test.tsx` - Complete learn mode user flow testing
- `__tests__/integration/Navigation.test.tsx` - React Router navigation testing
- `__tests__/integration/DataPersistence.test.tsx` - Store persistence testing
- `e2e/learn-session.spec.ts` - Playwright E2E test for learn session
- `e2e/deck-management.spec.ts` - Playwright E2E test for deck management
- `e2e/utils/testHelpers.ts` - E2E test helper functions

**Learn Flow Integration Test:**
```typescript
// __tests__/integration/LearnFlow.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils/testUtils';
import { Learn } from '@/pages/Learn';
import { createMockDeck, createMockLearnSettings } from '@/test/utils/mockData';

// Mock the router params
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ deckId: 'test-deck-1' }),
    useNavigate: () => vi.fn(),
  };
});

describe('Learn Flow Integration', () => {
  it('should complete full learn session successfully', async () => {
    const mockDeck = createMockDeck({
      content: [
        { idx: 0, name: 'Card 1', side_a: 'Question 1', side_b: 'Answer 1', level: 1 },
        { idx: 1, name: 'Card 2', side_a: 'Question 2', side_b: 'Answer 2', level: 1 },
      ],
    });

    // Mock the deck loading
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDeck),
    } as Response);

    render(<Learn />);

    // Wait for deck to load
    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });

    // Answer first question correctly
    const option1 = screen.getByText('Answer 1');
    fireEvent.click(option1);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    // Wait for next question
    await waitFor(() => {
      expect(screen.getByText('Question 2')).toBeInTheDocument();
    });

    // Answer second question correctly
    const option2 = screen.getByText('Answer 2');
    fireEvent.click(option2);
    fireEvent.click(submitButton);

    // Should show completion screen
    await waitFor(() => {
      expect(screen.getByText(/session complete/i)).toBeInTheDocument();
    });

    // Verify final score
    expect(screen.getByText(/2 correct/i)).toBeInTheDocument();
    expect(screen.getByText(/100% accuracy/i)).toBeInTheDocument();
  });

  it('should handle incorrect answers and retry flow', async () => {
    const mockDeck = createMockDeck({
      content: [
        { idx: 0, name: 'Card 1', side_a: 'Question 1', side_b: 'Answer 1', level: 1 },
      ],
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDeck),
    } as Response);

    render(<Learn />);

    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });

    // Select wrong answer
    const wrongOption = screen.getByText('Wrong Answer');
    fireEvent.click(wrongOption);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    // Should show incorrect feedback
    await waitFor(() => {
      expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
    });

    // Continue button should advance to next question or retry
    const continueButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueButton);

    // Should show the card again for retry or next question
    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });
  });

  it('should update session metrics correctly', async () => {
    const mockDeck = createMockDeck({
      content: Array.from({ length: 5 }, (_, i) => ({
        idx: i,
        name: `Card ${i + 1}`,
        side_a: `Question ${i + 1}`,
        side_b: `Answer ${i + 1}`,
        level: 1,
      })),
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockDeck),
    } as Response);

    render(<Learn />);

    await waitFor(() => {
      expect(screen.getByTestId('session-metrics')).toBeInTheDocument();
    });

    // Initial metrics
    expect(screen.getByText('0 / 5')).toBeInTheDocument(); // Progress
    expect(screen.getByText('0% accuracy')).toBeInTheDocument();

    // Answer first question correctly
    fireEvent.click(screen.getByText('Answer 1'));
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    // Metrics should update
    await waitFor(() => {
      expect(screen.getByText('1 / 5')).toBeInTheDocument();
      expect(screen.getByText('100% accuracy')).toBeInTheDocument();
    });
  });
});
```

**E2E Test with Playwright:**
```typescript
// e2e/learn-session.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Learn Session E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete full learn session flow', async ({ page }) => {
    // Select a deck
    await page.click('[data-testid="deck-card-1"]');

    // Start learn mode
    await page.click('[data-testid="learn-mode-button"]');

    // Verify learn session starts
    await expect(page.locator('[data-testid="question-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-metrics"]')).toBeVisible();

    // Answer questions
    for (let i = 0; i < 3; i++) {
      // Select an answer
      await page.click('[data-testid="answer-option-0"]');

      // Submit answer
      await page.click('[data-testid="submit-button"]');

      // Wait for feedback
      await expect(page.locator('[data-testid="answer-feedback"]')).toBeVisible();

      // Continue to next question (unless last question)
      if (i < 2) {
        await page.click('[data-testid="continue-button"]');
      }
    }

    // Verify session completion
    await expect(page.locator('[data-testid="session-results"]')).toBeVisible();
    await expect(page.locator('text=Session Complete')).toBeVisible();

    // Check results
    const accuracy = await page.locator('[data-testid="final-accuracy"]').textContent();
    expect(accuracy).toMatch(/\d+%/);
  });

  test('should handle mobile interactions correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to deck
    await page.click('[data-testid="deck-card-1"]');
    await page.click('[data-testid="learn-mode-button"]');

    // Test touch interactions
    await page.tap('[data-testid="answer-option-0"]');
    await page.tap('[data-testid="submit-button"]');

    // Verify mobile layout
    await expect(page.locator('.mobile-container')).toBeVisible();

    // Test swipe gestures (if implemented)
    const questionCard = page.locator('[data-testid="question-card"]');
    await questionCard.hover();
    await page.mouse.down();
    await page.mouse.move(100, 0); // Swipe right
    await page.mouse.up();
  });

  test('should persist session state on page refresh', async ({ page }) => {
    // Start session
    await page.click('[data-testid="deck-card-1"]');
    await page.click('[data-testid="learn-mode-button"]');

    // Answer one question
    await page.click('[data-testid="answer-option-0"]');
    await page.click('[data-testid="submit-button"]');
    await page.click('[data-testid="continue-button"]');

    // Refresh page
    await page.reload();

    // Verify session continues
    await expect(page.locator('[data-testid="question-card"]')).toBeVisible();

    // Check that progress is maintained
    const progress = await page.locator('[data-testid="question-counter"]').textContent();
    expect(progress).toContain('2'); // Should be on question 2
  });
});
```

**Implementation steps:**
1. Create integration tests for complete user flows
2. Set up Playwright for cross-browser E2E testing
3. Add mobile-specific testing scenarios
4. Implement accessibility testing with axe-playwright
5. Create performance testing with Lighthouse integration

**Testing:**
1. Integration tests verify complete feature workflows
2. E2E tests validate real user interactions across browsers
3. Performance tests ensure speed requirements are met
4. Accessibility tests verify WCAG compliance in real usage

**Commit**: `test: add integration and E2E test coverage for critical user flows`

### Phase 5: Performance and Accessibility Testing (3 points)
**Files to create/modify:**
- `__tests__/performance/ComponentPerformance.test.tsx` - Component render performance testing
- `__tests__/performance/BundleSize.test.ts` - Bundle size monitoring tests
- `__tests__/accessibility/A11y.test.tsx` - Accessibility compliance testing
- `lighthouse.config.js` - Lighthouse performance testing configuration
- `.github/workflows/test.yml` - CI/CD pipeline with test automation

**Performance Testing:**
```typescript
// __tests__/performance/ComponentPerformance.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { LearnContainer } from '@/components/modes/learn/LearnContainer';
import { createMockDeck, createMockLearnSettings } from '@/test/utils/mockData';

describe('Component Performance Tests', () => {
  it('should render LearnContainer within performance budget', async () => {
    const mockDeck = createMockDeck({
      content: Array.from({ length: 100 }, (_, i) => ({
        idx: i,
        name: `Card ${i}`,
        side_a: `Question ${i}`,
        side_b: `Answer ${i}`,
        level: 1,
      })),
    });

    const startTime = performance.now();

    await act(async () => {
      render(
        <LearnContainer
          deck={mockDeck}
          settings={createMockLearnSettings()}
          onComplete={vi.fn()}
          onExit={vi.fn()}
        />
      );
    });

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within 16ms (60 FPS budget)
    expect(renderTime).toBeLessThan(16);
  });

  it('should prevent unnecessary re-renders with React.memo', () => {
    let renderCount = 0;
    const TestComponent = React.memo(() => {
      renderCount++;
      return <div>Test Component</div>;
    });

    const { rerender } = render(<TestComponent prop1="value1" />);

    // Same props - should not re-render
    rerender(<TestComponent prop1="value1" />);
    expect(renderCount).toBe(1);

    // Different props - should re-render
    rerender(<TestComponent prop1="value2" />);
    expect(renderCount).toBe(2);
  });

  it('should handle large datasets efficiently', async () => {
    const largeDeck = createMockDeck({
      content: Array.from({ length: 1000 }, (_, i) => ({
        idx: i,
        name: `Card ${i}`,
        side_a: `Question ${i}`,
        side_b: `Answer ${i}`,
        level: Math.floor(i / 100) + 1,
      })),
    });

    const startTime = performance.now();

    await act(async () => {
      render(
        <LearnContainer
          deck={largeDeck}
          settings={createMockLearnSettings({ cardsPerRound: 50 })}
          onComplete={vi.fn()}
          onExit={vi.fn()}
        />
      );
    });

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should handle large datasets efficiently
    expect(renderTime).toBeLessThan(50); // More generous for large data
  });
});
```

**Accessibility Testing:**
```typescript
// __tests__/accessibility/A11y.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { LearnContainer } from '@/components/modes/learn/LearnContainer';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { createMockDeck, createMockLearnSettings } from '@/test/utils/mockData';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  it('should have no accessibility violations in LearnContainer', async () => {
    const { container } = render(
      <LearnContainer
        deck={createMockDeck()}
        settings={createMockLearnSettings()}
        onComplete={vi.fn()}
        onExit={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA labels for interactive elements', () => {
    const { getByRole } = render(
      <Button aria-label="Submit answer">Submit</Button>
    );

    const button = getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Submit answer');
  });

  it('should have proper focus management in modals', async () => {
    const { getByRole } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <button>First Button</button>
        <button>Second Button</button>
      </Modal>
    );

    const modal = getByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('role', 'dialog');
  });

  it('should support keyboard navigation', () => {
    const handleClick = vi.fn();
    const { getByRole } = render(
      <Button onClick={handleClick}>Test Button</Button>
    );

    const button = getByRole('button');

    // Should be focusable
    button.focus();
    expect(button).toHaveFocus();

    // Should respond to Enter key
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalled();

    // Should respond to Space key
    fireEvent.keyDown(button, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('should have proper color contrast ratios', async () => {
    const { container } = render(
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}>
        Text content with proper contrast
      </div>
    );

    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });

  it('should support screen readers with proper semantic markup', () => {
    const { getByRole, getByLabelText } = render(
      <form>
        <label htmlFor="email">Email Address</label>
        <input id="email" type="email" required />
        <button type="submit">Submit Form</button>
      </form>
    );

    expect(getByLabelText('Email Address')).toBeInTheDocument();
    expect(getByRole('textbox')).toHaveAttribute('required');
    expect(getByRole('button')).toHaveAttribute('type', 'submit');
  });
});
```

**CI/CD Pipeline Enhancement:**
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type checking
        run: npm run type-check

      - name: Linting
        run: npm run lint

      - name: Unit tests with coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

      - name: Build application
        run: npm run build

      - name: E2E tests
        run: npm run test:e2e

      - name: Lighthouse performance audit
        run: |
          npm run preview &
          sleep 5
          npm run lighthouse -- --chrome-flags="--headless" --output=json --output-path=./lighthouse-results.json

      - name: Performance budget check
        run: |
          node scripts/check-performance-budget.js

      - name: Bundle size check
        run: |
          npm run build:analyze
          node scripts/check-bundle-size.js

  accessibility:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Accessibility tests
        run: npm run test:a11y

      - name: Visual regression tests
        run: npm run test:visual
```

**Implementation steps:**
1. Create comprehensive performance testing suite with budget enforcement
2. Implement accessibility testing with axe-core integration
3. Set up Lighthouse CI for performance monitoring
4. Add visual regression testing with Playwright screenshots
5. Configure CI/CD pipeline with all testing phases

**Testing:**
1. Performance tests verify render times and memory usage
2. Accessibility tests ensure WCAG AA compliance
3. Visual tests catch unintended UI changes
4. CI pipeline provides comprehensive quality gates

**Commit**: `test: add performance and accessibility testing with CI/CD integration`

## Testing Strategy

### Unit Tests
- Test files: `__tests__/**/*.test.{ts,tsx}`
- Coverage target: >85% overall, >95% for critical components
- Key scenarios:
  - Component rendering with all prop combinations
  - Store state transitions and persistence
  - Service layer error handling and edge cases
  - Utility function behavior with invalid inputs

### Component Tests
```typescript
describe('Component Test Pattern', () => {
  it('should render correctly with default props', () => {
    render(<Component />);
    expect(screen.getByRole('...')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const handleAction = vi.fn();
    render(<Component onAction={handleAction} />);

    await user.click(screen.getByRole('button'));
    expect(handleAction).toHaveBeenCalledWith(expectedArgs);
  });

  it('should be accessible', async () => {
    const { container } = render(<Component />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Integration Tests
- Complete user flows: Learn session from start to completion
- Navigation testing: Router integration with state management
- Data persistence: Store rehydration and session continuity
- Error boundaries: Graceful failure handling

### Performance Tests
- Component render times must be <16ms (60 FPS requirement)
- Bundle size monitoring with budget enforcement
- Memory leak detection during long sessions
- Network request optimization and caching validation

### E2E Tests (Playwright)
- Cross-browser testing: Chrome, Firefox, Safari, Edge
- Mobile responsive testing: iOS Safari, Chrome Mobile
- Real user scenarios: Complete learning workflows
- Offline functionality: PWA behavior validation

## Platform-Specific Considerations

### Web Desktop
- Keyboard navigation testing for all interactive elements
- Focus management in modal dialogs and complex UIs
- Copy/paste functionality in text inputs
- Right-click context menu handling

### Web Mobile
- Touch gesture testing (tap, swipe, pinch)
- Viewport adaptation testing (portrait/landscape)
- Safe area handling on devices with notches
- Performance on slower mobile devices

### PWA Features
- Offline functionality testing with service worker
- Install prompt and app manifest validation
- Background sync testing for delayed submissions
- Push notification handling (if implemented)

## Documentation Updates Required
1. `README.md` - Add testing guide and coverage reports
2. `docs/testing.md` - Comprehensive testing documentation
3. `docs/performance.md` - Performance testing and optimization guide
4. In-code documentation: JSDoc comments for test utilities

## Success Criteria
1. **Test Coverage**: >85% overall coverage with critical paths at 100%
2. **Performance Budget**: All components render <16ms, bundle size <200KB
3. **Accessibility Compliance**: Zero WCAG AA violations across all components
4. **CI/CD Integration**: All tests automated in pipeline with quality gates
5. **Cross-Browser Compatibility**: Tests pass on Chrome, Firefox, Safari, Edge
6. **Mobile Responsiveness**: All tests pass on mobile viewports
7. **E2E Reliability**: <2% flaky test rate, deterministic results

## Dependencies
- **Testing Framework**: Vitest (already configured)
- **Component Testing**: @testing-library/react (already installed)
- **E2E Testing**: @playwright/test (new dependency)
- **Accessibility Testing**: jest-axe (new dependency)
- **Performance Testing**: @lighthouse/ci (new dependency)
- **Visual Testing**: @storybook/test-runner (optional future enhancement)

## Risks & Mitigations
1. **Risk**: Test suite execution time becomes too slow
   **Mitigation**: Implement test parallelization, selective test running, and performance monitoring
2. **Risk**: Flaky E2E tests reduce CI reliability
   **Mitigation**: Implement retry logic, proper wait strategies, and test environment isolation
3. **Risk**: Performance tests may fail on different hardware
   **Mitigation**: Use relative performance comparisons, not absolute time measurements
4. **Risk**: Accessibility tests may conflict with visual design
   **Mitigation**: Work with design team to establish accessible design patterns

## Accessibility Requirements
- All tests must verify WCAG AA compliance
- Screen reader compatibility testing with multiple assistive technologies
- Keyboard navigation testing for all interactive flows
- Color contrast validation in both light and dark themes
- Reduced motion support testing

## Performance Metrics

### Target Performance Budgets
- **First Contentful Paint**: <1.5s
- **Time to Interactive**: <3.5s
- **Largest Contentful Paint**: <2.5s
- **Cumulative Layout Shift**: <0.1
- **Component Render Time**: <16ms (60 FPS)
- **Bundle Size**: <200KB initial JS
- **Test Suite Execution**: <30s full run

### Monitoring and Alerting
- Lighthouse CI integration for performance regression detection
- Bundle size monitoring with alerts for significant increases
- Test execution time tracking with optimization recommendations
- Coverage trend monitoring with alerts for coverage decreases

## Release & Deployment Guide

### Testing Checklist
- [ ] Unit tests: >85% coverage achieved
- [ ] Component tests: All UI components tested
- [ ] Integration tests: Critical user flows verified
- [ ] E2E tests: Cross-browser compatibility confirmed
- [ ] Performance tests: Budget compliance verified
- [ ] Accessibility tests: WCAG AA compliance confirmed
- [ ] Visual regression tests: No unintended UI changes
- [ ] CI/CD pipeline: All quality gates passing

### Rollout Strategy
1. **Phase 1**: Unit and component tests with coverage reporting
2. **Phase 2**: Integration tests and performance monitoring
3. **Phase 3**: E2E tests and accessibility validation
4. **Phase 4**: CI/CD integration and quality gates
5. **Phase 5**: Advanced testing features (visual regression, etc.)

### Rollback Strategy
- Test infrastructure can be disabled via feature flags
- Individual test suites can be temporarily skipped
- CI/CD quality gates can be adjusted for emergency releases
- Performance budgets can be temporarily relaxed if needed

## Future Enhancement Opportunities

### Advanced Testing Features
- Visual regression testing with Percy or Chromatic
- Contract testing for API integrations
- Mutation testing for test quality validation
- Property-based testing for edge case discovery

### Test Automation
- Automatic test generation from user interactions
- AI-powered test case suggestion based on code changes
- Dynamic test prioritization based on risk analysis
- Automated accessibility remediation suggestions

### Performance Optimization
- Real user monitoring (RUM) integration
- Performance budgets per feature/component
- Automated performance optimization suggestions
- Progressive performance enhancement strategies