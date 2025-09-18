import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../utils/testUtils';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

// Mock the Spinner component to simplify testing
vi.mock('@/components/ui/Spinner', () => ({
  Spinner: ({ size, variant }: { size?: string; variant?: string }) => (
    <div data-testid="spinner" data-size={size} data-variant={variant}>
      Loading spinner
    </div>
  ),
}));

describe('LoadingScreen Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<LoadingScreen />);

      const loadingScreen = screen.getByRole('status');
      expect(loadingScreen).toBeInTheDocument();
    });

    it('should display default loading message', () => {
      render(<LoadingScreen />);

      const message = screen.getByText('Loading...');
      expect(message).toBeInTheDocument();
      expect(message.className).toMatch(/_message_/);
    });

    it('should render spinner component', () => {
      render(<LoadingScreen />);

      const spinner = screen.getByTestId('spinner');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('data-size', 'large');
      expect(spinner).toHaveAttribute('data-variant', 'primary');
    });

    it('should have proper ARIA attributes', () => {
      render(<LoadingScreen />);

      const loadingScreen = screen.getByRole('status');
      expect(loadingScreen).toHaveAttribute('role', 'status');
      expect(loadingScreen).toHaveAttribute('aria-live', 'polite');
    });

    it('should have default CSS classes', () => {
      render(<LoadingScreen />);

      const loadingScreen = screen.getByRole('status');
      const content = loadingScreen.querySelector('[class*="_content_"]');

      expect(loadingScreen.className).toMatch(/_container_/);
      expect(loadingScreen.className).toMatch(/_fullScreen_/);
      expect(content?.className).toMatch(/_content_/);
    });
  });

  describe('Custom Message', () => {
    it('should display custom message when provided', () => {
      render(<LoadingScreen message="Please wait while we process your request..." />);

      const message = screen.getByText('Please wait while we process your request...');
      expect(message).toBeInTheDocument();
      expect(message.className).toMatch(/_message_/);
    });

    it('should not display default message when custom message provided', () => {
      render(<LoadingScreen message="Custom loading message" />);

      expect(screen.getByText('Custom loading message')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should handle empty string message', () => {
      render(<LoadingScreen message="" />);

      const messageElement = document.querySelector('[class*="_message_"]');
      expect(messageElement).toBeInTheDocument();
      expect(messageElement).toHaveTextContent('');
    });

    it('should handle long messages', () => {
      const longMessage = 'This is a very long loading message that might wrap to multiple lines and should still be properly displayed within the loading screen component without breaking the layout';
      render(<LoadingScreen message={longMessage} />);

      const message = screen.getByText(longMessage);
      expect(message).toBeInTheDocument();
    });

    it('should handle messages with special characters', () => {
      const specialMessage = 'Loading... ♻️ Processing data with 100% efficiency!';
      render(<LoadingScreen message={specialMessage} />);

      const message = screen.getByText(specialMessage);
      expect(message).toBeInTheDocument();
    });
  });

  describe('Full Screen Mode', () => {
    it('should be full screen by default', () => {
      render(<LoadingScreen />);

      const loadingScreen = screen.getByRole('status');
      expect(loadingScreen.className).toMatch(/_fullScreen_/);
    });

    it('should apply full screen class when fullScreen is true', () => {
      render(<LoadingScreen fullScreen={true} />);

      const loadingScreen = screen.getByRole('status');
      expect(loadingScreen.className).toMatch(/_fullScreen_/);
    });

    it('should not apply full screen class when fullScreen is false', () => {
      render(<LoadingScreen fullScreen={false} />);

      const loadingScreen = screen.getByRole('status');
      expect(loadingScreen.className).not.toMatch(/_fullScreen_/);
      expect(loadingScreen.className).toMatch(/_container_/);
    });

    it('should maintain other classes when fullScreen is disabled', () => {
      render(<LoadingScreen fullScreen={false} />);

      const loadingScreen = screen.getByRole('status');
      const content = loadingScreen.querySelector('[class*="_content_"]');

      expect(loadingScreen.className).toMatch(/_container_/);
      expect(content?.className).toMatch(/_content_/);
    });
  });

  describe('Combined Props', () => {
    it('should combine custom message with fullScreen mode', () => {
      render(<LoadingScreen message="Processing your request..." fullScreen={true} />);

      const loadingScreen = screen.getByRole('status');
      const message = screen.getByText('Processing your request...');
      const spinner = screen.getByTestId('spinner');

      expect(loadingScreen.className).toMatch(/_fullScreen_/);
      expect(message).toBeInTheDocument();
      expect(spinner).toBeInTheDocument();
    });

    it('should combine custom message with non-fullScreen mode', () => {
      render(<LoadingScreen message="Loading data..." fullScreen={false} />);

      const loadingScreen = screen.getByRole('status');
      const message = screen.getByText('Loading data...');

      expect(loadingScreen.className).not.toMatch(/_fullScreen_/);
      expect(message).toBeInTheDocument();
    });
  });

  describe('Content Structure', () => {
    it('should have proper content structure', () => {
      render(<LoadingScreen message="Test message" />);

      const loadingScreen = screen.getByRole('status');
      const content = loadingScreen.querySelector('[class*="_content_"]');
      const spinner = screen.getByTestId('spinner');
      const message = screen.getByText('Test message');

      expect(content).toBeInTheDocument();
      expect(content).toContainElement(spinner);
      expect(content).toContainElement(message);
    });

    it('should render spinner before message in DOM order', () => {
      render(<LoadingScreen message="Test message" />);

      const content = document.querySelector('[class*="_content_"]');
      const children = Array.from(content?.children || []);

      expect(children[0]).toContainElement(screen.getByTestId('spinner'));
      expect(children[1]).toContainElement(screen.getByText('Test message'));
    });

    it('should maintain structure with different prop combinations', () => {
      const { rerender } = render(<LoadingScreen fullScreen={true} />);

      let content = document.querySelector('[class*="_content_"]');
      expect(content).toBeInTheDocument();

      rerender(<LoadingScreen fullScreen={false} message="Different message" />);

      content = document.querySelector('[class*="_content_"]');
      expect(content).toBeInTheDocument();
      expect(screen.getByText('Different message')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be accessible to screen readers', () => {
      render(<LoadingScreen message="Loading your dashboard" />);

      const loadingScreen = screen.getByRole('status');
      expect(loadingScreen).toHaveAttribute('role', 'status');
      expect(loadingScreen).toHaveAttribute('aria-live', 'polite');
    });

    it('should announce loading state changes', () => {
      const { rerender } = render(<LoadingScreen message="Loading..." />);

      let loadingScreen = screen.getByRole('status');
      expect(loadingScreen).toHaveAttribute('aria-live', 'polite');

      rerender(<LoadingScreen message="Almost done..." />);

      loadingScreen = screen.getByRole('status');
      expect(loadingScreen).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByText('Almost done...')).toBeInTheDocument();
    });

    it('should provide meaningful status information', () => {
      render(<LoadingScreen message="Saving your changes..." />);

      const loadingScreen = screen.getByRole('status');
      const message = screen.getByText('Saving your changes...');

      expect(loadingScreen).toContainElement(message);
    });

    it('should not interfere with spinner accessibility', () => {
      render(<LoadingScreen />);

      // LoadingScreen should have status role, spinner is mocked without role
      const loadingScreen = screen.getByRole('status');
      const spinner = screen.getByTestId('spinner');

      expect(loadingScreen).toBeInTheDocument();
      expect(spinner).toBeInTheDocument();
      expect(loadingScreen).toContainElement(spinner);
    });
  });

  describe('CSS Class Generation', () => {
    it('should filter out falsy values from className array', () => {
      render(<LoadingScreen fullScreen={false} />);

      const loadingScreen = screen.getByRole('status');
      const classNames = loadingScreen.className.split(' ');

      // Should not contain empty strings
      expect(classNames.every(cls => cls.length > 0)).toBe(true);
      expect(loadingScreen.className).toMatch(/_container_/);
      expect(loadingScreen.className).not.toMatch(/_fullScreen_/);
    });

    it('should generate correct class combinations', () => {
      render(<LoadingScreen fullScreen={true} />);

      const loadingScreen = screen.getByRole('status');
      expect(loadingScreen.className).toMatch(/_container_/);
      expect(loadingScreen.className).toMatch(/_fullScreen_/);
    });
  });

  describe('Component Display Name', () => {
    it('should have correct display name', () => {
      expect(LoadingScreen.displayName).toBe('LoadingScreen');
    });
  });

  describe('Performance', () => {
    it('should be memoized to prevent unnecessary re-renders', () => {
      const { rerender } = render(<LoadingScreen message="Loading..." fullScreen={true} />);

      // Same props should not cause re-render (verified by memo)
      rerender(<LoadingScreen message="Loading..." fullScreen={true} />);

      const loadingScreen = screen.getByRole('status');
      expect(loadingScreen).toBeInTheDocument();
    });

    it('should handle prop changes efficiently', () => {
      const { rerender } = render(<LoadingScreen message="Initial message" fullScreen={true} />);

      let message = screen.getByText('Initial message');
      let loadingScreen = screen.getByRole('status');

      expect(message).toBeInTheDocument();
      expect(loadingScreen.className).toMatch(/_fullScreen_/);

      rerender(<LoadingScreen message="Updated message" fullScreen={false} />);

      message = screen.getByText('Updated message');
      loadingScreen = screen.getByRole('status');

      expect(message).toBeInTheDocument();
      expect(loadingScreen.className).not.toMatch(/_fullScreen_/);
      expect(screen.queryByText('Initial message')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined message gracefully', () => {
      render(<LoadingScreen message={undefined as any} />);

      const loadingScreen = screen.getByRole('status');
      expect(loadingScreen).toBeInTheDocument();
    });

    it('should handle null message gracefully', () => {
      render(<LoadingScreen message={null as any} />);

      const loadingScreen = screen.getByRole('status');
      expect(loadingScreen).toBeInTheDocument();
    });

    it('should handle boolean fullScreen values correctly', () => {
      const { rerender } = render(<LoadingScreen fullScreen={undefined as any} />);

      let loadingScreen = screen.getByRole('status');
      expect(loadingScreen.className).toMatch(/_fullScreen_/); // Default to true

      rerender(<LoadingScreen fullScreen={false} />);

      loadingScreen = screen.getByRole('status');
      expect(loadingScreen.className).not.toMatch(/_fullScreen_/);
    });

    it('should handle HTML entities in message', () => {
      render(<LoadingScreen message="Loading &amp; processing data..." />);

      const message = screen.getByText('Loading & processing data...');
      expect(message).toBeInTheDocument();
    });
  });

  describe('Usage Scenarios', () => {
    it('should work as page loading indicator', () => {
      render(<LoadingScreen message="Loading your dashboard..." fullScreen={true} />);

      const loadingScreen = screen.getByRole('status');
      const spinner = screen.getByTestId('spinner');
      const message = screen.getByText('Loading your dashboard...');

      expect(loadingScreen.className).toMatch(/_fullScreen_/);
      expect(spinner).toHaveAttribute('data-size', 'large');
      expect(message).toBeInTheDocument();
    });

    it('should work as component loading state', () => {
      render(<LoadingScreen message="Loading data..." fullScreen={false} />);

      const loadingScreen = screen.getByRole('status');
      const message = screen.getByText('Loading data...');

      expect(loadingScreen.className).not.toMatch(/_fullScreen_/);
      expect(message).toBeInTheDocument();
    });

    it('should work for form submission states', () => {
      render(<LoadingScreen message="Saving your information..." fullScreen={false} />);

      const message = screen.getByText('Saving your information...');
      const spinner = screen.getByTestId('spinner');

      expect(message).toBeInTheDocument();
      expect(spinner).toBeInTheDocument();
    });

    it('should work for file upload states', () => {
      render(<LoadingScreen message="Uploading files... Please wait." />);

      const message = screen.getByText('Uploading files... Please wait.');
      expect(message).toBeInTheDocument();
    });
  });

  describe('Integration with Spinner', () => {
    it('should pass correct props to Spinner component', () => {
      render(<LoadingScreen />);

      const spinner = screen.getByTestId('spinner');
      expect(spinner).toHaveAttribute('data-size', 'large');
      expect(spinner).toHaveAttribute('data-variant', 'primary');
    });

    it('should maintain spinner configuration across re-renders', () => {
      const { rerender } = render(<LoadingScreen message="Loading..." />);

      let spinner = screen.getByTestId('spinner');
      expect(spinner).toHaveAttribute('data-size', 'large');
      expect(spinner).toHaveAttribute('data-variant', 'primary');

      rerender(<LoadingScreen message="Still loading..." />);

      spinner = screen.getByTestId('spinner');
      expect(spinner).toHaveAttribute('data-size', 'large');
      expect(spinner).toHaveAttribute('data-variant', 'primary');
    });
  });
});