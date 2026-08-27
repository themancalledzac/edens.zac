/** @jest-environment node */
/**
 * `loadUserSpace('self', activeKey)` — which reads run, and on which tab.
 *
 * The collection catalog (`getAllCollections(0, 500)`) is the one read that serves a single
 * section and the only expensive one, and `/user` is `force-dynamic`, so it was paid again on
 * every tab switch to render three tabs that never look at it. It is now requested only on the
 * Following tab.
 *
 * Deferring a read is only safe if nothing downstream quietly reinterprets its absence, and here
 * exactly one thing could: the Following chip's badge. It reads the follows ID LIST, not the
 * hydrated blocks — derive it from `content.length` instead and a deferred tab silently badges 0,
 * which the chip presents as "you follow nothing" on a page that simply did not fetch. That pair
 * (skipped read / intact count) is the contract, and it is asserted on both the tabs that skip and
 * the tab that does not.
 *
 * Scoped to SELF mode. The admin-mode twin lives in `userSpaceData.test.ts` alongside the rest of
 * the admin read narrowing; the deferral is shared code but the reads either side of it are not,
 * so "the owner's own page defers it too" is not implied by the admin case.
 */

jest.mock('@/app/lib/api/collections', () => ({ getAllCollections: jest.fn() }));
jest.mock('@/app/lib/api/personal', () => ({
  getUserPage: jest.fn(),
  listSavedImagesServer: jest.fn(),
  listFollowedCollectionIdsServer: jest.fn(),
}));
jest.mock('@/app/lib/api/users', () => ({
  getUserPageById: jest.fn(),
  listSavedImagesByUserServer: jest.fn(),
  listFollowedCollectionIdsByUserServer: jest.fn(),
}));

import { loadUserSpace, type TabKey } from '@/app/components/UserSpace/userSpaceData';
import { getAllCollections } from '@/app/lib/api/collections';
import {
  getUserPage,
  listFollowedCollectionIdsServer,
  listSavedImagesServer,
} from '@/app/lib/api/personal';

const mockCatalog = getAllCollections as jest.Mock;
const mockGetUserPage = getUserPage as jest.Mock;
const mockSaved = listSavedImagesServer as jest.Mock;
const mockFollows = listFollowedCollectionIdsServer as jest.Mock;

const userPage = { slug: 'user', title: 'Your Space', content: [] };

/** Tabs that render nothing out of the catalog, so must never pay for it. */
const DEFERRED_TABS: TabKey[] = ['collections', 'images', 'saved'];

/**
 * Seeded NON-empty on purpose. A catalog that resolved to `[]` would let an un-deferred read pass
 * every "the section was not hydrated" assertion below by accident; with real rows in it, an empty
 * `content` can only mean the read never happened.
 */
const CATALOG = [
  { id: 7, slug: 'seven', title: 'Seven' },
  { id: 9, slug: 'nine', title: 'Nine' },
  { id: 11, slug: 'eleven', title: 'Eleven' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockCatalog.mockResolvedValue(CATALOG);
  mockGetUserPage.mockResolvedValue(userPage);
  mockSaved.mockResolvedValue({ ok: true, items: [] });
  mockFollows.mockResolvedValue({ ok: true, items: [] });
});

