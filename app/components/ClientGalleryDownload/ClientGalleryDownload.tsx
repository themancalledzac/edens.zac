'use client';

import { useCallback, useState } from 'react';

import { downloadCollectionUrl } from '@/app/lib/api/downloads';

import styles from './ClientGalleryDownload.module.scss';

interface ClientGalleryDownloadProps {
  collectionSlug: string;
}

/**
 * Client Gallery Download All Button
 *
 * Prominent "Download All" action for CLIENT_GALLERY collections.
 * Navigates to the BFF-routed collection download endpoint, which streams
 * a ZIP with `Content-Disposition: attachment` so the browser saves rather
 * than navigates. The httpOnly `gallery_access_{slug}` cookie set by the
 * gate is sent automatically (same-origin via the proxy).
 *
 * The "preparing" state is a short-lived label change while the browser is
 * negotiating the ZIP — the native download UI is the real progress feedback.
 */
export default function ClientGalleryDownload({ collectionSlug }: ClientGalleryDownloadProps) {
  const [preparing, setPreparing] = useState(false);

  const handleDownloadAll = useCallback(() => {
    setPreparing(true);
    window.location.href = downloadCollectionUrl(collectionSlug);
    // Reset preparing state after a short delay (the browser is now handling the download)
    setTimeout(() => setPreparing(false), 4000);
  }, [collectionSlug]);

  return (
    <div className={styles.downloadContainer}>
      <button
        type="button"
        onClick={handleDownloadAll}
        disabled={preparing}
        className={styles.downloadButton}
      >
        <svg
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
        {preparing ? 'Preparing ZIP…' : 'Download All'}
      </button>
    </div>
  );
}
