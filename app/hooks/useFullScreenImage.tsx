'use client';

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

import styles from '@/app/components/FullScreenModal/FullScreenModal.module.scss';
import { INTERACTION } from '@/app/constants';
import type { ViewableContent } from '@/app/types/Content';
import {
  exitFullscreen,
  fullscreenElement,
  onFullscreenChange,
  requestFullscreen,
} from '@/app/utils/fullscreen';
import {
  buildTransform,
  clampScale,
  clampTranslate,
  touchDistance,
} from '@/app/utils/imageZoomPan';

/** Max gap (ms) and movement (px) between two taps to count as a double-tap. */
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP = 30;

/** A single-finger touch that moves less than this (px) between down and up counts as a tap. */
const TAP_SLOP = 10;

const SCROLL_BLOCKING_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End'];

/** Controls that own their own key handling — Space activates a button, keys type into a field. */
const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea';

/**
 * True when a key event originated on an interactive control. Scroll-blocking must skip those:
 * `preventDefault()` on Space would otherwise silently kill button activation for keyboard users
 * (Enter still fires, so the breakage looks like nothing at all). Guarded for non-Element targets
 * (document/window), which have no `closest`.
 */
function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(INTERACTIVE_SELECTOR) !== null;
}

export type FullScreenState = {
  images: ViewableContent[];
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

/**
 * State and gesture handling for the full-screen image viewer.
 *
 * Gesture state lives in refs and the live transform is written imperatively to `zoomTargetRef`,
 * which avoids a React re-render per touchmove frame. `isZoomed` mirrors scale > 1 as state only
 * because it gates render-affecting behaviour (swipe navigation, tap-to-close). `showMetadata` and
 * `immersiveRef` are mirrored into refs because the touch handlers do not re-bind on change and
 * must read the current value synchronously; `requestFullscreen` in particular has to run inside
 * the gesture to satisfy the user-activation requirement.
 *
 * Immersive mode: a stationary tap at 1× hides all chrome for an image-only view and, where the
 * browser supports it, requests native fullscreen to reclaim the address-bar height. The tap
 * handler is touch-only, so desktop mouse clicks keep their close-on-click behaviour. Where a tap
 * lands decides its action: a control runs that control, the framed photo toggles immersive
 * (shared with the desktop click path in FullScreenModal), and the black letterbox dismisses.
 * Toggling immersive swallows the synthetic click the tap produces so it does not toggle twice.
 *
 * A stationary touch while zoomed must reach double-tap detection rather than be eaten as a pan,
 * so a pan only counts when the finger actually moved.
 *
 * URL sync: `?image=<id>` is kept on the URL so the open viewer is deep-linkable. Opening has
 * three cases, distinguished so Back behaves correctly. A deep-link restore replaces in place and
 * leaves `pushedHistoryRef` false, because no collection entry sits behind it to pop back to. A
 * fresh open from a click pushes one entry, so Back fires popstate, the param disappears and the
 * modal closes instead of leaving the page. A re-open while this hook already owns a pushed entry
 * replaces, so a single session never stacks entries. On close, an owned entry is popped after
 * the ref is flipped, so the popstate handler sees a clean slate and does not double-handle; a
 * deep-linked open just strips the param in place. Swiping or arrowing syncs the param with
 * `replaceState` from an effect, never a push, so Back closes the viewer instead of stepping
 * through images; it lives in an effect because Next.js patches `history.replaceState` to set
 * state on its Router, which would fire during render. On browser Back the hook closes the modal
 * in place without touching history, since the URL has already moved and touching it would feed
 * back into popstate.
 *
 * GIF/MP4 blocks are marked loaded as soon as they become the current item. They render as
 * `<video>`, not `<img>`, so the modal's `onLoad` never fires for them and its loaded-state UI
 * would stall waiting for an image that never appears. Images are deliberately not handled here:
 * an earlier fallback searched for `img[src="<raw CloudFront URL>"]`, which could never match
 * because the modal renders `next/image` without `unoptimized`, so the DOM `src` is a
 * `/_next/image?url=…` rewrite. The modal's own `onLoad` is the live path. That effect is keyed to
 * `currentIndex` only, deliberately: it should re-run when the viewer moves to a different item,
 * not on every `fullScreenState` mutation such as a scroll-position change, and the stable
 * `setLoadedImageIds` dispatcher does not need listing.
 *
 * If the user leaves native fullscreen through the browser's own UI while the hook still thinks it
 * is immersive, it drops back to the chromed view so the user is not stranded without controls.
 * Pinching re-clamps the pan offsets, because zooming out can push a previously valid pan past the
 * new, smaller bound. At 1× a swipe down closes the metadata panel if open and otherwise closes
 * the viewer, and a swipe up reveals metadata.
 */
export function useFullScreenImage(): {
  fullScreenState: FullScreenState;
  loadedImageIds: Set<number>;
  showMetadata: boolean;
  modalRef: RefObject<HTMLDivElement | null>;
  /** Attach to the element wrapping ONLY the media — receives the pinch-zoom transform. */
  zoomTargetRef: RefObject<HTMLDivElement | null>;
  /** True while the image is pinch-zoomed past 1×; gates swipe-nav and tap-to-close. */
  isZoomed: boolean;
  /** True while immersive mode is on (all chrome hidden); toggled by tap/click, persists across nav. */
  immersive: boolean;
  /** Flip immersive mode. Call from a user gesture so the native fullscreen request survives. */
  toggleImmersive: () => void;
  isSwiping: RefObject<boolean>;
  showImage: (image: ViewableContent, allImages?: ViewableContent[]) => void;
  hideImage: () => void;
  toggleMetadata: (e: MouseEvent) => void;
  setLoadedImageIds: Dispatch<SetStateAction<Set<number>>>;
  isOpen: boolean;
  navigateToNext: () => void;
  navigateToPrevious: () => void;
} {
  const [fullScreenState, setFullScreenState] = useState<FullScreenState>(null);
  const [showMetadata, setShowMetadata] = useState(false);
  const showMetadataRef = useRef<boolean>(false);
  const [loadedImageIds, setLoadedImageIds] = useState<Set<number>>(new Set());
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const isSwiping = useRef<boolean>(false);

  const zoomTargetRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef<number>(1);
  const txRef = useRef<number>(0);
  const tyRef = useRef<number>(0);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [immersive, setImmersive] = useState<boolean>(false);
  const immersiveRef = useRef<boolean>(false);
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);
  const panRef = useRef<{ lastX: number; lastY: number } | null>(null);
  const didMoveRef = useRef<boolean>(false);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  const resetZoom = useCallback(() => {
    scaleRef.current = 1;
    txRef.current = 0;
    tyRef.current = 0;
    pinchRef.current = null;
    panRef.current = null;
    const el = zoomTargetRef.current;
    if (el) el.style.transform = '';
    setIsZoomed(false);
  }, []);

  /**
   * Flip immersive mode (all chrome hidden, image only). Native fullscreen is requested on the way
   * in and left on the way out — best-effort, and unsupported on iPhone WebKit, where the
   * chrome-hide alone carries the feature. Must run inside the user gesture (touch tap or click)
   * so the fullscreen request keeps its user activation.
   */
  const toggleImmersive = useCallback(() => {
    const next = !immersiveRef.current;
    immersiveRef.current = next;
    setImmersive(next);
    if (next) {
      void requestFullscreen(modalRef.current);
    } else {
      void exitFullscreen();
    }
  }, []);

  const pushedHistoryRef = useRef<boolean>(false);

  /**
   * Open the viewer on `image`, with `allImages` as the sequence prev/next walks.
   *
   * `image` is not always a member of `allImages`: the collection cover is synthesized at layout
   * time with id {@link COVER_IMAGE_CONTENT_ID} and never reaches the content array behind that
   * list. A non-member opens as a single-image list, so the viewer always shows the image that was
   * clicked and always has one to render — a state carrying no renderable image blacks out the page
   * (see `FullScreenModal`).
   */
  const showImage = useCallback((image: ViewableContent, allImages?: ViewableContent[]) => {
    const index = allImages?.findIndex(img => img.id === image.id) ?? -1;
    const images = index === -1 ? [image] : allImages!;

    setFullScreenState({
      images,
      currentIndex: index === -1 ? 0 : index,
    });

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
    immersiveRef.current = false;
    setImmersive(false);
    void exitFullscreen();

    if (typeof window !== 'undefined') {
      if (pushedHistoryRef.current) {
        pushedHistoryRef.current = false;
        window.history.back();
      } else {
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
      if (!prev) return prev;
      const delta = direction === 'next' ? 1 : -1;
      const newIndex = prev.currentIndex + delta;
      if (newIndex < 0 || newIndex >= prev.images.length) return prev;
      return { ...prev, currentIndex: newIndex };
    });
  }, []);

  const navigateToNext = useCallback(() => navigate('next'), [navigate]);
  const navigateToPrevious = useCallback(() => navigate('previous'), [navigate]);

  useEffect(() => {
    if (!fullScreenState || typeof window === 'undefined') return;
    const current = fullScreenState.images[fullScreenState.currentIndex];
    if (!current) return;
    if (new URLSearchParams(window.location.search).get('image') === String(current.id)) return;
    window.history.replaceState(
      { fsImage: current.id },
      '',
      `${window.location.pathname}${buildImageSearch(current.id)}`
    );
  }, [fullScreenState]);

  useEffect(() => {
    const currentImage = fullScreenState?.images[fullScreenState.currentIndex];
    if (currentImage?.contentType !== 'GIF') return;

    setLoadedImageIds(prev => {
      if (prev.has(currentImage.id)) return prev;
      const next = new Set(prev);
      next.add(currentImage.id);
      return next;
    });
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
      } else if (SCROLL_BLOCKING_KEYS.includes(event.key) && !isInteractiveTarget(event.target)) {
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

  useEffect(() => {
    const handlePopState = () => {
      const hasImageParam = new URLSearchParams(window.location.search).has('image');
      if (!hasImageParam) {
        pushedHistoryRef.current = false;
        setFullScreenState(null);
        setShowMetadata(false);
        setLoadedImageIds(new Set());
        immersiveRef.current = false;
        setImmersive(false);
        void exitFullscreen();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    return onFullscreenChange(() => {
      if (!fullscreenElement() && immersiveRef.current) {
        immersiveRef.current = false;
        setImmersive(false);
      }
    });
  }, [isOpen]);

  useEffect(() => {
    showMetadataRef.current = showMetadata;
  }, [showMetadata]);

  const isMetadataControl = useCallback((target: HTMLElement | null): boolean => {
    if (!target) return false;
    return !!(
      target.closest(`.${styles.metadataToggle}`) || target.closest(`.${styles.metadataContent}`)
    );
  }, []);

  useEffect(() => {
    resetZoom();
  }, [fullScreenState?.currentIndex, resetZoom]);

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modalElement = modalRef.current;

    const applyTransform = () => {
      const el = zoomTargetRef.current;
      if (el) el.style.transform = buildTransform(scaleRef.current, txRef.current, tyRef.current);
    };

    const zoomSize = (): { w: number; h: number } => {
      const el = zoomTargetRef.current;
      return el ? { w: el.clientWidth, h: el.clientHeight } : { w: 0, h: 0 };
    };

    const suppressTapClose = () => {
      isSwiping.current = true;
    };

    const isControlTap = (target: EventTarget | null): boolean =>
      target instanceof HTMLElement && !!target.closest(`button, a, .${styles.metadataOverlay}`);
    const isImageTap = (target: EventTarget | null): boolean =>
      target instanceof HTMLElement && !!target.closest(`.${styles.imageWrapper}`);

    const handleTouchStart = (e: TouchEvent) => {
      isSwiping.current = false;
      didMoveRef.current = false;

      if (e.touches.length === 2 && e.touches[0] && e.touches[1]) {
        pinchRef.current = {
          startDist: touchDistance(e.touches[0], e.touches[1]),
          startScale: scaleRef.current,
        };
        panRef.current = null;
        e.preventDefault();
        return;
      }

      const t = e.touches[0];
      if (!t) return;
      touchStartX.current = t.clientX;
      touchStartY.current = t.clientY;
      panRef.current = scaleRef.current > 1 ? { lastX: t.clientX, lastY: t.clientY } : null;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (pinchRef.current && e.touches.length === 2 && e.touches[0] && e.touches[1]) {
        const dist = touchDistance(e.touches[0], e.touches[1]);
        const next = clampScale(pinchRef.current.startScale * (dist / pinchRef.current.startDist));
        scaleRef.current = next;
        didMoveRef.current = true;
        const { w, h } = zoomSize();
        txRef.current = clampTranslate(txRef.current, next, w);
        tyRef.current = clampTranslate(tyRef.current, next, h);
        applyTransform();
        e.preventDefault();
        return;
      }

      if (panRef.current && scaleRef.current > 1 && e.touches.length === 1 && e.touches[0]) {
        const t = e.touches[0];
        const dx = t.clientX - panRef.current.lastX;
        const dy = t.clientY - panRef.current.lastY;
        panRef.current = { lastX: t.clientX, lastY: t.clientY };
        didMoveRef.current = true;
        const { w, h } = zoomSize();
        txRef.current = clampTranslate(txRef.current + dx, scaleRef.current, w);
        tyRef.current = clampTranslate(tyRef.current + dy, scaleRef.current, h);
        applyTransform();
        e.preventDefault();
        return;
      }

      if (scaleRef.current === 1 && e.touches[0]) {
        const deltaX = e.touches[0].clientX - touchStartX.current;
        const deltaY = e.touches[0].clientY - touchStartY.current;
        const horizontal = Math.abs(deltaX) > Math.abs(deltaY);
        if (horizontal && Math.abs(deltaX) > 10 && !isMetadataControl(e.target as HTMLElement)) {
          isSwiping.current = true;
          e.preventDefault();
        } else if (!horizontal && Math.abs(deltaY) > 10) {
          isSwiping.current = true;
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (pinchRef.current && e.touches.length < 2) {
        pinchRef.current = null;
        setIsZoomed(scaleRef.current > 1);
        suppressTapClose();
        if (e.touches[0] && scaleRef.current > 1) {
          panRef.current = { lastX: e.touches[0].clientX, lastY: e.touches[0].clientY };
        }
        return;
      }

      if (panRef.current && e.touches.length === 0) {
        panRef.current = null;
        if (didMoveRef.current) {
          suppressTapClose();
          return;
        }
      }

      const changed = e.changedTouches[0];
      if (!changed) return;

      if (!isSwiping.current && e.touches.length === 0) {
        const last = lastTapRef.current;
        if (
          last &&
          e.timeStamp - last.time < DOUBLE_TAP_MS &&
          Math.abs(changed.clientX - last.x) < DOUBLE_TAP_SLOP &&
          Math.abs(changed.clientY - last.y) < DOUBLE_TAP_SLOP
        ) {
          lastTapRef.current = null;
          if (scaleRef.current > 1) {
            scaleRef.current = 1;
            txRef.current = 0;
            tyRef.current = 0;
            applyTransform();
            setIsZoomed(false);
            suppressTapClose();
          }
          return;
        }
        lastTapRef.current = { time: e.timeStamp, x: changed.clientX, y: changed.clientY };
      }

      if (scaleRef.current === 1) {
        const deltaX = changed.clientX - touchStartX.current;
        const deltaY = changed.clientY - touchStartY.current;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        const horizontalSwipe =
          isSwiping.current && absX > absY && absX > INTERACTION.swipeThreshold;
        const verticalSwipe = isSwiping.current && absY > absX && absY > INTERACTION.swipeThreshold;

        if (horizontalSwipe) {
          if (deltaX > 0) {
            navigateToPrevious();
          } else {
            navigateToNext();
          }
        } else if (verticalSwipe) {
          if (deltaY > 0) {
            if (showMetadataRef.current) {
              setShowMetadata(false);
            } else {
              hideImage();
            }
          } else if (!showMetadataRef.current) {
            setShowMetadata(true);
          }
        } else if (
          !didMoveRef.current &&
          !isSwiping.current &&
          absX < TAP_SLOP &&
          absY < TAP_SLOP &&
          !isControlTap(e.target)
        ) {
          if (isImageTap(e.target)) {
            toggleImmersive();
            suppressTapClose();
          } else {
            hideImage();
            suppressTapClose();
          }
        }

        setTimeout(() => {
          isSwiping.current = false;
        }, 50);
      }
    };

    modalElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    modalElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    modalElement.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      modalElement.removeEventListener('touchstart', handleTouchStart);
      modalElement.removeEventListener('touchmove', handleTouchMove);
      modalElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, navigateToNext, navigateToPrevious, isMetadataControl, hideImage, toggleImmersive]);

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
    zoomTargetRef,
    isZoomed,
    immersive,
    toggleImmersive,
    isSwiping,
    showImage,
    hideImage,
    toggleMetadata,
    setLoadedImageIds,
    isOpen: !!fullScreenState,
    navigateToNext,
    navigateToPrevious,
  };
}
