/** @jest-environment node */

jest.mock('@/app/components/ContentCollection/CollectionPageClient', () => ({
  __esModule: true,
  default: () => 'CollectionPageClient',
}));
jest.mock('@/app/components/Personal/FollowsContext', () => ({
  FollowsProvider: () => 'FollowsProvider',
}));

import { FollowsProvider } from '@/app/components/Personal/FollowsContext';
import { FormError } from '@/app/components/ui/Field/FormError';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { UserSpace } from '@/app/components/UserSpace/UserSpace';
import {
  TAB_KEYS,
  type TabKey,
  type UserSpaceData,
} from '@/app/components/UserSpace/userSpaceData';
import { UserSpaceGrid } from '@/app/components/UserSpace/UserSpaceGrid';
import { type MeResponse } from '@/app/types/Auth';

/**
 * These assertions read the props off `UserSpaceGrid`, not `CollectionPageClient`.
 *
 * `UserSpaceGrid` is the client boundary `UserSpace` renders the grid through — it re-derives the
 * Collections chip's count from live follow state and supplies the set that arms the toolbar's
 * Following filter, forwarding everything else to `CollectionPageClient` verbatim. This file walks
 * the element tree without rendering it, so the first component it can read is that boundary.
 * `UserSpace.followCount.test.tsx` renders for real and covers what arrives at the other side.
 */

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

const collectionBlock = (id: number) => ({
  id,
  contentType: 'COLLECTION',
  referencedCollectionId: id,
  slug: `collection-${id}`,
  title: `Collection ${id}`,
});

/**
 * Mirrors the real payload: `UserPageAssembler` builds this collection with no `id`, `isClient` or
 * `isPasswordProtected` — it is assembled, not a `collection` row — so the fixture cannot satisfy
 * `CollectionModel`'s declared shape without inventing exactly the fields whose absence is what
 * keeps the client-gallery affordances off. See the invariant note in `UserSpace`'s docblock.
 *
 * Two sections badge a number their `content` does not support, which is why `count` is a field of
 * its own. Collections says 3 over 2 tiles — id 9 is followed but outside the catalog page the
 * server hydrated from — and Saved says 2 over none, because only the active section is hydrated.
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
          collectionBlock(101),
          collectionBlock(7),
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
      saved: {
        label: 'Saved',
        content: [],
        count: 2,
        emptyLabel: 'This user has not saved any images yet.',
      },
    },
    followedCollectionIds: [7, 9],
    savedImageIds: [3],
    grantedCollectionIds: [101],
    visibleKeys: TAB_KEYS,
    ownerName: null,
    ...overrides,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findProps(node: any, type: unknown): any {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findProps(child, type);
      if (found) return found;
    }
    return null;
  }
  if (node.type === type) return node.props;
  return node.props?.children ? findProps(node.props.children, type) : null;
}

const render = (me: MeResponse | null, activeKey: TabKey = 'collections', basePath = '/user') =>
  UserSpace({ data: makeData(), activeKey, basePath, me, ssrViewport: null });

describe('UserSpace — own space (me present)', () => {
  it('mounts FollowsProvider seeded with the followed ids', () => {
    const provider = findProps(render(principal), FollowsProvider);
    expect(provider).not.toBeNull();
    expect(provider.initialFollowedIds).toEqual([7, 9]);
  });

  it('hands the principal to the collection stack', () => {
    expect(findProps(render(principal), UserSpaceGrid).me).toBe(principal);
  });
});

/**
 * The load-bearing pair. Every personal-action control in the collection stack gates on the
 * PRESENCE of a principal, never on ownership — SaveHeart returns null unless `useMe()` is truthy,
 * FollowButton needs a mounted FollowsProvider, and `showCoverUpdateShortcut` gates on
 * `me?.isAdmin`. Their writes are session-bound, so leaving them armed while rendering someone
 * else's space would silently mutate the ADMIN's own saves and follows.
 */
describe('UserSpace — admin observing another user (me null)', () => {
  it('does NOT mount FollowsProvider, so the follow toggle cannot render', () => {
    expect(findProps(render(null), FollowsProvider)).toBeNull();
  });

  it('passes me=null down, which disarms SaveHeart and the cover-manage shortcut', () => {
    expect(findProps(render(null), UserSpaceGrid).me).toBeNull();
  });

  it('still renders the grid itself — the space is visible, only its controls are off', () => {
    expect(findProps(render(null), UserSpaceGrid)).not.toBeNull();
  });

  it('seeds no saved ids, so none of the target’s state leaks into admin providers', () => {
    const data = makeData({ savedImageIds: [], followedCollectionIds: [] });
    const result = UserSpace({
      data,
      activeKey: 'collections',
      basePath: '/admin/users/5',
      me: null,
      ssrViewport: null,
    });
    expect(findProps(result, UserSpaceGrid).initialSavedImageIds).toEqual([]);
  });
});

/**
 * Three chips, not four. Following stopped being a section: Collections is now one list of every
 * collection the viewer is associated with — the ones an admin granted and the ones they followed
 * themselves — and narrowing to the followed half is a filter chip in the toolbar instead.
 *
 * The Collections badge is where the old Following chip's number went. It reads 3 over 2 tiles and
 * Saved reads 2 over none, so a badge derived from `content.length` would report the followed
 * collection the catalog missed as gone and claim the user has saved nothing.
 *
 * `grantedCollectionIds` travels beside the chips because `UserSpaceGrid` needs it to tell the
 * granted half from the followed half when the viewer unfollows one.
 */
