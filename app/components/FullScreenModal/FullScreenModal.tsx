'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import Image from 'next/image';
import {
  type Dispatch,
  type MouseEvent,
  type RefObject,
  type SetStateAction,
  useEffect,
} from 'react';

import { useMe } from '@/app/components/auth/MeProvider';
import FullScreenDownloadButton from '@/app/components/ClientGalleryDownload/FullScreenDownloadButton';
import { Modal } from '@/app/components/ui/Modal/Modal';
import { IMAGE } from '@/app/constants';
import styles from '@/app/styles/fullscreen-image.module.scss';
import { type CollectionModel } from '@/app/types/Collection';
import type { ViewableContent } from '@/app/types/Content';
import { canDownloadCollection } from '@/app/utils/galleryAccess';

import { isGifBlock, resolveDisplayDate, resolveDisplayLocations } from './fullScreenModalUtils';

type ImageBlock = ViewableContent;

type FullScreenState = {
  images: ImageBlock[];
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
  hideImage: (e?: MouseEvent) => void;
  isSwiping: RefObject<boolean>;
  showMetadata: boolean;
  toggleMetadata: (e: MouseEvent) => void;
  router: AppRouterInstance;
  /** Optional collection data for location and date fallback when image fields are absent */
  collectionData?: CollectionModel;
  navigateToNext: () => void;
  navigateToPrevious: () => void;
}

export function FullScreenModal({
  fullScreenState,
  loadedImageIds,
  setLoadedImageIds,
  modalRef,
  zoomTargetRef,
  isZoomed,
  immersive = false,
  hideImage,
  isSwiping,
  showMetadata,
  toggleMetadata,
  router,
  collectionData,
  navigateToNext,
  navigateToPrevious,
}: FullScreenModalProps) {
  const isOpen = fullScreenState != null;

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

  if (!fullScreenState) return null;

  const currentImage = fullScreenState.images[fullScreenState.currentIndex];
  if (!currentImage) return null;

  const isGif = isGifBlock(currentImage);

  // Resolve locations/date: image fields take priority, falling back to the collection. GIF blocks
  // carry neither, so they fall straight through to the collection.
  const displayLocations = resolveDisplayLocations(currentImage, collectionData, isGif);
  const displayDate = resolveDisplayDate(currentImage, collectionData, isGif);

  const currentImageLoaded = loadedImageIds.has(currentImage.id);
  const hasPrevious = fullScreenState.currentIndex > 0;
  const hasNext = fullScreenState.currentIndex < fullScreenState.images.length - 1;

  const handleOverlayClick = () => {
    // Don't dismiss on the tap that ends a swipe/pinch/pan, nor while zoomed in
    // (a tap there is the user interacting with the zoomed photo, not closing it).
    if (!isSwiping.current && !isZoomed) {
      hideImage();
    }
  };

  const modalContent = (
    <div
      ref={modalRef}
      className={`${styles.imageFullScreenWrapper} ${immersive ? styles.immersive : ''}`}
    >
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
                alt={currentImage.title || currentImage.caption || 'Full screen image'}
                width={currentImage.imageWidth || IMAGE.defaultWidth}
                height={currentImage.imageHeight || IMAGE.defaultHeight}
                className={`${styles.fullScreenImage} ${currentImageLoaded ? styles.fullScreenImageLoaded : ''}`}
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
                <div className={styles.metadataContent}>
                  {currentImage.title && (
                    <div id="fullscreen-title" className={styles.metadataTitle}>
                      {currentImage.title}
                    </div>
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
                            <a
                              href={`/location/${loc.slug}`}
                              onClick={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                router.push(`/location/${loc.slug}`);
                              }}
                              className={styles.metadataLink}
                            >
                              {loc.name}
                            </a>
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
                  {!isGif &&
                    (currentImage.iso ||
                      currentImage.fStop ||
                      currentImage.shutterSpeed ||
                      currentImage.focalLength) && (
                      <div className={styles.metadataSettingsRow}>
                        {currentImage.iso && <span>{currentImage.iso}</span>}
                        {currentImage.shutterSpeed && <span>{currentImage.shutterSpeed}</span>}
                        {currentImage.fStop && <span>{currentImage.fStop}</span>}
                        {currentImage.focalLength && <span>{currentImage.focalLength}</span>}
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
                          {currentImage.collections.map((c, index) => (
                            <div
                              key={c.collectionId || index}
                              className={`${styles.metadataSectionItem} ${c.slug ? styles.metadataSectionItemClickable : ''}`}
                              onClick={e => {
                                e.stopPropagation();
                                if (c.slug) {
                                  router.push(`/${c.slug}`);
                                }
                              }}
                            >
                              {c.name || `Collection ${c.collectionId}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!immersive && (
                <button
                  className={styles.metadataToggle}
                  onClick={toggleMetadata}
                  aria-label={showMetadata ? 'Hide metadata' : 'Show metadata'}
                  aria-expanded={showMetadata}
                  type="button"
                >
                  <span aria-hidden="true">{showMetadata ? '✕' : '↖'}</span>
                </button>
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
        <button
          type="button"
          className={styles.closeButton}
          onClick={hideImage}
          aria-label="Close fullscreen image"
        >
          <span aria-hidden="true">&#10005;</span>
        </button>
      )}

      {!immersive && canDownloadCollection(me, collectionData) && !isGif && (
        <FullScreenDownloadButton imageId={currentImage.id} />
      )}
    </div>
  );

  return (
    <Modal
      open
      onClose={hideImage}
      variant="fullscreen"
      labelledBy={currentImage.title ? 'fullscreen-title' : undefined}
    >
      {modalContent}
    </Modal>
  );
}
