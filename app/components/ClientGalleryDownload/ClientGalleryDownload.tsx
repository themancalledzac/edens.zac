'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import { downloadCollectionUrl, type DownloadFormat } from '@/app/lib/api/downloads';

import styles from './ClientGalleryDownload.module.scss';

interface ClientGalleryDownloadProps {
  collectionSlug: string;
}

const DownloadIcon = () => (
  <svg
    aria-hidden="true"
    className={styles.downloadIcon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export default function ClientGalleryDownload({ collectionSlug }: ClientGalleryDownloadProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [preparing, setPreparing] = useState<DownloadFormat | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closePicker = useCallback(() => {
    setShowPicker(false);
  }, []);

  // Esc closes the picker (only while it's open and a download isn't in flight)
  useEffect(() => {
    if (!showPicker || preparing !== null) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') closePicker();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showPicker, preparing, closePicker]);

  // Clear any pending reset timer on unmount.
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const handleOpenPicker = useCallback(() => {
    setShowPicker(true);
  }, []);

  const handleFormatDownload = useCallback(
    (format: DownloadFormat) => {
      setPreparing(format);
      window.location.href = downloadCollectionUrl(collectionSlug, format);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setPreparing(null);
        setShowPicker(false);
        resetTimerRef.current = null;
      }, 4000);
    },
    [collectionSlug]
  );

  if (showPicker) {
    return (
      <div className={styles.downloadContainer}>
        <span id="download-quality-label" className={styles.pickerLabel}>
          Choose quality:
        </span>
        <div className={styles.pickerRow} role="group" aria-labelledby="download-quality-label">
          <Button
            type="button"
            className={styles.ctaButton}
            leftIcon={<DownloadIcon />}
            onClick={() => handleFormatDownload('web')}
            disabled={preparing !== null}
          >
            {preparing === 'web' ? 'Preparing…' : 'Web Optimized'}
          </Button>
          <Button
            type="button"
            className={styles.ctaButton}
            leftIcon={<DownloadIcon />}
            onClick={() => handleFormatDownload('original')}
            disabled={preparing !== null}
          >
            {preparing === 'original' ? 'Preparing…' : 'Full Size'}
          </Button>
          {preparing === null && (
            <button type="button" onClick={closePicker} className={styles.cancelButton}>
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.downloadContainer}>
      <Button
        type="button"
        className={styles.ctaButton}
        leftIcon={<DownloadIcon />}
        onClick={handleOpenPicker}
      >
        Download All
      </Button>
    </div>
  );
}
