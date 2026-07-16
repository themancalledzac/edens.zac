'use client';

import { type MouseEvent, useCallback, useEffect, useRef, useState } from 'react';

import { type DownloadFormat, downloadImageUrl } from '@/app/lib/api/downloads';

import styles from './FullScreenDownloadButton.module.scss';

interface FullScreenDownloadButtonProps {
  imageId: number;
}

/**
 * Download control for the fullscreen viewer on CLIENT_GALLERY images. Tapping the icon expands a
 * Web / Full quality picker; choosing a format navigates to the download URL (auth flows through the
 * `same-origin` gallery cookie). This is the single-image counterpart to the gallery's "Select →
 * Download" flow — the per-grid-image overlay was removed so a tap on the grid always opens
 * fullscreen.
 *
 * Navigation (not `fetch`+blob) is deliberate: the backend redirects (302) to a presigned S3 URL to
 * bypass the Amplify 5.72 MB response cap, and a `fetch` following that cross-origin redirect would
 * be blocked by S3 CORS. A top-level navigation follows the redirect and downloads with no such
 * restriction — the `Content-Disposition: attachment` response downloads without leaving the page.
 */
export default function FullScreenDownloadButton({ imageId }: FullScreenDownloadButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState<DownloadFormat | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Collapse the picker whenever the viewer moves to a different image.
  useEffect(() => {
    setExpanded(false);
  }, [imageId]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const handleToggle = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    setExpanded(prev => !prev);
  }, []);

  const handleFormatDownload = useCallback(
    (e: MouseEvent, format: DownloadFormat) => {
      e.stopPropagation();
      setDownloading(format);
      // The response is `Content-Disposition: attachment`, so this downloads without navigating away.
      window.location.href = downloadImageUrl(imageId, format);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setDownloading(null);
        setExpanded(false);
        resetTimerRef.current = null;
      }, 4000);
    },
    [imageId]
  );

  return (
    <div
      className={`${styles.container}${expanded ? ` ${styles.expanded}` : ''}`}
      onClick={e => e.stopPropagation()}
    >
      {expanded ? (
        <div className={styles.pickerRow}>
          <button
            type="button"
            onClick={e => handleFormatDownload(e, 'web')}
            disabled={downloading !== null}
            className={styles.formatButton}
            aria-label="Download web-optimized image"
          >
            {downloading === 'web' ? '…' : 'Web'}
          </button>
          <button
            type="button"
            onClick={e => handleFormatDownload(e, 'original')}
            disabled={downloading !== null}
            className={styles.formatButton}
            aria-label="Download full-size image"
          >
            {downloading === 'original' ? '…' : 'Full'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleToggle}
          className={styles.iconButton}
          aria-label="Download image"
        >
          <svg
            aria-hidden="true"
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
      )}
    </div>
  );
}
