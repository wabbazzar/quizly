import { FC, useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSyncStore } from '@/store/syncStore';
import styles from './Login.module.css';

const Login: FC = () => {
  const navigate = useNavigate();
  const { isConnected, isGuest, login, enterGuestMode } = useSyncStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in or guest, redirect to home
  useEffect(() => {
    if (isConnected || isGuest) {
      navigate('/', { replace: true });
    }
  }, [isConnected, isGuest, navigate]);

  const handleSignIn = useCallback(async () => {
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === 'Failed to fetch' || msg === 'Load failed') {
        setError('Could not reach the server. Check your connection and try again.');
      } else {
        setError(msg || 'Sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  }, [username, password, login, navigate]);

  const handleGuest = useCallback(() => {
    enterGuestMode();
    navigate('/', { replace: true });
  }, [enterGuestMode, navigate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !loading) handleSignIn();
    },
    [loading, handleSignIn]
  );

  return (
    <div className={styles.container}>
      <div className={styles.brand}>
        <img
          src={`${import.meta.env.BASE_URL}icons/mrquizly.png`}
          alt="Mr. Quizly"
          className={styles.mascot}
          decoding="async"
        />
        <h1 className={styles.brandTitle}>Quizly</h1>
      </div>

      <div className={styles.card} onKeyDown={handleKeyDown}>
        <div className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="login-username">
              Username
            </label>
            <input
              id="login-username"
              className={styles.input}
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              className={styles.input}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            className={styles.signInButton}
            onClick={handleSignIn}
            disabled={loading}
            type="button"
          >
            {loading ? (
              <>
                <span className={styles.spinner} />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          <div className={styles.divider}>or</div>

          <button
            className={styles.guestButton}
            onClick={handleGuest}
            type="button"
          >
            Continue as Guest
          </button>

          <Link to="/about" className={styles.aboutLink}>
            What is Quizly?
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
