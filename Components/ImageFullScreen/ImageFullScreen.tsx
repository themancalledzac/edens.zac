import Image from 'next/image';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ImageInfo } from '@/Components/ImageInfo/ImageInfo';
import { type Image as ImageType } from '@/types/Image';
import { calculateOptimalDimensions } from '@/utils/imageUtils';

import styles from './ImageFullScreen.module.scss';

interface ImageFullScreenProps {
  imageSelected: ImageType;
  setImageSelected: (image: ImageType | null) => void;
}

interface ScreenSize {
  width: number;
  height: number;
}

interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * ImageFullScreen component displays an image in fullscreen mode with metadata in a sidebar
 */
export function ImageFullScreen({ imageSelected, setImageSelected }: ImageFullScreenProps) {
  // Constants
  const SIDEBAR_WIDTH = 300;
  const MOBILE_BREAKPOINT = 768;
  
  // State
  const [screenSize, setScreenSize] = useState<ScreenSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions>({ width: 0, height: 0 });
  const [imageError, setImageError] = useState<boolean>(false);

  // Derived values
  const isMobileView = screenSize.width < MOBILE_BREAKPOINT;
  const imageUrl = useMemo(() => {
    if (!imageSelected) return '';
    return imageSelected.imageUrlWeb && imageSelected.imageUrlWeb !== '' ? imageSelected.imageUrlWeb : '';
  }, [imageSelected]);

  const imageAlt = useMemo(() => {
    if (!imageSelected) return 'Photo';
    return imageSelected.title || 'Photo';
  }, [imageSelected]);

  // Event handlers
  const handleExitImageFullscreen = useCallback(() => {
    setImageSelected(null);
  }, [setImageSelected]);

  const handleImageError = useCallback(() => {
    console.error('Failed to load image:', imageUrl);
    setImageError(true);
  }, [imageUrl]);

  const handleResize = useCallback(() => {
    setScreenSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setImageSelected(null);
    }
  }, [setImageSelected]);

  const handleWheel = useCallback((e: WheelEvent) => {
    const isInSidebar = e.target instanceof Node && !!e.target.closest(`.${styles.sidebar}`);
    if (!isInSidebar) {
      e.preventDefault();
    }
  }, []);

  // Image dimension calculation
  const calculateDimensions = useCallback((): ImageDimensions => {
    if (!imageSelected) return { width: 0, height: 0 };

    try {
      const { imageWidth, imageHeight } = imageSelected;

      // Validate width and height are valid numbers
      if (!imageWidth || !imageHeight || Number.isNaN(imageWidth) || Number.isNaN(imageHeight)) {
        console.warn('Invalid image dimensions:', { imageWidth, imageHeight });
        return { width: 800, height: 600 }; // Fallback dimensions
      }

      const aspectRatio = imageWidth / imageHeight;

      const availableSpace = {
        width: isMobileView ? screenSize.width - 20 : screenSize.width - SIDEBAR_WIDTH - 20,
        height: isMobileView ? screenSize.height * 0.7 - 20 : screenSize.height - 20,
      };

      return calculateOptimalDimensions(aspectRatio, availableSpace);
    } catch (error) {
      console.error('Error calculating dimensions:', error);
      return { width: 800, height: 600 }; // Fallback dimensions
    }
  }, [screenSize, imageSelected, isMobileView]);

  // Reset image error when image changes
  useEffect(() => {
    setImageError(false);
  }, [imageSelected]);

  // Effects

  // Handle window resize
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Handle escape key press
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Update dimensions when calculation changes
  useEffect(() => {
    setImageDimensions(calculateDimensions());
  }, [calculateDimensions]);

  // Handle body scroll locking
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Render
  return (
    <div
      className={styles.imageFullScreenWrapper}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fullscreen-image-title"
    >
      <div className={styles.imageContainer} onClick={handleExitImageFullscreen}>
        {imageSelected && imageDimensions.height > 0 && !imageError && (
            <Image
              src={imageUrl}
              alt={imageAlt}
              width={imageDimensions.width}
              height={imageDimensions.height}
              style={{
                objectFit: 'contain',
                backgroundColor: 'transparent',
              }}
              // onClick={handleExitImageFullscreen}
              onError={handleImageError}
              priority
              unoptimized
            />
        )}

        {imageError && (
          <div className={styles.errorContainer}>
            <p>Failed to load image</p>
            <button
              onClick={handleExitImageFullscreen}
              className={styles.errorButton}
            >
              Close
            </button>
          </div>
        )}
      </div>

      {imageSelected && !imageError && (
        <div
          className={styles.sidebar}
          role="complementary"
          aria-label="Image details"
        >
          <ImageInfo image={imageSelected} width="100%" />
        </div>
      )}
      
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