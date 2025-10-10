'use client';

import Image from 'next/image';
import { useCallback, useEffect } from 'react';

import styles from './ImageFullScreen.module.scss';

interface ImageData {
  id: number;
  imageUrlWeb: string;
  imageWidth: number;
  imageHeight: number;
  title?: string;
}

interface ImageFullScreenProps {
  image: ImageData;
  onClose: () => void;
  scrollPosition: number; // Current scroll position to render overlay at
}

/**
 * Image Full Screen Component
 *
 * Full-screen image modal overlay with keyboard navigation and accessibility features.
 * Displays images in a modal dialog with responsive scaling and close interactions.
 * Features keyboard escape handling, click-to-close functionality, and screen reader support.
 *
 * @dependencies
 * - Next.js Image component for optimized image loading
 * - React hooks for event handling and lifecycle management
 * - ImageFullScreen.module.scss for modal styling
 *
 * @param props - Component props object containing:
 * @param props.image - Image data object with URL, dimensions, and metadata
 * @param props.onClose - Callback function to handle modal close events
 * @returns Client component rendering accessible full-screen image modal
 */
export default function ImageFullScreen({ image, onClose, scrollPosition }: ImageFullScreenProps) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }

    // Prevent arrow keys, page up/down, space from scrolling background
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
    }
  }, [onClose]);

  const handleExitImageFullscreen = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleImageError = useCallback(() => {
    console.error('Failed to load image:', image?.imageUrlWeb);
  }, [image?.imageUrlWeb]);

  useEffect(() => {
    // Prevent all scroll-related events
    const preventScroll = (e: Event) => {
      e.preventDefault();
    };

    const preventTouchMove = (e: TouchEvent) => {
      // Allow touch on the image itself for potential future zoom/pan
      // but prevent on the overlay background
      if ((e.target as HTMLElement).tagName !== 'IMG') {
        e.preventDefault();
      }
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('wheel', preventScroll, { passive: false });
    document.addEventListener('touchmove', preventTouchMove, { passive: false });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventTouchMove);
    };
  }, [handleKeyDown]);

  if (!image?.imageUrlWeb) {
    console.error('❌ [ImageFullScreen] No imageUrlWeb provided:', image);
    return null;
  }

  return (
    <div
      className={styles.imageFullScreenWrapper}
      style={{
        top: `${scrollPosition}px`,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fullscreen-image-title"
    >
      <div className={styles.overlayContainer} onClick={handleExitImageFullscreen}>
        <Image
          src={image.imageUrlWeb}
          alt={image.title || 'Full screen image'}
          width={image.imageWidth}
          height={image.imageHeight}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
          }}
          onError={handleImageError}
          priority
          unoptimized
        />
      </div>

      <button
        className={styles.closeButton}
        onClick={handleExitImageFullscreen}
        aria-label="Close fullscreen image"
      >
        <span aria-hidden="true">&#10005;</span>
      </button>
    </div>
  );
}