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
} | null;

/** Build a search string with `image` set to the given id, preserving other params. */
function buildImageSearch(id: number): string {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  params.set('image', String(id));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** Build a search string with `image` removed, preserving other params. */
function buildSearchWithoutImage(): string {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  params.delete('image');
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

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

  // Tracks whether *we* pushed a history entry for the open modal, so hideImage
  // pops exactly one entry and popstate (Back) is distinguished from our own pop.
  const pushedHistoryRef = useRef<boolean>(false);

  const showImage = useCallback((image: ImageBlock, allImages?: ImageBlock[]) => {
    const images = allImages || [image];
    const currentIndex = allImages?.findIndex(img => img.id === image.id) ?? 0;

    setFullScreenState({
      images,
      currentIndex: currentIndex !== -1 ? currentIndex : 0,
    });

    // Sync ?image=<id> onto the URL so the open viewer is deep-linkable.
    //
    // Three cases, distinguished so Back behaves correctly:
    //  1. Deep-link restore — the page already loaded with this exact ?image=<id>.
    //     We must NOT push (there's no collection entry behind us to pop back to);
    //     just REPLACE in place and leave pushedHistoryRef=false so hideImage strips
    //     the param rather than calling history.back().
    //  2. Fresh open from a click — no pushed entry yet. PUSH one entry so the
    //     collection page stays the prior history entry; Back then fires popstate,
    //     the param disappears, and the modal closes instead of leaving the page.
    //  3. Re-open while we already own a pushed entry — REPLACE so we never stack
    //     multiple entries for a single open session.
    if (typeof window !== 'undefined') {
      const url = `${window.location.pathname}${buildImageSearch(image.id)}`;
      const alreadyDeepLinked =
        !pushedHistoryRef.current &&
        new URLSearchParams(window.location.search).get('image') === String(image.id);

      if (pushedHistoryRef.current || alreadyDeepLinked) {
        window.history.replaceState({ fsImage: image.id }, '', url);
      } else {
        window.history.pushState({ fsImage: image.id }, '', url);
        pushedHistoryRef.current = true;
      }
    }
  }, []);

  const hideImage = useCallback(() => {
    setFullScreenState(null);
    setShowMetadata(false);
    setLoadedImageIds(new Set());

    if (typeof window !== 'undefined') {
      if (pushedHistoryRef.current) {
        // We own one pushed entry — pop it so the URL + history return to the
        // collection. Flip the ref BEFORE history.back() so the popstate handler
        // (which also fires) sees a clean slate and doesn't double-handle.
        pushedHistoryRef.current = false;
        window.history.back();
      } else {
        // Opened from a deep link (no pushed entry): just strip ?image in place.
        window.history.replaceState(
          {},
          '',
          `${window.location.pathname}${buildSearchWithoutImage()}`
        );
      }
    }
  }, []);

  const isOpen = !!fullScreenState;

  const navigate = useCallback((direction: 'next' | 'previous') => {
    setFullScreenState(prev => {
      if (!prev) return null;
      const delta = direction === 'next' ? 1 : -1;
      const newIndex = prev.currentIndex + delta;

      if (newIndex >= 0 && newIndex < prev.images.length) {
        const nextImage = prev.images[newIndex];
        // REPLACE (never push) so each swipe/arrow doesn't add a history entry —
        // Back should close the viewer, not step backward through images.
        if (nextImage && typeof window !== 'undefined') {
          window.history.replaceState(
            { fsImage: nextImage.id },
            '',
            `${window.location.pathname}${buildImageSearch(nextImage.id)}`
          );
        }
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
      if (event.key === 'ArrowLeft') {
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
  }, [isOpen, navigateToNext, navigateToPrevious]);

  // Browser Back: when the user navigates back and the `image` param is gone,
  // close the modal in place. We do NOT push/replace history here — the URL has
  // already moved, so touching it would feed back into popstate. Resetting
  // pushedHistoryRef here means a later hideImage strips the param via
  // replaceState instead of popping a second time (no double-Back).
  useEffect(() => {
    const handlePopState = () => {
      const hasImageParam = new URLSearchParams(window.location.search).has('image');
      if (!hasImageParam) {
        pushedHistoryRef.current = false;
        setFullScreenState(null);
        setShowMetadata(false);
        setLoadedImageIds(new Set());
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
