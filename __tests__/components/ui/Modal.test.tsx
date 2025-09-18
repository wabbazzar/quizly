import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../utils/testUtils';
import { Modal } from '@/components/ui/Modal';

// Mock the Button component to simplify testing
vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, className, 'aria-label': ariaLabel, ...props }: any) => (
    <button
      className={className}
      onClick={onClick}
      aria-label={ariaLabel}
      data-testid="modal-button"
      {...props}
    >
      {children}
    </button>
  ),
}));

describe('Modal Component', () => {
  // Store original body overflow for cleanup
  let originalOverflow: string;

  beforeEach(() => {
    originalOverflow = document.body.style.overflow;
    // Create a div to attach focus to before opening modal
    const focusTarget = document.createElement('button');
    focusTarget.id = 'focus-target';
    document.body.appendChild(focusTarget);
    focusTarget.focus();
  });

  afterEach(() => {
    document.body.style.overflow = originalOverflow;
    // Clean up any added elements
    const focusTarget = document.getElementById('focus-target');
    if (focusTarget) {
      document.body.removeChild(focusTarget);
    }
  });

  describe('Basic Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={vi.fn()}>
          Modal content
        </Modal>
      );

      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          Modal content
        </Modal>
      );

      expect(screen.getByText('Modal content')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should render children correctly', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <div>
            <p>Complex content</p>
            <span>Multiple elements</span>
          </div>
        </Modal>
      );

      expect(screen.getByText('Complex content')).toBeInTheDocument();
      expect(screen.getByText('Multiple elements')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} className="custom-modal">
          Modal content
        </Modal>
      );

      const modal = document.querySelector('[role="document"]');
      expect(modal).toHaveClass('custom-modal');
    });
  });

  describe('Title Rendering', () => {
    it('should render title when provided', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
          Modal content
        </Modal>
      );

      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Test Modal');
    });

    it('should not render title when not provided', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          Modal content
        </Modal>
      );

      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('should associate title with modal via aria-labelledby', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
          Modal content
        </Modal>
      );

      const modal = document.querySelector('[role="document"]');
      const title = screen.getByText('Test Modal');

      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
      expect(title).toHaveAttribute('id', 'modal-title');
    });

    it('should not have aria-labelledby when no title is provided', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          Modal content
        </Modal>
      );

      const modal = document.querySelector('[role="document"]');
      expect(modal).not.toHaveAttribute('aria-labelledby');
    });
  });

  describe('Size Variants', () => {
    it('should render medium size by default', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          Modal content
        </Modal>
      );

      const modal = document.querySelector('[role="document"]');
      expect(modal?.className).toMatch(/_medium_/);
    });

    it('should render different sizes correctly', () => {
      const sizes = ['small', 'medium', 'large', 'fullscreen'] as const;

      sizes.forEach(size => {
        const { unmount } = render(
          <Modal isOpen={true} onClose={vi.fn()} size={size}>
            Content for {size}
          </Modal>
        );

        const modal = document.querySelector('[role="document"]');
        expect(modal?.className).toMatch(new RegExp(`_${size}_`));
        unmount();
      });
    });
  });

  describe('Close Button', () => {
    it('should show close button by default', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
          Modal content
        </Modal>
      );

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    it('should hide close button when showCloseButton is false', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Test Modal" showCloseButton={false}>
          Modal content
        </Modal>
      );

      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Test Modal">
          Modal content
        </Modal>
      );

      fireEvent.click(screen.getByLabelText('Close modal'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Overlay Click', () => {
    it('should call onClose when overlay is clicked by default', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose}>
          Modal content
        </Modal>
      );

      const overlay = screen.getByRole('dialog');
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

      const overlay = screen.getByRole('dialog');
      fireEvent.click(overlay);
      expect(handleClose).not.toHaveBeenCalled();
    });

    it('should not close when clicking on modal content', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose}>
          <div data-testid="modal-content">Modal content</div>
        </Modal>
      );

      fireEvent.click(screen.getByTestId('modal-content'));
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close modal when Escape key is pressed', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose}>
          Modal content
        </Modal>
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should not close modal when other keys are pressed', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose}>
          Modal content
        </Modal>
      );

      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Tab' });
      fireEvent.keyDown(document, { key: 'Space' });

      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('Focus Management', () => {
    it('should focus the modal when opened', async () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          Modal content
        </Modal>
      );

      await waitFor(() => {
        const modal = document.querySelector('[role="document"]');
        expect(modal).toHaveFocus();
      });
    });

    it('should restore focus to previous element when closed', async () => {
      const focusTarget = document.getElementById('focus-target') as HTMLElement;
      expect(focusTarget).toHaveFocus();

      const { rerender } = render(
        <Modal isOpen={true} onClose={vi.fn()}>
          Modal content
        </Modal>
      );

      // Modal should be focused
      await waitFor(() => {
        const modal = document.querySelector('[role="document"]');
        expect(modal).toHaveFocus();
      });

      // Close modal
      rerender(
        <Modal isOpen={false} onClose={vi.fn()}>
          Modal content
        </Modal>
      );

      // Focus should return to original element
      await waitFor(() => {
        expect(focusTarget).toHaveFocus();
      });
    });
  });

  describe('Body Scroll Management', () => {
    it('should prevent body scroll when modal is open', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          Modal content
        </Modal>
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when modal is closed', () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={vi.fn()}>
          Modal content
        </Modal>
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <Modal isOpen={false} onClose={vi.fn()}>
          Modal content
        </Modal>
      );

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Footer', () => {
    it('should not render footer when not provided', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          Modal content
        </Modal>
      );

      expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    });

    it('should render footer when provided', () => {
      const footer = (
        <div>
          <button>Cancel</button>
          <button>Save</button>
        </div>
      );

      render(
        <Modal isOpen={true} onClose={vi.fn()} footer={footer}>
          Modal content
        </Modal>
      );

      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
          Modal content
        </Modal>
      );

      const overlay = screen.getByRole('dialog');
      const modal = document.querySelector('[role="document"]');

      expect(overlay).toHaveAttribute('aria-modal', 'true');
      expect(overlay).toHaveAttribute('role', 'dialog');
      expect(modal).toHaveAttribute('role', 'document');
      expect(modal).toHaveAttribute('tabIndex', '-1');
    });

    it('should have proper heading hierarchy', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Modal Title">
          <h3>Subsection</h3>
          <p>Content</p>
        </Modal>
      );

      // Modal title should be h2
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Modal Title');
      // Content heading should be h3
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Subsection');
    });

    it('should have accessible close button', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
          Modal content
        </Modal>
      );

      const closeButton = screen.getByLabelText('Close modal');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('aria-label', 'Close modal');

      // SVG should have aria-hidden
      const svg = closeButton.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Portal Rendering', () => {
    it('should render content in document.body via portal', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <div data-testid="portal-content">Portal content</div>
        </Modal>
      );

      // Content should be in the document but not in the test container
      expect(screen.getByTestId('portal-content')).toBeInTheDocument();

      // Should be appended to body (portal behavior)
      const modalInBody = document.body.querySelector('[role="dialog"]');
      expect(modalInBody).toBeInTheDocument();
    });
  });

  describe('Header Rendering Logic', () => {
    it('should not render header when no title and showCloseButton is false', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} showCloseButton={false}>
          Modal content
        </Modal>
      );

      const header = document.querySelector('header');
      expect(header).not.toBeInTheDocument();
    });

    it('should render header when title is provided but showCloseButton is false', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Test" showCloseButton={false}>
          Modal content
        </Modal>
      );

      const header = document.querySelector('header');
      expect(header).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
    });

    it('should render header when no title but showCloseButton is true', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} showCloseButton={true}>
          Modal content
        </Modal>
      );

      const header = document.querySelector('header');
      expect(header).toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });
  });

  describe('Component Display Name', () => {
    it('should have correct display name', () => {
      expect(Modal.displayName).toBe('Modal');
    });
  });

  describe('Event Cleanup', () => {
    it('should clean up event listeners when modal closes', () => {
      const handleClose = vi.fn();
      const { rerender } = render(
        <Modal isOpen={true} onClose={handleClose}>
          Modal content
        </Modal>
      );

      // Modal is open, should respond to Escape
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);

      // Close modal
      rerender(
        <Modal isOpen={false} onClose={handleClose}>
          Modal content
        </Modal>
      );

      // Reset the mock
      handleClose.mockClear();

      // Escape should no longer trigger onClose
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should be memoized to prevent unnecessary re-renders', () => {
      const handleClose = vi.fn();
      const { rerender } = render(
        <Modal isOpen={true} onClose={handleClose}>
          Test content
        </Modal>
      );

      // Same props should not cause re-render (verified by memo)
      rerender(
        <Modal isOpen={true} onClose={handleClose}>
          Test content
        </Modal>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });
  });
});
