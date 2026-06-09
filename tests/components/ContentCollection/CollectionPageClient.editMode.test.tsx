/**
 * Behavior tests for CollectionPageClient's `editMode` thread (Task 6c).
 *
 * Contract under test:
 *  - editMode false/absent: BYTE-IDENTICAL public render — no "Manage" toolbar, the public grid
 *    mounts with the fullscreen viewer enabled.
 *  - editMode true: the consolidated edit experience mounts — the fixed EditBar (role="toolbar",
 *    name "Manage") is present and the grid mounts with the fullscreen viewer DISABLED (a tap
 *    routes to edit handlers, never to a fullscreen viewer).
 *
 * `ContentBlockWithFullScreen` is mocked to a thin probe that records the props the page passes —
 * specifically `enableFullScreenView` and whether an `onImageClick` handler was threaded — so the
 * "no fullscreen viewer on click" guarantee can be asserted structurally without the heavy layout
 * pipeline. The API/storage layers are mocked so the (enabled) edit hook performs no real I/O.
 */

import { act, render, screen } from '@testing-library/react';

import CollectionPageClient from '@/app/components/ContentCollection/CollectionPageClient';
import { getCollectionUpdateMetadata, getMetadata } from '@/app/lib/api/collections';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import { type CollectionModel, CollectionType } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/smith-wedding',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/app/lib/api/collections');
jest.mock('@/app/lib/api/content');
jest.mock('@/app/lib/storage/collectionStorage');

// Keep layout work out of the page — return content unchanged.
jest.mock('@/app/utils/contentLayout', () => ({
  processContentBlocks: (content: unknown[]) => content,
}));

// Probe for the grid: record the props the page threads so we can assert the fullscreen-viewer
// state and click routing without rendering the real BoxTree pipeline.
const gridProbe = jest.fn();
jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => ({
  __esModule: true,
  default: (props: { enableFullScreenView?: boolean; onImageClick?: unknown }) => {
    gridProbe(props);
    return <div data-testid="grid" data-fullscreen={String(Boolean(props.enableFullScreenView))} />;
  },
}));

// The modals are not exercised here; stub them so the edit tree mounts cheaply.
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
  // Inert/enabled hook resolves with no extra metadata and an empty cache.
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
    // Public, non-client-gallery grid threads no edit click handler.
    expect(gridProbe).toHaveBeenCalledWith(expect.objectContaining({ enableFullScreenView: true }));
  });
});

describe('CollectionPageClient — editMode true', () => {
  // Flush the enabled hook's initial metadata effect so its state settles inside act().
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
    // The grid receives an edit click handler (routes to edit, not to a fullscreen viewer).
    const lastCall = gridProbe.mock.calls.at(-1)?.[0];
    expect(lastCall.enableFullScreenView).toBe(false);
    expect(typeof lastCall.onImageClick).toBe('function');
  });
});
