import { type SVGProps } from 'react';

/**
 * Download glyph — a tray with a down arrow. Shared by the two client-gallery download controls:
 * the gallery's `ClientGalleryDownload` buttons and the fullscreen viewer's
 * `FullScreenDownloadButton` toggle.
 *
 * Sets no `width`/`height` on purpose. Both call sites size the glyph from their own SCSS module
 * (`.downloadIcon` is 18px in ClientGalleryDownload, `.icon` is 20px in FullScreenDownloadButton),
 * so a baked-in default would silently override one of them. Pass `className` to size it.
 *
 * `aria-hidden` defaults to true because every call site wraps the glyph in a control that already
 * carries the accessible name. A caller that needs a named icon can override it through the spread.
 */
export default function DownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
