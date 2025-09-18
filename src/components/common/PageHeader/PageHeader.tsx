import { FC, ReactNode, memo } from 'react';
import { ArrowLeftIcon } from '@/components/icons/NavigationIcons';
import SettingsIcon from '@/components/icons/SettingsIcon';
import styles from './PageHeader.module.css';

export interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  onBackClick?: () => void;
  backLabel?: string;
  onSettingsClick?: () => void;
  showSettings?: boolean;
  rightContent?: ReactNode;
  centerContent?: ReactNode;
  className?: string;
}

export const PageHeader: FC<PageHeaderProps> = memo(({
  title,
  subtitle,
  onBackClick,
  backLabel = 'Back',
  onSettingsClick,
  showSettings = false,
  rightContent,
  centerContent,
  className
}) => {
  return (
    <header className={`${styles.header} ${className || ''}`}>
      <div className={styles.headerLeft}>
        {onBackClick && (
          <button
            onClick={onBackClick}
            className={styles.backButton}
            aria-label={backLabel}
          >
            <ArrowLeftIcon size={20} />
            <span className={styles.backLabel}>{backLabel}</span>
          </button>
        )}
      </div>

      <div className={styles.headerCenter}>
        {centerContent || (
          <div className={styles.titleSection}>
            {title && <h1 className={styles.title}>{title}</h1>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
        )}
      </div>

      <div className={styles.headerRight}>
        {rightContent}
        {showSettings && onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className={styles.settingsButton}
            aria-label="Settings"
          >
            <SettingsIcon size={20} />
          </button>
        )}
      </div>
    </header>
  );
});

PageHeader.displayName = 'PageHeader';