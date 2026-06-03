'use client';

import { type MouseEvent, useCallback, useEffect, useRef, useState } from 'react';

import { type DownloadFormat, downloadImageUrl } from '@/app/lib/api/downloads';

import styles from './FullScreenDownloadButton.module.scss';

interface FullScreenDownloadButtonProps {
  imageId: number;
}

/**
 * Download control for the fullscreen viewer on CLIENT_GALLERY images. Tapping the icon expands a
 * Web / Full quality picker and streams the chosen file via a blob download (auth flows through the
 * `same-origin` gallery cookie). This is the single-image counterpart to the gallery's "Select →
 * Download" flow — the per-grid-image overlay was removed so a tap on the grid always opens
 * fullscreen.
 */
export default function FullScreenDownloadButton({ imageId }: FullScreenDownloadButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState<DownloadFormat | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Collapse the picker whenever the viewer moves to a different image.
  useEffect(() => {
    setExpanded(false);
    setErrorMsg(null);
  }, [imageId]);

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const handleToggle = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    setExpanded(prev => !prev);
    setErrorMsg(null);
  }, []);

  const handleFormatDownload = useCallback(
    async (e: MouseEvent, format: DownloadFormat) => {
      e.stopPropagation();
      setDownloading(format);
      setErrorMsg(null);

      let blobUrl: string | null = null;
      try {
        const res = await fetch(downloadImageUrl(imageId, format), { credentials: 'include' });
        if (!res.ok) {
          const msg =
            format === 'original' ? 'Original not available for this image' : 'Download failed';
          setErrorMsg(msg);
          if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
          errorTimerRef.current = setTimeout(() => {
            setErrorMsg(null);
            errorTimerRef.current = null;
          }, 3000);
          return;
        }
        const blob = await res.blob();
        blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setExpanded(false);
      } finally {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        setDownloading(null);
      }
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
          {errorMsg && (
            <span role="alert" aria-live="assertive" className={styles.errorLabel}>
              {errorMsg}
            </span>
          )}
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
