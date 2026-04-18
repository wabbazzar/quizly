import { FC, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSyncStore } from '@/store/syncStore';
import styles from './UserMenu.module.css';

/**
 * User indicator shown in the app header.
 * Shows username + sync status for logged-in users,
 * "Guest" + "Sign In" for guest users.
 */
export const UserMenu: FC = () => {
  const navigate = useNavigate();
  const {
    isConnected,
    isGuest,
    username,
    displayName,
    isSyncing,
    syncError,
    logout,
  } = useSyncStore();

  const handleSignOut = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const handleSignIn = useCallback(() => {
    // Clear guest mode so Login page doesn't redirect back
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  if (!isConnected && !isGuest) {
    return null; // Not yet initialized
  }

  return (
    <div className={styles.container}>
      {isConnected ? (
        <>
          <div className={styles.statusDot} data-status={
            isSyncing ? 'syncing' : syncError ? 'error' : 'ok'
          } />
          <span className={styles.name}>{displayName || username}</span>
          <button className={styles.action} onClick={handleSignOut} type="button">
            Sign Out
          </button>
        </>
      ) : (
        <>
          <span className={styles.name}>Guest</span>
          <button className={styles.action} onClick={handleSignIn} type="button">
            Sign In
          </button>
        </>
      )}
    </div>
  );
};
