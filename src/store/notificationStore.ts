import { create } from 'zustand';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'coming-soon';

export interface NotificationData {
  message: string;
  type?: NotificationType;
  duration?: number;
  icon?: string;
}

interface NotificationStore {
  notification: NotificationData | null;
  showNotification: (notification: NotificationData) => void;
  clearNotification: () => void;
}

export const useNotificationStore = create<NotificationStore>(set => ({
  notification: null,

  showNotification: notification => {
    set({ notification });
  },

  clearNotification: () => {
    set({ notification: null });
  },
}));
