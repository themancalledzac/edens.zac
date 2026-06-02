import { useEffect } from 'react';

// Shared across hook instances so concurrent lockers cooperate over one ref-count and one offset.
let lockCount = 0;
let lockedScrollY = 0;

/**
 * Lock body scroll while `enabled`, restoring the exact scroll position on release. Uses the
 * position:fixed technique for reliable iOS Safari behavior. Ref-counted: concurrent callers are safe.
 */
export function useBodyScrollLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    lockCount++;

    if (lockCount === 1) {
      lockedScrollY = window.scrollY;
      document.body.style.top = `-${lockedScrollY}px`;
      document.body.classList.add('scroll-locked');
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1);

      if (lockCount === 0) {
        document.body.classList.remove('scroll-locked');
        document.body.style.top = '';
        window.scrollTo(0, lockedScrollY);
      }
    };
  }, [enabled]);
}
