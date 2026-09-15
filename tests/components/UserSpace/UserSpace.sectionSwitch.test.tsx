/**
 * `UserSpaceGrid` switches sections from `?tab=` in place: a chip click pushes the new URL with
 * `window.history.pushState` instead of navigating, so `useSearchParams()` re-renders with the new
 * value and no server round trip happens.
 *
 * `CollectionPageClient` is stood in here (this file is about the contract `UserSpaceGrid` hands
 * it, not `FilterToolbar`/`SegmentedChip`'s own rendering) and never keyed on the section, so the
 * "does not remount" cases tell a prop change apart from a teardown by a mount counter and DOM-node
 * identity rather than by output.
 */
import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@/app/lib/api/personal');

jest.mock('@/app/components/Personal/FollowsContext', () => ({
  FollowsProvider: ({ children }: { children: unknown }) => children,
  useFollows: () => null,
}));

const mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

/** Incremented once per genuine mount of the grid — never on a re-render. */
const mockGridMounts: string[] = [];

jest.mock('@/app/components/ContentCollection/CollectionPageClient', () => {
  const { useEffect } = jest.requireActual<{
    useEffect: (effect: () => void, deps: readonly unknown[]) => void;
  }>('react');

  const MockGrid = ({
    collection,
    sections,
    activeSectionKey,
    onSectionSelect,
  }: {
    collection: { content?: { id: number }[] };
    sections?: readonly { key: string; label: string; href: string; count?: number }[];
    activeSectionKey?: string;
    onSectionSelect?: (key: string, href: string) => void;
  }) => {
    useEffect(() => {
      mockGridMounts.push(activeSectionKey ?? 'unsectioned');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div data-testid="grid">
        <nav aria-label="Sections">
          {(sections ?? []).map(section => (
            <a
              key={section.key}
              href={section.href}
              aria-current={section.key === activeSectionKey ? 'page' : undefined}
              onClick={
                onSectionSelect
                  ? event => {
                      event.preventDefault();
                      onSectionSelect(section.key, section.href);
                    }
                  : undefined
              }
            >
              {section.label}
              {section.count !== undefined && <span aria-hidden="true">{section.count}</span>}
            </a>
          ))}
        </nav>
        <p>Section: {activeSectionKey}</p>
        <p>Blocks: {(collection.content ?? []).map(block => block.id).join(', ') || 'none'}</p>
      </div>
    );
  };

  return { __esModule: true, default: MockGrid };
});

import { UserSpace } from '@/app/components/UserSpace/UserSpace';
import {
  TAB_KEYS,
  type UserSpaceData,
  type UserSpaceSection,
} from '@/app/components/UserSpace/userSpaceData';
import { getUserPage } from '@/app/lib/api/personal';
import { type MeResponse } from '@/app/types/Auth';

const principal: MeResponse = {
  email: 'c@x.com',
  isAdmin: true,
  mfaSatisfied: true,
  passkeyCount: 0,
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
    ...overrides,
  };
}

const view = (data: UserSpaceData = makeData()) => (
  <UserSpace data={data} basePath="/user" me={principal} ssrViewport={null} />
);

const setTab = (tab: string) => mockSearchParams.set('tab', tab);

beforeEach(() => {
  mockGridMounts.length = 0;
  jest.clearAllMocks();
  for (const key of Array.from(mockSearchParams.keys())) {
    mockSearchParams.delete(key);
  }
});

describe('UserSpace — switches sections from the URL with no server round trip', () => {
  it('switches sections from the URL without a new server payload', () => {
    setTab('collections');
    const { rerender } = render(view());
    expect(screen.getByRole('link', { name: 'Collections' })).toHaveAttribute(
      'aria-current',
      'page'
    );

    setTab('images');
    rerender(view());

    expect(screen.getByRole('link', { name: 'Images' })).toHaveAttribute('aria-current', 'page');
    expect(getUserPage).toHaveBeenCalledTimes(0);
  });

  it('defaults to Collections with no `?tab=` in the URL at all', () => {
    const { rerender } = render(view());
    expect(screen.getByRole('link', { name: 'Collections' })).toHaveAttribute(
      'aria-current',
      'page'
    );

    setTab('saved');
    rerender(view());

    expect(screen.getByRole('link', { name: 'Saved' })).toHaveAttribute('aria-current', 'page');
  });

  /**
   * The click side of the contract: a chip click must reach `window.history.pushState`, not just
   * the URL-to-render-state direction the cases above pin.
   */
  it('pushes the new URL when a chip is clicked, instead of navigating', () => {
    setTab('collections');
    render(view());
    const pushStateSpy = jest.spyOn(window.history, 'pushState').mockImplementation(() => {});

    fireEvent.click(screen.getByRole('link', { name: 'Images' }));

    expect(pushStateSpy).toHaveBeenCalledWith(expect.anything(), '', '/user?tab=images');
    pushStateSpy.mockRestore();
  });
});

