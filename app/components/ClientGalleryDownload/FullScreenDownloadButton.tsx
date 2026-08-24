'use client';

import { type MouseEvent, useCallback, useEffect, useState } from 'react';

import DownloadIcon from '@/app/components/Icons/DownloadIcon';
import { IconButton } from '@/app/components/ui/IconButton/IconButton';
import { useDownloadNavigation } from '@/app/hooks/useDownloadNavigation';
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

  // Collapse the picker whenever the viewer moves to a different image.
  useEffect(() => {
    setExpanded(false);
  }, [imageId]);

  const collapsePicker = useCallback(() => setExpanded(false), []);
  const { preparing: downloading, startDownload } = useDownloadNavigation(collapsePicker);

  const handleToggle = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    setExpanded(prev => !prev);
  }, []);

  const handleFormatDownload = useCallback(
    (e: MouseEvent, format: DownloadFormat) => {
      e.stopPropagation();
      startDownload(downloadImageUrl(imageId, format), format);
    },
    [imageId, startDownload]
  );

  return (
    <div className={styles.container} onClick={e => e.stopPropagation()}>
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
        <IconButton
          shape="round"
          variant="overlay"
          size="md"
          onClick={handleToggle}
          className={styles.downloadToggle}
          aria-label="Download image"
        >
          <DownloadIcon className={styles.icon} />
        </IconButton>
      )}
    </div>
  );
}
