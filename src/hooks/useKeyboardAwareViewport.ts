import { useEffect } from 'react';

/**
 * Publishes the current visual-viewport geometry as CSS custom properties on
 * :root:
 *   --kbd-viewport-h  → visualViewport.height
 *   --kbd-viewport-t  → visualViewport.offsetTop
 *
 * On iOS Safari the on-screen keyboard does not shrink window.innerHeight or
 * `100dvh`; it only changes `window.visualViewport.height`. Additionally,
 * when the keyboard opens, Safari scrolls the visual viewport up so the
 * focused input is visible, which leaves `position: fixed` elements anchored
 * to layout-viewport top sitting above the visible area. Exposing
 * `offsetTop` lets a fixed container pin itself to the *visual* viewport's
 * top edge, so it stays on-screen regardless of whether focus was user- or
 * programmatically initiated.
 *
 * Active only while mounted — variables are cleared on unmount so other
 * routes are unaffected.
 */
export function useKeyboardAwareViewport(): void {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;

    const apply = () => {
      const h = vv?.height ?? window.innerHeight;
      const t = vv?.offsetTop ?? 0;
      root.style.setProperty('--kbd-viewport-h', `${h}px`);
      root.style.setProperty('--kbd-viewport-t', `${t}px`);
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
      root.style.removeProperty('--kbd-viewport-t');
    };
  }, []);
}
