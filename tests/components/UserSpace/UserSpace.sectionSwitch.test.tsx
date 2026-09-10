/**
 * `UserSpace` swaps sections WITHOUT remounting the grid.
 *
 * It used to render `<CollectionPageClient key={activeKey} …>`, which made every section switch a
 * teardown and a rebuild. The frame in between holds no grid, so the document collapses to the
 * height of the header, the browser clamps `scrollY` to that height, and it never comes back —
 * the viewer is thrown toward the top of the page on every chip they click, despite the chips
 * navigating with `scroll={false}`.
 *
 * A prop change and a remount produce the same final markup, so the assertions below are chosen to
 * tell them apart rather than to check the output: a mount counter in the stand-in grid, and the
 * identity of a DOM node that a remount would necessarily replace. Each is paired with a control —
 * a deliberate fresh mount, and a genuinely-changed section body — so neither can pass by simply
 * never observing anything.
 *
 * The sibling `UserSpace.test.tsx` covers what this component passes DOWN; this one covers what it
 * does to the component it passes it to, which needs a real reconciler and so a real DOM.
 */
import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';

import { UserSpace } from '@/app/components/UserSpace/UserSpace';
import {
  TAB_KEYS,
  type TabKey,
  type UserSpaceData,
  type UserSpaceSection,
} from '@/app/components/UserSpace/userSpaceData';
import { type MeResponse } from '@/app/types/Auth';

/** Incremented once per genuine mount of the grid — never on a re-render. */
const mockGridMounts: string[] = [];

jest.mock('@/app/components/ContentCollection/CollectionPageClient', () => {
  const { useEffect } = jest.requireActual<{
    useEffect: (effect: () => void, deps: readonly unknown[]) => void;
  }>('react');

  const MockGrid = ({
    collection,
    activeSectionKey,
  }: {
    collection: { content?: { id: number }[] };
    activeSectionKey?: string;
  }) => {
    useEffect(() => {
      mockGridMounts.push(activeSectionKey ?? 'unsectioned');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div data-testid="grid">
        <p>Section: {activeSectionKey}</p>
        <p>Blocks: {(collection.content ?? []).map(block => block.id).join(', ') || 'none'}</p>
      </div>
    );
  };

  return { __esModule: true, default: MockGrid };
});

/**
 * `useFollows` returns null, the no-provider answer, because `UserSpaceGrid` calls it on every
 * render. That leaves the section counts as the server built them and the Collections list
 * unpruned, so nothing here depends on client follow state — which is what
 * `UserSpace.followCount.test.tsx` covers.
 */
jest.mock('@/app/components/Personal/FollowsContext', () => ({
  FollowsProvider: ({ children }: { children: unknown }) => children,
  useFollows: () => null,
}));

const principal: MeResponse = {
  email: 'c@x.com',
  isAdmin: true,
  mfaSatisfied: true,
  galleries: [],
};

const imageBlock = (id: number) =>
  ({
    id,
    contentType: 'IMAGE',
    imageUrl: `https://cdn/${id}.jpg`,
  }) as unknown as UserSpaceSection['content'][number];

const collectionBlock = (id: number) =>
  ({
    id,
    contentType: 'COLLECTION',
    referencedCollectionId: id,
    slug: `collection-${id}`,
    title: `Collection ${id}`,
  }) as unknown as UserSpaceSection['content'][number];

function makeData(): UserSpaceData {
  return {
    collection: {
      slug: 'user',
      title: 'Your Space',
      content: [],
    } as unknown as UserSpaceData['collection'],
    sections: {
      collections: {
        label: 'Collections',
        content: [collectionBlock(1)],
        count: 1,
        emptyLabel: 'No collections yet.',
      },
      images: {
        label: 'Images',
        content: [imageBlock(2), imageBlock(3)],
        count: 2,
        emptyLabel: 'You are not tagged in any images yet.',
      },
      saved: { label: 'Saved', content: [], count: 0, emptyLabel: 'nothing saved' },
    },
    followedCollectionIds: [7],
    savedImageIds: [3],
    grantedCollectionIds: [1],
    visibleKeys: TAB_KEYS,
    ownerName: null,
  };
}

const view = (activeKey: TabKey) => (
  <UserSpace
    data={makeData()}
    activeKey={activeKey}
    basePath="/user"
    me={principal}
    ssrViewport={null}
  />
);

beforeEach(() => {
  mockGridMounts.length = 0;
});

/**
 * The two controls are the second and fourth cases: a deliberate fresh mount proves the counter is
 * not inert, and a genuinely-changed section body proves the surviving node is not a stale one.
 *
 * The whole-tour case walks `TAB_KEYS` rather than a literal list, so a section added or removed is
 * covered without editing the test, and repeats the first key as the return trip. The last case
 * asserts the empty state DOES swap, which keeps "nothing remounts" from being read as "nothing
 * changes" — the grid is the one thing that must survive, not the whole subtree.
 */
describe('UserSpace — switching sections does not remount the grid', () => {
  it('mounts the grid once across a section change', () => {
    const { rerender } = render(view('collections'));
    rerender(view('images'));

    expect(mockGridMounts).toEqual(['collections']);
  });

  it('counts a genuine fresh mount, so the counter is not simply inert', () => {
    const first = render(view('collections'));
    first.unmount();
    render(view('images'));

    expect(mockGridMounts).toEqual(['collections', 'images']);
  });

  it('keeps the very same DOM node, which a teardown could not do', () => {
    const { rerender } = render(view('collections'));
    const before = screen.getByTestId('grid');

    rerender(view('images'));

    expect(screen.getByTestId('grid')).toBe(before);
  });

  it('swaps what that node renders, in place', () => {
    const { rerender } = render(view('collections'));
    expect(screen.getByText('Blocks: 1')).toBeInTheDocument();

    rerender(view('images'));

    expect(screen.getByText('Section: images')).toBeInTheDocument();
    expect(screen.getByText('Blocks: 2, 3')).toBeInTheDocument();
  });

  it('stays mounted across every section in turn, including a return trip', () => {
    const { rerender } = render(view('collections'));
    for (const key of [...TAB_KEYS, 'collections' as TabKey]) {
      rerender(view(key));
    }

    expect(mockGridMounts).toEqual(['collections']);
  });

  it('still swaps the empty state, which is not part of the grid', () => {
    const { rerender } = render(view('collections'));
    expect(screen.queryByText('nothing saved')).not.toBeInTheDocument();

    rerender(view('saved'));

    expect(screen.getByText('nothing saved')).toBeInTheDocument();
    expect(mockGridMounts).toEqual(['collections']);
  });
});
