/**
 * Focused test for the bottom bar's Select-mode "Remove" action.
 *
 * "Remove" must remove the selected images from THIS collection only
 * (non-destructive) — it reuses updateImages with each image's `collections`
 * trimmed of the current collection id. It must NOT call deleteImages (the
 * permanent S3 + DB hard delete), which stays reachable only via the per-image
 * metadata modal's Delete.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import ManageClient from '@/app/(admin)/collection/manage/[[...slug]]/ManageClient';
import * as collectionsApi from '@/app/lib/api/collections';
import * as contentApi from '@/app/lib/api/content';
import {
  type CollectionModel,
  CollectionType,
  type CollectionUpdateResponseDTO,
} from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';
import { type ContentImageModel } from '@/app/types/Content';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => <img {...(props as Record<string, string>)} />,
}));

jest.mock('@/app/lib/api/collections');
jest.mock('@/app/lib/api/content');

const useCollectionDataState = { loading: false, error: null as string | null };

jest.mock('@/app/hooks/useCollectionData', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useCollectionData: (
      _slug: string | undefined,
      _currentSlug: string | undefined,
      onLoad: (data: CollectionUpdateResponseDTO) => void
    ) => {
      useEffect(() => {
        if (mockResponse) onLoad(mockResponse);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return useCollectionDataState;
    },
  };
});

jest.mock('@/app/hooks/useMetadataEditor', () => ({
  useMetadataEditor: () => ({
    editingContent: null,
    openEditor: jest.fn(),
    closeEditor: jest.fn(),
  }),
}));

jest.mock('@/app/(admin)/collection/manage/[[...slug]]/useContentReordering', () => ({
  useContentReordering: () => ({
    reorderState: { active: false, moves: [], pickedUpImageId: null },
    reorderDisplayOrder: [],
    displayContent: mockResponse?.collection.content ?? [],
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

jest.mock('@/app/lib/storage/collectionStorage', () => ({
  collectionStorage: {
    update: jest.fn(),
    updateFull: jest.fn(),
    updateImagesInCache: jest.fn(),
  },
}));

jest.mock('@/app/components/SiteHeader/SiteHeader', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/app/components/Metadata/MetadataModal', () => ({
  __esModule: true,
  default: () => null,
}));

const mockedCollectionsApi = collectionsApi as jest.Mocked<typeof collectionsApi>;
const mockedContentApi = contentApi as jest.Mocked<typeof contentApi>;

let mockResponse: CollectionUpdateResponseDTO | null = null;

function makeImage(id: number): ContentImageModel {
  return {
    id,
    contentType: 'IMAGE',
    orderIndex: id,
    imageUrl: `https://cdn.example.com/${id}.jpg`,
    title: `Image ${id}`,
    collections: [
      { collectionId: 42, name: 'Smith Wedding' },
      { collectionId: 99, name: 'Best Of' },
    ],
  } as ContentImageModel;
}

function makeResponse(): CollectionUpdateResponseDTO {
  const collection: CollectionModel = {
    id: 42,
    slug: 'smith-wedding',
    title: 'Smith Wedding',
    description: '',
    type: CollectionType.PORTFOLIO,
    locations: [],
    visibility: CollectionVisibility.LISTED,
    displayMode: 'CHRONOLOGICAL',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    isPasswordProtected: false,
    content: [makeImage(1), makeImage(2)],
  };
  return {
    collection,
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
  await act(async () => {
    render(<ManageClient slug="smith-wedding" />);
  });
}

describe('ManageClient — Select-mode Remove', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResponse = makeResponse();
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
    mockedContentApi.updateImages.mockResolvedValue({ updatedImages: [] });
  });

  it('removes selected images from THIS collection via updateImages (non-destructive), never deleteImages', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    await renderManageClient();

    // Enter Select mode, select all, then Remove.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^select$/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));
    });

    await waitFor(() => {
      expect(mockedContentApi.updateImages).toHaveBeenCalledTimes(1);
    });

    // Hard delete must never be invoked from the bar.
    expect(mockedContentApi.deleteImages).not.toHaveBeenCalled();

    // Each diff trims only the current collection (42), keeping the other (99).
    const diffs = mockedContentApi.updateImages.mock.calls[0]?.[0] as Array<{
      id: number;
      collections?: { remove?: number[]; prev?: { collectionId: number }[] };
    }>;
    expect(diffs).toHaveLength(2);
    for (const diff of diffs) {
      expect(diff.collections?.remove).toEqual([42]);
    }

    // Confirm copy is about removing from the collection, not deleting.
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringMatching(/remove .*from this collection/i)
    );
    expect(confirmSpy).toHaveBeenCalledWith(expect.not.stringMatching(/delete/i));
    confirmSpy.mockRestore();
  });

  it('does nothing when the remove is not confirmed', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    await renderManageClient();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^select$/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));
    });

    expect(mockedContentApi.updateImages).not.toHaveBeenCalled();
    expect(mockedContentApi.deleteImages).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
