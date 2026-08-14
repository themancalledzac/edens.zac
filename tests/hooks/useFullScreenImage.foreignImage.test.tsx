/**
 * Opening the viewer on an image that is NOT a member of the surrounding list.
 *
 * The collection COVER is the real case: it is synthesized by `createCoverImageBlock` from
 * `collection.coverImage` at layout time with id `COVER_IMAGE_CONTENT_ID` (-1), so it never appears
 * in the content array that `ContentBlockWithFullScreen` filters into `viewableBlocks`. Clicking it
 * therefore calls `showImage(cover, viewableBlocks)` with a cover that no index in the list matches.
 *
 * `findIndex` answers -1 there, and coercing that to 0 was wrong in both directions: on a grid of
 * photographs it opened the FIRST photo instead of the cover, and on a grid with no viewable
 * photographs at all (a user space's Collections tab, a PARENT collection — every tile is a
 * collection card, which `viewableBlocks` excludes) it produced `{ images: [], currentIndex: 0 }`,
 * a state the modal cannot render.
 *
 * The clicked image is the intent, so it is what the viewer must show.
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
