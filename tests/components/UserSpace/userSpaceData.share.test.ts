/**
 * Tests for `loadUserSpace`'s share mode — the recipient view behind a share link.
 *
 * The properties under test are the ones that separate a guest from the owner: which reads run,
 * which sections are offered, and that none of the owner's private bookmark reads are issued on
 * their behalf.
 */

import { loadUserSpace, SHARE_TAB_KEYS } from '@/app/components/UserSpace/userSpaceData';
import * as collectionsApi from '@/app/lib/api/collections';
import * as personalApi from '@/app/lib/api/personal';
import * as shareApi from '@/app/lib/api/share';
import { type CollectionModel } from '@/app/types/Collection';

jest.mock('@/app/lib/api/share');
jest.mock('@/app/lib/api/personal');
jest.mock('@/app/lib/api/user');
jest.mock('@/app/lib/api/users');
jest.mock('@/app/lib/api/collections');

const mockGetShareView = shareApi.getShareView as jest.MockedFunction<typeof shareApi.getShareView>;
const mockGetCurrentShareView = shareApi.getCurrentShareView as jest.MockedFunction<
  typeof shareApi.getCurrentShareView
>;
const mockGetAllCollections = collectionsApi.getAllCollections as jest.MockedFunction<
  typeof collectionsApi.getAllCollections
>;

const page = {
  slug: 'user',
  title: 'Ada',
  content: [
    { id: 1, contentType: 'COLLECTION', title: 'Wedding' },
    { id: 2, contentType: 'IMAGE', imageUrl: 'https://cdn/2.jpg' },
  ],
} as unknown as CollectionModel;

describe('loadUserSpace — share mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllCollections.mockResolvedValue([]);
  });

  it('resolves the view from the token on first landing', async () => {
    mockGetShareView.mockResolvedValue({ ownerName: 'Ada', page });

    const data = await loadUserSpace({ mode: 'share', token: 'tok-123' });

    expect(mockGetShareView).toHaveBeenCalledWith('tok-123');
    expect(mockGetCurrentShareView).not.toHaveBeenCalled();
    expect(data?.ownerName).toBe('Ada');
    expect(data?.collection.slug).toBe('user');
  });

  it('falls back to the cookie when no token is given', async () => {
    mockGetCurrentShareView.mockResolvedValue({ ownerName: 'Ada', page });

    await loadUserSpace({ mode: 'share' });

    expect(mockGetCurrentShareView).toHaveBeenCalled();
    expect(mockGetShareView).not.toHaveBeenCalled();
  });

  it('offers only Collections and Images', async () => {
    mockGetShareView.mockResolvedValue({ ownerName: 'Ada', page });

    const data = await loadUserSpace({ mode: 'share', token: 'tok-123' });

    // Saved and Following are the owner's private bookmarks. Rendering them empty would assert
    // the owner has none, which is not what the recipient view tells us.
    expect(data?.visibleKeys).toEqual(SHARE_TAB_KEYS);
    expect(data?.visibleKeys).not.toContain('saved');
    expect(data?.visibleKeys).not.toContain('following');
  });

  it('issues none of the owner-scoped bookmark reads', async () => {
    mockGetShareView.mockResolvedValue({ ownerName: 'Ada', page });

    const data = await loadUserSpace({ mode: 'share', token: 'tok-123' });

    expect(personalApi.listSavedImagesServer).not.toHaveBeenCalled();
    expect(personalApi.listFollowedCollectionIdsServer).not.toHaveBeenCalled();
    // Nothing here is the recipient's to have saved or followed, so the toggles seed empty.
    expect(data?.savedImageIds).toEqual([]);
    expect(data?.followedCollectionIds).toEqual([]);
  });

  it('skips the collection catalog even on the following tab', async () => {
    mockGetShareView.mockResolvedValue({ ownerName: 'Ada', page });

    await loadUserSpace({ mode: 'share', token: 'tok-123' }, 'following');

    // A ~0.5s read serving a tab the recipient cannot reach.
    expect(mockGetAllCollections).not.toHaveBeenCalled();
  });

  it('returns null for a dead link so the page can 404', async () => {
    mockGetShareView.mockResolvedValue(null);

    expect(await loadUserSpace({ mode: 'share', token: 'gone' })).toBeNull();
  });
});
