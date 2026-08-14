/**
 * Opening the viewer on an image that is not a member of the surrounding list.
 *
 * The collection cover is the real case: `createCoverImageBlock` synthesizes it at layout time with
 * id COVER_IMAGE_CONTENT_ID (-1), so it never appears in the content array that
 * `ContentBlockWithFullScreen` filters into `viewableBlocks`. Clicking it calls
 * `showImage(cover, viewableBlocks)` with a cover no index in that list matches.
 *
 * The viewer must open on the clicked image, and must always resolve to something renderable — a
 * state carrying no image blacks out the page (see FullScreenModal.unrenderable).
 */
import { act, renderHook } from '@testing-library/react';

import { useFullScreenImage } from '@/app/hooks/useFullScreenImage';
import type { ContentImageModel } from '@/app/types/Content';
import { COVER_IMAGE_CONTENT_ID } from '@/app/utils/contentLayout';

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

const cover = () => img(COVER_IMAGE_CONTENT_ID);

describe('useFullScreenImage — image outside the surrounding list', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/admin/users/106');
  });

  it('opens on the cover itself when the list holds no viewable photographs', () => {
    const { result } = renderHook(() => useFullScreenImage());

    act(() => {
      result.current.showImage(cover(), []);
    });

    const state = result.current.fullScreenState;
    expect(state?.images).toHaveLength(1);
    expect(state?.images[state.currentIndex]?.id).toBe(COVER_IMAGE_CONTENT_ID);
  });

  it('opens on the cover, not the first grid photo, when the list is populated', () => {
    const { result } = renderHook(() => useFullScreenImage());

    act(() => {
      result.current.showImage(cover(), [img(6), img(7), img(8)]);
    });

    const state = result.current.fullScreenState;
    expect(state?.images[state.currentIndex]?.id).toBe(COVER_IMAGE_CONTENT_ID);
  });

  it('always resolves to a renderable image, never an empty viewer', () => {
    const { result } = renderHook(() => useFullScreenImage());

    act(() => {
      result.current.showImage(cover(), []);
    });

    const state = result.current.fullScreenState;
    expect(state?.images[state.currentIndex]).toBeDefined();
  });

  it('still walks the list normally for an image that IS a member', () => {
    const { result } = renderHook(() => useFullScreenImage());

    act(() => {
      result.current.showImage(img(7), [img(6), img(7), img(8)]);
    });

    const state = result.current.fullScreenState;
    expect(state?.images).toHaveLength(3);
    expect(state?.currentIndex).toBe(1);
  });
});
