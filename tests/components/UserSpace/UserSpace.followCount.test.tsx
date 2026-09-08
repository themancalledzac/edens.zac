/**
 * The Collections badge and tile list have to track the viewer's live follow state.
 *
 * Three facts about `/user` put them and the follow toggle on opposite sides of a boundary: the
 * list is assembled server-side (`userSpaceData`), the toggle is a client-only optimistic
 * `useState` in `FollowsProvider`, and nothing between them re-renders the server. So unfollowing
 * flipped the button and left both the badge and the tile until the next server render.
 *
 * These tests drive the real `FollowsProvider` through the real `FollowButton` and read what
 * `UserSpace` hands the collection stack, so they fail on the un-fixed component rather than on a
 * stub of it.
 *
 * The count is a union of ID SETS, never a tile count. A followed collection that was deleted, or
 * that falls outside the 500-row catalog page, counts without being renderable, so asserting
 * against tile counts would lock in the opposite meaning. Tiles are asserted separately, and only
 * for the pruning they undergo.
 */

import '@testing-library/jest-dom';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { FollowButton } from '@/app/components/Personal/FollowButton';
import { UserSpace } from '@/app/components/UserSpace/UserSpace';
import {
  TAB_KEYS,
  type TabKey,
  type UserSpaceData,
} from '@/app/components/UserSpace/userSpaceData';
import { addFollow, removeFollow } from '@/app/lib/api/personal';
import { type MeResponse } from '@/app/types/Auth';

jest.mock('@/app/lib/api/personal', () => ({
  addFollow: jest.fn(),
  removeFollow: jest.fn(),
}));

