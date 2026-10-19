/**
 * LocationPage renders the location through the standard CollectionPage pipeline and mounts the
 * follow provider only for a signed-in viewer.
 */

import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import LocationPage from '@/app/components/LocationPage/LocationPage';
import { meServer } from '@/app/lib/api/auth';
import { listFollowedCollectionIdsServer, listSavedImageIdsServer } from '@/app/lib/api/personal';
import { type MeResponse } from '@/app/types/Auth';
import { type CollectionModel } from '@/app/types/Collection';
import { resolveSsrViewport } from '@/app/utils/ssrViewport';
import { createCollectionModel, createImageContent } from '@/tests/fixtures/contentFixtures';

jest.mock('@/app/lib/api/auth', () => ({ meServer: jest.fn() }));
jest.mock('@/app/lib/api/personal', () => ({
  listFollowedCollectionIdsServer: jest.fn(),
  listSavedImageIdsServer: jest.fn(),
}));
jest.mock('@/app/utils/ssrViewport', () => ({ resolveSsrViewport: jest.fn() }));

interface CapturedProps {
  collection: CollectionModel;
  me?: MeResponse | null;
  initialSavedImageIds?: number[];
}

const pageProps: CapturedProps[] = [];

function lastPageProps(): CapturedProps {
  const props = pageProps.at(-1);
  if (!props) throw new Error('CollectionPage was not rendered');
  return props;
}

jest.mock('@/app/components/ContentCollection/CollectionPage', () => ({
  __esModule: true,
  default: (props: CapturedProps) => {
    pageProps.push(props);
    return <div data-testid="collection-page" />;
  },
}));
jest.mock('@/app/components/Personal/FollowsContext', () => ({
  FollowsProvider: ({
    children,
    initialFollowedIds,
  }: {
    children: ReactNode;
    initialFollowedIds: number[];
  }) => (
    <div data-testid="follows-provider" data-ids={initialFollowedIds.join(',')}>
      {children}
    </div>
  ),
}));

const props = {
  locationName: 'Seattle, Washington',
  collections: [createCollectionModel(7)],
  images: [createImageContent(11, { rating: 5 }), createImageContent(12)],
};

beforeEach(() => {
  jest.clearAllMocks();
  pageProps.length = 0;
  jest.mocked(resolveSsrViewport).mockResolvedValue({
    contentWidth: 900,
    viewportHeight: 700,
    isMobile: false,
  });
  jest.mocked(listFollowedCollectionIdsServer).mockResolvedValue({ ok: true, items: [7] });
  jest.mocked(listSavedImageIdsServer).mockResolvedValue([12]);
});

describe('LocationPage', () => {
  it('renders the location as a synthetic collection with collections before images', async () => {
    jest.mocked(meServer).mockResolvedValue(null);
    render(await LocationPage(props));

    const { collection } = lastPageProps();
    expect(collection.title).toBe('Seattle, Washington');
    expect(collection.coverImage?.id).toBe(11);
    expect(collection.description).toBe('2 photos');
    expect(collection.collectionDate).toBeUndefined();
    expect(collection.content?.map(item => item.contentType)).toEqual([
      'COLLECTION',
      'IMAGE',
      'IMAGE',
    ]);
  });

  it('seeds follows and saves for a signed-in viewer', async () => {
    const me = { email: 'a@b.c' } as MeResponse;
    jest.mocked(meServer).mockResolvedValue(me);
    render(await LocationPage(props));

    expect(screen.getByTestId('follows-provider')).toHaveAttribute('data-ids', '7');
    expect(lastPageProps().me).toBe(me);
    expect(lastPageProps().initialSavedImageIds).toEqual([12]);
  });

  it('degrades a failed follow read to an empty seed', async () => {
    jest.mocked(meServer).mockResolvedValue({ email: 'a@b.c' } as MeResponse);
    jest.mocked(listFollowedCollectionIdsServer).mockResolvedValue({ ok: false });
    render(await LocationPage(props));

    expect(screen.getByTestId('follows-provider')).toHaveAttribute('data-ids', '');
  });

  it('mounts no follow provider and makes no personal reads for an anonymous viewer', async () => {
    jest.mocked(meServer).mockResolvedValue(null);
    render(await LocationPage(props));

    expect(screen.queryByTestId('follows-provider')).not.toBeInTheDocument();
    expect(screen.getByTestId('collection-page')).toBeInTheDocument();
    expect(lastPageProps().me).toBeNull();
    expect(listFollowedCollectionIdsServer).not.toHaveBeenCalled();
    expect(listSavedImageIdsServer).not.toHaveBeenCalled();
  });
});
