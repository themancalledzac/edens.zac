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
    { id: 1, contentType: 'COLLECTION', referencedCollectionId: 11, title: 'Wedding' },
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

  /**
   * Saved is the owner's private bookmark list. Rendering it empty would assert the owner has
   * saved nothing, which is not what the recipient view tells us.
   */
  it('offers only Collections and Images', async () => {
    mockGetShareView.mockResolvedValue({ ownerName: 'Ada', page });

    const data = await loadUserSpace({ mode: 'share', token: 'tok-123' });

    expect(data?.visibleKeys).toEqual(SHARE_TAB_KEYS);
    expect(data?.visibleKeys).not.toContain('saved');
  });

  it('issues none of the owner-scoped bookmark reads', async () => {
    mockGetShareView.mockResolvedValue({ ownerName: 'Ada', page });

    const data = await loadUserSpace({ mode: 'share', token: 'tok-123' });

    expect(personalApi.listSavedImagesServer).not.toHaveBeenCalled();
    expect(personalApi.listFollowedCollectionIdsServer).not.toHaveBeenCalled();
    expect(data?.savedImageIds).toEqual([]);
    expect(data?.followedCollectionIds).toEqual([]);
  });

  /**
   * A recipient has no follow state, so the followed half of the Collections list is always empty
   * for them and the catalog that would hydrate it is never worth its ~0.5s. Collections is the
   * one tab that reads it in every other mode, which makes it the case worth pinning.
   */
  it('skips the collection catalog even on the Collections tab', async () => {
    mockGetShareView.mockResolvedValue({ ownerName: 'Ada', page });

    await loadUserSpace({ mode: 'share', token: 'tok-123' }, 'collections');

    expect(mockGetAllCollections).not.toHaveBeenCalled();
  });

  /**
   * A recipient's Collections list is the granted half alone. There is no follows read to fail, so
   * the section never carries the "may be incomplete" copy the other two modes can.
   */
  it('renders the granted half alone, with nothing said about incompleteness', async () => {
    mockGetShareView.mockResolvedValue({ ownerName: 'Ada', page });

    const data = await loadUserSpace({ mode: 'share', token: 'tok-123' }, 'collections');

    expect(data?.sections.collections.content).toHaveLength(1);
    expect(data?.sections.collections.count).toBe(1);
    expect(data?.sections.collections.unavailableLabel).toBeUndefined();
    expect(data?.grantedCollectionIds).toEqual([11]);
  });

  it('returns null for a dead link so the page can 404', async () => {
    mockGetShareView.mockResolvedValue(null);

    expect(await loadUserSpace({ mode: 'share', token: 'gone' })).toBeNull();
  });
});
