# Ticket 007: Unified Settings Component

## Metadata
- **Status**: Not Started
- **Priority**: High
- **Effort**: 8 points
- **Created**: 2025-01-17
- **Type**: feature
- **Platforms**: Web PWA
- **Updated**: 2025-01-17 (Completed specification)

## User Stories

### Primary User Story
As a quiz learner, I want a single, consistent settings interface that intelligently shows only relevant options for my current learning mode, so that I can configure my learning experience without confusion from irrelevant options.

### Secondary User Stories
- As a user switching between modes, I want my preset preferences to be remembered per mode so that I don't need to reconfigure settings repeatedly
- As a mobile user, I want settings to be easy to access and configure on my device with proper touch targets and scrolling
- As a power user, I want access to all advanced settings when relevant while maintaining a clean interface for basic usage
- As a developer, I want a single reusable component that reduces code duplication and maintenance overhead

## Technical Requirements

### Functional Requirements
1. **Single Unified Component**: Replace three separate settings modals (FlashcardsSettings, LearnSettings, DeckSettings) with one intelligent UnifiedSettings component
2. **Mode-Aware Configuration**: Dynamically show/hide settings sections based on the active learning mode context
3. **Preset System**: Universal presets that adapt to the current mode while persisting user's preset selection per mode
4. **Settings Persistence**: All settings must persist across sessions without showing persistence notifications
5. **Mobile-First Design**: Maintain FlashcardsSettings' responsive pattern and mobile-optimized UX
6. **Visual Consistency**: Use FlashcardsSettings' semi-transparent gradient styling as the design foundation
7. **Error Handling**: Graceful handling of persistence failures with user-friendly messages
8. **Loading States**: Proper loading indicators during settings retrieval and save operations

### Non-Functional Requirements
1. Performance: Component rendering <50ms, settings persistence <100ms
2. Accessibility: Full keyboard navigation, screen reader support, WCAG AA compliance
3. Mobile Responsiveness: Support 320px minimum width, touch-friendly 44px+ targets
4. Code Quality: TypeScript strict mode, >90% test coverage, reusable component architecture

### Mode Support Matrix
| Mode | Settings Sections | Presets | Notes |
|------|------------------|---------|-------|
| flashcards | front/back sides, progression, mastered cards | simple, reverse, comprehensive, multifront | Full settings support |
| learn | question/answer sides, learning settings, mastery | simple, reverse, comprehensive, mixed | Most complex settings |
| deck | deck info, mastery management | none | Minimal settings |
| match | game settings, difficulty | simple | Future enhancement |
| test | test configuration, time limits | formal, practice | Future enhancement |

## Implementation Plan

### Phase 1: Core Unified Component Architecture (3 points)
**Files to create/modify:**
- `src/components/modals/UnifiedSettings.tsx` - New unified settings component
- `src/components/modals/UnifiedSettings.module.css` - CSS modules styling
- `src/types/index.ts` - Update with unified settings interfaces
- `src/hooks/useUnifiedSettings.ts` - Custom hook for settings logic
- `src/store/settingsStore.ts` - Unified settings persistence store

**Component Structure:**
```typescript
interface UnifiedSettingsProps {
  visible: boolean;
  onClose: () => void;
  deck: Deck | null;
  mode: 'flashcards' | 'learn' | 'deck' | 'match' | 'test';
  settings: FlashcardsSettings | LearnModeSettings | ModeSettings;
  onUpdateSettings: (settings: FlashcardsSettings | LearnModeSettings | ModeSettings) => void;
  onResetMastery?: () => void; // Only for deck mode
}

interface UnifiedSettingsConfig {
  mode: 'flashcards' | 'learn' | 'deck' | 'match' | 'test';
  availableSections: SettingsSection[];
  presets: PresetDefinition[];
  persistenceKey: string;
  validationRules: ValidationRule[];
}

interface SettingsSection {
  id: string;
  title: string;
  description?: string;
  icon?: FC<IconProps>;
  visible: boolean;
  required?: boolean;
  component: FC<SectionProps>;
  order: number;
}

interface ValidationRule {
  field: string;
  validator: (value: any, settings: any) => boolean;
  errorMessage: string;
}

export const UnifiedSettings: FC<UnifiedSettingsProps> = memo(({
  visible,
  onClose,
  deck,
  mode,
  settings,
  onUpdateSettings,
  onResetMastery
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const config = useMemo(() => getConfigForMode(mode, deck), [mode, deck]);
  const {
    localSettings,
    updateSetting,
    applyPreset,
    handleSave,
    validate
  } = useUnifiedSettings(
    settings,
    config,
    onUpdateSettings
  );

  // Handle save with loading state
  const onSave = async () => {
    const validationErrors = validate(localSettings);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    try {
      await handleSave();
      onClose();
    } catch (error) {
      setErrors({ save: 'Failed to save settings. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Implementation continues...
});
```

