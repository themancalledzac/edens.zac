import { type RefObject, useEffect, useState } from 'react';

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
export function useInViewport(ref: RefObject<Element>, options: UseInViewportOptions = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const [intersectionRatio, setIntersectionRatio] = useState(0);

  const { threshold = 0, root = null, rootMargin = '0px' } = options;

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setIsVisible(entry.isIntersecting);
          setIntersectionRatio(entry.intersectionRatio);
        }
      },
      { root, rootMargin, threshold }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, root, rootMargin, threshold]);

  return { isVisible, intersectionRatio };
}
