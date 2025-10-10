'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

import type { ImageContentBlock } from '@/app/types/ContentBlock';

import styles from './ImageFullScreen.module.scss';

interface ImageFullScreenStateOnlyProps {
  _images: ImageContentBlock[]; // Prefixed with _ to indicate unused
}

/**
 * Ultra-Simple Image Full Screen Component
 * 
 * Uses only React state - no URL handling, no complex logic.
 * Just show/hide with click handlers.
 */
export default function ImageFullScreenStateOnly({ _images }: ImageFullScreenStateOnlyProps) {
  const [selectedImage, setSelectedImage] = useState<ImageContentBlock | null>(null);

  // Close handler
  const handleClose = useCallback(() => {
    setSelectedImage(null);
  }, []);

  // Image click handler - this is what components will call
  const handleImageClick = useCallback((image: ImageContentBlock) => {
    setSelectedImage(image);
  }, []);

  // Keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClose();
    }
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
    }
  }, [handleClose]);

  // Manage body overflow and events when image is shown
  useEffect(() => {
    if (!selectedImage) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

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
  }, [selectedImage, handleKeyDown]);

  // Export click handler for other components to use
  // This replaces the entire useImageSelection/useImageClick pattern
  (ImageFullScreenStateOnly as typeof ImageFullScreenStateOnly & { handleImageClick: typeof handleImageClick }).handleImageClick = handleImageClick;

  if (!selectedImage?.imageUrlWeb) {
    return null;
  }

  return (
    <div
      className={styles.imageFullScreenWrapper}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.overlayContainer} onClick={handleClose}>
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
        onClick={handleClose}
        aria-label="Close fullscreen image"
      >
        <span aria-hidden="true">&#10005;</span>
      </button>
    </div>
  );
}