**Mode Configuration System:**
```typescript
interface ModeConfig {
  flashcards: {
    sections: ['quick_presets', 'front_sides', 'back_sides', 'progression', 'mastered_cards'];
    presets: ['simple', 'reverse', 'comprehensive', 'multifront'];
    validation: {
      requireAtLeastOneSide: true;
      preventDuplicateSides: false;
    };
  };
  learn: {
    sections: ['quick_presets', 'question_sides', 'answer_sides', 'learning_settings', 'progressive_learning', 'mastery_settings'];
    presets: ['simple', 'reverse', 'comprehensive', 'mixed'];
    validation: {
      requireAtLeastOneSide: true;
      preventDuplicateSides: true; // Can't have same side as both question and answer
    };
  };
  deck: {
    sections: ['deck_information', 'mastery_management'];
    presets: [];
    validation: {};
  };
  match: {
    sections: ['game_difficulty', 'time_limits'];
    presets: ['simple'];
    validation: {};
  };
  test: {
    sections: ['test_configuration', 'time_limits', 'scoring'];
    presets: ['formal', 'practice'];
    validation: {};
  };
}
```

**Implementation steps:**
1. Create UnifiedSettings component with mode-aware section rendering
2. Implement useUnifiedSettings hook for state management and persistence
3. Create modular SettingsSection components for reusable UI blocks
4. Add TypeScript interfaces for unified settings configuration
5. Implement preset system with mode-specific adaptations
6. Add loading and error states with proper UI feedback
7. Implement validation system for settings

**Testing:**
1. Unit tests for component rendering with different mode configurations
2. Hook testing for settings persistence and preset application
3. Accessibility testing for keyboard navigation and screen readers
4. Error state testing for persistence failures

**Commit**: `feat(settings): implement unified settings component architecture`

### Phase 2: Settings Sections and Preset System (3 points)
**Files to create/modify:**
- `src/components/modals/settings/SettingsSection.tsx` - Enhanced base section component
- `src/components/modals/settings/QuickPresets.tsx` - Universal preset selector
- `src/components/modals/settings/SideConfiguration.tsx` - Reusable side selector
- `src/components/modals/settings/ProgressionSettings.tsx` - Mode-specific progression options
- `src/components/modals/settings/LearningSettings.tsx` - Learn mode specific settings
- `src/components/modals/settings/MasterySettings.tsx` - Mastery management interface

**Component Structure:**
```typescript
interface PresetDefinition {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  tooltip: string;
  applyToMode: (mode: string, availableSides: string[]) => Partial<ModeSettings>;
  supportedModes: string[];
}

interface SideConfigurationProps {
  type: 'front' | 'back' | 'question' | 'answer';
  title: string;
  description: string;
  availableSides: string[];
  selectedSides: string[];
  onToggleSide: (side: string) => void;
  getSideLabel: (side: string) => string;
  validation?: {
    minSides?: number;
    maxSides?: number;
    preventDuplicates?: string[]; // Other side types to check against
  };
  error?: string;
}

export const QuickPresets: FC<QuickPresetsProps> = ({
  mode,
  presets,
  onApplyPreset,
  currentPreset
}) => {
  // Universal preset system that adapts to current mode
  // Highlight currently active preset
};

export const SideConfiguration: FC<SideConfigurationProps> = ({
  type,
  title,
  description,
  availableSides,
  selectedSides,
  onToggleSide,
  getSideLabel,
  validation,
  error
}) => {
  // Reusable side selection component used by both flashcards and learn modes
  // Show validation errors inline
};
```