describe('loadUserSpace(self) — the catalog read is deferred to the tab that renders it', () => {
  it.each(DEFERRED_TABS)('skips the catalog on the %s tab', async tab => {
    mockFollows.mockResolvedValue({ ok: true, items: [7, 9] });

    await loadUserSpace('self', tab);

    expect(mockCatalog).not.toHaveBeenCalled();
  });

  it('reads the catalog on the Following tab, one page of 500', async () => {
    mockFollows.mockResolvedValue({ ok: true, items: [7] });

    await loadUserSpace('self', 'following');

    expect(mockCatalog).toHaveBeenCalledTimes(1);
    expect(mockCatalog).toHaveBeenCalledWith(0, 500);
  });

  // The default matters on its own: `/user` with no `?tab=` resolves to Collections, and a default
  // that fell through to the catalog would undo the deferral for the most-visited entry point.
  it('skips the catalog when the caller names no tab at all', async () => {
    await loadUserSpace('self');

    expect(mockCatalog).not.toHaveBeenCalled();
  });

  /**
   * The control on the other side of the ledger: only the catalog moved. The page read and both
   * personal reads still run on every tab, because all three feed something every tab shows —
   * the header, and the four chips' counts.
   */
  it.each([...DEFERRED_TABS, 'following' as TabKey])(
    'still runs the page, saves and follows reads on the %s tab',
    async tab => {
      await loadUserSpace('self', tab);

      expect(mockGetUserPage).toHaveBeenCalledTimes(1);
      expect(mockSaved).toHaveBeenCalledTimes(1);
      expect(mockFollows).toHaveBeenCalledTimes(1);
    }
  );
});

/**
 * What the deferral must not cost. Every chip keeps a true badge on every tab, because each count
 * comes from a read that still runs — never from the section's own (deliberately un-hydrated)
 * `content` array.
 */
describe('loadUserSpace(self) — a deferred section still reports a true count', () => {
  it.each(DEFERRED_TABS)(
    'counts followed collections on the %s tab without fetching them',
    async tab => {
      mockFollows.mockResolvedValue({ ok: true, items: [7, 9, 11] });

      const data = await loadUserSpace('self', tab);

      expect(data?.sections.following.count).toBe(3);
      expect(data?.sections.following.content).toEqual([]);
    }
  );

  it('hydrates the same section into blocks once the tab is the active one', async () => {
    mockFollows.mockResolvedValue({ ok: true, items: [7, 11] });

    const data = await loadUserSpace('self', 'following');

    // 9 is in the catalog but not followed, so hydrating is a filter over the catalog rather than
    // a copy of it — which is also what makes the catalog the expensive part of this tab.
    expect(data?.sections.following.content.map(block => block.id)).toEqual([7, 11]);
  });

  /**
   * And the count stays the honest one even there: 11 is followed but absent from the catalog page
   * (deleted, or past row 500), so the tab draws two tiles while the badge says three. The badge
   * answers "how many does the backend say you follow", which the tile list cannot.
   */
  it('reports what the backend says is followed, not how many tiles were renderable', async () => {
    mockFollows.mockResolvedValue({ ok: true, items: [7, 9, 404] });

    const data = await loadUserSpace('self', 'following');

    expect(data?.sections.following.content).toHaveLength(2);
    expect(data?.sections.following.count).toBe(3);
  });

  // Unknown outranks un-hydrated: a failed follows read has no number to report on any tab.
  it.each(DEFERRED_TABS)(
    'leaves the count unsaid on the %s tab when the follows read failed',
    async tab => {
      mockFollows.mockResolvedValue({ ok: false, items: [] });

      const data = await loadUserSpace('self', tab);

      expect(data?.sections.following.count).toBeUndefined();
    }
  );

  it('leaves the other three counts intact on a tab that skipped the catalog', async () => {
    mockGetUserPage.mockResolvedValue({
      ...userPage,
      content: [
        { id: 1, contentType: 'COLLECTION', referencedCollectionId: 1, slug: 'one' },
        { id: 2, contentType: 'IMAGE', imageUrl: 'https://cdn/2.jpg' },
        { id: 3, contentType: 'IMAGE', imageUrl: 'https://cdn/3.jpg' },
      ],
    });
    mockSaved.mockResolvedValue({ ok: true, items: [{ id: 4, contentType: 'IMAGE' }] });

    const data = await loadUserSpace('self', 'collections');

    expect(data?.sections.collections.count).toBe(1);
    expect(data?.sections.images.count).toBe(2);
    expect(data?.sections.saved.count).toBe(1);
  });
});
