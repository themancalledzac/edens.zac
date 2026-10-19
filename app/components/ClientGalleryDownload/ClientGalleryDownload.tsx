'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useClientGalleryDownload } from '@/app/components/ContentCollection/ClientGalleryDownloadContext';
import DownloadIcon from '@/app/components/Icons/DownloadIcon';
import { Button } from '@/app/components/ui/Button/Button';
import { useDownloadNavigation } from '@/app/hooks/useDownloadNavigation';
import {
  downloadCollectionSelectionUrl,
  downloadCollectionUrl,
  type DownloadFormat,
} from '@/app/lib/api/downloads';

import styles from './ClientGalleryDownload.module.scss';

interface ClientGalleryDownloadProps {
  collectionSlug: string;
}

/** Which set the shared quality picker will download. */
type PickerTarget = 'all' | 'selected';

/**
 * Client Gallery "Download" section.
 *
 * Inline (bottom of the collection's metadata block, just above the filter bar) shows the entry
 * actions: **All** and **Select**. The actual quality picker (Web / Full / Cancel) — for *both*
 * "All" and "Select" — always appears in a single fixed action bar at the bottom of the screen, so
 * "download" is always in the same place. The bar is portaled to `document.body` so it survives
 * scroll and any transformed ancestor in the content tree.
 *
 * Degrades gracefully when no download context is present: only the "All" action is shown (which
 * still uses the bottom picker). This is a real runtime mode, not just a test fallback — mounting
 * is gated on {@link canDownloadCollection} (a CLIENT role grant on ANY collection, or a validated
 * password cookie on a client gallery) while the context provider is mounted only on collections
 * with `isClient === true`, so a CLIENT grant on a non-client collection reaches this branch.
 */
export default function ClientGalleryDownload({ collectionSlug }: ClientGalleryDownloadProps) {
  const download = useClientGalleryDownload();
  const isSelectMode = download?.isSelectMode ?? false;
  const selectedIds = download?.selectedIds ?? [];
  const selectedCount = selectedIds.length;

  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const closePicker = useCallback(() => setPickerTarget(null), []);
  const { preparing, startDownload } = useDownloadNavigation(closePicker);

  useEffect(() => {
    if (pickerTarget === null || preparing !== null) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') closePicker();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pickerTarget, preparing, closePicker]);

  useEffect(() => {
    if (!isSelectMode) setPickerTarget(prev => (prev === 'selected' ? null : prev));
  }, [isSelectMode]);

  useEffect(() => {
    if (pickerTarget === 'selected' && selectedCount === 0) setPickerTarget(null);
  }, [pickerTarget, selectedCount]);

  /**
   * Start a download for the active picker target. Ids come from the memoized context (so this
   * callback stays stable across renders), and an empty "selected" set is a no-op — the button is
   * already disabled, and bailing avoids the URL builder's empty-selection throw. The URL is built
   * before `startDownload` is called, so even if that throw were reachable it would happen before
   * any in-flight state was set.
   */
  const handleFormatDownload = useCallback(
    (format: DownloadFormat) => {
      const ids = download?.selectedIds ?? [];
      if (pickerTarget === 'selected' && ids.length === 0) return;

      const url =
        pickerTarget === 'selected'
          ? downloadCollectionSelectionUrl(collectionSlug, ids, format)
          : downloadCollectionUrl(collectionSlug, format);
      startDownload(url, format);
    },
    [collectionSlug, pickerTarget, download, startDownload]
  );

  const renderPicker = () => (
    <div className={styles.pickerRow} role="group" aria-label="Choose download quality">
      <Button
        className={styles.ctaButton}
        size="sm"
        leftIcon={<DownloadIcon className={styles.downloadIcon} />}
        onClick={() => handleFormatDownload('web')}
        disabled={preparing !== null}
      >
        {preparing === 'web' ? '…' : 'Web'}
      </Button>
      <Button
        className={styles.ctaButton}
        size="sm"
        leftIcon={<DownloadIcon className={styles.downloadIcon} />}
        onClick={() => handleFormatDownload('original')}
        disabled={preparing !== null}
      >
        {preparing === 'original' ? '…' : 'Full'}
      </Button>
      {preparing === null && (
        <button type="button" onClick={closePicker} className={styles.cancelButton}>
          {pickerTarget === 'selected' ? 'Back' : 'Cancel'}
        </button>
      )}
    </div>
  );

  const inlineSection = (
    <div className={styles.downloadContainer}>
      <span className={styles.sectionLabel}>Download</span>
      {isSelectMode ? (
        <span className={styles.selectHint}>Tap images to select, then download below.</span>
      ) : (
        <div className={styles.buttonRow}>
          <Button
            className={`${styles.ctaButton} ${styles.rowButton}`}
            size="sm"
            leftIcon={<DownloadIcon className={styles.downloadIcon} />}
            onClick={() => setPickerTarget('all')}
          >
            All
          </Button>
          {download && (
            <Button
              variant="outline"
              size="sm"
              className={styles.rowButton}
              onClick={download.enterSelectMode}
            >
              Select
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const barVisible = mounted && (pickerTarget === 'all' || isSelectMode);
  const selectBar = barVisible
    ? createPortal(
        <div className={styles.selectBar} role="group" aria-label="Download">
          {pickerTarget !== null ? (
            renderPicker()
          ) : (
            <>
              <span className={styles.barCount} aria-live="polite">
                {selectedCount} selected
              </span>
              <Button
                className={styles.ctaButton}
                size="sm"
                leftIcon={<DownloadIcon className={styles.downloadIcon} />}
                onClick={() => setPickerTarget('selected')}
                disabled={selectedCount === 0}
              >
                Download
              </Button>
              <button
                type="button"
                onClick={() => download?.exitSelectMode()}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {inlineSection}
      {selectBar}
    </>
  );
}
