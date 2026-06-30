/**
 * Unit tests for buildCollectionBreadcrumb: a gated up-trail for a collection page.
 */

import type { BreadcrumbItem } from '@/app/components/Breadcrumb/Breadcrumb';
import { buildCollectionBreadcrumb } from '@/app/utils/collectionBreadcrumb';

describe('buildCollectionBreadcrumb', () => {
  it('returns [] when no via param is present', () => {
    expect(buildCollectionBreadcrumb({ currentTitle: 'Dolomites 2025' })).toEqual([]);
  });

  it('returns [] for a blank/whitespace via param', () => {
    expect(buildCollectionBreadcrumb({ currentTitle: 'Current', via: '   ' })).toEqual([]);
  });

  it('returns Home › {via} › {current} when a valid via param is present', () => {
    const items = buildCollectionBreadcrumb({
      currentTitle: 'Dolomites Film',
      via: 'dolomites-2025',
    });

    expect(items).toEqual<BreadcrumbItem[]>([
      { label: 'Home', href: '/' },
      { label: 'Dolomites 2025', href: '/dolomites-2025' },
      { label: 'Dolomites Film' },
    ]);
  });

  it('humanizes a multi-word via slug for its label while keeping the raw slug in the href', () => {
    const items = buildCollectionBreadcrumb({
      currentTitle: 'Black & White',
      via: 'street-photography',
    });

    expect(items[1]).toEqual({ label: 'Street Photography', href: '/street-photography' });
  });

  it('never gives the current (last) item an href', () => {
    const items = buildCollectionBreadcrumb({ currentTitle: 'Current', via: 'parent' });
    expect(items.at(-1)?.href).toBeUndefined();
  });

  it('falls back to the slug as the current label when the title is blank', () => {
    const items = buildCollectionBreadcrumb({
      currentTitle: '   ',
      currentSlug: 'untitled-2025',
      via: 'parent',
    });

    expect(items.at(-1)).toEqual({ label: 'Untitled 2025' });
  });
});
