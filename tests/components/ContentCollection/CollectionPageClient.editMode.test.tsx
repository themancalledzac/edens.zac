import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ComponentType, useEffect, useState } from 'react';

import CollectionPageClient from '@/app/components/ContentCollection/CollectionPageClient';
import { toMobileDensity } from '@/app/constants';
import { getCollectionUpdateMetadata, getMetadata } from '@/app/lib/api/collections';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import {
  type CollectionModel,
  CollectionType,
  type CollectionUpdateResponseDTO,
} from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';

let mockSearchParams = new URLSearchParams();
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/smith-wedding',
  useSearchParams: () => mockSearchParams,
}));

/**
 * next/dynamic mock that mirrors the real lazy semantics: the loader (chunk request) only runs
 * when the dynamic component first RENDERS, and the loaded component mounts on the next
 * microtask — covered by the `flush()` every edit-mode test already performs. This keeps
 * "public mode never loads the edit chunk" observable via the probe below.
 *
 * Function declaration (not const) so it is initialized before the hoisted jest.mock factory
 * runs during module imports.
 */
const mockDynamicLoadProbe = jest.fn();

type UnknownProps = Record<string, unknown>;

function mockNextDynamic(loader: () => Promise<{ default: ComponentType<UnknownProps> }>) {
  function DynamicStub(props: UnknownProps) {
    const [Loaded, setLoaded] = useState<ComponentType<UnknownProps> | null>(null);
    useEffect(() => {
      mockDynamicLoadProbe();
      void loader().then(mod => setLoaded(() => mod.default));
    }, []);
    return Loaded ? <Loaded {...props} /> : null;
  }
  return DynamicStub;
}

jest.mock('next/dynamic', () => ({ __esModule: true, default: mockNextDynamic }));

jest.mock('@/app/lib/api/collections');
jest.mock('@/app/lib/api/content');
jest.mock('@/app/lib/storage/collectionStorage');

jest.mock('@/app/utils/contentLayout', () => ({
  // displayMode-aware stand-in: order-sensitive tests below assert WHICH displayMode reached the
  // layout pass, so the fake applies the same primary sort the real pipeline does
  // (createdAt for CHRONOLOGICAL, orderIndex otherwise).
  processContentBlocks: (
    content: { orderIndex?: number; createdAt?: string }[],
    _filterVisible?: boolean,
    _collectionId?: number,
    displayMode?: 'CHRONOLOGICAL' | 'ORDERED' | 'FIXED'
  ) =>
    displayMode === 'CHRONOLOGICAL'
      ? [...content].sort(
          (a, b) =>
            (a.createdAt ? new Date(a.createdAt).getTime() : 0) -
            (b.createdAt ? new Date(b.createdAt).getTime() : 0)
        )
      : [...content].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
}));

const gridProbe = jest.fn();
jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => {
  // Real context hooks so the mock grid can report whether the InlineEditProvider (the
  // readiness gate) and the collection filter context (the filter-UI gate) are live above it —
  // the real grid's content renderers consume the same hooks.
  const { useInlineEdit } = jest.requireActual<{ useInlineEdit: () => unknown }>(
    '@/app/components/ContentCollection/edit/InlineEditContext'
  );
  const { useCollectionFilter } = jest.requireActual<{ useCollectionFilter: () => unknown }>(
    '@/app/components/ContentCollection/CollectionFilterContext'
  );

  const MockGrid = (props: {
    enableFullScreenView?: boolean;
    onImageClick?: unknown;
    content?: unknown[];
  }) => {
    gridProbe(props);
    const inlineEdit = useInlineEdit();
    const collectionFilter = useCollectionFilter();
    return (
      <div
        data-testid="grid"
        data-fullscreen={String(Boolean(props.enableFullScreenView))}
        data-content-count={String(props.content?.length ?? 0)}
        data-inline-edit={String(Boolean(inlineEdit))}
        data-filter-context={String(Boolean(collectionFilter))}
      />
    );
  };
  return { __esModule: true, default: MockGrid };
});

