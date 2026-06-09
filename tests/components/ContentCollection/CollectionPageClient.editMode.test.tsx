import { act, render, screen } from '@testing-library/react';

import CollectionPageClient from '@/app/components/ContentCollection/CollectionPageClient';
import { getCollectionUpdateMetadata, getMetadata } from '@/app/lib/api/collections';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import { type CollectionModel, CollectionType } from '@/app/types/Collection';
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
jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => ({
  __esModule: true,
  default: (props: {
    enableFullScreenView?: boolean;
    onImageClick?: unknown;
    content?: unknown[];
  }) => {
    gridProbe(props);
    return (
      <div
        data-testid="grid"
        data-fullscreen={String(Boolean(props.enableFullScreenView))}
        data-content-count={String(props.content?.length ?? 0)}
      />
    );
  },
}));

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
    render(<CollectionPageClient collection={makeCollection()} editMode />);
    await flush();
    const grid = screen.getByTestId('grid');
    expect(grid).toHaveAttribute('data-fullscreen', 'false');
    const lastCall = gridProbe.mock.calls.at(-1)?.[0];
    expect(lastCall.enableFullScreenView).toBe(false);
    expect(typeof lastCall.onImageClick).toBe('function');
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
});
