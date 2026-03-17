import { type RefObject, useEffect, useMemo, useState } from 'react';

import { observe } from '@/app/utils/sharedObserver';

interface UseInViewportOptions {
  threshold?: number | number[];
  root?: HTMLElement | null;
  rootMargin?: string;
}

/**
 * useInViewport Hook
 *
 * Tracks element visibility and intersection ratio within the viewport.
 * Uses IntersectionObserver to provide real-time visibility metrics.
 *
 * @param ref - React ref to the element to observe
 * @param options - IntersectionObserver configuration
 * @param options.threshold - Single number or array of thresholds (0-1)
 * @param options.root - Root element for intersection (defaults to viewport)
 * @param options.rootMargin - Margin around root element
 * @returns Object with isVisible boolean and intersectionRatio (0-1)
 */
export function useInViewport(ref: RefObject<Element | null>, options: UseInViewportOptions = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const [intersectionRatio, setIntersectionRatio] = useState(0);

  const { threshold = 0, root = null, rootMargin = '0px' } = options;

  // Memoize observer options to prevent unnecessary effect re-runs
  const observerOptions = useMemo(
    (): IntersectionObserverInit => ({
      root,
      rootMargin,
      threshold
    }),
    [root, rootMargin, threshold]
  );

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;
    const unobserveFn = observe(
      element,
      (entry) => {
        setIsVisible(entry.isIntersecting);
        setIntersectionRatio(entry.intersectionRatio);
      },
      observerOptions
    );

    return unobserveFn;
  }, [ref, observerOptions]);

  return { isVisible, intersectionRatio };
}