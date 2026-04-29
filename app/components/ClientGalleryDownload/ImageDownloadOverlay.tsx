'use client';

import { type MouseEvent, useCallback } from 'react';

import { downloadImageUrl } from '@/app/lib/api/downloads';

import styles from './ImageDownloadOverlay.module.scss';

interface ImageDownloadOverlayProps {
  imageId: number;
}

/**
 * Image Download Overlay
 *
 * Per-image download button shown on hover for CLIENT_GALLERY images.
 * Navigates to the BFF-routed download endpoint, which streams the WebP
 * with `Content-Disposition: attachment` so the browser downloads rather
 * than navigates. The httpOnly `gallery_access_{slug}` cookie set by the
 * gate is sent automatically (same-origin via the proxy).
 */
export default function ImageDownloadOverlay({ imageId }: ImageDownloadOverlayProps) {
  const handleDownload = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation(); // prevent triggering fullscreen view
      window.location.href = downloadImageUrl(imageId);
    },
    [imageId]
  );

  return (
    <div className={styles.overlayContainer}>
      <button
        type="button"
        onClick={handleDownload}
        className={styles.downloadIconButton}
        aria-label="Download image"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={styles.icon}
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
    </div>
  );
}
