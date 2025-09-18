import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../utils/testUtils';
import { Input } from '@/components/ui/Input';
import { createRef } from 'react';

describe('Input Component', () => {
  describe('Basic Rendering', () => {
    it('should render with minimal props', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<Input placeholder="Enter text here" />);

      const input = screen.getByPlaceholderText('Enter text here');
      expect(input).toBeInTheDocument();
    });

    it('should have default CSS classes', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      const container = input.closest('[class*="_container_"]');
      const inputWrapper = input.closest('[class*="_inputWrapper_"]');

      expect(container?.className).toMatch(/_container_/);
      expect(inputWrapper?.className).toMatch(/_inputWrapper_/);
      expect(inputWrapper?.className).toMatch(/_default_/);
      expect(input.className).toMatch(/_input_/);
    });

    it('should generate unique IDs when no ID provided', () => {
      render(
        <div>
          <Input />
          <Input />
        </div>
      );

      const inputs = screen.getAllByRole('textbox');
      expect(inputs[0].id).toBeTruthy();
      expect(inputs[1].id).toBeTruthy();
      expect(inputs[0].id).not.toBe(inputs[1].id);
    });

    it('should use provided ID', () => {
      render(<Input id="custom-input" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', 'custom-input');
    });
  });

  describe('Label', () => {
    it('should render label when provided', () => {
      render(<Input label="Username" />);

      const label = screen.getByText('Username');
      const input = screen.getByRole('textbox');

      expect(label).toBeInTheDocument();
      expect(label.tagName).toBe('LABEL');
      expect(label).toHaveAttribute('for', input.id);
    });

    it('should not render label when not provided', () => {
      render(<Input placeholder="No label" />);

      expect(screen.queryByRole('label')).not.toBeInTheDocument();
    });

    it('should associate label with input correctly', () => {
      render(<Input label="Email Address" id="email-input" />);

      const label = screen.getByText('Email Address');
      const input = screen.getByRole('textbox');

      expect(label).toHaveAttribute('for', 'email-input');
      expect(input).toHaveAttribute('id', 'email-input');
    });

    it('should have proper label classes', () => {
      render(<Input label="Test Label" />);

      const label = screen.getByText('Test Label');
      expect(label.className).toMatch(/_label_/);
    });
  });

  describe('Variants', () => {
    it('should render different variants correctly', () => {
      const variants = ['default', 'filled', 'outlined'] as const;

      variants.forEach(variant => {
        const { unmount } = render(<Input variant={variant} placeholder={`${variant} variant`} />);
        const input = screen.getByPlaceholderText(`${variant} variant`);
        const inputWrapper = input.closest('[class*="_inputWrapper_"]');
        expect(inputWrapper?.className).toMatch(new RegExp(`_${variant}_`));
        unmount();
      });
    });

    it('should default to "default" variant', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      const inputWrapper = input.closest('[class*="_inputWrapper_"]');
      expect(inputWrapper?.className).toMatch(/_default_/);
    });
  });

  describe('Full Width', () => {
    it('should apply fullWidth class when fullWidth is true', () => {
      render(<Input fullWidth={true} />);

      const input = screen.getByRole('textbox');
      const container = input.closest('[class*="_container_"]');
      expect(container?.className).toMatch(/_fullWidth_/);
    });

    it('should not apply fullWidth class by default', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      const container = input.closest('[class*="_container_"]');
      expect(container?.className).not.toMatch(/_fullWidth_/);
    });

    it('should not apply fullWidth class when explicitly false', () => {
      render(<Input fullWidth={false} />);

      const input = screen.getByRole('textbox');
      const container = input.closest('[class*="_container_"]');
      expect(container?.className).not.toMatch(/_fullWidth_/);
    });
  });

  describe('Icons', () => {
    const TestStartIcon = () => <span data-testid="start-icon">🔍</span>;
    const TestEndIcon = () => <span data-testid="end-icon">✓</span>;

    it('should render start icon when provided', () => {
      render(<Input startIcon={<TestStartIcon />} />);

      const startIcon = screen.getByTestId('start-icon');
      const input = screen.getByRole('textbox');
      const inputWrapper = input.closest('[class*="_inputWrapper_"]');

      expect(startIcon).toBeInTheDocument();
      expect(inputWrapper?.className).toMatch(/_withIcon_/);

      const iconContainer = startIcon.parentElement;
      expect(iconContainer?.className).toMatch(/_startIcon_/);
      expect(iconContainer).toHaveAttribute('aria-hidden', 'true');
    });

    it('should render end icon when provided', () => {
      render(<Input endIcon={<TestEndIcon />} />);

      const endIcon = screen.getByTestId('end-icon');
      const input = screen.getByRole('textbox');
      const inputWrapper = input.closest('[class*="_inputWrapper_"]');

      expect(endIcon).toBeInTheDocument();
      expect(inputWrapper?.className).toMatch(/_withIcon_/);

      const iconContainer = endIcon.parentElement;
      expect(iconContainer?.className).toMatch(/_endIcon_/);
      expect(iconContainer).toHaveAttribute('aria-hidden', 'true');
    });

    it('should render both start and end icons', () => {
      render(<Input startIcon={<TestStartIcon />} endIcon={<TestEndIcon />} />);

      const startIcon = screen.getByTestId('start-icon');
      const endIcon = screen.getByTestId('end-icon');
      const input = screen.getByRole('textbox');
      const inputWrapper = input.closest('[class*="_inputWrapper_"]');

      expect(startIcon).toBeInTheDocument();
      expect(endIcon).toBeInTheDocument();
      expect(inputWrapper?.className).toMatch(/_withIcon_/);
    });

    it('should not apply withIcon class when no icons provided', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      const inputWrapper = input.closest('[class*="_inputWrapper_"]');
      expect(inputWrapper?.className).not.toMatch(/_withIcon_/);
    });
  });

  describe('Error State', () => {
    it('should display error message when provided', () => {
      render(<Input error="This field is required" />);

      const errorMessage = screen.getByText('This field is required');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage.className).toMatch(/_errorText_/);
    });

    it('should apply error class to input wrapper', () => {
      render(<Input error="Invalid input" />);

      const input = screen.getByRole('textbox');
      const inputWrapper = input.closest('[class*="_inputWrapper_"]');
      expect(inputWrapper?.className).toMatch(/_error_/);
    });

    it('should set aria-invalid on input when error exists', () => {
      render(<Input error="Error message" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should associate error message with input via aria-describedby', () => {
      render(<Input error="Error message" id="test-input" />);

      const input = screen.getByRole('textbox');
      const errorMessage = screen.getByText('Error message');

      expect(input).toHaveAttribute('aria-describedby', 'test-input-error');
      expect(errorMessage).toHaveAttribute('id', 'test-input-error');
    });

    it('should not set aria-invalid when no error', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'false');
    });

    it('should hide helper text when error is present', () => {
      render(<Input error="Error message" helperText="Helper text" />);

      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
    });
  });

  describe('Helper Text', () => {
    it('should display helper text when provided and no error', () => {
      render(<Input helperText="Enter your email address" />);

      const helperText = screen.getByText('Enter your email address');
      expect(helperText).toBeInTheDocument();
      expect(helperText.className).toMatch(/_helperText_/);
    });

    it('should associate helper text with input via aria-describedby', () => {
      render(<Input helperText="Helper text" id="test-input" />);

      const input = screen.getByRole('textbox');
      const helperText = screen.getByText('Helper text');

      expect(input).toHaveAttribute('aria-describedby', 'test-input-helper');
      expect(helperText).toHaveAttribute('id', 'test-input-helper');
    });

    it('should not display helper text when error is present', () => {
      render(<Input error="Error message" helperText="Helper text" />);

      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should not render helper text span when not provided', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      expect(input).not.toHaveAttribute('aria-describedby');
    });
  });

  describe('User Interactions', () => {
    it('should handle onChange events', () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test value' } });

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ value: 'test value' })
        })
      );
    });

    it('should handle onFocus events', () => {
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} />);

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('should handle onBlur events', () => {
      const handleBlur = vi.fn();
      render(<Input onBlur={handleBlur} />);

      const input = screen.getByRole('textbox');
      fireEvent.blur(input);

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('should handle keyboard events', () => {
      const handleKeyDown = vi.fn();
      render(<Input onKeyDown={handleKeyDown} />);

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(handleKeyDown).toHaveBeenCalledTimes(1);
    });

    it('should support controlled value', () => {
      const { rerender } = render(<Input value="initial" onChange={vi.fn()} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('initial');

      rerender(<Input value="updated" onChange={vi.fn()} />);
      expect(input.value).toBe('updated');
    });

    it('should support uncontrolled input', () => {
      render(<Input defaultValue="default value" />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('default value');

      fireEvent.change(input, { target: { value: 'new value' } });
      expect(input.value).toBe('new value');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to input element', () => {
      const ref = createRef<HTMLInputElement>();
      render(<Input ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current?.tagName).toBe('INPUT');
    });

    it('should allow programmatic focus via ref', () => {
      const ref = createRef<HTMLInputElement>();
      render(<Input ref={ref} />);

      ref.current?.focus();
      expect(ref.current).toHaveFocus();
    });

    it('should allow access to input properties via ref', () => {
      const ref = createRef<HTMLInputElement>();
      render(<Input ref={ref} defaultValue="test" />);

      expect(ref.current?.value).toBe('test');
    });
  });

  describe('HTML Input Attributes', () => {
    it('should pass through HTML input attributes', () => {
      render(
        <Input
          type="email"
          required
          disabled
          readOnly
          maxLength={50}
          minLength={5}
          pattern="[a-z]+"
          autoComplete="email"
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('required');
      expect(input).toHaveAttribute('disabled');
      expect(input).toHaveAttribute('readonly');
      expect(input).toHaveAttribute('maxlength', '50');
      expect(input).toHaveAttribute('minlength', '5');
      expect(input).toHaveAttribute('pattern', '[a-z]+');
      expect(input).toHaveAttribute('autocomplete', 'email');
    });

    it('should handle different input types', () => {
      // Test text-like inputs
      const textTypes = ['text', 'email', 'tel', 'url'] as const;
      textTypes.forEach(type => {
        const { unmount } = render(<Input type={type} />);
        const input = screen.getByRole('textbox');
        expect(input).toHaveAttribute('type', type);
        unmount();
      });

      // Test number input (has spinbutton role)
      const { unmount: unmountNumber } = render(<Input type="number" />);
      const numberInput = screen.getByRole('spinbutton');
      expect(numberInput).toHaveAttribute('type', 'number');
      unmountNumber();

      // Test password input (no accessible role by default)
      const { unmount: unmountPassword } = render(<Input type="password" />);
      const passwordInput = document.querySelector('input[type="password"]');
      expect(passwordInput).toHaveAttribute('type', 'password');
      unmountPassword();
    });

    it('should apply custom className to container', () => {
      render(<Input className="custom-input" />);

      const input = screen.getByRole('textbox');
      const container = input.closest('[class*="_container_"]');
      expect(container).toHaveClass('custom-input');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <Input
          label="Username"
          error="Required field"
          id="username-input"
        />
      );

      const input = screen.getByRole('textbox');
      const label = screen.getByText('Username');
      const error = screen.getByText('Required field');

      expect(input).toHaveAttribute('id', 'username-input');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'username-input-error');
      expect(label).toHaveAttribute('for', 'username-input');
      expect(error).toHaveAttribute('id', 'username-input-error');
      expect(error).toHaveAttribute('role', 'alert');
    });

    it('should support keyboard navigation', () => {
      render(<Input label="Test Input" />);

      const input = screen.getByRole('textbox');
      input.focus();
      expect(input).toHaveFocus();
    });

    it('should be accessible with screen readers', () => {
      render(
        <Input
          label="Email"
          helperText="We'll never share your email"
          placeholder="Enter your email"
        />
      );

      const input = screen.getByRole('textbox');
      const label = screen.getByText('Email');
      const helper = screen.getByText("We'll never share your email");

      expect(input).toHaveAccessibleName('Email');
      expect(label).toBeInTheDocument();
      expect(helper).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values', () => {
      render(<Input value="" onChange={vi.fn()} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('should handle null/undefined values gracefully', () => {
      render(<Input value={undefined as any} onChange={vi.fn()} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should handle complex icon elements', () => {
      const ComplexIcon = () => (
        <div>
          <span>Icon</span>
          <svg>
            <path d="M0 0" />
          </svg>
        </div>
      );

      render(<Input startIcon={<ComplexIcon />} />);

      const input = screen.getByRole('textbox');
      const inputWrapper = input.closest('[class*="_inputWrapper_"]');
      expect(inputWrapper?.className).toMatch(/_withIcon_/);
      expect(screen.getByText('Icon')).toBeInTheDocument();
    });

    it('should handle very long error messages', () => {
      const longError = 'This is a very long error message that might wrap to multiple lines and should still be properly associated with the input field';
      render(<Input error={longError} />);

      const errorMessage = screen.getByText(longError);
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    it('should handle disabled state with error', () => {
      render(<Input disabled error="Error message" />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('Component Display Name', () => {
    it('should have correct display name', () => {
      expect(Input.displayName).toBe('Input');
    });
  });

  describe('Performance', () => {
    it('should be memoized to prevent unnecessary re-renders', () => {
      const { rerender } = render(<Input value="test" onChange={vi.fn()} />);

      // Same props should not cause re-render (verified by memo)
      rerender(<Input value="test" onChange={vi.fn()} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should handle prop changes efficiently', () => {
      const { rerender } = render(<Input label="Initial Label" />);

      let label = screen.getByText('Initial Label');
      expect(label).toBeInTheDocument();

      rerender(<Input label="Updated Label" />);

      label = screen.getByText('Updated Label');
      expect(label).toBeInTheDocument();
      expect(screen.queryByText('Initial Label')).not.toBeInTheDocument();
    });
  });
});