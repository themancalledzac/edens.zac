'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useClientGalleryDownload } from '@/app/components/ContentCollection/ClientGalleryDownloadContext';
import { Button } from '@/app/components/ui/Button/Button';
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

/**
 * Client Gallery "Download" section.
 *
 * Inline (bottom of the collection's metadata block, just above the filter bar) shows the entry
 * actions: **All** and **Select**. The actual quality picker (Web / Full / Cancel) — for *both*
 * "All" and "Select" — always appears in a single fixed action bar at the bottom of the screen, so
 * "download" is always in the same place. The bar is portaled to `document.body` so it survives
 * scroll and any transformed ancestor in the content tree.
 *
 * Degrades gracefully when no download context is present (e.g. mounted outside a client gallery):
 * only the "All" action is shown (which still uses the bottom picker).
 */
export default function ClientGalleryDownload({ collectionSlug }: ClientGalleryDownloadProps) {
  const download = useClientGalleryDownload();
  const isSelectMode = download?.isSelectMode ?? false;
  const selectedImageIds = download?.selectedImageIds ?? [];
  const selectedCount = selectedImageIds.length;

  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [preparing, setPreparing] = useState<DownloadFormat | null>(null);
  const [mounted, setMounted] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Portal target (document.body) is only available on the client.
  useEffect(() => setMounted(true), []);

  const closePicker = useCallback(() => setPickerTarget(null), []);

  // Esc closes the picker (only while open and no download is in flight).
  useEffect(() => {
    if (pickerTarget === null || preparing !== null) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') closePicker();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pickerTarget, preparing, closePicker]);

  // Leaving select mode (e.g. via the bar's Cancel) must drop a stale "selected" picker.
  useEffect(() => {
    if (!isSelectMode) setPickerTarget(prev => (prev === 'selected' ? null : prev));
  }, [isSelectMode]);

  // If the user deselects every image while the quality picker is open, auto-back-out of it —
  // there's nothing left to download, so the picker should behave like Cancel.
  useEffect(() => {
    if (pickerTarget === 'selected' && selectedCount === 0) setPickerTarget(null);
  }, [pickerTarget, selectedCount]);

  // Clear any pending reset timer on unmount.
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const handleFormatDownload = useCallback(
    (format: DownloadFormat) => {
      setPreparing(format);
      // Read ids from the (stable, memoized) context here rather than closing over a freshly
      // derived array, so this callback only changes when the selection actually changes.
      const ids = download?.selectedImageIds ?? [];
      const url =
        pickerTarget === 'selected'
          ? downloadCollectionSelectionUrl(collectionSlug, ids, format)
          : downloadCollectionUrl(collectionSlug, format);
      window.location.href = url;
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setPreparing(null);
        setPickerTarget(null);
        resetTimerRef.current = null;
      }, 4000);
    },
    [collectionSlug, pickerTarget, download]
  );

  // The shared Web / Full / Cancel picker — used by both the "All" and "Selected" flows, always in
  // the bottom bar. Short labels keep the bar from overflowing on mobile.
  const renderPicker = () => (
    <div className={styles.pickerRow} role="group" aria-label="Choose download quality">
      <Button
        className={styles.ctaButton}
        size="sm"
        leftIcon={<DownloadIcon />}
        onClick={() => handleFormatDownload('web')}
        disabled={preparing !== null}
      >
        {preparing === 'web' ? '…' : 'Web'}
      </Button>
      <Button
        className={styles.ctaButton}
        size="sm"
        leftIcon={<DownloadIcon />}
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

  // ── Inline entry: "Download" + All / Select (bottom of the metadata block) ──
  const inlineSection = (
    <div className={styles.downloadContainer}>
      <span className={styles.sectionLabel}>Download</span>
      {isSelectMode ? (
        <span className={styles.selectHint}>Tap images to select, then download below.</span>
      ) : (
        <div className={styles.buttonRow}>
          <Button
            className={styles.ctaButton}
            size="sm"
            leftIcon={<DownloadIcon />}
            onClick={() => setPickerTarget('all')}
          >
            All
          </Button>
          {download && (
            <Button variant="outline" size="sm" onClick={download.enterSelectMode}>
              Select
            </Button>
          )}
        </div>
      )}
    </div>
  );

  // ── Single fixed action bar at the bottom — the one and only "download" location ──
  // Shown for the All picker (not in select mode) and for the whole Select flow.
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
                leftIcon={<DownloadIcon />}
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
