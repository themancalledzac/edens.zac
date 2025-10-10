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

  // Log all available images on mount (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('📸 [ImageFullScreenController] Available images:', {
      count: images.length,
      images: images.map(img => ({
        id: img.id,
        blockType: img.blockType,
        rawFileName: img.rawFileName,
        hasImageUrlWeb: !!img.imageUrlWeb,
        imageUrlWeb: img.imageUrlWeb,
      })),
    });
  }

  // Get selected image ID from URL (?img=DSC_8767)
  const selectedImageId = searchParams.get('img');

  // Use ref for scroll position to avoid timing issues with state updates
  const scrollPositionRef = useRef(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Find selected image by rawFileName (without extension)
  const selectedImage = selectedImageId
    ? images.find(img => {
        const rawName = img.rawFileName?.split('.')[0];
        const matches = rawName === selectedImageId;

        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 [ImageFullScreenController] Checking image:', {
            id: img.id,
            rawFileName: img.rawFileName,
            rawName,
            selectedImageId,
            matches,
          });
        }

        return matches;
      })
    : null;

  // Log the result of the search
  if (selectedImageId && process.env.NODE_ENV === 'development') {
    console.log('🎯 [ImageFullScreenController] Image search result:', {
      selectedImageId,
      found: !!selectedImage,
      selectedImage: selectedImage ? {
        id: selectedImage.id,
        rawFileName: selectedImage.rawFileName,
        imageUrlWeb: selectedImage.imageUrlWeb,
        dimensions: `${selectedImage.imageWidth}x${selectedImage.imageHeight}`,
      } : null,
      totalImagesAvailable: images.length,
    });
  }

  // Track scroll position and manage full-screen state
  useEffect(() => {
    if (selectedImage && !isFullScreen) {
      // OPENING: Only run when transitioning from closed to open
      // Get scroll position from store (captured BEFORE router.push in useImageSelection)
      // Fallback to window.scrollY for defensive programming (e.g., direct URL access)
      const savedScroll = getSavedScrollPosition();
      const currentScroll = savedScroll > 0 ? savedScroll : window.scrollY;
      scrollPositionRef.current = currentScroll;

      if (process.env.NODE_ENV === 'development') {
        console.log('📍 [ImageFullScreenController] Scroll position for full-screen:', {
          fromStore: savedScroll,
          fromWindow: window.scrollY,
          using: currentScroll,
        });
      }

      // Apply all styles using cssText for atomic operation
      const body = document.body;
      const originalStyle = body.style.cssText;

      // Store original for potential restoration
      body.setAttribute('data-original-style', originalStyle);

      // Apply all styles at once to prevent intermediate reflows
      body.style.cssText = `
        ${originalStyle}
        overflow: hidden !important;
        position: fixed !important;
        width: 100% !important;
        top: -${currentScroll}px !important;
        left: 0 !important;
        right: 0 !important;
      `;

      // CRITICAL: Scroll window to top so full-screen image is visible
      // The body's negative top makes the page content appear to stay at currentScroll
      // but the viewport is now at 0, where the fixed overlay is positioned
      window.scrollTo(0, 0);

      setIsFullScreen(true);
    } else if (!selectedImage && isFullScreen) {
      // CLOSING: Only run when transitioning from open to closed
      const savedScroll = scrollPositionRef.current;

      // Restore original styles
      const body = document.body;
      body.style.cssText = body.getAttribute('data-original-style') || '';
      body.removeAttribute('data-original-style');

      // Then restore scroll position
      window.scrollTo(0, savedScroll);

      setIsFullScreen(false);
    }

    return () => {
      // Cleanup on unmount - restore original styles
      const body = document.body;
      const originalStyle = body.getAttribute('data-original-style');
      if (originalStyle !== null) {
        body.style.cssText = originalStyle;
        body.removeAttribute('data-original-style');
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
  const imageData = selectedImage ? {
    id: selectedImage.id,
    imageUrlWeb: selectedImage.imageUrlWeb,
    imageWidth: selectedImage.imageWidth || 1200,
    imageHeight: selectedImage.imageHeight || 800,
    title: selectedImage.title || selectedImage.caption || selectedImage.rawFileName || undefined,
  } : null;

  // Log the converted image data
  if (imageData && process.env.NODE_ENV === 'development') {
    console.log('📦 [ImageFullScreenController] Converted imageData:', {
      ...imageData,
      hasImageUrl: !!imageData.imageUrlWeb,
      imageUrlLength: imageData.imageUrlWeb?.length,
    });
  }

  if (!isFullScreen || !imageData) {
    if (selectedImageId && process.env.NODE_ENV === 'development') {
      console.log('⚠️ [ImageFullScreenController] Not rendering:', {
        isFullScreen,
        hasImageData: !!imageData,
        selectedImageId,
      });
    }
    return null;
  }

  console.log('✅ [ImageFullScreenController] Rendering ImageFullScreen with:', imageData);
  return <ImageFullScreen image={imageData} onClose={handleClose} />;
}