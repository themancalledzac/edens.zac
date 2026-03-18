import { useEffect } from 'react';

/**
 * Lock body scroll when enabled. Uses position:fixed technique
 * to reliably prevent background scrolling on iOS Safari.
 */
export function useBodyScrollLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    const scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    document.body.classList.add('scroll-locked');

    return () => {
      document.body.classList.remove('scroll-locked');
      document.body.style.top = '';
      window.scrollTo(0, scrollY);
    };
  }, [enabled]);
}
