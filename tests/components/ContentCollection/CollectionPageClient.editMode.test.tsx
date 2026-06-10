import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CollectionPageClient from '@/app/components/ContentCollection/CollectionPageClient';
import { getCollectionUpdateMetadata, getMetadata } from '@/app/lib/api/collections';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import {
  type CollectionModel,
  CollectionType,
  type CollectionUpdateResponseDTO,
} from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';

let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/smith-wedding',
  useSearchParams: () => mockSearchParams,
}));

jest.mock('@/app/lib/api/collections');
jest.mock('@/app/lib/api/content');
jest.mock('@/app/lib/storage/collectionStorage');

jest.mock('@/app/utils/contentLayout', () => ({
  processContentBlocks: (content: unknown[]) => content,
}));

const gridProbe = jest.fn();
jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => {
  // Real context hook so the mock grid can report whether the InlineEditProvider is mounted
  // above it (the readiness gate) — the real grid's content renderers consume the same hook.
  const { useInlineEdit } = jest.requireActual<{ useInlineEdit: () => unknown }>(
    '@/app/components/ContentCollection/edit/InlineEditContext'
  );

  const MockGrid = (props: {
    enableFullScreenView?: boolean;
    onImageClick?: unknown;
    content?: unknown[];
  }) => {
    gridProbe(props);
    const inlineEdit = useInlineEdit();
    return (
      <div
        data-testid="grid"
        data-fullscreen={String(Boolean(props.enableFullScreenView))}
        data-content-count={String(props.content?.length ?? 0)}
        data-inline-edit={String(Boolean(inlineEdit))}
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
});

describe('CollectionPageClient — editMode true', () => {
  const flush = () => act(async () => {});

  it('renders the fixed "Manage" toolbar (EditBar)', async () => {
    render(<CollectionPageClient collection={makeCollection()} editMode />);
    await flush();
    expect(screen.getByRole('toolbar', { name: 'Manage' })).toBeInTheDocument();
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
