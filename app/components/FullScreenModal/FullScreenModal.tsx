'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import Image from 'next/image';
import React from 'react';
import { createPortal } from 'react-dom';

import { IMAGE } from '@/app/constants';
import styles from '@/app/styles/fullscreen-image.module.scss';
import type { ContentImageModel, ContentParallaxImageModel } from '@/app/types/Content';

type ImageBlock = ContentImageModel | ContentParallaxImageModel;

type FullScreenState = {
  images: ImageBlock[];
  currentIndex: number;
  scrollPosition: number;
};

interface FullScreenModalProps {
  fullScreenState: FullScreenState | null;
  loadedImageIds: Set<number>;
  setLoadedImageIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  modalRef: React.RefObject<HTMLDivElement | null>;
  hideImage: (e?: React.MouseEvent) => void;
  isSwiping: React.RefObject<boolean>;
  showMetadata: boolean;
  toggleMetadata: (e: React.MouseEvent) => void;
  router: AppRouterInstance;
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
  router
}: FullScreenModalProps) {
  if (!fullScreenState) return null;
  
  const currentImage = fullScreenState.images[fullScreenState.currentIndex];
  if (!currentImage) return null;

  const currentImageLoaded = loadedImageIds.has(currentImage.id);

  const handleOverlayClick = () => {
    if (!isSwiping.current) {
      hideImage();
    }
  };

  const modalContent = (
    <div
      ref={modalRef}
      className={styles.imageFullScreenWrapper}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.overlayContainer} onClick={handleOverlayClick}>
        <div className={`${styles.imageWrapper} ${currentImageLoaded ? styles.imageWrapperLoaded : ''}`}>
          <Image
            key={currentImage.id}
            src={currentImage.imageUrl}
            alt={currentImage.title || currentImage.caption || 'Full screen image'}
            width={currentImage.imageWidth || IMAGE.defaultWidth}
            height={currentImage.imageHeight || IMAGE.defaultHeight}
            className={`${styles.fullScreenImage} ${currentImageLoaded ? styles.fullScreenImageLoaded : ''}`}
            priority
            unoptimized
            onLoad={() => {
              setLoadedImageIds(prev => {
                if (prev.has(currentImage.id)) return prev;
                const newSet = new Set(prev);
                newSet.add(currentImage.id);
                return newSet;
              });
            }}
          />
          
          {currentImageLoaded && (
            <div
              className={`${styles.metadataOverlay} ${styles.metadataOverlayLoaded}`}
              onClick={(e) => e.stopPropagation()}
            >
              {showMetadata && (
              <div className={styles.metadataContent}>
                {currentImage.title && (
                  <div className={styles.metadataTitle}>{currentImage.title}</div>
                )}
                {currentImage.author && (
                  <div className={styles.metadataItem}>{currentImage.author}</div>
                )}
                {(currentImage.camera || currentImage.lens) && (
                  <div className={styles.metadataItem}>
                    {currentImage.camera && <span>{currentImage.camera.name}</span>}
                    {currentImage.camera && currentImage.lens && <span className={styles.metadataSeparator}> / </span>}
                    {currentImage.lens && <span>{currentImage.lens.name}</span>}
                  </div>
                )}
                {(currentImage.iso || currentImage.fstop || currentImage.shutterSpeed || currentImage.focalLength) && (
                  <div className={styles.metadataSettingsRow}>
                    {currentImage.iso && <span>{currentImage.iso}</span>}
                    {currentImage.shutterSpeed && <span>{currentImage.shutterSpeed}</span>}
                    {currentImage.fstop && <span>{currentImage.fstop}</span>}
                    {currentImage.focalLength && <span>{currentImage.focalLength}</span>}
                  </div>
                )}
                {currentImage.people && currentImage.people.length > 0 && (
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
                {currentImage.collections && currentImage.collections.length > 0 && (
                  <div className={styles.metadataSection}>
                    <div className={styles.metadataSectionRow}>
                      <div className={styles.metadataSectionHeader}>Collections</div>
                      <div className={styles.metadataSectionItems}>
                        {currentImage.collections.map((c, index) => (
                          <div 
                            key={c.collectionId || index} 
                            className={`${styles.metadataSectionItem} ${c.slug ? styles.metadataSectionItemClickable : ''}`}
                            onClick={(e) => {
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

      <button
        className={styles.closeButton}
        onClick={hideImage}
        aria-label="Close fullscreen image"
      >
        <span aria-hidden="true">&#10005;</span>
      </button>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return null;
}

