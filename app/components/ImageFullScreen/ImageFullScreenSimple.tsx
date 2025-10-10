'use client';

import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';

import type { ImageContentBlock } from '@/app/types/ContentBlock';

import styles from './ImageFullScreen.module.scss';

interface ImageFullScreenSimpleProps {
  images: ImageContentBlock[];
}

/**
 * Simplified Image Full Screen Component
 * 
 * Manages full-screen image viewing using URL state (?img=rawFileName).
 * Combines all logic into a single component for simplicity.
 */
export default function ImageFullScreenSimple({ images }: ImageFullScreenSimpleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Get selected image ID from URL (?img=DSC_8767)
  const selectedImageId = searchParams.get('img');

  // Find selected image by rawFileName (without extension)
  const selectedImage = selectedImageId
    ? images.find(img => {
        const rawName = img.rawFileName?.split('.')[0];
        return rawName === selectedImageId;
      })
    : null;

  // Handle close - remove ?img param
  const handleClose = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('img');
    const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
    router.push(newUrl, { scroll: false });
  }, [router, pathname, searchParams]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClose();
    }
    // Prevent scroll-related keys
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
    }
  }, [handleClose]);

  // Manage body overflow and event listeners
  useEffect(() => {
    if (!selectedImage) return;

    // Prevent scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Prevent scroll events
    const preventScroll = (e: Event) => e.preventDefault();
    const preventTouchMove = (e: TouchEvent) => {
      if ((e.target as HTMLElement).tagName !== 'IMG') {
        e.preventDefault();
      }
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('wheel', preventScroll, { passive: false });
    document.addEventListener('touchmove', preventTouchMove, { passive: false });

    return () => {
      // Cleanup
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventTouchMove);
    };
  }, [selectedImage, handleKeyDown]);

  if (!selectedImage?.imageUrlWeb) {
    return null;
  }

  const imageData = {
    id: selectedImage.id,
    imageUrlWeb: selectedImage.imageUrlWeb,
    imageWidth: selectedImage.imageWidth || 1200,
    imageHeight: selectedImage.imageHeight || 800,
    title: selectedImage.title || selectedImage.caption || selectedImage.rawFileName || undefined,
  };

  return (
    <div
      className={styles.imageFullScreenWrapper}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fullscreen-image-title"
    >
      <div className={styles.overlayContainer} onClick={handleClose}>
        <Image
          src={imageData.imageUrlWeb}
          alt={imageData.title || 'Full screen image'}
          width={imageData.imageWidth}
          height={imageData.imageHeight}
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