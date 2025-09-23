import { useCallback, useEffect, useState } from 'react';

/**
 * useDebounce Hook
 *
 * Generic debounce utility that delays function execution until after
 * specified delay period has passed since the last invocation. Optimizes
 * performance for frequent events like resize or scroll.
 *
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds before execution
 * @returns Debounced version of the callback function
 */
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      const timer = setTimeout(() => callback(...args), delay);
      setDebounceTimer(timer);
    }) as T,
    [callback, delay, debounceTimer]
  );
}

export interface ViewportDimensions {
  width: number;
  isMobile: boolean;
  contentWidth: number;
}

/**
 * useViewport Hook
 *
 * Responsive viewport detection hook that provides real-time window dimensions,
 * mobile breakpoint detection, and calculated content width based on layout
 * constraints. Features debounced resize handling for optimal performance.
 *
 * @dependencies
 * - React hooks for state management and lifecycle
 * - useDebounce for performance optimization
 * - ViewportDimensions interface for return type
 *
 * @returns Object containing viewport width, mobile flag, and content width
 */
export function useViewport(): ViewportDimensions {
  const [dimensions, setDimensions] = useState<ViewportDimensions>({
    width: 0,
    isMobile: false,
    contentWidth: 0,
  });

  const measure = useCallback(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
    const mobile = vw < 768;

    let contentWidth: number;
    if (mobile) {
      // Legacy mobile rule: full-bleed minus 40px
      contentWidth = Math.max(0, vw - 40);
    } else {
      // App Router desktop: subtract .contentPadding's 2rem + 2rem (64px) and cap at 1200
      const desktopPadding = 64; // 2rem each side at ≥768px
      contentWidth = Math.max(0, Math.min(vw - desktopPadding, 1200));
    }

    setDimensions({
      width: vw,
      isMobile: mobile,
      contentWidth,
    });
  }, []);

  const debouncedMeasure = useDebounce(measure, 100); // 100ms debounce

  useEffect(() => {
    // Initial measurement
    measure();

    // Debounced resize listener
    window.addEventListener('resize', debouncedMeasure);
    return () => window.removeEventListener('resize', debouncedMeasure);
  }, [measure, debouncedMeasure]);

  return dimensions;
}