'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import type { ImageContentBlock, ParallaxImageContentBlock } from '@/app/types/ContentBlock';

/**
 * Simplified hook for handling image clicks
 * 
 * Returns a single onClick handler that updates URL with image ID
 * and captures click position for smooth transitions
 */
export function useImageClick() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleImageClick = useCallback((image: ImageContentBlock | ParallaxImageContentBlock, event?: React.MouseEvent) => {
    const rawName = image.rawFileName?.split('.')[0];
    if (!rawName) {
      console.warn('Cannot select image: rawFileName is missing', image);
      return;
    }

    // Store click position for potential future use (smooth animations)
    if (event) {
      const clickX = event.clientX;
      const clickY = event.clientY + window.scrollY;
      sessionStorage.setItem('imageClickPosition', JSON.stringify({ x: clickX, y: clickY }));
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('img', rawName);
    router.push(`${pathname}?${params}`, { scroll: false });
  }, [router, pathname, searchParams]);

  return handleImageClick;
}