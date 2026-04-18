import { FC, ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSyncStore } from '@/store/syncStore';

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * Route guard: redirects unauthenticated, non-guest visitors to /login.
 * Preserves the intended destination for post-login redirect.
 */
export const AuthGuard: FC<AuthGuardProps> = ({ children }) => {
  const { isConnected, isGuest } = useSyncStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isConnected && !isGuest) {
      // Save intended destination for post-login redirect
      const returnTo = location.pathname + location.search;
      navigate(`/login${returnTo !== '/' ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`, {
        replace: true,
      });
    }
  }, [isConnected, isGuest, navigate, location]);

  if (!isConnected && !isGuest) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
};
