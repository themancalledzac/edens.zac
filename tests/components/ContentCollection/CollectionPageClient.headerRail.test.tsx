/**
 * End-to-end guard for the header rail.
 *
 * The filter toolbar does not live in `CollectionPageClient` — it is rendered deep inside the
 * header's metadata TEXT block, which the layout engine only builds when the collection has
 * metadata items. A page with no date, locations, description or siblings (that is `/user`)
 * therefore got a cover-only header and silently lost the bar, even though the filter context was
 * populated correctly.
 *
 * Every unit in that chain passed on its own; only the assembled chain was broken. So this suite
 * deliberately renders the REAL grid — no `ContentBlockWithFullScreen` mock — and drives it via
 * the SSR viewport props, so the layout runs without needing a measured DOM.
 */
import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';

import CollectionPageClient from '@/app/components/ContentCollection/CollectionPageClient';
import { type ToolbarSection } from '@/app/components/ui/FilterToolbar/FilterToolbar';
import type { CollectionModel } from '@/app/types/Collection';
import type { AnyContentModel } from '@/app/types/Content';
import { HOME_SLUG } from '@/app/utils/collectionSlugs';

// jsdom ships no IntersectionObserver, and the real grid's lazy-render hook builds one on mount.
// Rendering the unmocked grid is the whole point of this suite, so stub the API rather than mock
// the grid away.
class NoopIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
globalThis.IntersectionObserver =
  NoopIntersectionObserver as unknown as typeof IntersectionObserver;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/user',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () =>
    function DynamicStub() {
      return null;
    },
}));

const SECTIONS: ToolbarSection[] = [
  { key: 'collections', label: 'Collections', count: 12, href: '/user?tab=collections' },
  { key: 'images', label: 'Images', count: 1, href: '/user?tab=images' },
  { key: 'saved', label: 'Saved', count: 3, href: '/user?tab=saved' },
  { key: 'following', label: 'Following', count: 1, href: '/user?tab=following' },
];

function collectionCard(id: number): AnyContentModel {
  return {
    id,
    contentType: 'COLLECTION',
    orderIndex: id,
    referencedCollectionId: id,
    slug: `collection-${id}`,
    title: `Collection ${id}`,
    coverImage: {
      id: id * 100,
      contentType: 'IMAGE',
      orderIndex: 0,
      imageUrl: `https://cdn.example/cover-${id}.jpg`,
      imageWidth: 1600,
      imageHeight: 1067,
      visible: true,
      locations: [],
    },
    visible: true,
  } as unknown as AnyContentModel;
}

/**
 * Mirrors the real `/user` payload: a cover and a title, but nothing `buildMetadataItems` picks
 * up — no collectionDate, no locations, no description, no siblings or parents.
 */
function bareCollection(content: AnyContentModel[]): CollectionModel {
  return {
    slug: 'user',
    title: 'Your Space',
    locations: [],
    coverImage: {
      id: 42,
      contentType: 'IMAGE',
      orderIndex: 0,
      imageUrl: 'https://cdn.example/user-cover.jpg',
      imageWidth: 1600,
      imageHeight: 1067,
      visible: true,
      locations: [],
    },
    content,
  } as unknown as CollectionModel;
}

const ssr = {
  serverContentWidth: 1200,
  serverViewportHeight: 900,
  serverIsMobile: false,
};

describe('CollectionPageClient — header rail', () => {
  it('renders the section chips on a collection with no metadata of its own', () => {
    render(
      <CollectionPageClient
        collection={bareCollection([collectionCard(1), collectionCard(2)])}
        {...ssr}
        sections={SECTIONS}
        activeSectionKey="collections"
      />
    );

    for (const section of SECTIONS) {
      const chip = screen.getByRole('link', { name: new RegExp(section.label, 'i') });
      expect(chip).toHaveAttribute('href', section.href);
    }
  });

  it('marks exactly one section chip current', () => {
    render(
      <CollectionPageClient
        collection={bareCollection([collectionCard(1)])}
        {...ssr}
        sections={SECTIONS}
        activeSectionKey="saved"
      />
    );

    const current = screen
      .getAllByRole('link')
      .filter(link => link.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('Saved');
  });

  it('brings the shared density control along with the bar', () => {
    // The photo-size control is the visible proof that the page picked up the shared bar chrome
    // rather than a /user-only approximation of it. Visitors get the tier radiogroup, not the
    // raw slider -- that is edit-mode only.
    render(
      <CollectionPageClient
        collection={bareCollection([collectionCard(1)])}
        {...ssr}
        sections={SECTIONS}
        activeSectionKey="collections"
      />
    );
    expect(screen.getByRole('radiogroup', { name: 'Photo size' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Row density')).not.toBeInTheDocument();
  });

  it('renders no bar on a metadata-less collection that has nothing to put in it', () => {
    // The rail is forced only when controls will mount. An ordinary metadata-less collection
    // with no filterable dimensions keeps its full-width cover and gains no empty rail.
    render(<CollectionPageClient collection={bareCollection([collectionCard(1)])} {...ssr} />);
    expect(screen.queryByRole('radiogroup', { name: 'Photo size' })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('link', { name: /collections/i })).toHaveLength(0);
  });
});

/**
 * The landing page is a curated showcase, not a browsable index — the running order is the point,
 * so it never gets the filter bar however many facets its payload happens to carry.
 *
 * These pair each assertion with the same collection under a different slug, because otherwise a
 * regression that removed the bar everywhere would still pass.
 */
describe('CollectionPageClient — the landing page never gets the filter bar', () => {
  const withSlug = (slug: string): CollectionModel =>
    ({ ...bareCollection([collectionCard(1)]), slug }) as CollectionModel;

  it('suppresses the bar on the home collection even when sections are supplied', () => {
    render(
      <CollectionPageClient
        collection={withSlug(HOME_SLUG)}
        {...ssr}
        sections={SECTIONS}
        activeSectionKey="collections"
      />
    );
    expect(screen.queryByRole('link', { name: /saved/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Photo size' })).not.toBeInTheDocument();
  });

  it('still renders the bar for the same payload under any other slug', () => {
    render(
      <CollectionPageClient
        collection={withSlug('dolomites')}
        {...ssr}
        sections={SECTIONS}
        activeSectionKey="collections"
      />
    );
    expect(screen.getByRole('link', { name: /saved/i })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Photo size' })).toBeInTheDocument();
  });

  // The rule is a property of the home collection, not a caller preference, so the one prop that
  // exists to force the bar on (`/collections` uses it) must not be able to override it.
  it('outranks alwaysShowFilterBar', () => {
    render(<CollectionPageClient collection={withSlug(HOME_SLUG)} {...ssr} alwaysShowFilterBar />);
    expect(screen.queryByRole('radiogroup', { name: 'Photo size' })).not.toBeInTheDocument();
  });

  it('honours alwaysShowFilterBar under any other slug', () => {
    render(
      <CollectionPageClient collection={withSlug('dolomites')} {...ssr} alwaysShowFilterBar />
    );
    expect(screen.getByRole('radiogroup', { name: 'Photo size' })).toBeInTheDocument();
  });
});
