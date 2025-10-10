'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

import styles from '@/app/components/ImageFullScreen/ImageFullScreen.module.scss';
import type { ImageContentBlock, ParallaxImageContentBlock } from '@/app/types/ContentBlock';

/**
 * Ultra-simple full screen image hook
 * 
 * Returns:
 * - showImage: function to show an image in full screen
 * - FullScreenModal: component to render (or null if no image selected)
 */
export function useFullScreenImage() {
  const [selectedImage, setSelectedImage] = useState<ImageContentBlock | ParallaxImageContentBlock | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  const showImage = useCallback((image: ImageContentBlock | ParallaxImageContentBlock) => {
    // Capture current scroll position BEFORE showing image
    const currentScroll = window.scrollY;
    setScrollPosition(currentScroll);
    setSelectedImage(image);
  }, []);

  const hideImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  // Keyboard and scroll prevention
  useEffect(() => {
    if (!selectedImage) return;

    // Prevent body scrolling while modal is open - CRITICAL for positioning
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hideImage();
      }
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
      }
    };

    const preventScroll = (e: Event) => e.preventDefault();
    const preventTouchMove = (e: TouchEvent) => {
      if ((e.target as HTMLElement).tagName !== 'IMG') {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('wheel', preventScroll, { passive: false });
    document.addEventListener('touchmove', preventTouchMove, { passive: false });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventTouchMove);
    };
  }, [selectedImage, hideImage]);

  const FullScreenModal = selectedImage ? (
    <div
      className={styles.imageFullScreenWrapper}
      style={{
        top: `${scrollPosition}px`, // Position at captured scroll position
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.overlayContainer} onClick={hideImage}>
        <Image
          src={selectedImage.imageUrlWeb}
          alt={selectedImage.title || selectedImage.caption || 'Full screen image'}
          width={selectedImage.imageWidth || 1200}
          height={selectedImage.imageHeight || 800}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
          }}
          priority
          unoptimized
        />
      </div>

      <button
        className={styles.closeButton}
        onClick={hideImage}
        aria-label="Close fullscreen image"
      >
        <span aria-hidden="true">&#10005;</span>
      </button>
    </div>
  ) : null;

  return {
    showImage,
    FullScreenModal
  };
}