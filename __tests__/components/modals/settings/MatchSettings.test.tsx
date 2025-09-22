import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../utils/testUtils';
import MatchSettings from '@/components/modals/settings/MatchSettings';
import { MatchSettings as MatchSettingsType } from '@/components/modes/match/types';
import { Deck } from '@/types';

// Mock StatusIcons
vi.mock('@/components/icons/StatusIcons', () => ({
  ClockIcon: ({ className, size }: any) => (
    <svg data-testid="clock-icon" className={className} width={size} height={size}>
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  DragHandleIcon: ({ className, size }: any) => (
    <svg data-testid="drag-handle-icon" className={className} width={size} height={size}>
      <rect x="4" y="4" width="16" height="16" />
    </svg>
  ),
}));

describe('MatchSettings Component', () => {
  const mockOnChange = vi.fn();

  const createMockDeck = (availableSides = 2): Deck => ({
    id: 'test-deck',
    metadata: {
      deck_name: 'Test Deck',
      description: 'A test deck',
      category: 'education',
      available_levels: [1, 2, 3],
      available_sides: availableSides,
      side_labels: {
        side_a: 'english',
        side_b: 'spanish',
        side_c: 'notes',
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
        side_a: 'Front 1',
        side_b: 'Back 1',
        side_c: 'Notes 1',
        level: 1,
      },
      {
        idx: 1,
        name: 'Card 2',
        side_a: 'Front 2',
        side_b: 'Back 2',
        side_c: 'Notes 2',
        level: 1,
      },
    ],
  });

  const createDefaultSettings = (): MatchSettingsType => ({
    gridSize: { rows: 3, cols: 4 },
    matchType: 'two_way',
    cardSides: [
      { sides: ['side_a'], label: 'English', count: 6 },
      { sides: ['side_b'], label: 'Spanish', count: 6 },
    ],
    enableTimer: true,
    includeMastered: false,
    enableAudio: false,
    timerSeconds: 0, // Count-up timer
  });

  const defaultProps = {
    settings: createDefaultSettings(),
    onChange: mockOnChange,
    deck: createMockDeck(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with title and icon', () => {
      render(<MatchSettings {...defaultProps} />);

      expect(screen.getByText('Match Game Settings')).toBeInTheDocument();
      expect(screen.getByTestId('drag-handle-icon')).toBeInTheDocument();
    });

    it('should render all main sections', () => {
      render(<MatchSettings {...defaultProps} />);

      expect(screen.getByText('Grid Size')).toBeInTheDocument();
      expect(screen.getByText('Match Type')).toBeInTheDocument();
      expect(screen.getByText('Timer Settings')).toBeInTheDocument();
      expect(screen.getByText('Additional Options')).toBeInTheDocument();
      expect(screen.getByText('Current Configuration')).toBeInTheDocument();
    });

    it('should render info tooltips', () => {
      render(<MatchSettings {...defaultProps} />);

      expect(screen.getByText('Choose how many cards appear in the match grid')).toBeInTheDocument();
      expect(screen.getByText('How cards should match together')).toBeInTheDocument();
      expect(screen.getByText('Include cards you\'ve already mastered in the game')).toBeInTheDocument();
      expect(screen.getByText('Play sounds for matches and game completion')).toBeInTheDocument();
    });

    it('should apply CSS module classes', () => {
      const { container } = render(<MatchSettings {...defaultProps} />);

      // Check that CSS modules are applied by checking className includes underscore
      const containerElement = container.firstChild as HTMLElement;
      expect(containerElement.className).toMatch(/_\w+/);

      const titleElement = screen.getByText('Match Game Settings').closest('h3') as HTMLElement;
      expect(titleElement.className).toMatch(/_\w+/);
    });
  });

  describe('Grid Size Settings', () => {
    it('should render all grid presets', () => {
      render(<MatchSettings {...defaultProps} />);

      expect(screen.getByText('Small (2×3)')).toBeInTheDocument();
      expect(screen.getByText('Medium (3×4)')).toBeInTheDocument();
      expect(screen.getByText('Large (4×4)')).toBeInTheDocument();
      expect(screen.getByText('Extra Large (4×5)')).toBeInTheDocument();

      expect(screen.getByText('6 cards')).toBeInTheDocument();
      expect(screen.getByText('12 cards')).toBeInTheDocument();
      expect(screen.getByText('16 cards')).toBeInTheDocument();
      expect(screen.getByText('20 cards')).toBeInTheDocument();
    });

    it('should highlight active preset', () => {
      render(<MatchSettings {...defaultProps} />);

      const mediumButton = screen.getByText('Medium (3×4)').closest('button') as HTMLElement;
      expect(mediumButton.className).toMatch(/_active_/);
    });

    it('should handle preset selection', () => {
      render(<MatchSettings {...defaultProps} />);

      const largeButton = screen.getByText('Large (4×4)').closest('button');
      fireEvent.click(largeButton!);

      expect(mockOnChange).toHaveBeenCalledWith('gridSize', { rows: 4, cols: 4 });
    });

    it('should render custom grid inputs', () => {
      render(<MatchSettings {...defaultProps} />);

      const rowsInput = screen.getByLabelText('Rows');
      const colsInput = screen.getByLabelText('Cols');

      expect(rowsInput).toHaveValue(3);
      expect(colsInput).toHaveValue(4);
    });

    it('should handle custom rows input change', () => {
      render(<MatchSettings {...defaultProps} />);

      const rowsInput = screen.getByLabelText('Rows');
      fireEvent.change(rowsInput, { target: { value: '5' } });

      expect(mockOnChange).toHaveBeenCalledWith('gridSize', { rows: 5, cols: 4 });
    });

    it('should handle custom cols input change', () => {
      render(<MatchSettings {...defaultProps} />);

      const colsInput = screen.getByLabelText('Cols');
      fireEvent.change(colsInput, { target: { value: '6' } });

      expect(mockOnChange).toHaveBeenCalledWith('gridSize', { rows: 3, cols: 6 });
    });

    it('should enforce min/max values for custom inputs', () => {
      render(<MatchSettings {...defaultProps} />);

      const rowsInput = screen.getByLabelText('Rows');
      const colsInput = screen.getByLabelText('Cols');

      expect(rowsInput).toHaveAttribute('min', '2');
      expect(rowsInput).toHaveAttribute('max', '6');
      expect(colsInput).toHaveAttribute('min', '2');
      expect(colsInput).toHaveAttribute('max', '6');
    });

    it('should handle invalid numeric input gracefully', () => {
      render(<MatchSettings {...defaultProps} />);

      const rowsInput = screen.getByLabelText('Rows');
      fireEvent.change(rowsInput, { target: { value: 'abc' } });

      expect(mockOnChange).toHaveBeenCalledWith('gridSize', { rows: 2, cols: 4 });
    });
  });

  describe('Match Type Settings', () => {
    it('should render all match type options', () => {
      render(<MatchSettings {...defaultProps} />);

      expect(screen.getByText('Two-Way Matching')).toBeInTheDocument();
      expect(screen.getByText('Match English ↔ Spanish')).toBeInTheDocument();
      expect(screen.getByText('Three-Way Matching')).toBeInTheDocument();
      expect(screen.getByText('Custom Configuration')).toBeInTheDocument();
      expect(screen.getByText('Configure manually below')).toBeInTheDocument();
    });

    it('should show correct initial selection', () => {
      render(<MatchSettings {...defaultProps} />);

      const twoWayRadio = screen.getByLabelText(/Two-Way Matching/);
      expect(twoWayRadio).toBeChecked();
    });

    it('should handle two-way match type selection', () => {
      const settings = { ...createDefaultSettings(), matchType: 'custom' as const };
      render(<MatchSettings {...defaultProps} settings={settings} />);

      const twoWayRadio = screen.getByLabelText(/Two-Way Matching/);
      fireEvent.click(twoWayRadio);

      expect(mockOnChange).toHaveBeenCalledWith('matchType', 'two_way');
      expect(mockOnChange).toHaveBeenCalledWith('cardSides', [
        { sides: ['side_a'], label: 'English', count: 6 },
        { sides: ['side_b'], label: 'Spanish', count: 6 },
      ]);
    });

    it('should handle three-way match type selection', () => {
      const deckWith3Sides = createMockDeck(3);
      render(<MatchSettings {...defaultProps} deck={deckWith3Sides} />);

      const threeWayRadio = screen.getByLabelText(/Three-Way Matching/);
      fireEvent.click(threeWayRadio);

      expect(mockOnChange).toHaveBeenCalledWith('matchType', 'three_way');
      expect(mockOnChange).toHaveBeenCalledWith('cardSides', [
        { sides: ['side_a'], label: 'English', count: 4 },
        { sides: ['side_b'], label: 'Spanish', count: 4 },
        { sides: ['side_c'], label: 'Notes', count: 4 },
      ]);
    });

    it('should handle custom match type selection', () => {
      render(<MatchSettings {...defaultProps} />);

      const customRadio = screen.getByLabelText(/Custom Configuration/);
      fireEvent.click(customRadio);

      expect(mockOnChange).toHaveBeenCalledWith('matchType', 'custom');
      expect(mockOnChange).toHaveBeenCalledWith('cardSides', [
        { sides: ['side_a'], label: 'English', count: 6 },
        { sides: ['side_b'], label: 'Spanish', count: 6 },
      ]);
    });

    it('should disable three-way option when deck has fewer than 3 sides', () => {
      const deckWith2Sides = createMockDeck(2);
      render(<MatchSettings {...defaultProps} deck={deckWith2Sides} />);

      const threeWayRadio = screen.getByLabelText(/Three-Way Matching/);
      expect(threeWayRadio).toBeDisabled();
      expect(screen.getByText('Requires 3+ sides')).toBeInTheDocument();
    });

    it('should enable three-way option when deck has 3+ sides', () => {
      const deckWith3Sides = createMockDeck(3);
      render(<MatchSettings {...defaultProps} deck={deckWith3Sides} />);

      const threeWayRadio = screen.getByLabelText(/Three-Way Matching/);
      expect(threeWayRadio).not.toBeDisabled();
      expect(screen.getByText('Match English ↔ Spanish ↔ Notes')).toBeInTheDocument();
    });
  });

  describe('Card Sides Configuration', () => {
    it('should show card sides configuration for custom match type', () => {
      const settings = { ...createDefaultSettings(), matchType: 'custom' as const };
      render(<MatchSettings {...defaultProps} settings={settings} />);

      expect(screen.getByText('Card Sides to Display')).toBeInTheDocument();
      expect(screen.getByText('Configure which sides appear and how many cards show each side')).toBeInTheDocument();
    });

    it('should render card side rows', () => {
      const settings = { ...createDefaultSettings(), matchType: 'custom' as const };
      render(<MatchSettings {...defaultProps} settings={settings} />);

      expect(screen.getAllByText('Side to show:')).toHaveLength(2);
      expect(screen.getAllByText('Card count:')).toHaveLength(2);
    });

    it('should show correct side selections', () => {
      const settings = { ...createDefaultSettings(), matchType: 'custom' as const };
      render(<MatchSettings {...defaultProps} settings={settings} />);

      const selects = screen.getAllByRole('combobox');
      expect(selects[0]).toHaveValue('side_a');
      expect(selects[1]).toHaveValue('side_b');
    });

    it('should show correct card counts', () => {
      const settings = { ...createDefaultSettings(), matchType: 'custom' as const };
      render(<MatchSettings {...defaultProps} settings={settings} />);

      const countInputs = screen.getAllByDisplayValue('6');
      expect(countInputs).toHaveLength(2);
    });

    it('should handle side selection change', () => {
      const deckWith3Sides = createMockDeck(3);
      const settings = { ...createDefaultSettings(), matchType: 'custom' as const };
      render(<MatchSettings {...defaultProps} deck={deckWith3Sides} settings={settings} />);

      const firstSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(firstSelect, { target: { value: 'side_c' } });

      expect(mockOnChange).toHaveBeenCalledWith('cardSides', [
        { sides: ['side_c'], label: 'Notes', count: 6 },
        { sides: ['side_b'], label: 'Spanish', count: 6 },
      ]);
    });

    it('should handle card count change', () => {
      const settings = { ...createDefaultSettings(), matchType: 'custom' as const };
      render(<MatchSettings {...defaultProps} settings={settings} />);

      const countInputs = screen.getAllByDisplayValue('6');
      fireEvent.change(countInputs[0], { target: { value: '8' } });

      expect(mockOnChange).toHaveBeenCalledWith('cardSides', [
        { sides: ['side_a'], label: 'English', count: 8 },
        { sides: ['side_b'], label: 'Spanish', count: 6 },
      ]);
    });

    it('should show card sides configuration for non-custom match types when cardSides exist', () => {
      // Component shows card sides configuration when matchType is custom OR when cardSides.length > 0
      render(<MatchSettings {...defaultProps} />);

      // Should show because cardSides.length > 0 even though matchType is 'two_way'
      expect(screen.getByText('Card Sides to Display')).toBeInTheDocument();
    });

    it('should show available sides based on deck metadata', () => {
      const deckWith4Sides = createMockDeck(4);
      const settings = { ...createDefaultSettings(), matchType: 'custom' as const };
      render(<MatchSettings {...defaultProps} deck={deckWith4Sides} settings={settings} />);

      const firstSelect = screen.getAllByRole('combobox')[0];

      // Get all options in the select
      const options = Array.from(firstSelect.querySelectorAll('option'));
      const optionTexts = options.map(option => option.textContent);

      expect(optionTexts).toContain('English');
      expect(optionTexts).toContain('Spanish');
      expect(optionTexts).toContain('Notes');
      expect(optionTexts).toContain('Side D');
    });

    it('should enforce min/max values for card count inputs', () => {
      const settings = { ...createDefaultSettings(), matchType: 'custom' as const };
      render(<MatchSettings {...defaultProps} settings={settings} />);

      const countInputs = screen.getAllByDisplayValue('6');
      const firstCountInput = countInputs[0];

      expect(firstCountInput).toHaveAttribute('min', '1');
      expect(firstCountInput).toHaveAttribute('max', '11'); // gridSize.rows * cols - 1
    });
  });

  describe('Timer Settings', () => {
    it('should render timer section with icon', () => {
      render(<MatchSettings {...defaultProps} />);

      expect(screen.getByText('Timer Settings')).toBeInTheDocument();
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    it('should show enable timer checkbox', () => {
      render(<MatchSettings {...defaultProps} />);

      expect(screen.getByText('Enable timer')).toBeInTheDocument();
      const checkboxes = screen.getAllByRole('checkbox');
      const enableTimerCheckbox = checkboxes.find(checkbox =>
        checkbox.closest('label')?.textContent?.includes('Enable timer')
      );
      expect(enableTimerCheckbox).toBeChecked();
    });

    it('should handle enable timer toggle', () => {
      render(<MatchSettings {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const enableTimerCheckbox = checkboxes.find(checkbox =>
        checkbox.closest('label')?.textContent?.includes('Enable timer')
      );
      fireEvent.click(enableTimerCheckbox!);

      expect(mockOnChange).toHaveBeenCalledWith('enableTimer', false);
    });

    it('should show timer options when timer is enabled', () => {
      render(<MatchSettings {...defaultProps} />);

      expect(screen.getByText('Count-up Timer')).toBeInTheDocument();
      expect(screen.getByText('Track your completion time')).toBeInTheDocument();
      expect(screen.getByText('Countdown Timer')).toBeInTheDocument();
      expect(screen.getByText('Race against time')).toBeInTheDocument();
    });

    it('should not show timer options when timer is disabled', () => {
      const settings = { ...createDefaultSettings(), enableTimer: false };
      render(<MatchSettings {...defaultProps} settings={settings} />);

      expect(screen.queryByText('Count-up Timer')).not.toBeInTheDocument();
      expect(screen.queryByText('Countdown Timer')).not.toBeInTheDocument();
    });

    it('should show count-up timer as selected by default', () => {
      render(<MatchSettings {...defaultProps} />);

      const radios = screen.getAllByRole('radio');
      const countUpRadio = radios.find(radio =>
        radio.closest('label')?.textContent?.includes('Count-up Timer')
      );
      expect(countUpRadio).toBeChecked();
    });

    it('should handle count-up timer selection', () => {
      const settings = { ...createDefaultSettings(), timerSeconds: 120 };
      render(<MatchSettings {...defaultProps} settings={settings} />);

      const radios = screen.getAllByRole('radio');
      const countUpRadio = radios.find(radio =>
        radio.closest('label')?.textContent?.includes('Count-up Timer')
      );
      fireEvent.click(countUpRadio!);

      expect(mockOnChange).toHaveBeenCalledWith('timerSeconds', 0);
    });

    it('should handle countdown timer selection', () => {
      render(<MatchSettings {...defaultProps} />);

      const radios = screen.getAllByRole('radio');
      const countdownRadio = radios.find(radio =>
        radio.closest('label')?.textContent?.includes('Countdown Timer')
      );
      fireEvent.click(countdownRadio!);

      expect(mockOnChange).toHaveBeenCalledWith('timerSeconds', 120);
    });

    it('should show time limit input for countdown timer', () => {
      const settings = { ...createDefaultSettings(), timerSeconds: 180 };
      render(<MatchSettings {...defaultProps} settings={settings} />);

      expect(screen.getByText('Time limit (seconds)')).toBeInTheDocument();
      expect(screen.getByDisplayValue('180')).toBeInTheDocument();
    });

    it('should not show time limit input for count-up timer', () => {
      render(<MatchSettings {...defaultProps} />);

      expect(screen.queryByText('Time limit (seconds)')).not.toBeInTheDocument();
    });

    it('should handle time limit change', () => {
      const settings = { ...createDefaultSettings(), timerSeconds: 180 };
      render(<MatchSettings {...defaultProps} settings={settings} />);

      const timeLimitInput = screen.getByDisplayValue('180');
      fireEvent.change(timeLimitInput, { target: { value: '240' } });

      expect(mockOnChange).toHaveBeenCalledWith('timerSeconds', 240);
    });

    it('should enforce min/max values for time limit', () => {
      const settings = { ...createDefaultSettings(), timerSeconds: 180 };
      render(<MatchSettings {...defaultProps} settings={settings} />);

      const timeLimitInput = screen.getByDisplayValue('180');

      expect(timeLimitInput).toHaveAttribute('min', '30');
      expect(timeLimitInput).toHaveAttribute('max', '600');
    });

    it('should clamp time limit to valid range', () => {
      const settings = { ...createDefaultSettings(), timerSeconds: 180 };
      render(<MatchSettings {...defaultProps} settings={settings} />);

      const timeLimitInput = screen.getByDisplayValue('180');

      // Test minimum clamping
      fireEvent.change(timeLimitInput, { target: { value: '10' } });
      expect(mockOnChange).toHaveBeenCalledWith('timerSeconds', 30);

      // Test maximum clamping
      fireEvent.change(timeLimitInput, { target: { value: '1000' } });
      expect(mockOnChange).toHaveBeenCalledWith('timerSeconds', 600);
    });
  });

  describe('Additional Options', () => {
    it('should render additional options section', () => {
      render(<MatchSettings {...defaultProps} />);

      expect(screen.getByText('Additional Options')).toBeInTheDocument();
    });

    it('should show include mastered cards checkbox', () => {
      render(<MatchSettings {...defaultProps} />);

      // Find checkbox by testing ID of the text content
      expect(screen.getByText('Include mastered cards')).toBeInTheDocument();
      const checkboxes = screen.getAllByRole('checkbox');
      // The first checkbox in additional options should be "Include mastered cards"
      const masteredCheckbox = checkboxes.find(checkbox =>
        checkbox.closest('label')?.textContent?.includes('Include mastered cards')
      );
      expect(masteredCheckbox).not.toBeChecked();
    });

    it('should handle include mastered cards toggle', () => {
      render(<MatchSettings {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const masteredCheckbox = checkboxes.find(checkbox =>
        checkbox.closest('label')?.textContent?.includes('Include mastered cards')
      );
      fireEvent.click(masteredCheckbox!);

      expect(mockOnChange).toHaveBeenCalledWith('includeMastered', true);
    });

    it('should show enable audio checkbox', () => {
      render(<MatchSettings {...defaultProps} />);

      expect(screen.getByText('Enable sound effects')).toBeInTheDocument();
      const checkboxes = screen.getAllByRole('checkbox');
      const audioCheckbox = checkboxes.find(checkbox =>
        checkbox.closest('label')?.textContent?.includes('Enable sound effects')
      );
      expect(audioCheckbox).not.toBeChecked();
    });

    it('should handle enable audio toggle', () => {
      render(<MatchSettings {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const audioCheckbox = checkboxes.find(checkbox =>
        checkbox.closest('label')?.textContent?.includes('Enable sound effects')
      );
      fireEvent.click(audioCheckbox!);

      expect(mockOnChange).toHaveBeenCalledWith('enableAudio', true);
    });
  });

  describe('Settings Summary', () => {
    it('should render settings summary section', () => {
      render(<MatchSettings {...defaultProps} />);

      expect(screen.getByText('Current Configuration')).toBeInTheDocument();
    });

    it('should display grid configuration', () => {
      render(<MatchSettings {...defaultProps} />);

      expect(screen.getByText('Grid:')).toBeInTheDocument();
      // Find the summary section specifically and check for grid display
      const summarySection = screen.getByText('Current Configuration').closest('div');
      expect(summarySection).toHaveTextContent('3×4');
      expect(summarySection).toHaveTextContent('12 cards');
    });

    it('should display match type', () => {
      render(<MatchSettings {...defaultProps} />);

      expect(screen.getByText('Match Type:')).toBeInTheDocument();
      expect(screen.getByText('Two-Way')).toBeInTheDocument();
    });

    it('should display three-way match type', () => {
      const settings = { ...createDefaultSettings(), matchType: 'three_way' as const };
      render(<MatchSettings {...defaultProps} settings={settings} />);

      expect(screen.getByText('Three-Way')).toBeInTheDocument();
    });

    it('should display custom match type', () => {
      const settings = { ...createDefaultSettings(), matchType: 'custom' as const };
      render(<MatchSettings {...defaultProps} settings={settings} />);

      expect(screen.getByText('Custom')).toBeInTheDocument();
    });

    it('should display timer configuration - count-up', () => {
      render(<MatchSettings {...defaultProps} />);

      expect(screen.getByText('Timer:')).toBeInTheDocument();
      expect(screen.getByText('Count-up')).toBeInTheDocument();
    });

    it('should display timer configuration - countdown', () => {
      const settings = { ...createDefaultSettings(), timerSeconds: 180 };
      render(<MatchSettings {...defaultProps} settings={settings} />);

      expect(screen.getByText('180s countdown')).toBeInTheDocument();
    });

    it('should display timer configuration - disabled', () => {
      const settings = { ...createDefaultSettings(), enableTimer: false };
      render(<MatchSettings {...defaultProps} settings={settings} />);

      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null deck gracefully', () => {
      expect(() => {
        render(<MatchSettings {...defaultProps} deck={null} />);
      }).not.toThrow();
    });

    it('should default to 2 available sides when deck metadata is missing', () => {
      const deckWithoutMetadata = {
        ...createMockDeck(),
        metadata: {
          ...createMockDeck().metadata,
          available_sides: undefined as any,
        },
      };

      render(<MatchSettings {...defaultProps} deck={deckWithoutMetadata} />);

      const threeWayRadio = screen.getByRole('radio', { name: /Three-Way Matching/ });
      expect(threeWayRadio).toBeDisabled();
    });

    it('should limit available sides to maximum of 6', () => {
      const deckWith10Sides = createMockDeck(10);
      const settings = { ...createDefaultSettings(), matchType: 'custom' as const };
      render(<MatchSettings {...defaultProps} deck={deckWith10Sides} settings={settings} />);

      const firstSelect = screen.getAllByRole('combobox')[0];
      const options = firstSelect.querySelectorAll('option');

      expect(options).toHaveLength(6); // Should be limited to 6 sides
    });

    it('should handle invalid card count input', () => {
      const settings = { ...createDefaultSettings(), matchType: 'custom' as const };
      render(<MatchSettings {...defaultProps} settings={settings} />);

      const countInputs = screen.getAllByDisplayValue('6');
      fireEvent.change(countInputs[0], { target: { value: 'invalid' } });

      expect(mockOnChange).toHaveBeenCalledWith('cardSides', [
        { sides: ['side_a'], label: 'English', count: 1 },
        { sides: ['side_b'], label: 'Spanish', count: 6 },
      ]);
    });

    it('should handle invalid timer seconds input', () => {
      const settings = { ...createDefaultSettings(), timerSeconds: 180 };
      render(<MatchSettings {...defaultProps} settings={settings} />);

      const timeLimitInput = screen.getByDisplayValue('180');
      fireEvent.change(timeLimitInput, { target: { value: 'invalid' } });

      expect(mockOnChange).toHaveBeenCalledWith('timerSeconds', 120);
    });
  });

  describe('Disabled States', () => {
    it('should disable three-way matching when deck has insufficient sides', () => {
      const deckWith2Sides = createMockDeck(2);
      render(<MatchSettings {...defaultProps} deck={deckWith2Sides} />);

      const threeWayRadio = screen.getByLabelText(/Three-Way Matching/);
      expect(threeWayRadio).toBeDisabled();
    });

    it('should show appropriate message for disabled three-way option', () => {
      const deckWith2Sides = createMockDeck(2);
      render(<MatchSettings {...defaultProps} deck={deckWith2Sides} />);

      expect(screen.getByText('Requires 3+ sides')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<MatchSettings {...defaultProps} />);

      const mainHeading = screen.getByText('Match Game Settings');
      expect(mainHeading.tagName).toBe('H3');

      const summaryHeading = screen.getByText('Current Configuration');
      expect(summaryHeading.tagName).toBe('H4');
    });

    it('should have proper labels for form controls', () => {
      render(<MatchSettings {...defaultProps} />);

      // Check for input labels
      expect(screen.getByLabelText('Rows')).toBeInTheDocument();
      expect(screen.getByLabelText('Cols')).toBeInTheDocument();

      // Check for checkbox labels (text is in spans, not label text)
      expect(screen.getByText('Enable timer')).toBeInTheDocument();
      expect(screen.getByText('Include mastered cards')).toBeInTheDocument();
      expect(screen.getByText('Enable sound effects')).toBeInTheDocument();

      // Verify checkboxes are present
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThanOrEqual(3);
    });

    it('should group radio buttons properly', () => {
      render(<MatchSettings {...defaultProps} />);

      const allRadios = screen.getAllByRole('radio');
      const matchTypeRadios = allRadios.filter(radio =>
        radio.getAttribute('name') === 'matchType'
      );
      expect(matchTypeRadios).toHaveLength(3);

      const timerModeRadios = allRadios.filter(radio =>
        radio.getAttribute('name') === 'timerMode'
      );
      expect(timerModeRadios).toHaveLength(2);
    });

    it('should provide meaningful descriptions for radio options', () => {
      render(<MatchSettings {...defaultProps} />);

      expect(screen.getByText('Match English ↔ Spanish')).toBeInTheDocument();
      expect(screen.getByText('Track your completion time')).toBeInTheDocument();
      expect(screen.getByText('Race against time')).toBeInTheDocument();
    });

    it('should have keyboard navigation support', () => {
      render(<MatchSettings {...defaultProps} />);

      const firstPresetButton = screen.getByText('Small (2×3)').closest('button');
      expect(firstPresetButton).toHaveAttribute('type', 'button');

      const rowsInput = screen.getByLabelText('Rows');
      expect(rowsInput).toHaveAttribute('type', 'number');
    });
  });

  describe('Component Integration', () => {
    it('should pass correct props structure to parent', () => {
      render(<MatchSettings {...defaultProps} />);

      // Click a grid preset
      const largeButton = screen.getByText('Large (4×4)').closest('button');
      fireEvent.click(largeButton!);

      expect(mockOnChange).toHaveBeenCalledWith('gridSize', { rows: 4, cols: 4 });
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should maintain component state consistency', () => {
      const settings = { ...createDefaultSettings(), timerSeconds: 300 };
      render(<MatchSettings {...defaultProps} settings={settings} />);

      // Should show countdown timer as selected
      const countdownRadio = screen.getByRole('radio', { name: /Countdown Timer/ });
      expect(countdownRadio).toBeChecked();

      // Should show time limit input
      expect(screen.getByDisplayValue('300')).toBeInTheDocument();
    });

    it('should handle rapid setting changes', () => {
      render(<MatchSettings {...defaultProps} />);

      // Multiple rapid changes - test that onChange is called multiple times correctly
      const smallPreset = screen.getByText('Small (2×3)').closest('button');
      const mediumPreset = screen.getByText('Medium (3×4)').closest('button');
      const largePreset = screen.getByText('Large (4×4)').closest('button');

      // Rapid preset changes
      fireEvent.click(smallPreset!);
      fireEvent.click(largePreset!);
      fireEvent.click(mediumPreset!);

      expect(mockOnChange).toHaveBeenCalledTimes(3);
      expect(mockOnChange).toHaveBeenNthCalledWith(1, 'gridSize', { rows: 2, cols: 3 });
      expect(mockOnChange).toHaveBeenNthCalledWith(2, 'gridSize', { rows: 4, cols: 4 });
      expect(mockOnChange).toHaveBeenNthCalledWith(3, 'gridSize', { rows: 3, cols: 4 });
    });
  });
});