/** @jest-environment node */

jest.mock('@/app/components/UserSpace/UserSpaceGrid', () => ({
  UserSpaceGrid: () => 'UserSpaceGrid',
}));
jest.mock('@/app/components/Personal/FollowsContext', () => ({
  FollowsProvider: () => 'FollowsProvider',
}));

import { FollowsProvider } from '@/app/components/Personal/FollowsContext';
import { UserSpace } from '@/app/components/UserSpace/UserSpace';
import { TAB_KEYS, type UserSpaceData } from '@/app/components/UserSpace/userSpaceData';
import { UserSpaceGrid } from '@/app/components/UserSpace/UserSpaceGrid';
import { type MeResponse } from '@/app/types/Auth';

/**
 * These assertions read the props off `UserSpaceGrid`, not `CollectionPageClient`.
 *
 * `UserSpaceGrid` is the client boundary `UserSpace` renders the grid through — it owns picking the
 * active section from the URL, reconciling live follow state, and rendering the hub / empty /
 * unavailable states. `UserSpace`'s own job, tested here, is just deciding whether a
 * `FollowsProvider` wraps it and forwarding the rest of `data` untouched. `UserSpace.sectionSwitch
 * .test.tsx` renders the real `UserSpaceGrid` and covers what happens on the other side of this
 * boundary.
 */

const principal: MeResponse = {
  email: 'c@x.com',
  isAdmin: true,
  mfaSatisfied: true,
  passkeyCount: 0,
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
 * keeps the client-gallery affordances off. See the invariant note in `UserSpaceGrid`'s docblock.
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

const render = (me: MeResponse | null, basePath = '/user') =>
  UserSpace({ data: makeData(), basePath, me, ssrViewport: null });

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
      basePath: '/admin/users/5',
      me: null,
      ssrViewport: null,
    });
    expect(findProps(result, UserSpaceGrid).initialSavedImageIds).toEqual([]);
  });
});

/**
 * `UserSpace` forwards `data`'s pieces verbatim — the section chips, hub placement, count masking
 * and active-key resolution are all `UserSpaceGrid`'s job now (see its own tests).
 */
describe('UserSpace — forwards the section data untouched', () => {
  it('forwards basePath so admin chips can be built for the admin route', () => {
    expect(findProps(render(null, '/admin/users/5'), UserSpaceGrid).basePath).toBe(
      '/admin/users/5'
    );
  });

  it('forwards every section with its own count, hydrated or not', () => {
    const props = findProps(render(principal), UserSpaceGrid);
    expect([
      props.sections.collections.count,
      props.sections.images.count,
      props.sections.saved.count,
    ]).toEqual([3, 1, 2]);
  });

  it('forwards the granted ids beside the sections', () => {
    expect(findProps(render(principal), UserSpaceGrid).grantedCollectionIds).toEqual([101]);
  });

  it('forwards visibleKeys unchanged', () => {
    expect(findProps(render(principal), UserSpaceGrid).visibleKeys).toEqual(TAB_KEYS);
  });

  it('forwards the raw collection, not one narrowed to a section', () => {
    const props = findProps(render(principal), UserSpaceGrid);
    expect(props.collection.slug).toBe('user');
  });
});

/**
 * `/admin` builds the hub element itself and hands it over as a node, so this server component
 * never imports anything from the `(admin)` route. It forwards the node by reference.
 */
describe('UserSpace — admin hub', () => {
  it('forwards the adminHub node untouched to the grid', () => {
    const hub = <div>hub</div>;
    const result = UserSpace({
      data: makeData(),
      basePath: '/admin',
      me: principal,
      ssrViewport: null,
      adminHub: hub,
    });
    expect(findProps(result, UserSpaceGrid).adminHub).toBe(hub);
  });

  it('hands the grid no hub when the page passes none', () => {
    expect(findProps(render(principal), UserSpaceGrid).adminHub).toBeUndefined();
  });
});

/**
 * Page-level rail content — `/admin/users/[id]`'s role membership — belongs in the collection
 * header rail beside the cover, not in a slab below the grid. `UserSpace` only forwards it.
 */
describe('UserSpace — rail extras', () => {
  it('forwards railExtras to the collection stack', () => {
    const extras = <p>rail content</p>;
    const result = UserSpace({
      data: makeData(),
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
