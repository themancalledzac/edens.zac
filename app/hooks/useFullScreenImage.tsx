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
  /** Attach to the element wrapping ONLY the media — receives the pinch-zoom transform. */
  zoomTargetRef: RefObject<HTMLDivElement | null>;
  /** True while the image is pinch-zoomed past 1×; gates swipe-nav and tap-to-close. */
  isZoomed: boolean;
  /** True while immersive mode is on (all chrome hidden); touch-toggled, persists across nav. */
  immersive: boolean;
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
  // Mirror showMetadata into a ref so the touch handlers (which don't re-bind on metadata changes)
  // can read the current value synchronously inside a gesture.
  const showMetadataRef = useRef<boolean>(false);
  const [loadedImageIds, setLoadedImageIds] = useState<Set<number>>(new Set());
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const isSwiping = useRef<boolean>(false);

  // --- Pinch-zoom / pan gesture state -------------------------------------------------
  // The live transform lives in refs and is written imperatively to zoomTargetRef during a
  // gesture (avoids a React re-render per touchmove frame). `isZoomed` mirrors scale > 1 as
  // state because it gates *render-affecting* behavior (swipe-nav, tap-to-close).
  const zoomTargetRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef<number>(1);
  const txRef = useRef<number>(0);
  const tyRef = useRef<number>(0);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  // Immersive mode: a stationary tap (touch, at 1×) hides all chrome for an image-only view and,
  // where the browser supports it, requests native fullscreen to reclaim the address-bar height.
  // `immersiveRef` mirrors the state so the touch handlers can read/flip it synchronously inside
  // the gesture, where requestFullscreen must run to satisfy the user-activation requirement.
  const [immersive, setImmersive] = useState<boolean>(false);
  const immersiveRef = useRef<boolean>(false);
  // Two-finger pinch in progress: starting finger gap + scale to derive the live scale from.
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);
  // One-finger pan in progress (only while zoomed): last seen finger position.
  const panRef = useRef<{ lastX: number; lastY: number } | null>(null);
  // Whether the finger actually moved this gesture — separates a real pan from a
  // stationary tap (which, while zoomed, must reach double-tap detection, not be eaten as a pan).
  const didMoveRef = useRef<boolean>(false);
  // Last tap (time + position) for double-tap-to-reset detection.
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
    // Leave immersive mode and native fullscreen on close so the next open starts chromed.
    immersiveRef.current = false;
    setImmersive(false);
    void exitFullscreen();

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
      if (!prev) return prev;
      const delta = direction === 'next' ? 1 : -1;
      const newIndex = prev.currentIndex + delta;
      if (newIndex < 0 || newIndex >= prev.images.length) return prev;
      return { ...prev, currentIndex: newIndex };
    });
  }, []);

  const navigateToNext = useCallback(() => navigate('next'), [navigate]);
  const navigateToPrevious = useCallback(() => navigate('previous'), [navigate]);

  // Sync ?image=<id> on swipe/arrow via replaceState (never push) so Back closes
  // the viewer instead of stepping through images. Lives in an effect — not the
  // setState updater — because Next.js patches history.replaceState to setState
  // on its Router, which would fire during render.
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
    // Intentionally keyed to currentIndex only. This effect re-checks whether the
    // newly-shown image has finished loading; it should re-run when the viewer moves
    // to a different image, not on every fullScreenState mutation (e.g. scrollPosition
    // changes). It reads the current image via fullScreenState and calls the stable
    // setLoadedImageIds dispatcher — listing either would only cause redundant re-runs.
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
        immersiveRef.current = false;
        setImmersive(false);
        void exitFullscreen();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Keep immersive state honest when the user leaves native fullscreen through the browser's own UI
  // (system gesture / Esc). If the document is no longer fullscreen but we still think we're
  // immersive, drop back to the chromed view so controls return and the user isn't stranded.
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

  // Zoom is per-image: reset to 1× whenever the viewer moves to a different photo so the
  // next one never opens pre-zoomed or pre-panned.
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

    // Unscaled size of the media along each axis — the bound for pan clamping.
    const zoomSize = (): { w: number; h: number } => {
      const el = zoomTargetRef.current;
      return el ? { w: el.clientWidth, h: el.clientHeight } : { w: 0, h: 0 };
    };

    // Mark that a gesture (pinch/pan/double-tap) just ended so the synthetic click it
    // produces doesn't also fire tap-to-close. Cleared on the next touchstart.
    const suppressTapClose = () => {
      isSwiping.current = true;
    };

    // Where a stationary tap lands decides its action. A tap on a control (nav arrows, close,
    // download, or the metadata UI) runs that control. A tap on the framed photo toggles immersive.
    // A tap on the black letterbox outside the photo dismisses the viewer.
    const isControlTap = (target: EventTarget | null): boolean =>
      target instanceof HTMLElement && !!target.closest(`button, a, .${styles.metadataOverlay}`);
    const isImageTap = (target: EventTarget | null): boolean =>
      target instanceof HTMLElement && !!target.closest(`.${styles.imageWrapper}`);

    const handleTouchStart = (e: TouchEvent) => {
      isSwiping.current = false;
      didMoveRef.current = false;

      // Two fingers → start a pinch (overrides any swipe/pan).
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
      // While zoomed, a single finger pans the image instead of navigating.
      panRef.current = scaleRef.current > 1 ? { lastX: t.clientX, lastY: t.clientY } : null;
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Pinch: scale relative to the gap at pinch-start, then re-clamp the pan offsets
      // (zooming out can push a previously-valid pan past the new, smaller bound).
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

      // Pan: only while zoomed and dragging a single finger.
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

      // Swipe gestures: only at 1× (zoomed gestures pan, not navigate). Horizontal → navigate;
      // vertical → metadata reveal / dismiss. Either way mark isSwiping so the ending touch isn't
      // also treated as a tap, and take over the gesture from any native scroll.
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
      // A pinch finished (dropped below two fingers).
      if (pinchRef.current && e.touches.length < 2) {
        pinchRef.current = null;
        setIsZoomed(scaleRef.current > 1);
        suppressTapClose();
        // A finger still down after the pinch → hand off to panning from here.
        if (e.touches[0] && scaleRef.current > 1) {
          panRef.current = { lastX: e.touches[0].clientX, lastY: e.touches[0].clientY };
        }
        return;
      }

      // A pan finished. Only a gesture that actually MOVED counts as a pan — a stationary
      // touch while zoomed falls through so two of them can register as a double-tap reset.
      if (panRef.current && e.touches.length === 0) {
        panRef.current = null;
        if (didMoveRef.current) {
          suppressTapClose();
          return;
        }
      }

      const changed = e.changedTouches[0];
      if (!changed) return;

      // Double-tap to reset: two quick taps near the same spot while zoomed → back to 1×.
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

      // At 1×, a touch-end is a horizontal swipe (navigate), a vertical swipe (metadata / dismiss),
      // or a stationary tap (toggle immersive / dismiss, depending where it lands).
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
            // Swipe DOWN — metadata first, then dismiss: close the metadata panel if it's open,
            // otherwise close the whole viewer (which also leaves immersive + native fullscreen).
            if (showMetadataRef.current) {
              setShowMetadata(false);
            } else {
              hideImage();
            }
          } else if (!showMetadataRef.current) {
            // Swipe UP — reveal the metadata panel (works in both chromed and immersive views).
            setShowMetadata(true);
          }
        } else if (
          // Stationary tap. This lives in the touch handler, so it is inherently touch-only:
          // desktop mouse clicks keep their close-on-click behavior.
          !didMoveRef.current &&
          !isSwiping.current &&
          absX < TAP_SLOP &&
          absY < TAP_SLOP
        ) {
          if (isControlTap(e.target)) {
            // The control's own onClick handles it; nothing to do here.
          } else if (isImageTap(e.target)) {
            // Tap on the framed photo → toggle immersive (hide/show all chrome). Native fullscreen
            // is requested where supported (Android); on iOS WebKit it no-ops and we rely on the
            // chrome-hide + solid-black backdrop alone. Best-effort, never throws, and runs from the
            // touch handler so the request keeps its user activation.
            const next = !immersiveRef.current;
            immersiveRef.current = next;
            setImmersive(next);
            if (next) {
              void requestFullscreen(modalElement);
            } else {
              void exitFullscreen();
            }
            // Swallow the synthetic click this tap produces so it doesn't also close the viewer.
            suppressTapClose();
          } else {
            // Tap on the black letterbox outside the photo → dismiss the viewer.
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
  }, [isOpen, navigateToNext, navigateToPrevious, isMetadataControl, hideImage]);

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
