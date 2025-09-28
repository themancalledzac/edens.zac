import { type RefObject, useCallback, useEffect, useState } from 'react';

interface UseInViewportOptions {
  threshold?: number;
  root?: HTMLElement | null;
  rootMargin?: string;
}

/**
 * TODO: Use this useInViewport to give our 'parallax' effects more control.
 *  - When a Parallax Item is visible
 *  - THEN we want to calculate it's 'intersectionRatio(between 0 and 1, representing the percentage of the element visible on the screen)
 *  - THEN we use this number to represent the 'percentage' of our Parallax Effect, meaning a parallax Effect should have a 'max top/max bottom'
 *  - This means our Parallax Item can be 'less' zoomed in, or Dynamically zoomed in, to give us an appropriate amount of parallaxEffect
 *  - Amount of ParallaxEffect scroll should be consistent with All Parallax Items on Screen
 *  - our 'intersectionRatio' will instead dictate the amount of 'zoom' so that each item can scroll the same percentage, and also be able to scroll from the very top to the very bottom of each image
 *
 * @param ref
 * @param options
 */
export function useInViewport(ref: RefObject<Element>, options: UseInViewportOptions = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const [intersectionRatio, setIntersectionRatio] = useState(0);

  const { threshold = 0, root = null, rootMargin = '0px' } = options;

  const update = useCallback(() => {
    if (ref.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          setIsVisible(entry.isIntersecting);
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          setIntersectionRatio(entry.intersectionRatio);
        },
        { root, rootMargin, threshold }
      );

      observer.observe(ref.current);

      // Cleanup function to disconnect the observer
      return () => observer.disconnect();
    }
  }, [ref, root, rootMargin, threshold]);

  useEffect(() => {
    // Initial check
    update();
    // Listen to events that might affect visibility
    window.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('load', update);

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('load', update);
    };
  }, [update]);

  return { isVisible, intersectionRatio };
}
