/**
 * The Following chip's count has to track the viewer's live follow state.
 *
 * Three facts about `/user` put the count and the follow toggle on opposite sides of a boundary:
 * the count is server-rendered from the followed-id list (`userSpaceData`), the toggle is a
 * client-only optimistic `useState` in `FollowsProvider`, and nothing between them re-renders the
 * server. So unfollowing flipped the button and left the badge showing the old number until the
 * next server render.
 *
 * These tests drive the real `FollowsProvider` through the real `FollowButton` and read the count
 * off the props `UserSpace` hands the collection stack, so they fail on the un-fixed component
 * rather than on a stub of it.
 *
 * What they deliberately do NOT do is count tiles. The server count comes from the followed-id
 * list on purpose — a followed collection that was deleted, or that falls outside the 500-row
 * catalog page, counts without being renderable — so the fix has to be server-count-plus-delta.
 * Asserting against tile counts would lock in the opposite meaning.
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

// Silence the expected rollback error log so it doesn't pollute test output.
jest.mock('@/app/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

/**
 * Stands in for the shared collection stack: publishes every section's badge, and renders
 * `railExtras` so the test can put real FollowButtons inside the provider — that prop is the
 * ordinary way page-level content reaches the inside of the grid, and `/user` already uses it for
 * the Account and Admin cards.
 */
jest.mock('@/app/components/ContentCollection/CollectionPageClient', () => {
  const MockGrid = ({
    sections,
    railExtras,
  }: {
    sections?: readonly { key: string; label: string; count?: number }[];
    railExtras?: unknown;
  }) => (
    <div>
      {(sections ?? []).map(section => (
        <span key={section.key} data-testid={`count-${section.key}`}>
          {section.count === undefined ? 'unknown' : String(section.count)}
        </span>
      ))}
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
 * Two followed ids and a Following count of 2, matching what `loadUserSpace` produces: the count
 * is `followedCollectionIds.length`, and `content` stays empty because only the ACTIVE section is
 * hydrated.
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
        content: [],
        count: 0,
        emptyLabel: 'No collections yet.',
      },
      images: {
        label: 'Images',
        content: [imageBlock(1)] as UserSpaceData['sections']['images']['content'],
        count: 1,
        emptyLabel: 'none',
      },
      saved: { label: 'Saved', content: [], count: 4, emptyLabel: 'none' },
      following: { label: 'Following', content: [], count: 2, emptyLabel: 'none' },
    },
    followedCollectionIds: [7, 9],
    savedImageIds: [3],
    visibleKeys: TAB_KEYS,
    ownerName: null,
    ...overrides,
  };
}

const followingCount = () => screen.getByTestId('count-following').textContent;

const clickFollowToggle = (collectionId: 7 | 11) =>
  fireEvent.click(within(screen.getByTestId(`follow-${collectionId}`)).getByRole('button'));

/**
 * `7` is followed on the server and `11` is not, so one fixture drives both directions. Both
 * buttons are the real {@link FollowButton}, which self-gates on a mounted provider — the same
 * gate that makes them disappear in admin and share mode.
 */
const followToggles = (
  <>
    <span data-testid="follow-7">
      <FollowButton collectionId={7} />
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

describe('UserSpace — the Following chip count follows client state', () => {
  it('decrements when the viewer unfollows a collection', async () => {
    renderSpace();
    expect(followingCount()).toBe('2');

    clickFollowToggle(7);

    await waitFor(() => expect(followingCount()).toBe('1'));
    expect(removeFollow).toHaveBeenCalledWith(7);
  });

  it('increments when the viewer follows a collection', async () => {
    renderSpace();
    expect(followingCount()).toBe('2');

    clickFollowToggle(11);

    await waitFor(() => expect(followingCount()).toBe('3'));
    expect(addFollow).toHaveBeenCalledWith(11);
  });

  it('nets out to the server count when the viewer unfollows then re-follows', async () => {
    renderSpace();

    clickFollowToggle(7);
    await waitFor(() => expect(followingCount()).toBe('1'));

    clickFollowToggle(7);
    await waitFor(() => expect(followingCount()).toBe('2'));
  });

  it('leaves every other section count alone', () => {
    renderSpace();

    clickFollowToggle(7);

    expect(screen.getByTestId('count-collections')).toHaveTextContent('0');
    expect(screen.getByTestId('count-images')).toHaveTextContent('1');
    expect(screen.getByTestId('count-saved')).toHaveTextContent('4');
  });
});

/**
 * The rollback branch. `FollowsProvider` restores the id when the persist rejects, so a count
 * derived from that Set has to come back with it — an optimistic count that survived a failed
 * write would be a number the backend never agreed to.
 */
describe('UserSpace — the Following chip count follows a rollback', () => {
  it('restores the count when an unfollow fails to persist', async () => {
    (removeFollow as jest.Mock).mockRejectedValue(new Error('nope'));
    renderSpace();

    clickFollowToggle(7);
    expect(followingCount()).toBe('1');

    await waitFor(() => expect(followingCount()).toBe('2'));
  });

  it('restores the count when a follow fails to persist', async () => {
    (addFollow as jest.Mock).mockRejectedValue(new Error('nope'));
    renderSpace();

    clickFollowToggle(11);
    expect(followingCount()).toBe('3');

    await waitFor(() => expect(followingCount()).toBe('2'));
  });
});

/**
 * An unknown count stays unknown. A section whose read failed carries no count at all — badging it
 * would assert a number nobody read — and adding a client delta to "unknown" produces another
 * unknown, not a 1.
 */
describe('UserSpace — the Following chip count when the follows read failed', () => {
  const failedFollowingData = () => {
    const base = makeData({ followedCollectionIds: [] });
    return makeData({
      followedCollectionIds: [],
      sections: {
        ...base.sections,
        following: {
          label: 'Following',
          content: [],
          count: undefined,
          emptyLabel: 'none',
          unavailableLabel: 'Your followed collections are unavailable right now.',
        },
      },
    });
  };

  it('says nothing rather than counting from a state nobody read', async () => {
    renderSpace(failedFollowingData());
    expect(followingCount()).toBe('unknown');

    clickFollowToggle(11);

    await waitFor(() => expect(addFollow).toHaveBeenCalledWith(11));
    expect(followingCount()).toBe('unknown');
  });
});

/**
 * Admin and share mode mount no `FollowsProvider` (see the UserSpace docblock), so there is no
 * client follow state to reconcile against and the server count must pass through untouched.
 */
describe('UserSpace — the Following chip count with no provider mounted', () => {
  it('renders the server count verbatim', () => {
    renderSpace(makeData(), null);

    expect(followingCount()).toBe('2');
    expect(within(screen.getByTestId('follow-7')).queryByRole('button')).toBeNull();
  });
});
