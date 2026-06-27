/**
 * Thin, feature-detected wrappers around the native Fullscreen API.
 *
 * Why this exists: the immersive viewer toggle (see {@link useFullScreenImage}) requests true
 * browser fullscreen on touch devices to reclaim the address-bar height — the whole point of the
 * feature. Support is uneven: desktop + Android Chrome expose the standard API, older WebKit (iPad)
 * only the `webkit`-prefixed one, and iPhone Safari exposes neither for non-`<video>` elements.
 * These helpers normalize that and NEVER throw, so callers can fire-and-forget and let the
 * chrome-hide fallback carry the platforms without native support.
 */

/** Structural view of an element that may carry the legacy webkit fullscreen request. */
interface FullscreenCapableElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

/** Structural view of the document's standard + legacy webkit fullscreen members. */
interface FullscreenCapableDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

/** True if some element-level fullscreen request is available in this browser. */
export function isFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.documentElement as FullscreenCapableElement;
  return (
    typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function'
  );
}

/** The element currently in fullscreen (standard, then webkit), or null. */
export function fullscreenElement(): Element | null {
  if (typeof document === 'undefined') return null;
  const doc = document as FullscreenCapableDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

/**
 * Request fullscreen on `el`. Resolves `false` when there is no element, no supported API, or the
 * request is rejected (e.g. not triggered by a user gesture). Must be called from within a user
 * gesture handler to succeed.
 */
export async function requestFullscreen(el: HTMLElement | null): Promise<boolean> {
  if (!el) return false;
  const target = el as FullscreenCapableElement;
  const request =
    typeof target.requestFullscreen === 'function'
      ? target.requestFullscreen
      : typeof target.webkitRequestFullscreen === 'function'
        ? target.webkitRequestFullscreen
        : null;
  if (!request) return false;
  try {
    await request.call(target);
    return true;
  } catch {
    return false;
  }
}

/** Exit fullscreen if the document is currently in it. Best-effort; never throws. */
export async function exitFullscreen(): Promise<void> {
  if (typeof document === 'undefined') return;
  if (!fullscreenElement()) return;
  const doc = document as FullscreenCapableDocument;
  const exit =
    typeof doc.exitFullscreen === 'function'
      ? doc.exitFullscreen
      : typeof doc.webkitExitFullscreen === 'function'
        ? doc.webkitExitFullscreen
        : null;
  if (!exit) return;
  try {
    await exit.call(doc);
  } catch {
    // Best-effort: a failed exit shouldn't surface to the caller.
  }
}

/**
 * Subscribe to fullscreen changes (standard + webkit event names). Returns an unsubscribe function.
 * Used to keep app state honest when the user leaves native fullscreen via the browser's own UI.
 */
export function onFullscreenChange(handler: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);
  return () => {
    document.removeEventListener('fullscreenchange', handler);
    document.removeEventListener('webkitfullscreenchange', handler);
  };
}
