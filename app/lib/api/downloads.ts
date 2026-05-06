/**
 * Download URL Builders
 *
 * Pure helpers that produce BFF-routed download URLs for client galleries.
 * Auth (httpOnly `gallery_access_{slug}` cookie set on the gate) flows
 * automatically via `same-origin`, so callers just navigate to these URLs
 * (e.g. `window.location.href = ...`) and the browser handles the response.
 *
 * Backend endpoints:
 * - GET /api/read/content/images/{id}/download?format=web|original
 * - GET /api/read/collections/{slug}/download?format=web|original
 */

export type DownloadFormat = 'web' | 'original';

export const downloadImageUrl = (imageId: number, format: DownloadFormat = 'web'): string =>
  `/api/proxy/api/read/content/images/${imageId}/download?format=${format}`;

export const downloadCollectionUrl = (slug: string, format: DownloadFormat = 'web'): string =>
  `/api/proxy/api/read/collections/${encodeURIComponent(slug)}/download?format=${format}`;
