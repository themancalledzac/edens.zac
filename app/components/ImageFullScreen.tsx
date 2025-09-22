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