/**
 * Escape-key selection teardown for useCollectionEdit (B8, first slice).
 *
 * Pins the `selectedIds`-clearing effect in `useCollectionEdit.tsx` — the one that runs when
 * `editingContent` goes null while multi-select is off. Before this file that effect had ZERO
 * coverage: the entire suite passed with it deleted, which is exactly how it nearly got removed
 * during A7 as a redundant leftover.
 *
 * It is not redundant. Every path that flips `isMultiSelectMode` false already clears
 * `selectedIds` itself (`resetToBrowse`, `startCaptureDatePick`, `onExitMultiSelect`, the three
 * save-success handlers), so the effect looks dead on the exit-select-mode path. Its real trigger
 * is the EDITOR CLOSING VIA ESCAPE: `useMetadataEditor` binds `useEscapeKey` to its OWN internal
 * `closeEditor`, which only does `setEditingContent(null)`. The `useCollectionEdit` wrapper — the
 * one that clears the selection — never runs on that path, so the effect is the only thing left
 * that drops it.
 *
 * Without it: single-click an image, press Escape, and the selection survives invisibly.
 * `EditModeLayer` masks the stale value (`isMultiSelectMode ? selectedIds : []`) until select mode
 * is entered, so the next tap on Select shows an image the user never picked, with Remove and Edit
 * live against it.
 */

import { act, renderHook, waitFor } from '@testing-library/react';

import { useCollectionEdit } from '@/app/components/ContentCollection/edit/useCollectionEdit';
import { getCollectionUpdateMetadata, getMetadata } from '@/app/lib/api/collections';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';
import {
  type CollectionModel,
  type CollectionUpdateResponseDTO,
  type GeneralMetadataDTO,
} from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import { createImageContent } from '@/tests/fixtures/contentFixtures';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('@/app/lib/api/collections');
jest.mock('@/app/lib/api/content');
jest.mock('@/app/lib/storage/collectionStorage');

jest.mock('@/app/utils/contentLayout', () => ({
  processContentBlocks: (content: unknown[]) => content,
}));

jest.mock('@/app/components/ContentCollection/edit/collectionEditUtils', () => {
  const actual = jest.requireActual(
    '@/app/components/ContentCollection/edit/collectionEditUtils'
  ) as Record<string, unknown>;
  return {
    ...actual,
    revalidateCollectionCache: jest.fn(async () => {}),
    revalidateMetadataCache: jest.fn(async () => {}),
  };
});

const mockGetCollectionUpdateMetadata = getCollectionUpdateMetadata as jest.MockedFunction<
  typeof getCollectionUpdateMetadata
>;
const mockGetMetadata = getMetadata as jest.MockedFunction<typeof getMetadata>;
const mockStorageGetFull = collectionStorage.getFull as jest.MockedFunction<
  typeof collectionStorage.getFull
>;

const IMAGE_ID = 101;

function makeMetadata(): GeneralMetadataDTO {
  return {
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

/** Carries a real IMAGE block so `handleSingleImageEdit` resolves it and opens the editor. */
function makeCollection(): CollectionModel {
  return {
    id: 42,
    slug: 'smith-wedding',
    title: 'Smith Wedding',
    description: 'A description',
    isClient: false,
    isBlog: false,
    locations: [],
    visibility: CollectionVisibility.LISTED,
    displayMode: 'ORDERED',
    collectionDate: '2026-01-01',
    rowsWide: 4,
    content: [createImageContent(IMAGE_ID)],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function makeResponse(): CollectionUpdateResponseDTO {
  return {
    collection: makeCollection(),
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

function pressEscape() {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  });
}

describe('useCollectionEdit — Escape closes the editor AND drops the single-click selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageGetFull.mockReturnValue(null);
    mockGetCollectionUpdateMetadata.mockImplementation(async () => makeResponse());
    mockGetMetadata.mockResolvedValue(makeMetadata());
  });

  async function renderReady() {
    const collection = makeCollection();
    const view = renderHook(() =>
      useCollectionEdit({ collection, slug: collection.slug, enabled: true })
    );
    await waitFor(() => {
      expect(view.result.current.currentState).not.toBeNull();
    });
    return view;
  }

  it('stages the clicked image and opens the editor on a single click', async () => {
    const { result } = await renderReady();

    act(() => {
      result.current.handleImageClick(IMAGE_ID);
    });

    expect(result.current.selectedIds).toEqual([IMAGE_ID]);
    expect(result.current.isMultiSelectMode).toBe(false);
    expect(result.current.editingContent?.id).toBe(IMAGE_ID);
  });

  it('clears selectedIds when Escape closes the editor', async () => {
    const { result } = await renderReady();

    act(() => {
      result.current.handleImageClick(IMAGE_ID);
    });
    expect(result.current.selectedIds).toEqual([IMAGE_ID]);

    pressEscape();

    expect(result.current.editingContent).toBeNull();
    expect(result.current.selectedIds).toEqual([]);
  });

  it('leaves no stale selection for a later entry into select mode', async () => {
    const { result } = await renderReady();

    act(() => {
      result.current.handleImageClick(IMAGE_ID);
    });
    pressEscape();

    act(() => {
      result.current.enterSelect();
    });

    expect(result.current.isMultiSelectMode).toBe(true);
    expect(result.current.selectedIds).toEqual([]);
  });

  /**
   * The `!isMultiSelectMode` guard on the effect, not an incidental case. `handleBulkEdit` opens
   * the editor from an existing multi-selection, so an unguarded effect would drop every one of
   * the user's picks the moment they pressed Escape on the editor.
   *
   * This has to actually open the editor to be worth anything: `handleImageClick` in
   * multi-select mode only toggles the id and never opens it, so Escape would be inert
   * (`useEscapeKey` is enabled on `!!editingContent`) and the effect would never re-run.
   * `handleBulkEdit` is not on the hook's public API — the bottom bar's `edit` cell is how the
   * user reaches it, so that is what this drives.
   */
  it('preserves a multi-select selection when Escape closes the editor', async () => {
    const { result } = await renderReady();

    act(() => {
      result.current.enterSelect();
    });
    act(() => {
      result.current.handleImageClick(IMAGE_ID);
    });

    const editCell = result.current.bottomBarCells.find(cell => cell.key === 'edit');
    expect(editCell).toBeDefined();
    expect(editCell?.disabled).toBe(false);

    act(() => {
      editCell?.onClick?.();
    });

    expect(result.current.isMultiSelectMode).toBe(true);
    expect(result.current.selectedIds).toEqual([IMAGE_ID]);
    expect(result.current.editingContent?.id).toBe(IMAGE_ID);

    pressEscape();

    expect(result.current.editingContent).toBeNull();
    expect(result.current.selectedIds).toEqual([IMAGE_ID]);
  });
});
