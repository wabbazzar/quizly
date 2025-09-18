import { FC, memo, forwardRef } from 'react';
import { InputProps } from './types';
import styles from './Input.module.css';

export const Input: FC<InputProps> = memo(
  forwardRef<HTMLInputElement, InputProps>(
    (
      {
        label,
        error,
        helperText,
        variant = 'default',
        fullWidth = false,
        startIcon,
        endIcon,
        className = '',
        id,
        ...rest
      },
      ref
    ) => {
      const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

      const containerClasses = [styles.container, fullWidth && styles.fullWidth, className]
        .filter(Boolean)
        .join(' ');

      const inputWrapperClasses = [
        styles.inputWrapper,
        styles[variant],
        error && styles.error,
        (startIcon || endIcon) && styles.withIcon,
      ]
        .filter(Boolean)
        .join(' ');

      return (
        <div className={containerClasses}>
          {label && (
            <label htmlFor={inputId} className={styles.label}>
              {label}
            </label>
          )}
          <div className={inputWrapperClasses}>
            {startIcon && (
              <span className={styles.startIcon} aria-hidden="true">
                {startIcon}
              </span>
            )}
            <input
              ref={ref}
              id={inputId}
              className={styles.input}
              aria-invalid={!!error}
              aria-describedby={
                error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
              }
              {...rest}
            />
            {endIcon && (
              <span className={styles.endIcon} aria-hidden="true">
                {endIcon}
              </span>
            )}
          </div>
          {error && (
            <span id={`${inputId}-error`} className={styles.errorText} role="alert">
              {error}
            </span>
          )}
          {helperText && !error && (
            <span id={`${inputId}-helper`} className={styles.helperText}>
              {helperText}
            </span>
          )}
        </div>
      );
    }
  )
);

Input.displayName = 'Input';
