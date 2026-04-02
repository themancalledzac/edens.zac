'use client';

import { useCallback, useState } from 'react';

import styles from './ClientGalleryDownload.module.scss';

interface ClientGalleryDownloadProps {
  collectionSlug: string;
}

/**
 * Client Gallery Download All Button
 *
 * Prominent "Download All" action for CLIENT_GALLERY collections.
 * Currently a placeholder/mock that shows a toast notification.
 * Will eventually call GET /api/read/collections/{slug}/download to fetch a zip.
 */
export default function ClientGalleryDownload({
  collectionSlug: _collectionSlug,
}: ClientGalleryDownloadProps) {
  const [toastVisible, setToastVisible] = useState(false);

  const handleDownloadAll = useCallback(() => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  }, []);

  return (
    <div className={styles.downloadContainer}>
      <button type="button" onClick={handleDownloadAll} className={styles.downloadButton}>
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
        Download All
      </button>

      {toastVisible && <div className={styles.toast}>Downloads coming soon</div>}
    </div>
  );
}
