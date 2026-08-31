'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  type Dispatch,
  type MouseEvent,
  type RefObject,
  type SetStateAction,
  useEffect,
  useId,
} from 'react';

import { useMe } from '@/app/components/auth/MeProvider';
import FullScreenDownloadButton from '@/app/components/ClientGalleryDownload/FullScreenDownloadButton';
import { CloseButton } from '@/app/components/ui/CloseButton/CloseButton';
import { IconButton } from '@/app/components/ui/IconButton/IconButton';
import { Modal } from '@/app/components/ui/Modal/Modal';
import { IMAGE } from '@/app/constants';
import styles from '@/app/styles/fullscreen-image.module.scss';
import { type CollectionModel } from '@/app/types/Collection';
import type { ViewableContent } from '@/app/types/Content';
import { humanLabel } from '@/app/utils/contentRendererUtils';
import { formatLongDate } from '@/app/utils/formatDateRange';
import { canDownloadCollection } from '@/app/utils/galleryAccess';

import {
  isGifBlock,
  resolveDisplayDate,
  resolveDisplayFilmStock,
  resolveDisplayLocations,
} from './fullScreenModalUtils';

type FullScreenState = {
  images: ViewableContent[];
  currentIndex: number;
};

interface FullScreenModalProps {
  fullScreenState: FullScreenState | null;
  loadedImageIds: Set<number>;
  setLoadedImageIds: Dispatch<SetStateAction<Set<number>>>;
  modalRef: RefObject<HTMLDivElement | null>;
  /** Wraps only the media; receives the pinch-zoom transform (imperatively, via the hook). */
  zoomTargetRef: RefObject<HTMLDivElement | null>;
  /** True while pinch-zoomed past 1× — suppresses tap-to-close so panning doesn't dismiss. */
  isZoomed: boolean;
  /** Immersive mode: when true, hide all chrome (controls + metadata) for an image-only view. */
  immersive?: boolean;
  /** Flips immersive mode — wired to a click on the framed photo (the touch tap does the same). */
  toggleImmersive?: () => void;
  hideImage: () => void;
  isSwiping: RefObject<boolean>;
  showMetadata: boolean;
  toggleMetadata: (e: MouseEvent) => void;
  /** Optional collection data for location and date fallback when image fields are absent */
  collectionData?: CollectionModel;
  navigateToNext: () => void;
  navigateToPrevious: () => void;
}

/**
 * Fullscreen photo viewer: the framed photo, its metadata panel, and the overlay chrome
 * (close / prev / next / position counter / per-image download).
 *
 * Controls: close and the metadata toggle are `IconButton`s so they share the design system's
 * focus ring and coarse-pointer hit area. Both carry a viewer-local `className` that keeps this
 * surface's lighter scrim (50% black brightening on hover) instead of the `overlay` variant's
 * token fill — see the doubled-class rules in fullscreen-image.module.scss. The prev/next
 * chevrons stay hand-rolled: they are non-square rails (40×56 / 56×80) that IconButton's
 * square-footprint size scale cannot express.
 *
 * ARIA: `aria-controls` on the metadata toggle is emitted only while the panel is mounted —
 * a reference to an absent id is invalid (same convention as EditBar and MenuDropdown).
 *
 * `isOpen` tracks a resolvable `currentImage`, not merely a non-null `fullScreenState`, because the
 * effect below adds `body.fullscreen-open` — which globals.css paints solid #000 to keep the page
 * canvas from leaking through the overlay on iOS. A state whose index resolves to nothing renders
 * null, so gating the class on anything looser blacks out the page with no viewer on it.
 *
 * The dialog's name and the photo's `alt` both come from `humanLabel`, the same filter the grid
 * tiles use: the backend seeds `title` from the uploaded filename, so naming the dialog straight
 * off `title` announced "Fullscreen image: DSC_4364.webp". A filename-shaped value is dropped in
 * favour of the next authored field, and the generic name when there is none.
 */
