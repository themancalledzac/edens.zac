import { act, renderHook } from '@testing-library/react';

import { useImageMetadataState } from '@/app/components/ImageMetadata/hooks/useImageMetadataState';
import type { ContentImageModel } from '@/app/types/Content';

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
    const { result } = renderHook(() =>
      useImageMetadataState({ selectedImages: [img(1, { title: 'Hero' })], availableLocations: [] })
    );
    expect(result.current.updateState.title).toBe('Hero');
    expect(result.current.hasChanges).toBe(false);
  });

  it('seeds updateState with common values for bulk edit', () => {
    const a = img(1, { title: 'Same', rating: 4 });
    const b = img(2, { title: 'Same', rating: 4 });
    const { result } = renderHook(() =>
      useImageMetadataState({ selectedImages: [a, b], availableLocations: [] })
    );
    expect(result.current.updateState.title).toBe('Same');
    expect(result.current.updateState.rating).toBe(4);
  });

  it('updateStateField merges partial updates', () => {
    const { result } = renderHook(() =>
      useImageMetadataState({ selectedImages: [img(1)], availableLocations: [] })
    );
    act(() => result.current.updateStateField({ title: 'Renamed' }));
    expect(result.current.updateState.title).toBe('Renamed');
    expect(result.current.hasChanges).toBe(true);
  });

  it('handleCollectionToggle adds a collection when absent and removes when present', () => {
    const { result } = renderHook(() =>
      useImageMetadataState({ selectedImages: [img(1)], availableLocations: [] })
    );
    act(() => result.current.handleCollectionToggle({ id: 5, name: 'Iceland' } as never));
    expect(result.current.updateState.collections?.[0]?.collectionId).toBe(5);
    act(() => result.current.handleCollectionToggle({ id: 5, name: 'Iceland' } as never));
    expect(result.current.updateState.collections).toEqual([]);
  });

  it('exposes pendingAddIds and pendingRemoveIds based on the original', () => {
    const original = img(1, {
      collections: [{ collectionId: 10, name: 'A', visible: true, orderIndex: 0 }],
    });
    const { result } = renderHook(() =>
      useImageMetadataState({ selectedImages: [original], availableLocations: [] })
    );
    act(() => result.current.handleCollectionToggle({ id: 20, name: 'B' } as never));
    act(() => result.current.handleCollectionToggle({ id: 10, name: 'A' } as never));
    expect([...result.current.pendingAddIds]).toEqual([20]);
    expect([...result.current.pendingRemoveIds]).toEqual([10]);
  });
});
