/** @jest-environment node */

jest.mock('@/app/components/ContentCollection/CollectionPageClient', () => ({
  __esModule: true,
  default: () => 'CollectionPageClient',
}));
jest.mock('@/app/components/Personal/FollowsContext', () => ({
  FollowsProvider: () => 'FollowsProvider',
}));

import CollectionPageClient from '@/app/components/ContentCollection/CollectionPageClient';
import { FollowsProvider } from '@/app/components/Personal/FollowsContext';
import { UserSpace } from '@/app/components/UserSpace/UserSpace';
import { type TabKey, type UserSpaceData } from '@/app/components/UserSpace/userSpaceData';
import { type MeResponse } from '@/app/types/Auth';

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
    sections: {
      collections: { label: 'Collections', content: [], emptyLabel: 'No collections yet.' },
      images: {
        label: 'Images',
        content: [imageBlock(1)] as UserSpaceData['sections']['images']['content'],
        emptyLabel: 'none',
      },
      saved: { label: 'Saved', content: [], emptyLabel: 'This user has not saved any images yet.' },
      following: { label: 'Following', content: [], emptyLabel: 'none' },
    },
    followedCollectionIds: [7, 9],
    savedImageIds: [3],
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
    expect(findProps(render(principal), CollectionPageClient).me).toBe(principal);
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
    expect(findProps(render(null), CollectionPageClient).me).toBeNull();
  });

  it('still renders the grid itself — the space is visible, only its controls are off', () => {
    expect(findProps(render(null), CollectionPageClient)).not.toBeNull();
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
    expect(findProps(result, CollectionPageClient).initialSavedImageIds).toEqual([]);
  });
});

describe('UserSpace — section chips', () => {
  it('builds every chip href from basePath so admin chips stay on the admin route', () => {
    const props = findProps(render(null, 'collections', '/admin/users/5'), CollectionPageClient);
    expect(props.sections.map((s: { href: string }) => s.href)).toEqual([
      '/admin/users/5?tab=collections',
      '/admin/users/5?tab=images',
      '/admin/users/5?tab=saved',
      '/admin/users/5?tab=following',
    ]);
  });

  it('counts every section regardless of which is active', () => {
    const props = findProps(render(principal), CollectionPageClient);
    expect(props.sections.map((s: { key: string; count: number }) => [s.key, s.count])).toEqual([
      ['collections', 0],
      ['images', 1],
      ['saved', 0],
      ['following', 0],
    ]);
  });

  it('marks the active section', () => {
    expect(findProps(render(principal, 'saved'), CollectionPageClient).activeSectionKey).toBe(
      'saved'
    );
  });

  it('renders only the active section’s blocks', () => {
    const props = findProps(render(principal, 'images'), CollectionPageClient);
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
    expect(findProps(result, CollectionPageClient).railExtras).toBe(extras);
  });

  it('defaults to no extras when the page supplies none', () => {
    expect(findProps(render(principal), CollectionPageClient).railExtras).toBeNull();
  });
});
