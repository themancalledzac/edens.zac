import { act, renderHook } from '@testing-library/react';

import { useImageMetadataSubmit } from '@/app/components/ImageMetadata/hooks/useImageMetadataSubmit';
import type { ContentGifModel, ContentImageModel } from '@/app/types/Content';

// ---------------------------------------------------------------------------
// API mocks
// ---------------------------------------------------------------------------
jest.mock('@/app/lib/api/content', () => ({
  updateImages: jest.fn(),
  updateGif: jest.fn(),
  deleteImages: jest.fn(),
  deleteGif: jest.fn(),
}));

import { deleteGif, deleteImages, updateGif, updateImages } from '@/app/lib/api/content';

const mockUpdateImages = updateImages as jest.MockedFunction<typeof updateImages>;
const mockUpdateGif = updateGif as jest.MockedFunction<typeof updateGif>;
const mockDeleteImages = deleteImages as jest.MockedFunction<typeof deleteImages>;
const mockDeleteGif = deleteGif as jest.MockedFunction<typeof deleteGif>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const img = (id: number, overrides: Partial<ContentImageModel> = {}): ContentImageModel =>
  ({
    id,
    contentType: 'IMAGE',
    imageUrl: `https://cdn.example.com/${id}.jpg`,
    imageWidth: 4000,
    imageHeight: 3000,
    title: `Image ${id}`,
    alt: `Alt ${id}`,
    rating: null,
    blackAndWhite: false,
    isFilm: false,
    collections: [],
    tags: [],
    people: [],
    locations: [],
    ...overrides,
  }) as ContentImageModel;

const gif = (id: number, overrides: Partial<ContentGifModel> = {}): ContentGifModel =>
  ({
    id,
    contentType: 'GIF',
    gifUrl: `https://cdn.example.com/${id}.mp4`,
    thumbnailUrl: `https://cdn.example.com/${id}.webp`,
    width: 1920,
    height: 1080,
    title: `Gif ${id}`,
    alt: `Alt ${id}`,
    rating: null,
    collections: [],
    ...overrides,
  }) as ContentGifModel;

