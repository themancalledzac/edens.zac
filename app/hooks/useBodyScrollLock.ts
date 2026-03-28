import { useEffect, useRef } from 'react';

// Module-level lock counter — survives component remounts.
// Prevents concurrent locks from fighting over body styles.
let lockCount = 0;

/**
 * Lock body scroll when enabled. Uses position:fixed technique
 * to reliably prevent background scrolling on iOS Safari.
 * Ref-counted: multiple concurrent callers are safe.
 */
export function useBodyScrollLock(enabled: boolean): void {
  const scrollYRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    lockCount++;

    if (lockCount === 1) {
      // First locker — capture scroll position and apply lock
      scrollYRef.current = window.scrollY;
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.classList.add('scroll-locked');
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1);

      if (lockCount === 0) {
        // Last locker released — restore scroll
        document.body.classList.remove('scroll-locked');
        document.body.style.top = '';
        window.scrollTo(0, scrollYRef.current);
      }
    };
  }, [enabled]);
}
