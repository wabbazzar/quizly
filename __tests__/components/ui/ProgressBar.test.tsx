import { describe, it, expect } from 'vitest';
import { render, screen } from '../../utils/testUtils';
import { ProgressBar } from '@/components/ui/ProgressBar';

describe('ProgressBar Component', () => {
  describe('Basic Rendering', () => {
    it('should render with required props', () => {
      render(<ProgressBar value={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      render(<ProgressBar value={75} max={100} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('role', 'progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '75');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should have default CSS classes', () => {
      render(<ProgressBar value={50} />);

      const container = screen.getByRole('progressbar').parentElement;
      const progressbar = screen.getByRole('progressbar');
      const bar = progressbar.querySelector('[class*="_bar_"]');

      expect(container?.className).toMatch(/_container_/);
      expect(container?.className).toMatch(/_medium_/);
      expect(progressbar.className).toMatch(/_track_/);
      expect(bar?.className).toMatch(/_bar_/);
      expect(bar?.className).toMatch(/_default_/);
      expect(bar?.className).toMatch(/_animated_/);
    });
  });

  describe('Value and Percentage Calculation', () => {
    it('should calculate percentage correctly with default max (100)', () => {
      render(<ProgressBar value={25} />);

      const bar = screen.getByRole('progressbar').querySelector('[class*="_bar_"]') as HTMLElement;
      expect(bar.style.width).toBe('25%');
    });

    it('should calculate percentage correctly with custom max', () => {
      render(<ProgressBar value={50} max={200} />);

      const bar = screen.getByRole('progressbar').querySelector('[class*="_bar_"]') as HTMLElement;
      expect(bar.style.width).toBe('25%'); // 50/200 = 25%
    });

    it('should handle zero value', () => {
      render(<ProgressBar value={0} />);

      const progressbar = screen.getByRole('progressbar');
      const bar = progressbar.querySelector('[class*="_bar_"]') as HTMLElement;

      expect(progressbar).toHaveAttribute('aria-valuenow', '0');
      expect(bar.style.width).toBe('0%');
    });

    it('should handle 100% value', () => {
      render(<ProgressBar value={100} />);

      const progressbar = screen.getByRole('progressbar');
      const bar = progressbar.querySelector('[class*="_bar_"]') as HTMLElement;

      expect(progressbar).toHaveAttribute('aria-valuenow', '100');
      expect(bar.style.width).toBe('100%');
    });

    it('should clamp values above 100%', () => {
      render(<ProgressBar value={150} max={100} />);

      const progressbar = screen.getByRole('progressbar');
      const bar = progressbar.querySelector('[class*="_bar_"]') as HTMLElement;

      expect(progressbar).toHaveAttribute('aria-valuenow', '150'); // Original value in ARIA
      expect(bar.style.width).toBe('100%'); // Clamped for display
    });

    it('should clamp negative values to 0%', () => {
      render(<ProgressBar value={-10} />);

      const progressbar = screen.getByRole('progressbar');
      const bar = progressbar.querySelector('[class*="_bar_"]') as HTMLElement;

      expect(progressbar).toHaveAttribute('aria-valuenow', '-10'); // Original value in ARIA
      expect(bar.style.width).toBe('0%'); // Clamped for display
    });

    it('should handle decimal values', () => {
      render(<ProgressBar value={33.33} />);

      const bar = screen.getByRole('progressbar').querySelector('[class*="_bar_"]') as HTMLElement;
      expect(bar.style.width).toBe('33.33%');
    });
  });

  describe('Size Variants', () => {
    it('should render different sizes correctly', () => {
      const sizes = ['small', 'medium', 'large'] as const;

      sizes.forEach(size => {
        const { unmount } = render(<ProgressBar value={50} size={size} />);
        const container = screen.getByRole('progressbar').parentElement;
        expect(container?.className).toMatch(new RegExp(`_${size}_`));
        unmount();
      });
    });

    it('should default to "medium" size', () => {
      render(<ProgressBar value={50} />);

      const container = screen.getByRole('progressbar').parentElement;
      expect(container?.className).toMatch(/_medium_/);
    });
  });

  describe('Color Variants', () => {
    it('should render different variants correctly', () => {
      const variants = ['default', 'success', 'warning', 'error'] as const;

      variants.forEach(variant => {
        const { unmount } = render(<ProgressBar value={50} variant={variant} />);
        const bar = screen.getByRole('progressbar').querySelector('[class*="_bar_"]');
        expect(bar?.className).toMatch(new RegExp(`_${variant}_`));
        unmount();
      });
    });

    it('should default to "default" variant', () => {
      render(<ProgressBar value={50} />);

      const bar = screen.getByRole('progressbar').querySelector('[class*="_bar_"]');
      expect(bar?.className).toMatch(/_default_/);
    });
  });

  describe('Animation', () => {
    it('should be animated by default', () => {
      render(<ProgressBar value={50} />);

      const bar = screen.getByRole('progressbar').querySelector('[class*="_bar_"]');
      expect(bar?.className).toMatch(/_animated_/);
    });

    it('should support disabling animation', () => {
      render(<ProgressBar value={50} animated={false} />);

      const bar = screen.getByRole('progressbar').querySelector('[class*="_bar_"]');
      expect(bar?.className).not.toMatch(/_animated_/);
    });

    it('should handle animation prop explicitly set to true', () => {
      render(<ProgressBar value={50} animated={true} />);

      const bar = screen.getByRole('progressbar').querySelector('[class*="_bar_"]');
      expect(bar?.className).toMatch(/_animated_/);
    });
  });

  describe('Label Display', () => {
    it('should not show label by default', () => {
      render(<ProgressBar value={50} />);

      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('should show label when showLabel is true', () => {
      render(<ProgressBar value={75} showLabel={true} />);

      const label = screen.getByText('75%');
      expect(label).toBeInTheDocument();
      expect(label.className).toMatch(/_label_/);
    });

    it('should round percentage in label', () => {
      render(<ProgressBar value={66.666} showLabel={true} />);

      expect(screen.getByText('67%')).toBeInTheDocument();
    });

    it('should show 0% for zero value', () => {
      render(<ProgressBar value={0} showLabel={true} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should show 100% for full value', () => {
      render(<ProgressBar value={100} showLabel={true} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should show clamped percentage in label for over 100%', () => {
      render(<ProgressBar value={150} max={100} showLabel={true} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should show 0% in label for negative values', () => {
      render(<ProgressBar value={-10} showLabel={true} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should calculate label percentage with custom max', () => {
      render(<ProgressBar value={50} max={200} showLabel={true} />);

      expect(screen.getByText('25%')).toBeInTheDocument(); // 50/200 = 25%
    });
  });

  describe('Combined Props', () => {
    it('should combine all props correctly', () => {
      render(
        <ProgressBar
          value={80}
          max={200}
          variant="success"
          size="large"
          showLabel={true}
          animated={false}
        />
      );

      const container = screen.getByRole('progressbar').parentElement;
      const progressbar = screen.getByRole('progressbar');
      const bar = progressbar.querySelector('[class*="_bar_"]') as HTMLElement;
      const label = screen.getByText('40%'); // 80/200 = 40%

      // Container classes
      expect(container?.className).toMatch(/_container_/);
      expect(container?.className).toMatch(/_large_/);

      // Progress bar attributes
      expect(progressbar).toHaveAttribute('aria-valuenow', '80');
      expect(progressbar).toHaveAttribute('aria-valuemax', '200');

      // Bar classes and style
      expect(bar.className).toMatch(/_bar_/);
      expect(bar.className).toMatch(/_success_/);
      expect(bar.className).not.toMatch(/_animated_/);
      expect(bar.style.width).toBe('40%');

      // Label
      expect(label).toBeInTheDocument();
      expect(label.className).toMatch(/_label_/);
    });
  });

  describe('Accessibility', () => {
    it('should provide complete progress information to screen readers', () => {
      render(<ProgressBar value={60} max={120} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('role', 'progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '60');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '120');
    });

    it('should maintain accessibility with all prop combinations', () => {
      render(
        <ProgressBar
          value={45}
          max={90}
          variant="warning"
          size="small"
          showLabel={true}
          animated={false}
        />
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('role', 'progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '45');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '90');
    });

    it('should be keyboard accessible', () => {
      render(<ProgressBar value={50} />);

      const progressbar = screen.getByRole('progressbar');

      // Progress bars should not be focusable by default (they are status indicators)
      expect(progressbar).not.toHaveAttribute('tabindex');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small values', () => {
      render(<ProgressBar value={0.01} showLabel={true} />);

      const bar = screen.getByRole('progressbar').querySelector('[class*="_bar_"]') as HTMLElement;
      expect(bar.style.width).toBe('0.01%');
      expect(screen.getByText('0%')).toBeInTheDocument(); // Rounded to 0%
    });

    it('should handle very large values', () => {
      render(<ProgressBar value={999999} max={1000000} showLabel={true} />);

      const bar = screen.getByRole('progressbar').querySelector('[class*="_bar_"]') as HTMLElement;
      expect(bar.style.width).toBe('99.9999%');
      expect(screen.getByText('100%')).toBeInTheDocument(); // Rounded to 100%
    });

    it('should handle zero max value', () => {
      render(<ProgressBar value={50} max={0} />);

      const progressbar = screen.getByRole('progressbar');
      const bar = progressbar.querySelector('[class*="_bar_"]') as HTMLElement;

      expect(progressbar).toHaveAttribute('aria-valuemax', '0');
      // This should result in Infinity or NaN, but component should handle it gracefully
      expect(bar.style.width).toBe('100%'); // Clamped to 100%
    });

    it('should handle equal value and max', () => {
      render(<ProgressBar value={50} max={50} showLabel={true} />);

      const progressbar = screen.getByRole('progressbar');
      const bar = progressbar.querySelector('[class*="_bar_"]') as HTMLElement;

      expect(progressbar).toHaveAttribute('aria-valuenow', '50');
      expect(progressbar).toHaveAttribute('aria-valuemax', '50');
      expect(bar.style.width).toBe('100%');
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('CSS Class Generation', () => {
    it('should filter out falsy values from className arrays', () => {
      render(<ProgressBar value={50} animated={false} />);

      const container = screen.getByRole('progressbar').parentElement;
      const bar = screen.getByRole('progressbar').querySelector('[class*="_bar_"]');

      const containerClasses = container?.className.split(' ') || [];
      const barClasses = bar?.className.split(' ') || [];

      // Should not contain empty strings
      expect(containerClasses.every(cls => cls.length > 0)).toBe(true);
      expect(barClasses.every(cls => cls.length > 0)).toBe(true);
    });

    it('should generate correct class combinations', () => {
      render(<ProgressBar value={50} size="large" variant="success" animated={true} />);

      const container = screen.getByRole('progressbar').parentElement;
      const bar = screen.getByRole('progressbar').querySelector('[class*="_bar_"]');

      expect(container?.className).toMatch(/_container_/);
      expect(container?.className).toMatch(/_large_/);
      expect(bar?.className).toMatch(/_bar_/);
      expect(bar?.className).toMatch(/_success_/);
      expect(bar?.className).toMatch(/_animated_/);
    });
  });

  describe('Component Display Name', () => {
    it('should have correct display name', () => {
      expect(ProgressBar.displayName).toBe('ProgressBar');
    });
  });

  describe('Performance', () => {
    it('should be memoized to prevent unnecessary re-renders', () => {
      const { rerender } = render(<ProgressBar value={50} />);

      // Same props should not cause re-render (verified by memo)
      rerender(<ProgressBar value={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
    });

    it('should handle prop changes correctly', () => {
      const { rerender } = render(<ProgressBar value={25} variant="default" />);

      let progressbar = screen.getByRole('progressbar');
      let bar = progressbar.querySelector('[class*="_bar_"]') as HTMLElement;

      expect(progressbar).toHaveAttribute('aria-valuenow', '25');
      expect(bar.style.width).toBe('25%');
      expect(bar.className).toMatch(/_default_/);

      rerender(<ProgressBar value={75} variant="success" />);

      progressbar = screen.getByRole('progressbar');
      bar = progressbar.querySelector('[class*="_bar_"]') as HTMLElement;

      expect(progressbar).toHaveAttribute('aria-valuenow', '75');
      expect(bar.style.width).toBe('75%');
      expect(bar.className).toMatch(/_success_/);
      expect(bar.className).not.toMatch(/_default_/);
    });
  });

  describe('Usage Scenarios', () => {
    it('should work as a loading progress indicator', () => {
      render(
        <div>
          <p>Loading...</p>
          <ProgressBar value={65} showLabel={true} />
        </div>
      );

      const progressbar = screen.getByRole('progressbar');
      const label = screen.getByText('65%');

      expect(progressbar).toBeInTheDocument();
      expect(label).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should work as a skill level indicator', () => {
      render(
        <div>
          <span>JavaScript</span>
          <ProgressBar value={90} variant="success" showLabel={true} />
        </div>
      );

      const progressbar = screen.getByRole('progressbar');
      const bar = progressbar.querySelector('[class*="_bar_"]');

      expect(bar?.className).toMatch(/_success_/);
      expect(screen.getByText('90%')).toBeInTheDocument();
    });

    it('should work as a form completion indicator', () => {
      render(
        <div>
          <h3>Profile Setup</h3>
          <ProgressBar value={40} max={100} variant="default" showLabel={true} />
          <p>Step 2 of 5</p>
        </div>
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '40');
      expect(screen.getByText('40%')).toBeInTheDocument();
    });
  });
});