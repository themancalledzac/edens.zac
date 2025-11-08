'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { IMAGE, INTERACTION } from '@/app/constants';
import styles from '@/app/styles/fullscreen-image.module.scss';
import type { ImageContentModel, ParallaxImageContentModel } from '@/app/types/Content';

// Hook-specific constants
const SCROLL_BLOCKING_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End'];

type ImageBlock = ImageContentModel | ParallaxImageContentModel;

type FullScreenState = {
  images: ImageBlock[];
  currentIndex: number;
  scrollPosition: number;
} | null;

/**
 * Full screen image hook with navigation and swipe support
 *
 * Returns:
 * - showImage: function to show an image in full screen with optional navigation through all images
 * - FullScreenModal: component to render (or null if no image selected)
 */
export function useFullScreenImage() {
  const [fullScreenState, setFullScreenState] = useState<FullScreenState>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const showImage = useCallback((
    image: ImageBlock,
    allImages?: ImageBlock[]
  ) => {
    // Capture current scroll position BEFORE showing image
    const currentScroll = window.scrollY;

    // If allImages provided, find index of current image, otherwise single image mode
    const images = allImages || [image];
    const currentIndex = allImages
      ? allImages.findIndex(img => img.id === image.id)
      : 0;

    setFullScreenState({
      images,
      currentIndex: currentIndex !== -1 ? currentIndex : 0,
      scrollPosition: currentScroll
    });
  }, []);

  const hideImage = () => {
    setFullScreenState(null);
  };

  const navigateToNext = useCallback(() => {
    if (!fullScreenState) return;

    const nextIndex = fullScreenState.currentIndex + 1;
    if (nextIndex < fullScreenState.images.length) {
      setFullScreenState(prev => prev ? { ...prev, currentIndex: nextIndex } : null);
    }
  }, [fullScreenState]);

  const navigateToPrevious = useCallback(() => {
    if (!fullScreenState) return;

    const prevIndex = fullScreenState.currentIndex - 1;
    if (prevIndex >= 0) {
      setFullScreenState(prev => prev ? { ...prev, currentIndex: prevIndex } : null);
    }
  }, [fullScreenState]);

  // Keyboard, scroll prevention, and touch events
  useEffect(() => {
    if (!fullScreenState) return;

    // Prevent body scrolling while modal is open - CRITICAL for positioning
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFullScreenState(null);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateToPrevious();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateToNext();
      } else if (SCROLL_BLOCKING_KEYS.includes(event.key)) {
        event.preventDefault();
      }
    };

    const preventScroll = (e: Event) => e.preventDefault();

    // Touch event handlers for swipe detection
    const handleTouchStart = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Prevent default to avoid scrolling while swiping
      if ((e.target as HTMLElement).closest(`.${styles.overlayContainer}`)) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!e.changedTouches[0]) return;
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;

      // Only trigger swipe if horizontal movement is greater than vertical
      // This prevents accidental swipes when user tries to zoom/scroll
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > INTERACTION.swipeThreshold) {
        if (deltaX > 0) {
          // Swiped right - go to previous image
          navigateToPrevious();
        } else {
          // Swiped left - go to next image
          navigateToNext();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('wheel', preventScroll, { passive: false });
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [fullScreenState, navigateToNext, navigateToPrevious]);

  const FullScreenModal = fullScreenState ? (() => {
    const currentImage = fullScreenState.images[fullScreenState.currentIndex];
    if (!currentImage) return null;

    const modalContent = (
      <div
        className={styles.imageFullScreenWrapper}
        style={{
          top: `${fullScreenState.scrollPosition}px`, // Position at captured scroll position
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.overlayContainer} onClick={hideImage}>
          <Image
            key={currentImage.id} // Force re-render on image change
            src={currentImage.imageUrl}
            alt={currentImage.title || currentImage.caption || 'Full screen image'}
            width={currentImage.imageWidth || IMAGE.defaultWidth}
            height={currentImage.imageHeight || IMAGE.defaultHeight}
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
    );

    // Render modal at body level using portal to avoid parent container positioning issues
    if (typeof document !== 'undefined') {
      return createPortal(modalContent, document.body);
    }
    return null;
  })() : null;

  return {
    showImage,
    FullScreenModal
  };
}