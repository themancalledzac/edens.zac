import { useCallback, useEffect, useState } from 'react';

import { BREAKPOINTS, getContentWidth } from '@/app/constants';
import { useThrottle } from '@/app/utils/debounce';

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
 * constraints. Uses throttled resize handling (leading + trailing edge) for
 * immediate responsiveness during active interaction.
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
    const newContentWidth = getContentWidth(vw, mobile);

    setDimensions(prev => {
      if (
        prev.width === vw &&
        prev.viewportHeight === vh &&
        prev.contentWidth === newContentWidth &&
        prev.isMobile === mobile
      ) {
        return prev;
      }
      return { width: vw, viewportHeight: vh, isMobile: mobile, contentWidth: newContentWidth };
    });
  }, []);

  const throttledMeasure = useThrottle(measure, 100); // fires immediately + every 100ms during resize

  useEffect(() => {
    // Initial measurement
    measure();

    // Throttled resize listener — fires on first event (leading) + periodically during drag
    window.addEventListener('resize', throttledMeasure);
    return () => window.removeEventListener('resize', throttledMeasure);
  }, [measure, throttledMeasure]);

  return dimensions;
}
