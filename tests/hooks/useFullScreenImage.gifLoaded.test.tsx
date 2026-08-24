/**
 * The hook marks a GIF loaded the moment it becomes the current fullscreen item.
 *
 * GIF/MP4 blocks render as <video> in the modal, not <img>, so the modal's onLoad never fires for
 * them. Without this effect their id never lands in `loadedImageIds` and the loaded-state UI stalls
 * forever. A plain IMAGE is the opposite case: the hook must leave it alone, because its loaded
 * state comes from the modal's own onLoad handler.
 */
import { act, renderHook } from '@testing-library/react';

import { useFullScreenImage } from '@/app/hooks/useFullScreenImage';
import type { ContentImageModel } from '@/app/types/Content';
import { createGifContent } from '@/tests/fixtures/contentFixtures';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const img = (id: number): ContentImageModel =>
  ({
    id,
    contentType: 'IMAGE',
    imageUrl: `https://cdn.example/${id}.jpg`,
    orderIndex: id,
    visible: true,
  }) as ContentImageModel;

describe('useFullScreenImage — GIF loaded state', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/collection-x');
  });

  it('marks a GIF loaded as soon as the viewer opens on it', () => {
    const { result } = renderHook(() => useFullScreenImage());

    act(() => {
      result.current.showImage(createGifContent(42));
    });

    expect(result.current.loadedImageIds.has(42)).toBe(true);
  });

  it('marks a GIF loaded when navigation lands on it', () => {
    const { result } = renderHook(() => useFullScreenImage());
    const list = [img(1), createGifContent(2), img(3)];

    act(() => {
      result.current.showImage(img(1), list);
    });
    expect(result.current.loadedImageIds.has(2)).toBe(false);

    act(() => {
      result.current.navigateToNext();
    });

    expect(result.current.loadedImageIds.has(2)).toBe(true);
  });

  it('leaves a plain IMAGE unloaded — that comes from the modal onLoad', () => {
    const { result } = renderHook(() => useFullScreenImage());

    act(() => {
      result.current.showImage(img(7), [img(7), img(8)]);
    });

    expect(result.current.loadedImageIds.has(7)).toBe(false);
    expect(result.current.loadedImageIds.size).toBe(0);
  });
});
