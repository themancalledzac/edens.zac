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
export default function ImageFullScreen({ image, onClose }: ImageFullScreenProps) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  const handleExitImageFullscreen = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleImageError = useCallback(() => {
    console.error('Failed to load image:', image?.imageUrlWeb);
  }, [image?.imageUrlWeb]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  if (!image?.imageUrlWeb) {
    console.log('ImageFullScreen: No image or imageUrlWeb provided', image);
    return null;
  }

  console.log('ImageFullScreen rendering with image:', {
    id: image.id,
    imageUrlWeb: image.imageUrlWeb,
    imageWidth: image.imageWidth,
    imageHeight: image.imageHeight,
    title: image.title
  });

  return (
    <div
      className={styles.imageFullScreenWrapper}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fullscreen-image-title"
    >
      <div className={styles.imageContainer} onClick={handleExitImageFullscreen}>
        <Image
          src={image.imageUrlWeb}
          alt={image.title || 'Full screen image'}
          width={image.imageWidth}
          height={image.imageHeight}
          style={{
            objectFit: 'contain',
            backgroundColor: 'transparent',
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