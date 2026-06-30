/**
 * Unit tests for collectionBreadcrumb.ts
 *
 * The breadcrumb helper builds the "up to parent" trail for a collection page.
 * MVP logic (Track B, design decision #3):
 *   - no `via` param → `Home › {current}`
 *   - valid `via` param → `Home › {via-collection} › {current}`
 *   - the current (last) item is always plain text (no href).
 */

import type { BreadcrumbItem } from '@/app/components/Breadcrumb/Breadcrumb';
import { buildCollectionBreadcrumb } from '@/app/utils/collectionBreadcrumb';

describe('buildCollectionBreadcrumb', () => {
  it('returns Home › {current} when no via param is present', () => {
    const items = buildCollectionBreadcrumb({ currentTitle: 'Dolomites 2025' });

    expect(items).toEqual<BreadcrumbItem[]>([
      { label: 'Home', href: '/' },
      { label: 'Dolomites 2025' },
    ]);
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
    const withVia = buildCollectionBreadcrumb({ currentTitle: 'Current', via: 'parent' });
    const withoutVia = buildCollectionBreadcrumb({ currentTitle: 'Current' });

    expect(withVia.at(-1)?.href).toBeUndefined();
    expect(withoutVia.at(-1)?.href).toBeUndefined();
  });

  it('ignores a blank/whitespace via param and falls back to Home › {current}', () => {
    const items = buildCollectionBreadcrumb({ currentTitle: 'Current', via: '   ' });

    expect(items).toEqual<BreadcrumbItem[]>([{ label: 'Home', href: '/' }, { label: 'Current' }]);
  });

  it('falls back to the slug as the current label when the title is blank', () => {
    const items = buildCollectionBreadcrumb({ currentTitle: '   ', currentSlug: 'untitled-2025' });

    expect(items.at(-1)).toEqual({ label: 'Untitled 2025' });
  });
});