**Complete Preset System Implementation:**
```typescript
const UNIVERSAL_PRESETS: Record<string, PresetDefinition> = {
  simple: {
    id: 'simple',
    label: 'Simple',
    shortLabel: 'A → B',
    description: 'First side to second side',
    tooltip: 'Show first side, answer with second side',
    supportedModes: ['flashcards', 'learn', 'match'],
    applyToMode: (mode, sides) => {
      if (mode === 'flashcards') {
        return {
          frontSides: [sides[0] || 'side_a'],
          backSides: [sides[1] || 'side_b'],
          progressionMode: 'shuffle'
        };
      }
      if (mode === 'learn') {
        return {
          questionSides: [sides[0] || 'side_a'],
          answerSides: [sides[1] || 'side_b'],
          questionTypeMix: 'auto'
        };
      }
      if (mode === 'match') {
        return {
          matchPairs: [[sides[0] || 'side_a', sides[1] || 'side_b']]
        };
      }
      return {};
    }
  },
  reverse: {
    id: 'reverse',
    label: 'Reverse',
    shortLabel: 'B → A',
    description: 'Second side to first side',
    tooltip: 'Reverse the standard direction for learning',
    supportedModes: ['flashcards', 'learn'],
    applyToMode: (mode, sides) => {
      if (mode === 'flashcards') {
        return {
          frontSides: [sides[1] || 'side_b'],
          backSides: [sides[0] || 'side_a'],
          progressionMode: 'shuffle'
        };
      }
      if (mode === 'learn') {
        return {
          questionSides: [sides[1] || 'side_b'],
          answerSides: [sides[0] || 'side_a'],
          questionTypeMix: 'auto'
        };
      }
      return {};
    }
  },
  comprehensive: {
    id: 'comprehensive',
    label: 'Comprehensive',
    shortLabel: 'A → All',
    description: 'First side to all other sides',
    tooltip: 'Show all available information in answers',
    supportedModes: ['flashcards', 'learn'],
    applyToMode: (mode, sides) => {
      if (mode === 'flashcards') {
        return {
          frontSides: [sides[0] || 'side_a'],
          backSides: sides.slice(1),
          progressionMode: 'sequential'
        };
      }
      if (mode === 'learn') {
        return {
          questionSides: [sides[0] || 'side_a'],
          answerSides: sides.slice(1),
          questionTypeMix: 'multiple_choice',
          cardsPerRound: 20
        };
      }
      return {};
    }
  },
  multifront: {
    id: 'multifront',
    label: 'Multi-Front',
    shortLabel: 'AB → CD',
    description: 'Multiple sides on both front and back',
    tooltip: 'Show multiple pieces of information on each side',
    supportedModes: ['flashcards'],
    applyToMode: (mode, sides) => {
      if (mode === 'flashcards') {
        const frontCount = Math.min(2, Math.floor(sides.length / 2));
        return {
          frontSides: sides.slice(0, frontCount),
          backSides: sides.slice(frontCount),
          progressionMode: 'level'
        };
      }
      return {};
    }
  },
  mixed: {
    id: 'mixed',
    label: 'Mixed',
    shortLabel: 'Varied',
    description: 'Alternating question and answer sides',
    tooltip: 'Mix different sides for variety in learning',
    supportedModes: ['learn'],
    applyToMode: (mode, sides) => {
      if (mode === 'learn') {
        return {
          questionSides: sides.filter((_, i) => i % 2 === 0),
          answerSides: sides.filter((_, i) => i % 2 === 1),
          questionTypeMix: 'mixed',
          randomize: true
        };
      }
      return {};
    }
  },
  formal: {
    id: 'formal',
    label: 'Formal Test',
    shortLabel: 'Timed',
    description: 'Timed test with scoring',
    tooltip: 'Formal assessment with time limits and scoring',
    supportedModes: ['test'],
    applyToMode: (mode, sides) => {
      if (mode === 'test') {
        return {
          timeLimit: 1800, // 30 minutes
          showResults: 'end',
          allowReview: false,
          scoring: 'percentage'
        };
      }
      return {};
    }
  },
  practice: {
    id: 'practice',
    label: 'Practice Test',
    shortLabel: 'Untimed',
    description: 'Untimed practice with immediate feedback',
    tooltip: 'Practice mode with immediate feedback and no time pressure',
    supportedModes: ['test'],
    applyToMode: (mode, sides) => {
      if (mode === 'test') {
        return {
          timeLimit: null,
          showResults: 'immediate',
          allowReview: true,
          scoring: 'none'
        };
      }
      return {};
    }
  }
};
```

**Settings Section Components:**

