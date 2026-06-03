/**
 * Unit tests for downloads.ts URL builders.
 *
 * These are pure functions — no fetch, no DOM. They produce BFF-routed URLs
 * that the browser navigates to via `window.location.href`. Tests focus on
 * shape, defaults, format selection, and slug encoding.
 */

import {
  downloadCollectionSelectionUrl,
  downloadCollectionUrl,
  downloadImageUrl,
} from '@/app/lib/api/downloads';

describe('downloadImageUrl', () => {
  it('defaults to format=web', () => {
    expect(downloadImageUrl(123)).toBe(
      '/api/proxy/api/read/content/images/123/download?format=web'
    );
  });

  it('produces an original-format URL when format=original', () => {
    expect(downloadImageUrl(123, 'original')).toBe(
      '/api/proxy/api/read/content/images/123/download?format=original'
    );
  });

  it('produces a web-format URL when format=web is passed explicitly', () => {
    expect(downloadImageUrl(456, 'web')).toBe(
      '/api/proxy/api/read/content/images/456/download?format=web'
    );
  });

  it('embeds numeric image IDs verbatim', () => {
    expect(downloadImageUrl(0)).toBe('/api/proxy/api/read/content/images/0/download?format=web');
    expect(downloadImageUrl(987_654_321)).toBe(
      '/api/proxy/api/read/content/images/987654321/download?format=web'
    );
  });
});

describe('downloadCollectionUrl', () => {
  it('defaults to format=web for a simple slug', () => {
    expect(downloadCollectionUrl('hello-world')).toBe(
      '/api/proxy/api/read/collections/hello-world/download?format=web'
    );
  });

  it('produces a web-format URL when format=web is passed explicitly', () => {
    expect(downloadCollectionUrl('smith-wedding', 'web')).toBe(
      '/api/proxy/api/read/collections/smith-wedding/download?format=web'
    );
  });

  it('URL-encodes slugs with spaces and reserved characters', () => {
    expect(downloadCollectionUrl('hello world & more')).toBe(
      '/api/proxy/api/read/collections/hello%20world%20%26%20more/download?format=web'
    );
  });

  it('URL-encodes slashes inside the slug so they cannot escape the path segment', () => {
    expect(downloadCollectionUrl('foo/bar')).toBe(
      '/api/proxy/api/read/collections/foo%2Fbar/download?format=web'
    );
  });
});

describe('downloadCollectionSelectionUrl', () => {
  it('appends a comma-separated imageIds filter and defaults to format=web', () => {
    expect(downloadCollectionSelectionUrl('smith-wedding', [3, 1, 2])).toBe(
      '/api/proxy/api/read/collections/smith-wedding/download?format=web&imageIds=3,1,2'
    );
  });

  it('preserves the chosen format', () => {
    expect(downloadCollectionSelectionUrl('smith-wedding', [7], 'original')).toBe(
      '/api/proxy/api/read/collections/smith-wedding/download?format=original&imageIds=7'
    );
  });

  it('URL-encodes the slug but leaves the imageIds list as bare numbers', () => {
    expect(downloadCollectionSelectionUrl('hello world & more', [10, 20])).toBe(
      '/api/proxy/api/read/collections/hello%20world%20%26%20more/download?format=web&imageIds=10,20'
    );
  });

  it('produces an empty imageIds value for an empty selection', () => {
    expect(downloadCollectionSelectionUrl('smith-wedding', [])).toBe(
      '/api/proxy/api/read/collections/smith-wedding/download?format=web&imageIds='
    );
  });
});
