'use client';

import { useEffect, useRef, useState } from 'react';

import { PARALLAX_CONSTANTS } from '@/app/constants/parallax';
import { computeParallaxOffset, getParallaxBudgets } from '@/app/utils/parallaxMath';

import { useInViewport } from './inViewport';

interface ParallaxOptions {
  selector?: string;
  enableParallax?: boolean;
}

/**
 * useParallax Hook
 *
 * Viewport-based parallax effect that scrolls images based on their visibility
 * in the viewport. The image is scaled larger than its container (e.g. 130%) so
 * it overflows on both edges; the parallax travel is bounded by that actual
 * overflow (read from live layout) so the grey container is never revealed.
 *
 * Behavior:
 * - Entering bottom of viewport: image at its highest position (bottom edge aligned)
 * - Exiting top of viewport: image at its lowest position (top edge aligned)
 * - Scroll position interpolates linearly between these states, scaled by TRAVEL_SAFETY
 *
 * @dependencies
 * - useInViewport for visibility detection and intersection ratio
 * - requestAnimationFrame for smooth animations
 *
 * @param options - Configuration object
 * @param options.selector - CSS selector for parallax background element (default: '.parallax-bg')
 * @param options.enableParallax - Enable/disable parallax effect (default: true)
 * @returns Ref to attach to the container element
 */
export function useParallax(options: ParallaxOptions = {}) {
  const { selector = '.parallax-bg', enableParallax = true } = options;

  const elementRef = useRef<HTMLDivElement>(null);
  const { isVisible } = useInViewport(elementRef, {
    threshold: PARALLAX_CONSTANTS.THRESHOLD_ARRAY,
    rootMargin: '0px',
  });

  // Respect the user's motion preference. Read once on mount (SSR-safe) and keep
  // it in sync if the setting changes mid-session.
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mql.matches);

    const onChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !elementRef.current || !enableParallax) return;

    // Honor prefers-reduced-motion: neutralize any existing offset and skip the
    // scroll/resize work entirely so the image stays put for these users.
    if (prefersReducedMotion) {
      const parallaxBg = elementRef.current.querySelector(selector) as HTMLElement | null;
      if (parallaxBg) parallaxBg.style.transform = 'translate3d(0, 0, 0)';
      return;
    }

    const element = elementRef.current;
    const parallaxBg = element.querySelector(selector) as HTMLElement;

    if (!parallaxBg) {
      return;
    }

    const rafRef = { current: null as number | null };
    const lastOffsetRef = { current: undefined as number | undefined };

    const updateParallax = () => {
      if (!element || !parallaxBg) return;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const viewportHeight = window.innerHeight - PARALLAX_CONSTANTS.VIEWPORT_HEIGHT_OFFSET;
        const imageRect = parallaxBg.getBoundingClientRect();

        // Calculate scroll progress based on IMAGE visibility in viewport
        // START: When imageRect.top = viewportHeight (image top just entering viewport bottom)
        // END: When imageRect.bottom = 0 (image bottom just exiting viewport top)
        //
        // Total travel distance: from top entering bottom to bottom exiting top
        // Distance = viewportHeight + imageHeight
        const travelDistance = viewportHeight + imageRect.height;

        // Current position: how far the image top has traveled from viewport bottom
        // When top is at viewportHeight (entering): currentPos = 0
        // When top is at 0: currentPos = viewportHeight
        // When bottom is at 0 (exiting): currentPos = viewportHeight + imageHeight
        const currentPosition = viewportHeight - imageRect.top;

        const scrollProgress = Math.max(0, Math.min(1, currentPosition / travelDistance));

        // Derive the travel budget from the image's ACTUAL overflow (read from live
        // layout), so the offset can never exceed it and reveal the grey container —
        // at any card height. offsetTop/offsetHeight are transform-independent.
        const containerHeight =
          (parallaxBg.offsetParent as HTMLElement | null)?.clientHeight ?? element.offsetHeight;
        const { upBudgetPx, downBudgetPx } = getParallaxBudgets(
          parallaxBg.offsetTop,
          parallaxBg.offsetHeight,
          containerHeight
        );
        const newOffset = computeParallaxOffset(scrollProgress, upBudgetPx, downBudgetPx);

        if (
          lastOffsetRef.current === undefined ||
          Math.abs(newOffset - lastOffsetRef.current) > PARALLAX_CONSTANTS.UPDATE_THRESHOLD
        ) {
          parallaxBg.style.transform = `translate3d(0, ${newOffset}px, 0)`;
          lastOffsetRef.current = newOffset;
        }
      });
    };

    updateParallax();

    // Debounced resize handler to avoid N listeners × per-pixel recalculations
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const debouncedResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateParallax, 100);
    };

    // Update on scroll (RAF-throttled) and resize (debounced)
    window.addEventListener('scroll', updateParallax, { passive: true });
    window.addEventListener('resize', debouncedResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateParallax);
      window.removeEventListener('resize', debouncedResize);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isVisible, selector, enableParallax, prefersReducedMotion]);

  return elementRef;
}
