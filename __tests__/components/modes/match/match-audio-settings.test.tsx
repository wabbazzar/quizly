import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MatchSettings from '@/components/modals/settings/MatchSettings';
import { DEFAULT_MATCH_SETTINGS } from '@/components/modes/match/types';
import { Deck } from '@/types';

// Mock deck for testing
const mockDeck: Deck = {
  id: 'test-deck',
  title: 'Test Deck',
  description: 'A deck for testing',
  metadata: {
    version: '1.0.0',
    author: 'Test Author',
    available_sides: 2,
    side_labels: {
      side_a: 'term',
      side_b: 'definition',
      side_c: null,
      side_d: null,
      side_e: null,
      side_f: null
    },
    card_count: 10,
    default_view: ['side_a', 'side_b'],
    tags: ['test'],
    ai_generated: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  settings: {
    randomize: false,
    ai_voice_enabled: false,
  },
  content: [
    { side_a: 'Term 1', side_b: 'Definition 1' },
    { side_a: 'Term 2', side_b: 'Definition 2' },
  ],
};

describe('MatchSettings Audio Integration', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the "Enable sound effects" checkbox', () => {
    render(
      <MatchSettings
        settings={DEFAULT_MATCH_SETTINGS}
        onChange={mockOnChange}
        deck={mockDeck}
      />
    );

    const audioCheckbox = screen.getByLabelText(/Enable sound effects/i);
    expect(audioCheckbox).toBeInTheDocument();
    expect(audioCheckbox).toHaveAttribute('type', 'checkbox');
  });

  it('should reflect the current enableAudio setting', () => {
    const settingsWithAudioEnabled = {
      ...DEFAULT_MATCH_SETTINGS,
      enableAudio: true
    };

    render(
      <MatchSettings
        settings={settingsWithAudioEnabled}
        onChange={mockOnChange}
        deck={mockDeck}
      />
    );

    const audioCheckbox = screen.getByLabelText(/Enable sound effects/i) as HTMLInputElement;
    expect(audioCheckbox.checked).toBe(true);
  });

  it('should call onChange when audio setting is toggled', () => {
    render(
      <MatchSettings
        settings={DEFAULT_MATCH_SETTINGS}
        onChange={mockOnChange}
        deck={mockDeck}
      />
    );

    const audioCheckbox = screen.getByLabelText(/Enable sound effects/i);
    fireEvent.click(audioCheckbox);

    expect(mockOnChange).toHaveBeenCalledWith('enableAudio', true);
  });

  it('should toggle from enabled to disabled', () => {
    const settingsWithAudioEnabled = {
      ...DEFAULT_MATCH_SETTINGS,
      enableAudio: true
    };

    render(
      <MatchSettings
        settings={settingsWithAudioEnabled}
        onChange={mockOnChange}
        deck={mockDeck}
      />
    );

    const audioCheckbox = screen.getByLabelText(/Enable sound effects/i);
    fireEvent.click(audioCheckbox);

    expect(mockOnChange).toHaveBeenCalledWith('enableAudio', false);
  });

  it('should include tooltip information about audio', () => {
    render(
      <MatchSettings
        settings={DEFAULT_MATCH_SETTINGS}
        onChange={mockOnChange}
        deck={mockDeck}
      />
    );

    // Look for the tooltip text
    const tooltipText = screen.getByText(/Play sounds for matches and game completion/i);
    expect(tooltipText).toBeInTheDocument();
  });

  it('should have default enableAudio value as false', () => {
    expect(DEFAULT_MATCH_SETTINGS.enableAudio).toBe(false);
  });

  it('should verify enableAudio is a boolean type', () => {
    render(
      <MatchSettings
        settings={DEFAULT_MATCH_SETTINGS}
        onChange={mockOnChange}
        deck={mockDeck}
      />
    );

    const audioCheckbox = screen.getByLabelText(/Enable sound effects/i) as HTMLInputElement;

    // Should be a boolean checkbox that can be checked/unchecked
    expect(audioCheckbox.type).toBe('checkbox');
    expect(typeof audioCheckbox.checked).toBe('boolean');

    // Initial state should match the setting
    expect(audioCheckbox.checked).toBe(DEFAULT_MATCH_SETTINGS.enableAudio);
  });

  it('should integrate with other match settings correctly', () => {
    const customSettings = {
      ...DEFAULT_MATCH_SETTINGS,
      enableAudio: true,
      enableTimer: true,
      includeMastered: true
    };

    render(
      <MatchSettings
        settings={customSettings}
        onChange={mockOnChange}
        deck={mockDeck}
      />
    );

    // All settings should be reflected correctly
    const audioCheckbox = screen.getByLabelText(/Enable sound effects/i) as HTMLInputElement;
    const timerCheckbox = screen.getByLabelText(/Enable timer/i) as HTMLInputElement;
    const masteredCheckbox = screen.getByLabelText(/Include mastered cards/i) as HTMLInputElement;

    expect(audioCheckbox.checked).toBe(true);
    expect(timerCheckbox.checked).toBe(true);
    expect(masteredCheckbox.checked).toBe(true);
  });
});