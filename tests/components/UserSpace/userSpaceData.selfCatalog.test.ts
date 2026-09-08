/** @jest-environment node */
/**
 * `loadUserSpace('self', activeKey)` — which reads run, and on which tab.
 *
 * The collection catalog (`getAllCollections(0, 500)`) is the one expensive read, and `/user` is
 * `force-dynamic`, so which tabs pay for it is a real cost. It hydrates the followed half of the
 * Collections list, so it is read on the Collections tab and skipped on the two that render no
 * collections.
 *
 * Collections is the DEFAULT tab, so this costs the common path rather than sparing it — the
 * accepted price of merging Following into Collections, since one list of every association cannot
 * be assembled without the catalog that names the followed half. The tab that used to pay for it is
 * gone; the two that still skip it are what is pinned here.
 *
 * Skipping a read is only safe if nothing downstream reinterprets its absence, and here exactly one
 * thing could: the Collections badge. It counts the UNION of the two ID sets — the granted blocks
 * and the follows list — never the hydrated array. Derive it from `content.length` instead and a
 * tab that skipped the catalog silently badges only the granted half. That pair (skipped read /
 * intact count) is the contract, asserted on both the tabs that skip and the tab that does not.
 *
 * Scoped to SELF mode. The admin-mode twin lives in `userSpaceData.test.ts` alongside the rest of
 * the admin read narrowing; the deferral is shared code but the reads either side of it are not.
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

/** Tabs that render no collections, so must never pay for the catalog. */
const DEFERRED_TABS: TabKey[] = ['images', 'saved'];

const ALL_TABS: TabKey[] = ['collections', 'images', 'saved'];

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

describe('loadUserSpace(self) — the catalog read is scoped to the tab that renders collections', () => {
  it.each(DEFERRED_TABS)('skips the catalog on the %s tab', async tab => {
    mockFollows.mockResolvedValue({ ok: true, items: [7, 9] });

    await loadUserSpace('self', tab);

    expect(mockCatalog).not.toHaveBeenCalled();
  });

  it('reads the catalog on the Collections tab, one page of 500', async () => {
    mockFollows.mockResolvedValue({ ok: true, items: [7] });

    await loadUserSpace('self', 'collections');

    expect(mockCatalog).toHaveBeenCalledTimes(1);
    expect(mockCatalog).toHaveBeenCalledWith(0, 500);
  });

  /**
   * The default resolves to Collections, so `/user` with no `?tab=` reads the catalog. This is the
   * cost the merge accepted, pinned so it is a decision on the record rather than a regression
   * someone later "fixes" by deferring a read the default tab needs.
   */
  it('reads the catalog when the caller names no tab at all', async () => {
    await loadUserSpace('self');

    expect(mockCatalog).toHaveBeenCalledTimes(1);
  });

  /**
   * The control on the other side of the ledger: only the catalog is scoped. The page read and both
   * personal reads still run on every tab, because all three feed something every tab shows — the
   * header, and the three chips' counts.
   */
  it.each(ALL_TABS)('still runs the page, saves and follows reads on the %s tab', async tab => {
    await loadUserSpace('self', tab);

    expect(mockGetUserPage).toHaveBeenCalledTimes(1);
    expect(mockSaved).toHaveBeenCalledTimes(1);
    expect(mockFollows).toHaveBeenCalledTimes(1);
  });
});

/**
 * What skipping the catalog must not cost. Every chip keeps a true badge on every tab, because each
 * count comes from a read that still runs — never from the section's own `content` array.
 */
describe('loadUserSpace(self) — a tab that skipped the catalog still reports a true count', () => {
  it.each(DEFERRED_TABS)(
    'counts followed collections on the %s tab without fetching them',
    async tab => {
      mockFollows.mockResolvedValue({ ok: true, items: [7, 9, 11] });

      const data = await loadUserSpace('self', tab);

      expect(data?.sections.collections.count).toBe(3);
      expect(data?.sections.collections.content).toEqual([]);
    }
  );

  /**
   * The union is what the badge counts, so an association held BOTH ways counts once. Granted
   * collection 7 is also followed; the honest total is two, and a count that added the two sources
   * would say three on a tab that cannot show its work.
   */
  it.each(DEFERRED_TABS)('counts an association held both ways once, on the %s tab', async tab => {
    mockGetUserPage.mockResolvedValue({
      ...userPage,
      content: [{ id: 100, contentType: 'COLLECTION', referencedCollectionId: 7, slug: 'seven' }],
    });
    mockFollows.mockResolvedValue({ ok: true, items: [7, 9] });

    const data = await loadUserSpace('self', tab);

    expect(data?.sections.collections.count).toBe(2);
  });

  /**
   * Collection 9 is in the catalog but not followed, so hydrating is a filter over the catalog
   * rather than a copy of it — which is also what makes the catalog the expensive part of this tab.
   */
  it('hydrates the followed half into blocks once Collections is the active tab', async () => {
    mockFollows.mockResolvedValue({ ok: true, items: [7, 11] });

    const data = await loadUserSpace('self', 'collections');

    expect(data?.sections.collections.content.map(block => block.id)).toEqual([7, 11]);
  });

  /**
   * And the count stays the honest one even there: 404 is followed but absent from the catalog page
   * (deleted, or past row 500), so the tab draws two tiles while the badge says three. The badge
   * answers "how many does the backend say you are associated with", which the tile list cannot.
   */
  it('reports what the backend says is associated, not how many tiles were renderable', async () => {
    mockFollows.mockResolvedValue({ ok: true, items: [7, 9, 404] });

    const data = await loadUserSpace('self', 'collections');

    expect(data?.sections.collections.content).toHaveLength(2);
    expect(data?.sections.collections.count).toBe(3);
  });

  /**
   * A failed follows read is a PARTIAL failure here, not a total one — unlike the Following section
   * this replaced, whose count went `undefined`. The granted half still rendered and is still
   * counted; what the section says instead is that the list may be incomplete.
   */
  it.each(ALL_TABS)(
    'still counts the granted half on the %s tab when follows failed',
    async tab => {
      mockGetUserPage.mockResolvedValue({
        ...userPage,
        content: [{ id: 100, contentType: 'COLLECTION', referencedCollectionId: 1, slug: 'one' }],
      });
      mockFollows.mockResolvedValue({ ok: false, items: [] });

      const data = await loadUserSpace('self', tab);

      expect(data?.sections.collections.count).toBe(1);
      expect(data?.sections.collections.unavailableLabel).toContain('may be incomplete');
    }
  );

  it('says nothing about incompleteness when the follows read succeeded', async () => {
    const data = await loadUserSpace('self', 'collections');

    expect(data?.sections.collections.unavailableLabel).toBeUndefined();
  });

  it('leaves the other two counts intact on a tab that skipped the catalog', async () => {
    mockGetUserPage.mockResolvedValue({
      ...userPage,
      content: [
        { id: 1, contentType: 'COLLECTION', referencedCollectionId: 1, slug: 'one' },
        { id: 2, contentType: 'IMAGE', imageUrl: 'https://cdn/2.jpg' },
        { id: 3, contentType: 'IMAGE', imageUrl: 'https://cdn/3.jpg' },
      ],
    });
    mockSaved.mockResolvedValue({ ok: true, items: [{ id: 4, contentType: 'IMAGE' }] });

    const data = await loadUserSpace('self', 'images');

    expect(data?.sections.collections.count).toBe(1);
    expect(data?.sections.images.count).toBe(2);
    expect(data?.sections.saved.count).toBe(1);
  });
});