jest.mock('@/app/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

/**
 * Stands in for the shared collection stack: publishes every section's badge, the collection ids
 * still on screen, and whether the follow set reached the toolbar. `railExtras` renders so the test
 * can put real FollowButtons inside the provider — that prop is the ordinary way page-level content
 * reaches the inside of the grid, and `/user` already uses it for the Account and Admin cards.
 */
jest.mock('@/app/components/ContentCollection/CollectionPageClient', () => {
  const MockGrid = ({
    sections,
    collection,
    followedCollectionIds,
    railExtras,
  }: {
    sections?: readonly { key: string; label: string; count?: number }[];
    collection?: { content?: { contentType?: string; referencedCollectionId?: number }[] };
    followedCollectionIds?: ReadonlySet<number>;
    railExtras?: unknown;
  }) => (
    <div>
      {(sections ?? []).map(section => (
        <span key={section.key} data-testid={`count-${section.key}`}>
          {section.count === undefined ? 'unknown' : String(section.count)}
        </span>
      ))}
      <span data-testid="tiles">
        {(collection?.content ?? [])
          .filter(block => block.contentType === 'COLLECTION')
          .map(block => String(block.referencedCollectionId))
          .join(',')}
      </span>
      <span data-testid="follow-set">
        {followedCollectionIds === undefined
          ? 'absent'
          : [...followedCollectionIds].sort((a, b) => a - b).join(',')}
      </span>
      {railExtras as never}
    </div>
  );

  return { __esModule: true, default: MockGrid };
});

const principal: MeResponse = {
  email: 'c@x.com',
  isAdmin: true,
  mfaSatisfied: true,
  galleries: [],
};

const imageBlock = (id: number) => ({
  id,
  contentType: 'IMAGE',
  imageUrl: `https://cdn/${id}.jpg`,
});

/**
 * A collection block whose own `id` differs from the collection it references, which is how a
 * granted block arrives — `id` is the content-table row id.
 */
const grantedBlock = (blockId: number, collectionId: number) => ({
  id: blockId,
  contentType: 'COLLECTION',
  referencedCollectionId: collectionId,
  slug: `c-${collectionId}`,
});

/** A followed block as `toCollectionBlocks` builds it, with both ids set to the collection id. */
const followedBlock = (collectionId: number) => ({
  id: collectionId,
  contentType: 'COLLECTION',
  referencedCollectionId: collectionId,
  slug: `c-${collectionId}`,
});

/**
 * Collection 7 is granted AND followed, 20 is granted only, 9 is followed only. That spread is what
 * makes the union non-trivial: the count is 3, not the 4 that adding the two sources would give.
 */
function makeData(overrides: Partial<UserSpaceData> = {}): UserSpaceData {
  return {
    collection: {
      slug: 'user',
      title: 'Your Space',
      content: [],
    } as unknown as UserSpaceData['collection'],
    sections: {
      collections: {
        label: 'Collections',
        content: [
          grantedBlock(100, 7),
          grantedBlock(101, 20),
          followedBlock(9),
        ] as UserSpaceData['sections']['collections']['content'],
        count: 3,
        emptyLabel: 'No collections yet.',
      },
      images: {
        label: 'Images',
        content: [imageBlock(1)] as UserSpaceData['sections']['images']['content'],
        count: 1,
        emptyLabel: 'none',
      },
      saved: { label: 'Saved', content: [], count: 4, emptyLabel: 'none' },
    },
    followedCollectionIds: [7, 9],
    savedImageIds: [3],
    grantedCollectionIds: [7, 20],
    visibleKeys: TAB_KEYS,
    ownerName: null,
    ...overrides,
  };
}

const collectionsCount = () => screen.getByTestId('count-collections').textContent;
const tiles = () => screen.getByTestId('tiles').textContent;

const clickFollowToggle = (collectionId: 7 | 9 | 11) =>
  fireEvent.click(within(screen.getByTestId(`follow-${collectionId}`)).getByRole('button'));

/**
 * `7` and `9` are followed on the server and `11` is not, so one fixture drives every direction.
 * All three are the real {@link FollowButton}, which self-gates on a mounted provider — the same
 * gate that makes them disappear in admin and share mode.
 */
const followToggles = (
  <>
    <span data-testid="follow-7">
      <FollowButton collectionId={7} />
    </span>
    <span data-testid="follow-9">
      <FollowButton collectionId={9} />
    </span>
    <span data-testid="follow-11">
      <FollowButton collectionId={11} />
    </span>
  </>
);

function renderSpace(data: UserSpaceData = makeData(), me: MeResponse | null = principal) {
  const activeKey: TabKey = 'collections';
  render(
    <UserSpace
      data={data}
      activeKey={activeKey}
      basePath="/user"
      me={me}
      ssrViewport={null}
      railExtras={followToggles}
    />
  );
}

beforeEach(() => {
  (addFollow as jest.Mock).mockReset();
  (removeFollow as jest.Mock).mockReset();
  (addFollow as jest.Mock).mockImplementation(() => Promise.resolve());
  (removeFollow as jest.Mock).mockImplementation(() => Promise.resolve());
});

describe('UserSpace — the Collections count follows client state', () => {
  it('decrements when the viewer unfollows a collection held only by following', async () => {
    renderSpace();
    expect(collectionsCount()).toBe('3');

    clickFollowToggle(9);

    await waitFor(() => expect(collectionsCount()).toBe('2'));
    expect(removeFollow).toHaveBeenCalledWith(9);
  });

  /**
   * The case a delta-based count gets wrong. Collection 7 is also admin-granted, so unfollowing it
   * removes one association out of two and the collection stays associated. Subtracting one per
   * unfollow would report 2 for a list that still holds 3.
   */
  it('holds steady when the unfollowed collection is also admin-granted', async () => {
    renderSpace();
    expect(collectionsCount()).toBe('3');

    clickFollowToggle(7);

    await waitFor(() => expect(removeFollow).toHaveBeenCalledWith(7));
    expect(collectionsCount()).toBe('3');
  });

  it('increments when the viewer follows a collection', async () => {
    renderSpace();
    expect(collectionsCount()).toBe('3');

    clickFollowToggle(11);

    await waitFor(() => expect(collectionsCount()).toBe('4'));
    expect(addFollow).toHaveBeenCalledWith(11);
  });

  it('nets out to the server count when the viewer unfollows then re-follows', async () => {
    renderSpace();

    clickFollowToggle(9);
    await waitFor(() => expect(collectionsCount()).toBe('2'));

    clickFollowToggle(9);
    await waitFor(() => expect(collectionsCount()).toBe('3'));
  });

  it('leaves every other section count alone', () => {
    renderSpace();

    clickFollowToggle(9);

    expect(screen.getByTestId('count-images')).toHaveTextContent('1');
    expect(screen.getByTestId('count-saved')).toHaveTextContent('4');
  });
});

/**
 * The tiles move with the count. A server-assembled list cannot drop an unfollowed tile on its own,
 * and on a `force-dynamic` page the next server render is the next navigation.
 */
describe('UserSpace — unfollowing prunes the tile it removed the association for', () => {
  it('drops a tile the viewer held only by following', async () => {
    renderSpace();
    expect(tiles()).toBe('7,20,9');

    clickFollowToggle(9);

    await waitFor(() => expect(tiles()).toBe('7,20'));
  });

  it('keeps a tile that is still admin-granted', async () => {
    renderSpace();

    clickFollowToggle(7);

    await waitFor(() => expect(removeFollow).toHaveBeenCalledWith(7));
    expect(tiles()).toBe('7,20,9');
  });

  /**
   * Following something new cannot add a tile: this render has no block for it. The count moves and
   * the tile arrives when the server next assembles the list.
   */
  it('adds no tile when the viewer follows a collection not on the page', async () => {
    renderSpace();

    clickFollowToggle(11);

    await waitFor(() => expect(collectionsCount()).toBe('4'));
    expect(tiles()).toBe('7,20,9');
  });
});

/**
 * The rollback branch. `FollowsProvider` restores the id when the persist rejects, so anything
 * derived from that Set has to come back with it — an optimistic count that survived a failed write
 * would be a number the backend never agreed to.
 */
describe('UserSpace — the Collections count follows a rollback', () => {
  it('restores the count when an unfollow fails to persist', async () => {
    (removeFollow as jest.Mock).mockRejectedValue(new Error('nope'));
    renderSpace();

    clickFollowToggle(9);
    expect(collectionsCount()).toBe('2');

    await waitFor(() => expect(collectionsCount()).toBe('3'));
  });

  it('restores the pruned tile when an unfollow fails to persist', async () => {
    (removeFollow as jest.Mock).mockRejectedValue(new Error('nope'));
    renderSpace();

    clickFollowToggle(9);
    expect(tiles()).toBe('7,20');

    await waitFor(() => expect(tiles()).toBe('7,20,9'));
  });

  it('restores the count when a follow fails to persist', async () => {
    (addFollow as jest.Mock).mockRejectedValue(new Error('nope'));
    renderSpace();

    clickFollowToggle(11);
    expect(collectionsCount()).toBe('4');

    await waitFor(() => expect(collectionsCount()).toBe('3'));
  });
});

/**
 * The follow set is what arms the toolbar's Following filter, so it has to reach the collection
 * stack and has to be the LIVE set — a filter reading the server list would keep showing a tile the
 * viewer just unfollowed.
 */
describe('UserSpace — the follow set reaches the collection stack', () => {
  it('passes the live set down', () => {
    renderSpace();

    expect(screen.getByTestId('follow-set')).toHaveTextContent('7,9');
  });

  it('updates the set when the viewer unfollows', async () => {
    renderSpace();

    clickFollowToggle(9);

    await waitFor(() => expect(screen.getByTestId('follow-set')).toHaveTextContent('7'));
  });

  it('withholds the set when no provider is mounted', () => {
    renderSpace(makeData(), null);

    expect(screen.getByTestId('follow-set')).toHaveTextContent('absent');
  });
});

/**
 * Admin and share mode mount no `FollowsProvider` (see the UserSpace docblock), so there is no
 * client follow state to reconcile against and the server render must pass through untouched.
 */
describe('UserSpace — with no provider mounted', () => {
  it('renders the server count and tiles verbatim', () => {
    renderSpace(makeData(), null);

    expect(collectionsCount()).toBe('3');
    expect(tiles()).toBe('7,20,9');
    expect(within(screen.getByTestId('follow-7')).queryByRole('button')).toBeNull();
  });
});
