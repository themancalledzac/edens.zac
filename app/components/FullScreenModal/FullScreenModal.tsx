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
import { createPortal } from 'react-dom';

import { IMAGE } from '@/app/constants';
import styles from '@/app/styles/fullscreen-image.module.scss';
import type { CollectionModel } from '@/app/types/Collection';
import type { ContentGifModel, ViewableContent } from '@/app/types/Content';

import { FsDebug } from './FsDebug';

type ImageBlock = ViewableContent;

type FullScreenState = {
  images: ImageBlock[];
  currentIndex: number;
  scrollPosition: number;
};

function isGifBlock(block: ImageBlock): block is ContentGifModel {
  return block.contentType === 'GIF';
}

interface FullScreenModalProps {
  fullScreenState: FullScreenState | null;
  loadedImageIds: Set<number>;
  setLoadedImageIds: Dispatch<SetStateAction<Set<number>>>;
  modalRef: RefObject<HTMLDivElement | null>;
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
  hideImage,
  isSwiping,
  showMetadata,
  toggleMetadata,
  router,
  collectionData,
  navigateToNext,
  navigateToPrevious,
}: FullScreenModalProps) {
  useEffect(() => {
    if (!fullScreenState) return;
    document.body.classList.add('fullscreen-open');
    return () => {
      document.body.classList.remove('fullscreen-open');
    };
  }, [fullScreenState]);

  if (!fullScreenState) return null;

  const currentImage = fullScreenState.images[fullScreenState.currentIndex];
  if (!currentImage) return null;

  const isGif = isGifBlock(currentImage);

  // Resolve locations: image locations take priority, fall back to collection locations.
  // GIF blocks don't carry locations today — fall straight through to the collection.
  const imageLocations = !isGif ? currentImage.locations : undefined;
  const displayLocations = imageLocations?.length
    ? imageLocations
    : (collectionData?.locations ?? []);

  // Resolve date: image captureDate takes priority, fall back to collection collectionDate.
  // GIFs don't have captureDate — fall back immediately.
  const displayDate = !isGif
    ? (currentImage.captureDate ?? collectionData?.collectionDate ?? null)
    : (collectionData?.collectionDate ?? null);

  const currentImageLoaded = loadedImageIds.has(currentImage.id);
  const hasPrevious = fullScreenState.currentIndex > 0;
  const hasNext = fullScreenState.currentIndex < fullScreenState.images.length - 1;

  const handleOverlayClick = () => {
    if (!isSwiping.current) {
      hideImage();
    }
  };

  const fsdebug =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('fsdebug') === '1';

  const modalContent = (
    <div
      ref={modalRef}
      className={styles.imageFullScreenWrapper}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      <div className={styles.overlayContainer} onClick={handleOverlayClick}>
        <div
          className={`${styles.imageWrapper} ${currentImageLoaded ? styles.imageWrapperLoaded : ''}`}
        >
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

          {currentImageLoaded && (
            <div
              className={`${styles.metadataOverlay} ${styles.metadataOverlayLoaded}`}
              onClick={e => e.stopPropagation()}
            >
              {showMetadata && (
                <div className={styles.metadataContent}>
                  {currentImage.title && (
                    <div className={styles.metadataTitle}>{currentImage.title}</div>
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
                                  hideImage();
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
              <button
                className={styles.metadataToggle}
                onClick={toggleMetadata}
                aria-label={showMetadata ? 'Hide metadata' : 'Show metadata'}
                aria-expanded={showMetadata}
                type="button"
              >
                <span aria-hidden="true">{showMetadata ? '✕' : '↖'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {hasPrevious && (
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

      {hasNext && (
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

      <button
        type="button"
        className={styles.closeButton}
        onClick={hideImage}
        aria-label="Close fullscreen image"
      >
        <span aria-hidden="true">&#10005;</span>
      </button>

      {fsdebug && <FsDebug />}
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return null;
}
