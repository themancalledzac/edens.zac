/**
 * Shared fixtures for the collection edit sheet and its tabs.
 *
 * `UseCollectionEditResult` has ~70 members, so every test file that renders a tab used to
 * hand-roll its own partial and cast it. Two divergent copies meant a tab could read a
 * field one file stubbed and the other did not.
 */

import { type UseCollectionEditResult } from '@/app/components/ContentCollection/edit/useCollectionEdit';
import {
  type CollectionListModel,
  type CollectionModel,
  CollectionType,
  type CollectionUpdateRequest,
  type CollectionUpdateResponseDTO,
} from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import { type ContentImageModel } from '@/app/types/Content';

export function makeCollection(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 1,
    slug: 'test-collection',
    title: 'Test Collection',
    description: '',
    type: CollectionType.PORTFOLIO,
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

export function makeState(overrides: Partial<CollectionModel> = {}): CollectionUpdateResponseDTO {
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

export function makeUpdateData(
  overrides: Partial<CollectionUpdateRequest> = {}
): CollectionUpdateRequest {
  return {
    id: 1,
    type: CollectionType.PORTFOLIO,
    title: 'Test Collection',
    description: '',
    collectionDate: '2026-01-01',
    visibility: CollectionVisibility.LISTED,
    displayMode: 'ORDERED',
    rowsWide: 4,
    ...overrides,
  };
}

const emptySet = new Set<number>();
const emptyTriple = { saved: emptySet, pendingAdd: emptySet, pendingRemove: emptySet };

export function makeEdit(
  overrides: Partial<UseCollectionEditResult> = {}
): UseCollectionEditResult {
  return {
    currentState: makeState(),
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
    handleSaveAccess: jest.fn(),
    handleClearPassword: jest.fn(),

    currentLocations: [],
    handleLocationsChange: jest.fn(),

    currentTags: [],
    handleTagsChange: jest.fn(),

    allCollections: [] as CollectionListModel[],
    allCollectionsWithTagViews: [] as CollectionListModel[],
    saveTagAsCollection: jest.fn(),
    childIds: emptyTriple,
    handleChildToggle: jest.fn(),
    handleAddNewChild: jest.fn(),
    siblingIds: emptyTriple,
    handleSiblingToggle: jest.fn(),
    parentIds: emptyTriple,
    handleParentToggle: jest.fn(),
    updateCollectionRating: jest.fn(),

    isSelectingCoverImage: false,
    setIsSelectingCoverImage: jest.fn(),
    handleCoverImageClick: jest.fn(),
    justClickedImageId: null,
    displayedCoverImage: null as ContentImageModel | null,
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
    originalCollectionIds: emptySet,
    handleCollectionToggle: jest.fn(),
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
