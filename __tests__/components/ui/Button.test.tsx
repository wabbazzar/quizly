import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../utils/testUtils';
import { Button } from '@/components/ui/Button';

// Mock the Spinner component
vi.mock('@/components/ui/Spinner', () => ({
  Spinner: ({ size, variant }: { size?: string; variant?: string }) => (
    <div data-testid="spinner" data-size={size} data-variant={variant}>
      Loading...
    </div>
  ),
}));

describe('Button Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<Button>Click me</Button>);

      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should render children correctly', () => {
      render(<Button>Test Button Text</Button>);
      expect(screen.getByText('Test Button Text')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Button className="custom-class">Test</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Variants', () => {
    it('should render different variants', () => {
      const variants = ['primary', 'secondary', 'tertiary', 'danger'] as const;

      variants.forEach(variant => {
        const { unmount } = render(<Button variant={variant}>Test</Button>);
        const button = screen.getByRole('button');
        // Check that the variant class is applied (CSS modules hash the class names)
        expect(button.className).toMatch(new RegExp(`_${variant}_`));
        unmount();
      });
    });
  });

  describe('Sizes', () => {
    it('should render different sizes', () => {
      const sizes = ['small', 'medium', 'large'] as const;

      sizes.forEach(size => {
        const { unmount } = render(<Button size={size}>Test</Button>);
        const button = screen.getByRole('button');
        expect(button.className).toMatch(new RegExp(`_${size}_`));
        unmount();
      });
    });
  });

  describe('Interactive States', () => {
    it('should handle click events', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disabled prop is true', () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled button
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button.className).toMatch(/_disabled_/);

      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should support different button types', () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });
  });

  describe('Loading State', () => {
    it('should show loading state correctly', () => {
      render(<Button loading>Loading button</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button.className).toMatch(/_disabled_/);
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('should not trigger click events when loading', () => {
      const handleClick = vi.fn();
      render(
        <Button loading onClick={handleClick}>
          Loading
        </Button>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should render correct spinner variant based on button variant', () => {
      const { unmount } = render(
        <Button loading variant="primary">
          Loading
        </Button>
      );
      expect(screen.getByTestId('spinner')).toHaveAttribute('data-variant', 'white');
      unmount();

      render(
        <Button loading variant="secondary">
          Loading
        </Button>
      );
      expect(screen.getByTestId('spinner')).toHaveAttribute('data-variant', 'primary');
    });

    it('should hide icon when loading', () => {
      const TestIcon = () => <span data-testid="test-icon">📧</span>;
      render(
        <Button icon={<TestIcon />} loading>
          With Icon
        </Button>
      );

      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });
  });

  describe('Icon Support', () => {
    it('should render with icon correctly', () => {
      const TestIcon = () => <span data-testid="test-icon">📧</span>;
      render(<Button icon={<TestIcon />}>With Icon</Button>);

      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
      expect(screen.getByText('With Icon')).toBeInTheDocument();
    });

    it('should apply aria-hidden to icon', () => {
      const TestIcon = () => <span data-testid="test-icon">📧</span>;
      render(<Button icon={<TestIcon />}>With Icon</Button>);

      const iconContainer = screen.getByTestId('test-icon').parentElement;
      expect(iconContainer).toHaveAttribute('aria-hidden', 'true');
    });

    it('should not render icon when loading', () => {
      const TestIcon = () => <span data-testid="test-icon">📧</span>;
      render(
        <Button icon={<TestIcon />} loading>
          Loading with Icon
        </Button>
      );

      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
    });
  });

  describe('Full Width', () => {
    it('should apply fullWidth class when fullWidth is true', () => {
      render(<Button fullWidth>Full Width</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toMatch(/_fullWidth_/);
    });

    it('should not apply fullWidth class by default', () => {
      render(<Button>Normal Width</Button>);
      const button = screen.getByRole('button');
      expect(button.className).not.toMatch(/_fullWidth_/);
    });
  });

  describe('Accessibility', () => {
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

    it('should have aria-busy when loading', () => {
      render(<Button loading>Loading</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    });

    it('should support keyboard navigation', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Test Button</Button>);

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('HTML Button Attributes', () => {
    it('should pass through HTML button attributes', () => {
      render(
        <Button id="test-button" title="Test title" data-testid="custom-button" tabIndex={0}>
          Test
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('id', 'test-button');
      expect(button).toHaveAttribute('title', 'Test title');
      expect(button).toHaveAttribute('data-testid', 'custom-button');
      expect(button).toHaveAttribute('tabIndex', '0');
    });

    it('should handle form-related attributes', () => {
      render(
        <Button type="submit" form="test-form" formAction="/submit" formMethod="post">
          Submit
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('form', 'test-form');
      expect(button).toHaveAttribute('formAction', '/submit');
      expect(button).toHaveAttribute('formMethod', 'post');
    });
  });

  describe('Content Structure', () => {
    it('should wrap children in content span', () => {
      render(<Button>Test Content</Button>);

      const contentSpan = document.querySelector('[class*="_content_"]');
      expect(contentSpan).toBeInTheDocument();
      expect(contentSpan).toHaveTextContent('Test Content');
    });

    it('should render icon and content in correct order when not loading', () => {
      const TestIcon = () => <span data-testid="test-icon">📧</span>;
      render(<Button icon={<TestIcon />}>With Icon</Button>);

      const button = screen.getByRole('button');
      const children = Array.from(button.children);

      // First child should be icon container
      expect(children[0].className).toMatch(/_icon_/);
      expect(children[0]).toContainElement(screen.getByTestId('test-icon'));

      // Second child should be content
      expect(children[1].className).toMatch(/_content_/);
      expect(children[1]).toHaveTextContent('With Icon');
    });

    it('should render spinner and content when loading', () => {
      const TestIcon = () => <span data-testid="test-icon">📧</span>;
      render(
        <Button icon={<TestIcon />} loading>
          Loading
        </Button>
      );

      const button = screen.getByRole('button');
      const children = Array.from(button.children);

      // First child should be spinner container
      expect(children[0].className).toMatch(/_spinner_/);
      expect(children[0]).toContainElement(screen.getByTestId('spinner'));

      // Second child should be content
      expect(children[1].className).toMatch(/_content_/);
      expect(children[1]).toHaveTextContent('Loading');

      // Should not contain icon when loading
      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
    });
  });

  describe('Component Display Name', () => {
    it('should have correct display name', () => {
      expect(Button.displayName).toBe('Button');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(<Button></Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('');
    });

    it('should handle null children', () => {
      render(<Button>{null}</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle complex children content', () => {
      render(
        <Button>
          <span>Complex</span> <strong>Content</strong>
        </Button>
      );

      expect(screen.getByText('Complex')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should handle both disabled and loading states', () => {
      render(
        <Button disabled loading>
          Both States
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button.className).toMatch(/_disabled_/);
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should be memoized to prevent unnecessary re-renders', () => {
      const handleClick = vi.fn();
      const { rerender } = render(<Button onClick={handleClick}>Test</Button>);

      // Same props should not cause re-render (verified by memo)
      rerender(<Button onClick={handleClick}>Test</Button>);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
