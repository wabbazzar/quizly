import { FC, memo } from 'react';
import { motion } from 'framer-motion';
import { ModeSelectorProps } from './types';
import styles from './ModeSelector.module.css';

export const ModeSelector: FC<ModeSelectorProps> = memo(({
  modes,
  onModeClick
}) => {
  return (
    <section className={styles.modesSection}>
      <h2 className={styles.sectionTitle}>Choose Your Learning Mode</h2>
      <motion.div
        className={styles.modesGrid}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {modes.map((mode) => (
          <motion.div
            key={mode.id}
            className={`${styles.modeCard} ${styles[mode.color]}`}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onModeClick(mode)}
          >
            <div className={styles.modeIconWrapper}>
              <mode.icon className={styles.modeIcon} size={32} />
            </div>
            <h3 className={styles.modeName}>{mode.label}</h3>
            <p className={styles.modeDescription}>{mode.description}</p>
            <div className={styles.modeAction}>
              <span className={styles.startText}>Start →</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
});

ModeSelector.displayName = 'ModeSelector';