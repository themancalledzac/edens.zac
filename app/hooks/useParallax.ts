'use client';

import { useEffect, useRef } from 'react';

export function useParallax() {
  const elementRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (typeof window === 'undefined' || !elementRef.current) return;
    
    const element = elementRef.current;
    const parallaxBg = element.querySelector('.parallax-bg') as HTMLElement;
    
    if (!parallaxBg) return;
    
    let isScrollListenerActive = false;
    
    const handleScroll = () => {
      const rect = element.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      const distance = elementCenter - viewportCenter;
      const speed = distance * -0.1; // Negative for opposite movement
      
      parallaxBg.style.transform = `translate3d(0, ${speed}px, 0)`;
    };
    
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          // Only add scroll listener when visible
          if (!isScrollListenerActive) {
            window.addEventListener('scroll', handleScroll, { passive: true });
            isScrollListenerActive = true;
            // Initial calculation
            handleScroll();
          }
        } else {
          // Remove listener when not visible
          if (isScrollListenerActive) {
            window.removeEventListener('scroll', handleScroll);
            isScrollListenerActive = false;
          }
        }
      }
    }, { 
      threshold: 0.1,
      rootMargin: '50px' // Start parallax slightly before element enters viewport
    });
    
    observer.observe(element);
    
    return () => {
      observer.disconnect();
      if (isScrollListenerActive) {
        window.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);
  
  return elementRef;
}