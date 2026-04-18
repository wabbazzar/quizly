/**
 * Sync constants. The server URL is not user-configurable —
 * self-hosting is an operator concern, not a user feature.
 */

export const QUIZLY_SERVER_URL = 'https://api.quizly.me';

/** localStorage keys for sync state */
export const GUEST_MODE_KEY = 'quizly_guest_mode';
export const TOKEN_KEY = 'quizly_sync_token';
export const CONFIG_KEY = 'quizly_sync_config';
export const LAST_SYNC_KEY = 'quizly_sync_last';
export const DEVICE_SYNCED_KEY = 'quizly_sync_device_synced';
export const QUEUE_KEY = 'quizly_sync_queue';
export const LAST_USER_KEY = 'quizly_sync_last_user_id';

/** Sync config stored in localStorage */
export interface SyncConfig {
  serverUrl: string;
  username: string;
  userId: string;
  role: string;
}
