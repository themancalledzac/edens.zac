'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import type { ImageContentBlock, ParallaxImageContentBlock } from '@/app/types/ContentBlock';

/**
 * Hook for managing image selection via URL state
 *
 * Provides functionality to select images by updating the URL with ?img= parameter.
 * Enables shareable full-screen image URLs and browser back button support.
 *
 * @returns Object with selectImage function
 */
export function useImageSelection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * Select an image by updating the URL with its rawFileName (without extension)
   */
  const selectImage = useCallback((image: ImageContentBlock | ParallaxImageContentBlock) => {
    console.log('🖱️ [useImageSelection] Image clicked:', {
      id: image.id,
      rawFileName: image.rawFileName,
      imageUrlWeb: image.imageUrlWeb,
      dimensions: `${image.imageWidth}x${image.imageHeight}`,
    });

    const rawName = image.rawFileName?.split('.')[0];
    if (!rawName) {
      console.warn('❌ [useImageSelection] Cannot select image: rawFileName is missing', image);
      return;
    }

    console.log('✅ [useImageSelection] Setting URL param ?img=', rawName);
    const params = new URLSearchParams(searchParams.toString());
    params.set('img', rawName);
    router.push(`${pathname}?${params}`, { scroll: false });
  }, [router, pathname, searchParams]);

  return { selectImage };
}