describe('UserSpace — section chips', () => {
  it('builds every chip href from basePath so admin chips stay on the admin route', () => {
    const props = findProps(render(null, 'collections', '/admin/users/5'), UserSpaceGrid);
    expect(props.sections.map((s: { href: string }) => s.href)).toEqual([
      '/admin/users/5?tab=collections',
      '/admin/users/5?tab=images',
      '/admin/users/5?tab=saved',
    ]);
  });

  it('counts every section from its own count, hydrated or not', () => {
    const props = findProps(render(principal), UserSpaceGrid);
    expect(props.sections.map((s: { key: string; count: number }) => [s.key, s.count])).toEqual([
      ['collections', 3],
      ['images', 1],
      ['saved', 2],
    ]);
  });

  it('badges Collections with the union count and forwards the granted ids beside it', () => {
    const props = findProps(render(principal), UserSpaceGrid);
    const collections = props.sections.find((s: { key: string }) => s.key === 'collections');

    expect(collections.count).toBe(3);
    expect(props.grantedCollectionIds).toEqual([101]);
  });

  it('marks the active section', () => {
    expect(findProps(render(principal, 'saved'), UserSpaceGrid).activeSectionKey).toBe('saved');
  });

  it('renders only the active section’s blocks', () => {
    const props = findProps(render(principal, 'images'), UserSpaceGrid);
    expect(props.collection.content).toHaveLength(1);
  });
});

/**
 * Page-level rail content — `/user`'s Account and Admin cards, the admin view-as note — belongs in
 * the collection header rail beside the cover, not in a slab below the grid. `UserSpace` only
 * forwards it.
 */
describe('UserSpace — rail extras', () => {
  it('forwards railExtras to the collection stack', () => {
    const extras = <p>rail content</p>;
    const result = UserSpace({
      data: makeData(),
      activeKey: 'collections',
      basePath: '/user',
      me: principal,
      ssrViewport: null,
      railExtras: extras,
    });
    expect(findProps(result, UserSpaceGrid).railExtras).toBe(extras);
  });

  it('defaults to no extras when the page supplies none', () => {
    expect(findProps(render(principal), UserSpaceGrid).railExtras).toBeNull();
  });
});

/**
 * `EmptyState`'s docblock forbids it for a failed read: it asserts there is nothing here, which is
 * a claim about data that nobody managed to read. A section whose read failed carries
 * `unavailableLabel`, checked ahead of the empty state — the same ordering `UserForm` uses for its
 * unknown role membership, and the same `FormError` channel, so failure never wears the muted
 * empty-state styling.
 *
 * Its chip drops its count for the same reason: a `0` badge is that claim in miniature, sitting
 * inches from copy saying the number is unknown. `ToolbarSection.count` is optional so an unknown
 * count can be left unsaid, and `FilterChip` then renders the bare label.
 */
describe('UserSpace — a section whose read failed', () => {
  /**
   * The failed Saved section keeps a `count` of 0 so the assertions below prove the badge is
   * dropped because the read failed, not merely because no count was supplied.
   */
  const withFailedSaved = (unavailableLabel?: string) =>
    UserSpace({
      data: makeData({
        sections: {
          ...makeData().sections,
          saved: {
            label: 'Saved',
            content: [],
            count: 0,
            emptyLabel: 'This user has not saved any images yet.',
            unavailableLabel,
          },
        },
      }),
      activeKey: 'saved',
      basePath: '/admin/users/5',
      me: null,
      ssrViewport: null,
    });

  it('says the section is unavailable rather than claiming the user has nothing', () => {
    const props = findProps(withFailedSaved('Saved images are unavailable right now.'), FormError);

    expect(props.children).toBe('Saved images are unavailable right now.');
  });

  it('renders no EmptyState for that section, so the false claim never appears', () => {
    expect(
      findProps(withFailedSaved('Saved images are unavailable right now.'), EmptyState)
    ).toBeNull();
  });

  it('falls back to the genuine empty copy when the read succeeded and returned nothing', () => {
    const props = findProps(withFailedSaved(), EmptyState);

    expect(props.children).toBe('This user has not saved any images yet.');
  });

  it('renders no failure message when the read succeeded', () => {
    expect(findProps(withFailedSaved(), FormError)).toBeNull();
  });

  it('omits the failed section’s count instead of badging it 0', () => {
    const props = findProps(
      withFailedSaved('Saved images are unavailable right now.'),
      UserSpaceGrid
    );
    const saved = props.sections.find((s: { key: string }) => s.key === 'saved');
    expect(saved.count).toBeUndefined();
  });

  it('leaves every loaded section’s count in place', () => {
    const props = findProps(
      withFailedSaved('Saved images are unavailable right now.'),
      UserSpaceGrid
    );
    expect(
      props.sections
        .filter((s: { key: string }) => s.key !== 'saved')
        .map((s: { key: string; count?: number }) => [s.key, s.count])
    ).toEqual([
      ['collections', 3],
      ['images', 1],
    ]);
  });

  it('badges a genuinely empty section with 0, which is a count nobody guessed at', () => {
    const props = findProps(withFailedSaved(), UserSpaceGrid);
    const saved = props.sections.find((s: { key: string }) => s.key === 'saved');
    expect(saved.count).toBe(0);
  });
});
