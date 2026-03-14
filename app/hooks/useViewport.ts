import { useCallback, useEffect, useRef, useState } from 'react';

import { BREAKPOINTS, getContentWidth } from '@/app/constants';

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
function useDebounce<T extends (...args: never[]) => void>(
  callback: T,
  delay: number
): T {
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => callback(...args), delay);
    }) as T,
    [callback, delay]
  );
}

export interface ViewportDimensions {
  width: number;
  viewportHeight: number;
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
    viewportHeight: 0,
    isMobile: false,
    contentWidth: 0,
  });

  const measure = useCallback(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
    const mobile = vw < BREAKPOINTS.mobile;
    const contentWidth = getContentWidth(vw, mobile);

    setDimensions({
      width: vw,
      viewportHeight: vh,
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