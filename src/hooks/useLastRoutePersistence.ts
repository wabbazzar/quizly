import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const LAST_ROUTE_KEY = 'quizly-last-route';

const isPWAStandalone = (): boolean =>
  (window.navigator as { standalone?: boolean }).standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;

const isRestorableRoute = (path: string): boolean => {
  if (!path || !path.startsWith('/')) return false;
  if (path === '/' || path === '/error' || path === '/login') return false;
  return true;
};

export function useLastRoutePersistence(): void {
  const location = useLocation();
  const navigate = useNavigate();
  const restoreAttemptedRef = useRef(false);

  useEffect(() => {
    if (!isRestorableRoute(location.pathname)) return;
    const path = location.pathname + location.search;
    try {
      localStorage.setItem(LAST_ROUTE_KEY, path);
    } catch {
      // Ignore quota / privacy-mode errors — persistence is best-effort.
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (restoreAttemptedRef.current) return;
    restoreAttemptedRef.current = true;

    if (!isPWAStandalone()) return;
    if (location.pathname !== '/') return;

    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LAST_ROUTE_KEY);
    } catch {
      return;
    }

    if (saved && isRestorableRoute(saved)) {
      navigate(saved, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
