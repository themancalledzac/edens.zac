'use client';

import { useRouter } from 'next/navigation';
import {
  type Dispatch,
  type MouseEvent,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { INTERACTION } from '@/app/constants';
import { useBodyScrollLock } from '@/app/hooks/useBodyScrollLock';
import styles from '@/app/styles/fullscreen-image.module.scss';
import type { ViewableContent } from '@/app/types/Content';

const SCROLL_BLOCKING_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End'];

/**
 * Backwards-compatible alias for the union of content types that can open in the fullscreen
 * viewer. Now includes GIF/MP4 — see {@link ViewableContent}.
 */
export type ImageBlock = ViewableContent;

export type FullScreenState = {
  images: ImageBlock[];
  currentIndex: number;
  scrollPosition: number;
} | null;

export function useFullScreenImage(): {
  fullScreenState: FullScreenState;
  loadedImageIds: Set<number>;
  showMetadata: boolean;
  modalRef: RefObject<HTMLDivElement | null>;
  isSwiping: RefObject<boolean>;
  showImage: (image: ImageBlock, allImages?: ImageBlock[]) => void;
  hideImage: (e?: MouseEvent) => void;
  toggleMetadata: (e: MouseEvent) => void;
  setLoadedImageIds: Dispatch<SetStateAction<Set<number>>>;
  router: ReturnType<typeof useRouter>;
  isOpen: boolean;
  navigateToNext: () => void;
  navigateToPrevious: () => void;
} {
  const router = useRouter();
  const [fullScreenState, setFullScreenState] = useState<FullScreenState>(null);
  const [showMetadata, setShowMetadata] = useState(false);
  const [loadedImageIds, setLoadedImageIds] = useState<Set<number>>(new Set());
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const isSwiping = useRef<boolean>(false);

  /**
   * @remarks `scrollPosition` is stored for potential future scroll restoration.
   */
  const showImage = useCallback((image: ImageBlock, allImages?: ImageBlock[]) => {
    const images = allImages || [image];
    const currentIndex = allImages?.findIndex(img => img.id === image.id) ?? 0;

    setFullScreenState({
      images,
      currentIndex: currentIndex !== -1 ? currentIndex : 0,
      scrollPosition: window.scrollY,
    });
  }, []);

  const hideImage = useCallback(() => {
    setFullScreenState(null);
    setShowMetadata(false);
    setLoadedImageIds(new Set());
  }, []);

  const isOpen = !!fullScreenState;

  useBodyScrollLock(isOpen);

  const navigate = useCallback((direction: 'next' | 'previous') => {
    setFullScreenState(prev => {
      if (!prev) return null;
      const delta = direction === 'next' ? 1 : -1;
      const newIndex = prev.currentIndex + delta;

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
      // GIF/MP4 blocks render as <video>, not <img> — mark them loaded immediately so the
      // modal's loaded-state UI doesn't stall waiting for an image that never appears.
      if (currentImage.contentType === 'GIF') {
        setLoadedImageIds(prev => {
          if (prev.has(currentImage.id)) return prev;
          const newSet = new Set(prev);
          newSet.add(currentImage.id);
          return newSet;
        });
        return;
      }

      const imgSrc = 'imageUrl' in currentImage ? currentImage.imageUrl : undefined;
      if (!imgSrc) return;
      const imgElement = document.querySelector(`img[src="${imgSrc}"]`) as HTMLImageElement;

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
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('wheel', preventScroll);
    };
  }, [isOpen, navigateToNext, navigateToPrevious, hideImage]);

  const isMetadataControl = useCallback((target: HTMLElement | null): boolean => {
    if (!target) return false;
    return !!(
      target.closest(`.${styles.metadataToggle}`) || target.closest(`.${styles.metadataContent}`)
    );
  }, []);

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modalElement = modalRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      if (!e.touches[0]) return;
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

      if (
        isSwiping.current &&
        Math.abs(deltaX) > Math.abs(deltaY) &&
        Math.abs(deltaX) > INTERACTION.swipeThreshold
      ) {
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

  const toggleMetadata = useCallback((e: MouseEvent) => {
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
    isOpen: !!fullScreenState,
    navigateToNext,
    navigateToPrevious,
  };
}
