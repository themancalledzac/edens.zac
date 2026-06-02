/**
 * Deep-linking behavior for useFullScreenImage.
 *
 * The fullscreen viewer reflects its open state onto the URL via ?image=<id>:
 *  - opening from a click PUSHES one history entry (so Back closes the modal,
 *    not the collection)
 *  - navigating next/prev REPLACES the param (Back must not step through images)
 *  - a popstate whose URL no longer carries ?image closes the viewer in place
 *  - opening from an already-deep-linked URL only REPLACES (no extra push)
 *
 * NOTE: FullScreenState is { images, currentIndex } only. There is deliberately
 * no scrollPosition field — it was a removed footgun (jump-to-top on close). Do
 * not reintroduce it in fixtures.
 */
import { act, renderHook } from '@testing-library/react';

import { useFullScreenImage } from '@/app/hooks/useFullScreenImage';
import type { ContentImageModel } from '@/app/types/Content';

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

describe('useFullScreenImage — deep linking', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/collection-x');
  });

  it('pushes ?image=<id> to history on showImage (fresh open)', () => {
    const pushSpy = jest.spyOn(window.history, 'pushState');
    const { result } = renderHook(() => useFullScreenImage());

    act(() => {
      result.current.showImage(img(7), [img(6), img(7), img(8)]);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.fullScreenState?.currentIndex).toBe(1);
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(window.location.search).toContain('image=7');
    pushSpy.mockRestore();
  });

  it('preserves other query params when setting ?image=', () => {
    window.history.replaceState({}, '', '/collection-x?rating=4');
    const { result } = renderHook(() => useFullScreenImage());

    act(() => {
      result.current.showImage(img(7), [img(7)]);
    });

    expect(window.location.search).toContain('rating=4');
    expect(window.location.search).toContain('image=7');
  });

  it('replaces (not pushes) ?image= when navigating next', () => {
    const { result } = renderHook(() => useFullScreenImage());
    act(() => {
      result.current.showImage(img(6), [img(6), img(7), img(8)]);
    });

    const pushSpy = jest.spyOn(window.history, 'pushState');
    const replaceSpy = jest.spyOn(window.history, 'replaceState');

    act(() => {
      result.current.navigateToNext();
    });

    expect(result.current.fullScreenState?.currentIndex).toBe(1);
    expect(window.location.search).toContain('image=7');
    // Each swipe/arrow must REPLACE, never PUSH — Back closes the viewer, it does
    // not step through images.
    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalled();
    pushSpy.mockRestore();
    replaceSpy.mockRestore();
  });

  it('clears ?image= and pops history on hideImage after a fresh open', () => {
    const { result } = renderHook(() => useFullScreenImage());
    act(() => {
      result.current.showImage(img(7), [img(7), img(8)]);
    });
    expect(window.location.search).toContain('image=7');

    const backSpy = jest.spyOn(window.history, 'back').mockImplementation(() => {
      // jsdom's history.back is a no-op; emulate the URL returning to the
      // collection so the assertion reflects real-browser behavior.
      window.history.replaceState({}, '', '/collection-x');
    });

    act(() => {
      result.current.hideImage();
    });

    expect(backSpy).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(false);
    expect(window.location.search).not.toContain('image=');
    backSpy.mockRestore();
  });

  it('closes the modal on popstate when the image param is gone (Back button)', () => {
    const { result } = renderHook(() => useFullScreenImage());
    act(() => {
      result.current.showImage(img(7), [img(7), img(8)]);
    });
    expect(result.current.isOpen).toBe(true);

    // Simulate browser Back: URL returns to the collection, popstate fires.
    act(() => {
      window.history.replaceState({}, '', '/collection-x');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('does NOT close on popstate while the image param is still present', () => {
    const { result } = renderHook(() => useFullScreenImage());
    act(() => {
      result.current.showImage(img(7), [img(7), img(8)]);
    });

    // A popstate that still carries ?image (e.g. a back into a different image
    // entry) must not tear down the viewer.
    act(() => {
      window.history.replaceState({}, '', '/collection-x?image=8');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('opening from an already-deep-linked URL replaces in place (no push)', () => {
    // Page loaded directly with ?image=7 — there is no collection entry behind us,
    // so the deep-link restore must REPLACE, not PUSH.
    window.history.replaceState({}, '', '/collection-x?image=7');
    const pushSpy = jest.spyOn(window.history, 'pushState');
    const replaceSpy = jest.spyOn(window.history, 'replaceState');

    const { result } = renderHook(() => useFullScreenImage());
    act(() => {
      result.current.showImage(img(7), [img(6), img(7), img(8)]);
    });

    expect(result.current.isOpen).toBe(true);
    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalled();

    // Closing a deep-linked open strips the param in place (replaceState), never
    // history.back() — there is no entry of ours to pop.
    const backSpy = jest.spyOn(window.history, 'back');
    act(() => {
      result.current.hideImage();
    });
    expect(backSpy).not.toHaveBeenCalled();
    expect(window.location.search).not.toContain('image=');

    pushSpy.mockRestore();
    replaceSpy.mockRestore();
    backSpy.mockRestore();
  });
});
