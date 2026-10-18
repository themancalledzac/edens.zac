/**
 * A page can pin the mobile row budget (`mobileChunkSize`) instead of letting the client derive it
 * from `chunkSize`. The home page uses this so phones show two tiles per row while desktop keeps
 * the saved density. These tests pin the forwarding and its one side effect: on a phone the
 * density control is withheld, because there it could only move the desktop layout.
 */
import '@testing-library/jest-dom';

import { render } from '@testing-library/react';

import CollectionPageClient from '@/app/components/ContentCollection/CollectionPageClient';
import { LAYOUT, toMobileDensity } from '@/app/constants';
import type { CollectionModel } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import type { AnyContentModel } from '@/app/types/Content';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => null,
}));

const gridProbe = jest.fn();

/**
 * The real grid's renderers read the filter context through this same hook, so the stub reports
 * it alongside the props to expose whether the density control was offered.
 */
jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => {
  const { useCollectionFilter } = jest.requireActual<{
    useCollectionFilter: () => { onDensityChange?: unknown } | null;
  }>('@/app/components/ContentCollection/CollectionFilterContext');
  const MockGrid = (props: Record<string, unknown>) => {
    gridProbe({ ...props, filter: useCollectionFilter() });
    return null;
  };
  return { __esModule: true, default: MockGrid };
});

const image = {
  id: 10,
  contentType: 'IMAGE',
  orderIndex: 0,
  imageUrl: 'https://cdn.example.com/one.jpg',
  imageWidth: 1600,
  imageHeight: 1000,
  visible: true,
  locations: [],
} as unknown as AnyContentModel;

function makeCollection(): CollectionModel {
  return {
    id: 1,
    slug: 'dolomites',
    title: 'Dolomites',
    isClient: false,
    isBlog: false,
    locations: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    visibility: CollectionVisibility.LISTED,
    content: [image],
  };
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
}

const lastGridProps = () => gridProbe.mock.calls.at(-1)?.[0];

describe('CollectionPageClient — page-pinned mobile row budget', () => {
  beforeEach(() => {
    gridProbe.mockClear();
    setViewportWidth(1280);
  });

  it('derives the mobile budget from the density when nothing is pinned', () => {
    render(<CollectionPageClient collection={makeCollection()} chunkSize={2} />);

    expect(lastGridProps()).toMatchObject({ chunkSize: 2, mobileChunkSize: toMobileDensity(2) });
  });

  it('forwards a pinned mobile budget while desktop keeps the collection density', () => {
    render(
      <CollectionPageClient
        collection={makeCollection()}
        chunkSize={2}
        mobileChunkSize={LAYOUT.homeMobileChunkSize}
      />
    );

    expect(lastGridProps()).toMatchObject({
      chunkSize: 2,
      mobileChunkSize: LAYOUT.homeMobileChunkSize,
    });
  });

  it('withholds the density control on a phone while pinned, and keeps it on desktop', () => {
    setViewportWidth(375);
    render(
      <CollectionPageClient
        collection={makeCollection()}
        chunkSize={2}
        mobileChunkSize={2}
        alwaysShowFilterBar
      />
    );
    expect(lastGridProps().filter?.onDensityChange).toBeUndefined();

    gridProbe.mockClear();
    setViewportWidth(1280);
    render(
      <CollectionPageClient
        collection={makeCollection()}
        chunkSize={2}
        mobileChunkSize={2}
        alwaysShowFilterBar
      />
    );
    expect(typeof lastGridProps().filter?.onDensityChange).toBe('function');
  });

  it('keeps the density control on a phone when nothing is pinned', () => {
    setViewportWidth(375);
    render(
      <CollectionPageClient collection={makeCollection()} chunkSize={2} alwaysShowFilterBar />
    );

    expect(typeof lastGridProps().filter?.onDensityChange).toBe('function');
  });
});
