/**
 * Covers the slug-keyed half of E16: renaming a location recomputes its slug backend-side with no
 * slug-history table, so `/location/{old-slug}` stops resolving while `collections-location-`
 * `${oldSlug}` keeps serving a cached snapshot. `MetadataPageClient` owns that revalidation because
 * `MetadataList` is generic and cannot know it is holding locations.
 *
 * Stubs `collectionEditUtils` wholesale — both revalidate helpers are asserted on here, and neither
 * should reach a real `/api/revalidate`. `PageShell` is stubbed for the usual reason: it pulls
 * `SiteHeader` -> `MenuDropdown` -> `clearCache` -> `next/cache`, which needs a `Request` global
 * jsdom does not provide.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import {
  revalidateLocationCaches,
  revalidateMetadataCache,
} from '@/app/components/ContentCollection/edit/collectionEditUtils';
import { MetadataPageClient } from '@/app/components/MetadataPage/MetadataPageClient';
import * as core from '@/app/lib/api/core';

jest.mock('@/app/lib/api/core');
jest.mock('@/app/components/ui/PageShell/PageShell', () => ({
  PageShell: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('@/app/components/ContentCollection/edit/collectionEditUtils', () => ({
  revalidateLocationCaches: jest.fn(() => Promise.resolve()),
  revalidateMetadataCache: jest.fn(() => Promise.resolve()),
}));

const mockPut = core.fetchAdminPutJsonApi as jest.MockedFunction<typeof core.fetchAdminPutJsonApi>;
const mockDelete = core.fetchAdminDeleteApi as jest.MockedFunction<typeof core.fetchAdminDeleteApi>;
const mockLocationRevalidate = revalidateLocationCaches as jest.MockedFunction<
  typeof revalidateLocationCaches
>;

/** `ContentTagModel` requires `slug`; `ContentPersonModel` has none — people were never slugged. */
const tags = [{ id: 10, name: 'forest', slug: 'forest' }];
const people = [{ id: 20, name: 'Ada' }];
const locations = [{ id: 30, name: 'Seattle', slug: 'seattle' }];

const renderPage = () =>
  render(<MetadataPageClient tags={tags} people={people} locations={locations} />);

/** The location row is the third text input — Tags, People, then Locations. */
const locationInput = () => screen.getAllByRole('textbox')[2]!;

describe('MetadataPageClient slug revalidation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('revalidates BOTH the old and the new slug when a location is renamed', async () => {
    mockPut.mockResolvedValue({ id: 30, name: 'Portland', slug: 'portland' });
    renderPage();

    fireEvent.change(locationInput(), { target: { value: 'Portland' } });
    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() =>
      expect(mockLocationRevalidate).toHaveBeenCalledWith(
        [{ id: 30, name: 'Seattle', slug: 'seattle' }],
        [{ id: 30, name: 'Portland', slug: 'portland' }]
      )
    );
  });

  it('revalidates the stranded slug when a location is deleted', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    mockDelete.mockImplementation(() => Promise.resolve());
    renderPage();

    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[2]!);

    await waitFor(() =>
      expect(mockLocationRevalidate).toHaveBeenCalledWith(
        [{ id: 30, name: 'Seattle', slug: 'seattle' }],
        []
      )
    );
  });

  it('does not touch location caches when a TAG is renamed', async () => {
    mockPut.mockResolvedValue({ id: 10, name: 'woods', slug: 'woods' });
    renderPage();

    fireEvent.change(screen.getAllByRole('textbox')[0]!, { target: { value: 'woods' } });
    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => expect(revalidateMetadataCache).toHaveBeenCalledTimes(1));
    expect(mockLocationRevalidate).not.toHaveBeenCalled();
  });

  it('does not touch location caches when a PERSON is renamed', async () => {
    mockPut.mockResolvedValue({ id: 20, name: 'Grace' });
    renderPage();

    fireEvent.change(screen.getAllByRole('textbox')[1]!, { target: { value: 'Grace' } });
    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => expect(revalidateMetadataCache).toHaveBeenCalledTimes(1));
    expect(mockLocationRevalidate).not.toHaveBeenCalled();
  });

  it('does not revalidate the old slug when the rename fails', async () => {
    mockPut.mockResolvedValue(null);
    renderPage();

    fireEvent.change(locationInput(), { target: { value: 'Portland' } });
    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => expect(screen.getByText("Failed to update 'Seattle'")).toBeInTheDocument());
    expect(mockLocationRevalidate).not.toHaveBeenCalled();
  });
});
