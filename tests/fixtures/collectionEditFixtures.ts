/**
 * Shared data builders for the collection edit sheet, its tabs, and the `useCollectionEdit` hook.
 *
 * `UseCollectionEditResult` has ~70 members, so every test file that renders a tab used to
 * hand-roll its own partial and cast it. The six `useCollectionEdit.*` hook test files each
 * hand-rolled `makeMetadata` / `makeCollection` / `makeResponse` on top of that. Divergent copies
 * meant a tab could read a field one file stubbed and the other did not.
 *
 * Every export here is a FUNCTION that builds a new object graph on each call, and no export
 * returns a reference into a module-level literal. That is load-bearing, not stylistic. The C1
 * regression tests in `useCollectionEdit.buffer.test.tsx` reproduce a bug whose trigger is an
 * array IDENTITY change across two DTOs. A shared constant would give two DTOs the same array
 * instance, the buggy source would look correct, and those tests would pass against it. Keep
 * `tests/fixtures/collectionEditFixtures.test.ts` green — it asserts this directly.
 *
 * Render harness (`renderEdit`, `flushEffects`) lives in `tests/fixtures/renderCollectionEdit.ts`
 * instead, so this module stays free of a value import of the hook. Files that only want a
 * `GeneralMetadataDTO` — `tests/explore/page.test.tsx`, for one — must not drag
 * `useCollectionEdit.tsx` and its whole API surface into their module registry.
 */

import { type UseCollectionEditResult } from '@/app/components/ContentCollection/edit/useCollectionEdit';
import {
  type CollectionListModel,
  type CollectionModel,
  type CollectionUpdateRequest,
  type CollectionUpdateResponseDTO,
  type GeneralMetadataDTO,
} from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';

/** The eight taxonomy lists of a `GeneralMetadataDTO`, fresh arrays on every call. */
function emptyMetadataLists() {
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

export function makeMetadata(overrides: Partial<GeneralMetadataDTO> = {}): GeneralMetadataDTO {
  return {
    ...emptyMetadataLists(),
    ...overrides,
  };
}

export function makeCollection(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 42,
    slug: 'smith-wedding',
    title: 'Smith Wedding',
    description: 'A description',
    isClient: false,
    isBlog: false,
    visibility: CollectionVisibility.LISTED,
    displayMode: 'ORDERED',
    collectionDate: '2026-01-01',
    rowsWide: 4,
    content: [],
    locations: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * The admin DTO the hook stores as `currentState`. `collectionOverrides` patch the nested
 * collection; `responseOverrides` patch the DTO's own taxonomy lists.
 */
export function makeResponse(
  collectionOverrides: Partial<CollectionModel> = {},
  responseOverrides: Partial<CollectionUpdateResponseDTO> = {}
): CollectionUpdateResponseDTO {
  return {
    collection: makeCollection(collectionOverrides),
    ...emptyMetadataLists(),
    ...responseOverrides,
  };
}

/** A DTO whose every taxonomy list is populated, so a truncated response is visible. */
export function makeMetadataRich(): Partial<CollectionUpdateResponseDTO> {
  return {
    tags: [{ id: 1, name: 'wedding', slug: 'wedding' }],
    people: [{ id: 2, name: 'Alice' }],
    locations: [{ id: 3, name: 'Seattle', slug: 'seattle' }],
    cameras: [{ id: 4, name: 'Leica M6', isFilm: true }],
    lenses: [{ id: 5, name: 'Summicron 35' }],
    filmTypes: [{ id: 6, name: 'Portra 400', defaultIso: 400 }],
  };
}

export function makeListModel(overrides: Partial<CollectionListModel> = {}): CollectionListModel {
  return {
    id: 5,
    name: 'Related Collection',
    slug: 'related-collection',
    ...overrides,
  };
}

export function makeUpdateData(
  overrides: Partial<CollectionUpdateRequest> = {}
): CollectionUpdateRequest {
  return {
    id: 42,
    title: 'Smith Wedding',
    description: 'A description',
    collectionDate: '2026-01-01',
    visibility: CollectionVisibility.LISTED,
    displayMode: 'ORDERED',
    rowsWide: 4,
    ...overrides,
  };
}

/** The saved / pendingAdd / pendingRemove triple the relation pickers read, fresh Sets per call. */
function emptyRelationTriple() {
  return {
    saved: new Set<number>(),
    pendingAdd: new Set<number>(),
    pendingRemove: new Set<number>(),
  };
}

export function makeEdit(
  overrides: Partial<UseCollectionEditResult> = {}
): UseCollectionEditResult {
  return {
    currentState: makeResponse(),
    isLoadingState: false,
    editTab: 'info',
    setEditTab: jest.fn(),
    updateData: makeUpdateData(),
    setUpdateField: jest.fn(),
    isUpdateDirty: false,
    saving: false,
    handleUpdate: jest.fn(),
    deleting: false,
    handleDeleteCollection: jest.fn(),

    isParent: false,

    collectionPeople: [],
    setCollectionPeople: jest.fn(),
    peopleSaving: false,
    peopleStatus: null,
    handleSavePeople: jest.fn(),
    handleRegeneratePeople: jest.fn(),

    galleryPassword: '',
    setGalleryPassword: jest.fn(),
    galleryEmail: '',
    setGalleryEmail: jest.fn(),
    gallerySaving: false,
    galleryStatus: null,
    galleryEmailDisabled: false,
    handleSaveAccess: jest.fn(),
    handleClearPassword: jest.fn(),

    currentLocations: [],
    handleLocationsChange: jest.fn(),

    currentTags: [],
    handleTagsChange: jest.fn(),

    allCollections: [] as CollectionListModel[],
    allCollectionsWithTagViews: [] as CollectionListModel[],
    saveTagAsCollection: jest.fn(),
    childIds: emptyRelationTriple(),
    handleChildToggle: jest.fn(),
    handleAddNewChild: jest.fn(),
    siblingIds: emptyRelationTriple(),
    handleSiblingToggle: jest.fn(),
    parentIds: emptyRelationTriple(),
    handleParentToggle: jest.fn(),
    updateCollectionRating: jest.fn(),

    isSelectingCoverImage: false,
    setIsSelectingCoverImage: jest.fn(),
    handleCoverImageClick: jest.fn(),
    justClickedImageId: null,
    childCollectionImages: undefined,

    manageMode: 'edit',
    displayContent: [],
    handleImageClick: jest.fn(),
    reorder: {
      active: false,
      displayOrder: [],
      moves: [],
      onArrowMove: jest.fn(),
      onPickUp: jest.fn(),
      onPlace: jest.fn(),
      onCancelImageMove: jest.fn(),
      pickedUpImageId: null,
    },
    selectedIds: [],
    isMultiSelectMode: false,
    isTextBlockModalOpen: false,
    closeTextBlockModal: jest.fn(),
    handleTextBlockSubmit: jest.fn(),
    editingContent: null,
    closeEditor: jest.fn(),
    contentToEdit: [],
    handleMetadataSaveSuccess: jest.fn(),
    handleGifSaveSuccess: jest.fn(),
    handleDeleteSuccess: jest.fn(),
    enterSelect: jest.fn(),
    enterReorder: jest.fn(),
    enterAdd: jest.fn(),
    enterEdit: jest.fn(),
    exitToBrowse: jest.fn(),
    bottomBarTabs: undefined,
    bottomBarCells: [],
    error: null,
    currentCoverImageId: undefined,

    ...overrides,
  } as UseCollectionEditResult;
}
