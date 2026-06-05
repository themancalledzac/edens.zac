/**
 * Download URL Builders
 *
 * Pure helpers that produce BFF-routed download URLs for client galleries.
 * Auth (httpOnly `gallery_access_{slug}` cookie set on the gate) flows
 * automatically via `same-origin`, so callers just navigate to these URLs
 * (e.g. `window.location.href = ...`) and the browser handles the response.
 *
 * Collection ZIP downloads are intentionally navigation-based rather than
 * `fetch`+blob: a full-gallery ZIP can be large, and streaming straight to disk
 * avoids buffering the whole archive in memory. The tradeoff is that an HTTP
 * error can't be surfaced inline (the browser navigates to the error response);
 * the single-image button uses `fetch`+blob precisely because those payloads are
 * small enough to inspect and report failures on.
 *
 * Backend endpoints:
 * - GET /api/read/content/images/{id}/download?format=web|original
 * - GET /api/read/collections/{slug}/download?format=web|original
 * - GET /api/read/collections/{slug}/download?format=web|original&imageIds=1,2,3 (selected subset)
 */

export type DownloadFormat = 'web' | 'original';

export const downloadImageUrl = (imageId: number, format: DownloadFormat = 'web'): string =>
  `/api/proxy/api/read/content/images/${imageId}/download?format=${format}`;

export const downloadCollectionUrl = (slug: string, format: DownloadFormat = 'web'): string =>
  `/api/proxy/api/read/collections/${encodeURIComponent(slug)}/download?format=${format}`;

/**
 * ZIP download of a chosen subset of a collection's images. Same endpoint as
 * {@link downloadCollectionUrl} plus an `imageIds` filter (comma-separated; Spring binds it to a
 * `List<Long>`). When the backend subset filter is not yet deployed the param is ignored and the
 * whole-collection ZIP is returned.
 *
 * Throws on an empty selection: emitting a bare `imageIds=` is ambiguous (the backend can read an
 * empty filter as "no filter → whole collection"), which is the opposite of a selected subset.
 * Callers already gate the Download button on a non-empty selection, so reaching here with `[]` is
 * a bug — fail loudly rather than silently ZIP the entire gallery.
 */
export const downloadCollectionSelectionUrl = (
  slug: string,
  imageIds: number[],
  format: DownloadFormat = 'web'
): string => {
  if (imageIds.length === 0) {
    throw new Error('downloadCollectionSelectionUrl requires at least one imageId');
  }
  return (
    `/api/proxy/api/read/collections/${encodeURIComponent(slug)}/download?format=${format}` +
    `&imageIds=${imageIds.join(',')}`
  );
};
