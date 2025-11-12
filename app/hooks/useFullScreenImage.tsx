'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { IMAGE, INTERACTION } from '@/app/constants';
import styles from '@/app/styles/fullscreen-image.module.scss';
import type { ContentImageModel, ContentParallaxImageModel } from '@/app/types/Content';

// Hook-specific constants
const SCROLL_BLOCKING_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End'];

type ImageBlock = ContentImageModel | ContentParallaxImageModel;

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
  const [showMetadata, setShowMetadata] = useState(false);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const isSwiping = useRef<boolean>(false);
  const overlayRef = useRef<HTMLDivElement>(null);

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
    setShowMetadata(false); // Reset metadata visibility when showing new image
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

  // Keyboard and scroll prevention
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

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('wheel', preventScroll, { passive: false });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('wheel', preventScroll);
    };
  }, [fullScreenState, navigateToNext, navigateToPrevious]);

  // Touch event handlers attached directly to modal element
  useEffect(() => {
    if (!fullScreenState || !modalRef.current) return;

    const modalElement = modalRef.current;

    // Touch event handlers for swipe detection
    const handleTouchStart = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isSwiping.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - touchStartX.current;
      const deltaY = currentY - touchStartY.current;

      // If horizontal movement is significant, prevent default and mark as swiping
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isSwiping.current = true;
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
      if (isSwiping.current && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > INTERACTION.swipeThreshold) {
        if (deltaX > 0) {
          // Swiped right - go to previous image
          navigateToPrevious();
        } else {
          // Swiped left - go to next image
          navigateToNext();
        }
        // Prevent click event from firing after swipe
        if (overlayRef.current) {
          overlayRef.current.style.pointerEvents = 'none';
          setTimeout(() => {
            if (overlayRef.current) {
              overlayRef.current.style.pointerEvents = '';
            }
          }, 300);
        }
      }
      
      isSwiping.current = false;
    };

    // Attach touch handlers directly to modal element
    modalElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    modalElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    modalElement.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      modalElement.removeEventListener('touchstart', handleTouchStart);
      modalElement.removeEventListener('touchmove', handleTouchMove);
      modalElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [fullScreenState, navigateToNext, navigateToPrevious]);

  const toggleMetadata = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMetadata(prev => !prev);
  };

  const FullScreenModal = fullScreenState ? (() => {
    const currentImage = fullScreenState.images[fullScreenState.currentIndex];
    if (!currentImage) return null;

    const modalContent = (
      <div
        ref={modalRef}
        className={styles.imageFullScreenWrapper}
        style={{
          top: `${fullScreenState.scrollPosition}px`, // Position at captured scroll position
        }}
        role="dialog"
        aria-modal="true"
      >
        <div ref={overlayRef} className={styles.overlayContainer} onClick={hideImage}>
          <div className={styles.imageWrapper}>
            <Image
              key={currentImage.id} // Force re-render on image change
              src={currentImage.imageUrl}
              alt={currentImage.title || currentImage.caption || 'Full screen image'}
              width={currentImage.imageWidth || IMAGE.defaultWidth}
              height={currentImage.imageHeight || IMAGE.defaultHeight}
              className={styles.fullScreenImage}
              priority
              unoptimized
            />
            
            <div
              className={`${styles.metadataOverlay} ${showMetadata ? styles.metadataOverlayVisible : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Metadata toggle button - always visible */}
              <button
                className={styles.metadataToggle}
                onClick={toggleMetadata}
                aria-label={showMetadata ? 'Hide metadata' : 'Show metadata'}
                aria-expanded={showMetadata}
              >
                <span aria-hidden="true">{showMetadata ? '↑' : '↓'}</span>
              </button>

              {/* Metadata content - only visible when showMetadata is true */}
              {showMetadata && (
                <div className={styles.metadataContent}>
                  {currentImage.title && (
                    <div className={styles.metadataTitle}>{currentImage.title}</div>
                  )}
                  {currentImage.author && (
                    <div className={styles.metadataItem}>{currentImage.author}</div>
                  )}
                  {(currentImage.camera || currentImage.lens) && (
                    <div className={styles.metadataItem}>
                      {currentImage.camera && <span>{currentImage.camera.name}</span>}
                      {currentImage.camera && currentImage.lens && <span className={styles.metadataSeparator}> / </span>}
                      {currentImage.lens && <span>{currentImage.lens.name}</span>}
                    </div>
                  )}
                  {(currentImage.iso || currentImage.fStop || currentImage.shutterSpeed || currentImage.focalLength) && (
                    <div className={styles.metadataSettingsRow}>
                      {currentImage.iso && <span>{currentImage.iso}</span>}
                      {currentImage.shutterSpeed && <span>{currentImage.shutterSpeed}</span>}
                      {currentImage.fStop && <span>{currentImage.fStop}</span>}
                      {currentImage.focalLength && <span>{currentImage.focalLength}</span>}
                    </div>
                  )}
                  {currentImage.people && currentImage.people.length > 0 && (
                    <div className={styles.metadataSection}>
                      <div className={styles.metadataSectionHeader}>People</div>
                      <div className={styles.metadataSectionItems}>
                        {currentImage.people.map((p, index) => (
                          <div key={p.id || index} className={styles.metadataSectionItem}>
                            {p.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {currentImage.collections && currentImage.collections.length > 0 && (
                    <div className={styles.metadataSection}>
                      <div className={styles.metadataSectionHeader}>Collections</div>
                      <div className={styles.metadataSectionItems}>
                        {currentImage.collections.map((c, index) => (
                          <div key={c.collectionId || index} className={styles.metadataSectionItem}>
                            {c.name || `Collection ${c.collectionId}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
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