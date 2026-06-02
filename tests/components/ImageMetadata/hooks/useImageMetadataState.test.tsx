import { act, renderHook } from '@testing-library/react';

import { useImageMetadataState } from '@/app/components/ImageMetadata/hooks/useImageMetadataState';
import type { CollectionListModel } from '@/app/types/Collection';
import type { ContentImageModel } from '@/app/types/Content';

const coll = (id: number, name: string): CollectionListModel => ({ id, name });

const img = (id: number, overrides: Partial<ContentImageModel> = {}) =>
  ({
    id,
    contentType: 'IMAGE',
    collections: [],
    tags: [],
    people: [],
    locations: [],
    ...overrides,
  }) as ContentImageModel;

describe('useImageMetadataState', () => {
  it('seeds updateState from the single selected image', () => {
    // Array created outside the hook callback so it's a stable reference across renders.
    const selectedImages = [img(1, { title: 'Hero' })];
    const { result } = renderHook(() =>
      useImageMetadataState({ selectedImages, selectedImageIds: [1], availableLocations: [] })
    );
    expect(result.current.updateState.title).toBe('Hero');
    expect(result.current.hasChanges).toBe(false);
  });

  it('seeds updateState with common values for bulk edit', () => {
    const selectedImages = [
      img(1, { title: 'Same', rating: 4 }),
      img(2, { title: 'Same', rating: 4 }),
    ];
    const { result } = renderHook(() =>
      useImageMetadataState({ selectedImages, selectedImageIds: [1, 2], availableLocations: [] })
    );
    expect(result.current.updateState.title).toBe('Same');
    expect(result.current.updateState.rating).toBe(4);
  });

  it('updateStateField merges partial updates', () => {
    const selectedImages = [img(1)];
    const { result } = renderHook(() =>
      useImageMetadataState({ selectedImages, selectedImageIds: [1], availableLocations: [] })
    );
    act(() => result.current.updateStateField({ title: 'Renamed' }));
    expect(result.current.updateState.title).toBe('Renamed');
    expect(result.current.hasChanges).toBe(true);
  });

  it('handleCollectionToggle adds a collection when absent and removes when present', () => {
    const selectedImages = [img(1)];
    const { result } = renderHook(() =>
      useImageMetadataState({ selectedImages, selectedImageIds: [1], availableLocations: [] })
    );
    act(() => result.current.handleCollectionToggle(coll(5, 'Iceland')));
    expect(result.current.updateState.collections?.[0]?.collectionId).toBe(5);
    act(() => result.current.handleCollectionToggle(coll(5, 'Iceland')));
    expect(result.current.updateState.collections).toEqual([]);
  });

  it('re-seeds updateState when the same image id is passed with updated content', () => {
    const initial = img(42, { title: 'Old' });
    const { result, rerender } = renderHook(
      ({ selectedImages }) =>
        useImageMetadataState({ selectedImages, selectedImageIds: [42], availableLocations: [] }),
      { initialProps: { selectedImages: [initial] as ContentImageModel[] } }
    );
    expect(result.current.updateState.title).toBe('Old');

    const updated = img(42, { title: 'New' });
    rerender({ selectedImages: [updated] as ContentImageModel[] });
    expect(result.current.updateState.title).toBe('New');
  });

  it('exposes pendingAddIds and pendingRemoveIds based on the original', () => {
    const original = img(1, {
      collections: [{ collectionId: 10, name: 'A', visible: true, orderIndex: 0 }],
    });
    const selectedImages = [original];
    const { result } = renderHook(() =>
      useImageMetadataState({ selectedImages, selectedImageIds: [1], availableLocations: [] })
    );
    act(() => result.current.handleCollectionToggle(coll(20, 'B')));
    act(() => result.current.handleCollectionToggle(coll(10, 'A')));
    expect([...result.current.pendingAddIds]).toEqual([20]);
    expect([...result.current.pendingRemoveIds]).toEqual([10]);
  });
});
