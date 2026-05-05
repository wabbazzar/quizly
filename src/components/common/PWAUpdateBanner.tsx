import { FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePwaStore } from '@/store/pwaStore';
import styles from './PWAUpdateBanner.module.css';

/**
 * Small "update available — tap to refresh" affordance shown at the top of
 * the app once a new service worker has installed and is waiting. Lets the
 * user explicitly opt into the reload at a moment of their choosing,
 * instead of silently sitting on stale code (or jarringly auto-reloading
 * mid-session).
 *
 * The store also auto-applies the update silently when the user backgrounds
 * the tab for >30s — see `main.tsx`. This banner is the manual override.
 */
export const PWAUpdateBanner: FC = () => {
  const updateAvailable = usePwaStore(s => s.updateAvailable);
  const isApplying = usePwaStore(s => s.isApplying);
  const applyUpdate = usePwaStore(s => s.applyUpdate);

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          className={styles.banner}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        >
          <span className={styles.text}>Update available</span>
          <button
            className={styles.button}
            onClick={applyUpdate}
            disabled={isApplying}
          >
            {isApplying ? 'Updating…' : 'Refresh'}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAUpdateBanner;