jest.mock('@/app/components/Metadata/MetadataModal', () => ({
  __esModule: true,
  default: () => <div data-testid="metadata-modal" />,
}));
jest.mock('@/app/components/TextBlockCreateModal/TextBlockCreateModal', () => ({
  __esModule: true,
  default: () => <div data-testid="text-block-modal" />,
}));

const mockGetCollectionUpdateMetadata = getCollectionUpdateMetadata as jest.MockedFunction<
  typeof getCollectionUpdateMetadata
>;
const mockGetMetadata = getMetadata as jest.MockedFunction<typeof getMetadata>;
const mockStorageGetFull = collectionStorage.getFull as jest.MockedFunction<
  typeof collectionStorage.getFull
>;

function makeCollection(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 42,
    slug: 'smith-wedding',
    title: 'Smith Wedding',
    description: 'A description',
    type: CollectionType.PORTFOLIO,
    locations: [],
    visibility: CollectionVisibility.LISTED,
    displayMode: 'ORDERED',
    collectionDate: '2026-01-01',
    rowsWide: 4,
    content: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeResponse(overrides: Partial<CollectionModel> = {}): CollectionUpdateResponseDTO {
  return {
    collection: makeCollection(overrides),
    tags: [],
    people: [],
    locations: [],
    cameras: [],
    lenses: [],
    filmTypes: [],
    filmFormats: [],
    collections: [],
  };
}

/** A metadata fetch that never settles — models the cold-load window. */
const pendingForever = () => new Promise<CollectionUpdateResponseDTO | null>(() => {});

beforeEach(() => {
  gridProbe.mockClear();
  mockDynamicLoadProbe.mockClear();
  mockPush.mockClear();
  mockSearchParams = new URLSearchParams();
  mockGetCollectionUpdateMetadata.mockResolvedValue(null);
  mockGetMetadata.mockResolvedValue(null);
  mockStorageGetFull.mockReturnValue(null);
});

describe('CollectionPageClient — editMode false (public, default)', () => {
  it('does not render the "Manage" toolbar', () => {
    render(<CollectionPageClient collection={makeCollection()} />);
    expect(screen.queryByRole('toolbar', { name: 'Manage' })).not.toBeInTheDocument();
  });

  it('mounts the public grid with the fullscreen viewer ENABLED', () => {
    render(<CollectionPageClient collection={makeCollection()} />);
    const grid = screen.getByTestId('grid');
    expect(grid).toHaveAttribute('data-fullscreen', 'true');
    expect(gridProbe).toHaveBeenCalledWith(expect.objectContaining({ enableFullScreenView: true }));
  });

  it('never requests the edit-layer chunk (dynamic loader not invoked)', async () => {
    render(<CollectionPageClient collection={makeCollection()} />);
    // Flush microtasks so a wrongly-rendered dynamic stub would have had time to load.
    await act(async () => {});
    expect(mockDynamicLoadProbe).not.toHaveBeenCalled();
  });
});

describe('CollectionPageClient — editMode true', () => {
  const flush = () => act(async () => {});

  it('renders the fixed "Manage" toolbar (EditBar)', async () => {
    render(<CollectionPageClient collection={makeCollection()} editMode />);
    await flush();
    expect(screen.getByRole('toolbar', { name: 'Manage' })).toBeInTheDocument();
    // Sanity for the dynamic mock: edit mode DOES request the edit-layer chunk.
    expect(mockDynamicLoadProbe).toHaveBeenCalled();
  });

  it('mounts the grid with the fullscreen viewer DISABLED so a tap never opens it', async () => {
    mockGetCollectionUpdateMetadata.mockResolvedValue(makeResponse());
    render(<CollectionPageClient collection={makeCollection()} editMode />);
    await flush();
    const grid = screen.getByTestId('grid');
    expect(grid).toHaveAttribute('data-fullscreen', 'false');
    const lastCall = gridProbe.mock.calls.at(-1)?.[0];
    expect(lastCall.enableFullScreenView).toBe(false);
    expect(typeof lastCall.onImageClick).toBe('function');
  });

  it('forwards the page density to the edit-mode grid so it matches the public layout', async () => {
    // Density is owned by CollectionPageClient (chunkSize ?? default, where chunkSize derives from
    // collection.rowsWide). It must be threaded into EditModeLayer's grid; otherwise edit mode falls
    // back to the component default and renders at a different density than the public page.
    mockGetCollectionUpdateMetadata.mockResolvedValue(makeResponse());
    render(<CollectionPageClient collection={makeCollection()} chunkSize={6} editMode />);
    await flush();
    const lastCall = gridProbe.mock.calls.at(-1)?.[0];
    expect(lastCall.chunkSize).toBe(6);
    expect(lastCall.mobileChunkSize).toBe(toMobileDensity(6));
  });

  it('keeps fullscreen DISABLED on the fallback grid while the edit chunk is still loading', async () => {
    render(<CollectionPageClient collection={makeCollection()} editMode />);

    // Assert synchronously, BEFORE flushing: the dynamic mock resolves the edit chunk on a
    // microtask, so right now the parent-owned loading-fallback grid is the only grid mounted.
    // A tap during this window must not open the fullscreen viewer the layer will tear down.
    const grid = screen.getByTestId('grid');
    expect(grid).toHaveAttribute('data-fullscreen', 'false');
    expect(gridProbe).toHaveBeenCalledWith(
      expect.objectContaining({ enableFullScreenView: false })
    );

    // Flush so the chunk's deferred state updates land inside act before teardown.
    await flush();
  });

  it('renders a role="alert" banner when the hook surfaces an error', async () => {
    mockGetCollectionUpdateMetadata.mockRejectedValue(new Error('Failed to update collection'));
    render(<CollectionPageClient collection={makeCollection()} editMode />);
    await flush();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to update collection');
  });

  it('dismisses the error banner when the × button is clicked', async () => {
    const user = userEvent.setup();
    mockGetCollectionUpdateMetadata.mockRejectedValue(new Error('Failed to update collection'));
    render(<CollectionPageClient collection={makeCollection()} editMode />);
    await flush();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dismiss error' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears the active filter when entering reorder so the grid shows the full set (I4)', async () => {
    mockSearchParams = new URLSearchParams('rating=4');

    const content = [
      {
        id: 1,
        contentType: 'IMAGE' as const,
        orderIndex: 0,
        imageUrl: 'a.jpg',
        rating: 5,
        locations: [],
      },
      {
        id: 2,
        contentType: 'IMAGE' as const,
        orderIndex: 1,
        imageUrl: 'b.jpg',
        rating: 2,
        locations: [],
      },
    ];
    const collection = makeCollection({ displayMode: 'ORDERED', content });

    render(<CollectionPageClient collection={collection} editMode />);
    await flush();

    expect(screen.getByTestId('grid')).toHaveAttribute('data-content-count', '1');

    act(() => {
      screen.getByRole('button', { name: 'Reorder' }).click();
    });
    act(() => {
      screen.getByRole('button', { name: 'Cancel' }).click();
    });

    expect(screen.getByTestId('grid')).toHaveAttribute('data-content-count', '2');
  });

  it('clears the active filter when entering select mode so Select-All matches the visible grid (I4)', async () => {
    mockSearchParams = new URLSearchParams('rating=4');

    const content = [
      {
        id: 1,
        contentType: 'IMAGE' as const,
        orderIndex: 0,
        imageUrl: 'a.jpg',
        rating: 5,
        locations: [],
      },
      {
        id: 2,
        contentType: 'IMAGE' as const,
        orderIndex: 1,
        imageUrl: 'b.jpg',
        rating: 2,
        locations: [],
      },
    ];
    const collection = makeCollection({ displayMode: 'ORDERED', content });

    render(<CollectionPageClient collection={collection} editMode />);
    await flush();

    // With rating=4 filter active, only image #1 (rating 5) is visible.
    expect(screen.getByTestId('grid')).toHaveAttribute('data-content-count', '1');

    act(() => {
      screen.getByRole('button', { name: 'Select' }).click();
    });

    // Filter must be cleared so the full collection is visible (2 images).
    expect(screen.getByTestId('grid')).toHaveAttribute('data-content-count', '2');
  });

  describe('Escape key — manage-mode exit guard', () => {
    it('does NOT exit manage mode when Escape is dispatched with defaultPrevented=true', async () => {
      // Arrange: render with a resolved DTO so the hook is active and manageMode is 'browse'.
      mockGetCollectionUpdateMetadata.mockResolvedValue(makeResponse());
      render(<CollectionPageClient collection={makeCollection()} editMode />);
      await act(async () => {});

      // Act: dispatch a keydown whose default was already prevented (simulating an inline editor).
      act(() => {
        const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
        e.preventDefault();
        window.dispatchEvent(e);
      });

      // Assert: router.push was NOT called — manage mode was not exited.
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('DOES exit manage mode when Escape is dispatched without defaultPrevented', async () => {
      // Arrange: render with a resolved DTO so the hook is active and manageMode is 'browse'.
      mockGetCollectionUpdateMetadata.mockResolvedValue(makeResponse());
      render(<CollectionPageClient collection={makeCollection()} editMode />);
      await act(async () => {});

      // Act: dispatch a plain Escape (no inline editor involved).
      act(() => {
        const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
        window.dispatchEvent(e);
      });

      // Assert: router.push WAS called — manage mode was exited.
      expect(mockPush).toHaveBeenCalledWith('/smith-wedding');
    });
  });

  describe('collectionData — edit-mode grid receives live collection data', () => {
    it('passes the admin DTO collection to the grid after load, not the frozen seed prop', async () => {
      // The seed has no coverImage and an old collectionDate.
      const seed = makeCollection({ collectionDate: '2026-01-01', coverImage: undefined });

      // The admin DTO carries a different date and a cover image — the header should reflect these.
      const adminCoverImage = {
        id: 999,
        contentType: 'IMAGE' as const,
        imageUrl: 'https://cdn.example.com/cover.jpg',
        orderIndex: 0,
        locations: [],
      };
      const adminDto = makeResponse({
        collectionDate: '2025-06-15',
        coverImage: adminCoverImage,
      });
      mockGetCollectionUpdateMetadata.mockResolvedValue(adminDto);

      render(<CollectionPageClient collection={seed} editMode />);
      await flush();

      // The last render of the edit-mode grid must receive the ADMIN values, not the seed values.
      const lastCall = gridProbe.mock.calls.at(-1)?.[0];
      expect(lastCall.collectionData).toBeDefined();
      expect(lastCall.collectionData.collectionDate).toBe('2025-06-15');
      expect(lastCall.collectionData.coverImage?.id).toBe(999);
      // Seed value must NOT appear.
      expect(lastCall.collectionData.collectionDate).not.toBe('2026-01-01');
      expect(lastCall.collectionData.coverImage).not.toBeUndefined();
    });

    it('falls back to the seed prop collectionData while the admin DTO is still loading', async () => {
      const seed = makeCollection({ collectionDate: '2026-01-01', coverImage: undefined });
      mockGetCollectionUpdateMetadata.mockReturnValue(pendingForever());

      render(<CollectionPageClient collection={seed} editMode />);
      await flush();

      // During load, collectionData must be the seed (no live DTO yet).
      const lastCall = gridProbe.mock.calls.at(-1)?.[0];
      expect(lastCall.collectionData).toBeDefined();
      expect(lastCall.collectionData.collectionDate).toBe('2026-01-01');
    });
  });

  describe('displayMode — the edit grid sorts with the LIVE displayMode', () => {
    it('renders a saved reorder when the seed says CHRONOLOGICAL but the admin DTO says ORDERED', async () => {
      // createdAt order is [1, 2, 3]; orderIndex order is [3, 1, 2] (a saved manual reorder).
      const content = [
        {
          id: 1,
          contentType: 'IMAGE' as const,
          orderIndex: 1,
          imageUrl: 'a.jpg',
          createdAt: '2026-01-01T00:00:00Z',
          locations: [],
        },
        {
          id: 2,
          contentType: 'IMAGE' as const,
          orderIndex: 2,
          imageUrl: 'b.jpg',
          createdAt: '2026-01-02T00:00:00Z',
          locations: [],
        },
        {
          id: 3,
          contentType: 'IMAGE' as const,
          orderIndex: 0,
          imageUrl: 'c.jpg',
          createdAt: '2026-01-03T00:00:00Z',
          locations: [],
        },
      ];

      // The frozen server seed predates the Reorder auto-convert: still CHRONOLOGICAL.
      const seed = makeCollection({ displayMode: 'CHRONOLOGICAL', content });
      // The admin DTO reflects the converted + reordered state.
      mockGetCollectionUpdateMetadata.mockResolvedValue(
        makeResponse({ displayMode: 'ORDERED', content })
      );

      render(<CollectionPageClient collection={seed} editMode />);
      await flush();

      // The grid must receive orderIndex order [3, 1, 2] — sorting with the seed's
      // CHRONOLOGICAL mode would yield createdAt order [1, 2, 3] (the reverted-reorder bug).
      const lastCall = gridProbe.mock.calls.at(-1)?.[0];
      const ids = (lastCall.content as { id: number }[]).map(block => block.id);
      expect(ids).toEqual([3, 1, 2]);
    });
  });

  describe('filter options — track live content in edit mode', () => {
    it('mounts the filter UI once the admin DTO delivers filterable content (empty seed)', async () => {
      // NEW collection: the server seed has no content yet, so first paint has no filter options.
      const seed = makeCollection({ content: [] });

      // The admin DTO carries freshly uploaded images with tag variance — exactly the state
      // after an in-session upload. The filter UI must appear without a hard reload.
      const dtoContent = [
        {
          id: 1,
          contentType: 'IMAGE' as const,
          orderIndex: 0,
          imageUrl: 'a.jpg',
          tags: [{ id: 10, name: 'sunset', slug: 'sunset' }],
          locations: [],
        },
        {
          id: 2,
          contentType: 'IMAGE' as const,
          orderIndex: 1,
          imageUrl: 'b.jpg',
          locations: [],
        },
      ];
      mockGetCollectionUpdateMetadata.mockResolvedValue(makeResponse({ content: dtoContent }));

      render(<CollectionPageClient collection={seed} editMode />);
      await flush();

      // Pre-fix, the parent derived filter options from the frozen seed ([]), so the filter
      // context never went live and the toolbar could never mount.
      expect(screen.getByTestId('grid')).toHaveAttribute('data-filter-context', 'true');
    });
  });

  describe('readiness gating — edit interactions wait for the admin DTO', () => {
    it('keeps inline editors unmounted and image taps inert while the admin fetch is pending', async () => {
      mockGetCollectionUpdateMetadata.mockReturnValue(pendingForever());
      render(<CollectionPageClient collection={makeCollection()} editMode />);
      await flush();

      // No InlineEditProvider above the grid → header card renders read-only (no tap-to-edit).
      expect(screen.getByTestId('grid')).toHaveAttribute('data-inline-edit', 'false');
      // No click routing → a tap cannot open the image metadata editor off the seed.
      const lastCall = gridProbe.mock.calls.at(-1)?.[0];
      expect(lastCall.onImageClick).toBeUndefined();
    });

    it('disables the browse cells while pending, but keeps Cancel (exit manage) enabled', async () => {
      mockGetCollectionUpdateMetadata.mockReturnValue(pendingForever());
      render(<CollectionPageClient collection={makeCollection()} editMode />);
      await flush();

      expect(screen.getByRole('button', { name: 'Select' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Reorder' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    });

    it('mounts inline editors, enables the cells, and routes taps once the DTO resolves', async () => {
      mockGetCollectionUpdateMetadata.mockResolvedValue(makeResponse());
      render(<CollectionPageClient collection={makeCollection()} editMode />);
      await flush();

      expect(screen.getByTestId('grid')).toHaveAttribute('data-inline-edit', 'true');
      expect(screen.getByRole('button', { name: 'Select' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Reorder' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Edit' })).toBeEnabled();
      const lastCall = gridProbe.mock.calls.at(-1)?.[0];
      expect(typeof lastCall.onImageClick).toBe('function');
    });

    it('stays gated and surfaces an alert when the admin fetch resolves null', async () => {
      // beforeEach default: getCollectionUpdateMetadata resolves null.
      render(<CollectionPageClient collection={makeCollection()} editMode />);
      await flush();

      expect(screen.getByTestId('grid')).toHaveAttribute('data-inline-edit', 'false');
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to load collection data/i);
    });
  });
});
