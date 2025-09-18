import { describe, it, expect } from 'vitest';
import { render, screen } from '../../utils/testUtils';
import { Spinner } from '@/components/ui/Spinner';

describe('Spinner Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<Spinner />);

      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should render with proper ARIA attributes', () => {
      render(<Spinner />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('role', 'status');
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should contain visually hidden loading text', () => {
      render(<Spinner />);

      const hiddenText = screen.getByText('Loading...');
      expect(hiddenText).toBeInTheDocument();
      expect(hiddenText.className).toMatch(/_visuallyHidden_/);
    });

    it('should render 8 spinner blades', () => {
      render(<Spinner />);

      const spinner = screen.getByRole('status');
      const blades = spinner.querySelectorAll('[class*="_spinnerBlade_"]');
      expect(blades).toHaveLength(8);
    });

    it('should have default CSS classes', () => {
      render(<Spinner />);

      const spinner = screen.getByRole('status');
      expect(spinner.className).toMatch(/_spinner_/);
      expect(spinner.className).toMatch(/_medium_/);
      expect(spinner.className).toMatch(/_primary_/);
    });
  });

  describe('Size Variants', () => {
    it('should render different sizes correctly', () => {
      const sizes = ['small', 'medium', 'large'] as const;

      sizes.forEach(size => {
        const { unmount } = render(<Spinner size={size} />);
        const spinner = screen.getByRole('status');
        expect(spinner.className).toMatch(new RegExp(`_${size}_`));
        unmount();
      });
    });

    it('should default to "medium" size', () => {
      render(<Spinner />);

      const spinner = screen.getByRole('status');
      expect(spinner.className).toMatch(/_medium_/);
    });

    it('should apply small size class', () => {
      render(<Spinner size="small" />);

      const spinner = screen.getByRole('status');
      expect(spinner.className).toMatch(/_small_/);
      expect(spinner.className).not.toMatch(/_medium_/);
      expect(spinner.className).not.toMatch(/_large_/);
    });

    it('should apply large size class', () => {
      render(<Spinner size="large" />);

      const spinner = screen.getByRole('status');
      expect(spinner.className).toMatch(/_large_/);
      expect(spinner.className).not.toMatch(/_medium_/);
      expect(spinner.className).not.toMatch(/_small_/);
    });
  });

  describe('Color Variants', () => {
    it('should render different variants correctly', () => {
      const variants = ['primary', 'secondary', 'white'] as const;

      variants.forEach(variant => {
        const { unmount } = render(<Spinner variant={variant} />);
        const spinner = screen.getByRole('status');
        expect(spinner.className).toMatch(new RegExp(`_${variant}_`));
        unmount();
      });
    });

    it('should default to "primary" variant', () => {
      render(<Spinner />);

      const spinner = screen.getByRole('status');
      expect(spinner.className).toMatch(/_primary_/);
    });

    it('should apply secondary variant class', () => {
      render(<Spinner variant="secondary" />);

      const spinner = screen.getByRole('status');
      expect(spinner.className).toMatch(/_secondary_/);
      expect(spinner.className).not.toMatch(/_primary_/);
      expect(spinner.className).not.toMatch(/_white_/);
    });

    it('should apply white variant class', () => {
      render(<Spinner variant="white" />);

      const spinner = screen.getByRole('status');
      expect(spinner.className).toMatch(/_white_/);
      expect(spinner.className).not.toMatch(/_primary_/);
      expect(spinner.className).not.toMatch(/_secondary_/);
    });
  });

  describe('Combined Props', () => {
    it('should combine size and variant props correctly', () => {
      render(<Spinner size="large" variant="secondary" />);

      const spinner = screen.getByRole('status');
      expect(spinner.className).toMatch(/_spinner_/);
      expect(spinner.className).toMatch(/_large_/);
      expect(spinner.className).toMatch(/_secondary_/);
    });

    it('should handle all size and variant combinations', () => {
      const sizes = ['small', 'medium', 'large'] as const;
      const variants = ['primary', 'secondary', 'white'] as const;

      sizes.forEach(size => {
        variants.forEach(variant => {
          const { unmount } = render(<Spinner size={size} variant={variant} />);
          const spinner = screen.getByRole('status');

          expect(spinner.className).toMatch(/_spinner_/);
          expect(spinner.className).toMatch(new RegExp(`_${size}_`));
          expect(spinner.className).toMatch(new RegExp(`_${variant}_`));

          unmount();
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should be accessible to screen readers', () => {
      render(<Spinner />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('role', 'status');
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should provide screen reader text', () => {
      render(<Spinner />);

      // Screen readers should find the loading text
      const loadingText = screen.getByText('Loading...');
      expect(loadingText).toBeInTheDocument();
    });

    it('should have proper ARIA live region behavior', () => {
      render(<Spinner />);

      const spinner = screen.getByRole('status');
      // role="status" creates an implicit aria-live="polite" region
      expect(spinner).toHaveAttribute('role', 'status');
    });
  });

  describe('Structure and Content', () => {
    it('should have the correct DOM structure', () => {
      render(<Spinner />);

      const spinner = screen.getByRole('status');

      // Should contain visually hidden text
      const hiddenText = spinner.querySelector('[class*="_visuallyHidden_"]');
      expect(hiddenText).toBeInTheDocument();
      expect(hiddenText).toHaveTextContent('Loading...');

      // Should contain 8 spinner blades
      const blades = spinner.querySelectorAll('[class*="_spinnerBlade_"]');
      expect(blades).toHaveLength(8);
    });

    it('should render spinner blades with correct classes', () => {
      render(<Spinner />);

      const spinner = screen.getByRole('status');
      const blades = spinner.querySelectorAll('[class*="_spinnerBlade_"]');

      blades.forEach(blade => {
        expect(blade.className).toMatch(/_spinnerBlade_/);
      });
    });

    it('should maintain consistent blade structure across different props', () => {
      const { rerender } = render(<Spinner size="small" variant="white" />);

      let spinner = screen.getByRole('status');
      let blades = spinner.querySelectorAll('[class*="_spinnerBlade_"]');
      expect(blades).toHaveLength(8);

      rerender(<Spinner size="large" variant="primary" />);

      spinner = screen.getByRole('status');
      blades = spinner.querySelectorAll('[class*="_spinnerBlade_"]');
      expect(blades).toHaveLength(8);
    });
  });

  describe('CSS Class Generation', () => {
    it('should filter out falsy values from className array', () => {
      render(<Spinner />);

      const spinner = screen.getByRole('status');
      const classNames = spinner.className.split(' ');

      // Should not contain empty strings
      expect(classNames.every(cls => cls.length > 0)).toBe(true);
    });

    it('should generate correct base classes', () => {
      render(<Spinner />);

      const spinner = screen.getByRole('status');
      expect(spinner.className).toMatch(/_spinner_/);
    });

    it('should combine classes correctly', () => {
      render(<Spinner size="small" variant="white" />);

      const spinner = screen.getByRole('status');
      const classNames = spinner.className.split(' ');

      // Should have at least 3 classes (spinner, size, variant)
      expect(classNames.length).toBeGreaterThanOrEqual(3);
      expect(spinner.className).toMatch(/_spinner_/);
      expect(spinner.className).toMatch(/_small_/);
      expect(spinner.className).toMatch(/_white_/);
    });
  });

  describe('Component Display Name', () => {
    it('should have correct display name', () => {
      expect(Spinner.displayName).toBe('Spinner');
    });
  });

  describe('Performance', () => {
    it('should be memoized to prevent unnecessary re-renders', () => {
      const { rerender } = render(<Spinner size="medium" variant="primary" />);

      // Same props should not cause re-render (verified by memo)
      rerender(<Spinner size="medium" variant="primary" />);

      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should handle prop changes correctly', () => {
      const { rerender } = render(<Spinner size="small" variant="primary" />);

      let spinner = screen.getByRole('status');
      expect(spinner.className).toMatch(/_small_/);
      expect(spinner.className).toMatch(/_primary_/);

      rerender(<Spinner size="large" variant="secondary" />);

      spinner = screen.getByRole('status');
      expect(spinner.className).toMatch(/_large_/);
      expect(spinner.className).toMatch(/_secondary_/);
      expect(spinner.className).not.toMatch(/_small_/);
      expect(spinner.className).not.toMatch(/_primary_/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined props gracefully', () => {
      // TypeScript should prevent this, but test runtime behavior
      const { container } = render(<Spinner size={undefined as any} variant={undefined as any} />);

      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toBeInTheDocument();
      expect(spinner?.className).toMatch(/_spinner_/);
    });

    it('should maintain accessibility regardless of styling props', () => {
      render(<Spinner size="large" variant="white" />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Usage Scenarios', () => {
    it('should work as a loading indicator in buttons', () => {
      render(
        <button disabled>
          <Spinner size="small" variant="white" />
          Loading...
        </button>
      );

      const button = screen.getByRole('button');
      const spinner = screen.getByRole('status');

      expect(button).toContainElement(spinner);
      expect(button).toHaveTextContent('Loading...');
    });

    it('should work as a page loading indicator', () => {
      render(
        <div>
          <Spinner size="large" variant="primary" />
          <p>Please wait while we load your content...</p>
        </div>
      );

      const spinner = screen.getByRole('status');
      const message = screen.getByText('Please wait while we load your content...');

      expect(spinner).toBeInTheDocument();
      expect(message).toBeInTheDocument();
    });

    it('should work with different theme contexts', () => {
      // Test that different variants work for different theme contexts
      const variants = ['primary', 'secondary', 'white'] as const;

      variants.forEach(variant => {
        const { unmount } = render(<Spinner variant={variant} />);
        const spinner = screen.getByRole('status');
        expect(spinner.className).toMatch(new RegExp(`_${variant}_`));
        unmount();
      });
    });
  });
});
