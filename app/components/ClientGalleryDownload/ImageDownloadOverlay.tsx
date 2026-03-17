'use client';

import { type MouseEvent, useCallback, useEffect, useRef, useState } from 'react';

import styles from './ImageDownloadOverlay.module.scss';

interface ImageDownloadOverlayProps {
  imageId: number;
}

/**
 * Image Download Overlay
 *
 * Individual image download button shown on hover for CLIENT_GALLERY images.
 * Currently a mock/placeholder. Will eventually call
 * GET /api/read/content/images/{id}/download to fetch the original.
 */
export default function ImageDownloadOverlay({ imageId: _imageId }: ImageDownloadOverlayProps) {
  const [showToast, setShowToast] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const handleDownload = useCallback((e: MouseEvent) => {
    e.stopPropagation(); // Prevent triggering fullscreen view
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setShowToast(true);
    toastTimeoutRef.current = setTimeout(() => setShowToast(false), 2000);
  }, []);

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
      {showToast && <div className={styles.miniToast}>Coming soon</div>}
    </div>
  );
}
