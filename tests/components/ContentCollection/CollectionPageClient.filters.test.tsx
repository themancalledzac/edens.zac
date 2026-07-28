/**
 * D7: image-derived filter dimensions (camera / lens / lens-type / highly-rated) must be shown
 * whenever the page has any images at all — not gated on a collections-vs-images head count that
 * flips with one content edit under mixed content.
 */
import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';

import CollectionPageClient from '@/app/components/ContentCollection/CollectionPageClient';
import type { CollectionModel } from '@/app/types/Collection';
import type { AnyContentModel } from '@/app/types/Content';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/mixed',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () =>
    function DynamicStub() {
      return null;
    },
}));

jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => {
  const { useCollectionFilter } = jest.requireActual<{
    useCollectionFilter: () => {
      filterOptions: {
        cameras: { values: readonly string[] };
        showHighlyRated: boolean;
      };
    } | null;
  }>('@/app/components/ContentCollection/CollectionFilterContext');

  const MockGrid = () => {
    const ctx = useCollectionFilter();
    return (
      <div
        data-testid="grid"
        data-cameras={ctx ? ctx.filterOptions.cameras.values.join(',') : 'NO_CONTEXT'}
        data-highly-rated={ctx ? String(ctx.filterOptions.showHighlyRated) : 'NO_CONTEXT'}
      />
    );
  };
  return { __esModule: true, default: MockGrid };
});

function image(id: number, camera: string, captureDate: string, rating: number): AnyContentModel {
  return {
    id,
    contentType: 'IMAGE',
    orderIndex: id,
    imageUrl: `https://cdn.example/photo-${id}.jpg`,
    imageWidth: 1600,
    imageHeight: 1067,
    locations: [],
    camera: { id, name: camera },
    captureDate,
    rating,
  } as unknown as AnyContentModel;
}

function childRef(id: number): AnyContentModel {
  return {
    id,
    contentType: 'COLLECTION',
    orderIndex: id,
    slug: `child-${id}`,
    referencedCollectionId: id * 10,
  } as unknown as AnyContentModel;
}

/** 3 child collections + 2 images — "collection dominant" under the old head count. */
function makeCollectionDominant(): CollectionModel {
  return {
    id: 42,
    slug: 'mixed',
    title: 'Mixed',
    isClient: false,
    isBlog: false,
    displayMode: 'ORDERED',
    rowsWide: 4,
    locations: [],
    content: [
      childRef(90),
      childRef(91),
      childRef(92),
      image(1, 'Leica M6', '2024-01-01', 5),
      image(2, 'Nikon Z6', '2024-02-02', 0),
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  } as unknown as CollectionModel;
}

/** No images at all — image-derived dimensions must stay hidden. */
function makeImagelessParent(): CollectionModel {
  return {
    ...makeCollectionDominant(),
    content: [childRef(90), childRef(91), childRef(92)],
  } as unknown as CollectionModel;
}

describe('CollectionPageClient — image-derived filters (D7)', () => {
  it('offers the Camera dimension on a page with more collections than images', () => {
    render(<CollectionPageClient collection={makeCollectionDominant()} />);
    expect(screen.getByTestId('grid')).toHaveAttribute('data-cameras', 'Leica M6,Nikon Z6');
  });

  it('offers Highly Rated on a page with more collections than images', () => {
    render(<CollectionPageClient collection={makeCollectionDominant()} />);
    expect(screen.getByTestId('grid')).toHaveAttribute('data-highly-rated', 'true');
  });

  it('still suppresses image-derived dimensions when the page has no images', () => {
    render(<CollectionPageClient collection={makeImagelessParent()} />);
    const grid = screen.getByTestId('grid');
    // No images -> no filterable image dimensions -> the provider value is null.
    expect(grid).toHaveAttribute('data-cameras', 'NO_CONTEXT');
  });
});
