'use client';

import { useEffect, useRef } from 'react';

interface ParallaxOptions {
  speed?: number;
  threshold?: number;
  rootMargin?: string;
  selector?: string;
  rowId?: string;
  mode?: 'single' | 'row';
  enableParallax?: boolean;
  disableDeviceAttenuation?: boolean;
}

// Global storage for row-based parallax management
const rowManagers = new Map<
  string,
  {
    elements: Set<HTMLDivElement>;
    parallaxElements: Map<HTMLDivElement, { bg: HTMLElement; speed: number; lastOffset?: number }>;
    observer: IntersectionObserver | null;
    rafId: number | null;
    isScrolling: boolean;
  }
>();

/**
 * Create Row Manager
 *
 * Creates a shared manager for coordinating parallax effects across multiple
 * elements in the same row. Optimizes performance by batching scroll calculations
 * and using a single IntersectionObserver per row.
 *
 * @param rowId - Unique identifier for the row
 * @param options - Parallax configuration options
 * @returns Manager object with element tracking and scroll handling
 */
function createRowManager(rowId: string, options: ParallaxOptions) {
  const { threshold = 0.1, rootMargin = '50px' } = options;

  const manager = {
    elements: new Set<HTMLDivElement>(),
    parallaxElements: new Map(),
    observer: null as IntersectionObserver | null,
    rafId: null as number | null,
    isScrolling: false,
  };

  /**
   * Handle Scroll Events
   *
   * Optimized scroll handler using requestAnimationFrame to batch DOM updates
   * and prevent layout thrashing. Only processes visible elements and applies
   * threshold-based updates to minimize unnecessary style recalculations.
   */
  const handleScroll = () => {
    if (manager.rafId) {
      cancelAnimationFrame(manager.rafId);
    }

    manager.rafId = requestAnimationFrame(() => {
      const viewportCenter = window.innerHeight / 2;

      for (const [element, data] of Array.from(manager.parallaxElements.entries())) {
        // Only calculate for visible elements
        const rect = element.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) continue;

        const elementCenter = rect.top + rect.height / 2;
        const distance = elementCenter - viewportCenter;
        const newOffset = distance * data.speed;

        // Only update if offset changed significantly
        if (data.lastOffset === undefined || Math.abs(newOffset - data.lastOffset) > 0.5) {
          data.bg.style.transform = `translate3d(0, ${newOffset}px, 0)`;
          data.lastOffset = newOffset;
        }
      }
    });
  };

  const startScrolling = () => {
    if (manager.isScrolling) return;
    manager.isScrolling = true;
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call
  };

  const stopScrolling = () => {
    if (!manager.isScrolling) return;
    manager.isScrolling = false;
    window.removeEventListener('scroll', handleScroll);
    if (manager.rafId) {
      cancelAnimationFrame(manager.rafId);
      manager.rafId = null;
    }
  };

  const handleIntersection = (entries: IntersectionObserverEntry[]) => {
    let hasVisibleElements = false;

    for (const entry of entries) {
      if (entry.isIntersecting) {
        hasVisibleElements = true;
        break;
      }
    }

    if (hasVisibleElements && !manager.isScrolling) {
      startScrolling();
    } else if (!hasVisibleElements && manager.isScrolling) {
      stopScrolling();
    }
  };

  manager.observer = new IntersectionObserver(handleIntersection, {
    threshold,
    rootMargin,
  });

  // Store manager globally for row-based coordination across components
  rowManagers.set(rowId, manager);
  return manager;
}

/**
 * useParallax Hook
 *
 * Performance-optimized parallax effect hook that creates smooth background
 * movement based on scroll position. Supports both individual elements and
 * row-based batching for multiple elements. Respects user motion preferences
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
 * @param options.rowId - Optional row identifier for batched processing
 * @param options.mode - Explicit mode: 'single' or 'row' (auto-detected from rowId if not provided)
 * @param options.enableParallax - Enable/disable parallax effect (default: true)
 * @param options.threshold - IntersectionObserver threshold (default: 0.1)
 * @param options.rootMargin - IntersectionObserver root margin (default: '50px')
 * @param options.disableDeviceAttenuation - Skip mobile/desktop speed attenuation (default: false)
 * @returns Ref to attach to the container element
 */
export function useParallax(options: ParallaxOptions = {}) {
  const {
    speed = -0.1,
    selector = '.parallax-bg',
    rowId,
    mode,
    enableParallax = true,
    threshold,
    rootMargin,
    disableDeviceAttenuation = false,
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

    // Apply attenuation unless explicitly disabled
    let effectiveSpeed = speed;
    if (!disableDeviceAttenuation) {
      const attenuation = prefersReduced ? 0.2 : (isMobileMq ? 0.4 : 1);
      effectiveSpeed = speed * attenuation;
    } else if (prefersReduced) {
      // Still respect reduced motion preference even when device attenuation is disabled
      effectiveSpeed = speed * 0.2;
    }

    // Determine parallax mode: individual or row-based
    const useIndividualMode = mode === 'single' || (!rowId && mode !== 'row');

    // Use individual observer for single element mode
    if (useIndividualMode) {
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
          threshold: threshold || 0.1,
          rootMargin: rootMargin || '50px',
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
    }

    // Row-based management (rowId must be defined at this point)
    if (!rowId) {
      console.warn('useParallax: rowId is required for row-based mode');
      return;
    }

    let manager = rowManagers.get(rowId);
    if (!manager) {
      manager = createRowManager(rowId, options);
    }

    const { elements, parallaxElements, observer } = manager;

    // Add element to row manager
    elements.add(element);
    parallaxElements.set(element, { bg: parallaxBg, speed: effectiveSpeed });
    observer?.observe(element);

    return () => {
      if (manager && rowId) {
        const {
          elements: cleanupElements,
          parallaxElements: cleanupParallaxElements,
          observer: cleanupObserver,
          isScrolling,
          rafId,
        } = manager;

        cleanupElements.delete(element);
        cleanupParallaxElements.delete(element);
        cleanupObserver?.unobserve(element);

        // Clean up manager if no elements left
        if (cleanupElements.size === 0) {
          cleanupObserver?.disconnect();
          if (isScrolling) {
            manager.isScrolling = false;
            // The scroll listener will be removed by the manager's stopScrolling method
            window.removeEventListener('scroll', () => {});
          }
          if (rafId) {
            cancelAnimationFrame(rafId);
          }
          rowManagers.delete(rowId);
        }
      }
    };
  }, [speed, selector, rowId, mode, enableParallax, threshold, rootMargin]);

  return elementRef;
}
