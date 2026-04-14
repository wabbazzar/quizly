import { useEffect } from 'react';

/**
 * Publishes the current visual-viewport height as a CSS custom property
 * (--kbd-viewport-h) on :root. On iOS Safari the on-screen keyboard does
 * not shrink window.innerHeight or `100dvh`; it only changes
 * window.visualViewport.height. Consumers that need to avoid being covered
 * by the keyboard should size themselves with `var(--kbd-viewport-h, 100dvh)`.
 *
 * Active only while mounted — the variable is cleared on unmount so other
 * routes are unaffected.
 */
export function useKeyboardAwareViewport(): void {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;

    const apply = () => {
      const h = vv?.height ?? window.innerHeight;
      root.style.setProperty('--kbd-viewport-h', `${h}px`);
    };

    apply();
    vv?.addEventListener('resize', apply);
    vv?.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);

    return () => {
      vv?.removeEventListener('resize', apply);
      vv?.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
      root.style.removeProperty('--kbd-viewport-h');
    };
  }, []);
}
