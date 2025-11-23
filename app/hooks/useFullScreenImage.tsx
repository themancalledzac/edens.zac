'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { FullScreenModal } from '@/app/components/FullScreenModal/FullScreenModal';
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

export function useFullScreenImage() {
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

    setFullScreenState({
      images,
      currentIndex: currentIndex !== -1 ? currentIndex : 0,
      scrollPosition: window.scrollY
    });
  }, []);

  const hideImage = () => {
    setFullScreenState(null);
    setShowMetadata(false);
  };

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
  }, [isOpen, navigateToNext, navigateToPrevious]);

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
      if (!e.touches[0] || isMetadataControl(e.target as HTMLElement)) return;
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
      
      if (isMetadataControl(e.target as HTMLElement)) {
        isSwiping.current = false;
        return;
      }
      
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
      
      isSwiping.current = false;
    };

    modalElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    modalElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    modalElement.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      modalElement.removeEventListener('touchstart', handleTouchStart);
      modalElement.removeEventListener('touchmove', handleTouchMove);
      modalElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, navigateToNext, navigateToPrevious, isMetadataControl]);

  const toggleMetadata = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMetadata(prev => !prev);
  }, []);

  const toggleMetadataTouch = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMetadata(prev => !prev);
  }, []);

  const Modal = () => (
    <FullScreenModal
      fullScreenState={fullScreenState}
      loadedImageIds={loadedImageIds}
      setLoadedImageIds={setLoadedImageIds}
      modalRef={modalRef}
      hideImage={hideImage}
      isSwiping={isSwiping}
      showMetadata={showMetadata}
      toggleMetadata={toggleMetadata}
      toggleMetadataTouch={toggleMetadataTouch}
      router={router}
    />
  );

  return {
    showImage,
    FullScreenModal: Modal,
    isOpen: !!fullScreenState
  };
}
