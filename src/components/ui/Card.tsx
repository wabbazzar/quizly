import { FC, memo } from 'react';
import { CardProps } from './types';
import styles from './Card.module.css';

export const Card: FC<CardProps> = memo(
  ({
    variant = 'default',
    padding = 'medium',
    interactive = false,
    children,
    className = '',
    onClick,
  }) => {
    const cardClasses = [
      styles.card,
      styles[variant],
      styles[`padding-${padding}`],
      interactive && styles.interactive,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    if (interactive || onClick) {
      return (
        <button className={cardClasses} onClick={onClick} type="button">
          {children}
        </button>
      );
    }

    return <div className={cardClasses}>{children}</div>;
  }
);

Card.displayName = 'Card';
