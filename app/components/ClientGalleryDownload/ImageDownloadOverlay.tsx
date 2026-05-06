'use client';

import { type MouseEvent, useCallback, useEffect, useRef, useState } from 'react';

import { type DownloadFormat, downloadImageUrl } from '@/app/lib/api/downloads';

import styles from './ImageDownloadOverlay.module.scss';

interface ImageDownloadOverlayProps {
  imageId: number;
}

export default function ImageDownloadOverlay({ imageId }: ImageDownloadOverlayProps) {
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState<DownloadFormat | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Collapse on outside click when expanded.
  // Listening on `mousedown` keeps the picker stable for inside clicks: the
  // container's `e.stopPropagation()` on outer click is unrelated, but
  // `containerRef.contains` already excludes the buttons themselves.
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: globalThis.MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded]);

  // Esc collapses while expanded (unless a download is mid-flight).
  useEffect(() => {
    if (!expanded || downloading !== null) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [expanded, downloading]);

  // Clear error timer on unmount.
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const handleIconClick = useCallback((e: MouseEvent) => {
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
      ref={containerRef}
      className={`${styles.overlayContainer}${expanded ? ` ${styles.expanded}` : ''}`}
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
          onClick={handleIconClick}
          className={styles.downloadIconButton}
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
