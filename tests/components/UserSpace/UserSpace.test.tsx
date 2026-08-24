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
 * `UserSpaceGrid` is the client boundary `UserSpace` now renders the grid through — it exists to
 * re-derive the Following chip's count from live follow state, and forwards everything else to
 * `CollectionPageClient` verbatim. This file walks the element tree without rendering it, so the
 * first component it can read is that boundary. `UserSpace.followCount.test.tsx` renders for real
 * and covers what arrives at the other side.
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

function makeData(overrides: Partial<UserSpaceData> = {}): UserSpaceData {
  return {
    // Mirrors the real payload: UserPageAssembler builds this collection with no `id`, `isClient`
    // or `isPasswordProtected` — it is assembled, not a `collection` row — so the fixture cannot
    // satisfy CollectionModel's declared shape without inventing exactly the fields whose absence
    // is load-bearing. See the invariant note in UserSpace's docblock.
    collection: {
      slug: 'user',
      title: 'Your Space',
      content: [],
    } as unknown as UserSpaceData['collection'],
    // `count` is carried separately from `content` because only the ACTIVE section is hydrated —
    // an inactive section's `content` is empty by design, so its badge has to come from somewhere
    // else. `following` below is exactly that case: two followed ids, zero hydrated blocks.
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
      saved: {
        label: 'Saved',
        content: [],
        count: 0,
        emptyLabel: 'This user has not saved any images yet.',
      },
      following: { label: 'Following', content: [], count: 2, emptyLabel: 'none' },
    },
    followedCollectionIds: [7, 9],
    savedImageIds: [3],
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

describe('UserSpace — section chips', () => {
  it('builds every chip href from basePath so admin chips stay on the admin route', () => {
    const props = findProps(render(null, 'collections', '/admin/users/5'), UserSpaceGrid);
    expect(props.sections.map((s: { href: string }) => s.href)).toEqual([
      '/admin/users/5?tab=collections',
      '/admin/users/5?tab=images',
      '/admin/users/5?tab=saved',
      '/admin/users/5?tab=following',
    ]);
  });

  // `following` is the load-bearing row: its `content` is empty (only the active section is
  // hydrated) while its count is 2. Deriving the badge from `content.length` would silently badge
  // it 0 — a claim that the user follows nothing, made on a page that has not looked.
  it('counts every section regardless of which is active, hydrated or not', () => {
    const props = findProps(render(principal), UserSpaceGrid);
    expect(props.sections.map((s: { key: string; count: number }) => [s.key, s.count])).toEqual([
      ['collections', 0],
      ['images', 1],
      ['saved', 0],
      ['following', 2],
    ]);
  });

  it('marks the active section', () => {
    expect(findProps(render(principal, 'saved'), UserSpaceGrid).activeSectionKey).toBe('saved');
  });

  it('renders only the active section’s blocks', () => {
    const props = findProps(render(principal, 'images'), UserSpaceGrid);
    expect(props.collection.content).toHaveLength(1);
  });
});

// Page-level rail content (/user's Account + Admin cards, the admin view-as note) belongs in the
// collection header rail beside the cover, not in a slab below the grid. UserSpace only forwards.
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
 */
describe('UserSpace — a section whose read failed', () => {
  const withFailedSaved = (unavailableLabel?: string) =>
    UserSpace({
      data: makeData({
        sections: {
          ...makeData().sections,
          saved: {
            label: 'Saved',
            content: [],
            // Present precisely so the assertions below prove the count is dropped because the
            // read FAILED, not merely because no count was supplied.
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

  /**
   * A `0` badge on the chip is the same claim the body just stopped making, in miniature — and it
   * would sit inches from copy saying the number is unknown. `ToolbarSection.count` is optional so
   * an unknown count can be left unsaid; `FilterChip` then renders the bare label.
   */
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
      ['collections', 0],
      ['images', 1],
      ['following', 2],
    ]);
  });

  it('badges a genuinely empty section with 0, which is a count nobody guessed at', () => {
    const props = findProps(withFailedSaved(), UserSpaceGrid);
    const saved = props.sections.find((s: { key: string }) => s.key === 'saved');
    expect(saved.count).toBe(0);
  });
});
