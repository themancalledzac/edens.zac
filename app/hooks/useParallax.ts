'use client';

import { useEffect, useRef } from 'react';

import { PARALLAX_CONSTANTS } from '@/app/constants/parallax';

import { useInViewport } from './inViewport';

interface ParallaxOptions {
  selector?: string;
  enableParallax?: boolean;
}


/**
 * useParallax Hook
 *
 * Viewport-based parallax effect that scrolls images based on their visibility
 * in the viewport. Images are scaled to 130% (15% overflow above and below).
 *
 * Behavior:
 * - When element enters bottom of viewport: image positioned at top (-15%)
 * - When element exits top of viewport: image positioned at bottom (+15%)
 * - Scroll position interpolates linearly between these states
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
  const {
    selector = '.parallax-bg',
    enableParallax = true,
  } = options;

  const elementRef = useRef<HTMLDivElement>(null);
  const { isVisible } = useInViewport(elementRef, {
    threshold: PARALLAX_CONSTANTS.THRESHOLD_ARRAY,
    rootMargin: '0px',
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !elementRef.current || !enableParallax) return;

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

        // Calculate parallax offset using configured range
        const offsetRange = PARALLAX_CONSTANTS.OFFSET_MAX - PARALLAX_CONSTANTS.OFFSET_MIN;
        const newOffset = PARALLAX_CONSTANTS.OFFSET_MIN + (scrollProgress * offsetRange);

        if (
          lastOffsetRef.current === undefined ||
          Math.abs(newOffset - lastOffsetRef.current) > PARALLAX_CONSTANTS.UPDATE_THRESHOLD
        ) {
          parallaxBg.style.transform = `translate3d(0, ${newOffset}px, 0)`;
          lastOffsetRef.current = newOffset;
        }
      });
    };

    // Initial update
    updateParallax();

    // Update on scroll
    window.addEventListener('scroll', updateParallax, { passive: true });
    window.addEventListener('resize', updateParallax, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateParallax);
      window.removeEventListener('resize', updateParallax);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };

  }, [isVisible, selector, enableParallax]);

  return elementRef;
}
