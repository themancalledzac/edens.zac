import Image from 'next/image';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import ImageInfo from '@/Components/ImageInfo/ImageInfo';
import { calculateOptimalDimensions, isValidSource } from '@/utils/imageUtils';

import styles from './ImageFullScreen.module.scss';

/**
 * ImageFUllScreen component displays an image in fullscreen mode with metadata in a sidebar
 *
 * @param {Object} imageSelected The selected image object with metadata
 * @param {Function} setImageSelected Function to update the selected image state
 * @constructor
 */
export default function ImageFullScreen({ imageSelected, setImageSelected }) {
  const SIDEBAR_WIDTH = 300; // Default sidebar width
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setImageSelected(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setImageSelected]);

  const imageUrl = useMemo(() => {
    if (!imageSelected) return '';
    return isValidSource(imageSelected.imageUrlWeb) ? imageSelected.imageUrlWeb : '';
  }, [imageSelected]);

  /**
   * useCallback Hook that calculates
   * the optimal dimensions for the displayed image
   */
  const calculateDimensions = useCallback(() => {
    if (!imageSelected) return;

    // Step 1: Extract image properties
    const { imageWidth, imageHeight } = imageSelected;
    const aspectRatio = imageWidth / imageHeight;
    const isMobileView = screenSize.width < 768;

    // Step 2: Calculate available space based on layout
    const availableSpace = {
      width: isMobileView ? screenSize.width - 20 : screenSize.width - SIDEBAR_WIDTH - 20,
      height: isMobileView ? screenSize.height * 0.7 - 20 : screenSize.height - 20,
    };

    // Step 3: Calculate optimal dimensions
    return calculateOptimalDimensions(aspectRatio, availableSpace);
  }, [screenSize, imageSelected]);

  /**
   * Hook to update dimensions when calculateDimensions change
   */
  useEffect(() => {
    setImageDimensions(calculateDimensions());
  }, [calculateDimensions]);

  /**
   * Hook on load that removes background page scroll
   */
  useEffect(() => {
    // Save original style
    const originalStyle = document.body.style.overflow;

    // Disable scrolling on body
    document.body.style.overflow = 'hidden';

    // Prevent mouse wheel events on the wrapper but not on the sidebar
    const handleWheel = (e) => {
      // Check if the event target is within the sidebar
      const isInSidebar = e.target.closest(`.${styles.sidebar}`);

      // Only prevent default if not in sidebar
      if (!isInSidebar) {
        e.preventDefault();
      }
    };

    // Add the event listener with passive: false to allow preventDefault()
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      // Restore original style and remove listener
      document.body.style.overflow = originalStyle;
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleClickOutside = () => {
    setImageSelected(null);
  };

  const handleImageClick = (e) => {
    e.stopPropagation(); // prevent triggering handleClickOutside
    setImageSelected(null);
  };

  return (
    <div className={styles.imageFullScreenWrapper} onClick={handleClickOutside}>
      <div className={styles.imageContainer} onClick={handleImageClick}>
        {imageSelected && imageDimensions.height > 0 && (
          <Image
            src={imageUrl}
            alt="Photo"
            width={imageDimensions.width}
            height={imageDimensions.height}
            style={{
              objectFit: 'contain',
              backgroundColor: 'transparent',
            }}
            onClick={handleImageClick}
            priority
            unoptimized
          />
        )}
        {/* Conditional rendering for SideBar based on orientation */}
      </div>
      {imageSelected && (
        <div className={styles.sidebar}>
          <ImageInfo image={imageSelected} width="100%" />
        </div>
      )}
      <button
        className={styles.closeButton}
        onClick={handleClickOutside}>
        &#10005; {/* This is the HTML entity for a multiplication sign (X) */}
      </button>
    </div>
  );
}