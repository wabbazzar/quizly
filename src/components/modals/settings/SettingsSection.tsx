import { FC, memo, ReactNode } from 'react';
import styles from './SettingsSection.module.css';

export interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export const SettingsSection: FC<SettingsSectionProps> = memo(({
  title,
  children,
  description,
  icon,
  className
}) => (
  <div className={`${styles.settingsSection} ${className || ''}`}>
    <div className={styles.sectionHeader}>
      {icon && <span className={styles.sectionIcon}>{icon}</span>}
      <h3 className={styles.sectionTitle}>{title}</h3>
    </div>
    {description && <p className={styles.sectionDescription}>{description}</p>}
    <div className={styles.sectionContent}>{children}</div>
  </div>
));

SettingsSection.displayName = 'SettingsSection';