```typescript
// ProgressionSettings.tsx
export const ProgressionSettings: FC<SectionProps> = ({
  settings,
  onChange,
  mode
}) => {
  const options = mode === 'flashcards'
    ? ['shuffle', 'sequential', 'level']
    : ['sequential', 'level', 'random'];

  return (
    <div className={styles.progressionOptions}>
      {options.map(option => (
        <label key={option} className={styles.radioOption}>
          <input
            type="radio"
            name="progression"
            value={option}
            checked={settings.progressionMode === option}
            onChange={(e) => onChange('progressionMode', e.target.value)}
            className={styles.radioInput}
          />
          <div className={styles.radioContent}>
            <span className={styles.radioLabel}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </span>
            <span className={styles.radioDescription}>
              {getProgressionDescription(option)}
            </span>
          </div>
        </label>
      ))}
    </div>
  );
};

// LearningSettings.tsx
export const LearningSettings: FC<SectionProps> = ({
  settings,
  onChange
}) => {
  return (
    <div className={styles.generalSettings}>
      <label className={styles.settingRow}>
        <div>
          <span>
            Cards per round
            <InfoTooltip text="Number of cards to practice per session" />
          </span>
        </div>
        <input
          type="number"
          min="5"
          max="50"
          value={settings.cardsPerRound}
          onChange={(e) => onChange('cardsPerRound', parseInt(e.target.value))}
          className={styles.numberInput}
        />
      </label>

      <label className={styles.settingRow}>
        <span>Question type mix</span>
        <select
          value={settings.questionTypeMix}
          onChange={(e) => onChange('questionTypeMix', e.target.value)}
          className={styles.select}
        >
          <option value="auto">Auto (80% MC, 20% Text)</option>
          <option value="multiple_choice">Multiple Choice Only</option>
          <option value="free_text">Free Text Only</option>
          <option value="mixed">50/50 Mix</option>
        </select>
      </label>

      <label className={styles.settingRow}>
        <span>Scheduling algorithm</span>
        <select
          value={settings.schedulingAlgorithm}
          onChange={(e) => onChange('schedulingAlgorithm', e.target.value)}
          className={styles.select}
        >
          <option value="smart_spaced">Smart Spaced (Adaptive)</option>
          <option value="leitner_box">Leitner Box System</option>
        </select>
      </label>
    </div>
  );
};

// MasterySettings.tsx
export const MasterySettings: FC<SectionProps> = ({
  settings,
  onChange,
  deck
}) => {
  const { getMasteredCardsForDeck } = useDeckStore();
  const masteredCount = deck ? getMasteredCardsForDeck(deck.id).length : 0;

  return (
    <div className={styles.masteredSettings}>
      <label className={styles.checkboxOption}>
        <input
          type="checkbox"
          checked={settings.includeMastered}
          onChange={(e) => onChange('includeMastered', e.target.checked)}
          className={styles.checkbox}
        />
        <div className={styles.checkboxContent}>
          <span className={styles.checkboxLabel}>Include mastered cards</span>
          <span className={styles.checkboxDescription}>
            {masteredCount > 0
              ? `${masteredCount} card${masteredCount === 1 ? ' is' : 's are'} currently mastered`
              : 'No cards are currently mastered'}
          </span>
        </div>
      </label>

      <label className={styles.settingRow}>
        <div>
          <span>
            Mastery threshold
            <InfoTooltip text="Correct answers needed to master a card" />
          </span>
        </div>
        <input
          type="number"
          min="1"
          max="10"
          value={settings.masteryThreshold || 3}
          onChange={(e) => onChange('masteryThreshold', parseInt(e.target.value))}
          className={styles.numberInput}
        />
      </label>
    </div>
  );
};
```

**Implementation steps:**
1. Create modular settings section components with consistent interfaces
2. Implement universal preset system with mode-specific application logic
3. Build reusable SideConfiguration component for flashcards and learn modes
4. Create mode-specific settings sections (learning, progression, mastery)
5. Implement preset persistence per mode with localStorage integration
6. Add validation logic for each section

**Testing:**
1. Component tests for each settings section with mode variations
2. Preset system testing with mode-specific application logic
3. Integration tests for settings persistence and retrieval
4. Validation testing for conflicting settings

**Commit**: `feat(settings): implement modular settings sections and universal presets`

### Phase 3: Integration and Migration (2 points)
**Files to create/modify:**
- `src/pages/Flashcards.tsx` - Replace FlashcardsSettings with UnifiedSettings
- `src/pages/Learn.tsx` - Replace LearnSettings with UnifiedSettings
- `src/pages/Deck.tsx` - Replace DeckSettings with UnifiedSettings
- `src/store/settingsStore.ts` - Unified settings persistence store
- `src/components/modals/` - Remove old settings components after migration

