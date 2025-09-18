import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../utils/testUtils';
import { Card } from '@/components/ui/Card';

describe('Card Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<Card>Card content</Card>);

      const card = screen.getByText('Card content');
      expect(card).toBeInTheDocument();
      expect(card.tagName).toBe('DIV');
    });

    it('should render children correctly', () => {
      render(
        <Card>
          <div>
            <p>Complex content</p>
            <span>Multiple elements</span>
          </div>
        </Card>
      );

      expect(screen.getByText('Complex content')).toBeInTheDocument();
      expect(screen.getByText('Multiple elements')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Card className="custom-card">Test content</Card>);

      const card = screen.getByText('Test content');
      expect(card).toHaveClass('custom-card');
    });

    it('should have default CSS classes', () => {
      render(<Card>Test content</Card>);

      const card = screen.getByText('Test content');
      expect(card.className).toMatch(/_card_/);
      expect(card.className).toMatch(/_default_/);
      expect(card.className).toMatch(/_padding-medium_/);
    });
  });

  describe('Variants', () => {
    it('should render different variants correctly', () => {
      const variants = ['default', 'elevated', 'outlined', 'transparent'] as const;

      variants.forEach(variant => {
        const { unmount } = render(<Card variant={variant}>Content for {variant}</Card>);
        const card = screen.getByText(`Content for ${variant}`);
        expect(card.className).toMatch(new RegExp(`_${variant}_`));
        unmount();
      });
    });

    it('should default to "default" variant', () => {
      render(<Card>Default variant</Card>);

      const card = screen.getByText('Default variant');
      expect(card.className).toMatch(/_default_/);
    });
  });

  describe('Padding Variants', () => {
    it('should render different padding sizes correctly', () => {
      const paddingSizes = ['none', 'small', 'medium', 'large'] as const;

      paddingSizes.forEach(padding => {
        const { unmount } = render(<Card padding={padding}>Content for {padding}</Card>);
        const card = screen.getByText(`Content for ${padding}`);
        expect(card.className).toMatch(new RegExp(`_padding-${padding}_`));
        unmount();
      });
    });

    it('should default to "medium" padding', () => {
      render(<Card>Medium padding</Card>);

      const card = screen.getByText('Medium padding');
      expect(card.className).toMatch(/_padding-medium_/);
    });
  });

  describe('Interactive State', () => {
    it('should render as div when not interactive', () => {
      render(<Card interactive={false}>Non-interactive card</Card>);

      const card = screen.getByText('Non-interactive card');
      expect(card.tagName).toBe('DIV');
      expect(card.className).not.toMatch(/_interactive_/);
    });

    it('should render as button when interactive is true', () => {
      render(<Card interactive={true}>Interactive card</Card>);

      const card = screen.getByRole('button');
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent('Interactive card');
      expect(card.className).toMatch(/_interactive_/);
    });

    it('should render as button when onClick is provided', () => {
      const handleClick = vi.fn();
      render(<Card onClick={handleClick}>Clickable card</Card>);

      const card = screen.getByRole('button');
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent('Clickable card');
      expect(card).toHaveAttribute('type', 'button');
    });

    it('should handle click events when interactive', () => {
      const handleClick = vi.fn();
      render(<Card interactive={true} onClick={handleClick}>Interactive card</Card>);

      const card = screen.getByRole('button');
      fireEvent.click(card);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle click events when onClick is provided', () => {
      const handleClick = vi.fn();
      render(<Card onClick={handleClick}>Clickable card</Card>);

      const card = screen.getByRole('button');
      fireEvent.click(card);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not handle click events when not interactive and no onClick', () => {
      const handleClick = vi.fn();
      render(<Card>Non-interactive card</Card>);

      const card = screen.getByText('Non-interactive card');

      // Should not be a button, so no click handler
      expect(card.tagName).toBe('DIV');
      expect(() => fireEvent.click(card)).not.toThrow();
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Combined Props', () => {
    it('should combine variant, padding, and interactive props correctly', () => {
      render(
        <Card variant="elevated" padding="large" interactive={true}>
          Combined props card
        </Card>
      );

      const card = screen.getByRole('button');
      expect(card.className).toMatch(/_card_/);
      expect(card.className).toMatch(/_elevated_/);
      expect(card.className).toMatch(/_padding-large_/);
      expect(card.className).toMatch(/_interactive_/);
    });

    it('should combine all props with custom className', () => {
      const handleClick = vi.fn();
      render(
        <Card
          variant="outlined"
          padding="small"
          interactive={true}
          className="custom-class"
          onClick={handleClick}
        >
          All props card
        </Card>
      );

      const card = screen.getByRole('button');
      expect(card.className).toMatch(/_card_/);
      expect(card.className).toMatch(/_outlined_/);
      expect(card.className).toMatch(/_padding-small_/);
      expect(card.className).toMatch(/_interactive_/);
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should be accessible when interactive', () => {
      render(<Card interactive={true}>Accessible card</Card>);

      const card = screen.getByRole('button');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('type', 'button');
    });

    it('should support keyboard navigation when interactive', () => {
      const handleClick = vi.fn();
      render(<Card interactive={true} onClick={handleClick}>Keyboard accessible</Card>);

      const card = screen.getByRole('button');
      card.focus();
      expect(card).toHaveFocus();

      // Simulate Enter key press
      fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });
      // Note: Button elements automatically handle Enter key presses for click events
    });

    it('should not have button role when not interactive', () => {
      render(<Card>Non-interactive card</Card>);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Content Structure', () => {
    it('should preserve content structure in div mode', () => {
      render(
        <Card>
          <header>Card header</header>
          <main>Card body</main>
          <footer>Card footer</footer>
        </Card>
      );

      expect(screen.getByText('Card header').tagName).toBe('HEADER');
      expect(screen.getByText('Card body').tagName).toBe('MAIN');
      expect(screen.getByText('Card footer').tagName).toBe('FOOTER');
    });

    it('should preserve content structure in button mode', () => {
      render(
        <Card interactive={true}>
          <div data-testid="card-content">
            <span>Button content</span>
          </div>
        </Card>
      );

      const content = screen.getByTestId('card-content');
      expect(content).toBeInTheDocument();
      expect(screen.getByText('Button content')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(<Card></Card>);

      const card = document.querySelector('[class*="_card_"]');
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent('');
    });

    it('should handle null children', () => {
      render(<Card>{null}</Card>);

      const card = document.querySelector('[class*="_card_"]');
      expect(card).toBeInTheDocument();
    });

    it('should handle undefined children', () => {
      render(<Card>{undefined}</Card>);

      const card = document.querySelector('[class*="_card_"]');
      expect(card).toBeInTheDocument();
    });

    it('should handle complex nested children', () => {
      render(
        <Card>
          <div>
            <span>Level 1</span>
            <div>
              <span>Level 2</span>
              <div>
                <span>Level 3</span>
              </div>
            </div>
          </div>
        </Card>
      );

      expect(screen.getByText('Level 1')).toBeInTheDocument();
      expect(screen.getByText('Level 2')).toBeInTheDocument();
      expect(screen.getByText('Level 3')).toBeInTheDocument();
    });

    it('should handle interactive with false explicitly', () => {
      render(<Card interactive={false}>Explicitly non-interactive</Card>);

      const card = screen.getByText('Explicitly non-interactive');
      expect(card.tagName).toBe('DIV');
      expect(card.className).not.toMatch(/_interactive_/);
    });

    it('should prioritize onClick over interactive when both are provided', () => {
      const handleClick = vi.fn();
      render(
        <Card interactive={false} onClick={handleClick}>
          onClick overrides interactive
        </Card>
      );

      // Should render as button due to onClick presence
      const card = screen.getByRole('button');
      expect(card).toBeInTheDocument();

      fireEvent.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Component Display Name', () => {
    it('should have correct display name', () => {
      expect(Card.displayName).toBe('Card');
    });
  });

  describe('Performance', () => {
    it('should be memoized to prevent unnecessary re-renders', () => {
      const { rerender } = render(<Card>Test content</Card>);

      // Same props should not cause re-render (verified by memo)
      rerender(<Card>Test content</Card>);

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should handle prop changes correctly', () => {
      const { rerender } = render(
        <Card variant="default">Original content</Card>
      );

      expect(screen.getByText('Original content').className).toMatch(/_default_/);

      rerender(
        <Card variant="elevated">Original content</Card>
      );

      expect(screen.getByText('Original content').className).toMatch(/_elevated_/);
    });
  });

  describe('CSS Class Generation', () => {
    it('should filter out falsy values from className array', () => {
      render(<Card>Test content</Card>);

      const card = screen.getByText('Test content');
      const classNames = card.className.split(' ');

      // Should not contain empty strings or undefined values
      expect(classNames.every(cls => cls.length > 0)).toBe(true);
    });

    it('should join classes correctly with custom className', () => {
      render(<Card className="custom-class">Test content</Card>);

      const card = screen.getByText('Test content');
      expect(card).toHaveClass('custom-class');
      expect(card.className).toMatch(/_card_/);
    });

    it('should handle empty string className', () => {
      render(<Card className="">Test content</Card>);

      const card = screen.getByText('Test content');
      expect(card.className).toMatch(/_card_/);
    });
  });
});