/**
 * Render tests for CollectionEditSheet and its three tab sections.
 *
 * We construct a minimal `edit` object (plain object matching UseCollectionEditResult)
 * rather than rendering the full hook. Two fixture collections are used:
 *   - CLIENT_GALLERY  — should show the gallery-access group in InfoTab
 *   - PORTFOLIO       — should NOT show gallery-access group (non-gallery, non-parent)
 */

import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';

import { CollectionEditSheet } from '@/app/components/ContentCollection/edit/CollectionEditSheet';
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

// CollectionListSelector uses next/navigation for row navigation.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

// Keep heavy UI sub-components from blowing up in jsdom.
jest.mock('@/app/components/CollectionListSelector/CollectionListSelector', () => ({
  __esModule: true,
  default: () => <div data-testid="collection-list-selector" />,
}));

jest.mock('@/app/components/ui/TagsSelector/TagsSelector', () => ({
  __esModule: true,
  default: ({ emptyText }: { emptyText?: string }) => (
    <div data-testid="tags-selector">{emptyText}</div>
  ),
}));

jest.mock('@/app/components/RatingStars/RatingStars', () => ({
  __esModule: true,
  default: () => <div data-testid="rating-stars" />,
}));

// ── helpers ────────────────────────────────────────────────────────────────────

