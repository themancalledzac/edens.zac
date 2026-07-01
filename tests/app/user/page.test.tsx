/** @jest-environment node */
import { notFound } from 'next/navigation';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
jest.mock('@/app/lib/api/auth', () => ({ meServer: jest.fn() }));
jest.mock('@/app/lib/api/user', () => ({ getUserPage: jest.fn() }));
jest.mock('@/app/lib/api/collections', () => ({ getAllCollections: jest.fn() }));
jest.mock('@/app/lib/api/personal', () => ({
  listSavedImagesServer: jest.fn(),
  listSavedImageIdsServer: jest.fn(),
  listFollowedCollectionIdsServer: jest.fn(),
}));
jest.mock('@/app/components/ContentCollection/CollectionPage', () => ({
  __esModule: true,
  default: ({ collection }: { collection: { slug: string } }) =>
    `CollectionPage:${collection.slug}`,
}));
jest.mock('@/app/components/Personal/SavedImagesGrid', () => ({
  SavedImagesGrid: () => 'SavedImagesGrid',
}));
jest.mock('@/app/components/LocationPage/LocationCollections', () => ({
  __esModule: true,
  default: () => 'LocationCollections',
}));

import { meServer } from '@/app/lib/api/auth';
import { getAllCollections } from '@/app/lib/api/collections';
import {
  listFollowedCollectionIdsServer,
  listSavedImageIdsServer,
  listSavedImagesServer,
} from '@/app/lib/api/personal';
import { getUserPage } from '@/app/lib/api/user';
import UserPage from '@/app/user/page';

const authedPrincipal = { email: 'c@x.com', mfaSatisfied: true, galleries: [] };

function seedApis() {
  (getUserPage as jest.Mock).mockResolvedValue({ slug: 'user', type: 'PARENT', content: [] });
  (listSavedImagesServer as jest.Mock).mockResolvedValue([]);
  (listSavedImageIdsServer as jest.Mock).mockResolvedValue([]);
  (listFollowedCollectionIdsServer as jest.Mock).mockResolvedValue([]);
  (getAllCollections as jest.Mock).mockResolvedValue([]);
}

describe('UserPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls notFound() when anonymous', async () => {
    (meServer as jest.Mock).mockResolvedValue(null);
    await expect(UserPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
    expect(getUserPage).not.toHaveBeenCalled();
  });

  it('renders CollectionPage plus Saved + Following sections when authed', async () => {
    (meServer as jest.Mock).mockResolvedValue(authedPrincipal);
    seedApis();
    const result = await UserPage();
    expect(result).toBeTruthy();
    expect(listSavedImagesServer).toHaveBeenCalled();
    expect(listFollowedCollectionIdsServer).toHaveBeenCalled();
  });

  it('seeds CollectionPage with the viewer saved image ids', async () => {
    (meServer as jest.Mock).mockResolvedValue(authedPrincipal);
    seedApis();
    (listSavedImageIdsServer as jest.Mock).mockResolvedValue([7, 8]);
    const result = await UserPage();
    expect(result).toBeTruthy();
    expect(listSavedImageIdsServer).toHaveBeenCalled();
  });
});
