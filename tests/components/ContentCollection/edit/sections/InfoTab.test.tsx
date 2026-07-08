/**
 * Tests for the InfoTab end-date soft-validation advisory.
 *
 * A `role="status"` note ("End date is before the collection date.") renders only when both
 * dates are set AND the end date lexically precedes the start date (ISO strings compare
 * correctly under `<`). It is absent otherwise, including when the end date is unset.
 */

import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';

import { InfoTab } from '@/app/components/ContentCollection/edit/sections/InfoTab';
import { type UseCollectionEditResult } from '@/app/components/ContentCollection/edit/useCollectionEdit';
import {
  type CollectionModel,
  CollectionType,
  type CollectionUpdateRequest,
  type CollectionUpdateResponseDTO,
} from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/app/components/ui/TagsSelector/TagsSelector', () => ({
  __esModule: true,
  default: ({ emptyText }: { emptyText?: string }) => (
    <div data-testid="tags-selector">{emptyText}</div>
  ),
}));

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
    visibility: CollectionVisibility.LISTED,
    displayMode: 'ORDERED',
    rowsWide: 4,
    ...overrides,
  };
}

function makeEdit(updateData: CollectionUpdateRequest): UseCollectionEditResult {
  return {
    currentState: makeState(),
    updateData,
    setUpdateField: jest.fn(),
    currentLocations: [],
    handleLocationsChange: jest.fn(),
    currentTags: [],
    handleTagsChange: jest.fn(),
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
    isParent: false,
    isSelectingCoverImage: false,
    setIsSelectingCoverImage: jest.fn(),
    handleCoverImageClick: jest.fn(),
    displayedCoverImage: null,
    childCollectionImages: undefined,
  } as unknown as UseCollectionEditResult;
}

const WARNING = 'End date is before the collection date.';

describe('InfoTab — end-date soft validation', () => {
  it('renders the advisory when the end date is before the collection date', () => {
    render(
      <InfoTab
        edit={makeEdit(
          makeUpdateData({ collectionDate: '2026-03-07', collectionEndDate: '2026-03-01' })
        )}
      />
    );
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(WARNING);
  });

  it('does not render the advisory when the end date equals the collection date', () => {
    render(
      <InfoTab
        edit={makeEdit(
          makeUpdateData({ collectionDate: '2026-03-07', collectionEndDate: '2026-03-07' })
        )}
      />
    );
    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
  });

  it('does not render the advisory when the end date is after the collection date', () => {
    render(
      <InfoTab
        edit={makeEdit(
          makeUpdateData({ collectionDate: '2026-03-07', collectionEndDate: '2026-03-14' })
        )}
      />
    );
    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
  });

  it('does not render the advisory when the end date is unset', () => {
    render(<InfoTab edit={makeEdit(makeUpdateData({ collectionDate: '2026-03-07' }))} />);
    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
  });
});