export function FullScreenModal({
  fullScreenState,
  loadedImageIds,
  setLoadedImageIds,
  modalRef,
  zoomTargetRef,
  isZoomed,
  immersive = false,
  toggleImmersive,
  hideImage,
  isSwiping,
  showMetadata,
  toggleMetadata,
  collectionData,
  navigateToNext,
  navigateToPrevious,
}: FullScreenModalProps) {
  const currentImage = fullScreenState?.images[fullScreenState.currentIndex];
  const isOpen = currentImage != null;

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('fullscreen-open');

    // Size the viewer to the ACTUAL visible viewport. iOS browsers (Brave especially) report CSS
    // dvh/lvh that don't match the real glass — lvh overshoots while the toolbar shows, dvh
    // undershoots while it's hidden. window.visualViewport.height is the one value that tracks the
    // true visible height (effectively what Safari uses for dvh). Publish it as --fs-height and
    // keep it current as the toolbar shows/hides.
    const vv = window.visualViewport;
    const setHeight = () => {
      const h = vv ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty('--fs-height', `${Math.round(h)}px`);
    };
    setHeight();
    vv?.addEventListener('resize', setHeight);
    vv?.addEventListener('scroll', setHeight);
    window.addEventListener('resize', setHeight);

    return () => {
      document.body.classList.remove('fullscreen-open');
      vv?.removeEventListener('resize', setHeight);
      vv?.removeEventListener('scroll', setHeight);
      window.removeEventListener('resize', setHeight);
      document.documentElement.style.removeProperty('--fs-height');
    };
  }, [isOpen]);

  // Capability gate for the single-image download control (see canDownloadCollection). Called
  // before the early returns to satisfy the rules of hooks; degrades to null outside a MeProvider.
  const me = useMe();

  // Target of the toggle's aria-controls. Only emitted while the panel is mounted (see below).
  const metadataPanelId = useId();

  if (!fullScreenState || !currentImage) return null;

  const isGif = isGifBlock(currentImage);

  // Resolve locations/date: image fields take priority, falling back to the collection. GIF blocks
  // carry neither, so they fall straight through to the collection.
  const displayLocations = resolveDisplayLocations(currentImage, collectionData);
  const displayDate = formatLongDate(resolveDisplayDate(currentImage, collectionData));
  const displayFilmStock = resolveDisplayFilmStock(currentImage);

  const currentImageLoaded = loadedImageIds.has(currentImage.id);
  const hasPrevious = fullScreenState.currentIndex > 0;
  const hasNext = fullScreenState.currentIndex < fullScreenState.images.length - 1;

  /**
   * Where a pointer lands decides the action, mirroring the touch tap split in useFullScreenImage:
   * the framed photo toggles immersive mode, the black letterbox around it dismisses the viewer.
   * Without the photo branch, a plain desktop click on the image closed the viewer — the touch
   * guards below are gesture state and never fire for a mouse.
   *
   * Skipped on the click that ends a swipe/pinch/pan (which also swallows the synthetic click a
   * touch tap produces, so a tap toggles once) and while zoomed, where a click belongs to the photo.
   */
  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (isSwiping.current || isZoomed) return;

    const target = event.target;
    if (target instanceof Element && target.closest(`.${styles.imageWrapper}`)) {
      toggleImmersive?.();
      return;
    }

    hideImage();
  };

  const viewerTitle = humanLabel(currentImage.title);
  const accessibleName = viewerTitle ? `Fullscreen image: ${viewerTitle}` : 'Fullscreen image';

  const modalContent = (
    <div
      ref={modalRef}
      className={`${styles.imageFullScreenWrapper} ${immersive ? styles.immersive : ''}`}
    >
      <h2 id="fullscreen-title" className={styles.srOnly}>
        {accessibleName}
      </h2>

      <div className={styles.overlayContainer} onClick={handleOverlayClick}>
        <div
          className={`${styles.imageWrapper} ${currentImageLoaded ? styles.imageWrapperLoaded : ''}`}
        >
          <div ref={zoomTargetRef} className={styles.zoomLayer}>
            {isGif ? (
              <video
                key={currentImage.id}
                autoPlay
                loop
                muted
                playsInline
                controls={false}
                preload="auto"
                poster={currentImage.thumbnailUrl ?? undefined}
                width={currentImage.width || IMAGE.defaultWidth}
                height={currentImage.height || IMAGE.defaultHeight}
                className={`${styles.fullScreenImage} ${currentImageLoaded ? styles.fullScreenImageLoaded : ''}`}
              >
                <source src={currentImage.gifUrl} type="video/mp4" />
              </video>
            ) : (
              <Image
                key={currentImage.id}
                src={currentImage.imageUrl}
                alt={
                  humanLabel(currentImage.alt, currentImage.title, currentImage.caption) ??
                  'Full screen image'
                }
                width={currentImage.imageWidth || IMAGE.defaultWidth}
                height={currentImage.imageHeight || IMAGE.defaultHeight}
                className={`${styles.fullScreenImage} ${currentImageLoaded ? styles.fullScreenImageLoaded : ''}`}
                quality={IMAGE.quality}
                priority
                onLoad={() => {
                  setLoadedImageIds(prev => {
                    if (prev.has(currentImage.id)) return prev;
                    const newSet = new Set(prev);
                    newSet.add(currentImage.id);
                    return newSet;
                  });
                }}
              />
            )}
          </div>

          {currentImageLoaded && (!immersive || showMetadata) && (
            <div
              className={`${styles.metadataOverlay} ${styles.metadataOverlayLoaded}`}
              onClick={e => e.stopPropagation()}
            >
              {showMetadata && (
                <div id={metadataPanelId} className={styles.metadataContent}>
                  {currentImage.title && (
                    <div className={styles.metadataTitle}>{currentImage.title}</div>
                  )}
                  {currentImage.caption && (
                    <div className={styles.metadataCaption}>{currentImage.caption}</div>
                  )}
                  {currentImage.author && (
                    <div className={styles.metadataItem}>{currentImage.author}</div>
                  )}
                  {(displayDate || displayLocations.length > 0) && (
                    <div className={styles.metadataItem}>
                      {displayDate && <span>{displayDate}</span>}
                      {displayDate && displayLocations.length > 0 && (
                        <span className={styles.metadataSeparator}> / </span>
                      )}
                      {displayLocations.map((loc, i) => (
                        <span key={loc.id || loc.name}>
                          {i > 0 && ', '}
                          {loc.slug ? (
                            <Link href={`/location/${loc.slug}`} className={styles.metadataLink}>
                              {loc.name}
                            </Link>
                          ) : (
                            loc.name
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                  {!isGif && (currentImage.camera || currentImage.lens) && (
                    <div className={styles.metadataItem}>
                      {currentImage.camera && <span>{currentImage.camera.name}</span>}
                      {currentImage.camera && currentImage.lens && (
                        <span className={styles.metadataSeparator}> / </span>
                      )}
                      {currentImage.lens && <span>{currentImage.lens.name}</span>}
                    </div>
                  )}
                  {displayFilmStock && (
                    <div className={styles.metadataItem}>{displayFilmStock}</div>
                  )}
                  {!isGif &&
                    (currentImage.iso ||
                      currentImage.fStop ||
                      currentImage.shutterSpeed ||
                      currentImage.focalLength) && (
                      <div className={styles.metadataSettingsRow}>
                        {currentImage.iso && <span>{currentImage.iso} ISO</span>}
                        {currentImage.shutterSpeed && <span>{currentImage.shutterSpeed}</span>}
                        {currentImage.fStop && <span>{currentImage.fStop}</span>}
                        {currentImage.focalLength && <span>{currentImage.focalLength}</span>}
                      </div>
                    )}
                  {currentImage.tags && currentImage.tags.length > 0 && (
                    <div className={styles.metadataSection}>
                      <div className={styles.metadataSectionRow}>
                        <div className={styles.metadataSectionHeader}>Tags</div>
                        <div className={styles.metadataSectionItems}>
                          {currentImage.tags.map((t, index) => (
                            <div key={t.id || index} className={styles.metadataSectionItem}>
                              {t.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {!isGif && currentImage.people && currentImage.people.length > 0 && (
                    <div className={styles.metadataSection}>
                      <div className={styles.metadataSectionRow}>
                        <div className={styles.metadataSectionHeader}>People</div>
                        <div className={styles.metadataSectionItems}>
                          {currentImage.people.map((p, index) => (
                            <div key={p.id || index} className={styles.metadataSectionItem}>
                              {p.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {!isGif && currentImage.collections && currentImage.collections.length > 0 && (
                    <div className={styles.metadataSection}>
                      <div className={styles.metadataSectionRow}>
                        <div className={styles.metadataSectionHeader}>Collections</div>
                        <div className={styles.metadataSectionItems}>
                          {currentImage.collections.map((c, index) =>
                            c.slug ? (
                              <Link
                                key={c.collectionId || index}
                                href={`/${c.slug}`}
                                className={`${styles.metadataSectionItem} ${styles.metadataSectionItemClickable}`}
                                onClick={e => e.stopPropagation()}
                              >
                                {c.name || `Collection ${c.collectionId}`}
                              </Link>
                            ) : (
                              <div
                                key={c.collectionId || index}
                                className={styles.metadataSectionItem}
                              >
                                {c.name || `Collection ${c.collectionId}`}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!immersive && (
                <IconButton
                  shape="square"
                  variant="overlay"
                  className={styles.metadataToggle}
                  onClick={toggleMetadata}
                  aria-label={showMetadata ? 'Hide metadata' : 'Show metadata'}
                  aria-expanded={showMetadata}
                  aria-controls={showMetadata ? metadataPanelId : undefined}
                >
                  <span aria-hidden="true">{showMetadata ? '✕' : '↖'}</span>
                </IconButton>
              )}
            </div>
          )}
        </div>
      </div>

      {!immersive && hasPrevious && (
        <button
          type="button"
          className={styles.navButtonPrev}
          onClick={e => {
            e.stopPropagation();
            navigateToPrevious();
          }}
          aria-label="Previous image"
        >
          <span aria-hidden="true">&#8249;</span>
        </button>
      )}

      {!immersive && hasNext && (
        <button
          type="button"
          className={styles.navButtonNext}
          onClick={e => {
            e.stopPropagation();
            navigateToNext();
          }}
          aria-label="Next image"
        >
          <span aria-hidden="true">&#8250;</span>
        </button>
      )}

      {!immersive && fullScreenState.images.length > 1 && (
        <div className={styles.positionCounter} aria-live="polite">
          {fullScreenState.currentIndex + 1} / {fullScreenState.images.length}
        </div>
      )}

      {!immersive && (
        <CloseButton
          variant="overlay"
          className={styles.closeButton}
          onClick={hideImage}
          aria-label="Close fullscreen image"
        />
      )}

      {!immersive && canDownloadCollection(me, collectionData) && !isGif && (
        <FullScreenDownloadButton imageId={currentImage.id} />
      )}
    </div>
  );

  return (
    <Modal open onClose={hideImage} variant="fullscreen" labelledBy="fullscreen-title">
      {modalContent}
    </Modal>
  );
}
