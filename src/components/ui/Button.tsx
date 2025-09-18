import { FC, memo } from 'react';
import { ButtonProps } from './types';
import { Spinner } from './Spinner';
import styles from './Button.module.css';

export const Button: FC<ButtonProps> = memo(({
  variant = 'primary',
  size = 'medium',
  children,
  onClick,
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  className = '',
  type = 'button',
  ...rest
}) => {
  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || loading}
      type={type}
      aria-busy={loading}
      {...rest}
    >
      {loading && (
        <span className={styles.spinner}>
          <Spinner size="small" variant={variant === 'primary' ? 'white' : 'primary'} />
        </span>
      )}
      {icon && !loading && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={styles.content}>{children}</span>
    </button>
  );
});

Button.displayName = 'Button';