function makeCollection(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 1,
    slug: 'test-collection',
    title: 'Test Collection',
    description: '',
    type: CollectionType.PORTFOLIO,
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

function makeState(overrides: Partial<CollectionModel> = {}): CollectionUpdateResponseDTO {
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

function makeUpdateData(overrides: Partial<CollectionUpdateRequest> = {}): CollectionUpdateRequest {
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

function makeEdit(overrides: Partial<UseCollectionEditResult> = {}): UseCollectionEditResult {
  return {
    // Core edit surface
    currentState: makeState(),
    isLoadingState: false,
    editTab: 'info',
    setEditTab: jest.fn(),
    updateData: makeUpdateData(),
    setUpdateField: jest.fn(),
    isUpdateDirty: false,
    saving: false,
    handleUpdate: jest.fn(),

    // Parent flag (derives from updateData.type in the real hook)
    isParent: false,

    // People
    collectionPeople: [],
    setCollectionPeople: jest.fn(),
    peopleSaving: false,
    peopleStatus: null,
    handleSavePeople: jest.fn(),
    handleRegeneratePeople: jest.fn(),

    // Gallery access
    galleryPassword: '',
    setGalleryPassword: jest.fn(),
    galleryEmail: '',
    setGalleryEmail: jest.fn(),
    gallerySaving: false,
    galleryStatus: null,
    handleSaveAccess: jest.fn(),
    handleClearPassword: jest.fn(),

    // Locations
    currentLocations: [],
    handleLocationsChange: jest.fn(),

    // Tags
    currentTags: [],
    handleTagsChange: jest.fn(),

    // Structure tab
    allCollections: [] as CollectionListModel[],
    handleChangeType: jest.fn(),
    childIds: emptyTriple,
    handleChildToggle: jest.fn(),
    handleAddNewChild: jest.fn(),
    siblingIds: emptyTriple,
    handleSiblingToggle: jest.fn(),
    parentIds: emptyTriple,
    handleParentToggle: jest.fn(),
    updateCollectionRating: jest.fn(),

    // Cover image
    isSelectingCoverImage: false,
    setIsSelectingCoverImage: jest.fn(),
    handleCoverImageClick: jest.fn(),
    justClickedImageId: null,
    displayedCoverImage: null as ContentImageModel | null,
    childCollectionImages: undefined,

    // Mode/selection (not used by the sheet but part of the result type)
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

// ── InfoTab tests ──────────────────────────────────────────────────────────────

describe('CollectionEditSheet — InfoTab', () => {
  it('renders Title, Collection Type, and the Visibility dropdown', () => {
    render(<CollectionEditSheet edit={makeEdit({ editTab: 'info' })} />);
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Collection Type')).toBeInTheDocument();
    // Visibility is now a simple <select> (Listed / Unlisted / Hidden), not a segmented control.
    expect(screen.getByLabelText('Visibility')).toBeInTheDocument();
  });

  it('renders Tags and People (consolidated into Info)', () => {
    render(<CollectionEditSheet edit={makeEdit({ editTab: 'info' })} />);
    expect(screen.getByTestId('tags-selector')).toBeInTheDocument();
    expect(screen.getByText('People')).toBeInTheDocument();
  });

  it('shows gallery access group for CLIENT_GALLERY collection', () => {
    const edit = makeEdit({
      editTab: 'info',
      currentState: makeState({ type: CollectionType.CLIENT_GALLERY }),
      updateData: makeUpdateData({ type: CollectionType.CLIENT_GALLERY }),
      isParent: false,
    });
    render(<CollectionEditSheet edit={edit} />);
    expect(screen.getByRole('heading', { name: 'Gallery Access' })).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Recipient email')).toBeInTheDocument();
  });

  it('shows gallery access group for isParent=true', () => {
    const edit = makeEdit({
      editTab: 'info',
      currentState: makeState({ type: CollectionType.PARENT }),
      updateData: makeUpdateData({ type: CollectionType.PARENT }),
      isParent: true,
    });
    render(<CollectionEditSheet edit={edit} />);
    expect(screen.getByRole('heading', { name: 'Gallery Access' })).toBeInTheDocument();
  });

  it('does NOT show gallery access group for non-gallery, non-parent collection', () => {
    const edit = makeEdit({
      editTab: 'info',
      currentState: makeState({ type: CollectionType.PORTFOLIO }),
      updateData: makeUpdateData({ type: CollectionType.PORTFOLIO }),
      isParent: false,
    });
    render(<CollectionEditSheet edit={edit} />);
    expect(screen.queryByRole('heading', { name: 'Gallery Access' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });

  it('has no "access" tab rendering path — editTab="access" renders nothing', () => {
    // Cast: access is not a valid CollectionEditTab in the new type, but guard against
    // any legacy value that might slip through at runtime.
    const edit = makeEdit({
      // @ts-expect-error intentionally testing the removed tab
      editTab: 'access',
    });
    render(<CollectionEditSheet edit={edit} />);
    // None of the three tab panels should be present
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tags-selector')).not.toBeInTheDocument();
    expect(screen.queryByText('Collection Type')).not.toBeInTheDocument();
  });
});

// ── StructureTab tests ─────────────────────────────────────────────────────────

describe('CollectionEditSheet — StructureTab', () => {
  it('renders the collection selector; Collection Type moved to Info', () => {
    render(<CollectionEditSheet edit={makeEdit({ editTab: 'structure' })} />);
    expect(screen.queryByLabelText('Collection Type')).not.toBeInTheDocument();
    expect(screen.getByTestId('collection-list-selector')).toBeInTheDocument();
  });

  it('shows Order and Row Density for non-parent collection', () => {
    render(<CollectionEditSheet edit={makeEdit({ editTab: 'structure', isParent: false })} />);
    expect(screen.getByLabelText('Order')).toBeInTheDocument();
    expect(screen.getByLabelText(/Row Density/)).toBeInTheDocument();
  });

  it('hides Order and Row Density for parent collection', () => {
    render(
      <CollectionEditSheet
        edit={makeEdit({
          editTab: 'structure',
          isParent: true,
          updateData: makeUpdateData({ type: CollectionType.PARENT }),
        })}
      />
    );
    expect(screen.queryByLabelText('Order')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Row Density/)).not.toBeInTheDocument();
  });

  it('shows "Set cover image" button for parent collection', () => {
    render(
      <CollectionEditSheet
        edit={makeEdit({
          editTab: 'structure',
          isParent: true,
          updateData: makeUpdateData({ type: CollectionType.PARENT }),
        })}
      />
    );
    expect(screen.getByRole('button', { name: /set cover image/i })).toBeInTheDocument();
  });

  it('does NOT show cover button for non-parent collection', () => {
    render(<CollectionEditSheet edit={makeEdit({ editTab: 'structure', isParent: false })} />);
    expect(screen.queryByRole('button', { name: /set cover image/i })).not.toBeInTheDocument();
  });
});
