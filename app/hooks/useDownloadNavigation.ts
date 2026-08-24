import { useCallback, useEffect, useRef, useState } from 'react';

import { type DownloadFormat } from '@/app/lib/api/downloads';

/** How long the in-flight "…" label stays up before the control resets itself. */
const RESET_DELAY_MS = 4000;

interface DownloadNavigation {
  /** The format currently downloading, or null when idle. Drives the "…" label and disabled state. */
  preparing: DownloadFormat | null;
  /** Navigate to `url` to start `format` downloading, then reset the control after the delay. */
  startDownload: (url: string, format: DownloadFormat) => void;
}

/**
 * Drives the "navigate to a download URL, then reset the control" flow shared by
 * `ClientGalleryDownload` and `FullScreenDownloadButton`.
 *
 * Downloads start by assigning `window.location.href` rather than `fetch`+blob: the backend
 * 302-redirects to a presigned S3 URL to bypass the Amplify response-size cap, and a cross-origin
 * `fetch` following that redirect would be blocked by S3 CORS. The response carries
 * `Content-Disposition: attachment`, so the browser downloads without leaving the page. That also
 * means there is no load event to listen for, which is why the reset is a fixed timer rather than a
 * completion callback.
 *
 * `onReset` is held in a ref refreshed on every render, so the timer invokes the latest callback
 * instead of the one captured when the download started. Without that indirection a caller passing
 * an inline arrow that closes over props would reset against stale state. The same indirection keeps
 * `startDownload` referentially stable, so callers can safely list it in a dependency array. This
 * mirrors the callback-ref pattern `useThrottle` (`app/hooks/useThrottle.ts`) already uses.
 *
 * The pending timer is cleared on unmount, so a control that disappears mid-download — the
 * fullscreen viewer closing, the gallery unmounting — never fires a reset against a torn-down tree.
 * Starting a second download also clears the first one's timer, so the reset always lands on the
 * most recent download rather than being cut short by an earlier one.
 */
export function useDownloadNavigation(onReset: () => void): DownloadNavigation {
  const [preparing, setPreparing] = useState<DownloadFormat | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResetRef = useRef(onReset);

  useEffect(() => {
    onResetRef.current = onReset;
  }, [onReset]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const startDownload = useCallback((url: string, format: DownloadFormat) => {
    setPreparing(format);
    window.location.href = url;
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setPreparing(null);
      onResetRef.current();
      resetTimerRef.current = null;
    }, RESET_DELAY_MS);
  }, []);

  return { preparing, startDownload };
}
