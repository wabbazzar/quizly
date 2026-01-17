import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../utils/testUtils';
import ReadSettings from '@/components/modals/settings/ReadSettings';
import { Deck, ReadModeSettings } from '@/types';

describe('ReadSettings Component', () => {
  const mockOnChange = vi.fn();

  const createMockDeck = (options?: {
    readingSides?: Record<string, string>;
    sideLabels?: Record<string, string>;
    availableSides?: number;
  }): Deck => ({
    id: 'test-deck',
    metadata: {
      deck_name: 'Test Deck',
      description: 'A test deck',
      category: 'education',
      available_levels: [1, 2, 3],
      available_sides: options?.availableSides || 3,
      side_labels: options?.sideLabels || {
        side_a: 'english',
        side_b: 'pinyin',
        side_c: 'characters',
      },
      card_count: 20,
      difficulty: 'intermediate' as const,
      tags: ['test'],
      version: '1.0.0',
      created_date: '2024-01-01',
      last_updated: '2024-01-01',
    },
    content: [
      {
        idx: 0,
        name: 'Card 1',
        side_a: 'hello',
        side_b: 'nǐ hǎo',
        side_c: '你好',
        level: 1,
      },
    ],
    reading: options?.readingSides
      ? {
          sides: options.readingSides as any,
          dialogues: {},
        }
      : undefined,
  });

  const createDefaultSettings = (): ReadModeSettings => ({
    answerType: 'free_text',
    checkMode: 'wait',
    translationDirection: { from: 'a', to: 'c' },
    optionsCount: 4,
    showPinyinDefault: false,
    multipleChoiceDifficulty: 'medium',
    unit: 'character',
    translationMode: 'sentence',
    accuracyThreshold: 70,
    showWordHints: true,
  });

  const defaultProps = {
    settings: createDefaultSettings(),
    onChange: mockOnChange,
    deck: createMockDeck({
      readingSides: { a: 'characters', b: 'pinyin', c: 'english' },
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render the settings section with title', () => {
      render(<ReadSettings {...defaultProps} />);

      expect(screen.getByText('Read Mode Settings')).toBeInTheDocument();
    });

    it('should render all main setting groups', () => {
      render(<ReadSettings {...defaultProps} />);

      expect(screen.getByText('Answer Type')).toBeInTheDocument();
      expect(screen.getByText('Check Mode')).toBeInTheDocument();
      expect(screen.getByText('Translation Mode')).toBeInTheDocument();
      expect(screen.getByText('Translation Direction')).toBeInTheDocument();
      expect(screen.getByText('Token Unit')).toBeInTheDocument();
    });

    it('should render setting hints', () => {
      render(<ReadSettings {...defaultProps} />);

      expect(screen.getByText('How you want to practice translation')).toBeInTheDocument();
      expect(screen.getByText('When to check your answers')).toBeInTheDocument();
      expect(screen.getByText('How to practice translation')).toBeInTheDocument();
      expect(screen.getByText('What to translate from and to')).toBeInTheDocument();
    });
  });

  describe('Translation Direction Settings', () => {
    it('should render from and to dropdowns', () => {
      render(<ReadSettings {...defaultProps} />);

      expect(screen.getByText('From:')).toBeInTheDocument();
      expect(screen.getByText('To:')).toBeInTheDocument();

      const selects = screen.getAllByRole('combobox');
      expect(selects).toHaveLength(2);
    });

    it('should show correct initial selection for translation direction', () => {
      render(<ReadSettings {...defaultProps} />);

      const selects = screen.getAllByRole('combobox');
      expect(selects[0]).toHaveValue('a'); // from
      expect(selects[1]).toHaveValue('c'); // to
    });

    it('should display side labels from deck.reading.sides', () => {
      render(<ReadSettings {...defaultProps} />);

      const fromSelect = screen.getAllByRole('combobox')[0];
      const options = fromSelect.querySelectorAll('option');

      const optionTexts = Array.from(options).map(opt => opt.textContent);
      expect(optionTexts).toContain('characters');
      expect(optionTexts).toContain('pinyin');
      expect(optionTexts).toContain('english');
    });

    it('should handle from direction change', () => {
      render(<ReadSettings {...defaultProps} />);

      const fromSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(fromSelect, { target: { value: 'b' } });

      expect(mockOnChange).toHaveBeenCalledWith('translationDirection', {
        from: 'b',
        to: 'c',
      });
    });

    it('should handle to direction change', () => {
      render(<ReadSettings {...defaultProps} />);

      const toSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(toSelect, { target: { value: 'b' } });

      expect(mockOnChange).toHaveBeenCalledWith('translationDirection', {
        from: 'a',
        to: 'b',
      });
    });

    it('should disable the current "to" value in the "from" dropdown', () => {
      render(<ReadSettings {...defaultProps} />);

      const fromSelect = screen.getAllByRole('combobox')[0];
      const cOption = fromSelect.querySelector('option[value="c"]') as HTMLOptionElement;

      expect(cOption).toBeDisabled();
    });

    it('should disable the current "from" value in the "to" dropdown', () => {
      render(<ReadSettings {...defaultProps} />);

      const toSelect = screen.getAllByRole('combobox')[1];
      const aOption = toSelect.querySelector('option[value="a"]') as HTMLOptionElement;

      expect(aOption).toBeDisabled();
    });

    it('should allow selecting pinyin as from direction', () => {
      render(<ReadSettings {...defaultProps} />);

      const fromSelect = screen.getAllByRole('combobox')[0];

      // Pinyin (b) should not be disabled
      const bOption = fromSelect.querySelector('option[value="b"]') as HTMLOptionElement;
      expect(bOption).not.toBeDisabled();

      // Select pinyin
      fireEvent.change(fromSelect, { target: { value: 'b' } });

      expect(mockOnChange).toHaveBeenCalledWith('translationDirection', {
        from: 'b',
        to: 'c',
      });
    });
  });

  describe('Fallback to Deck Metadata Side Labels', () => {
    it('should use deck.metadata.side_labels when reading.sides is not available', () => {
      const deckWithoutReadingSides = createMockDeck({
        sideLabels: {
          side_a: 'English',
          side_b: 'Pinyin',
          side_c: 'Characters',
        },
      });

      render(
        <ReadSettings
          {...defaultProps}
          deck={deckWithoutReadingSides}
        />
      );

      const fromSelect = screen.getAllByRole('combobox')[0];
      const options = fromSelect.querySelectorAll('option');

      const optionTexts = Array.from(options).map(opt => opt.textContent);
      expect(optionTexts).toContain('English');
      expect(optionTexts).toContain('Pinyin');
      expect(optionTexts).toContain('Characters');
    });

    it('should use generic fallback when no side labels are available', () => {
      const deckWithNoLabels: Deck = {
        id: 'test-deck',
        metadata: {
          deck_name: 'Test Deck',
          description: 'A test deck',
          category: 'education',
          available_levels: [1],
          available_sides: 2,
          card_count: 1,
          difficulty: 'beginner',
          tags: [],
          version: '1.0.0',
          created_date: '2024-01-01',
          last_updated: '2024-01-01',
        },
        content: [],
      };

      render(
        <ReadSettings
          {...defaultProps}
          deck={deckWithNoLabels}
        />
      );

      const fromSelect = screen.getAllByRole('combobox')[0];
      const options = fromSelect.querySelectorAll('option');

      const optionTexts = Array.from(options).map(opt => opt.textContent);
      expect(optionTexts).toContain('Side A');
      expect(optionTexts).toContain('Side B');
      expect(optionTexts).toContain('Side C');
    });
  });

  describe('Auto-Correction of Invalid Translation Direction', () => {
    it('should auto-correct when "from" side does not exist in deck', async () => {
      // Settings with invalid 'from' side ('d' doesn't exist)
      const settingsWithInvalidFrom = {
        ...createDefaultSettings(),
        translationDirection: { from: 'd' as any, to: 'c' as any },
      };

      render(
        <ReadSettings
          {...defaultProps}
          settings={settingsWithInvalidFrom}
        />
      );

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('translationDirection', expect.objectContaining({
          from: expect.stringMatching(/^[abc]$/),
          to: expect.stringMatching(/^[abc]$/),
        }));
      });
    });

    it('should auto-correct when "to" side does not exist in deck', async () => {
      // Settings with invalid 'to' side ('d' doesn't exist)
      const settingsWithInvalidTo = {
        ...createDefaultSettings(),
        translationDirection: { from: 'a' as any, to: 'd' as any },
      };

      render(
        <ReadSettings
          {...defaultProps}
          settings={settingsWithInvalidTo}
        />
      );

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('translationDirection', expect.objectContaining({
          from: 'a',
          to: expect.stringMatching(/^[bc]$/), // Should pick b or c, not a (same as from)
        }));
      });
    });

    it('should not auto-correct when both sides are valid', async () => {
      render(<ReadSettings {...defaultProps} />);

      // Wait a bit to ensure no auto-correction happens
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not have called onChange for translation direction
      const translationDirectionCalls = mockOnChange.mock.calls.filter(
        call => call[0] === 'translationDirection'
      );
      expect(translationDirectionCalls).toHaveLength(0);
    });
  });

  describe('Answer Type Settings', () => {
    it('should render answer type options', () => {
      render(<ReadSettings {...defaultProps} />);

      expect(screen.getByText('Free Text')).toBeInTheDocument();
      expect(screen.getByText('Multiple Choice')).toBeInTheDocument();
    });

    it('should show correct initial selection', () => {
      render(<ReadSettings {...defaultProps} />);

      const freeTextRadio = screen.getByRole('radio', { name: 'Free Text' });
      expect(freeTextRadio).toBeChecked();
    });

    it('should handle answer type change', () => {
      render(<ReadSettings {...defaultProps} />);

      const mcRadio = screen.getByRole('radio', { name: 'Multiple Choice' });
      fireEvent.click(mcRadio);

      expect(mockOnChange).toHaveBeenCalledWith('answerType', 'multiple_choice');
    });
  });

  describe('Check Mode Settings', () => {
    it('should render check mode options', () => {
      render(<ReadSettings {...defaultProps} />);

      expect(screen.getByText('Live (check as you type)')).toBeInTheDocument();
      expect(screen.getByText('Wait (check on submit)')).toBeInTheDocument();
    });

    it('should show correct initial selection', () => {
      render(<ReadSettings {...defaultProps} />);

      const waitRadio = screen.getByRole('radio', { name: 'Wait (check on submit)' });
      expect(waitRadio).toBeChecked();
    });

    it('should handle check mode change', () => {
      render(<ReadSettings {...defaultProps} />);

      const liveRadio = screen.getByRole('radio', { name: 'Live (check as you type)' });
      fireEvent.click(liveRadio);

      expect(mockOnChange).toHaveBeenCalledWith('checkMode', 'live');
    });
  });

  describe('Translation Mode Settings', () => {
    it('should render translation mode options', () => {
      render(<ReadSettings {...defaultProps} />);

      expect(screen.getByText('Full Sentence (Recommended)')).toBeInTheDocument();
      expect(screen.getByText('Word/Character by Word')).toBeInTheDocument();
    });

    it('should show correct initial selection', () => {
      render(<ReadSettings {...defaultProps} />);

      const sentenceRadio = screen.getByRole('radio', { name: 'Full Sentence (Recommended)' });
      expect(sentenceRadio).toBeChecked();
    });

    it('should handle translation mode change', () => {
      render(<ReadSettings {...defaultProps} />);

      const tokenRadio = screen.getByRole('radio', { name: 'Word/Character by Word' });
      fireEvent.click(tokenRadio);

      expect(mockOnChange).toHaveBeenCalledWith('translationMode', 'token');
    });
  });

  describe('Multiple Choice Settings', () => {
    it('should show MC settings when answer type is multiple_choice', () => {
      const mcSettings = {
        ...createDefaultSettings(),
        answerType: 'multiple_choice' as const,
      };

      render(<ReadSettings {...defaultProps} settings={mcSettings} />);

      expect(screen.getByText('Number of Options')).toBeInTheDocument();
      expect(screen.getByText('Difficulty')).toBeInTheDocument();
    });

    it('should hide MC settings when answer type is free_text', () => {
      render(<ReadSettings {...defaultProps} />);

      expect(screen.queryByText('Number of Options')).not.toBeInTheDocument();
      expect(screen.queryByText('Difficulty')).not.toBeInTheDocument();
    });

    it('should handle options count change', () => {
      const mcSettings = {
        ...createDefaultSettings(),
        answerType: 'multiple_choice' as const,
      };

      render(<ReadSettings {...defaultProps} settings={mcSettings} />);

      const optionsInput = screen.getByDisplayValue('4');
      fireEvent.change(optionsInput, { target: { value: '6' } });

      expect(mockOnChange).toHaveBeenCalledWith('optionsCount', 6);
    });

    it('should handle difficulty change', () => {
      const mcSettings = {
        ...createDefaultSettings(),
        answerType: 'multiple_choice' as const,
      };

      render(<ReadSettings {...defaultProps} settings={mcSettings} />);

      const hardRadio = screen.getByRole('radio', { name: 'Hard (any dialogue)' });
      fireEvent.click(hardRadio);

      expect(mockOnChange).toHaveBeenCalledWith('multipleChoiceDifficulty', 'hard');
    });
  });

  describe('Sentence Mode Settings', () => {
    it('should show sentence mode settings when translation mode is sentence', () => {
      render(<ReadSettings {...defaultProps} />);

      expect(screen.getByText('Accuracy Threshold')).toBeInTheDocument();
      expect(screen.getByText('Show Word Hints on Hover/Tap')).toBeInTheDocument();
    });

    it('should hide sentence settings when translation mode is token', () => {
      const tokenSettings = {
        ...createDefaultSettings(),
        translationMode: 'token' as const,
      };

      render(<ReadSettings {...defaultProps} settings={tokenSettings} />);

      expect(screen.queryByText('Accuracy Threshold')).not.toBeInTheDocument();
      expect(screen.queryByText('Show Word Hints on Hover/Tap')).not.toBeInTheDocument();
    });

    it('should handle accuracy threshold change', () => {
      render(<ReadSettings {...defaultProps} />);

      const thresholdInput = screen.getByDisplayValue('70');
      fireEvent.change(thresholdInput, { target: { value: '80' } });

      expect(mockOnChange).toHaveBeenCalledWith('accuracyThreshold', 80);
    });

    it('should handle word hints toggle', () => {
      render(<ReadSettings {...defaultProps} />);

      const hintsCheckbox = screen.getByRole('checkbox', { name: /Show Word Hints/i });
      fireEvent.click(hintsCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith('showWordHints', false);
    });
  });

  describe('Display Settings', () => {
    it('should render show pinyin default checkbox', () => {
      render(<ReadSettings {...defaultProps} />);

      expect(screen.getByText('Show Pinyin by Default')).toBeInTheDocument();
    });

    it('should handle show pinyin default toggle', () => {
      render(<ReadSettings {...defaultProps} />);

      const pinyinCheckbox = screen.getByRole('checkbox', { name: /Show Pinyin by Default/i });
      fireEvent.click(pinyinCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith('showPinyinDefault', true);
    });
  });

  describe('Token Unit Settings', () => {
    it('should render token unit options', () => {
      render(<ReadSettings {...defaultProps} />);

      expect(screen.getByRole('radio', { name: 'Character' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Word' })).toBeInTheDocument();
    });

    it('should show correct initial selection', () => {
      render(<ReadSettings {...defaultProps} />);

      const characterRadio = screen.getByRole('radio', { name: 'Character' });
      expect(characterRadio).toBeChecked();
    });

    it('should handle token unit change', () => {
      render(<ReadSettings {...defaultProps} />);

      const wordRadio = screen.getByRole('radio', { name: 'Word' });
      fireEvent.click(wordRadio);

      expect(mockOnChange).toHaveBeenCalledWith('unit', 'word');
    });
  });

  describe('Null Deck Handling', () => {
    it('should handle null deck gracefully', () => {
      expect(() => {
        render(<ReadSettings {...defaultProps} deck={null} />);
      }).not.toThrow();
    });

    it('should use fallback sides when deck is null', () => {
      render(<ReadSettings {...defaultProps} deck={null} />);

      const fromSelect = screen.getAllByRole('combobox')[0];
      const options = fromSelect.querySelectorAll('option');

      expect(options.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Accessibility', () => {
    it('should have proper label associations for radio groups', () => {
      render(<ReadSettings {...defaultProps} />);

      // Each radio should be associated with its label
      const radios = screen.getAllByRole('radio');
      radios.forEach(radio => {
        const label = radio.closest('label');
        expect(label).toBeInTheDocument();
      });
    });

    it('should have proper label associations for checkboxes', () => {
      render(<ReadSettings {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        const label = checkbox.closest('label');
        expect(label).toBeInTheDocument();
      });
    });

    it('should have proper label associations for select elements', () => {
      render(<ReadSettings {...defaultProps} />);

      const selects = screen.getAllByRole('combobox');
      // From and To labels should be visible
      expect(screen.getByText('From:')).toBeInTheDocument();
      expect(screen.getByText('To:')).toBeInTheDocument();
      expect(selects).toHaveLength(2);
    });

    it('should have proper heading structure', () => {
      render(<ReadSettings {...defaultProps} />);

      const heading = screen.getByText('Read Mode Settings');
      expect(heading.tagName).toBe('H3');
    });
  });

  describe('CSS Module Classes', () => {
    it('should apply CSS module classes', () => {
      const { container } = render(<ReadSettings {...defaultProps} />);

      const settingsSection = container.firstChild as HTMLElement;
      expect(settingsSection.className).toMatch(/_settingsSection_/);
    });
  });
});
