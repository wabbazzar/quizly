import { FC, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore } from '@/store/notificationStore';
import styles from './Notification.module.css';

const Notification: FC = () => {
  const { notification, clearNotification } = useNotificationStore();

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        clearNotification();
      }, notification.duration || 3000);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [notification, clearNotification]);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          className={`${styles.notification} ${styles[notification.type || 'info']}`}
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className={styles.content}>
            {notification.icon && <span className={styles.icon}>{notification.icon}</span>}
            <span className={styles.message}>{notification.message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Notification;