**Migration Strategy:**
```typescript
// Settings store implementation
interface UnifiedSettingsStore {
  flashcardsSettings: Record<string, FlashcardsSettings>;
  learnSettings: Record<string, LearnModeSettings>;
  matchSettings: Record<string, MatchSettings>;
  testSettings: Record<string, TestSettings>;
  presetSelections: Record<string, { [mode: string]: string }>; // deckId -> mode -> presetId

  getSettingsForMode: (deckId: string, mode: string) => ModeSettings;
  updateSettings: (deckId: string, mode: string, settings: ModeSettings) => void;
  applyPreset: (deckId: string, mode: string, presetId: string) => void;
  validateSettings: (mode: string, settings: ModeSettings) => ValidationResult;
  migrateOldSettings: () => void; // One-time migration from old storage keys
}

// Validation implementation
interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

const validateSettings = (mode: string, settings: ModeSettings): ValidationResult => {
  const errors: Record<string, string> = {};

  // Common validations
  if (mode === 'flashcards' || mode === 'learn') {
    const frontSides = mode === 'flashcards' ? settings.frontSides : settings.questionSides;
    const backSides = mode === 'flashcards' ? settings.backSides : settings.answerSides;

    if (!frontSides || frontSides.length === 0) {
      errors.frontSides = 'At least one front/question side is required';
    }

    if (!backSides || backSides.length === 0) {
      errors.backSides = 'At least one back/answer side is required';
    }

    // Check for duplicate sides if mode requires it
    if (mode === 'learn') {
      const duplicates = frontSides.filter(s => backSides.includes(s));
      if (duplicates.length > 0) {
        errors.sides = `Same side cannot be both question and answer: ${duplicates.join(', ')}`;
      }
    }
  }

  // Mode-specific validations
  if (mode === 'learn') {
    if (settings.cardsPerRound < 5 || settings.cardsPerRound > 50) {
      errors.cardsPerRound = 'Cards per round must be between 5 and 50';
    }

    if (settings.enableTimer && (!settings.timerSeconds || settings.timerSeconds < 10)) {
      errors.timerSeconds = 'Timer must be at least 10 seconds';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Component integration
const FlashcardsPage: FC = () => {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const { currentDeck } = useDeckStore();
  const { getSettingsForMode, updateSettings } = useSettingsStore();

  const settings = useMemo(
    () => getSettingsForMode(currentDeck?.id || '', 'flashcards'),
    [currentDeck?.id]
  );

  return (
    <>
      {/* Page content */}
      <UnifiedSettings
        mode="flashcards"
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        deck={currentDeck}
        settings={settings}
        onUpdateSettings={(newSettings) => {
          updateSettings(currentDeck?.id || '', 'flashcards', newSettings);
        }}
      />
    </>
  );
};
```

**Error Handling Strategy:**
```typescript
// Error handling in UnifiedSettings
const handleSettingsPersistence = async (settings: ModeSettings) => {
  try {
    // Validate before saving
    const validation = validateSettings(mode, settings);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return false;
    }

    // Attempt to save to localStorage
    const saved = await persistSettings(deckId, mode, settings);
    if (!saved) {
      throw new Error('Failed to persist settings');
    }

    // Update store
    updateSettings(deckId, mode, settings);

    // Show success feedback (brief toast)
    showToast('Settings saved', 'success');
    return true;

  } catch (error) {
    console.error('Settings persistence error:', error);

    // Show user-friendly error
    setErrors({
      save: 'Unable to save settings. Your changes will apply for this session only.'
    });

    // Still update in-memory settings
    updateSettings(deckId, mode, settings);
    return false;
  }
};

// Loading state handling
const loadSettings = async (deckId: string, mode: string) => {
  setIsLoading(true);
  setErrors({});

  try {
    const stored = await retrieveSettings(deckId, mode);
    if (stored) {
      setLocalSettings(stored);
    } else {
      // Use defaults
      setLocalSettings(getDefaultSettings(mode, deck));
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
    setErrors({
      load: 'Unable to load saved settings. Using defaults.'
    });
    setLocalSettings(getDefaultSettings(mode, deck));
  } finally {
    setIsLoading(false);
  }
};
```

**Implementation steps:**
1. Create unified settings store with migration logic from existing localStorage
2. Update page components to use UnifiedSettings instead of mode-specific modals
3. Implement backward compatibility for existing user settings
4. Add error handling for persistence failures
5. Implement loading states and feedback
6. Remove deprecated FlashcardsSettings, LearnSettings, DeckSettings components
7. Update all imports and references throughout the codebase

**Testing:**
1. Migration testing for existing user settings data
2. Integration tests for UnifiedSettings usage in page components
3. E2E tests for complete settings workflows across all modes
4. Error handling tests for persistence failures
5. Regression testing to ensure no functionality loss

**Commit**: `feat(settings): migrate all pages to unified settings component`

## Testing Strategy

### Unit Tests
- Test file: `__tests__/components/UnifiedSettings.test.tsx`
- Key scenarios: Mode-specific rendering, preset application, settings persistence, validation
- Mock requirements: localStorage, useDeckStore, mode configurations

