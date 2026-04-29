/**
 * Focused tests for the "Gallery Access" admin section of ManageClient.
 *
 * Covers the CLIENT_GALLERY-only password UI without exercising the rest
 * of the heavy collection-management workflow. Hooks and storage are
 * mocked at the module boundary so the test stays fast and stable.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import ManageClient from '@/app/(admin)/collection/manage/[[...slug]]/ManageClient';
import * as collectionsApi from '@/app/lib/api/collections';
import { ApiError } from '@/app/lib/api/core';
import {
  type CollectionModel,
  CollectionType,
  type CollectionUpdateResponseDTO,
} from '@/app/types/Collection';

// next/navigation router is required for the wider component; not tested here.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), refresh: jest.fn() }),
}));

// next/image — keep it simple in tests
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => <img {...(props as Record<string, string>)} />,
}));

// API surface mocks
jest.mock('@/app/lib/api/collections');
jest.mock('@/app/lib/api/content');

// Heavy hooks we don't care about for this focused test
const useCollectionDataState = {
  loading: false,
  error: null as string | null,
};

jest.mock('@/app/hooks/useCollectionData', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useCollectionData: (
      _slug: string | undefined,
      _currentSlug: string | undefined,
      onLoad: (data: CollectionUpdateResponseDTO) => void
    ) => {
      // Fire onLoad exactly once on mount (mirrors the real hook's effect),
      // so setCurrentState doesn't trigger a re-render loop.
      useEffect(() => {
        if (mockResponse) onLoad(mockResponse);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return useCollectionDataState;
    },
  };
});

jest.mock('@/app/hooks/useImageMetadataEditor', () => ({
  useImageMetadataEditor: () => ({
    editingImage: null,
    scrollPosition: 0,
    openEditor: jest.fn(),
    closeEditor: jest.fn(),
  }),
}));

// Local hooks under the manage page directory
jest.mock('@/app/(admin)/collection/manage/[[...slug]]/useContentReordering', () => ({
  useContentReordering: () => ({
    reorderState: { active: false, moves: [], pickedUpImageId: null },
    reorderDisplayOrder: [],
    displayContent: [],
    handleEnterReorderMode: jest.fn(),
    handleCancelReorder: jest.fn(),
    handleSaveReorder: jest.fn(),
    handleArrowMove: jest.fn(),
    handlePickUp: jest.fn(),
    handlePlace: jest.fn(),
    handleCancelImageMove: jest.fn(),
  }),
}));

jest.mock('@/app/(admin)/collection/manage/[[...slug]]/useCoverImageSelection', () => ({
  useCoverImageSelection: () => ({
    isSelectingCoverImage: false,
    setIsSelectingCoverImage: jest.fn(),
    justClickedImageId: null,
    handleCoverImageClick: jest.fn(),
  }),
}));

jest.mock('@/app/(admin)/collection/manage/[[...slug]]/useImageClickHandler', () => ({
  useImageClickHandler: () => ({ handleImageClick: jest.fn() }),
}));

jest.mock('@/app/(admin)/collection/manage/[[...slug]]/manageUtils', () => ({
  buildUpdatePayload: jest.fn(),
  getDisplayedCoverImage: () => null,
  handleMultiSelectToggle: jest.fn(),
  mergeNewMetadata: jest.fn(),
  refreshCollectionAfterOperation: jest.fn(),
  revalidateCollectionCache: jest.fn(),
  revalidateMetadataCache: jest.fn(),
}));

jest.mock('@/app/lib/storage/collectionStorage', () => ({
  collectionStorage: {
    update: jest.fn(),
    updateFull: jest.fn(),
    updateImagesInCache: jest.fn(),
  },
}));

// Heavy renders we can stub
jest.mock('@/app/components/SiteHeader/SiteHeader', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/app/components/CollectionListSelector/CollectionListSelector', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/app/components/ImageMetadata/UnifiedMetadataSelector', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/app/components/ImageMetadata/ImageMetadataModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/app/components/TextBlockCreateModal/TextBlockCreateModal', () => ({
  __esModule: true,
  default: () => null,
}));

const mockedCollectionsApi = collectionsApi as jest.Mocked<typeof collectionsApi>;

let mockResponse: CollectionUpdateResponseDTO | null = null;

function makeCollection(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 42,
    slug: 'smith-wedding',
    title: 'Smith Wedding',
    description: '',
    type: CollectionType.CLIENT_GALLERY,
    locations: [],
    visible: true,
    displayMode: 'CHRONOLOGICAL',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    isPasswordProtected: false,
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

async function renderManageClient() {
  // Wrap render and flush pending microtasks (e.g. getMetadata resolution)
  // inside act() so React doesn't warn about state updates outside act.
  let utils!: ReturnType<typeof render>;
  await act(async () => {
    utils = render(<ManageClient slug="smith-wedding" />);
  });
  return utils;
}

describe('ManageClient — Gallery Access section', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCollectionsApi.getMetadata.mockResolvedValue({
      tags: [],
      people: [],
      locations: [],
      cameras: [],
      lenses: [],
      filmTypes: [],
      filmFormats: [],
      collections: [],
    });
    mockedCollectionsApi.getCollectionUpdateMetadata.mockResolvedValue(makeResponse());
  });

  it('does NOT render the Gallery Access section for non-CLIENT_GALLERY types', async () => {
    mockResponse = makeResponse({ type: CollectionType.PORTFOLIO });
    await renderManageClient();

    expect(screen.queryByText('Gallery Access')).not.toBeInTheDocument();
  });

  it('renders the Gallery Access section for CLIENT_GALLERY type', async () => {
    mockResponse = makeResponse({ type: CollectionType.CLIENT_GALLERY });
    await renderManageClient();

    expect(screen.getByText('Gallery Access')).toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
    expect(screen.getByLabelText('Recipient email')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /set password & email client/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /set password only \(no email\)/i })
    ).toBeInTheDocument();
  });

  it('hides the Clear Password button when the gallery has no password', async () => {
    mockResponse = makeResponse({
      type: CollectionType.CLIENT_GALLERY,
      isPasswordProtected: false,
    });
    await renderManageClient();

    expect(screen.queryByRole('button', { name: /clear password/i })).not.toBeInTheDocument();
  });

  it('shows the Clear Password button when the gallery already has a password set', async () => {
    mockResponse = makeResponse({
      type: CollectionType.CLIENT_GALLERY,
      isPasswordProtected: true,
    });
    await renderManageClient();

    expect(screen.getByRole('button', { name: /clear password/i })).toBeInTheDocument();
  });

  it('calls sendGalleryPassword with the right args and shows success status', async () => {
    mockResponse = makeResponse({ type: CollectionType.CLIENT_GALLERY });
    mockedCollectionsApi.sendGalleryPassword.mockResolvedValue({ sent: true });

    await renderManageClient();

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'eight-chars-pw' },
    });
    fireEvent.change(screen.getByLabelText('Recipient email'), {
      target: { value: 'client@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /set password & email client/i }));

    await waitFor(() => {
      expect(mockedCollectionsApi.sendGalleryPassword).toHaveBeenCalledWith(
        42,
        'eight-chars-pw',
        'client@example.com'
      );
    });
    await waitFor(() => {
      expect(screen.getByText(/password sent to client@example.com/i)).toBeInTheDocument();
    });
  });

  it('rejects passwords shorter than 8 characters before calling the API', async () => {
    mockResponse = makeResponse({ type: CollectionType.CLIENT_GALLERY });

    await renderManageClient();

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByLabelText('Recipient email'), {
      target: { value: 'client@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /set password & email client/i }));

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    });
    expect(mockedCollectionsApi.sendGalleryPassword).not.toHaveBeenCalled();
  });

  it('shows "email disabled" status when the backend reports SES is off', async () => {
    mockResponse = makeResponse({ type: CollectionType.CLIENT_GALLERY });
    mockedCollectionsApi.sendGalleryPassword.mockResolvedValue({
      sent: false,
      reason: 'email-disabled',
    });

    await renderManageClient();

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'eight-chars-pw' },
    });
    fireEvent.change(screen.getByLabelText('Recipient email'), {
      target: { value: 'client@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /set password & email client/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/password set, email disabled \(email-disabled\)/i)
      ).toBeInTheDocument();
    });
  });

  it('"Set Password Only" calls setGalleryPassword without an email', async () => {
    mockResponse = makeResponse({ type: CollectionType.CLIENT_GALLERY });
    mockedCollectionsApi.setGalleryPassword.mockResolvedValue();

    await renderManageClient();

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'eight-chars-pw' },
    });
    fireEvent.click(screen.getByRole('button', { name: /set password only \(no email\)/i }));

    await waitFor(() => {
      expect(mockedCollectionsApi.setGalleryPassword).toHaveBeenCalledWith(42, 'eight-chars-pw');
    });
    expect(mockedCollectionsApi.sendGalleryPassword).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText('Password set. No email sent.')).toBeInTheDocument();
    });
  });

  it('"Clear Password" calls setGalleryPassword with an empty string', async () => {
    mockResponse = makeResponse({
      type: CollectionType.CLIENT_GALLERY,
      isPasswordProtected: true,
    });
    mockedCollectionsApi.setGalleryPassword.mockResolvedValue();

    await renderManageClient();

    fireEvent.click(screen.getByRole('button', { name: /clear password/i }));

    await waitFor(() => {
      expect(mockedCollectionsApi.setGalleryPassword).toHaveBeenCalledWith(42, '');
    });
    await waitFor(() => {
      expect(screen.getByText('Password cleared. Gallery is now unprotected.')).toBeInTheDocument();
    });
  });

  it('"Set Password Only" shows an error message and does not clear the input when setGalleryPassword throws ApiError', async () => {
    mockResponse = makeResponse({ type: CollectionType.CLIENT_GALLERY });
    mockedCollectionsApi.setGalleryPassword.mockRejectedValue(
      new ApiError('Internal Server Error', 500)
    );

    await renderManageClient();

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'eight-chars-pw' },
    });
    fireEvent.click(screen.getByRole('button', { name: /set password only \(no email\)/i }));

    await waitFor(() => {
      expect(mockedCollectionsApi.setGalleryPassword).toHaveBeenCalledWith(42, 'eight-chars-pw');
    });

    // Must NOT show any success message
    expect(screen.queryByText('Password set. No email sent.')).not.toBeInTheDocument();

    // Must show an error/failure status message.
    // handleApiError returns error.message for Error instances, so the status
    // reflects the ApiError message rather than the defaultMessage fallback.
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
    const statusEl = screen.getByRole('status');
    expect(statusEl.textContent).toMatch(/internal server error/i);

    // Password input must NOT be cleared so admin can retry
    expect(screen.getByLabelText('New password')).toHaveValue('eight-chars-pw');
  });
});
