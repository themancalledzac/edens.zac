import { useCallback, useEffect, useState } from 'react';

// Debounce utility for performance optimization
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
 * Hook for responsive viewport detection and content width calculation
 * Optimized with debouncing for better performance during resize events
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