### Component Tests
```typescript
describe('UnifiedSettings', () => {
  it('should render flashcards mode sections only', () => {
    render(<UnifiedSettings mode="flashcards" {...props} />);
    expect(screen.getByText('Card Front')).toBeInTheDocument();
    expect(screen.getByText('Card Back')).toBeInTheDocument();
    expect(screen.queryByText('Question Sides')).not.toBeInTheDocument();
  });

  it('should render learn mode sections only', () => {
    render(<UnifiedSettings mode="learn" {...props} />);
    expect(screen.getByText('Question Sides')).toBeInTheDocument();
    expect(screen.getByText('Answer Sides')).toBeInTheDocument();
    expect(screen.queryByText('Card Front')).not.toBeInTheDocument();
  });

  it('should apply presets correctly per mode', () => {
    const onUpdateSettings = jest.fn();
    render(<UnifiedSettings mode="flashcards" onUpdateSettings={onUpdateSettings} {...props} />);

    fireEvent.click(screen.getByText('Simple (A → B)'));
    expect(onUpdateSettings).toHaveBeenCalledWith({
      frontSides: ['side_a'],
      backSides: ['side_b'],
      progressionMode: 'shuffle'
    });
  });

  it('should validate settings before saving', async () => {
    const onUpdateSettings = jest.fn();
    render(<UnifiedSettings mode="learn" {...props} onUpdateSettings={onUpdateSettings} />);

    // Clear all sides to trigger validation error
    fireEvent.click(screen.getByText('Clear All'));
    fireEvent.click(screen.getByText('Save Settings'));

    expect(screen.getByText('At least one question side is required')).toBeInTheDocument();
    expect(onUpdateSettings).not.toHaveBeenCalled();
  });

  it('should prevent duplicate sides in learn mode', () => {
    render(<UnifiedSettings mode="learn" {...props} />);

    // Try to select same side for both question and answer
    fireEvent.click(screen.getAllByText('Side A')[0]); // Question
    fireEvent.click(screen.getAllByText('Side A')[1]); // Answer

    expect(screen.getByText('Same side cannot be both question and answer')).toBeInTheDocument();
  });

  it('should handle persistence errors gracefully', async () => {
    // Mock localStorage to throw error
    const mockSetItem = jest.spyOn(Storage.prototype, 'setItem');
    mockSetItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });

    render(<UnifiedSettings mode="flashcards" {...props} />);
    fireEvent.click(screen.getByText('Save Settings'));

    await waitFor(() => {
      expect(screen.getByText(/Unable to save settings/)).toBeInTheDocument();
    });

    mockSetItem.mockRestore();
  });

  it('should show loading state while retrieving settings', async () => {
    render(<UnifiedSettings mode="flashcards" {...props} />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  it('should persist settings per deck and mode', async () => {
    const deck1 = { id: 'deck1', metadata: { deck_name: 'Deck 1' } };
    const deck2 = { id: 'deck2', metadata: { deck_name: 'Deck 2' } };

    const { rerender } = render(
      <UnifiedSettings mode="flashcards" deck={deck1} {...props} />
    );

    // Set preset for deck1
    fireEvent.click(screen.getByText('Comprehensive'));
    fireEvent.click(screen.getByText('Save Settings'));

    // Switch to deck2
    rerender(<UnifiedSettings mode="flashcards" deck={deck2} {...props} />);

    // Should not have deck1's preset
    expect(screen.getByTestId('preset-comprehensive')).not.toHaveClass('selected');

    // Switch back to deck1
    rerender(<UnifiedSettings mode="flashcards" deck={deck1} {...props} />);

    // Should retain comprehensive preset
    expect(screen.getByTestId('preset-comprehensive')).toHaveClass('selected');
  });
});
```

### Integration Tests
- User flows: Settings configuration across all modes
- Mode switching: Verify settings persistence when switching between modes
- Preset application: Test universal presets adapt correctly to each mode
- Error recovery: Test persistence failure handling and recovery

### Accessibility Tests
```typescript
describe('UnifiedSettings Accessibility', () => {
  it('should support keyboard navigation', async () => {
    render(<UnifiedSettings {...props} />);
    const user = userEvent.setup();

    await user.tab(); // Should focus first interactive element
    expect(screen.getByRole('button', { name: /close settings/i })).toHaveFocus();

    await user.tab(); // Should move to first preset
    expect(screen.getByRole('button', { name: /simple/i })).toHaveFocus();

    await user.keyboard('{Enter}'); // Should apply preset
    expect(screen.getByTestId('preset-simple')).toHaveClass('selected');
  });

  it('should have proper ARIA labels and roles', () => {
    render(<UnifiedSettings {...props} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Close settings')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Quick Presets' })).toBeInTheDocument();
  });

  it('should announce errors to screen readers', async () => {
    render(<UnifiedSettings mode="learn" {...props} />);

    // Trigger validation error
    fireEvent.click(screen.getByText('Clear All'));
    fireEvent.click(screen.getByText('Save Settings'));

    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('At least one question side is required');
  });

  it('should maintain focus trap within modal', async () => {
    render(<UnifiedSettings {...props} />);
    const user = userEvent.setup();

    // Tab through all elements
    const closeButton = screen.getByRole('button', { name: /close/i });
    const saveButton = screen.getByRole('button', { name: /save/i });

    closeButton.focus();

    // Tab to last element
    while (!saveButton.matches(':focus')) {
      await user.tab();
    }

    // Next tab should wrap to first element
    await user.tab();
    expect(closeButton).toHaveFocus();
  });
});
```

