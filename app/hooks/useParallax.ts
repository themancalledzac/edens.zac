'use client';

import { useEffect, useRef } from 'react';

interface ParallaxOptions {
  speed?: number;
  threshold?: number;
  rootMargin?: string;
  selector?: string;
  rowId?: string;
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

function createRowManager(rowId: string, options: ParallaxOptions) {
  const { threshold = 0.1, rootMargin = '50px' } = options;

  const manager = {
    elements: new Set<HTMLDivElement>(),
    parallaxElements: new Map(),
    observer: null as IntersectionObserver | null,
    rafId: null as number | null,
    isScrolling: false,
  };

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

  rowManagers.set(rowId, manager);
  return manager;
}

export function useParallax(options: ParallaxOptions = {}) {
  const { speed = -0.1, selector = '.parallax-bg', rowId, threshold, rootMargin } = options;

  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !elementRef.current) return;

    const element = elementRef.current;
    const parallaxBg = element.querySelector(selector) as HTMLElement;

    if (!parallaxBg) {
      console.warn(`useParallax: Element with selector "${selector}" not found`);
      return;
    }

    // Use individual observer if no rowId provided (fallback to original behavior)
    if (!rowId) {
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
          const newOffset = distance * speed;

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

    // Row-based management
    let manager = rowManagers.get(rowId);
    if (!manager) {
      manager = createRowManager(rowId, options);
    }

    const { elements, parallaxElements, observer } = manager;

    // Add element to row manager
    elements.add(element);
    parallaxElements.set(element, { bg: parallaxBg, speed });
    observer?.observe(element);

    return () => {
      if (manager) {
        const { elements: cleanupElements, parallaxElements: cleanupParallaxElements, observer: cleanupObserver, isScrolling, rafId } = manager;

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
  }, [speed, selector, rowId, threshold, rootMargin]);

  return elementRef;
}
