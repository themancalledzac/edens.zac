'use client';

import { useRouter } from 'next/navigation';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { INTERACTION } from '@/app/constants';
import styles from '@/app/styles/fullscreen-image.module.scss';
import type { ContentImageModel, ContentParallaxImageModel } from '@/app/types/Content';

const SCROLL_BLOCKING_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End'];

export type ImageBlock = ContentImageModel | ContentParallaxImageModel;

export type FullScreenState = {
  images: ImageBlock[];
  currentIndex: number;
  scrollPosition: number;
} | null;

export function useFullScreenImage(): {
  fullScreenState: FullScreenState;
  loadedImageIds: Set<number>;
  showMetadata: boolean;
  modalRef: React.RefObject<HTMLDivElement | null>;
  isSwiping: React.RefObject<boolean>;
  showImage: (image: ImageBlock, allImages?: ImageBlock[]) => void;
  hideImage: (e?: React.MouseEvent) => void;
  toggleMetadata: (e: React.MouseEvent) => void;
  setLoadedImageIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  router: ReturnType<typeof useRouter>;
  isOpen: boolean;
} {
  const router = useRouter();
  const [fullScreenState, setFullScreenState] = useState<FullScreenState>(null);
  const [showMetadata, setShowMetadata] = useState(false);
  const [loadedImageIds, setLoadedImageIds] = useState<Set<number>>(new Set());
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const isSwiping = useRef<boolean>(false);

  const showImage = useCallback((
    image: ImageBlock,
    allImages?: ImageBlock[]
  ) => {
    const images = allImages || [image];
    const currentIndex = allImages?.findIndex(img => img.id === image.id) ?? 0;

    // Disable 3D perspective before modal renders - fixes mobile fixed positioning
    // With perspective disabled, position: fixed works correctly relative to viewport
    document.body.style.perspective = 'none';
    document.body.style.transformStyle = 'flat';

    setFullScreenState({
      images,
      currentIndex: currentIndex !== -1 ? currentIndex : 0,
      scrollPosition: window.scrollY // Stored for potential future use (scroll restoration)
    });
  }, []);

  const hideImage = useCallback(() => {
    // Restore 3D perspective for parallax effects
    document.body.style.perspective = '1px';
    document.body.style.transformStyle = 'preserve-3d';
    
    setFullScreenState(null);
    setShowMetadata(false);
    setLoadedImageIds(new Set());
  }, []);

  const isOpen = !!fullScreenState;

  const navigate = useCallback((direction: 'next' | 'previous') => {
    setFullScreenState(prev => {
      if (!prev) return null;
      const delta = direction === 'next' ? 1 : -1;
      const newIndex = prev.currentIndex + delta;
      
      // Check bounds
      if (newIndex >= 0 && newIndex < prev.images.length) {
        return { ...prev, currentIndex: newIndex };
      }
      return prev;
    });
  }, []);

  const navigateToNext = useCallback(() => navigate('next'), [navigate]);
  const navigateToPrevious = useCallback(() => navigate('previous'), [navigate]);

  useEffect(() => {
    if (!fullScreenState) return;
    const currentImage = fullScreenState.images[fullScreenState.currentIndex];
    if (!currentImage) return;
    
    const checkImageLoaded = () => {
      const imgElement = document.querySelector(
        `img[src="${currentImage.imageUrl}"]`
      ) as HTMLImageElement;
      
      if (imgElement?.complete && imgElement?.naturalHeight !== 0) {
        setLoadedImageIds(prev => {
          if (prev.has(currentImage.id)) return prev;
          const newSet = new Set(prev);
          newSet.add(currentImage.id);
          return newSet;
        });
      }
    };

    checkImageLoaded();
    const timeoutId = setTimeout(checkImageLoaded, 100);
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullScreenState?.currentIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hideImage();
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
  }, [isOpen, navigateToNext, navigateToPrevious, hideImage]);

  const isMetadataControl = useCallback((target: HTMLElement | null): boolean => {
    if (!target) return false;
    return !!(
      target.closest(`.${styles.metadataToggle}`) || 
      target.closest(`.${styles.metadataContent}`)
    );
  }, []);

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modalElement = modalRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      
      // Don't preventDefault here - let buttons work normally
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isSwiping.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches[0] || isMetadataControl(e.target as HTMLElement)) return;
      
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - touchStartX.current;
      const deltaY = currentY - touchStartY.current;

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

      if (isSwiping.current && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > INTERACTION.swipeThreshold) {
        if (deltaX > 0) {
          navigateToPrevious();
        } else {
          navigateToNext();
        }
      }
      
      setTimeout(() => {
        isSwiping.current = false;
      }, 50);
    };

    modalElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    modalElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    modalElement.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      modalElement.removeEventListener('touchstart', handleTouchStart);
      modalElement.removeEventListener('touchmove', handleTouchMove);
      modalElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, navigateToNext, navigateToPrevious, isMetadataControl]);

  const toggleMetadata = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMetadata(prev => !prev);
  }, []);

  return {
    fullScreenState,
    loadedImageIds,
    showMetadata,
    modalRef,
    isSwiping,
    showImage,
    hideImage,
    toggleMetadata,
    setLoadedImageIds,
    router,
    isOpen: !!fullScreenState
  };
}
