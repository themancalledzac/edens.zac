import { act, renderHook } from '@testing-library/react';

import {
  toggleCollectionFlat,
  useMetadataState,
} from '@/app/components/Metadata/hooks/useMetadataState';
import type { ChildCollection, CollectionListModel } from '@/app/types/Collection';
import type { ContentImageModel } from '@/app/types/Content';
import type { ContentCameraModel } from '@/app/types/Metadata';

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

describe('useMetadataState', () => {
  it('seeds updateState from the single selected image', () => {
    // Array created outside the hook callback so it's a stable reference across renders.
    const selectedImages = [img(1, { title: 'Hero' })];
    const { result } = renderHook(() =>
      useMetadataState({ selectedImages, selectedIds: [1], availableLocations: [] })
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
      useMetadataState({ selectedImages, selectedIds: [1, 2], availableLocations: [] })
    );
    expect(result.current.updateState.title).toBe('Same');
    expect(result.current.updateState.rating).toBe(4);
  });

  it('updateStateField merges partial updates', () => {
    const selectedImages = [img(1)];
    const { result } = renderHook(() =>
      useMetadataState({ selectedImages, selectedIds: [1], availableLocations: [] })
    );
    act(() => result.current.updateStateField({ title: 'Renamed' }));
    expect(result.current.updateState.title).toBe('Renamed');
    expect(result.current.hasChanges).toBe(true);
  });

  it('handleCollectionToggle adds a collection when absent and removes when present', () => {
    const selectedImages = [img(1)];
    const { result } = renderHook(() =>
      useMetadataState({ selectedImages, selectedIds: [1], availableLocations: [] })
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
        useMetadataState({ selectedImages, selectedIds: [42], availableLocations: [] }),
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
      useMetadataState({ selectedImages, selectedIds: [1], availableLocations: [] })
    );
    act(() => result.current.handleCollectionToggle(coll(20, 'B')));
    act(() => result.current.handleCollectionToggle(coll(10, 'A')));
    expect([...result.current.pendingAddIds]).toEqual([20]);
    expect([...result.current.pendingRemoveIds]).toEqual([10]);
  });

  describe('replaceOptimisticCamera (guarded swap)', () => {
    const optimistic = (name: string): ContentCameraModel => ({
      id: 0,
      name,
      isFilm: false,
      defaultFilmFormat: null,
    });
    const real: ContentCameraModel = {
      id: 99,
      name: 'Hasselblad 500cm',
      isFilm: true,
      defaultFilmFormat: 'MM_120',
    };

    it('swaps the optimistic {id:0} camera for the real one when the selection is unchanged', () => {
      const selectedImages = [img(1)];
      const { result } = renderHook(() =>
        useMetadataState({ selectedImages, selectedIds: [1], availableLocations: [] })
      );
      act(() => result.current.updateStateField({ camera: optimistic('Hasselblad 500cm') }));
      act(() => result.current.replaceOptimisticCamera('Hasselblad 500cm', real));
      expect(result.current.updateState.camera).toEqual(real);
    });

    it('does NOT swap when the user picked a different camera mid-flight', () => {
      const selectedImages = [img(1)];
      const { result } = renderHook(() =>
        useMetadataState({ selectedImages, selectedIds: [1], availableLocations: [] })
      );
      const userPick: ContentCameraModel = { id: 7, name: 'Sony A7R IV', isFilm: false };
      act(() => result.current.updateStateField({ camera: optimistic('Hasselblad 500cm') }));
      act(() => result.current.updateStateField({ camera: userPick }));
      act(() => result.current.replaceOptimisticCamera('Hasselblad 500cm', real));
      expect(result.current.updateState.camera).toEqual(userPick);
    });

    it('does NOT swap when the camera was cleared mid-flight', () => {
      const selectedImages = [img(1)];
      const { result } = renderHook(() =>
        useMetadataState({ selectedImages, selectedIds: [1], availableLocations: [] })
      );
      act(() => result.current.updateStateField({ camera: optimistic('Hasselblad 500cm') }));
      act(() => result.current.updateStateField({ camera: null }));
      act(() => result.current.replaceOptimisticCamera('Hasselblad 500cm', real));
      expect(result.current.updateState.camera).toBeNull();
    });

    it('reverts the optimistic camera to null when still unchanged (failure path)', () => {
      const selectedImages = [img(1)];
      const { result } = renderHook(() =>
        useMetadataState({ selectedImages, selectedIds: [1], availableLocations: [] })
      );
      act(() => result.current.updateStateField({ camera: optimistic('Hasselblad 500cm') }));
      act(() => result.current.replaceOptimisticCamera('Hasselblad 500cm', null));
      expect(result.current.updateState.camera).toBeNull();
    });
  });
});

describe('toggleCollectionFlat (image-side flat-array adapter)', () => {
  const saved = (id: number, name: string): ChildCollection => ({
    collectionId: id,
    name,
    visible: true,
    orderIndex: 0,
  });

  it('add: appends a not-yet-saved collection with image-row shape', () => {
    const result = toggleCollectionFlat([], coll(5, 'Iceland'), new Set<number>());
    expect(result).toEqual([{ collectionId: 5, name: 'Iceland', visible: true, orderIndex: 0 }]);
  });

  it('un-add: toggling a pending addition removes it from the flat array', () => {
    const current: ChildCollection[] = [saved(5, 'Iceland')];
    const result = toggleCollectionFlat(current, coll(5, 'Iceland'), new Set<number>());
    expect(result).toEqual([]);
  });

  it('remove: toggling a saved collection drops it from the flat array', () => {
    const current: ChildCollection[] = [saved(10, 'A')];
    const result = toggleCollectionFlat(current, coll(10, 'A'), new Set<number>([10]));
    expect(result).toEqual([]);
  });

  it('re-add after remove: toggling a removed saved collection restores it', () => {
    // Start with the saved item removed (absent from the flat array), then toggle it back.
    const result = toggleCollectionFlat([], coll(10, 'A'), new Set<number>([10]));
    expect(result).toEqual([{ collectionId: 10, name: 'A', visible: true, orderIndex: 0 }]);
  });

  it('preserves saved-item metadata for kept collections while adding a new one', () => {
    const kept = saved(10, 'A');
    const result = toggleCollectionFlat([kept], coll(20, 'B'), new Set<number>([10]));
    // The kept saved object is reused verbatim; the new one is appended in image-row shape.
    expect(result).toEqual([kept, { collectionId: 20, name: 'B', visible: true, orderIndex: 0 }]);
  });
});