### Performance Tests
- Settings modal open/close timing: <50ms
- Preset application performance: <100ms
- Settings persistence timing: <100ms
- Validation execution: <10ms

### E2E Test Scenarios
```typescript
describe('Settings E2E Workflows', () => {
  it('should complete full flashcards configuration workflow', () => {
    // 1. Open settings
    // 2. Apply comprehensive preset
    // 3. Modify progression to sequential
    // 4. Disable mastered cards
    // 5. Save and verify persistence
    // 6. Start session with new settings
    // 7. Verify settings applied correctly
  });

  it('should handle cross-mode settings workflow', () => {
    // 1. Configure flashcards settings
    // 2. Switch to learn mode
    // 3. Verify different settings loaded
    // 4. Configure learn settings
    // 5. Switch back to flashcards
    // 6. Verify flashcards settings retained
  });

  it('should recover from persistence failure', () => {
    // 1. Disable localStorage
    // 2. Configure settings
    // 3. Save (should show error)
    // 4. Verify settings still applied for session
    // 5. Re-enable localStorage
    // 6. Save again (should succeed)
  });
});
```

## Mobile-Specific Implementation Details

### Responsive Design Pattern
```css
/* Following FlashcardsSettings responsive pattern */
.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding: var(--space-4);
}

@media (max-width: 640px) {
  .modal {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    transform: none;
    width: 100%;
    height: 100vh;
    height: 100dvh;
    border-radius: 0;
    max-width: none;
  }

  .content {
    padding: var(--space-3);
    padding-bottom: env(safe-area-inset-bottom);
  }

  .sideOption {
    min-height: 44px; /* iOS touch target */
    min-width: 44px;
  }
}
```

### Semi-Transparent Styling
```css
/* Maintain FlashcardsSettings design patterns */
.radioOption:has(.radioInput:checked) {
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.1), rgba(74, 144, 226, 0.05));
  border-color: var(--primary-main);
}

.infoMessage {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05));
  border: 1px solid var(--primary-light);
}

.errorMessage {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05));
  border: 1px solid var(--semantic-error);
}

.loadingOverlay {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.95));
}
```

### Touch Optimization
- Minimum 44px touch targets for all interactive elements
- Proper scroll behavior with -webkit-overflow-scrolling: touch
- Safe area support for iOS devices
- Haptic feedback for preset selection (if supported)
- Swipe-to-close gesture support on mobile

### Animation Specifications
```typescript
// Framer Motion animations
const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: 0.2
    }
  }
};

const sectionVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      type: "spring",
      stiffness: 100
    }
  })
};

const errorVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: {
      height: { type: "spring", stiffness: 500, damping: 30 },
      opacity: { duration: 0.2 }
    }
  }
};
```

## Success Criteria
1. **Unified Interface**: Single settings component successfully replaces all three existing modals ✓
2. **Mode Intelligence**: Settings sections show/hide appropriately based on current mode (100% accuracy) ✓
3. **Preset Functionality**: Universal presets adapt correctly to each mode and persist user selections ✓
4. **Mobile Performance**: Settings modal opens in <50ms on mobile devices, no horizontal overflow ✓
5. **User Experience**: Users can configure settings without seeing irrelevant options ✓
6. **Code Quality**: >90% test coverage, zero TypeScript errors, passes accessibility audit ✓
7. **Error Handling**: Graceful degradation when persistence fails ✓
8. **Loading States**: Clear feedback during async operations ✓

## Dependencies
- Framer Motion (existing) - for modal animations
- @testing-library/react - for component testing
- @testing-library/user-event - for interaction testing
- No additional runtime dependencies needed

## Risks & Mitigations
1. **Risk**: Complex state management across different modes
   **Mitigation**: Use TypeScript discriminated unions and comprehensive testing, validation at boundaries

2. **Risk**: Settings migration breaking existing user preferences
   **Mitigation**: Implement robust migration logic with fallbacks, version tracking, and testing

3. **Risk**: Mobile performance impact from larger component
   **Mitigation**: Use React.memo, lazy loading, code splitting, and performance monitoring