// Base hook params for single-image, no changes
const baseImageParams = (overrides = {}) => ({
  selectedImages: [img(1)],
  selectedImageIds: [1],
  updateState: { id: 1, title: 'Image 1', contentType: 'IMAGE' as const, collections: [] },
  hasChanges: false,
  originalCollectionIds: new Set<number>(),
  availableFilmTypes: [],
  onClose: jest.fn(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useImageMetadataSubmit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, 'confirm').mockReturnValue(false);
  });

  // ── handleSubmit ────────────────────────────────────────────────────────

  it('handleSubmit calls onClose immediately when !hasChanges (no API call)', async () => {
    const onClose = jest.fn();
    const { result } = renderHook(() =>
      useImageMetadataSubmit(baseImageParams({ onClose, hasChanges: false }))
    );

    await act(async () => {
      const fakeEvent = { preventDefault: jest.fn() } as unknown as Parameters<
        typeof result.current.handleSubmit
      >[0];
      await result.current.handleSubmit(fakeEvent);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockUpdateImages).not.toHaveBeenCalled();
    expect(mockUpdateGif).not.toHaveBeenCalled();
  });

  it('handleSubmit routes to updateGif for a single GIF and calls onGifSaveSuccess on success', async () => {
    const onClose = jest.fn();
    const onGifSaveSuccess = jest.fn();
    const singleGif = gif(202, { title: 'Original GIF' });
    const updatedGif = { ...singleGif, title: 'Updated GIF' };

    mockUpdateGif.mockResolvedValueOnce(updatedGif as ContentGifModel);

    const { result } = renderHook(() =>
      useImageMetadataSubmit({
        selectedImages: [singleGif],
        selectedImageIds: [202],
        updateState: { id: 202, title: 'Updated GIF', collections: [] },
        hasChanges: true,
        originalCollectionIds: new Set<number>(),
        availableFilmTypes: [],
        onClose,
        onGifSaveSuccess,
      })
    );

    await act(async () => {
      const fakeEvent = { preventDefault: jest.fn() } as unknown as Parameters<
        typeof result.current.handleSubmit
      >[0];
      await result.current.handleSubmit(fakeEvent);
    });

    expect(mockUpdateGif).toHaveBeenCalledTimes(1);
    expect(mockUpdateImages).not.toHaveBeenCalled();
    expect(onGifSaveSuccess).toHaveBeenCalledWith(updatedGif);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handleSubmit routes to updateImages with bulk diff when isBulkEdit', async () => {
    const onClose = jest.fn();
    const onSaveSuccess = jest.fn();
    const images = [img(1), img(2)];

    mockUpdateImages.mockResolvedValueOnce({
      updatedImages: [],
    });

    const { result } = renderHook(() =>
      useImageMetadataSubmit({
        selectedImages: images,
        selectedImageIds: [1, 2],
        updateState: { id: 0, contentType: 'IMAGE' as const, title: 'Bulk Title', collections: [] },
        hasChanges: true,
        originalCollectionIds: new Set<number>(),
        availableFilmTypes: [],
        onClose,
        onSaveSuccess,
      })
    );

    await act(async () => {
      const fakeEvent = { preventDefault: jest.fn() } as unknown as Parameters<
        typeof result.current.handleSubmit
      >[0];
      await result.current.handleSubmit(fakeEvent);
    });

    expect(mockUpdateImages).toHaveBeenCalledTimes(1);
    // Bulk edit passes an array with one entry per image
    const callArg = mockUpdateImages.mock.calls[0]?.[0];
    expect(Array.isArray(callArg)).toBe(true);
    expect(callArg).toHaveLength(2);
    expect(onSaveSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handleSubmit routes to updateImages with single-edit diff when not bulk and not GIF', async () => {
    const onClose = jest.fn();
    const onSaveSuccess = jest.fn();
    const singleImage = img(1, { title: 'Original' });

    mockUpdateImages.mockResolvedValueOnce({
      updatedImages: [],
    });

    const { result } = renderHook(() =>
      useImageMetadataSubmit({
        selectedImages: [singleImage],
        selectedImageIds: [1],
        updateState: { id: 1, contentType: 'IMAGE' as const, title: 'Renamed', collections: [] },
        hasChanges: true,
        originalCollectionIds: new Set<number>(),
        availableFilmTypes: [],
        onClose,
        onSaveSuccess,
      })
    );

    await act(async () => {
      const fakeEvent = { preventDefault: jest.fn() } as unknown as Parameters<
        typeof result.current.handleSubmit
      >[0];
      await result.current.handleSubmit(fakeEvent);
    });

    expect(mockUpdateImages).toHaveBeenCalledTimes(1);
    // Single edit passes an array with exactly one entry
    const callArg = mockUpdateImages.mock.calls[0]?.[0];
    expect(Array.isArray(callArg)).toBe(true);
    expect(callArg).toHaveLength(1);
    expect(onSaveSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handleSubmit does NOT call onSaveSuccess when updateImages returns null', async () => {
    const onClose = jest.fn();
    const onSaveSuccess = jest.fn();

    mockUpdateImages.mockResolvedValueOnce(null);

    const { result } = renderHook(() =>
      useImageMetadataSubmit({
        selectedImages: [img(1)],
        selectedImageIds: [1],
        updateState: { id: 1, contentType: 'IMAGE' as const, title: 'Changed', collections: [] },
        hasChanges: true,
        originalCollectionIds: new Set<number>(),
        availableFilmTypes: [],
        onClose,
        onSaveSuccess,
      })
    );

    await act(async () => {
      const fakeEvent = { preventDefault: jest.fn() } as unknown as Parameters<
        typeof result.current.handleSubmit
      >[0];
      await result.current.handleSubmit(fakeEvent);
    });

    expect(mockUpdateImages).toHaveBeenCalledTimes(1);
    expect(onSaveSuccess).not.toHaveBeenCalled();
    // onClose is also NOT called when response is null
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does NOT call onGifSaveSuccess when updateGif returns null', async () => {
    const onClose = jest.fn();
    const onGifSaveSuccess = jest.fn();
    const singleGif = gif(303, { title: 'Original GIF' });

    mockUpdateGif.mockResolvedValueOnce(null);

    const { result } = renderHook(() =>
      useImageMetadataSubmit({
        selectedImages: [singleGif],
        selectedImageIds: [303],
        updateState: { id: 303, title: 'Updated GIF', collections: [] },
        hasChanges: true,
        originalCollectionIds: new Set<number>(),
        availableFilmTypes: [],
        onClose,
        onGifSaveSuccess,
      })
    );

    await act(async () => {
      const fakeEvent = { preventDefault: jest.fn() } as unknown as Parameters<
        typeof result.current.handleSubmit
      >[0];
      await result.current.handleSubmit(fakeEvent);
    });

    expect(mockUpdateGif).toHaveBeenCalledTimes(1);
    expect(onGifSaveSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  // ── handleDelete ────────────────────────────────────────────────────────

  it('handleDelete shows confirm dialog and does NOT call deleteImages when user cancels', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(false);

    const { result } = renderHook(() =>
      useImageMetadataSubmit(baseImageParams({ hasChanges: false }))
    );

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(mockDeleteImages).not.toHaveBeenCalled();
    expect(mockDeleteGif).not.toHaveBeenCalled();
  });

  it('handleDelete calls deleteImages on confirm for image content', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const onClose = jest.fn();
    const onDeleteSuccess = jest.fn();

    mockDeleteImages.mockResolvedValueOnce({ deletedIds: [1] });

    const { result } = renderHook(() =>
      useImageMetadataSubmit(baseImageParams({ onClose, onDeleteSuccess, hasChanges: false }))
    );

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(mockDeleteImages).toHaveBeenCalledWith([1]);
    expect(onDeleteSuccess).toHaveBeenCalledWith([1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handleDelete calls deleteGif (not deleteImages) for a single GIF on confirm', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const onClose = jest.fn();
    const onDeleteSuccess = jest.fn();
    const singleGif = gif(202);

    mockDeleteGif.mockResolvedValueOnce({ deletedId: 202 });

    const { result } = renderHook(() =>
      useImageMetadataSubmit({
        selectedImages: [singleGif],
        selectedImageIds: [202],
        updateState: { id: 202, collections: [] },
        hasChanges: false,
        originalCollectionIds: new Set<number>(),
        availableFilmTypes: [],
        onClose,
        onDeleteSuccess,
      })
    );

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(mockDeleteGif).toHaveBeenCalledWith(202);
    expect(mockDeleteImages).not.toHaveBeenCalled();
    expect(onDeleteSuccess).toHaveBeenCalledWith([202]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