describe('UserSpace — narrows an untrusted `?tab=` before rendering', () => {
  it('falls back to Collections for an unknown `?tab=`', () => {
    setTab('nope');
    render(view());
    expect(screen.getByRole('link', { name: 'Collections' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('takes the first value when `?tab=` is repeated', () => {
    mockSearchParams.append('tab', 'images');
    mockSearchParams.append('tab', 'saved');
    render(view());
    expect(screen.getByRole('link', { name: 'Images' })).toHaveAttribute('aria-current', 'page');
  });

  it('clamps to visibleKeys when the requested section is not offered', () => {
    setTab('saved');
    render(
      view(makeData({ visibleKeys: ['collections', 'images'] as UserSpaceData['visibleKeys'] }))
    );

    const current = screen
      .getAllByRole('link')
      .filter(link => link.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('Collections');
    expect(screen.queryByRole('link', { name: 'Saved' })).not.toBeInTheDocument();
  });
});

describe('UserSpace — switching sections does not remount the grid', () => {
  it('mounts the grid once across a section change', () => {
    setTab('collections');
    const { rerender } = render(view());
    setTab('images');
    rerender(view());

    expect(mockGridMounts).toEqual(['collections']);
  });

  it('counts a genuine fresh mount, so the counter is not simply inert', () => {
    setTab('collections');
    const first = render(view());
    first.unmount();
    setTab('images');
    render(view());

    expect(mockGridMounts).toEqual(['collections', 'images']);
  });

  it('keeps the very same DOM node, which a teardown could not do', () => {
    setTab('collections');
    const { rerender } = render(view());
    const before = screen.getByTestId('grid');

    setTab('images');
    rerender(view());

    expect(screen.getByTestId('grid')).toBe(before);
  });

  it('swaps what that node renders, in place', () => {
    setTab('collections');
    const { rerender } = render(view());
    expect(screen.getByText('Blocks: 1')).toBeInTheDocument();

    setTab('images');
    rerender(view());

    expect(screen.getByText('Section: images')).toBeInTheDocument();
    expect(screen.getByText('Blocks: 2, 3')).toBeInTheDocument();
  });

  it('stays mounted across every section in turn, including a return trip', () => {
    setTab('collections');
    const { rerender } = render(view());
    for (const key of [...TAB_KEYS, 'collections']) {
      setTab(key);
      rerender(view());
    }

    expect(mockGridMounts).toEqual(['collections']);
  });
});

/**
 * `EmptyState`'s docblock forbids it for a failed read: it asserts there is nothing here, which is
 * a claim about data nobody managed to read. A section whose read failed carries `unavailableLabel`
 * instead, checked ahead of the empty state and rendered through `FormError` — see `UserSpaceGrid`.
 */
describe('UserSpace — a section whose read failed', () => {
  const dataWithFailedSaved = (unavailableLabel?: string): UserSpaceData => ({
    ...makeData(),
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
  });

  const renderSaved = (unavailableLabel?: string) => {
    setTab('saved');
    render(view(dataWithFailedSaved(unavailableLabel)));
  };

  it('says the section is unavailable rather than claiming the user has nothing', () => {
    renderSaved('Saved images are unavailable right now.');
    expect(screen.getByRole('alert')).toHaveTextContent('Saved images are unavailable right now.');
  });

  it('renders no genuine-empty copy for that section, so the false claim never appears', () => {
    renderSaved('Saved images are unavailable right now.');
    expect(screen.queryByText('nothing saved')).not.toBeInTheDocument();
  });

  it('falls back to the genuine empty copy when the read succeeded and returned nothing', () => {
    renderSaved();
    expect(screen.getByText('This user has not saved any images yet.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('omits the failed section’s count from its chip instead of badging it 0', () => {
    renderSaved('Saved images are unavailable right now.');
    expect(screen.getByRole('link', { name: 'Saved' })).toHaveTextContent(/^Saved$/);
    expect(screen.getByRole('link', { name: 'Collections' })).toHaveTextContent('Collections1');
  });
});

/**
 * On `/admin` the Admin section leads the segmented chip and renders the hub instead of a grid
 * (`content: []`, which also hides the density control) — see `UserSpaceGrid`.
 */
describe('UserSpace — the Admin section', () => {
  const adminHub = <div data-testid="hub">Hub</div>;

  const viewWithHub = (data: UserSpaceData = makeData()) => (
    <UserSpace
      data={data}
      basePath="/admin"
      me={principal}
      ssrViewport={null}
      adminHub={adminHub}
    />
  );

  it('leads the segmented chip and defaults to it with no `?tab=` at all', () => {
    render(viewWithHub());
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('aria-current', 'page');
  });

  it('renders the hub and an empty grid while Admin is active', () => {
    setTab('admin');
    render(viewWithHub());
    expect(screen.getByTestId('hub')).toBeInTheDocument();
    expect(screen.getByText('Blocks: none')).toBeInTheDocument();
  });

  it('renders no hub once a personal section is active', () => {
    setTab('images');
    render(viewWithHub());
    expect(screen.queryByTestId('hub')).not.toBeInTheDocument();
    expect(screen.getByText('Blocks: 2, 3')).toBeInTheDocument();
  });

  it('renders no Admin chip and no hub when the page passes no adminHub', () => {
    setTab('admin');
    render(view());
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('hub')).not.toBeInTheDocument();
  });
});
