'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import ImageFullScreen from '@/app/components/ImageFullScreen/ImageFullScreen';
import { getSavedScrollPosition } from '@/app/lib/scrollPositionStore';
import type { ImageContentBlock } from '@/app/types/ContentBlock';

/**
 * ImageFullScreenController
 *
 * Manages full-screen image viewing using URL state (?img=rawFileName).
 *
 * Approach: URL-based with show/hide pattern
 * - Updates URL search params when image is clicked
 * - Renders ImageFullScreen component via conditional rendering
 * - Maintains scroll position when entering/exiting full-screen
 * - Supports browser back button and shareable URLs
 *
 * URL Structure: /BLOG/hidden-lake?img=DSC_8767
 */

interface ImageFullScreenControllerProps {
  /**
   * Array of image content blocks from the collection
   * Used to find the selected image by rawFileName
   */
  images: ImageContentBlock[];
}

export function ImageFullScreenController({ images }: ImageFullScreenControllerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Get selected image ID from URL (?img=DSC_8767)
  const selectedImageId = searchParams.get('img');

  // Use ref for scroll position to avoid timing issues with state updates
  const scrollPositionRef = useRef(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Find selected image by rawFileName (without extension)
  const selectedImage = selectedImageId
    ? images.find(img => {
        const rawName = img.rawFileName?.split('.')[0];

        return rawName === selectedImageId;
      })
    : null;

  // Track scroll position and manage full-screen state
  useEffect(() => {
    if (selectedImage && !isFullScreen) {
      // OPENING: Only run when transitioning from closed to open
      // Get scroll position from store (captured BEFORE router.push in useImageSelection)
      // Fallback to window.scrollY for defensive programming (e.g., direct URL access)
      const savedScroll = getSavedScrollPosition();
      const currentScroll = savedScroll > 0 ? savedScroll : window.scrollY;
      scrollPositionRef.current = currentScroll;

      // Simply prevent scrolling - overlay will render at scroll position
      const body = document.body;
      const originalOverflow = body.style.overflow;

      // Store original to restore later
      body.setAttribute('data-original-overflow', originalOverflow);

      // Just prevent scrolling - no viewport or body manipulation
      body.style.overflow = 'hidden';

      setIsFullScreen(true);
    } else if (!selectedImage && isFullScreen) {
      // CLOSING: Only run when transitioning from open to closed
      // Restore original overflow
      const body = document.body;
      body.style.overflow = body.getAttribute('data-original-overflow') || '';
      body.removeAttribute('data-original-overflow');

      // No scroll manipulation needed - user never moved!

      setIsFullScreen(false);
    }

    return () => {
      // Cleanup on unmount - restore overflow
      const body = document.body;
      const originalOverflow = body.getAttribute('data-original-overflow');
      if (originalOverflow !== null) {
        body.style.overflow = originalOverflow;
        body.removeAttribute('data-original-overflow');
      }
    };
  }, [selectedImage, isFullScreen]);

  // Handle close - remove ?img param (scroll restoration happens in useEffect)
  const handleClose = useCallback(() => {
    // Remove img param from URL - this will trigger useEffect to restore scroll
    const params = new URLSearchParams(searchParams.toString());
    params.delete('img');
    const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
    router.push(newUrl, { scroll: false });
  }, [router, pathname, searchParams]);

  // Convert ImageContentBlock to ImageData format expected by ImageFullScreen
  const imageData = selectedImage
    ? {
        id: selectedImage.id,
        imageUrlWeb: selectedImage.imageUrlWeb,
        imageWidth: selectedImage.imageWidth || 1200,
        imageHeight: selectedImage.imageHeight || 800,
        title:
          selectedImage.title || selectedImage.caption || selectedImage.rawFileName || undefined,
      }
    : null;

  if (!isFullScreen || !imageData) {
    return null;
  }

  return (
    <ImageFullScreen
      image={imageData}
      onClose={handleClose}
      scrollPosition={scrollPositionRef.current}
    />
  );
}