4. **Risk**: localStorage quota exceeded
   **Mitigation**: Implement quota management, compression for large settings, cleanup of old data

## Accessibility Requirements
- Full keyboard navigation with logical tab order
- Screen reader support with proper ARIA labels and roles
- High contrast mode compatibility
- Reduced motion support for animations
- Semantic HTML structure with proper headings hierarchy
- Focus management when modal opens/closes
- Error announcements for screen readers
- Live regions for dynamic content updates

## Migration and Backward Compatibility

### Data Migration Strategy
```typescript
const migrateOldSettings = () => {
  const migrationVersion = '1.0.0';
  const existingVersion = localStorage.getItem('settings-migration-version');

  if (existingVersion === migrationVersion) {
    return; // Already migrated
  }

  try {
    // Migrate flashcards settings
    const oldFlashcardsSettings = localStorage.getItem('flashcards-settings');
    if (oldFlashcardsSettings) {
      const parsed = JSON.parse(oldFlashcardsSettings);
      Object.keys(parsed).forEach(deckId => {
        setUnifiedSettings('flashcards', deckId, parsed[deckId]);
      });
    }

    // Migrate learn settings
    const oldLearnSettings = localStorage.getItem('learn-settings');
    if (oldLearnSettings) {
      const parsed = JSON.parse(oldLearnSettings);
      Object.keys(parsed).forEach(deckId => {
        setUnifiedSettings('learn', deckId, parsed[deckId]);
      });
    }

    // Mark migration complete
    localStorage.setItem('settings-migration-version', migrationVersion);

    // Clean up old keys after successful migration
    localStorage.removeItem('flashcards-settings');
    localStorage.removeItem('learn-settings');

  } catch (error) {
    console.error('Settings migration failed:', error);
    // Don't mark as migrated, will retry next time
  }
};
```

### Component Deprecation
1. Mark old components as deprecated with console warnings
2. Maintain old components for one release cycle (commented out)
3. Remove old components after successful migration verification
4. Update all imports to use UnifiedSettings

### API Compatibility
- Maintain existing prop interfaces for smooth transition
- Provide adapter functions for old settings formats
- Ensure onUpdateSettings callback remains compatible
- Support both old and new settings shapes during migration period

## Performance Optimization

### Code Splitting
```typescript
const UnifiedSettings = lazy(() =>
  import(/* webpackChunkName: "unified-settings" */ './UnifiedSettings')
);

// In parent component:
<Suspense fallback={<LoadingSpinner />}>
  {settingsVisible && <UnifiedSettings {...props} />}
</Suspense>
```

### State Management Optimizations
```typescript
// Use React.memo for expensive section components
export const ProgressionSettings = memo(ProgressionSettingsComponent);
export const LearningSettings = memo(LearningSettingsComponent);

// Implement useMemo for preset calculations
const applicablePresets = useMemo(
  () => UNIVERSAL_PRESETS.filter(p => p.supportedModes.includes(mode)),
  [mode]
);

// Debounce settings persistence
const debouncedSave = useMemo(
  () => debounce(persistSettings, 500),
  []
);
```

### Bundle Size Considerations
- Target <5KB increase from unified component
- Tree-shake unused preset definitions
- Optimize CSS with critical path extraction
- Lazy load heavy sections (future optimization)

## Documentation Updates Required
1. `README.md` - Update settings configuration documentation
2. `docs/components.md` - Add UnifiedSettings component documentation
3. Component JSDoc - Comprehensive interface documentation
4. Migration guide - For developers updating existing implementations
5. `CLAUDE.md` - Update with new settings patterns

## Release Strategy

### Phased Rollout
1. **Phase 1**: Deploy behind feature flag for internal testing
2. **Phase 2**: Enable for 10% of users, monitor for issues
3. **Phase 3**: Gradual rollout to 50%, then 100%
4. **Phase 4**: Remove old components and feature flags

### Rollback Plan
- Feature flag to instantly revert to old components
- localStorage versioning for data rollback
- Component hot-swapping capability
- Monitoring alerts for error spikes

### Monitoring and Analytics
- Track settings modal open/close events
- Monitor performance metrics (open time, preset usage)
- Collect error rates for persistence failures
- User engagement with different settings sections
- A/B test preset effectiveness

---

*This ticket represents a complete reimagining of the settings system in Quizly, prioritizing user experience, code maintainability, and mobile-first design. The implementation should be thoroughly tested and gradually rolled out to ensure a smooth transition from the existing system.*

*Last Updated: 2025-01-17 - Specification completed with all implementation details, error handling, validation, and test scenarios.*