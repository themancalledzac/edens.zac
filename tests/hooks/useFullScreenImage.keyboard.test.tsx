/**
 * Document-level key handling for useFullScreenImage.
 *
 * The open viewer swallows the page-scrolling keys (arrows, Page/Home/End, and Space) so the
 * collection behind it never scrolls. Space is the trap: it is also the activation key for every
 * <button> in the viewer, so an unconditional preventDefault() silently kills close / next / prev /
 * metadata for keyboard users — Enter keeps working, which hides the breakage. These tests pin that
 * the scroll block skips interactive targets while still firing for the page itself.
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

/** Dispatch a bubbling, cancelable keydown from `target` and hand back the event. */
function pressKey(target: EventTarget, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

function openViewer() {
  const hook = renderHook(() => useFullScreenImage());
  act(() => {
    hook.result.current.showImage(img(2), [img(1), img(2), img(3)]);
  });
  return hook;
}

describe('useFullScreenImage — keyboard handling', () => {
  let control: HTMLButtonElement;

  beforeEach(() => {
    window.history.replaceState({}, '', '/collection-x');
    control = document.createElement('button');
    control.type = 'button';
    document.body.append(control);
  });

  afterEach(() => {
    control.remove();
  });

  it('leaves Space alone on a button so the control still activates', () => {
    openViewer();

    const event = pressKey(control, ' ');

    expect(event.defaultPrevented).toBe(false);
  });

  it('leaves Space alone on a link', () => {
    openViewer();
    const link = document.createElement('a');
    link.href = '/location/banff';
    document.body.append(link);

    const event = pressKey(link, ' ');

    expect(event.defaultPrevented).toBe(false);
    link.remove();
  });

  it('still blocks Space on the page itself so the collection behind cannot scroll', () => {
    openViewer();

    const event = pressKey(document.body, ' ');

    expect(event.defaultPrevented).toBe(true);
  });

  it('still blocks the other scrolling keys on the page', () => {
    openViewer();

    for (const key of ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']) {
      expect(pressKey(document.body, key).defaultPrevented).toBe(true);
    }
  });

  it('keeps arrow-key navigation working while a control has focus', () => {
    const { result } = openViewer();

    pressKey(control, 'ArrowRight');
    expect(result.current.fullScreenState?.currentIndex).toBe(2);

    pressKey(control, 'ArrowLeft');
    expect(result.current.fullScreenState?.currentIndex).toBe(1);
  });

  it('ignores keys entirely while the viewer is closed', () => {
    renderHook(() => useFullScreenImage());

    expect(pressKey(document.body, ' ').defaultPrevented).toBe(false);
  });
});
