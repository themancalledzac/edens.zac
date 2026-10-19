/**
 * Tests that an unknown location answers 404: the page body must throw `notFound()` before
 * returning JSX, so the status is settled ahead of the page's `<Suspense>` boundary. A known
 * location with no content throws `notFound()` from inside that boundary.
 */

import { isValidElement, type ReactElement, Suspense } from 'react';

import { getCollectionsByLocation } from '@/app/lib/api/collections';
import { getAllLocations, searchImages } from '@/app/lib/api/content';
import { default as LocationPageRoute } from '@/app/location/[slug]/page';

jest.mock('@/app/lib/api/collections', () => ({
  getCollectionsByLocation: jest.fn(),
}));

jest.mock('@/app/lib/api/content', () => ({
  getAllLocations: jest.fn(),
  searchImages: jest.fn(),
}));

jest.mock('@/app/components/ui/PageLoading/PageLoading', () => ({
  PageLoading: () => null,
}));

jest.mock('@/app/components/LocationPage/LocationPage', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

const mockGetAllLocations = getAllLocations as jest.MockedFunction<typeof getAllLocations>;
const mockSearchImages = searchImages as jest.MockedFunction<typeof searchImages>;
const mockGetCollectionsByLocation = getCollectionsByLocation as jest.MockedFunction<
  typeof getCollectionsByLocation
>;

const NOT_FOUND = { digest: expect.stringContaining('NEXT_HTTP_ERROR_FALLBACK;404') };

function pageFor(slug: string) {
  return LocationPageRoute({ params: Promise.resolve({ slug }) });
}

async function contentFor(slug: string) {
  const page = await pageFor(slug);
  expect(page.type).toBe(Suspense);
  const content = page.props.children as ReactElement<Record<string, unknown>>;
  expect(isValidElement(content)).toBe(true);
  const Content = content.type as (props: Record<string, unknown>) => Promise<ReactElement>;
  return Content(content.props);
}

describe('LocationPageRoute — unknown location status', () => {
  beforeEach(() => {
    mockGetAllLocations.mockReset();
    mockSearchImages.mockReset();
    mockGetCollectionsByLocation.mockReset();
    mockGetAllLocations.mockResolvedValue([{ id: 7, name: 'Lisbon', slug: 'lisbon' }]);
  });

  it('throws notFound() when no location matches the slug', async () => {
    await expect(pageFor('no-such-place')).rejects.toMatchObject(NOT_FOUND);
    expect(mockSearchImages).not.toHaveBeenCalled();
  });

  it('throws notFound() when the location has no collections and no images', async () => {
    mockGetCollectionsByLocation.mockResolvedValue([]);
    mockSearchImages.mockResolvedValue([]);

    await expect(contentFor('lisbon')).rejects.toMatchObject(NOT_FOUND);
  });

  it('renders when the location has images', async () => {
    mockGetCollectionsByLocation.mockResolvedValue([]);
    mockSearchImages.mockResolvedValue([{ id: 1 } as Awaited<ReturnType<typeof searchImages>>[0]]);

    await expect(contentFor('lisbon')).resolves.toBeTruthy();
    expect(mockSearchImages).toHaveBeenCalledWith({ locationId: 7 });
  });
});
