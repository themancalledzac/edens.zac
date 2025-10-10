'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

import styles from '@/app/styles/fullscreen-image.module.scss';
import type { ImageContentBlock, ParallaxImageContentBlock } from '@/app/types/ContentBlock';

// Constants for better maintainability
const DEFAULT_IMAGE_WIDTH = 1200;
const DEFAULT_IMAGE_HEIGHT = 800;
const SCROLL_BLOCKING_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End'];

type FullScreenState = {
  image: ImageContentBlock | ParallaxImageContentBlock;
  scrollPosition: number;
} | null;

/**
 * Ultra-simple full screen image hook
 *
 * Returns:
 * - showImage: function to show an image in full screen
 * - FullScreenModal: component to render (or null if no image selected)
 */
export function useFullScreenImage() {
  const [fullScreenState, setFullScreenState] = useState<FullScreenState>(null);

  const showImage = useCallback((image: ImageContentBlock | ParallaxImageContentBlock) => {
    // Capture current scroll position BEFORE showing image
    const currentScroll = window.scrollY;
    setFullScreenState({
      image,
      scrollPosition: currentScroll
    });
  }, []);

  const hideImage = () => {
    setFullScreenState(null);
  };

  // Keyboard and scroll prevention
  useEffect(() => {
    if (!fullScreenState) return;

    // Prevent body scrolling while modal is open - CRITICAL for positioning
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFullScreenState(null);
      }
      if (SCROLL_BLOCKING_KEYS.includes(event.key)) {
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
  }, [fullScreenState]);

  const FullScreenModal = fullScreenState ? (
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
          src={fullScreenState.image.imageUrlWeb}
          alt={fullScreenState.image.title || fullScreenState.image.caption || 'Full screen image'}
          width={fullScreenState.image.imageWidth || DEFAULT_IMAGE_WIDTH}
          height={fullScreenState.image.imageHeight || DEFAULT_IMAGE_HEIGHT}
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