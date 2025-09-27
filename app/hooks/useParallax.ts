'use client';

import { useEffect, useRef } from 'react';

interface ParallaxOptions {
  speed?: number;
  threshold?: number;
  rootMargin?: string;
  selector?: string;
  enableParallax?: boolean;
}


/**
 * useParallax Hook
 *
 * Performance-optimized parallax effect hook that creates smooth background
 * movement based on scroll position. Respects user motion preferences
 * and device capabilities.
 *
 * @dependencies
 * - React useEffect and useRef for lifecycle and DOM manipulation
 * - IntersectionObserver for visibility detection
 * - requestAnimationFrame for smooth animations
 *
 * @param options - Configuration object with speed, selectors, and thresholds containing:
 * @param options.speed - Parallax movement speed multiplier (default: -0.1)
 * @param options.selector - CSS selector for parallax background element (default: '.parallax-bg')
 * @param options.enableParallax - Enable/disable parallax effect (default: true)
 * @param options.threshold - IntersectionObserver threshold (default: 0.1)
 * @param options.rootMargin - IntersectionObserver root margin (default: '50px')
 * @returns Ref to attach to the container element
 */
export function useParallax(options: ParallaxOptions = {}) {
  const {
    speed = -0.1,
    selector = '.parallax-bg',
    enableParallax = true,
    threshold = 0.1,
    rootMargin = '50px',
  } = options;

  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !elementRef.current || !enableParallax) return;

    const element = elementRef.current;
    const parallaxBg = element.querySelector(selector) as HTMLElement;

    if (!parallaxBg) {
      console.warn(`useParallax: Element with selector "${selector}" not found`);
      return;
    }

    // Compute effective speed based on device and user preferences
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobileMq = window.matchMedia('(max-width: 768px)').matches;

    // Apply device attenuation for performance and accessibility
    const attenuation = prefersReduced ? 0.2 : (isMobileMq ? 0.4 : 1);
    const effectiveSpeed = speed * attenuation;

    const rafRef = { current: null as number | null };
    const lastOffsetRef = { current: undefined as number | undefined };

    const handleScroll = () => {
      if (!element || !parallaxBg) return;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        const elementCenter = rect.top + rect.height / 2;
        const viewportCenter = window.innerHeight / 2;
        const distance = elementCenter - viewportCenter;
        const newOffset = distance * effectiveSpeed;

        if (
          lastOffsetRef.current === undefined ||
          Math.abs(newOffset - lastOffsetRef.current) > 0.5
        ) {
          parallaxBg.style.transform = `translate3d(0, ${newOffset}px, 0)`;
          lastOffsetRef.current = newOffset;
        }
      });
    };

    let isScrollListenerActive = false;

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!isScrollListenerActive) {
              window.addEventListener('scroll', handleScroll, { passive: true });
              isScrollListenerActive = true;
              handleScroll();
            }
          } else {
            if (isScrollListenerActive) {
              window.removeEventListener('scroll', handleScroll);
              isScrollListenerActive = false;
              if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
              }
            }
          }
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (isScrollListenerActive) {
        window.removeEventListener('scroll', handleScroll);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };

  }, [speed, selector, enableParallax, threshold, rootMargin]);

  return elementRef;
}
